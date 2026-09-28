-- 0093_whatsapp_lifecycle_automation.sql
-- Safe automation layer for AQUAVO post-purchase WhatsApp lifecycle.
-- Keeps transactional delivery-care separate from day-7 care and marketing
-- repurchase reminders, records explicit consent, and preserves at-most-once
-- provider delivery semantics.

BEGIN;

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_followup_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_followup_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_followup_opt_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_source text,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_updated_at timestamptz;

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_whatsapp_consent_source_chk;

ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_whatsapp_consent_source_chk
    CHECK (
      whatsapp_consent_source IS NULL
      OR whatsapp_consent_source IN ('checkout','admin','whatsapp_reply','import')
    );

ALTER TABLE public.customer_lifecycle_jobs
  ADD COLUMN IF NOT EXISTS template_category text,
  ADD COLUMN IF NOT EXISTS consent_scope text,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz;

ALTER TABLE public.customer_lifecycle_jobs
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_status_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_template_category_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_consent_scope_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_provider_status_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_attempt_count_chk;

ALTER TABLE public.customer_lifecycle_jobs
  ADD CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','sending','suppressed','completed','cancelled','failed')),
  ADD CONSTRAINT customer_lifecycle_jobs_template_category_chk
    CHECK (template_category IS NULL OR template_category IN ('utility','marketing')),
  ADD CONSTRAINT customer_lifecycle_jobs_consent_scope_chk
    CHECK (consent_scope IS NULL OR consent_scope IN ('followup','marketing')),
  ADD CONSTRAINT customer_lifecycle_jobs_provider_status_chk
    CHECK (provider_status IS NULL OR provider_status IN ('accepted','sent','delivered','read','failed')),
  ADD CONSTRAINT customer_lifecycle_jobs_attempt_count_chk
    CHECK (attempt_count >= 0 AND attempt_count <= 10);

CREATE UNIQUE INDEX IF NOT EXISTS customer_lifecycle_jobs_provider_message_uidx
  ON public.customer_lifecycle_jobs(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_whatsapp_due_idx
  ON public.customer_lifecycle_jobs(channel,status,due_at)
  WHERE channel='whatsapp';

CREATE TABLE IF NOT EXISTS public.whatsapp_lifecycle_consent_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inbound_message_id text UNIQUE,
  customer_phone text NOT NULL,
  action text NOT NULL,
  scope text NOT NULL,
  source text NOT NULL,
  order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_lifecycle_consent_events_action_chk
    CHECK (action IN ('opt_in','opt_out')),
  CONSTRAINT whatsapp_lifecycle_consent_events_scope_chk
    CHECK (scope IN ('followup','marketing','all')),
  CONSTRAINT whatsapp_lifecycle_consent_events_source_chk
    CHECK (source IN ('checkout','admin','whatsapp_reply','import'))
);

CREATE INDEX IF NOT EXISTS whatsapp_lifecycle_consent_events_phone_idx
  ON public.whatsapp_lifecycle_consent_events(customer_phone,occurred_at DESC);

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0093_whatsapp_lifecycle_automation',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Explicit WhatsApp lifecycle consent, provider lifecycle fields, and durable consent events for automatic day-7 care and repurchase messaging.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
