-- 0061_accounting_default_carrier_status_guard.sql
-- Keep database-level COD protection effective even while older application
-- deployments update only the order status and do not explicitly set carrier.
BEGIN;

DROP TRIGGER IF EXISTS orders_apply_default_delivery_company ON public.orders;
CREATE TRIGGER orders_apply_default_delivery_company
BEFORE INSERT OR UPDATE OF carrier,status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_default_delivery_company_to_order();

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0061_accounting_default_carrier_status_guard',
  'cc66af6b273da60a7546ee68d73c56377c3199d75a80b69f459511a28961b248',
  'Apply the configured default carrier and fee when an order status changes, including compatibility with older admin deployments'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
