-- 0064_accounting_customer_credit_posting_links_rollback.sql
BEGIN;

DROP TRIGGER IF EXISTS trg_guard_customer_credit_period_close
  ON public.accounting_period_closes;
DROP FUNCTION IF EXISTS public.guard_customer_credit_period_close();

DROP TRIGGER IF EXISTS customer_credit_links_no_delete
  ON public.customer_credit_accounting_links;
DROP TRIGGER IF EXISTS customer_credit_links_no_update
  ON public.customer_credit_accounting_links;
DROP TRIGGER IF EXISTS customer_credit_accounting_link_validate
  ON public.customer_credit_accounting_links;
DROP FUNCTION IF EXISTS public.validate_customer_credit_accounting_link();
DROP TABLE IF EXISTS public.customer_credit_accounting_links;

ALTER TABLE public.customer_credit_entries
  ADD COLUMN IF NOT EXISTS accounting_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS journal_entry_id text
    REFERENCES public.journal_entries(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='customer_credit_entries_accounting_status_chk'
      AND conrelid='public.customer_credit_entries'::regclass
  ) THEN
    ALTER TABLE public.customer_credit_entries
      ADD CONSTRAINT customer_credit_entries_accounting_status_chk
      CHECK (accounting_status IN ('pending','posted','reversed'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='customer_credit_entries_posted_link_chk'
      AND conrelid='public.customer_credit_entries'::regclass
  ) THEN
    ALTER TABLE public.customer_credit_entries
      ADD CONSTRAINT customer_credit_entries_posted_link_chk
      CHECK (
        (accounting_status='posted' AND journal_entry_id IS NOT NULL)
        OR accounting_status<>'posted'
      );
  END IF;
END
$$;

CREATE OR REPLACE VIEW public.v_customer_credit_balances AS
SELECT
  a.id AS account_id,
  a.customer_key,
  a.user_id,
  a.customer_phone,
  a.customer_email,
  a.status,
  COALESCE(
    SUM(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END),0
  )::numeric(18,0) AS balance_iqd,
  COUNT(*) FILTER (WHERE e.accounting_status='pending')::integer
    AS pending_accounting_entries,
  MAX(e.created_at) AS last_entry_at
FROM public.customer_credit_accounts a
LEFT JOIN public.customer_credit_entries e ON e.account_id=a.id
GROUP BY a.id,a.customer_key,a.user_id,a.customer_phone,a.customer_email,a.status;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' [rolled back]'
WHERE version='0064_accounting_customer_credit_posting_links'
  AND rolled_back_at IS NULL;

COMMIT;
