-- =========================================================
-- RIDER LOCALITY
-- =========================================================
-- Lets any user declare "I want to be a rider, based in <locality>".
-- Self-declaring locality is harmless on its own — the actual "rider"
-- role (which grants order visibility) still requires an admin to grant
-- it via user_roles, same as it already works for admin/retailer roles.
-- No new RLS policies are needed: profiles already allows a user to
-- read/update their own row, and allows admins to read every row.

ALTER TABLE public.profiles
  ADD COLUMN locality TEXT,
  ADD COLUMN is_rider_applicant BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.locality IS
  'Neighborhood/quarter the user (typically a rider) is based in, e.g. Molyko, Bokwango.';
COMMENT ON COLUMN public.profiles.is_rider_applicant IS
  'True once the user has submitted a rider application. Does not by itself grant the rider role.';

-- Speeds up the admin "pending rider applications" list.
CREATE INDEX idx_profiles_rider_applicant ON public.profiles (is_rider_applicant)
  WHERE is_rider_applicant = true;
