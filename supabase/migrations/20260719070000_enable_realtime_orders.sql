-- =========================================================
-- ENABLE REALTIME ON ORDERS (additive, non-breaking)
--
-- The retailer dashboard and customer order pages both listen
-- for live order changes via supabase.channel(...).on("postgres_changes", ...),
-- but Supabase only delivers those events for tables explicitly
-- added to the `supabase_realtime` publication. That step was
-- never done, so those live-update features have been silently
-- inert this whole time — falling back to manual refresh, which
-- still works, just isn't instant.
--
-- This adds `orders` to that publication. Guarded so re-running
-- this migration (or applying it twice) doesn't error.
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
