-- =========================================================
-- SUPER ADMIN — part 1 of 2
--
-- Postgres requires a new enum value added via ALTER TYPE ... ADD VALUE
-- to be committed before it can be referenced in any query — including
-- one later in the same migration file, since a whole migration file
-- runs as a single transaction. That's why this is split into two
-- files: this one only adds the values, part 2 (next migration) is
-- where they actually get used.
-- =========================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
-- Also fixing a pre-existing gap: 'retailer' was added to this enum by
-- the marketplace foundation migration, so this is a no-op confirming
-- it's really there — harmless either way since IF NOT EXISTS guards it.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'retailer';
