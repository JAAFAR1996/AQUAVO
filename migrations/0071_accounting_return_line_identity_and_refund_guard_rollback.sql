-- 0071_accounting_return_line_identity_and_refund_guard_rollback.sql
-- Restores the 0069 return verifier. Blocked after any return event has changed
-- while 0071 is active because canonical refund evidence must remain immutable.
BEGIN;

DO $$
DECLARE
  v_applied_at timestamptz;
BEGIN
  SELECT applied_at INTO v_applied_at
  FROM public.schema_migrations
  WHERE version='0071_accounting_return_line_identity_and_refund_guard'
    AND rolled_back_at IS NULL;

  IF v_applied_at IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.order_return_events r
    WHERE r.updated_at >= (v_applied_at AT TIME ZONE 'UTC')
  ) THEN
    RAISE EXCEPTION
      '0071_ROLLBACK_BLOCKED: return events changed after 0071 was applied';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_verified_return_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  elem jsonb;
  v_product text;
  v_variant text;
  v_qty integer;
  v_match_count integer;
  v_item public.order_items_relational%ROWTYPE;
  v_used jsonb:='{}'::jsonb;
  v_used_qty integer;
  v_prev_qty integer;
  v_unit_cogs numeric;
  v_canonical_items jsonb:='[]'::jsonb;
