-- Defensive write guard only. No historical review is changed or deleted.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $constraint$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid='public.reviews'::regclass AND conname='reviews_rating_range') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_range
      CHECK (rating >= 1 AND rating <= 5) NOT VALID;
  END IF;
END $constraint$;

-- Before validating, review (do not auto-correct) the result of:
-- SELECT count(*) FROM public.reviews WHERE rating IS NULL OR rating < 1 OR rating > 5;
-- After reviewing the actual rows and obtaining any needed data-change approval:
-- ALTER TABLE public.reviews VALIDATE CONSTRAINT reviews_rating_range;

DO $ledger$
DECLARE v_checksum text := current_setting('aquavo.migration_checksum', true);
BEGIN
  IF v_checksum IS NULL OR v_checksum !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION '0108_REQUIRES_ACTUAL_FILE_SHA256';
  END IF;
  IF EXISTS (SELECT 1 FROM public.schema_migrations
    WHERE version = '0108_review_rating_guard' AND checksum IS DISTINCT FROM v_checksum) THEN
    RAISE EXCEPTION '0108_MIGRATION_CHECKSUM_MISMATCH';
  END IF;
  INSERT INTO public.schema_migrations(version, checksum, notes)
  VALUES ('0108_review_rating_guard', v_checksum, 'Guard new review ratings 1..5; preserve historic rows for review before validation.')
  ON CONFLICT (version) DO NOTHING;
END $ledger$;
COMMIT;
