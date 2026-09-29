-- 0097_whatsapp_lifecycle_fail_closed_rollback.sql
-- Conservative rollback: remove the 0097 ledger marker only. It deliberately
-- does NOT re-enable customer messaging because provider approval cannot be
-- reconstructed safely from database history.
BEGIN;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0097_whatsapp_lifecycle_fail_closed';

COMMIT;
