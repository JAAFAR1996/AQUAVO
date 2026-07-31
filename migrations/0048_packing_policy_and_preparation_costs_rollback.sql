-- ROLLBACK 0048.
--
-- Removes the policy settings and RETIRES the two seeded preparation materials.
--
-- It does NOT delete their cost records. `mcr_approved_guard` refuses to delete
-- an approved material_cost_record — "approved cost records are evidence and
-- cannot be deleted" — and that guard is right: an approved cost is an assertion
-- somebody made, and un-asserting it by deletion destroys the audit trail. An
-- earlier version of this file tried to delete them and was caught by the
-- migration integration test.
--
-- So the materials are archived and deactivated rather than dropped. They vanish
-- from new plans and from the admin's active list, every historical snapshot
-- referencing them stays readable, and re-applying 0048 revives them in place
-- rather than creating duplicates.
--
-- A material that was never costed and never used is genuinely deletable; that
-- case is handled last.

BEGIN;

DELETE FROM settings WHERE key IN (
  'packing_min_support_ratio','packing_max_overhang_ratio',
  'packing_fragile_min_support_ratio','packing_contact_epsilon_mm',
  'packing_min_contact_area_mm2','carton_planner_enabled','carton_reservations_enabled');

UPDATE fulfillment_materials
   SET archived_at = COALESCE(archived_at, now()),
       active = false,
       updated_at = now()
 WHERE sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD');

DELETE FROM fulfillment_materials f
 WHERE f.sku IN ('PRICE_LABEL','THANK_YOU_SOCIAL_CARD')
   AND NOT EXISTS (SELECT 1 FROM material_cost_records r WHERE r.material_id = f.id)
   AND NOT EXISTS (SELECT 1 FROM order_fulfillment_lines l WHERE l.material_id = f.id)
   AND NOT EXISTS (SELECT 1 FROM packaging_inventory_movements m WHERE m.material_id = f.id);

UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0048_packing_policy_and_preparation_costs' AND rolled_back_at IS NULL;
COMMIT;
