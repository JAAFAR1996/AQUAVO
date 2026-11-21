-- Review/apply before deploying the associated audit repairs.
-- Additive only: no products, customer data, prices, or historic balances change.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- The visibility column exists on the current production branch, but was absent
-- from the versioned schema. Preserve all existing false values.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_storefront_visible boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_buckets_expires_idx ON public.rate_limit_buckets(expires_at);

CREATE TABLE IF NOT EXISTS public.mutation_receipts (
  key text PRIMARY KEY,
  request_hash text NOT NULL,
  resource_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $ledger$
DECLARE v_checksum text := current_setting('aquavo.migration_checksum', true);
BEGIN
  IF v_checksum IS NULL OR v_checksum !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION '0107_REQUIRES_ACTUAL_FILE_SHA256';
  END IF;
  IF EXISTS (SELECT 1 FROM public.schema_migrations
    WHERE version = '0107_audit_runtime_integrity' AND checksum IS DISTINCT FROM v_checksum) THEN
    RAISE EXCEPTION '0107_MIGRATION_CHECKSUM_MISMATCH';
  END IF;
  INSERT INTO public.schema_migrations(version, checksum, notes)
  VALUES ('0107_audit_runtime_integrity', v_checksum, 'Shared abuse budgets, atomic write receipts and storefront visibility mapping. No repricing.')
  ON CONFLICT (version) DO NOTHING;
END $ledger$;
COMMIT;
