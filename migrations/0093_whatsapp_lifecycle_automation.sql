-- 0093_whatsapp_lifecycle_automation.sql
-- Policy-safe, consent-aware WhatsApp automation for post-purchase care and repurchase reminders.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS whatsapp_care_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_version text,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_captured_at timestamptz;

CREATE TABLE IF NOT EXISTS public.customer_whatsapp_preferences (
  phone text PRIMARY KEY,
  care_opt_in boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  care_opt_in_at timestamptz,
  marketing_opt_in_at timestamptz,
  care_opt_out_at timestamptz,
  marketing_opt_out_at timestamptz,
  all_opt_out_at timestamptz,
  consent_version text,
  consent_source text,
  last_order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  last_inbound_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_whatsapp_preferences_phone_chk
    CHECK (phone ~ '^9647[0-9]{9}$')
);

CREATE TABLE IF NOT EXISTS public.customer_whatsapp_consent_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone text NOT NULL,
  category text NOT NULL,
  action text NOT NULL,
  source text NOT NULL,
  order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  consent_version text,
  inbound_message_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_whatsapp_consent_events_phone_chk
    CHECK (phone ~ '^9647[0-9]{9}$'),
  CONSTRAINT customer_whatsapp_consent_events_category_chk
    CHECK (category IN ('care','marketing','all')),
  CONSTRAINT customer_whatsapp_consent_events_action_chk
    CHECK (action IN ('opt_in','opt_out'))
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_whatsapp_consent_events_inbound_uq
  ON public.customer_whatsapp_consent_events(inbound_message_id)
  WHERE inbound_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customer_whatsapp_consent_events_order_category_uq
  ON public.customer_whatsapp_consent_events(order_id,category,action)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS customer_whatsapp_preferences_updated_idx
  ON public.customer_whatsapp_preferences(updated_at DESC);

CREATE INDEX IF NOT EXISTS customer_whatsapp_consent_events_phone_idx
  ON public.customer_whatsapp_consent_events(phone,created_at DESC);

ALTER TABLE public.customer_message_jobs
  DROP CONSTRAINT IF EXISTS customer_message_jobs_type_chk;

ALTER TABLE public.customer_message_jobs
  ADD CONSTRAINT customer_message_jobs_type_chk
  CHECK (
    job_type = ANY (
      ARRAY[
        'delivery_care'::text,
        'review_request'::text,
        'review_reminder'::text,
        'lifecycle_day7'::text,
        'lifecycle_repurchase'::text
      ]
    )
  );

-- Consent projection is written inside the same application transaction that
-- creates the order (COD and Wayl). Keeping it application-owned avoids hidden
-- trigger side effects while preserving atomic order + consent truth.



INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0093_whatsapp_lifecycle_automation',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Consent-aware WhatsApp lifecycle automation: separate care/marketing opt-ins, append-only consent audit, and lifecycle outbox job types.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
