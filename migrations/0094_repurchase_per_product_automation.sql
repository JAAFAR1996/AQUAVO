-- 0094_repurchase_per_product_automation.sql
-- AQUAVO product-aware replenishment automation
-- One durable lifecycle job per consumable product and order
-- Production activation boundary stored in PostgreSQL
--
-- Safety boundary
-- Only orders delivered on/after activation_at can create automatic repurchase jobs.
-- Marketing delivery still requires current explicit WhatsApp opt-in at send time.

BEGIN;

ALTER TABLE public.customer_lifecycle_jobs
  ADD COLUMN IF NOT EXISTS scope_key text;

UPDATE public.customer_lifecycle_jobs
SET scope_key = CASE
  WHEN job_type='day7_care' THEN 'order'
  ELSE 'legacy'
END
WHERE scope_key IS NULL OR btrim(scope_key)='';

ALTER TABLE public.customer_lifecycle_jobs
  ALTER COLUMN scope_key SET DEFAULT 'order',
  ALTER COLUMN scope_key SET NOT NULL;

ALTER TABLE public.customer_lifecycle_jobs
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_uq,
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_scope_uq;

ALTER TABLE public.customer_lifecycle_jobs
  ADD CONSTRAINT customer_lifecycle_jobs_scope_uq
  UNIQUE(order_id,job_type,scope_key);

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_repurchase_scope_idx
  ON public.customer_lifecycle_jobs(customer_phone,job_type,scope_key,due_at)
  WHERE job_type='repurchase';

CREATE TABLE IF NOT EXISTS public.whatsapp_lifecycle_runtime_config (
  id smallint PRIMARY KEY,
  lifecycle_enabled boolean NOT NULL DEFAULT false,
  day7_enabled boolean NOT NULL DEFAULT false,
  repurchase_enabled boolean NOT NULL DEFAULT false,
  activation_at timestamptz,
  day7_template text,
  repurchase_template text,
  activation_reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT whatsapp_lifecycle_runtime_config_singleton_chk CHECK (id=1),
  CONSTRAINT whatsapp_lifecycle_runtime_config_activation_chk CHECK (
    lifecycle_enabled=false OR activation_at IS NOT NULL
  ),
  CONSTRAINT whatsapp_lifecycle_runtime_config_repurchase_template_chk CHECK (
    repurchase_enabled=false
    OR (repurchase_template IS NOT NULL AND btrim(repurchase_template)<>'')
  )
);

INSERT INTO public.whatsapp_lifecycle_runtime_config(
  id,
  lifecycle_enabled,
  day7_enabled,
  repurchase_enabled,
  activation_at,
  day7_template,
  repurchase_template,
  activation_reason
)
VALUES(
  1,
  true,
  false,
  true,
  clock_timestamp(),
  NULL,
  'aquavo_repurchase_reminder_v1',
  'User requested automatic product-based replenishment reminders on 2026-09-29'
)
ON CONFLICT(id) DO NOTHING;

COMMENT ON COLUMN public.customer_lifecycle_jobs.scope_key IS
  'Idempotency scope. day7 uses order, replenishment uses product:<product_id>, allowing independent due dates per consumable product.';

COMMENT ON TABLE public.whatsapp_lifecycle_runtime_config IS
  'Durable non-secret rollout controls for AQUAVO WhatsApp lifecycle automation. Provider credentials remain environment secrets.';

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0094_repurchase_per_product_automation',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Adds per-product lifecycle scope plus durable activation controls. Replenishment is enabled for new post-activation delivered orders only and still requires current explicit marketing opt-in.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
