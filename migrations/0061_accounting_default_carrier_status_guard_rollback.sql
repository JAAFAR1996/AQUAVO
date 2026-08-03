-- 0061_accounting_default_carrier_status_guard_rollback.sql
BEGIN;

DROP TRIGGER IF EXISTS orders_apply_default_delivery_company ON public.orders;
CREATE TRIGGER orders_apply_default_delivery_company
BEFORE INSERT OR UPDATE OF carrier ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_default_delivery_company_to_order();

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' [status-change compatibility guard rolled back]'
WHERE version='0061_accounting_default_carrier_status_guard';

COMMIT;
