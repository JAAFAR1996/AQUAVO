-- 0096_whatsapp_inbound_text_events.sql
-- Durable inbox for ordinary WhatsApp text replies to AQUAVO outbound messages.
-- Templates no longer depend on Quick Reply buttons, so free-text customer replies
-- must remain traceable and support escalation must survive webhook retries.
BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_text_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inbound_message_id text NOT NULL UNIQUE,
  context_provider_message_id text,
  sender_phone text NOT NULL,
  message_text text NOT NULL,
  received_at timestamptz NOT NULL,
  order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  source_job_kind text,
  source_job_id text,
  marketing_opt_out boolean NOT NULL DEFAULT false,
  operator_alerted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT whatsapp_inbound_text_events_kind_chk
    CHECK (source_job_kind IS NULL OR source_job_kind IN ('delivery_care','day7_care','repurchase'))
);

CREATE INDEX IF NOT EXISTS whatsapp_inbound_text_events_phone_idx
  ON public.whatsapp_inbound_text_events(sender_phone,received_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_inbound_text_events_unalerted_idx
  ON public.whatsapp_inbound_text_events(received_at,created_at)
  WHERE operator_alerted_at IS NULL;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    REVOKE ALL ON public.whatsapp_inbound_text_events FROM PUBLIC;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.whatsapp_inbound_text_events TO aquavo_runtime;
  END IF;
END
$do$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0096_whatsapp_inbound_text_events',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Durable deduplicated inbox for ordinary WhatsApp text replies, operator escalation, and explicit text opt-out.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
