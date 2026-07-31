-- ROLLBACK 0043. Plans are advisory records; costs live in
-- order_fulfillment_lines and are untouched here.
BEGIN;
DROP TRIGGER IF EXISTS opp_set_updated_at ON order_packing_plans;
DROP TABLE IF EXISTS order_packing_plan_items;
DROP TABLE IF EXISTS order_packing_plans;
UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0043_order_packing_plans' AND rolled_back_at IS NULL;
COMMIT;
