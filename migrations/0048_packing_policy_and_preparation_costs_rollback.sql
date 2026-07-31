-- ROLLBACK 0048.
-- Removes the policy settings and the two seeded preparation materials ONLY IF
-- they were never used. A material referenced by any fulfillment line is left
-- alone: that line is a frozen historical fact and its material must stay
-- readable. In that case the material is archived instead of deleted.
BEGIN;

DELETE FROM settings WHERE key IN (
  'packing_min_support_ratio','packing_max_overhang_ratio',
  'packing_fragile_min_support_ratio','packing_contact_epsilon_mm',
  'packing_min_contact_area_mm2','carton_planner_enabled','carton_reservations_enabled');

UPDATE fulfillment_materials
   SET archived_at = COALESCE(archived_at, now()), active = false
 WHERE sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD')
   AND EXISTS (SELECT 1 FROM order_fulfillment_lines l WHERE l.material_id = fulfillment_materials.id);

DELETE FROM material_cost_records r
 USING fulfillment_materials f
 WHERE r.material_id = f.id
   AND f.sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD')
   AND r.created_by = 'migration-0048'
   AND NOT EXISTS (SELECT 1 FROM order_fulfillment_lines l WHERE l.material_id = f.id);

DELETE FROM fulfillment_materials f
 WHERE f.sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD')
   AND NOT EXISTS (SELECT 1 FROM order_fulfillment_lines l WHERE l.material_id = f.id)
   AND NOT EXISTS (SELECT 1 FROM packaging_inventory_movements m WHERE m.material_id = f.id);

UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0048_packing_policy_and_preparation_costs' AND rolled_back_at IS NULL;
COMMIT;
