-- Rollback for backfill_orderitems_from_jsonb.sql
-- Removes ONLY the rows this backfill inserted (tagged metadata.backfilled=true).
-- Rows written by the normal order-creation path are never tagged, so they are
-- untouched. Safe and idempotent.

-- Preview what would be deleted (read-only):
-- SELECT count(*) FROM order_items_relational WHERE metadata->>'backfilled' = 'true';

DELETE FROM order_items_relational
WHERE metadata->>'backfilled' = 'true';
