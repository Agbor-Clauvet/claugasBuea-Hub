-- =========================================================
-- DELIVERY FEE FOUNDATION: retailer + quarter coordinates
-- (additive, non-breaking)
--
-- Adds latitude/longitude to retailers (the pickup point) and
-- service_areas (each delivery quarter), so the app can compute
-- a real distance-based delivery fee automatically — no manual
-- per-order pricing, ever.
--
-- IMPORTANT — READ BEFORE RELYING ON THIS IN PRODUCTION:
-- The coordinates seeded below for both the ClauGas retailer
-- and every Buea quarter are ROUGH ESTIMATES based on general
-- geography, not verified GPS data. Since real money depends on
-- these numbers, please verify/correct them once, via Google
-- Maps (right-click a spot -> the lat/lng shown on the small
-- popup), then:
--
--   update public.retailers set lat = <real lat>, lng = <real lng>
--   where slug = 'claugas-buea';
--
--   update public.service_areas set lat = <real lat>, lng = <real lng>
--   where quarter = '<quarter name>';
--
-- This only needs to be done once. After that, every delivery
-- fee calculates itself automatically from this data.
-- =========================================================

ALTER TABLE public.retailers
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

ALTER TABLE public.service_areas
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Seed the ClauGas depot at an approximate central Buea location
-- (Molyko area). REPLACE with your real depot coordinates.
UPDATE public.retailers
SET lat = 4.1450, lng = 9.2870
WHERE slug = 'claugas-buea' AND lat IS NULL;

-- Seed approximate coordinates for each existing quarter.
-- These are rough placements based on known relative geography
-- of Buea (Molyko/university area as the commercial center,
-- Buea Town/GRA up-slope to the west, Muea/Mile 16/Check Point
-- along the highway to the south/east). VERIFY BEFORE TRUSTING.
UPDATE public.service_areas SET lat = 4.1450, lng = 9.2870 WHERE quarter = 'Molyko' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1465, lng = 9.2890 WHERE quarter = 'Great Soppo' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1430, lng = 9.2850 WHERE quarter = 'Small Soppo' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1500, lng = 9.2750 WHERE quarter = 'Bonduma' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1380, lng = 9.2950 WHERE quarter = 'Bomaka' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1600, lng = 9.2600 WHERE quarter = 'Bokwango' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1050, lng = 9.2600 WHERE quarter = 'Muea' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1330, lng = 9.2440 WHERE quarter = 'Mile 16' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1200, lng = 9.2500 WHERE quarter = 'Check Point' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1553, lng = 9.2412 WHERE quarter = 'Long Street' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1560, lng = 9.2420 WHERE quarter = 'Buea Town' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1575, lng = 9.2430 WHERE quarter = 'Government Residential Area (GRA)' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1565, lng = 9.2400 WHERE quarter = 'Clerks Quarter' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1580, lng = 9.2440 WHERE quarter = 'Federal Quarters' AND lat IS NULL;
UPDATE public.service_areas SET lat = 4.1700, lng = 9.2550 WHERE quarter = 'Bokwai' AND lat IS NULL;
