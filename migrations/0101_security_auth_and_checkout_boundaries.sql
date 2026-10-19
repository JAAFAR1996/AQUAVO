-- Additive security state. Never rewrites historic orders or finance.
-- Apply using the recorded SHA-256 through aquavo.migration_checksum.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_session_hash text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_request_hash text;

CREATE TABLE IF NOT EXISTS public.oauth_authorization_codes (
  code_hash text PRIMARY KEY CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  client_id text NOT NULL,
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  scope text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oauth_codes_expiry_idx ON public.oauth_authorization_codes(expires_at);
CREATE TABLE IF NOT EXISTS public.oauth_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  scope text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.oauth_refresh_tokens (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  grant_id uuid NOT NULL REFERENCES public.oauth_grants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS oauth_refresh_grant_idx ON public.oauth_refresh_tokens(grant_id);
REVOKE ALL ON public.oauth_authorization_codes, public.oauth_grants, public.oauth_refresh_tokens FROM PUBLIC;

-- Revocation is atomic with password/role/deletion changes. A version check at
-- session read also defeats an in-flight request resurrecting an old session.
CREATE OR REPLACE FUNCTION public.aquavo_revoke_sessions_on_identity_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $body$
BEGIN
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    NEW.auth_version := OLD.auth_version + 1;
    DELETE FROM public.sessions WHERE sess->>'userId'=OLD.id;
  ELSE
    NEW.auth_version := OLD.auth_version;
  END IF;
  RETURN NEW;
END
$body$;
CREATE OR REPLACE TRIGGER users_security_version
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.aquavo_revoke_sessions_on_identity_change();
DO $grant$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.oauth_authorization_codes,public.oauth_grants,public.oauth_refresh_tokens TO aquavo_runtime;
  END IF;
END
$grant$;
DO $ledger$
DECLARE v_checksum text := current_setting('aquavo.migration_checksum',true);
BEGIN
  IF v_checksum IS NULL OR v_checksum !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION '0101_REQUIRES_ACTUAL_FILE_SHA256';
  END IF;
  IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='0101_security_auth_and_checkout_boundaries' AND checksum IS DISTINCT FROM v_checksum) THEN
    RAISE EXCEPTION '0101_MIGRATION_CHECKSUM_MISMATCH';
  END IF;
  INSERT INTO public.schema_migrations(version,checksum,notes)
  VALUES ('0101_security_auth_and_checkout_boundaries',v_checksum,'Additive session revocation, hashed OAuth grants and checkout ownership state; no financial backfill.')
  ON CONFLICT(version) DO NOTHING;
END
$ledger$;
COMMIT;
