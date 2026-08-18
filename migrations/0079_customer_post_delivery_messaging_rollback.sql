-- 0079_customer_post_delivery_messaging_rollback
-- Removes the post-delivery messaging outbox and provider-status inbox. Safe only
-- when no unsent lifecycle work remains; otherwise rollback would silently discard
-- customer follow-ups.

BEGIN;

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.customer_message_jobs
    WHERE status IN ('pending', 'sending')
  ) THEN
    RAISE EXCEPTION
      '0079_ROLLBACK_BLOCKED: pending/sending customer messages exist; drain or cancel them explicitly before rollback'
      USING ERRCODE='55000';
  END IF;
END
$do$;

DROP TRIGGER IF EXISTS trg_orders_post_delivery_messages ON public.orders;
DROP FUNCTION IF EXISTS public.aquavo_enqueue_post_delivery_messages();
DROP TABLE IF EXISTS public.whatsapp_provider_status_events;
DROP TABLE IF EXISTS public.customer_message_jobs;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'') || ' [post-delivery messaging outbox/provider-status inbox rolled back after queue drain]'
WHERE version='0079_customer_post_delivery_messaging';

COMMIT;
