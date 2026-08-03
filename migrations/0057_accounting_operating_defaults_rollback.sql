-- 0057_accounting_operating_defaults_rollback.sql
-- Preserve historical carrier text already snapshotted on orders.
BEGIN;

DROP TRIGGER IF EXISTS orders_apply_default_delivery_company ON public.orders;
DROP FUNCTION IF EXISTS public.apply_default_delivery_company_to_order();
DROP TABLE IF EXISTS public.accounting_monthly_positions;
DROP TABLE IF EXISTS public.delivery_companies;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' [rolled back]'
WHERE version='0057_accounting_operating_defaults';

COMMIT;
