-- 0053_accounting_expenses_returns_rollback.sql
BEGIN;
DROP TRIGGER IF EXISTS expenses_post_verified_journal ON public.expenses;
DROP FUNCTION IF EXISTS public.post_verified_expense_journal();
DROP TRIGGER IF EXISTS order_returns_prepare_verification ON public.order_return_events;
DROP TRIGGER IF EXISTS order_returns_apply_inventory ON public.order_return_events;
DROP TRIGGER IF EXISTS order_returns_post_journal ON public.order_return_events;
DROP TRIGGER IF EXISTS order_return_events_prevent_delete ON public.order_return_events;
DROP TRIGGER IF EXISTS expenses_prevent_hard_delete ON public.expenses;
DROP FUNCTION IF EXISTS public.prepare_verified_return_inventory();
DROP FUNCTION IF EXISTS public.apply_verified_return_inventory();
DROP FUNCTION IF EXISTS public.post_verified_return_journal();
DROP FUNCTION IF EXISTS public.prevent_return_event_hard_delete();
DROP FUNCTION IF EXISTS public.prevent_expense_hard_delete();
UPDATE public.schema_migrations SET rolled_back_at=now() WHERE version='0053_accounting_expenses_returns';
COMMIT;
