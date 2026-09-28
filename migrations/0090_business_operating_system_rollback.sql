-- 0090_business_operating_system_rollback.sql
BEGIN;
DROP TABLE IF EXISTS public.business_findings;
DROP TABLE IF EXISTS public.business_event_log;
DROP TABLE IF EXISTS public.business_daily_snapshots;
DROP TABLE IF EXISTS public.business_marketing_daily;
DROP TABLE IF EXISTS public.business_metric_definitions;
UPDATE public.schema_migrations
SET rolled_back_at=now(),
    notes=COALESCE(notes,'')||' | Rolled back AQUAVO Business Operating System primitives.'
WHERE version='0090_business_operating_system' AND rolled_back_at IS NULL;
COMMIT;
