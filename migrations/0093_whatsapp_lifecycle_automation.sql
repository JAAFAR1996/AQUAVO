-- 0093_whatsapp_lifecycle_automation.sql
-- AQUAVO automatic WhatsApp lifecycle:
--   * explicit marketing-consent ledger
--   * provider lifecycle fields on Growth OS jobs
--   * durable contextual-reply inbox
--   * fail-closed foundations for day-7 care + replenishment automation
--
-- Important policy boundary:
--   - day7_care is service/utility follow-up tied to a delivered order.
--   - repurchase is marketing and MUST require explicit customer opt-in.
--   - an unchecked checkout box never revokes a previous opt-in. Opt-out is explicit.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0092_growth_os_aquarium_notes'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0093_REQUIRES_ACTIVE_0092';
  END IF;
END
$guard$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in_at timestamptz;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_whatsapp_marketing_opt_in_at_chk;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_whatsapp_marketing_opt_in_at_chk
  CHECK (
    whatsapp_marketing_opt_in=false
    OR whatsapp_marketing_opt_in_at IS NOT NULL
  );

COMMENT ON COLUMN public.orders.whatsapp_marketing_opt_in IS
  'Explicit checkout consent for AQUAVO WhatsApp marketing/replenishment reminders. False does not mean opt-out; it means this order did not add new consent.';
COMMENT ON COLUMN public.orders.whatsapp_marketing_opt_in_at IS
  'Timestamp of the explicit checkout marketing opt-in captured for this order.';

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_consent_source text,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_source_order_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_last_message_at timestamptz;

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_whatsapp_marketing_source_chk;

ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_whatsapp_marketing_source_chk
  CHECK (
    whatsapp_marketing_consent_source IS NULL
    OR whatsapp_marketing_consent_source IN ('checkout','whatsapp','admin','import')
  );

CREATE TABLE IF NOT EXISTS public.customer_messaging_consent_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_phone text NOT NULL,
  order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  source text NOT NULL,
  source_event_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customer_messaging_consent_events_type_chk
    CHECK (event_type IN ('marketing_opt_in','marketing_opt_out')),
  CONSTRAINT customer_messaging_consent_events_source_chk
    CHECK (source IN ('checkout','whatsapp','admin','import'))
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_messaging_consent_events_source_event_uidx
  ON public.customer_messaging_consent_events(source,source_event_id)
  WHERE source_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS customer_messaging_consent_events_phone_idx
  ON public.customer_messaging_consent_events(customer_phone,occurred_at DESC);

CREATE OR REPLACE FUNCTION public.aquavo_capture_whatsapp_marketing_consent()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  canonical_phone text;
  consent_at timestamptz;
BEGIN
  IF COALESCE(NEW.is_test,false)=true
     OR COALESCE(NEW.whatsapp_marketing_opt_in,false)=false THEN
    RETURN NEW;
  END IF;

  canonical_phone := public.aquavo_normalize_iraqi_phone(NEW.customer_phone);
  IF canonical_phone IS NULL THEN
    RETURN NEW;
  END IF;

  consent_at := COALESCE(NEW.whatsapp_marketing_opt_in_at, clock_timestamp());

  -- Ensure the canonical CRM row exists even if trigger ordering changes later.
  PERFORM public.aquavo_refresh_customer_profile(NEW.customer_phone);

  UPDATE public.customer_profiles
     SET whatsapp_marketing_opt_in=true,
         whatsapp_marketing_opt_in_at=CASE
           WHEN whatsapp_marketing_opt_out_at IS NOT NULL
                AND whatsapp_marketing_opt_out_at > consent_at
             THEN whatsapp_marketing_opt_in_at
           ELSE consent_at
         END,
         whatsapp_marketing_opt_out_at=CASE
           WHEN whatsapp_marketing_opt_out_at IS NOT NULL
                AND whatsapp_marketing_opt_out_at > consent_at
             THEN whatsapp_marketing_opt_out_at
           ELSE NULL
         END,
         whatsapp_marketing_consent_source='checkout',
         whatsapp_marketing_source_order_id=NEW.id,
         updated_at=clock_timestamp()
   WHERE phone=canonical_phone;

  INSERT INTO public.customer_messaging_consent_events(
    customer_phone,order_id,event_type,source,source_event_id,metadata,occurred_at
  ) VALUES (
    canonical_phone,
    NEW.id,
    'marketing_opt_in',
    'checkout',
    'order:' || NEW.id,
    jsonb_build_object('channel','whatsapp','purpose','replenishment'),
    consent_at
  )
  ON CONFLICT (source,source_event_id)
    WHERE source_event_id IS NOT NULL
  DO NOTHING;

  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_orders_whatsapp_marketing_consent ON public.orders;
