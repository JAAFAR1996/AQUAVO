-- Roll application code back first. Leave the additive structures in place:
-- receipts prevent repeated financial writes and visibility predates this file.
-- This rollback refuses to erase a receipt or a hidden-product decision.
BEGIN;
SET LOCAL lock_timeout = '5s';
-- Block in-flight writers before deciding whether dropping this table is safe.
-- An EXISTS check without this lock races a newly committed financial receipt.
LOCK TABLE public.mutation_receipts IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM public.mutation_receipts) THEN
    RAISE EXCEPTION '0107_KEEP_WRITE_RECEIPTS_ROLL_BACK_APP_ONLY';
  END IF;
END $rollback$;
DROP TABLE IF EXISTS public.mutation_receipts;
DROP TABLE IF EXISTS public.rate_limit_buckets;
-- Deliberately retain is_storefront_visible: it existed before this migration.
DELETE FROM public.schema_migrations WHERE version = '0107_audit_runtime_integrity';
COMMIT;
