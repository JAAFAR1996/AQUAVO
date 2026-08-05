-- 0068_accounting_delivery_readiness_guard.sql
-- Prevent immutable Accounting V2 facts from being created before product and
-- AQUAVO fulfillment snapshots are complete.
BEGIN;

CREATE OR REPLACE FUNCTION public.assert_order_ready_for_accounting_delivery(p_order_id text)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_lines bigint;
  v_bad_lines bigint;
  v_bad_details text;
  v_fulfillment bigint;
  v_bad_fulfillment bigint;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE cost_snapshot_status IS NULL
         OR cost_snapshot_status NOT IN ('exact','verified_zero')
         OR unit_cost_price IS NULL
         OR unit_packaging_cost IS NULL
         OR unit_insert_cost IS NULL
    )
  INTO v_lines,v_bad_lines
  FROM public.order_items_relational
  WHERE order_id=p_order_id;

  IF v_lines=0 THEN
    RAISE EXCEPTION
      'ACCOUNTING_DELIVERY_BLOCKED_NO_PRODUCT_LINES: لا يمكن اعتبار الطلب موصلا لعدم وجود سطور بيع مالية للطلب %',
      p_order_id
      USING ERRCODE='23514';
  END IF;

  IF v_bad_lines>0 THEN
    SELECT string_agg(
      product_id ||
      COALESCE('/'||NULLIF(metadata->>'variantId',''),'') ||
      '['||COALESCE(cost_snapshot_status,'missing')||']',
      ', ' ORDER BY product_id,metadata->>'variantId'
    )
    INTO v_bad_details
    FROM public.order_items_relational
    WHERE order_id=p_order_id
      AND (
        cost_snapshot_status IS NULL
        OR cost_snapshot_status NOT IN ('exact','verified_zero')
        OR unit_cost_price IS NULL
        OR unit_packaging_cost IS NULL
        OR unit_insert_cost IS NULL
      );

    RAISE EXCEPTION
      'ACCOUNTING_DELIVERY_BLOCKED_PRODUCT_COST: لا يمكن اعتبار الطلب موصلا قبل توثيق كلفة % سطر منتج للطلب % التفاصيل %',
      v_bad_lines,p_order_id,COALESCE(v_bad_details,'unknown')
      USING ERRCODE='23514';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE cost_status NOT IN ('exact','verified_zero')
         OR actual_cost IS NULL
    )
  INTO v_fulfillment,v_bad_fulfillment
  FROM public.order_fulfillment_events
  WHERE order_id=p_order_id
    AND event_type='original'
    AND workflow_state='confirmed';

  IF v_fulfillment=0 THEN
    RAISE EXCEPTION
      'ACCOUNTING_DELIVERY_BLOCKED_FULFILLMENT_MISSING: لا يمكن اعتبار الطلب موصلا قبل تثبيت تجهيز AQUAVO للطلب %',
      p_order_id
      USING ERRCODE='23514';
  END IF;

  IF v_bad_fulfillment>0 THEN
    RAISE EXCEPTION
      'ACCOUNTING_DELIVERY_BLOCKED_FULFILLMENT_INCOMPLETE: لا يمكن اعتبار الطلب موصلا لان كلفة تجهيز AQUAVO غير مكتملة للطلب %',
      p_order_id
      USING ERRCODE='23514';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_order_delivery_accounting_readiness()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF lower(COALESCE(NEW.status,''))='delivered'
     AND lower(COALESCE(OLD.status,''))<>'delivered'
     AND COALESCE(NEW.delivered_at,clock_timestamp())>=public.aquavo_active_cutover() THEN
    PERFORM public.assert_order_ready_for_accounting_delivery(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_accounting_delivery_readiness_guard ON public.orders;
CREATE TRIGGER orders_accounting_delivery_readiness_guard
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.guard_order_delivery_accounting_readiness();

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0068_accounting_delivery_readiness_guard',
  '2d74744fd291dad2de22d12109b65c8ec155bc2d8a75640cd5bb8f0870c288e5',
  'Block delivery before exact product-cost and confirmed AQUAVO fulfillment snapshots exist'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
