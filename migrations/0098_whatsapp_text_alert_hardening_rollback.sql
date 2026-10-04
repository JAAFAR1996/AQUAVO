-- 0098_whatsapp_text_alert_hardening_rollback.sql
-- Conservative rollback: never reactivate previously suppressed historical
-- customer messages. Remove only the ledger marker; the additive schema stays
-- compatible with the previous reader and preserves the audit trail.
BEGIN;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0098_whatsapp_text_alert_hardening';

COMMIT;
