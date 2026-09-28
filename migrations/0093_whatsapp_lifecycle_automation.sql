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

CREATE OR REPLACE FUNCTION public.aquavo_sync_whatsapp_consent_from_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_phone text;
  captured_at timestamptz;
BEGIN
  IF COALESCE(NEW.is_test,false) THEN
    RETURN NEW;
  END IF;

  IF NOT COALESCE(NEW.whatsapp_care_opt_in,false)
     AND NOT COALESCE(NEW.whatsapp_marketing_opt_in,false) THEN
    RETURN NEW;
  END IF;

  normalized_phone := public.aquavo_normalize_iraqi_phone(NEW.customer_phone);
  IF normalized_phone IS NULL THEN
    RETURN NEW;
  END IF;

  captured_at := COALESCE(NEW.whatsapp_consent_captured_at,clock_timestamp());

  INSERT INTO public.customer_whatsapp_preferences(
    phone,
    care_opt_in,
    marketing_opt_in,
    care_opt_in_at,
    marketing_opt_in_at,
    care_opt_out_at,
    marketing_opt_out_at,
    all_opt_out_at,
    consent_version,
    consent_source,
    last_order_id,
    created_at,
    updated_at
  )
  VALUES(
    normalized_phone,
    COALESCE(NEW.whatsapp_care_opt_in,false),
    COALESCE(NEW.whatsapp_marketing_opt_in,false),
    CASE WHEN NEW.whatsapp_care_opt_in THEN captured_at ELSE NULL END,
    CASE WHEN NEW.whatsapp_marketing_opt_in THEN captured_at ELSE NULL END,
    NULL,
    NULL,
    NULL,
    NEW.whatsapp_consent_version,
    'checkout',
    NEW.id,
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT(phone) DO UPDATE SET
    care_opt_in = public.customer_whatsapp_preferences.care_opt_in
                  OR EXCLUDED.care_opt_in,
    marketing_opt_in = public.customer_whatsapp_preferences.marketing_opt_in
                       OR EXCLUDED.marketing_opt_in,
    care_opt_in_at = CASE
      WHEN EXCLUDED.care_opt_in THEN EXCLUDED.care_opt_in_at
      ELSE public.customer_whatsapp_preferences.care_opt_in_at
    END,
    marketing_opt_in_at = CASE
      WHEN EXCLUDED.marketing_opt_in THEN EXCLUDED.marketing_opt_in_at
      ELSE public.customer_whatsapp_preferences.marketing_opt_in_at
    END,
    care_opt_out_at = CASE
      WHEN EXCLUDED.care_opt_in THEN NULL
      ELSE public.customer_whatsapp_preferences.care_opt_out_at
    END,
    marketing_opt_out_at = CASE
      WHEN EXCLUDED.marketing_opt_in THEN NULL
      ELSE public.customer_whatsapp_preferences.marketing_opt_out_at
    END,
    all_opt_out_at = CASE
      WHEN EXCLUDED.care_opt_in OR EXCLUDED.marketing_opt_in THEN NULL
      ELSE public.customer_whatsapp_preferences.all_opt_out_at
    END,
    consent_version = COALESCE(EXCLUDED.consent_version,public.customer_whatsapp_preferences.consent_version),
    consent_source = 'checkout',
    last_order_id = EXCLUDED.last_order_id,
    updated_at = clock_timestamp();

  IF NEW.whatsapp_care_opt_in THEN
    INSERT INTO public.customer_whatsapp_consent_events(
      phone,category,action,source,order_id,consent_version,metadata
    ) VALUES(
      normalized_phone,'care','opt_in','checkout',NEW.id,NEW.whatsapp_consent_version,
      jsonb_build_object('capturedAt',captured_at)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.whatsapp_marketing_opt_in THEN
    INSERT INTO public.customer_whatsapp_consent_events(
      phone,category,action,source,order_id,consent_version,metadata
    ) VALUES(
      normalized_phone,'marketing','opt_in','checkout',NEW.id,NEW.whatsapp_consent_version,
      jsonb_build_object('capturedAt',captured_at)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_whatsapp_consent ON public.orders;
CREATE TRIGGER trg_orders_sync_whatsapp_consent
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.aquavo_sync_whatsapp_consent_from_order();

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
