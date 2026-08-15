-- =========================================================
-- COMMISSION SPLITS (retailer / platform / rider)
--
-- Design:
--   - commission_settings holds ONE row of current rates, editable
--     only by admins. Rates are percentages of the order SUBTOTAL
--     (cylinder value) and must sum to exactly 100.
--   - The delivery_fee is intentionally NOT split — it goes entirely
--     to the rider, on top of their subtotal percentage. This keeps
--     the split simple to explain and matches how delivery fees are
--     already framed to customers as a rider-facing charge.
--   - order_commissions stores the ACTUAL computed split per order,
--     snapshotted at the moment an order is marked 'delivered'. This
--     means changing the rates later never rewrites history — every
--     past order keeps the split that was in effect when it was
--     fulfilled.
--   - retailer_id and rider_id are denormalized onto order_commissions
--     (copied from the order) so RLS can grant a retailer/rider
--     visibility into their own earnings without needing a join.
-- =========================================================

-- ---------------------------------------------------------
-- 1. COMMISSION SETTINGS (admin-controlled, single row)
-- ---------------------------------------------------------
CREATE TABLE public.commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_rate NUMERIC(5,2) NOT NULL DEFAULT 72.5 CHECK (retailer_rate >= 0),
  platform_rate NUMERIC(5,2) NOT NULL DEFAULT 13.5 CHECK (platform_rate >= 0),
  rider_rate NUMERIC(5,2) NOT NULL DEFAULT 14.0 CHECK (rider_rate >= 0),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commission_rates_sum_100 CHECK (retailer_rate + platform_rate + rider_rate = 100)
);

GRANT SELECT ON public.commission_settings TO authenticated;
GRANT ALL ON public.commission_settings TO service_role;

ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission settings"
ON public.commission_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Any authenticated user can read the current rates (retailers/riders
-- should be able to see what split applies to them going forward).
CREATE POLICY "Authenticated users can view commission settings"
ON public.commission_settings FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER trg_commission_settings_updated_at
BEFORE UPDATE ON public.commission_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the recommended starting split. Adjust anytime from the admin UI.
INSERT INTO public.commission_settings (retailer_rate, platform_rate, rider_rate)
VALUES (72.5, 13.5, 14.0);

-- ---------------------------------------------------------
-- 2. ORDER COMMISSIONS (auto-computed snapshot per order)
-- ---------------------------------------------------------
CREATE TABLE public.order_commissions (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES public.retailers(id) ON DELETE SET NULL,
  rider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL,
  retailer_rate NUMERIC(5,2) NOT NULL,
  platform_rate NUMERIC(5,2) NOT NULL,
  rider_rate NUMERIC(5,2) NOT NULL,
  retailer_amount NUMERIC(10,2) NOT NULL,
  platform_amount NUMERIC(10,2) NOT NULL,
  -- Rider's cut = their percentage of subtotal PLUS the full delivery fee.
  rider_amount NUMERIC(10,2) NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_commissions TO authenticated;
GRANT ALL ON public.order_commissions TO service_role;

ALTER TABLE public.order_commissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_order_commissions_retailer_id ON public.order_commissions(retailer_id);
CREATE INDEX idx_order_commissions_rider_id ON public.order_commissions(rider_id);

CREATE POLICY "Admins can view all order commissions"
ON public.order_commissions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Retailers can view their own commission rows"
ON public.order_commissions FOR SELECT
USING (retailer_id IN (SELECT id FROM public.retailers WHERE owner_id = auth.uid()));

CREATE POLICY "Riders can view their own commission rows"
ON public.order_commissions FOR SELECT
USING (rider_id = auth.uid());

-- ---------------------------------------------------------
-- 3. AUTO-COMPUTE on delivery
-- ---------------------------------------------------------
-- Fires whenever an order's status changes to 'delivered'. Reads the
-- CURRENT commission_settings row, computes each party's share of the
-- subtotal, adds the full delivery_fee to the rider's share, and
-- stores the result. Runs once per order — if a row already exists
-- (e.g. status flips delivered -> something -> delivered again), it's
-- left untouched rather than recalculated, so the original snapshot
-- from the actual delivery moment is preserved.
CREATE OR REPLACE FUNCTION public.compute_order_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rates RECORD;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    IF NOT EXISTS (SELECT 1 FROM public.order_commissions WHERE order_id = NEW.id) THEN
      SELECT retailer_rate, platform_rate, rider_rate
        INTO rates
        FROM public.commission_settings
        ORDER BY updated_at DESC
        LIMIT 1;

      IF FOUND THEN
        INSERT INTO public.order_commissions (
          order_id, retailer_id, rider_id,
          subtotal, delivery_fee,
          retailer_rate, platform_rate, rider_rate,
          retailer_amount, platform_amount, rider_amount
        ) VALUES (
          NEW.id, NEW.retailer_id, NEW.rider_id,
          NEW.subtotal, NEW.delivery_fee,
          rates.retailer_rate, rates.platform_rate, rates.rider_rate,
          ROUND(NEW.subtotal * rates.retailer_rate / 100, 2),
          ROUND(NEW.subtotal * rates.platform_rate / 100, 2),
          ROUND(NEW.subtotal * rates.rider_rate / 100, 2) + NEW.delivery_fee
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_compute_commission
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.compute_order_commission();
