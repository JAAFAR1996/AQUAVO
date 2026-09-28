-- 0093_whatsapp_lifecycle_automation_rollback.sql
-- Conservative rollback: refuses to remove durable consent/provider evidence.

BEGIN;

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.customer_lifecycle_jobs
    WHERE provider_message_id IS NOT NULL
       OR accepted_at IS NOT NULL
       OR attempt_count > 0
  ) THEN
    RAISE EXCEPTION '0093_ROLLBACK_BLOCKED: lifecycle provider evidence exists';
  END IF;

  IF EXISTS (SELECT 1 FROM public.customer_messaging_consent_events LIMIT 1) THEN
    RAISE EXCEPTION '0093_ROLLBACK_BLOCKED: consent audit evidence exists';
  END IF;

  IF EXISTS (SELECT 1 FROM public.whatsapp_lifecycle_reply_events LIMIT 1) THEN
    RAISE EXCEPTION '0093_ROLLBACK_BLOCKED: lifecycle reply evidence exists';
  END IF;
END
$guard$;

DROP TRIGGER IF EXISTS trg_orders_whatsapp_marketing_consent ON public.orders;
DROP FUNCTION IF EXISTS public.aquavo_capture_whatsapp_marketing_consent();

DROP TABLE IF EXISTS public.whatsapp_lifecycle_reply_events;
DROP TABLE IF EXISTS public.customer_messaging_consent_events;

DROP INDEX IF EXISTS public.customer_lifecycle_jobs_provider_message_uidx;
DROP INDEX IF EXISTS public.customer_lifecycle_jobs_whatsapp_due_idx;
DROP INDEX IF EXISTS public.customer_lifecycle_jobs_whatsapp_stale_idx;

ALTER TABLE public.customer_lifecycle_jobs
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_status_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_channel_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_attempt_count_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_provider_status_chk;

ALTER TABLE public.customer_lifecycle_jobs
  DROP COLUMN IF EXISTS attempt_count,
  DROP COLUMN IF EXISTS provider_message_id,
  DROP COLUMN IF EXISTS provider_status,
  DROP COLUMN IF EXISTS provider_status_at,
  DROP COLUMN IF EXISTS last_error_code,
  DROP COLUMN IF EXISTS last_error_at,
  DROP COLUMN IF EXISTS locked_at,
  DROP COLUMN IF EXISTS accepted_at;

ALTER TABLE public.customer_lifecycle_jobs
  ADD CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','suppressed','completed','cancelled')),
  ADD CONSTRAINT customer_lifecycle_jobs_channel_chk
    CHECK (channel IN ('manual','whatsapp'));

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_whatsapp_marketing_source_chk,
  DROP COLUMN IF EXISTS whatsapp_marketing_opt_in,
  DROP COLUMN IF EXISTS whatsapp_marketing_opt_in_at,
  DROP COLUMN IF EXISTS whatsapp_marketing_opt_out_at,
  DROP COLUMN IF EXISTS whatsapp_marketing_consent_source,
  DROP COLUMN IF EXISTS whatsapp_marketing_source_order_id,
  DROP COLUMN IF EXISTS whatsapp_marketing_last_message_at;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_whatsapp_marketing_opt_in_at_chk,
  DROP COLUMN IF EXISTS whatsapp_marketing_opt_in,
  DROP COLUMN IF EXISTS whatsapp_marketing_opt_in_at;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0093_whatsapp_lifecycle_automation'
  AND rolled_back_at IS NULL;

COMMIT;
