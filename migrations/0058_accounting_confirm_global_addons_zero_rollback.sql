-- 0058_accounting_confirm_global_addons_zero_rollback.sql
-- Once Accounting V2 sales exist, the verified-zero decision is historical
-- evidence used by immutable sale snapshots and must not be silently erased.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.order_accounting_facts) THEN
    UPDATE public.products
    SET packaging_cost=NULL,
        insert_cost=NULL,
        packaging_cost_resolution='unresolved',
        insert_cost_resolution='unresolved',
        cost_resolution_note='0058 rollback before Accounting V2 sales',
        cost_resolution_by='migration_0058_rollback',
        cost_resolution_at=clock_timestamp(),
        updated_at=clock_timestamp()
    WHERE deleted_at IS NULL
      AND cost_resolution_by='owner_confirmation:jaafar:2026-08-03'
      AND packaging_cost_resolution='verified_zero'
      AND insert_cost_resolution='verified_zero';

    UPDATE public.accounting_review_flags
    SET status='open',resolved_at=NULL,resolved_by=NULL
    WHERE category='product_cost'
      AND entity_id='aquavo-2026-08-01'
      AND resolved_by='owner_confirmation:jaafar:2026-08-03';
  ELSE
    RAISE NOTICE '0058 evidence retained because Accounting V2 sales already exist';
  END IF;
END $$;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' [guarded rollback requested]'
WHERE version='0058_accounting_confirm_global_addons_zero';

COMMIT;
