-- AQUAVO database repair: remove non-operational tables from public namespace
-- Date: 2026-07-22
-- Non-destructive: tables and rows are moved, not dropped.

CREATE SCHEMA IF NOT EXISTS archive;
REVOKE CREATE ON SCHEMA archive FROM PUBLIC;
REVOKE ALL ON SCHEMA archive FROM aquavo_runtime;

DO $$
BEGIN
  IF to_regclass('public.orders_backup_cod_20260625') IS NOT NULL
    AND to_regclass('archive.orders_backup_cod_20260625') IS NULL
  THEN
    ALTER TABLE public.orders_backup_cod_20260625
      SET SCHEMA archive;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.audit_log') IS NOT NULL
    AND to_regclass('archive.audit_log') IS NULL
  THEN
    ALTER TABLE public.audit_log
      SET SCHEMA archive;
  END IF;
END
$$;

COMMENT ON TABLE archive.orders_backup_cod_20260625 IS
  'Historical order backup captured on 2026-06-25. Not an application source of truth.';

COMMENT ON TABLE archive.audit_log IS
  'Deprecated empty audit table. Canonical application audit table is public.audit_logs.';

REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM aquavo_runtime;
