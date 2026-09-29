-- 0096_whatsapp_customer_text_replies.sql
-- Durable inbox for free-text WhatsApp replies to buttonless lifecycle templates.
BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_customer_text_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inbound_message_id text NOT NULL UNIQUE,
  context_provider_message_id text,
  sender_phone text NOT NULL,
  message_text text NOT NULL,
  received_at timestamptz NOT NULL,
  matched_job_type text,
  matched_job_id text,
  matched_order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  marketing_opt_out boolean NOT NULL DEFAULT false,
  alert_status text NOT NULL DEFAULT 'pending',
  alert_attempt_count integer NOT NULL DEFAULT 0,
  alert_processing_at timestamptz,
  alerted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT whatsapp_customer_text_events_job_type_chk
    CHECK (matched_job_type IS NULL OR matched_job_type IN ('delivery_care','day7_care','repurchase')),
  CONSTRAINT whatsapp_customer_text_events_alert_status_chk
    CHECK (alert_status IN ('pending','processing','sent')),
  CONSTRAINT whatsapp_customer_text_events_alert_attempts_chk
    CHECK (alert_attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS whatsapp_customer_text_events_unalerted_idx
  ON public.whatsapp_customer_text_events(created_at)
  WHERE alert_status='pending';

CREATE INDEX IF NOT EXISTS whatsapp_customer_text_events_sender_idx
  ON public.whatsapp_customer_text_events(sender_phone,received_at DESC);

COMMENT ON TABLE public.whatsapp_customer_text_events IS
  'Durable idempotent inbox for free-text WhatsApp customer replies. Used by buttonless AQUAVO delivery-care, day-7 and replenishment templates; replies are correlated by context wamid when present, otherwise by sender + recent outbound message.';

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    REVOKE ALL ON public.whatsapp_customer_text_events FROM PUBLIC;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.whatsapp_customer_text_events TO aquavo_runtime;
  END IF;
END
$do$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0096_whatsapp_customer_text_replies',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Durable free-text WhatsApp reply inbox for buttonless post-delivery, day-7 and repurchase templates.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
