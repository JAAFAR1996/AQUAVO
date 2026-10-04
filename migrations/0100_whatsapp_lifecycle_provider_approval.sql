-- 0100_whatsapp_lifecycle_provider_approval.sql
-- Activate lifecycle provider approval only after the operator has explicitly
-- confirmed the exact Meta templates are Approved/Active.
BEGIN;

DO $do$
BEGIN
  IF to_regclass('public.whatsapp_lifecycle_runtime_config') IS NULL THEN
    RAISE EXCEPTION
      '0100_DEPENDENCY_MISSING: apply 0097_whatsapp_lifecycle_fail_closed first'
      USING ERRCODE='55000';
  END IF;
END
$do$;

ALTER TABLE public.whatsapp_lifecycle_runtime_config
  ADD COLUMN IF NOT EXISTS day7_provider_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS repurchase_provider_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_approval_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_approval_source text;

UPDATE public.whatsapp_lifecycle_runtime_config
SET lifecycle_enabled=true,
    day7_enabled=true,
    repurchase_enabled=true,
    activation_at=COALESCE(activation_at,clock_timestamp()),
    day7_template='aquavo_day7_care_v1',
    repurchase_template='aquavo_repurchase_reminder_v1',
    day7_provider_approved=true,
    repurchase_provider_approved=true,
    provider_approval_confirmed_at=clock_timestamp(),
    provider_approval_source='operator_confirmed_meta_active_2026-10-04',
    activation_reason='Exact Day-7 and repurchase templates confirmed Active/Approved in Meta; lifecycle enabled with existing consent, eligibility, daytime, anti-spam and retry guards.',
    updated_at=clock_timestamp()
WHERE id=1;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0100_whatsapp_lifecycle_provider_approval',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Persists explicit operator verification that the exact Meta Day-7 and repurchase templates are Approved/Active and enables lifecycle under the existing safety gates.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
