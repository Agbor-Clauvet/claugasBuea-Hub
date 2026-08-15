-- =========================================================
-- SUPER ADMIN — part 2 of 2 (run after the enum migration commits)
--
-- Design: super_admin is layered ON TOP of admin, not instead of it.
-- A super admin should hold BOTH the 'admin' row and the 'super_admin'
-- row in user_roles. This means every existing `has_role(uid, 'admin')`
-- check across the app (admin.orders, admin.cylinders, admin.riders,
-- admin.commission-settings, and every RLS policy that already checks
-- for 'admin') keeps working for a super admin automatically — nothing
-- else in the app needs to change.
--
-- The ONLY new power super_admin unlocks is managing who else holds
-- 'admin' or 'super_admin'. A regular admin can still do everything
-- they already could (approve riders, manage cylinders/orders/pricing)
-- — they just can't promote themselves or anyone else to admin.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Split the old "admin manage" policy in two
-- ---------------------------------------------------------
-- Previously ANY admin could insert/delete ANY row in user_roles,
-- including granting themselves or someone else 'admin'. That's the
-- gap this migration closes: admin-tier roles now require super_admin.
DROP POLICY IF EXISTS "user_roles: admin manage" ON public.user_roles;

-- Admins keep managing every OTHER role (rider, retailer, customer) —
-- this is what the existing rider-approval page already relies on.
CREATE POLICY "user_roles: admin manage non-admin roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND role NOT IN ('admin', 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND role NOT IN ('admin', 'super_admin'));

-- Only super admins can grant or revoke admin-tier roles.
CREATE POLICY "user_roles: super_admin manage admin roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') AND role IN ('admin', 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') AND role IN ('admin', 'super_admin'));

-- ---------------------------------------------------------
-- 2. Prevent locking yourself out entirely
-- ---------------------------------------------------------
-- Guards against accidentally removing the last super_admin, which
-- would leave nobody able to grant admin access ever again.
CREATE OR REPLACE FUNCTION public.prevent_last_super_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'super_admin' THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'super_admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last super admin.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_last_super_admin_removal
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_super_admin_removal();

-- ---------------------------------------------------------
-- 3. Look up a user's id by email (needed to add a new admin by email
--    from the UI — auth.users isn't directly queryable from the client)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can look up accounts by email.';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email);
  RETURN _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) TO authenticated;

-- ---------------------------------------------------------
-- 4. Bootstrap: make the existing admin a super admin too
-- ---------------------------------------------------------
-- IMPORTANT: replace the email below with your actual admin account
-- before running this migration — same pattern as grant_admin_role.sql.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'www.agborclauvet@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
