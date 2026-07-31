-- ROLLBACK 0046. Drops the discriminator only; packaging_loss values are left
-- exactly as they are.
BEGIN;
DROP INDEX IF EXISTS ore_loss_source_idx;
ALTER TABLE order_return_events DROP CONSTRAINT IF EXISTS ore_packaging_loss_source_chk;
ALTER TABLE order_return_events DROP COLUMN IF EXISTS packaging_loss_source;
UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0046_return_packaging_loss_source' AND rolled_back_at IS NULL;
COMMIT;
