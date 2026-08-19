-- 0082_whatsapp_delivery_care_button_inbox_rollback
-- Removes the delivery-care Quick Reply race inbox. Safe only after all pending
-- callbacks are reconciled or explicitly discarded.

BEGIN;

DO $do$
DECLARE
  pending_count bigint := 0;
BEGIN
  IF to_regclass('public.whatsapp_delivery_care_button_events') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.whatsapp_delivery_care_button_events WHERE applied_at IS NULL'
      INTO pending_count;
  END IF;

  IF pending_count > 0 THEN
    RAISE EXCEPTION
      '0082_ROLLBACK_BLOCKED: unapplied WhatsApp delivery-care button callbacks exist; reconcile or explicitly discard them before rollback'
      USING ERRCODE='55000';
  END IF;
END
$do$;

DROP TABLE IF EXISTS public.whatsapp_delivery_care_button_events;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'') || ' [delivery-care Quick Reply inbox rolled back after pending callback drain]'
WHERE version='0082_whatsapp_delivery_care_button_inbox';

COMMIT;
