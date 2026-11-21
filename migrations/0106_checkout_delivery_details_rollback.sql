-- Roll back application code first. Keeping these nullable columns is the preferred non-destructive rollback.
-- This explicit schema rollback refuses to discard any customer data.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.orders, public.user_addresses IN ACCESS EXCLUSIVE MODE;
DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE customer_notes IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.user_addresses WHERE phone IS NOT NULL) THEN
    RAISE EXCEPTION '0106_ROLLBACK_WOULD_DISCARD_CUSTOMER_DATA';
  END IF;
END $rollback$;
ALTER TABLE public.orders DROP COLUMN customer_notes;
ALTER TABLE public.user_addresses DROP COLUMN phone;
DELETE FROM public.schema_migrations WHERE version = '0106_checkout_delivery_details';
COMMIT;
