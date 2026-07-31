-- ROLLBACK 0041. The table is additive and referenced by nothing else.
BEGIN;
DROP TRIGGER IF EXISTS ppd_set_updated_at ON product_packing_data;
DROP TABLE IF EXISTS product_packing_data;
UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0041_product_packing_data' AND rolled_back_at IS NULL;
COMMIT;
