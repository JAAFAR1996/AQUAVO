-- 0062_accounting_cod_refusal_and_store_credit.sql
-- AQUAVO owner-approved policy, 2026-08-04:
--   * COD refusal occurs before acceptance, so it is not revenue and not a refund.
--   * The carrier charges AQUAVO zero for refused/returned COD parcels.
--   * All refused products remain sellable; no product write-off or COGS loss.
--   * The carton is damaged/lost, but its shipment cost was already recognised;
--     the return classification must not deduct that carton a second time.
--   * Cheaper replacements create non-expiring, partially usable customer credit.
BEGIN;

-- Correct the seeded preparation-material meaning without changing its stable
-- legacy SKU, which existing plans/tests may still reference.
UPDATE public.fulfillment_materials
   SET name = 'ستكر هدية للمنتج',
       notes = 'ستكر هدية واحد لكل طلب؛ الكلفة المعتمدة 50 د.ع. ليس ملصق سعر.',
       updated_at = clock_timestamp()
 WHERE sku = 'PRICE_LABEL';

-- Database-level safety: even a stale UI or direct API caller cannot turn a COD
-- refusal into a refund, delivery expense, product loss, or duplicated carton
-- expense. The products are always marked for sellable restock.
CREATE OR REPLACE FUNCTION public.enforce_cod_refusal_return_policy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type = 'rejected_delivery' THEN
    NEW.refund_amount := 0;
    NEW.delivery_cost_loss := 0;
    NEW.return_shipping_cost := 0;
    NEW.packaging_loss := 0;
    NEW.product_write_off_amount := 0;
    NEW.cogs_loss := 0;
    NEW.restocked := true;

    IF NEW.status = 'verified'
       AND jsonb_array_length(COALESCE(NEW.affected_items, '[]'::jsonb)) = 0 THEN
      RAISE EXCEPTION 'COD_REFUSAL_ITEMS_REQUIRED: verified refusal must identify returned product quantities';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS order_return_events_enforce_cod_refusal ON public.order_return_events;
CREATE TRIGGER order_return_events_enforce_cod_refusal
BEFORE INSERT OR UPDATE ON public.order_return_events
FOR EACH ROW EXECUTE FUNCTION public.enforce_cod_refusal_return_policy();

-- Immutable customer-credit ledger. Balance is derived, never hand-edited.
CREATE TABLE IF NOT EXISTS public.customer_credit_accounts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_key text NOT NULL UNIQUE,
  user_id text,
  customer_phone text,
  customer_email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','closed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (user_id IS NOT NULL OR customer_phone IS NOT NULL OR customer_email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.customer_credit_entries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id text NOT NULL REFERENCES public.customer_credit_accounts(id),
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount numeric(18,0) NOT NULL CHECK (amount > 0 AND amount = trunc(amount)),
  currency text NOT NULL DEFAULT 'IQD' CHECK (currency = 'IQD'),
  source_type text NOT NULL,
  source_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  note text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS customer_credit_entries_account_idx
  ON public.customer_credit_entries(account_id, created_at, id);

CREATE OR REPLACE VIEW public.v_customer_credit_balances AS
SELECT
  a.id AS account_id,
  a.customer_key,
  a.user_id,
  a.customer_phone,
  a.customer_email,
  a.status,
  COALESCE(SUM(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END),0)::numeric(18,0) AS balance_iqd,
  MAX(e.created_at) AS last_entry_at
FROM public.customer_credit_accounts a
LEFT JOIN public.customer_credit_entries e ON e.account_id=a.id
GROUP BY a.id,a.customer_key,a.user_id,a.customer_phone,a.customer_email,a.status;

CREATE OR REPLACE FUNCTION public.guard_customer_credit_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_balance numeric(18,0);
BEGIN
  -- Serialise debits/credits for one account so two simultaneous checkouts cannot
  -- spend the same credit.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.account_id, 0));

  SELECT status INTO v_status
  FROM public.customer_credit_accounts
  WHERE id=NEW.account_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_CREDIT_ACCOUNT_NOT_FOUND';
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'CUSTOMER_CREDIT_ACCOUNT_NOT_ACTIVE: %', v_status;
  END IF;

  SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0)
    INTO v_balance
  FROM public.customer_credit_entries
  WHERE account_id=NEW.account_id;

  IF NEW.direction='debit' AND NEW.amount > v_balance THEN
    RAISE EXCEPTION 'CUSTOMER_CREDIT_INSUFFICIENT: requested %, available %', NEW.amount, v_balance;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS customer_credit_entries_guard ON public.customer_credit_entries;
CREATE TRIGGER customer_credit_entries_guard
BEFORE INSERT ON public.customer_credit_entries
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_credit_entry();

CREATE OR REPLACE FUNCTION public.prevent_customer_credit_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'CUSTOMER_CREDIT_LEDGER_IMMUTABLE: post a correcting entry instead';
END
$$;

DROP TRIGGER IF EXISTS customer_credit_entries_no_update ON public.customer_credit_entries;
CREATE TRIGGER customer_credit_entries_no_update
BEFORE UPDATE ON public.customer_credit_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_credit_entry_mutation();

DROP TRIGGER IF EXISTS customer_credit_entries_no_delete ON public.customer_credit_entries;
CREATE TRIGGER customer_credit_entries_no_delete
BEFORE DELETE ON public.customer_credit_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_credit_entry_mutation();

-- Audit surface: any row here is a policy violation or legacy record requiring
-- review. New writes are normalised by the trigger above, so this should stay 0.
CREATE OR REPLACE VIEW public.v_cod_refusal_policy_exceptions AS
SELECT
  id, order_id, status, refund_amount, delivery_cost_loss,
  return_shipping_cost, packaging_loss, product_write_off_amount,
  cogs_loss, restocked, affected_items, created_at, updated_at
FROM public.order_return_events
WHERE type='rejected_delivery'
  AND (
    COALESCE(refund_amount,0)<>0 OR
    COALESCE(delivery_cost_loss,0)<>0 OR
    COALESCE(return_shipping_cost,0)<>0 OR
    COALESCE(packaging_loss,0)<>0 OR
    COALESCE(product_write_off_amount,0)<>0 OR
    COALESCE(cogs_loss,0)<>0 OR
    restocked IS DISTINCT FROM true
  );

INSERT INTO public.schema_migrations(version,checksum,applied_by,notes)
SELECT
  '0062_accounting_cod_refusal_and_store_credit',
  'pending',
  current_user,
  'COD refusal zero-loss guard; gift sticker rename; immutable non-expiring partial-use customer credit ledger'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_migrations
  WHERE version='0062_accounting_cod_refusal_and_store_credit'
);

COMMIT;
