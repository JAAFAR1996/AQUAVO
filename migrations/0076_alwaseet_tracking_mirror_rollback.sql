-- 0076_alwaseet_tracking_mirror_rollback.sql
-- Safe rollback: this feature table is not a financial source of truth.

BEGIN;

DROP TABLE IF EXISTS public.order_carrier_tracking;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0076_alwaseet_tracking_mirror';

COMMIT;
