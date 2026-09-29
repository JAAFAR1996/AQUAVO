-- 0097_whatsapp_lifecycle_fail_closed.sql
-- Keep unapproved lifecycle templates disabled after the 0094 rollout scaffold.
-- Provider approval is an external prerequisite and must never be inferred from
-- a template name existing in code.
BEGIN;

DO $do$
BEGIN
  IF to_regclass('public.whatsapp_lifecycle_runtime_config') IS NULL THEN
    RAISE EXCEPTION
      '0097_DEPENDENCY_MISSING: apply 0094_repurchase_per_product_automation first'
      USING ERRCODE='55000';
  END IF;
END
$do$;

UPDATE public.whatsapp_lifecycle_runtime_config
SET lifecycle_enabled=false,
    day7_enabled=false,
    repurchase_enabled=false,
    activation_at=NULL,
    day7_template='aquavo_day7_care_v1',
    repurchase_template='aquavo_repurchase_reminder_v1',
    activation_reason='Fail closed until Meta shows the exact Day-7 and repurchase templates Approved/Active',
    updated_at=clock_timestamp()
WHERE id=1;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0097_whatsapp_lifecycle_fail_closed',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Disables Day-7 and repurchase WhatsApp lifecycle until provider-side template approval is explicitly verified and a new activation boundary is set.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
