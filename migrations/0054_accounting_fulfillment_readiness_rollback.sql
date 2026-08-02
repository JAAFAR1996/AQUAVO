-- 0054_accounting_fulfillment_readiness_rollback.sql
BEGIN;
DROP TRIGGER IF EXISTS trg_guard_accounting_period_tax_finalization ON public.accounting_period_closes;
DROP FUNCTION IF EXISTS public.guard_accounting_period_tax_finalization();
DROP VIEW IF EXISTS public.v_accounting_period_readiness;
DROP VIEW IF EXISTS public.v_order_accounting;
DROP TRIGGER IF EXISTS order_fulfillment_post_journal ON public.order_fulfillment_events;
DROP FUNCTION IF EXISTS public.post_fulfillment_after_confirmation();
DROP FUNCTION IF EXISTS public.post_order_fulfillment_journal(text);
DELETE FROM public.accounting_review_flags WHERE entity_id='aquavo-2026-08-01' OR (category='stock' AND title='رصيد افتتاحي مؤقت يحتاج جرد فعلي');
DELETE FROM public.opening_inventory_snapshot WHERE cutover_id='aquavo-2026-08-01';
DELETE FROM public.inventory_movements WHERE source_type='accounting_cutover_provisional' AND source_id='aquavo-2026-08-01' AND NOT EXISTS(SELECT 1 FROM public.order_accounting_facts);
ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS delivery_subsidy_total;
ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS delivery_surplus_total;
ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS fulfillment_cost_total;
ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS readiness_json;
ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS close_type;
UPDATE public.schema_migrations SET rolled_back_at=now() WHERE version='0054_accounting_fulfillment_readiness';
COMMIT;
