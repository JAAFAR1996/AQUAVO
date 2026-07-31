-- ROLLBACK 0044. Alerts are derived state; nothing financial depends on them.
BEGIN;
DROP TABLE IF EXISTS admin_stock_alerts;
UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0044_admin_stock_alerts' AND rolled_back_at IS NULL;
COMMIT;
