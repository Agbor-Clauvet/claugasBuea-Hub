-- =========================================================
-- RETAILER ORDER ACCESS (additive, non-breaking)
--
-- Adds ONE new policy on public.orders. Postgres RLS policies
-- for the same command are OR'd together, so this only ADDS
-- visibility for retailer owners — it does not touch or
-- restrict the existing customer / rider / admin policies
-- from the original schema.
-- =========================================================

CREATE POLICY "orders: retailer owner manage"
ON public.orders FOR ALL
TO authenticated
USING (
  retailer_id IN (SELECT id FROM public.retailers WHERE owner_id = auth.uid())
)
WITH CHECK (
  retailer_id IN (SELECT id FROM public.retailers WHERE owner_id = auth.uid())
);

-- Same for order_items, so a retailer can see line items on their own orders
CREATE POLICY "order_items: retailer owner read"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.retailers r ON r.id = o.retailer_id
    WHERE o.id = order_items.order_id AND r.owner_id = auth.uid()
  )
);
