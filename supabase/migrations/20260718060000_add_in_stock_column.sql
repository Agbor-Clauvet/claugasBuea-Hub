-- =========================================================
-- REAL IN-STOCK TRACKING (additive, non-breaking)
--
-- The homepage already renders an "In stock / Out of stock"
-- badge, but it was checking a `cylinders.in_stock` field that
-- was never actually a database column — so it always silently
-- read as "in stock" no matter what. This adds the real column
-- so admins can actually mark a cylinder out of stock, and
-- customers can't book something that isn't available.
--
-- Defaults to true, so every existing cylinder keeps behaving
-- exactly as it does today until an admin flips one off.
-- =========================================================

ALTER TABLE public.cylinders
  ADD COLUMN IF NOT EXISTS in_stock BOOLEAN NOT NULL DEFAULT true;
