-- AQUAVO production-test guard correction.
-- Account role is an authorization attribute, not a transaction classification.
-- A legitimate storefront purchase remains a real order even when the buyer also
-- has an admin role. Synthetic/test orders are still blocked by explicit markers.

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
  THEN
    RAISE EXCEPTION
      'PRODUCTION_TEST_ORDER_BLOCKED: use an isolated Neon branch for checkout/order tests'
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END
$guard$;

INSERT INTO public.schema_migrations(version, checksum, notes)
VALUES (
  '20260825_admin_storefront_purchase_guard',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Allow legitimate storefront purchases by admin accounts while preserving explicit production-test detection'
)
ON CONFLICT(version) DO UPDATE
SET notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();
