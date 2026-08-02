-- 0052_accounting_cod_delivery_settlements_rollback.sql
BEGIN;
DROP TRIGGER IF EXISTS orders_record_delivery_accounting ON public.orders;
DROP TRIGGER IF EXISTS cash_settlements_post_journal ON public.cash_settlements;
DROP TRIGGER IF EXISTS journal_entries_immutable ON public.journal_entries;
DROP TRIGGER IF EXISTS journal_lines_immutable ON public.journal_lines;
DROP FUNCTION IF EXISTS public.record_order_delivery_accounting();
DROP FUNCTION IF EXISTS public.post_settlement_journal_and_match_facts();
DROP FUNCTION IF EXISTS public.post_order_delivery_journal(text);
DROP FUNCTION IF EXISTS public.post_order_cogs_journal(text);
DROP FUNCTION IF EXISTS public.validate_journal_entry(text);
DROP FUNCTION IF EXISTS public.reject_journal_mutation();
UPDATE public.schema_migrations SET rolled_back_at=now() WHERE version='0052_accounting_cod_delivery_settlements';
COMMIT;
