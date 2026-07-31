-- ROLLBACK 0042. Reservations are claims, not physical facts: dropping them
-- restores availability to on-hand and loses no inventory history.
BEGIN;
DROP TABLE IF EXISTS carton_reservations;
UPDATE schema_migrations SET rolled_back_at = now()
 WHERE version='0042_carton_reservations' AND rolled_back_at IS NULL;
COMMIT;
