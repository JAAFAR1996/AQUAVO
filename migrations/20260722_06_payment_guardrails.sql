-- AQUAVO database repair: payment and settlement guardrails
-- Date: 2026-07-22
-- Depends on migrations 01-05.
-- Enforcement remains disabled until settings.payment_ledger_enabled is true.

ALTER TABLE payment_events
  DROP CONSTRAINT IF EXISTS payment_events_event_amount_check;
ALTER TABLE payment_events
  ADD CONSTRAINT payment_events_event_amount_check
  CHECK (
    (event_type IN ('authorization','void') AND amount>=0)
    OR (event_type NOT IN ('authorization','void') AND amount>0)
  ) NOT VALID;
ALTER TABLE payment_events
  VALIDATE CONSTRAINT payment_events_event_amount_check;

ALTER TABLE cash_settlements
  DROP CONSTRAINT IF EXISTS cash_settlements_net_formula_check;
ALTER TABLE cash_settlements
  ADD CONSTRAINT cash_settlements_net_formula_check
  CHECK (net_amount=gross_amount-fees_amount) NOT VALID;
ALTER TABLE cash_settlements
  VALIDATE CONSTRAINT cash_settlements_net_formula_check;

ALTER TABLE cash_settlement_items
  DROP CONSTRAINT IF EXISTS cash_settlement_items_net_formula_check;
ALTER TABLE cash_settlement_items
  ADD CONSTRAINT cash_settlement_items_net_formula_check
  CHECK (net_amount=gross_amount-fee_amount) NOT VALID;
ALTER TABLE cash_settlement_items
  VALIDATE CONSTRAINT cash_settlement_items_net_formula_check;

CREATE OR REPLACE FUNCTION validate_payment_event_reversal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  original_event record;
BEGIN
  IF NEW.reverses_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id,order_id,status,event_type,amount
    INTO original_event
  FROM payment_events
  WHERE id=NEW.reverses_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'reversed payment event % does not exist',NEW.reverses_event_id;
  END IF;

  IF original_event.order_id<>NEW.order_id THEN
    RAISE EXCEPTION 'reversal event must belong to the same order';
  END IF;

  IF original_event.status<>'completed' THEN
    RAISE EXCEPTION 'only a completed payment event can be reversed';
  END IF;

  IF NEW.event_type NOT IN ('refund','chargeback','adjustment','void') THEN
    RAISE EXCEPTION 'event type % cannot reverse a payment event',NEW.event_type;
  END IF;

  IF NEW.amount>original_event.amount THEN
    RAISE EXCEPTION 'reversal amount exceeds original payment amount';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_events_validate_reversal ON payment_events;
CREATE TRIGGER payment_events_validate_reversal
BEFORE INSERT ON payment_events
FOR EACH ROW EXECUTE FUNCTION validate_payment_event_reversal();

CREATE OR REPLACE FUNCTION sync_order_payment_status_from_events()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  net_paid numeric;
  expected_total numeric;
  has_cod boolean;
  has_refund boolean;
BEGIN
  IF NEW.status<>'completed' THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(SUM(CASE
      WHEN status='completed'
       AND event_type IN ('capture','cod_received','adjustment') THEN amount
      WHEN status='completed'
       AND event_type IN ('refund','chargeback') THEN -amount
      ELSE 0
    END),0),
    COALESCE(bool_or(status='completed' AND event_type='cod_received'),false),
    COALESCE(bool_or(
      status='completed' AND event_type IN ('refund','chargeback')
    ),false)
  INTO net_paid,has_cod,has_refund
  FROM payment_events
  WHERE order_id=NEW.order_id;

  SELECT COALESCE(rounded_total,total)
    INTO expected_total
  FROM orders
  WHERE id=NEW.order_id
  FOR UPDATE;

  UPDATE orders
  SET payment_status=CASE
        WHEN net_paid<=0 AND has_refund THEN 'refunded'
        WHEN net_paid>=expected_total THEN 'paid'
        ELSE 'pending'
      END,
      cod_received=CASE WHEN has_cod THEN true ELSE cod_received END,
      updated_at=now()
  WHERE id=NEW.order_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_events_sync_order_status ON payment_events;
