-- Roll back the write guard only. No review data is changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_range;
DELETE FROM public.schema_migrations WHERE version='0108_review_rating_guard';
COMMIT;
