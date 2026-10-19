-- Stop the application first. Never discard live request ownership or OAuth consent evidence.
BEGIN;
DO $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM public.commerce_request_bindings) OR EXISTS(SELECT 1 FROM public.oauth_authorizations) THEN
    RAISE EXCEPTION '0101_ROLLBACK_REFUSED: security evidence exists; use a reviewed forward fix';
  END IF;
END
$guard$;
DROP TRIGGER IF EXISTS payments_guard_wayl_monotonic_state ON public.payments;
DROP TRIGGER IF EXISTS orders_guard_wayl_monotonic_state ON public.orders;
DROP FUNCTION IF EXISTS public.prevent_wayl_payment_regression();
DROP TRIGGER IF EXISTS users_revoke_sessions_after_identity_change ON public.users;
DROP FUNCTION IF EXISTS public.revoke_sessions_after_identity_change();
DROP TABLE IF EXISTS public.oauth_token_grants;
DROP TABLE IF EXISTS public.oauth_authorizations;
DROP TABLE IF EXISTS public.commerce_request_bindings;
UPDATE public.schema_migrations SET rolled_back_at=clock_timestamp() WHERE version='0101_security_commerce_boundaries';
COMMIT;
