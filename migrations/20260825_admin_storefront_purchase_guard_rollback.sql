-- Rollback for 20260825_admin_storefront_purchase_guard.
-- Restores the prior 0083 behavior where an admin-role user is classified as a
-- Production test order. Historical order/accounting evidence is not modified.

CREATE OR REPLACE FUNCTION public.guard_production_test_orders()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
BEGIN
  IF current_setting('aquavo.allow_test_order_write',true)='on' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_test,false)
     OR upper(COALESCE(NEW.order_number,'')) LIKE '%WATEST%'
     OR upper(COALESCE(NEW.order_number,'')) LIKE 'TEST-%'
     OR lower(btrim(COALESCE(NEW.source,''))) IN ('test','synthetic','accounting_test','sandbox')
     OR lower(btrim(COALESCE(NEW.customer_name,'')))='system admin'
     OR EXISTS(
       SELECT 1
       FROM public.users u
       WHERE u.id=NEW.user_id
         AND lower(COALESCE(u.role,''))='admin'
     )
  THEN
    RAISE EXCEPTION
      'PRODUCTION_TEST_ORDER_BLOCKED: use an isolated Neon branch for checkout/order tests'
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END
$guard$;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' | Rolled back: restored admin-role classification from 0083.'
WHERE version='20260825_admin_storefront_purchase_guard'
  AND rolled_back_at IS NULL;
