-- 0090_customer_lifecycle_integrity_rollback.sql
-- Safe operational rollback. Corrected customer/review facts and collected
-- attribution columns are intentionally preserved so rollback cannot destroy
-- production history.

BEGIN;

DROP TRIGGER IF EXISTS orders_customer_profile_insert ON public.orders;
DROP TRIGGER IF EXISTS orders_customer_profile_update ON public.orders;
DROP TRIGGER IF EXISTS orders_customer_profile_delete ON public.orders;
DROP FUNCTION IF EXISTS public.aquavo_sync_customer_profile_from_order();
DROP FUNCTION IF EXISTS public.aquavo_refresh_customer_profile(text);

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0090_customer_lifecycle_integrity'
  AND rolled_back_at IS NULL;

COMMIT;
