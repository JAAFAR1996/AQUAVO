-- 0068_accounting_delivery_readiness_guard_rollback.sql
-- Removes the fail-closed delivery gate. Existing accounting facts remain immutable.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version IN (
      '0069_accounting_return_integrity',
      '0070_accounting_ledger_backed_views'
    )
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0068_ROLLBACK_BLOCKED: roll back 0070 and 0069 first';
  END IF;
END $$;

DROP TRIGGER IF EXISTS orders_accounting_delivery_readiness_guard ON public.orders;
DROP FUNCTION IF EXISTS public.guard_order_delivery_accounting_readiness();
DROP FUNCTION IF EXISTS public.assert_order_ready_for_accounting_delivery(text);

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0068_accounting_delivery_readiness_guard'
  AND rolled_back_at IS NULL;

COMMIT;
