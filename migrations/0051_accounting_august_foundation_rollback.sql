-- 0051_accounting_august_foundation_rollback.sql
BEGIN;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.order_accounting_facts) THEN
    RAISE EXCEPTION 'ROLLBACK_BLOCKED: immutable August accounting facts exist';
  END IF;
END $$;

DROP TRIGGER IF EXISTS expenses_prepare_accounting ON public.expenses;
DROP TRIGGER IF EXISTS order_accounting_facts_immutable ON public.order_accounting_facts;
DROP TRIGGER IF EXISTS order_accounting_settlements_immutable ON public.order_accounting_settlements;
DROP FUNCTION IF EXISTS public.prepare_expense_accounting_fields();
DROP FUNCTION IF EXISTS public.reject_immutable_accounting_fact_change();
DROP FUNCTION IF EXISTS public.aquavo_active_cutover();

-- Remove every dependency created by 0051 before dropping the referenced
-- accounting tables. This rollback is allowed only before immutable V2 facts.
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_paid_from_account_fk;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_accounting_status_chk;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_tax_treatment_chk;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_evidence_file_id_fkey;
ALTER TABLE public.expenses
  DROP COLUMN IF EXISTS vendor_name,
  DROP COLUMN IF EXISTS document_number,
  DROP COLUMN IF EXISTS document_date,
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS paid_from_account_code,
  DROP COLUMN IF EXISTS business_purpose,
  DROP COLUMN IF EXISTS evidence,
  DROP COLUMN IF EXISTS evidence_hash,
  DROP COLUMN IF EXISTS accounting_status,
  DROP COLUMN IF EXISTS tax_treatment,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS expense_occurred_at,
  DROP COLUMN IF EXISTS evidence_file_id,
  DROP COLUMN IF EXISTS review_note;

DROP TABLE IF EXISTS public.opening_inventory_snapshot;
DROP TABLE IF EXISTS public.order_accounting_settlements;
DROP TABLE IF EXISTS public.order_accounting_facts;
DROP TABLE IF EXISTS public.journal_lines;
DROP TABLE IF EXISTS public.journal_entries;
DROP TABLE IF EXISTS public.chart_of_accounts;
DROP TABLE IF EXISTS public.tax_profiles;
DROP TABLE IF EXISTS public.evidence_files;
DROP TABLE IF EXISTS public.accounting_cutovers;
UPDATE public.schema_migrations SET rolled_back_at=now() WHERE version='0051_accounting_august_foundation';
COMMIT;
