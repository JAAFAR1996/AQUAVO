-- 0082_whatsapp_delivery_care_button_inbox
-- Durable inbox for signed delivery-care Quick Reply callbacks that can race the
-- outbound wamid persistence step. Events are deduplicated by Meta inbound
-- message id and reconciled once customer_message_jobs.provider_message_id is
-- available.

BEGIN;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0079_customer_post_delivery_messaging'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION
      '0082_DEPENDENCY_MISSING: apply active 0079_customer_post_delivery_messaging before WhatsApp button inbox'
      USING ERRCODE='55000';
  END IF;
END
$do$;

CREATE TABLE IF NOT EXISTS public.whatsapp_delivery_care_button_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inbound_message_id text NOT NULL,
  context_provider_message_id text NOT NULL,
  sender_phone text NOT NULL,
  button_payload text NOT NULL DEFAULT '',
  button_text text NOT NULL DEFAULT '',
  received_at timestamptz NOT NULL,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT whatsapp_delivery_care_button_events_inbound_uq
    UNIQUE (inbound_message_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_delivery_care_button_events_pending_idx
  ON public.whatsapp_delivery_care_button_events (
    context_provider_message_id,
    received_at,
    created_at
  )
  WHERE applied_at IS NULL;

COMMENT ON TABLE public.whatsapp_delivery_care_button_events IS
  'Durable idempotent inbox for signed delivery-care Quick Reply callbacks that arrive before the originating outbound wamid is durably correlated to its message job.';

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    REVOKE ALL ON public.whatsapp_delivery_care_button_events FROM PUBLIC;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.whatsapp_delivery_care_button_events TO aquavo_runtime;
  END IF;
END
$do$;

INSERT INTO public.schema_migrations(version, checksum, notes)
VALUES(
  '0082_whatsapp_delivery_care_button_inbox',
  '0082008200820082008200820082008200820082008200820082008200820082',
  'Durable idempotent inbox for delivery-care Quick Reply callbacks racing outbound wamid persistence'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;
