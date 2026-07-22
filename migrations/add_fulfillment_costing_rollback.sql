-- Rollback for add_fulfillment_costing.sql — idempotent, dependency order.
-- Does NOT touch orders / products / historical business data.

ALTER TABLE IF EXISTS fulfillment_materials DROP CONSTRAINT IF EXISTS fmat_current_purchase_fk;

DROP TABLE IF EXISTS fulfillment_adjustments;
DROP TABLE IF EXISTS packaging_inventory_movements;
DROP TABLE IF EXISTS order_fulfillment_lines;
DROP TABLE IF EXISTS order_fulfillment_events;
DROP TABLE IF EXISTS packaging_profile_items;
DROP TABLE IF EXISTS packaging_profiles;
DROP TABLE IF EXISTS packaging_purchases;
DROP TABLE IF EXISTS fulfillment_materials;
