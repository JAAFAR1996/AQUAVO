-- 0098_whatsapp_text_alert_hardening.sql
-- Prevent historical/general WhatsApp text from flooding the operator alert channel.
-- All inbound text remains durable; only correlated post-delivery/lifecycle replies
-- are eligible for Telegram alerts after this boundary.
BEGIN;

DO $do$
BEGIN
  IF to_regclass('public.whatsapp_customer_text_events') IS NULL THEN
    RAISE EXCEPTION
      '0098_DEPENDENCY_MISSING: apply 0096_whatsapp_customer_text_replies first'
      USING ERRCODE='55000';
  END IF;
END
$do$;

ALTER TABLE public.whatsapp_customer_text_events
  ADD COLUMN IF NOT EXISTS alert_suppress_reason text;

ALTER TABLE public.whatsapp_customer_text_events
  DROP CONSTRAINT IF EXISTS whatsapp_customer_text_events_alert_status_chk;

ALTER TABLE public.whatsapp_customer_text_events
  ADD CONSTRAINT whatsapp_customer_text_events_alert_status_chk
  CHECK (alert_status IN ('pending','processing','sent','suppressed'));

-- This is a deliberate one-time rollout boundary. The pre-fix inbox contains
-- historical/general conversations and must never be replayed as a burst of
-- Telegram alerts after the correlation bug is repaired.
UPDATE public.whatsapp_customer_text_events
SET alert_status='suppressed',
    alert_processing_at=NULL,
    alert_suppress_reason='pre_hardening_backlog',
    updated_at=clock_timestamp()
WHERE alert_status IN ('pending','processing');

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0098_whatsapp_text_alert_hardening',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Adds a suppressed terminal state for WhatsApp text alerts and quarantines the pre-fix backlog so historical/general conversations are not replayed to Telegram.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
