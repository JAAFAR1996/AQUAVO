-- 0096_whatsapp_customer_text_replies_rollback.sql
BEGIN;
DROP TABLE IF EXISTS public.whatsapp_customer_text_events;
UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0096_whatsapp_customer_text_replies';
COMMIT;
