-- Apply before deploying the app. Old invoice links keep their Arabic default.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.manual_invoices
  ADD COLUMN IF NOT EXISTS invoice_locale text NOT NULL DEFAULT 'ar';

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.manual_invoices'::regclass
    AND conname = 'manual_invoices_locale_check'
  ) THEN
    ALTER TABLE public.manual_invoices ADD CONSTRAINT manual_invoices_locale_check
      CHECK (invoice_locale IN ('ar', 'ckb'));
  END IF;
END $migration$;

DO $ledger$
DECLARE v_checksum text := current_setting('aquavo.migration_checksum', true);
BEGIN
  IF v_checksum IS NULL OR v_checksum !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION '0105_REQUIRES_ACTUAL_FILE_SHA256';
  END IF;
  IF EXISTS (SELECT 1 FROM public.schema_migrations
    WHERE version = '0105_manual_invoice_locale' AND checksum IS DISTINCT FROM v_checksum) THEN
    RAISE EXCEPTION '0105_MIGRATION_CHECKSUM_MISMATCH';
  END IF;
  INSERT INTO public.schema_migrations (version, checksum, notes)
  VALUES ('0105_manual_invoice_locale', v_checksum, 'Arabic and Sorani manual invoice language.')
  ON CONFLICT (version) DO NOTHING;
END $ledger$;
COMMIT;
