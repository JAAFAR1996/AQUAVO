BEGIN;
DO $guard$ BEGIN
IF current_setting('aquavo.approved_security_rollback',true) IS DISTINCT FROM 'true' THEN
RAISE EXCEPTION 'EXPLICIT_SECURITY_ROLLBACK_APPROVAL_REQUIRED'; END IF;
END $guard$;
DROP TRIGGER IF EXISTS orders_wayl_monotonic_guard ON public.orders;
DROP TRIGGER IF EXISTS payments_wayl_monotonic_guard ON public.payments;
UPDATE public.schema_migrations SET rolled_back_at=now() WHERE version='0102_wayl_monotonic_payment_guards';
COMMIT;
