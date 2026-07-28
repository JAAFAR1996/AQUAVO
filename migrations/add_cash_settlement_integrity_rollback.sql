-- ============================================================================
-- add_cash_settlement_integrity_rollback.sql
--
-- Reverses add_cash_settlement_integrity.sql.
--
-- Drops only the two constraints that migration added. No row is deleted,
-- inserted, or updated — the forward migration never wrote data, so the
-- rollback has no data to restore.
--
-- Idempotent: safe to run when the constraints are already absent.
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- ============================================================================

ALTER TABLE public.cash_settlements
  DROP CONSTRAINT IF EXISTS cash_settlements_gross_identity_chk;

ALTER TABLE public.cash_settlements
  DROP CONSTRAINT IF EXISTS cash_settlements_carrier_number_key;

DO $verify$
DECLARE
  remaining integer;
BEGIN
  SELECT count(*) INTO remaining
  FROM pg_constraint
  WHERE conname IN (
    'cash_settlements_gross_identity_chk',
    'cash_settlements_carrier_number_key'
  );

  IF remaining <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: % constraint(s) still present', remaining;
  END IF;
END
$verify$;
