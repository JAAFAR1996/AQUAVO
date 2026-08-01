-- 0050_backfill_stock_tracked
--
-- WHY THIS EXISTS
-- 0040 added fulfillment_materials.stock_tracked as:
--
--   ADD COLUMN IF NOT EXISTS stock_tracked boolean NOT NULL DEFAULT false
--
-- with no backfill. Every material that existed before 0040 therefore reads
-- false in Production, even though all of them are physical consumables whose
-- stock WAS guarded at confirmation before that column existed.
--
-- Nothing read the flag, so it was inert -- until the fulfillment stock guard
-- started using it to tell inventory apart from accounting-only costs. At that
-- point a false on a legacy box silently disables the guard for it, which is a
-- worse failure than the one the flag was introduced to fix: it lets stock go
-- negative with no override and no error.
--
-- This restores the pre-0040 meaning: everything is stock-guarded except the
-- materials that are explicitly accounting costs.
--
-- SCOPE: only rows still sitting on the 0040 default. Anything set deliberately
-- since -- cartons created through the admin (true), the two preparation costs
-- seeded by 0048 (false) -- is matched by sku or already true and left alone.
--
-- MEASURED ON A PRODUCTION CLONE (br-shy-surf-a4z9slz5, 2026-08-01): Production
-- currently holds exactly 2 fulfillment_materials, both of them the accounting
-- costs seeded by 0048, so this migration is a NO-OP there today. It is kept
-- because it is the safety net for any environment that does have pre-0040 rows,
-- and because it makes the flag's meaning explicit rather than incidental.
--
-- The forward-looking half of the same bug is fixed in code, not here:
-- POST /api/admin/fulfillment/materials now sets stock_tracked explicitly
-- instead of inheriting the 0040 default.
--
-- ROLLBACK: 0050_backfill_stock_tracked_rollback.sql

BEGIN;

UPDATE fulfillment_materials
   SET stock_tracked = true,
       updated_at = now()
 WHERE stock_tracked = false
   -- The only two materials that are genuinely not inventory. Matched on sku
   -- because 0048 stamps it, and on name as the fallback for a database where
   -- 0048's sku update has not run.
   AND coalesce(sku, '') NOT IN ('PRICE_LABEL', 'THANK_YOU_SOCIAL_CARD')
   AND name NOT IN ('ملصق السعر', 'كارت الشكر والتواصل')
   -- Never resurrect an archived material into the guard.
   AND archived_at IS NULL;

INSERT INTO schema_migrations (version, checksum, applied_by, notes)
SELECT '0050_backfill_stock_tracked', 'pending', current_user,
       'backfill stock_tracked=true for pre-0040 materials so the fulfillment stock guard is not silently disabled for them'
WHERE NOT EXISTS (
  SELECT 1 FROM schema_migrations WHERE version='0050_backfill_stock_tracked'
);

UPDATE schema_migrations
   SET rolled_back_at = NULL, applied_at = now(), applied_by = current_user
 WHERE version = '0050_backfill_stock_tracked'
   AND rolled_back_at IS NOT NULL;

COMMIT;
