-- Rollback for add_fulfillment_hardening.sql. Drops only what that migration added.
DROP TRIGGER IF EXISTS ofe_reversal_guard ON order_fulfillment_events;
DROP TRIGGER IF EXISTS pim_reversal_guard ON packaging_inventory_movements;
DROP TRIGGER IF EXISTS fpdl_consumed_guard ON fulfillment_preparation_draft_lines;
DROP TRIGGER IF EXISTS fpd_consumed_guard ON fulfillment_preparation_drafts;
DROP TRIGGER IF EXISTS fmat_cost_consistency ON fulfillment_materials;
DROP TRIGGER IF EXISTS mcr_approved_guard ON material_cost_records;
DROP TRIGGER IF EXISTS ppi_locked_guard ON packaging_profile_items;
DROP TRIGGER IF EXISTS pp_locked_guard ON packaging_profiles;

DROP FUNCTION IF EXISTS ofe_guard_reversal();
DROP FUNCTION IF EXISTS pim_guard_reversal();
DROP FUNCTION IF EXISTS fpdl_guard_consumed();
DROP FUNCTION IF EXISTS fpd_guard_consumed();
DROP FUNCTION IF EXISTS fmat_guard_cost_consistency();
DROP FUNCTION IF EXISTS mcr_guard_approved();
DROP FUNCTION IF EXISTS ppi_guard_locked();
DROP FUNCTION IF EXISTS pp_guard_locked();

DROP INDEX IF EXISTS ofe_one_active_reversal_uidx;
DROP INDEX IF EXISTS pim_one_reversal_uidx;
DROP INDEX IF EXISTS ofe_draft_uidx;
DROP INDEX IF EXISTS fpd_open_uidx;
DROP INDEX IF EXISTS fpdl_draft_idx;
DROP INDEX IF EXISTS fpd_order_idx;
DROP INDEX IF EXISTS mcr_active_approved_uidx;
DROP INDEX IF EXISTS mcr_material_idx;
DROP INDEX IF EXISTS pp_family_version_uidx;
DROP INDEX IF EXISTS pp_family_idx;
DROP INDEX IF EXISTS ppf_key_uidx;

ALTER TABLE order_fulfillment_events DROP CONSTRAINT IF EXISTS ofe_no_self_reversal_chk;
ALTER TABLE order_fulfillment_events DROP CONSTRAINT IF EXISTS ofe_no_self_parent_chk;
ALTER TABLE packaging_inventory_movements DROP CONSTRAINT IF EXISTS pim_no_self_reversal_chk;
ALTER TABLE packaging_inventory_movements DROP CONSTRAINT IF EXISTS pim_reversal_ref_chk;
ALTER TABLE packaging_inventory_movements DROP CONSTRAINT IF EXISTS pim_reversal_nonzero_chk;

ALTER TABLE order_fulfillment_events DROP COLUMN IF EXISTS draft_id;
ALTER TABLE order_fulfillment_events DROP COLUMN IF EXISTS profile_family_id;
ALTER TABLE order_fulfillment_lines DROP COLUMN IF EXISTS category;
ALTER TABLE order_fulfillment_lines DROP COLUMN IF EXISTS description;
ALTER TABLE order_fulfillment_lines DROP COLUMN IF EXISTS unit;
ALTER TABLE order_fulfillment_lines DROP COLUMN IF EXISTS note;
ALTER TABLE fulfillment_materials DROP COLUMN IF EXISTS current_cost_record_id;

DROP TABLE IF EXISTS fulfillment_preparation_draft_lines;
DROP TABLE IF EXISTS fulfillment_preparation_drafts;
DROP TABLE IF EXISTS material_cost_records;
DROP TABLE IF EXISTS order_fulfillment_sequences;

ALTER TABLE packaging_profiles DROP COLUMN IF EXISTS profile_family_id;
ALTER TABLE packaging_profiles DROP COLUMN IF EXISTS previous_version_id;
ALTER TABLE packaging_profiles DROP COLUMN IF EXISTS superseded_by_id;
ALTER TABLE packaging_profiles DROP COLUMN IF EXISTS creation_reason;
ALTER TABLE packaging_profiles DROP COLUMN IF EXISTS locked;
ALTER TABLE packaging_profiles DROP COLUMN IF EXISTS locked_at;
ALTER TABLE packaging_profiles DROP COLUMN IF EXISTS created_by;

DROP TABLE IF EXISTS packaging_profile_families;
