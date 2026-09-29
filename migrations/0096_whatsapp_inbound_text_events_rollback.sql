-- 0096_whatsapp_inbound_text_events_rollback.sql
BEGIN;
DROP TABLE IF EXISTS public.whatsapp_inbound_text_events;
UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0096_whatsapp_inbound_text_events';
COMMIT;
