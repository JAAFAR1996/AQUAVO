-- 0091_retire_legacy_logistics_event_bus.sql
-- The pre-#258 production bundle can still emit legacy logistics events while
-- Vercel is build-rate-limited. Fulfillment is the canonical workflow and there
-- is no live consumer for event_bus:new_order_received, so fail these records
-- closed at the database boundary until all old runtimes are gone.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0090_customer_lifecycle_integrity'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0091_REQUIRES_ACTIVE_0090';
  END IF;
END
$guard$;

CREATE OR REPLACE FUNCTION public.aquavo_retire_legacy_logistics_event()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NEW.event_type='new_order_received'
     AND NEW.status='pending' THEN
    NEW.status := 'failed';
    NEW.processed_at := COALESCE(NEW.processed_at, clock_timestamp());
    NEW.error_message := 'LEGACY_LOGISTICS_CONSUMER_RETIRED_2026_09_28';
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS event_bus_retire_legacy_logistics ON public.event_bus;
CREATE TRIGGER event_bus_retire_legacy_logistics
BEFORE INSERT OR UPDATE OF event_type,status
ON public.event_bus
FOR EACH ROW
EXECUTE FUNCTION public.aquavo_retire_legacy_logistics_event();

UPDATE public.event_bus
SET status='failed',
    processed_at=COALESCE(processed_at,clock_timestamp()),
    error_message='LEGACY_LOGISTICS_CONSUMER_RETIRED_2026_09_28'
WHERE event_type='new_order_received'
  AND status='pending';

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0091_retire_legacy_logistics_event_bus',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Fail closed legacy event_bus:new_order_received writes while old runtime bundles remain reachable. Fulfillment events are canonical.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
