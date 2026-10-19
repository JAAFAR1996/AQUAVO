-- Additive security storage. No historical orders, costs, or settlements are rewritten.
-- Execute in a transaction with LOCAL aquavo.migration_checksum set to this file's SHA-256.
DO $guard$
BEGIN
  IF COALESCE(current_setting('aquavo.migration_checksum',true),'') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION '0101_REQUIRES_CHECKSUM_AND_EXPLICIT_TRANSACTION';
  END IF;
  IF EXISTS(SELECT 1 FROM public.schema_migrations WHERE version='0101_security_commerce_boundaries'
       AND rolled_back_at IS NULL AND checksum IS DISTINCT FROM current_setting('aquavo.migration_checksum')) THEN
    RAISE EXCEPTION '0101_MIGRATION_CHECKSUM_CONFLICT';
  END IF;
END
$guard$;
CREATE TABLE IF NOT EXISTS public.commerce_request_bindings (
  order_id text PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  principal_hash text NOT NULL CHECK (principal_hash ~ '^[0-9a-f]{64}$'),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.oauth_authorizations (
  id uuid PRIMARY KEY, client_id text NOT NULL, scope text NOT NULL, resource text NOT NULL,
  redirect_uri text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.oauth_token_grants (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  grant_id uuid NOT NULL REFERENCES public.oauth_authorizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('code','refresh')), data jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL, consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS oauth_token_grants_authorization_idx ON public.oauth_token_grants(grant_id);
CREATE INDEX IF NOT EXISTS oauth_authorizations_expiry_idx ON public.oauth_authorizations(expires_at);
REVOKE ALL ON public.commerce_request_bindings,public.oauth_authorizations,public.oauth_token_grants FROM PUBLIC;
DO $grants$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    GRANT SELECT,INSERT ON public.commerce_request_bindings TO aquavo_runtime;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.oauth_authorizations,public.oauth_token_grants TO aquavo_runtime;
  END IF;
END
$grants$;
CREATE OR REPLACE FUNCTION public.revoke_sessions_after_identity_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
  IF OLD.password_hash IS DISTINCT FROM NEW.password_hash OR OLD.role IS DISTINCT FROM NEW.role
     OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
    DELETE FROM public.sessions WHERE sess->>'userId'=NEW.id;
  END IF;
  RETURN NEW;
END
$fn$;
REVOKE ALL ON FUNCTION public.revoke_sessions_after_identity_change() FROM PUBLIC;
DROP TRIGGER IF EXISTS users_revoke_sessions_after_identity_change ON public.users;
CREATE TRIGGER users_revoke_sessions_after_identity_change AFTER UPDATE OF password_hash,role,deleted_at ON public.users
FOR EACH ROW EXECUTE FUNCTION public.revoke_sessions_after_identity_change();
CREATE OR REPLACE FUNCTION public.prevent_wayl_payment_regression()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $fn$
BEGIN
  IF TG_TABLE_NAME='payments' THEN
    IF OLD.method='wayl' AND (OLD.status IN ('completed','refunded') AND NEW.status IN ('pending','failed','cancelled','expired')
       OR OLD.status='refunded' AND NEW.status='completed') THEN
      RAISE EXCEPTION 'WAYL_VERIFIED_PAYMENT_CANNOT_REGRESS';
    END IF;
  ELSE
    IF (OLD.payment_status IN ('paid','refunded') AND NEW.payment_status IN ('pending','failed','cancelled','expired')
        OR OLD.payment_status='refunded' AND NEW.payment_status='paid')
       AND EXISTS(SELECT 1 FROM public.payments WHERE order_id=OLD.id AND method='wayl') THEN
      RAISE EXCEPTION 'WAYL_VERIFIED_ORDER_CANNOT_REGRESS';
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS payments_guard_wayl_monotonic_state ON public.payments;
CREATE TRIGGER payments_guard_wayl_monotonic_state BEFORE UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_wayl_payment_regression();
DROP TRIGGER IF EXISTS orders_guard_wayl_monotonic_state ON public.orders;
CREATE TRIGGER orders_guard_wayl_monotonic_state BEFORE UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_wayl_payment_regression();
INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES('0101_security_commerce_boundaries',current_setting('aquavo.migration_checksum'),
'Credential-bound sessions, persistent hashed OAuth grants, owner-bound checkout, monotonic Wayl states. No financial backfill.')
ON CONFLICT(version) DO UPDATE SET checksum=EXCLUDED.checksum,notes=EXCLUDED.notes,rolled_back_at=NULL,applied_at=clock_timestamp();
