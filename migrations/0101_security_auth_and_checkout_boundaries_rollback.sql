-- Operator-only rollback. Additive columns/token tables are retained so no
-- historical data is erased. Roll back application first; revoke OAuth grants.
BEGIN;
DO $guard$
BEGIN
  IF current_setting('aquavo.approved_security_rollback',true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'EXPLICIT_SECURITY_ROLLBACK_APPROVAL_REQUIRED';
  END IF;
END
$guard$;
DROP TRIGGER IF EXISTS users_security_version ON public.users;
UPDATE public.oauth_grants SET revoked_at=now() WHERE revoked_at IS NULL;
UPDATE public.schema_migrations SET rolled_back_at=now()
WHERE version='0101_security_auth_and_checkout_boundaries';
COMMIT;