CREATE TRIGGER payment_events_sync_order_status
AFTER INSERT ON payment_events
FOR EACH ROW EXECUTE FUNCTION sync_order_payment_status_from_events();

CREATE OR REPLACE FUNCTION prevent_unverified_order_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  enabled text;
  net_paid numeric;
  expected_total numeric;
  has_cod boolean;
  has_refund boolean;
BEGIN
  SELECT value INTO enabled
  FROM settings
  WHERE key='payment_ledger_enabled';

  IF COALESCE(enabled,'false')<>'true' THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(SUM(CASE
      WHEN status='completed'
       AND event_type IN ('capture','cod_received','adjustment') THEN amount
      WHEN status='completed'
       AND event_type IN ('refund','chargeback') THEN -amount
      ELSE 0
    END),0),
    COALESCE(bool_or(status='completed' AND event_type='cod_received'),false),
    COALESCE(bool_or(
      status='completed' AND event_type IN ('refund','chargeback')
    ),false)
  INTO net_paid,has_cod,has_refund
  FROM payment_events
  WHERE order_id=NEW.id;

  expected_total:=COALESCE(NEW.rounded_total,NEW.total);

  IF NEW.payment_status='paid' AND net_paid<expected_total THEN
    RAISE EXCEPTION
      'order % cannot be marked paid without completed payment evidence',NEW.id;
  END IF;

  IF NEW.cod_received=true AND NOT has_cod THEN
    RAISE EXCEPTION
      'order % cannot be marked COD received without a completed COD event',NEW.id;
  END IF;

  IF NEW.payment_status='refunded' AND NOT has_refund THEN
    RAISE EXCEPTION
      'order % cannot be marked refunded without a completed refund or chargeback event',
      NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_prevent_unverified_payment_status ON orders;
CREATE TRIGGER orders_prevent_unverified_payment_status
BEFORE INSERT OR UPDATE OF payment_status,cod_received ON orders
FOR EACH ROW EXECUTE FUNCTION prevent_unverified_order_payment_status();

CREATE OR REPLACE FUNCTION validate_cash_settlement_reconciliation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item_gross numeric;
  item_fees numeric;
  item_net numeric;
BEGIN
  IF NEW.status NOT IN ('reconciled','closed')
    OR NEW.status IS NOT DISTINCT FROM OLD.status
  THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(SUM(gross_amount),0),
    COALESCE(SUM(fee_amount),0),
    COALESCE(SUM(net_amount),0)
  INTO item_gross,item_fees,item_net
  FROM cash_settlement_items
  WHERE settlement_id=NEW.id;

  IF item_gross<>NEW.gross_amount
    OR item_fees<>NEW.fees_amount
    OR item_net<>NEW.net_amount
  THEN
    RAISE EXCEPTION
      'settlement % header does not match settlement items',NEW.id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cash_settlement_items
    WHERE settlement_id=NEW.id
      AND reconciliation_status NOT IN ('matched','approved')
  ) THEN
    RAISE EXCEPTION 'settlement % contains unresolved items',NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cash_settlements_validate_reconciliation ON cash_settlements;
CREATE TRIGGER cash_settlements_validate_reconciliation
BEFORE UPDATE OF status ON cash_settlements
FOR EACH ROW EXECUTE FUNCTION validate_cash_settlement_reconciliation();

REVOKE ALL ON FUNCTION validate_payment_event_reversal() FROM PUBLIC;
REVOKE ALL ON FUNCTION sync_order_payment_status_from_events() FROM PUBLIC;
REVOKE ALL ON FUNCTION prevent_unverified_order_payment_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_cash_settlement_reconciliation() FROM PUBLIC;
