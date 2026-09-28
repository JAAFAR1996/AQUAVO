-- 0093_whatsapp_lifecycle_automation_rollback.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_orders_sync_whatsapp_consent ON public.orders;
DROP FUNCTION IF EXISTS public.aquavo_sync_whatsapp_consent_from_order();

ALTER TABLE public.customer_message_jobs
  DROP CONSTRAINT IF EXISTS customer_message_jobs_type_chk;

ALTER TABLE public.customer_message_jobs
  ADD CONSTRAINT customer_message_jobs_type_chk
  CHECK (
    job_type = ANY (
      ARRAY[
        'delivery_care'::text,
        'review_request'::text,
        'review_reminder'::text
      ]
    )
  );

DROP TABLE IF EXISTS public.customer_whatsapp_consent_events;
DROP TABLE IF EXISTS public.customer_whatsapp_preferences;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS whatsapp_care_opt_in,
  DROP COLUMN IF EXISTS whatsapp_marketing_opt_in,
  DROP COLUMN IF EXISTS whatsapp_consent_version,
  DROP COLUMN IF EXISTS whatsapp_consent_captured_at;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0093_whatsapp_lifecycle_automation';

COMMIT;
