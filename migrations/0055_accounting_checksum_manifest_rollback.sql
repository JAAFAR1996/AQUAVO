-- 0055_accounting_checksum_manifest_rollback.sql
-- Ledger checksum corrections are intentionally not reverted to fake placeholder
-- values. Rollback only marks the manifest migration as rolled back.
BEGIN;
UPDATE public.schema_migrations
   SET rolled_back_at=now()
 WHERE version='0055_accounting_checksum_manifest';
COMMIT;
