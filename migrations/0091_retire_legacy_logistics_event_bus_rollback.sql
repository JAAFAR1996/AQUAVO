-- 0091_retire_legacy_logistics_event_bus_rollback.sql
BEGIN;

DROP TRIGGER IF EXISTS event_bus_retire_legacy_logistics ON public.event_bus;
DROP FUNCTION IF EXISTS public.aquavo_retire_legacy_logistics_event();

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0091_retire_legacy_logistics_event_bus'
  AND rolled_back_at IS NULL;

COMMIT;
