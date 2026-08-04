-- 0063_accounting_cod_refusal_and_store_credit_rollback.sql
BEGIN;

DROP VIEW IF EXISTS public.v_cod_refusal_policy_exceptions;

DROP TRIGGER IF EXISTS customer_credit_entries_no_delete ON public.customer_credit_entries;
DROP TRIGGER IF EXISTS customer_credit_entries_no_update ON public.customer_credit_entries;
DROP TRIGGER IF EXISTS customer_credit_entries_guard ON public.customer_credit_entries;
DROP FUNCTION IF EXISTS public.prevent_customer_credit_entry_mutation();
DROP FUNCTION IF EXISTS public.guard_customer_credit_entry();
DROP VIEW IF EXISTS public.v_customer_credit_balances;
DROP TABLE IF EXISTS public.customer_credit_entries;
DROP TABLE IF EXISTS public.customer_credit_accounts;

DROP TRIGGER IF EXISTS order_return_events_enforce_cod_refusal ON public.order_return_events;
DROP FUNCTION IF EXISTS public.enforce_cod_refusal_return_policy();

UPDATE public.fulfillment_materials
   SET name = 'ملصق السعر',
       notes = 'يُحتسب مرة واحدة لكل طلب مهما كان عدد الكراتين',
       updated_at = clock_timestamp()
 WHERE sku = 'PRICE_LABEL';

UPDATE public.schema_migrations
   SET rolled_back_at=clock_timestamp(),
       notes=COALESCE(notes,'')||' [rolled back]'
 WHERE version='0063_accounting_cod_refusal_and_store_credit'
   AND rolled_back_at IS NULL;

COMMIT;
