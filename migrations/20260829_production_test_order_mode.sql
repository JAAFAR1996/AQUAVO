-- 20260829_production_test_order_mode.sql
-- First-class admin-only Production Test Order mode.
-- Test rows are allowed in Production only through a deliberately scoped runtime
-- transaction. They never enter inventory/accounting/fulfillment lifecycles.
-- The delivery-care WhatsApp outbox is intentionally left enabled so the real
-- post-delivery customer-message path can be verified end-to-end.

BEGIN;

-- Keep the default quarantine rule. A test status may change only while the
-- dedicated admin test-order service enables this transaction-local GUC.
CREATE OR REPLACE FUNCTION public.block_test_order_status_side_effects()
RETURNS trigger
LANGUAGE plpgsql
AS $status_guard$
BEGIN
  IF COALESCE(OLD.is_test,false)
     AND NEW.status IS DISTINCT FROM OLD.status
     AND current_setting('aquavo.allow_test_order_status',true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'TEST_ORDER_STATUS_CHANGE_BLOCKED: Production test order % may change only through the admin test-order service',
      OLD.id
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$status_guard$;

DROP TRIGGER IF EXISTS orders_01_block_test_status_side_effects ON public.orders;
CREATE TRIGGER orders_01_block_test_status_side_effects
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.block_test_order_status_side_effects();

-- Accounting readiness is a genuine-order invariant. Synthetic rows deliberately
-- have no relational sale lines or fulfillment snapshots, so they must never be
-- evaluated by this guard.
DROP TRIGGER IF EXISTS orders_accounting_delivery_readiness_guard ON public.orders;
CREATE TRIGGER orders_accounting_delivery_readiness_guard
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (COALESCE(NEW.is_test,false)=false)
EXECUTE FUNCTION public.guard_order_delivery_accounting_readiness();

-- Delivery recognition creates payment events, accounting facts, journals and
-- COGS. It must never run for a test row.
DROP TRIGGER IF EXISTS orders_record_delivery_accounting ON public.orders;
CREATE TRIGGER orders_record_delivery_accounting
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (COALESCE(NEW.is_test,false)=false)
EXECUTE FUNCTION public.record_order_delivery_accounting();

-- Intentionally DO NOT change trg_orders_post_delivery_messages. A test order
-- reaching delivered must enqueue delivery_care so Meta/WhatsApp can be tested.

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '20260829_production_test_order_mode',
  '20260829productiontestordermode00000000000000000000000000000000000000',
  'Admin-only Production Test Order mode: no inventory/accounting lifecycle; WhatsApp delivery-care remains live'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
