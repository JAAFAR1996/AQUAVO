-- 0099_customer_messaging_scheduler_auth_rollback.sql
BEGIN;

DROP TABLE IF EXISTS public.customer_messaging_scheduler_auth;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0099_customer_messaging_scheduler_auth';

COMMIT;
