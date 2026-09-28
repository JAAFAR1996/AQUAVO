-- 0094_repurchase_per_product_automation_rollback.sql
-- Conservative rollback: refuses to collapse multiple product-scoped lifecycle jobs.

BEGIN;

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.customer_lifecycle_jobs
    WHERE scope_key LIKE 'product:%'
  ) THEN
    RAISE EXCEPTION '0094_ROLLBACK_BLOCKED: product-scoped lifecycle jobs exist';
  END IF;
END
$guard$;

DROP INDEX IF EXISTS public.customer_lifecycle_jobs_repurchase_scope_idx;
DROP TABLE IF EXISTS public.whatsapp_lifecycle_runtime_config;

ALTER TABLE public.customer_lifecycle_jobs
  DROP CONSTRAINT IF EXISTS customer_lifecycle_jobs_scope_uq;

ALTER TABLE public.customer_lifecycle_jobs
  DROP COLUMN IF EXISTS scope_key;

ALTER TABLE public.customer_lifecycle_jobs
  ADD CONSTRAINT customer_lifecycle_jobs_uq
  UNIQUE(order_id,job_type);

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0094_repurchase_per_product_automation'
  AND rolled_back_at IS NULL;

COMMIT;