BEGIN
  IF OLD.status='disputed' AND NEW.status='verified' THEN
    RAISE EXCEPTION
      'RETURN_REVERIFY_BLOCKED: انشئ حدث راجع جديد بدل اعادة كتابة حدث مستبعد';
  END IF;

  IF OLD.status='verified'
     AND NEW.status IS DISTINCT FROM 'verified'
     AND NULLIF(btrim(COALESCE(NEW.note,'')),'') IS NULL THEN
    RAISE EXCEPTION
      'RETURN_REVERSAL_REASON_REQUIRED: سبب عكس الراجع مطلوب';
  END IF;

  IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    IF NEW.restocked=true AND NEW.restocked_at IS NULL THEN
      NEW.restocked_at:=clock_timestamp();
    END IF;

    IF NEW.type='rejected_delivery' THEN
      RETURN NEW;
    END IF;

    IF jsonb_array_length(COALESCE(NEW.affected_items,'[]'::jsonb))=0 THEN
      RAISE EXCEPTION
        'RETURN_ITEMS_REQUIRED: لا يمكن اعتماد الراجع بدون تحديد المنتجات والكميات';
    END IF;

    FOR elem IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(NEW.affected_items,'[]'::jsonb))
    LOOP
      v_product:=NULLIF(elem->>'productId','');
      v_variant:=NULLIF(COALESCE(elem->>'variantId',elem->>'variant_id'),'');
      v_qty:=COALESCE(NULLIF(elem->>'qty','')::integer,0);

      IF v_product IS NULL OR v_qty<=0 THEN
        RAISE EXCEPTION
          'RETURN_ITEM_INVALID: المنتج مفقود او الكمية غير صالحة في حدث %',
          NEW.id;
      END IF;

      IF v_variant IS NULL THEN
        SELECT COUNT(*) INTO v_match_count
        FROM public.order_items_relational oi
        WHERE oi.order_id=NEW.order_id
          AND oi.product_id=v_product;

        IF v_match_count=0 THEN
          RAISE EXCEPTION
            'RETURN_ITEM_NOT_IN_ORDER: المنتج % غير موجود في الطلب %',
            v_product,NEW.order_id;
        ELSIF v_match_count>1 THEN
          RAISE EXCEPTION
            'RETURN_VARIANT_REQUIRED: المنتج % موجود باكثر من سطر ويجب تحديد النوع او الحجم',
            v_product;
        END IF;

        SELECT oi.* INTO STRICT v_item
        FROM public.order_items_relational oi
        WHERE oi.order_id=NEW.order_id
          AND oi.product_id=v_product;

        v_variant:=NULLIF(v_item.metadata->>'variantId','');
      ELSE
        SELECT COUNT(*) INTO v_match_count
        FROM public.order_items_relational oi
        WHERE oi.order_id=NEW.order_id
          AND oi.product_id=v_product
          AND NULLIF(oi.metadata->>'variantId','') IS NOT DISTINCT FROM v_variant;

        IF v_match_count<>1 THEN
          RAISE EXCEPTION
            'RETURN_VARIANT_NOT_IN_ORDER: المنتج % والنوع % لا يطابقان سطر بيع واحد في الطلب',
            v_product,v_variant;
        END IF;

        SELECT oi.* INTO STRICT v_item
        FROM public.order_items_relational oi
        WHERE oi.order_id=NEW.order_id
          AND oi.product_id=v_product
          AND NULLIF(oi.metadata->>'variantId','') IS NOT DISTINCT FROM v_variant;
      END IF;

      v_used_qty:=COALESCE((v_used->>v_item.id)::integer,0);

      SELECT COALESCE(SUM(
        COALESCE(NULLIF(pe.item->>'qty','')::integer,0)
      ),0)
      INTO v_prev_qty
      FROM public.order_return_events r
      CROSS JOIN LATERAL
        jsonb_array_elements(COALESCE(r.affected_items,'[]'::jsonb)) AS pe(item)
      WHERE r.order_id=NEW.order_id
        AND r.id<>NEW.id
        AND r.status='verified'
        AND (
          NULLIF(pe.item->>'orderItemId','')=v_item.id
          OR (
            NULLIF(pe.item->>'orderItemId','') IS NULL
            AND NULLIF(pe.item->>'productId','')=v_item.product_id
            AND NULLIF(
              COALESCE(pe.item->>'variantId',pe.item->>'variant_id'),''
            ) IS NOT DISTINCT FROM v_variant
          )
        );

      IF v_prev_qty+v_used_qty+v_qty>v_item.quantity THEN
        RAISE EXCEPTION
          'RETURN_QUANTITY_EXCEEDS_ORDER: سطر الطلب % كميته % والمعاد سابقا % ومحاولة الاعادة الكلية %',
          v_item.id,v_item.quantity,v_prev_qty,v_prev_qty+v_used_qty+v_qty;
      END IF;

      v_used:=jsonb_set(
        v_used,
        ARRAY[v_item.id],
        to_jsonb(v_used_qty+v_qty),
        true
      );

      IF v_item.cost_snapshot_status IS NULL
         OR v_item.cost_snapshot_status NOT IN ('exact','verified_zero')
         OR v_item.unit_cost_price IS NULL
         OR v_item.unit_packaging_cost IS NULL
         OR v_item.unit_insert_cost IS NULL THEN
        RAISE EXCEPTION
          'RETURN_COST_SNAPSHOT_INCOMPLETE: لا يمكن اعتماد الراجع قبل اكتمال كلفة سطر البيع %',
          v_item.id;
      END IF;

      v_unit_cogs:=
        v_item.unit_cost_price+
        v_item.unit_packaging_cost+
        v_item.unit_insert_cost;

      v_canonical_items:=v_canonical_items||jsonb_build_array(
        jsonb_build_object(
          'orderItemId',v_item.id,
          'productId',v_item.product_id,
          'variantId',v_variant,
          'qty',v_qty,
          'priceAtPurchase',COALESCE(
            v_item.final_unit_sale_price_snapshot,
            v_item.price_at_purchase
          ),
          'cogsAtTime',v_unit_cogs
        )
      );
    END LOOP;

    NEW.affected_items:=v_canonical_items;
    NEW.product_write_off_amount:=0;
    NEW.cogs_loss:=0;
  END IF;

  RETURN NEW;
END;
$function$;

UPDATE public.schema_migrations
SET rolled_back_at=now()
WHERE version='0071_accounting_return_line_identity_and_refund_guard'
  AND rolled_back_at IS NULL;

COMMIT;
