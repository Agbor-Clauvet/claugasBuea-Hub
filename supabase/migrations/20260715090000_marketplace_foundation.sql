-- =========================================================
-- MARKETPLACE FOUNDATION (additive, non-breaking)
--
-- This migration lays the groundwork for turning ClauGas into
-- a multi-vendor marketplace WITHOUT changing any existing
-- behaviour:
--   - retailer_id columns are NULLABLE, so every existing
--     cylinder/order row and every existing query keeps working
--     exactly as before.
--   - a single "ClauGas Buea" retailer row is created and every
--     existing cylinder/order is backfilled to point at it, so
--     today's live app is functionally "a marketplace with one
--     retailer" the moment this lands.
--   - no existing table is dropped, renamed, or made stricter.
-- =========================================================

-- ---------------------------------------------------------
-- 1. New role: retailer
-- ---------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'retailer';

-- ---------------------------------------------------------
-- 2. RETAILERS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  phone TEXT,
  city TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'basic', 'pro', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.retailers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retailers TO authenticated;
GRANT ALL ON public.retailers TO service_role;

ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_retailers_updated_at
BEFORE UPDATE ON public.retailers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Anyone can view active retailers (needed for future discovery pages)
CREATE POLICY "Active retailers are publicly visible"
ON public.retailers FOR SELECT
USING (is_active = true);

-- Retailer owners can view and update their own retailer row
CREATE POLICY "Owners can view their own retailer"
ON public.retailers FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own retailer"
ON public.retailers FOR UPDATE
USING (auth.uid() = owner_id);

-- Admins can manage all retailers
CREATE POLICY "Admins can manage retailers"
ON public.retailers FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------
-- 3. Nullable retailer_id on existing tables (non-breaking)
-- ---------------------------------------------------------
ALTER TABLE public.cylinders
  ADD COLUMN IF NOT EXISTS retailer_id UUID REFERENCES public.retailers(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS retailer_id UUID REFERENCES public.retailers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cylinders_retailer_id ON public.cylinders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_orders_retailer_id ON public.orders(retailer_id);

-- ---------------------------------------------------------
-- 4. Seed the existing business as the first retailer, and
--    backfill every existing cylinder/order to point at it.
--    This makes today's single-vendor app functionally
--    identical to before — just now modeled as a marketplace
--    of one.
-- ---------------------------------------------------------
INSERT INTO public.retailers (slug, name, description, city, is_verified, is_active, subscription_tier)
VALUES (
  'claugas-buea',
  'ClauGas',
  'Smart Gas Delivery for Buea',
  'Buea',
  true,
  true,
  'premium'
)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.cylinders
SET retailer_id = (SELECT id FROM public.retailers WHERE slug = 'claugas-buea')
WHERE retailer_id IS NULL;

UPDATE public.orders
SET retailer_id = (SELECT id FROM public.retailers WHERE slug = 'claugas-buea')
WHERE retailer_id IS NULL;

-- NOTE: retailer_id is intentionally left NULLABLE (not NOT NULL) for now.
-- We only flip it to required once the retailer dashboard and
-- order-creation flow are updated to always set it. Until then,
-- the existing booking flow keeps working exactly as it does today.
