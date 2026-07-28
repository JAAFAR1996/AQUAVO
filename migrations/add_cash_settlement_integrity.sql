-- ============================================================================
-- add_cash_settlement_integrity.sql
--
-- RED TEAM B-4(b) + B-5 — carrier cash integrity.
--
-- `cash_settlements` is the ONLY source of carrier money after the 2026-07-28
-- legacy isolation. Two defects were found in adversarial review:
--
--   B-4(b) DUPLICATE SETTLEMENTS. `settlement_number` is NOT NULL but not
--          UNIQUE. Production currently holds two byte-identical rows
--          (gross 1,011,085 / fees 97,500 / net 913,585). Nothing in the schema
--          or the code distinguishes "two genuine equal settlements" from "one
--          settlement entered twice". If they are a double entry, recorded
--          collections are overstated by 1,011,085 IQD — half the file.
--
--   B-5    UNENFORCED INVARIANT. `gross_amount = fees_amount + net_amount` was
--          documented in shared/schema.ts and enforced nowhere.
--          `computeCarrierBalance` computes outstanding = gross - fees - net,
--          so a row that violates the identity is silently reported as money
--          owed by the carrier. An arithmetically impossible document and a
--          real unpaid balance had exactly the same representation.
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   It does not delete, merge, or edit a single row. It does not decide whether
--   the two identical rows are a duplicate — that is a question about physical
--   carrier statements which only the owner can answer, and a migration that
--   guessed would destroy financial evidence. If duplicates exist it ABORTS
--   with the offending keys listed.
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- NOT APPLIED TO PRODUCTION BY THIS CHANGE. Reversible via
-- add_cash_settlement_integrity_rollback.sql.
-- ============================================================================

-- ── 1. Fail closed if the UNIQUE constraint cannot be honoured ──────────────
-- Raising here is the point. A duplicate settlement number is an unresolved
-- financial question, not a schema inconvenience.
DO $dupcheck$
DECLARE
  dup_count integer;
  dup_list  text;
BEGIN
  SELECT count(*), string_agg(format('(%s / %s) x%s', carrier, settlement_number, n), ', ')
    INTO dup_count, dup_list
  FROM (
    SELECT carrier, settlement_number, count(*) AS n
    FROM public.cash_settlements
    GROUP BY carrier, settlement_number
    HAVING count(*) > 1
  ) d;

  IF COALESCE(dup_count, 0) > 0 THEN
    RAISE EXCEPTION
      'ABORT: % duplicate (carrier, settlement_number) key(s) found: %. '
      'Resolve against the carrier''s own statements before applying this '
      'migration. Do NOT delete a row to make the constraint pass — if the '
      'duplicate is a genuine double entry it must be reversed with an audited '
      'correction that preserves the original.',
      dup_count, dup_list;
  END IF;
END
$dupcheck$;

-- ── 2. UNIQUE(carrier, settlement_number) ──────────────────────────────────
-- Scoped by carrier: two different carriers may legitimately use the same
-- numbering sequence. A global unique on settlement_number alone would reject
-- valid data the first time a second carrier is onboarded.
DO $uniq$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_settlements_carrier_number_key'
  ) THEN
    ALTER TABLE public.cash_settlements
      ADD CONSTRAINT cash_settlements_carrier_number_key
      UNIQUE (carrier, settlement_number);
  END IF;
END
$uniq$;

-- ── 3. CHECK gross = fees + net, for reconciled rows only ──────────────────
-- Restricted to status='reconciled' on purpose: a draft row is a work in
-- progress and may legitimately be unbalanced while being entered. Only a
-- reconciled row is a completed financial document, and only reconciled rows
-- are read by computeCarrierBalance.
--
-- NOT VALID: existing rows are NOT reinterpreted or rejected retroactively.
-- Historical data is evidence — this migration governs what may be written
-- from now on. Validation of history is a separate, evidenced decision
-- (see step 4).
DO $inv$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_settlements_gross_identity_chk'
  ) THEN
    ALTER TABLE public.cash_settlements
      ADD CONSTRAINT cash_settlements_gross_identity_chk
      CHECK (
        status <> 'reconciled'
        OR gross_amount = fees_amount + net_amount
      ) NOT VALID;
  END IF;
END
$inv$;

-- ── 4. Report (do not mutate) any reconciled row already violating it ───────
-- A NOT VALID constraint leaves history untouched, which is correct — but
-- silence about a known-bad row is not. This raises a NOTICE so the operator
-- applying the migration sees it, without failing the deployment.
DO $legacy$
DECLARE
  bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count
  FROM public.cash_settlements
  WHERE status = 'reconciled'
    AND gross_amount <> fees_amount + net_amount;

  IF bad_count > 0 THEN
    RAISE NOTICE
      'WARNING: % reconciled settlement row(s) violate gross = fees + net. '
      'They are NOT modified by this migration and remain visible as '
      'exceptions. Each must be reconciled against the carrier statement and '
      'corrected by an audited entry, never by an in-place edit.',
      bad_count;
  END IF;
END
$legacy$;

COMMENT ON CONSTRAINT cash_settlements_gross_identity_chk ON public.cash_settlements IS
  'gross = fees + net for completed (reconciled) settlements. A violation is a '
  'corrupt document, not a carrier receivable — the two must never share a '
  'representation. See Red Team B-5.';

COMMENT ON CONSTRAINT cash_settlements_carrier_number_key ON public.cash_settlements IS
  'One settlement number per carrier. Prevents a re-entered carrier statement '
  'from inflating recorded collections. See Red Team B-4(b).';
