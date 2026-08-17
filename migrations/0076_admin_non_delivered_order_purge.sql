-- 0076_admin_non_delivered_order_purge.sql
-- Admin-only, irreversible purge for orders that were never financially realized.
-- Delivered/financially-realized orders remain immutable.

CREATE OR REPLACE FUNCTION public.purge_non_delivered_order(
  p_order_id text,
  p_actor text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_order record;
  v_pending_loyalty integer := 0;
  v_pending_cashback integer := 0;
  v_redeemed_cashback integer := 0;
  v_deleted_lines bigint := 0;
  v_deleted_inventory bigint := 0;
  v_deleted_fulfillment bigint := 0;
  v_deleted_packaging bigint := 0;
  v_deleted_returns bigint := 0;
BEGIN
  IF NULLIF(btrim(COALESCE(p_reason,'')),'') IS NULL THEN
    RAISE EXCEPTION 'ORDER_PURGE_REASON_REQUIRED' USING ERRCODE='22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('aquavo-order-purge|' || p_order_id, 0));
  PERFORM set_config('lock_timeout','5s',true);

  SELECT
    o.id,
    o.order_number,
    lower(btrim(COALESCE(o.status,''))) AS status,
    lower(btrim(COALESCE(o.payment_status,''))) AS payment_status,
    o.delivered_at,
    COALESCE(o.financially_counted,false) AS financially_counted,
    COALESCE(o.cod_received,false) AS cod_received,
    o.user_id,
    o.coupon_id
  INTO v_order
  FROM public.orders o
  WHERE o.id=p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_PURGE_NOT_FOUND' USING ERRCODE='P0002';
  END IF;

  -- Hard business invariant: a customer-received / financially-realized order
  -- can never be erased, even if its current lifecycle status later says returned.
  IF v_order.status='delivered'
     OR v_order.delivered_at IS NOT NULL
     OR v_order.financially_counted
     OR v_order.cod_received
     OR EXISTS (SELECT 1 FROM public.order_accounting_facts f WHERE f.order_id=p_order_id)
     OR EXISTS (SELECT 1 FROM public.order_accounting_carrier_snapshots s WHERE s.order_id=p_order_id)
     OR EXISTS (SELECT 1 FROM public.payment_events e WHERE e.order_id=p_order_id)
     OR EXISTS (SELECT 1 FROM public.payments p WHERE p.order_id=p_order_id)
     OR EXISTS (SELECT 1 FROM public.cash_settlement_items s WHERE s.order_id=p_order_id)
     OR EXISTS (SELECT 1 FROM public.cash_flow c WHERE c.order_id=p_order_id)
     OR EXISTS (
       SELECT 1
       FROM public.loyalty_transactions lt
       WHERE lt.order_id=p_order_id
         AND lt.status='approved'
         AND lt.type IN ('purchase_earn','rounding_earn','tier_bonus')
     )
     OR EXISTS (
       SELECT 1
       FROM public.journal_entries je
       WHERE (je.source_type='order' AND je.source_id=p_order_id)
          OR je.source_id IN (SELECT r.id FROM public.order_return_events r WHERE r.order_id=p_order_id)
     )
     OR EXISTS (
       SELECT 1 FROM public.customer_credit_entries ce
       WHERE ce.source_id=p_order_id
          OR ce.source_id IN (SELECT r.id FROM public.order_return_events r WHERE r.order_id=p_order_id)
     )
  THEN
    RAISE EXCEPTION 'ORDER_PURGE_FORBIDDEN_RECEIVED: هذا الطلب دخل بالاستلام أو المحاسبة ولا يمكن مسحه نهائيا'
      USING ERRCODE='55000';
  END IF;

  -- Never rewrite purchase valuation history. An order-sale movement should not
  -- be referenced by these tables; if it is, stop rather than guessing.
  IF EXISTS (
    WITH RECURSIVE related AS (
      SELECT im.id
      FROM public.inventory_movements im
      WHERE im.source_id=p_order_id
         OR im.metadata->>'order_id'=p_order_id
         OR im.source_id IN (SELECT r.id FROM public.order_return_events r WHERE r.order_id=p_order_id)
      UNION
      SELECT child.id
      FROM public.inventory_movements child
      JOIN related parent ON child.reversed_movement_id=parent.id
    )
    SELECT 1
    FROM related r
    WHERE EXISTS (SELECT 1 FROM public.inventory_cost_events ce WHERE ce.movement_id=r.id)
       OR EXISTS (SELECT 1 FROM public.goods_receipt_items gri WHERE gri.inventory_movement_id=r.id)
  ) THEN
    RAISE EXCEPTION 'ORDER_PURGE_BLOCKED_INVENTORY_COST_HISTORY'
      USING ERRCODE='55000';
  END IF;

  -- Restore canonical product / variant stock before erasing the order's
  -- immutable inventory ledger rows. The temporary compensation movement uses
  -- the normal projection trigger, then is erased with the order movements.
  WITH RECURSIVE related AS (
    SELECT im.id,im.product_id,im.variant_id,im.location_id,im.quantity_delta
    FROM public.inventory_movements im
    WHERE im.source_id=p_order_id
       OR im.metadata->>'order_id'=p_order_id
       OR im.source_id IN (SELECT r.id FROM public.order_return_events r WHERE r.order_id=p_order_id)
    UNION
    SELECT child.id,child.product_id,child.variant_id,child.location_id,child.quantity_delta
    FROM public.inventory_movements child
    JOIN related parent ON child.reversed_movement_id=parent.id
  ), net AS (
    SELECT product_id,variant_id,location_id,SUM(quantity_delta)::integer AS qty
    FROM related
    GROUP BY product_id,variant_id,location_id
    HAVING SUM(quantity_delta)<>0
  )
  INSERT INTO public.inventory_movements(
    product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
    source_id,idempotency_key,currency,happened_at,created_by,metadata
  )
  SELECT
    n.product_id,n.variant_id,n.location_id,-n.qty,'manual_adjustment','admin_order_purge',
    p_order_id,
    'admin_order_purge:'||p_order_id||':'||md5(n.product_id||'|'||COALESCE(n.variant_id,'')||'|'||n.location_id),
    'IQD',clock_timestamp(),COALESCE(NULLIF(p_actor,''),'admin'),
    jsonb_build_object('order_id',p_order_id,'reason',p_reason,'temporary_compensation',true)
  FROM net n
  ON CONFLICT(idempotency_key) DO NOTHING;

  -- Reverse checkout loyalty effects. Approved earn transactions were blocked
  -- above, so only pending/cancelled pre-delivery effects can reach this point.
  IF v_order.user_id IS NOT NULL THEN
    SELECT
      COALESCE(SUM(CASE WHEN status='pending' AND points_type='loyalty' AND amount>0 THEN amount ELSE 0 END),0)::integer,
      COALESCE(SUM(CASE WHEN status='pending' AND points_type='cashback' AND amount>0 THEN amount ELSE 0 END),0)::integer,
      COALESCE(SUM(CASE WHEN type='redeem' AND points_type='cashback' AND amount<0 THEN -amount ELSE 0 END),0)::integer
    INTO v_pending_loyalty,v_pending_cashback,v_redeemed_cashback
    FROM public.loyalty_transactions
    WHERE order_id=p_order_id;

    PERFORM 1 FROM public.users u WHERE u.id=v_order.user_id FOR UPDATE;

    IF EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id=v_order.user_id
        AND (COALESCE(u.pending_loyalty_points,0)<v_pending_loyalty
          OR COALESCE(u.pending_cashback_balance,0)<v_pending_cashback)
    ) THEN
      RAISE EXCEPTION 'ORDER_PURGE_LOYALTY_BALANCE_MISMATCH' USING ERRCODE='55000';
    END IF;

    UPDATE public.users
    SET pending_loyalty_points=COALESCE(pending_loyalty_points,0)-v_pending_loyalty,
        pending_cashback_balance=COALESCE(pending_cashback_balance,0)-v_pending_cashback,
        cashback_balance=COALESCE(cashback_balance,0)+v_redeemed_cashback,
        updated_at=clock_timestamp()
    WHERE id=v_order.user_id;
  END IF;

  -- A normal coupon use is counted when the order is created.
  IF v_order.coupon_id IS NOT NULL THEN
    UPDATE public.coupons
    SET used_count=GREATEST(COALESCE(used_count,0)-1,0)
    WHERE id=v_order.coupon_id;
  END IF;

  -- Immutable guards are bypassed only inside this one SECURITY DEFINER
  -- transaction. If any statement fails, PostgreSQL rolls these DDL changes back
  -- together with every data change, so a trigger cannot be left disabled.
  ALTER TABLE public.orders DISABLE TRIGGER USER;
  ALTER TABLE public.order_items_relational DISABLE TRIGGER USER;
  ALTER TABLE public.inventory_movements DISABLE TRIGGER USER;
  ALTER TABLE public.loyalty_transactions DISABLE TRIGGER USER;
  ALTER TABLE public.loyalty_coupons DISABLE TRIGGER USER;
  ALTER TABLE public.referrals DISABLE TRIGGER USER;
  ALTER TABLE public.auto_orders DISABLE TRIGGER USER;
  ALTER TABLE public.payments DISABLE TRIGGER USER;
  ALTER TABLE public.return_requests DISABLE TRIGGER USER;
  ALTER TABLE public.order_return_events DISABLE TRIGGER USER;
  ALTER TABLE public.order_inventory_custody_events DISABLE TRIGGER USER;
  ALTER TABLE public.order_return_packaging_losses DISABLE TRIGGER USER;
  ALTER TABLE public.packaging_inventory_movements DISABLE TRIGGER USER;
  ALTER TABLE public.order_fulfillment_events DISABLE TRIGGER USER;
  ALTER TABLE public.order_fulfillment_lines DISABLE TRIGGER USER;
  ALTER TABLE public.fulfillment_preparation_drafts DISABLE TRIGGER USER;
  ALTER TABLE public.fulfillment_preparation_draft_lines DISABLE TRIGGER USER;
  ALTER TABLE public.financial_correction_requests DISABLE TRIGGER USER;

  WITH RECURSIVE related AS (
    SELECT im.id
    FROM public.inventory_movements im
    WHERE im.source_id=p_order_id
       OR im.metadata->>'order_id'=p_order_id
       OR im.source_id IN (SELECT r.id FROM public.order_return_events r WHERE r.order_id=p_order_id)
    UNION
    SELECT child.id
    FROM public.inventory_movements child
    JOIN related parent ON child.reversed_movement_id=parent.id
  ), deleted AS (
    DELETE FROM public.inventory_movements im
    USING related r
    WHERE im.id=r.id
    RETURNING im.id
  )
  SELECT COUNT(*) INTO v_deleted_inventory FROM deleted;

  -- Deepest fulfillment / return children first.
  DELETE FROM public.order_return_packaging_losses WHERE order_id=p_order_id;
  GET DIAGNOSTICS v_deleted_returns = ROW_COUNT;

  DELETE FROM public.packaging_inventory_movements WHERE order_id=p_order_id;
  GET DIAGNOSTICS v_deleted_packaging = ROW_COUNT;

  DELETE FROM public.fulfillment_adjustments WHERE order_id=p_order_id;
  DELETE FROM public.fulfillment_preparation_draft_lines
   WHERE draft_id IN (SELECT id FROM public.fulfillment_preparation_drafts WHERE order_id=p_order_id);
  DELETE FROM public.carton_reservations WHERE order_id=p_order_id;

  -- Events and consumed drafts reference each other. Null the nullable event side,
  -- delete event lines, then the draft child, then the event parent. This keeps
  -- fpd_consumed_chk valid even while user triggers are disabled.
  UPDATE public.order_fulfillment_events
     SET draft_id=NULL
   WHERE order_id=p_order_id;
  DELETE FROM public.order_fulfillment_lines WHERE order_id=p_order_id;
  DELETE FROM public.fulfillment_preparation_drafts WHERE order_id=p_order_id;
  DELETE FROM public.order_fulfillment_events WHERE order_id=p_order_id;
  GET DIAGNOSTICS v_deleted_fulfillment = ROW_COUNT;
  DELETE FROM public.order_fulfillment_sequences WHERE order_id=p_order_id;

  DELETE FROM public.order_packing_plan_items
   WHERE plan_id IN (SELECT id FROM public.order_packing_plans WHERE order_id=p_order_id);
  DELETE FROM public.order_packing_plans WHERE order_id=p_order_id;

  DELETE FROM public.order_inventory_custody_events WHERE order_id=p_order_id;
  DELETE FROM public.order_return_events WHERE order_id=p_order_id;
  DELETE FROM public.return_requests WHERE order_id=p_order_id;

  -- Pre-realization financial / preparation records. Real payment/accounting
  -- evidence was blocked at the top of the function.
  DELETE FROM public.order_financial_adjustments WHERE order_id=p_order_id;
  DELETE FROM public.manual_invoices WHERE order_id=p_order_id;
  DELETE FROM public.customer_guides WHERE order_id=p_order_id;
  DELETE FROM public.damage_claims WHERE order_id=p_order_id;
  DELETE FROM public.financial_correction_requests WHERE order_id=p_order_id;

  -- Restore reusable feature records rather than deleting their parent entities.
  UPDATE public.referrals SET first_order_id=NULL WHERE first_order_id=p_order_id;
  UPDATE public.auto_orders SET last_order_id=NULL WHERE last_order_id=p_order_id;
  UPDATE public.loyalty_coupons SET used_order_id=NULL,used_at=NULL WHERE used_order_id=p_order_id;
  DELETE FROM public.loyalty_transactions WHERE order_id=p_order_id;

  DELETE FROM public.order_items_relational WHERE order_id=p_order_id;
  GET DIAGNOSTICS v_deleted_lines = ROW_COUNT;

  -- Purge non-FK residue for the erased pre-delivery order.
  DELETE FROM public.accounting_audit_trail WHERE entity_type='order' AND entity_id=p_order_id;
  DELETE FROM public.accounting_manual_adjustments WHERE entity_type='order' AND entity_id=p_order_id;
  DELETE FROM public.accounting_review_flags WHERE entity_type='order' AND entity_id=p_order_id;
  DELETE FROM public.audit_logs WHERE entity_type='order' AND entity_id=p_order_id;
  DELETE FROM public.database_repair_findings WHERE entity_type='order' AND entity_id=p_order_id;
  DELETE FROM public.evidence_files WHERE entity_type='order' AND entity_id=p_order_id;
  DELETE FROM public.orderitem_trigger_safety_audit WHERE order_id=p_order_id;

  DELETE FROM public.orders WHERE id=p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_PURGE_DELETE_FAILED' USING ERRCODE='P0001';
  END IF;

  ALTER TABLE public.financial_correction_requests ENABLE TRIGGER USER;
  ALTER TABLE public.fulfillment_preparation_draft_lines ENABLE TRIGGER USER;
  ALTER TABLE public.fulfillment_preparation_drafts ENABLE TRIGGER USER;
  ALTER TABLE public.order_fulfillment_lines ENABLE TRIGGER USER;
  ALTER TABLE public.order_fulfillment_events ENABLE TRIGGER USER;
  ALTER TABLE public.packaging_inventory_movements ENABLE TRIGGER USER;
  ALTER TABLE public.order_return_packaging_losses ENABLE TRIGGER USER;
  ALTER TABLE public.order_inventory_custody_events ENABLE TRIGGER USER;
  ALTER TABLE public.order_return_events ENABLE TRIGGER USER;
  ALTER TABLE public.return_requests ENABLE TRIGGER USER;
  ALTER TABLE public.payments ENABLE TRIGGER USER;
  ALTER TABLE public.auto_orders ENABLE TRIGGER USER;
  ALTER TABLE public.referrals ENABLE TRIGGER USER;
  ALTER TABLE public.loyalty_coupons ENABLE TRIGGER USER;
  ALTER TABLE public.loyalty_transactions ENABLE TRIGGER USER;
  ALTER TABLE public.inventory_movements ENABLE TRIGGER USER;
  ALTER TABLE public.order_items_relational ENABLE TRIGGER USER;
  ALTER TABLE public.orders ENABLE TRIGGER USER;

  RETURN jsonb_build_object(
    'success',true,
    'orderId',p_order_id,
    'orderNumber',v_order.order_number,
    'deletedLines',v_deleted_lines,
    'deletedInventoryMovements',v_deleted_inventory,
    'deletedFulfillmentEvents',v_deleted_fulfillment,
    'deletedPackagingMovements',v_deleted_packaging,
    'restoredPendingLoyalty',v_pending_loyalty,
    'restoredPendingCashback',v_pending_cashback,
    'restoredRedeemedCashback',v_redeemed_cashback
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_non_delivered_order(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_non_delivered_order(text,text,text) TO neondb_owner;

COMMENT ON FUNCTION public.purge_non_delivered_order(text,text,text) IS
'Irreversibly erases a non-delivered AQUAVO order after restoring reversible stock/coupon/loyalty effects. Financially realized/customer-received orders are always blocked.';
