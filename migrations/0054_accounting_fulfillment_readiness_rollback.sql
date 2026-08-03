-- 0054_accounting_fulfillment_readiness_rollback.sql
-- Restores the exact pre-v2 tax-finalization guard instead of leaving period
-- closes unprotected after a rollback.
BEGIN;

DROP TRIGGER IF EXISTS trg_guard_accounting_period_tax_finalization ON public.accounting_period_closes;
DROP FUNCTION IF EXISTS public.guard_accounting_period_tax_finalization();
DROP VIEW IF EXISTS public.v_accounting_period_readiness;
DROP VIEW IF EXISTS public.v_order_accounting;
DROP TRIGGER IF EXISTS order_fulfillment_post_journal ON public.order_fulfillment_events;
DROP FUNCTION IF EXISTS public.post_fulfillment_after_confirmation();
DROP FUNCTION IF EXISTS public.post_order_fulfillment_journal(text);

DELETE FROM public.accounting_review_flags
 WHERE entity_id='aquavo-2026-08-01'
    OR (category='stock' AND title='رصيد افتتاحي مؤقت يحتاج جرد فعلي');
DELETE FROM public.opening_inventory_snapshot WHERE cutover_id='aquavo-2026-08-01';
DELETE FROM public.inventory_movements
 WHERE source_type='accounting_cutover_provisional'
   AND source_id='aquavo-2026-08-01'
   AND NOT EXISTS(SELECT 1 FROM public.order_accounting_facts);

ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS delivery_subsidy_total;
ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS delivery_surplus_total;
ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS fulfillment_cost_total;
ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS readiness_json;
ALTER TABLE public.accounting_period_closes DROP COLUMN IF EXISTS close_type;

CREATE OR REPLACE FUNCTION public.guard_accounting_period_tax_finalization()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE total_lines bigint; non_exact_lines bigint;
BEGIN
 IF lower(NEW.status) IN ('closed','final','finalized','approved','locked','tax_final') THEN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE oi.cost_snapshot_status IS DISTINCT FROM 'exact')
    INTO total_lines, non_exact_lines
    FROM public.order_items_relational oi
    JOIN public.orders o ON o.id = oi.order_id
   WHERE o.financially_counted IS TRUE
     AND o.status = 'delivered'
     AND o.created_at >= NEW.period_start
     AND o.created_at <= NEW.period_end;
  IF non_exact_lines > 0 THEN
   RAISE EXCEPTION 'TAX_FINALIZATION_BLOCKED: % of % sale lines lack exact immutable cost snapshots for period %',
     non_exact_lines, total_lines, NEW.period_key USING ERRCODE = 'check_violation';
  END IF;
 END IF;
 RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_accounting_period_tax_finalization
BEFORE INSERT OR UPDATE OF status,period_start,period_end
ON public.accounting_period_closes
FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_period_tax_finalization();

UPDATE public.schema_migrations
   SET rolled_back_at=now()
 WHERE version='0054_accounting_fulfillment_readiness';
COMMIT;
