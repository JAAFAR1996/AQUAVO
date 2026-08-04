-- 0064_accounting_customer_credit_posting_links.sql
-- Keep customer-credit business events immutable while allowing accounting to be
-- completed later through a separate, validated, immutable journal link.
BEGIN;

-- 0063's inline posting state cannot be advanced after insert because credit
-- entries are intentionally immutable. Remove that conflicting design.
ALTER TABLE public.customer_credit_entries
  DROP COLUMN IF EXISTS accounting_status,
  DROP COLUMN IF EXISTS journal_entry_id;

CREATE TABLE IF NOT EXISTS public.customer_credit_accounting_links (
  credit_entry_id text PRIMARY KEY
    REFERENCES public.customer_credit_entries(id) ON DELETE RESTRICT,
  journal_entry_id text NOT NULL UNIQUE
    REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  linked_by text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

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
  COUNT(*) FILTER (
    WHERE e.id IS NOT NULL AND l.credit_entry_id IS NULL
  )::integer AS pending_accounting_entries,
  MAX(e.created_at) AS last_entry_at
FROM public.customer_credit_accounts a
LEFT JOIN public.customer_credit_entries e ON e.account_id=a.id
LEFT JOIN public.customer_credit_accounting_links l ON l.credit_entry_id=e.id
GROUP BY a.id,a.customer_key,a.user_id,a.customer_phone,a.customer_email,a.status;

-- A link is valid only if the referenced journal posts the same amount on
-- liability account 2300, on the correct side for credit issue/use.
CREATE OR REPLACE FUNCTION public.validate_customer_credit_accounting_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_direction text;
  v_amount numeric;
  v_matches integer;
BEGIN
  SELECT direction,amount INTO v_direction,v_amount
  FROM public.customer_credit_entries
  WHERE id=NEW.credit_entry_id;

  IF v_direction IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_CREDIT_ENTRY_NOT_FOUND';
  END IF;

  SELECT COUNT(*) INTO v_matches
  FROM public.journal_lines l
  WHERE l.entry_id=NEW.journal_entry_id
    AND l.account_code='2300'
    AND (
      (v_direction='credit' AND l.credit=v_amount AND l.debit=0)
      OR
      (v_direction='debit' AND l.debit=v_amount AND l.credit=0)
    );

  IF v_matches<>1 THEN
    RAISE EXCEPTION 'CUSTOMER_CREDIT_JOURNAL_MISMATCH: journal must post exactly % IQD on account 2300 to the correct side',v_amount;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS customer_credit_accounting_link_validate
  ON public.customer_credit_accounting_links;
CREATE TRIGGER customer_credit_accounting_link_validate
BEFORE INSERT ON public.customer_credit_accounting_links
FOR EACH ROW EXECUTE FUNCTION public.validate_customer_credit_accounting_link();

DROP TRIGGER IF EXISTS customer_credit_links_no_update
  ON public.customer_credit_accounting_links;
CREATE TRIGGER customer_credit_links_no_update
BEFORE UPDATE ON public.customer_credit_accounting_links
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_credit_entry_mutation();

DROP TRIGGER IF EXISTS customer_credit_links_no_delete
  ON public.customer_credit_accounting_links;
CREATE TRIGGER customer_credit_links_no_delete
BEFORE DELETE ON public.customer_credit_accounting_links
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_credit_entry_mutation();

-- No administrative or tax close may hide an unposted customer-credit event.
CREATE OR REPLACE FUNCTION public.guard_customer_credit_period_close()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_start date;
  v_end date;
BEGIN
  IF lower(COALESCE(NEW.status,'')) IN (
    'closed','administrative_closed','locked',
    'final','finalized','approved','tax_final'
  ) THEN
    v_start:=to_date(NEW.period_key||'-01','YYYY-MM-DD');
    v_end:=(v_start+interval '1 month')::date;

    IF EXISTS(
      SELECT 1
      FROM public.customer_credit_entries e
      LEFT JOIN public.customer_credit_accounting_links l
        ON l.credit_entry_id=e.id
      WHERE l.credit_entry_id IS NULL
        AND (e.created_at AT TIME ZONE 'Asia/Baghdad')::date>=v_start
        AND (e.created_at AT TIME ZONE 'Asia/Baghdad')::date<v_end
    ) THEN
      RAISE EXCEPTION 'PERIOD_CLOSE_BLOCKED: unposted customer-credit entries exist for %',NEW.period_key;
    END IF;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_guard_customer_credit_period_close
  ON public.accounting_period_closes;
CREATE TRIGGER trg_guard_customer_credit_period_close
BEFORE INSERT OR UPDATE OF status ON public.accounting_period_closes
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_credit_period_close();

INSERT INTO public.schema_migrations(version,checksum,applied_by,notes)
SELECT
  '0064_accounting_customer_credit_posting_links',
  'pending',
  current_user,
  'Separate immutable credit events from validated account-2300 journal links; block month close while links are missing'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_migrations
  WHERE version='0064_accounting_customer_credit_posting_links'
);

COMMIT;
