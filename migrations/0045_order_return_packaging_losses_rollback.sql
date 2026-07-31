-- ROLLBACK 0045. These rows are reclassification views of costs already
-- recognised in order_fulfillment_lines, so dropping them removes no expense
-- and changes no profit figure.
BEGIN;
DROP TRIGGER IF EXISTS orpl_immutable ON order_return_packaging_losses;
DROP TABLE IF EXISTS order_return_packaging_losses;
DROP FUNCTION IF EXISTS orpl_block_mutation();
DROP FUNCTION IF EXISTS orpl_enforce_cumulative_quantity();
UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0045_order_return_packaging_losses' AND rolled_back_at IS NULL;
COMMIT;
