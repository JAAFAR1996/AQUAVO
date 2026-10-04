-- 0099_customer_messaging_scheduler_auth.sql
-- Dedicated authentication boundary for the reliable Neon Function scheduler.
-- Only a SHA-256 digest is stored in Postgres; the bearer secret lives solely in
-- the scheduled function environment.
BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_messaging_scheduler_auth (
  id smallint PRIMARY KEY,
  token_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT customer_messaging_scheduler_auth_singleton_chk CHECK (id=1),
  CONSTRAINT customer_messaging_scheduler_auth_hash_chk CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

INSERT INTO public.customer_messaging_scheduler_auth(id,token_hash,enabled)
VALUES(1,'db7a045c9ffeee84cc93053e09a788a28187f380c726adf4d85f39658093e853',true)
ON CONFLICT(id) DO UPDATE SET
  token_hash=EXCLUDED.token_hash,
  enabled=true,
  updated_at=clock_timestamp();

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    REVOKE ALL ON public.customer_messaging_scheduler_auth FROM PUBLIC;
    GRANT SELECT ON public.customer_messaging_scheduler_auth TO aquavo_runtime;
  END IF;
END
$do$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0099_customer_messaging_scheduler_auth',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Stores only the SHA-256 digest used to authenticate the Neon Function customer-messaging scheduler; GitHub OIDC remains an independent fallback.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
