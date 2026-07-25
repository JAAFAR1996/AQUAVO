-- AQUAVO database repair: prevent partial deletion of audited orders
-- Date: 2026-07-22
-- Depends on migrations 01-07.

CREATE OR REPLACE FUNCTION refresh_order_financial_snapshot_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_id text;
BEGIN
  target_id:=CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END;
  PERFORM refresh_order_financial_snapshot(target_id);

  IF TG_OP='DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION order_is_hard_deletable(target_order_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM orders o
      WHERE o.id=target_order_id
        AND o.status='pending'
        AND o.payment_status='pending'
        AND COALESCE(o.cod_received,false)=false
    )
    AND NOT EXISTS (
      SELECT 1 FROM payment_events WHERE order_id=target_order_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM cash_settlement_items WHERE order_id=target_order_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM inventory_movements
      WHERE source_id=target_order_id
        AND source_type IN ('order_line','order_status_reversal')
    );
$$;

CREATE OR REPLACE FUNCTION prevent_unsafe_order_dependency_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_order_id text;
  new_order_id text;
BEGIN
  old_order_id:=to_jsonb(OLD)->>TG_ARGV[0];

  IF TG_OP='UPDATE' THEN
    new_order_id:=to_jsonb(NEW)->>TG_ARGV[0];
    IF old_order_id IS NOT DISTINCT FROM new_order_id THEN
      RETURN NEW;
    END IF;
  END IF;

  IF old_order_id IS NOT NULL
    AND NOT order_is_hard_deletable(old_order_id)
  THEN
    RAISE EXCEPTION
      'order % is audited and its dependent records cannot be removed or detached',
      old_order_id;
  END IF;

  IF TG_OP='DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS referrals_guard_order_detach ON referrals;
CREATE TRIGGER referrals_guard_order_detach
BEFORE UPDATE OF first_order_id OR DELETE ON referrals
FOR EACH ROW
EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('first_order_id');

DROP TRIGGER IF EXISTS auto_orders_guard_order_detach ON auto_orders;
CREATE TRIGGER auto_orders_guard_order_detach
BEFORE UPDATE OF last_order_id OR DELETE ON auto_orders
FOR EACH ROW
EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('last_order_id');

DROP TRIGGER IF EXISTS loyalty_transactions_guard_order_detach ON loyalty_transactions;
CREATE TRIGGER loyalty_transactions_guard_order_detach
BEFORE UPDATE OF order_id OR DELETE ON loyalty_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('order_id');

DROP TRIGGER IF EXISTS loyalty_coupons_guard_order_detach ON loyalty_coupons;
CREATE TRIGGER loyalty_coupons_guard_order_detach
BEFORE UPDATE OF used_order_id OR DELETE ON loyalty_coupons
FOR EACH ROW
EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('used_order_id');

DROP TRIGGER IF EXISTS return_requests_guard_order_detach ON return_requests;
CREATE TRIGGER return_requests_guard_order_detach
BEFORE UPDATE OF order_id OR DELETE ON return_requests
FOR EACH ROW
EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('order_id');

DROP TRIGGER IF EXISTS order_items_guard_order_detach ON order_items_relational;
CREATE TRIGGER order_items_guard_order_detach
BEFORE UPDATE OF order_id OR DELETE ON order_items_relational
FOR EACH ROW
EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('order_id');

DROP TRIGGER IF EXISTS payments_guard_order_detach ON payments;
CREATE TRIGGER payments_guard_order_detach
BEFORE UPDATE OF order_id OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('order_id');

REVOKE ALL ON FUNCTION order_is_hard_deletable(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION prevent_unsafe_order_dependency_mutation() FROM PUBLIC;
