-- Apply after review and before deploying the checkout repair. Nullable additions preserve historical orders.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_notes text;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS phone text;

DO $ledger$
DECLARE v_checksum text := current_setting('aquavo.migration_checksum', true);
BEGIN
  IF v_checksum IS NULL OR v_checksum !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION '0106_REQUIRES_ACTUAL_FILE_SHA256';
  END IF;
  IF EXISTS (SELECT 1 FROM public.schema_migrations
    WHERE version = '0106_checkout_delivery_details' AND checksum IS DISTINCT FROM v_checksum) THEN
    RAISE EXCEPTION '0106_MIGRATION_CHECKSUM_MISMATCH';
  END IF;
  INSERT INTO public.schema_migrations (version, checksum, notes)
  VALUES ('0106_checkout_delivery_details', v_checksum, 'Persist customer delivery notes and saved-address phone without changing pricing or consent.')
  ON CONFLICT (version) DO NOTHING;
END $ledger$;
COMMIT;
