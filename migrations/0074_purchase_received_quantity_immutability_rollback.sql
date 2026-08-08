-- 0074_purchase_received_quantity_immutability_rollback.sql
--
-- 0074 closes a write-integrity vulnerability on purchase_order_items.received_quantity.
-- Reverting it generically would deliberately reopen a known accounting mutation path.
-- Rollback policy: FAIL CLOSED. Use an explicit forward corrective migration or an audited
-- Neon restore point after reconciling procurement/inventory/accounting evidence.
--
-- This file intentionally does not mark schema_migrations as rolled back because doing so
-- without restoring an equally strong replacement guard would create a false governance state.

DO $do$
BEGIN
  RAISE EXCEPTION
    '0074_ROLLBACK_BLOCKED: received_quantity immutability is an accounting integrity guard; use an explicit forward corrective migration or audited restore point'
    USING ERRCODE='55000';
END $do$;
