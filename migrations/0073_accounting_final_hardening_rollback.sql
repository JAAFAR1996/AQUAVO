-- 0073_accounting_final_hardening_rollback.sql
--
-- 0073 formalizes accounting structures and immutable financial evidence that were
-- already present in Production before the repository migration existed. A generic
-- destructive SQL rollback would therefore erase or weaken real accounting history.
--
-- Rollback policy: FAIL CLOSED. Use the audited Neon restore point
-- `restore-point-20260808-pre-final-accounting-hardening`
-- (`br-winter-sun-a4u5aahp`) for point-in-time recovery, or ship an explicit forward
-- corrective migration after reconciling the affected financial evidence.
--
-- This file intentionally does not mark schema_migrations as rolled back, because
-- doing so without reverting the schema would create a false migration-ledger state.

DO $do$
BEGIN
  RAISE EXCEPTION
    '0073_ROLLBACK_BLOCKED: final accounting hardening contains immutable financial evidence; use the audited restore point or an explicit forward corrective migration'
    USING ERRCODE = '55000';
END $do$;
