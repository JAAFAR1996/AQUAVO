-- 0081_inventory_reconciliation_owner_correction_rollback
-- Intentionally irreversible through an automated rollback.
-- This migration records an owner-confirmed financial correction in the immutable
-- journal and restores verified cost evidence. Reversal, if ever required, must be
-- a new documented accounting reversal with fresh evidence; history must not be erased.

DO $do$
BEGIN
  RAISE EXCEPTION '0081_IRREVERSIBLE_OWNER_CONFIRMED_FINANCIAL_CORRECTION: create a new documented reversal instead of deleting or rewriting history';
END
$do$;
