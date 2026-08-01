-- ROLLBACK of 0050_backfill_stock_tracked
--
-- NOT REVERSIBLE, deliberately, and this file documents why rather than
-- pretending otherwise.
--
-- 0050 sets stock_tracked = true on rows that were sitting on the 0040 default.
-- After it runs, a true row is indistinguishable from one an admin set to true
-- on purpose when creating a carton. Flipping every true back to false would
-- therefore also un-track real cartons and disable the stock guard for them --
-- turning a rollback into the exact failure 0050 exists to prevent.
--
-- Leaving the data as-is is safe: stock_tracked = true simply means the
-- confirmation guard checks a balance, which is what happened for every one of
-- these materials before 0040 introduced the column.
--
-- Only the ledger entry is reverted, so re-applying 0050 is a clean no-op.

BEGIN;

UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0050_backfill_stock_tracked' AND rolled_back_at IS NULL;

COMMIT;
