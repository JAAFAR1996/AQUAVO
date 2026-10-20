-- Rollback is deliberately guarded. Never destroy treasury cashbook history silently.
-- Only safe before any owner-created accounts or movements exist.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $guard$
BEGIN
  IF current_setting('aquavo.approved_treasury_rollback', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'EXPLICIT_TREASURY_ROLLBACK_APPROVAL_REQUIRED';
  END IF;
  IF EXISTS(SELECT 1 FROM public.treasury_accounts)
     OR EXISTS(SELECT 1 FROM public.treasury_movements)
     OR EXISTS(SELECT 1 FROM public.treasury_reconciliations)
     OR EXISTS(SELECT 1 FROM public.treasury_gateway_allocations) THEN
    RAISE EXCEPTION 'TREASURY_ROLLBACK_REFUSED: financial records require retained archival and review';
  END IF;
END
$guard$;
DROP TRIGGER IF EXISTS treasury_gateway_allocations_immutable ON public.treasury_gateway_allocations;
DROP TRIGGER IF EXISTS treasury_reconciliations_immutable ON public.treasury_reconciliations;
DROP TRIGGER IF EXISTS treasury_movements_immutable ON public.treasury_movements;
DROP TABLE IF EXISTS public.treasury_gateway_allocations;
DROP TABLE IF EXISTS public.treasury_reconciliations;
DROP TABLE IF EXISTS public.treasury_movements;
DROP TABLE IF EXISTS public.treasury_accounts;
DROP FUNCTION IF EXISTS public.guard_treasury_immutable();
DELETE FROM public.schema_migrations WHERE version='0103_treasury_cashbook';
COMMIT;
