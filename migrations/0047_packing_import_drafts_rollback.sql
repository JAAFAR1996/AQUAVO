-- ROLLBACK 0047. Staging only. Rows already applied to product_packing_data
-- stay; this drops the import trail, not the data it produced.
BEGIN;
DROP TRIGGER IF EXISTS pid_set_updated_at ON packing_import_drafts;
DROP TABLE IF EXISTS packing_import_draft_lines;
DROP TABLE IF EXISTS packing_import_drafts;
UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0047_packing_import_drafts' AND rolled_back_at IS NULL;
COMMIT;
