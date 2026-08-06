-- 0067_orders_client_ip_schema_drift_rollback.sql
-- Safe only when no order IP evidence has been captured.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.orders WHERE client_ip IS NOT NULL
  ) THEN
    RAISE EXCEPTION '0067_ROLLBACK_BLOCKED: orders.client_ip contains evidence';
  END IF;
END $$;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS client_ip;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0067_orders_client_ip_schema_drift'
  AND rolled_back_at IS NULL;

COMMIT;
