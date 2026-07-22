-- Rollback for add_fulfillment_costing.sql — idempotent, dependency order.
-- Does NOT touch orders / products / historical business data.

-- immutability triggers + functions first (safe if tables already gone)
DROP TRIGGER IF EXISTS ofl_immutable ON order_fulfillment_lines;
DROP TRIGGER IF EXISTS pim_immutable ON packaging_inventory_movements;
DROP TRIGGER IF EXISTS ofe_guard ON order_fulfillment_events;
DROP FUNCTION IF EXISTS fulfillment_block_mutation();
DROP FUNCTION IF EXISTS ofe_guard_confirmed();

ALTER TABLE IF EXISTS fulfillment_materials DROP CONSTRAINT IF EXISTS fmat_current_purchase_fk;

DROP TABLE IF EXISTS fulfillment_adjustments;
DROP TABLE IF EXISTS packaging_inventory_movements;
DROP TABLE IF EXISTS order_fulfillment_lines;
DROP TABLE IF EXISTS order_fulfillment_events;
DROP TABLE IF EXISTS packaging_profile_items;
DROP TABLE IF EXISTS packaging_profiles;
DROP TABLE IF EXISTS packaging_purchases;
DROP TABLE IF EXISTS fulfillment_materials;