CREATE TRIGGER trg_orders_whatsapp_marketing_consent
AFTER INSERT OR UPDATE OF whatsapp_marketing_opt_in,whatsapp_marketing_opt_in_at,customer_phone
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.aquavo_capture_whatsapp_marketing_consent();

ALTER TABLE public.customer_lifecycle_jobs
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

ALTER TABLE public.customer_lifecycle_jobs
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_status_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_channel_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_attempt_count_chk,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_provider_status_chk;

ALTER TABLE public.customer_lifecycle_jobs
  ADD CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','sending','completed','failed','suppressed','cancelled')),
  ADD CONSTRAINT customer_lifecycle_jobs_channel_chk
    CHECK (channel IN ('manual','whatsapp')),
  ADD CONSTRAINT customer_lifecycle_jobs_attempt_count_chk
    CHECK (attempt_count >= 0),
  ADD CONSTRAINT customer_lifecycle_jobs_provider_status_chk
    CHECK (provider_status IS NULL OR provider_status IN ('accepted','sent','delivered','read','failed'));

CREATE UNIQUE INDEX IF NOT EXISTS customer_lifecycle_jobs_provider_message_uidx
  ON public.customer_lifecycle_jobs(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_whatsapp_due_idx
  ON public.customer_lifecycle_jobs(due_at,created_at)
  WHERE channel='whatsapp' AND status='ready';

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_whatsapp_stale_idx
  ON public.customer_lifecycle_jobs(locked_at,created_at)
  WHERE channel='whatsapp' AND status='sending';

CREATE TABLE IF NOT EXISTS public.whatsapp_lifecycle_reply_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inbound_message_id text NOT NULL UNIQUE,
  context_provider_message_id text NOT NULL,
  sender_phone text NOT NULL,
  button_payload text,
  button_text text,
  received_at timestamptz NOT NULL,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_lifecycle_reply_events_pending_idx
  ON public.whatsapp_lifecycle_reply_events(context_provider_message_id,received_at,created_at)
  WHERE applied_at IS NULL;

COMMENT ON TABLE public.customer_messaging_consent_events IS
  'Append-only audit ledger for explicit AQUAVO WhatsApp marketing opt-in/opt-out changes.';
COMMENT ON TABLE public.whatsapp_lifecycle_reply_events IS
  'Minimal verified contextual-reply inbox for day-7/replenishment WhatsApp templates. Closes the race where a reply arrives before outbound wamid persistence.';

DO $priv$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    REVOKE ALL ON public.customer_messaging_consent_events FROM PUBLIC;
    GRANT SELECT,INSERT ON public.customer_messaging_consent_events TO aquavo_runtime;

    REVOKE ALL ON public.whatsapp_lifecycle_reply_events FROM PUBLIC;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.whatsapp_lifecycle_reply_events TO aquavo_runtime;

    GRANT SELECT,UPDATE ON public.customer_lifecycle_jobs TO aquavo_runtime;
    GRANT SELECT,UPDATE ON public.customer_profiles TO aquavo_runtime;

    REVOKE ALL ON FUNCTION public.aquavo_capture_whatsapp_marketing_consent() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.aquavo_capture_whatsapp_marketing_consent() TO aquavo_runtime;
  END IF;
END
$priv$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0093_whatsapp_lifecycle_automation',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Explicit WhatsApp marketing consent ledger + automatic Growth OS lifecycle provider state and contextual reply inbox. Day-7 is utility/service; replenishment requires explicit marketing opt-in. Runner must normalize checksum to SHA-256(file bytes).'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
