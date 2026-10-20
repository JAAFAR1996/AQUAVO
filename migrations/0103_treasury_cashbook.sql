-- 0103: AQUAVO treasury subledger (not a second revenue ledger).
-- No existing balances or posted journal entries are modified or backfilled.
-- The owner must explicitly confirm opening cash/bank balances.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS public.treasury_accounts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  kind text NOT NULL CHECK (kind IN ('cash','bank','wallet','card')),
  linked_account_id text REFERENCES public.treasury_accounts(id) ON DELETE RESTRICT,
  last_four text CHECK (last_four IS NULL OR last_four ~ '^[0-9]{4}$'),
  opening_balance numeric(18,2),
  opening_at timestamptz,
  opening_note text,
  opening_confirmed_by text,
  opening_confirmed_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT treasury_opening_pair CHECK (
    (opening_balance IS NULL AND opening_at IS NULL AND opening_note IS NULL)
    OR (opening_balance IS NOT NULL AND opening_at IS NOT NULL AND length(trim(opening_note)) >= 5)
  ),
  CONSTRAINT treasury_account_kind CHECK (
    (kind='card' AND linked_account_id IS NOT NULL AND opening_balance IS NULL)
    OR (kind<>'card' AND linked_account_id IS NULL)
  ),
  CONSTRAINT treasury_account_no_self_link CHECK (linked_account_id IS DISTINCT FROM id)
);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_accounts_name_unique
  ON public.treasury_accounts(lower(name));

CREATE TABLE IF NOT EXISTS public.treasury_movements (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kind text NOT NULL CHECK (kind IN ('deposit','withdrawal','transfer','gateway_payout')),
  from_account_id text REFERENCES public.treasury_accounts(id) ON DELETE RESTRICT,
  to_account_id text REFERENCES public.treasury_accounts(id) ON DELETE RESTRICT,
  instrument_id text REFERENCES public.treasury_accounts(id) ON DELETE RESTRICT,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'IQD' CHECK (currency='IQD'),
  occurred_at timestamptz NOT NULL,
  external_reference text,
  note text NOT NULL CHECK (length(trim(note)) >= 5),
  evidence_note text NOT NULL CHECK (length(trim(evidence_note)) >= 5),
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT treasury_movement_direction CHECK (
    (kind='deposit' AND from_account_id IS NULL AND to_account_id IS NOT NULL)
    OR (kind='withdrawal' AND from_account_id IS NOT NULL AND to_account_id IS NULL)
    OR (kind='transfer' AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL
        AND from_account_id <> to_account_id)
    OR (kind='gateway_payout' AND from_account_id IS NULL AND to_account_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS treasury_movements_from_date
  ON public.treasury_movements(from_account_id, occurred_at);
CREATE INDEX IF NOT EXISTS treasury_movements_to_date
  ON public.treasury_movements(to_account_id, occurred_at);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_manual_reference_unique
  ON public.treasury_movements(kind, COALESCE(from_account_id,''), COALESCE(to_account_id,''), external_reference)
  WHERE external_reference IS NOT NULL AND kind<>'gateway_payout';

CREATE TABLE IF NOT EXISTS public.treasury_reconciliations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id text NOT NULL REFERENCES public.treasury_accounts(id) ON DELETE RESTRICT,
  statement_at timestamptz NOT NULL,
  statement_balance numeric(18,2) NOT NULL,
  tracked_balance numeric(18,2) NOT NULL,
  difference numeric(18,2) NOT NULL,
  evidence_note text NOT NULL CHECK(length(trim(evidence_note)) >= 5),
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT treasury_reconciliation_arithmetic CHECK (difference=statement_balance-tracked_balance)
);
CREATE INDEX IF NOT EXISTS treasury_reconciliations_latest
  ON public.treasury_reconciliations(account_id,statement_at DESC,created_at DESC);

CREATE TABLE IF NOT EXISTS public.treasury_gateway_allocations (
  payment_id text PRIMARY KEY REFERENCES public.payments(id) ON DELETE RESTRICT,
  movement_id text NOT NULL UNIQUE REFERENCES public.treasury_movements(id) ON DELETE RESTRICT,
  gross_amount numeric(18,2) NOT NULL CHECK (gross_amount > 0),
  fee_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  net_amount numeric(18,2) NOT NULL CHECK (net_amount > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT treasury_gateway_amounts CHECK (gross_amount=fee_amount+net_amount)
);

-- Append-only: corrections require a reviewed reversal, not silent changes.
CREATE OR REPLACE FUNCTION public.guard_treasury_immutable()
RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  RAISE EXCEPTION 'TREASURY_LEDGER_IMMUTABLE: correction requires a separate audited entry'
    USING ERRCODE='23514';
END
$body$;
CREATE TRIGGER treasury_movements_immutable
  BEFORE UPDATE OR DELETE ON public.treasury_movements
  FOR EACH ROW EXECUTE FUNCTION public.guard_treasury_immutable();
CREATE TRIGGER treasury_reconciliations_immutable
  BEFORE UPDATE OR DELETE ON public.treasury_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.guard_treasury_immutable();
CREATE TRIGGER treasury_gateway_allocations_immutable
  BEFORE UPDATE OR DELETE ON public.treasury_gateway_allocations
  FOR EACH ROW EXECUTE FUNCTION public.guard_treasury_immutable();

DO $ledger$
DECLARE v_checksum text:=current_setting('aquavo.migration_checksum',true);
BEGIN
  IF v_checksum IS NULL OR v_checksum !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION '0103_REQUIRES_ACTUAL_FILE_SHA256';
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.schema_migrations
    WHERE version='0103_treasury_cashbook' AND checksum IS DISTINCT FROM v_checksum
  ) THEN
    RAISE EXCEPTION '0103_MIGRATION_CHECKSUM_MISMATCH';
  END IF;
  INSERT INTO public.schema_migrations(version,checksum,notes)
  VALUES('0103_treasury_cashbook',v_checksum,
    'Additive owner-confirmed treasury subledger; GL and historic financial facts unchanged.')
  ON CONFLICT(version) DO NOTHING;
END
$ledger$;
COMMIT;
