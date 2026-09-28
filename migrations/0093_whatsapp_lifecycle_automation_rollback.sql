-- 0093_whatsapp_lifecycle_automation_rollback.sql
BEGIN;

DROP TABLE IF EXISTS public.whatsapp_lifecycle_consent_events;

DROP INDEX IF EXISTS public.customer_lifecycle_jobs_whatsapp_due_idx;
DROP INDEX IF EXISTS public.customer_lifecycle_jobs_provider_message_uidx;

ALTER TABLE public.customer_lifecycle_jobs
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_attempt_count_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_provider_status_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_consent_scope_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_template_category_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_status_chk;

ALTER TABLE public.customer_lifecycle_jobs
  DROP COLUMN IF EXISTS last_error_at,
  DROP COLUMN IF EXISTS last_error_code,
  DROP COLUMN IF EXISTS sent_at,
  DROP COLUMN IF EXISTS accepted_at,
  DROP COLUMN IF EXISTS locked_at,
  DROP COLUMN IF EXISTS attempt_count,
  DROP COLUMN IF EXISTS provider_status_at,
  DROP COLUMN IF EXISTS provider_status,
  DROP COLUMN IF EXISTS provider_message_id,
  DROP COLUMN IF EXISTS consent_scope,
  DROP COLUMN IF EXISTS template_category;

ALTER TABLE public.customer_lifecycle_jobs
  ADD CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','suppressed','completed','cancelled'));

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_whatsapp_consent_source_chk,
  DROP COLUMN IF EXISTS whatsapp_consent_updated_at,
  DROP COLUMN IF EXISTS whatsapp_consent_source,
  DROP COLUMN IF EXISTS whatsapp_followup_opt_out_at,
  DROP COLUMN IF EXISTS whatsapp_marketing_opt_in_at,
  DROP COLUMN IF EXISTS whatsapp_marketing_opt_in,
  DROP COLUMN IF EXISTS whatsapp_followup_opt_in_at,
  DROP COLUMN IF EXISTS whatsapp_followup_opt_in;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0093_whatsapp_lifecycle_automation';

COMMIT;
