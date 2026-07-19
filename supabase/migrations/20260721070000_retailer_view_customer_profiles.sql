-- =========================================================
-- RETAILER CUSTOMER VISIBILITY FIX (additive, non-breaking)
--
-- The retailer dashboard's "Customers" page and order list try to
-- show each customer's name/phone, but there was never a
-- permission rule letting a retailer owner read profiles at all —
-- only the profile's own owner or an admin could. This has been
-- silently working only because testing happened via the
-- admin-preview fallback; a genuine (non-admin) retailer account
-- would see blank/"Unknown customer" everywhere.
--
-- This adds ONE new policy, scoped tightly: a retailer owner can
-- see the name/phone of a customer ONLY if that customer has
-- actually placed at least one order with that retailer. It does
-- not grant visibility into customers of other retailers, and it
-- does not touch the existing self/admin policies at all.
-- =========================================================

CREATE POLICY "profiles: retailer views own customers"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.retailers r ON r.id = o.retailer_id
    WHERE o.customer_id = profiles.id AND r.owner_id = auth.uid()
  )
);
