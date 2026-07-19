-- =========================================================
-- SERVER-SIDE PRICE ENFORCEMENT (critical security fix)
--
-- Until now, an order's subtotal/delivery_fee/total and each
-- item's unit_price were trusted exactly as sent by the browser
-- at insert time — nothing on the server verified they were
-- correct. Anyone comfortable with browser dev tools could submit
-- an order at any price they chose, including editing their own
-- pending order afterward to change the price again.
--
-- This migration makes the database the source of truth for
-- pricing, no matter what a client sends:
--   1. order_items.unit_price is always overwritten with the
--      cylinder's real price at insert/update time.
--   2. orders.subtotal / delivery_fee / total are recomputed from
--      real data every time that order's items change — using the
--      same distance-based formula as the booking page, ported to
--      SQL so the numbers match exactly.
--   3. Once an order exists, subtotal/delivery_fee/total/
--      customer_id/retailer_id/address_id can only ever be changed
--      by that trusted recompute step — never by a direct update
--      from a customer, retailer, or anyone else.
--
-- This also fixes a related, previously-unnoticed gap: new orders
-- placed through the booking page never had `retailer_id` set,
-- meaning a genuine (non-admin) retailer owner's dashboard would
-- never see their own new orders. The recompute step now assigns
-- retailer_id automatically from the ordered cylinder.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Distance + fee formula, ported from src/lib/delivery-fee.ts
--    Keep these two in sync if the pricing formula ever changes.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
  ));
$$;

CREATE OR REPLACE FUNCTION public.calculate_delivery_fee(
  distance_km DOUBLE PRECISION, subtotal NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  base_fee CONSTANT NUMERIC := 300;
  rate_per_km CONSTANT NUMERIC := 100;
  max_fee CONSTANT NUMERIC := 2000;
  discount_threshold CONSTANT NUMERIC := 20000;
  raw_fee NUMERIC;
  fee NUMERIC;
BEGIN
  raw_fee := LEAST(base_fee + rate_per_km * COALESCE(distance_km, 0), max_fee);
  IF subtotal >= discount_threshold THEN
    fee := raw_fee * 0.5;
  ELSE
    fee := raw_fee;
  END IF;
  RETURN ROUND(fee / 50) * 50;
END;
$$;

-- ---------------------------------------------------------
-- 2. Force every order_item's unit_price to the cylinder's real
--    price, ignoring whatever the client sent.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_order_item_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_price NUMERIC;
BEGIN
  SELECT price INTO real_price FROM public.cylinders WHERE id = NEW.cylinder_id;
  IF real_price IS NULL THEN
    RAISE EXCEPTION 'Invalid cylinder_id for order item';
  END IF;
  NEW.unit_price := real_price;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_item_price ON public.order_items;
CREATE TRIGGER trg_enforce_order_item_price
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_item_price();

-- ---------------------------------------------------------
-- 3. Whenever an order's items change, recompute that order's
--    subtotal / delivery_fee / total from real data, and
--    auto-assign retailer_id if it isn't set yet.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order_id UUID;
  new_subtotal NUMERIC;
  order_retailer_id UUID;
  order_address_id UUID;
  derived_retailer_id UUID;
  retailer_lat DOUBLE PRECISION;
  retailer_lng DOUBLE PRECISION;
  quarter_lat DOUBLE PRECISION;
  quarter_lng DOUBLE PRECISION;
  distance DOUBLE PRECISION;
  new_fee NUMERIC;
BEGIN
  target_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO new_subtotal
  FROM public.order_items WHERE order_id = target_order_id;

  SELECT retailer_id, address_id INTO order_retailer_id, order_address_id
  FROM public.orders WHERE id = target_order_id;

  IF order_retailer_id IS NULL THEN
    SELECT c.retailer_id INTO derived_retailer_id
    FROM public.order_items oi
    JOIN public.cylinders c ON c.id = oi.cylinder_id
    WHERE oi.order_id = target_order_id
    LIMIT 1;
  END IF;

  IF COALESCE(order_retailer_id, derived_retailer_id) IS NOT NULL THEN
    SELECT lat, lng INTO retailer_lat, retailer_lng
    FROM public.retailers WHERE id = COALESCE(order_retailer_id, derived_retailer_id);
  END IF;

  IF order_address_id IS NOT NULL THEN
    SELECT sa.lat, sa.lng INTO quarter_lat, quarter_lng
    FROM public.addresses a
    JOIN public.service_areas sa ON sa.quarter = a.quarter
    WHERE a.id = order_address_id;
  END IF;

  IF retailer_lat IS NOT NULL AND retailer_lng IS NOT NULL
     AND quarter_lat IS NOT NULL AND quarter_lng IS NOT NULL THEN
    distance := public.haversine_km(retailer_lat, retailer_lng, quarter_lat, quarter_lng);
  ELSE
    distance := 0;
  END IF;

  new_fee := public.calculate_delivery_fee(distance, new_subtotal);

  PERFORM set_config('app.recomputing_order', 'true', true);
  UPDATE public.orders
  SET subtotal = new_subtotal,
      delivery_fee = new_fee,
      total = new_subtotal + new_fee,
      retailer_id = COALESCE(order_retailer_id, derived_retailer_id)
  WHERE id = target_order_id;
  PERFORM set_config('app.recomputing_order', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_order_totals ON public.order_items;
CREATE TRIGGER trg_recompute_order_totals
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recompute_order_totals();

-- ---------------------------------------------------------
-- 4. Lock pricing/ownership fields on orders against any direct
--    update — only the trusted recompute step above (flagged via
--    the transaction-local app.recomputing_order setting) may
--    change them.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_order_protected_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.recomputing_order', true), 'false') = 'true' THEN
    RETURN NEW; -- trusted system recompute in progress; allow it through
  END IF;

  NEW.subtotal := OLD.subtotal;
  NEW.delivery_fee := OLD.delivery_fee;
  NEW.total := OLD.total;
  NEW.customer_id := OLD.customer_id;
  NEW.retailer_id := OLD.retailer_id;
  NEW.address_id := OLD.address_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_order_protected_fields ON public.orders;
CREATE TRIGGER trg_lock_order_protected_fields
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.lock_order_protected_fields();

-- ---------------------------------------------------------
-- 5. One-time backfill: recompute every existing order from its
--    real items, so historical test orders end up consistent too.
-- ---------------------------------------------------------
UPDATE public.order_items SET unit_price = unit_price WHERE true;
