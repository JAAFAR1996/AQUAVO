-- 0071_accounting_return_line_identity_and_refund_guard.sql
-- Make the relational order line the mandatory return identity and derive the
-- refundable sale amount from immutable sale-time snapshots inside PostgreSQL.
BEGIN;

CREATE OR REPLACE FUNCTION public.prepare_verified_return_inventory()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  elem jsonb;
  v_order_item_id text;
  v_product text;
  v_variant text;
  v_db_variant text;
  v_qty integer;
  v_item public.order_items_relational%ROWTYPE;
  v_used jsonb:='{}'::jsonb;
  v_used_qty integer;
  v_prev_qty integer;
  v_unit_cogs numeric;
  v_unit_sale numeric;
  v_refund_total numeric:=0;
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

    -- COD refusals use the dedicated custody workflow and do not carry a
    -- delivered sale refund.
    IF NEW.type='rejected_delivery' THEN
      NEW.refund_amount:=0;
      NEW.product_write_off_amount:=0;
      NEW.cogs_loss:=0;
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
      v_order_item_id:=NULLIF(
        COALESCE(elem->>'orderItemId',elem->>'order_item_id'),
        ''
      );
      v_product:=NULLIF(elem->>'productId','');
      v_variant:=NULLIF(
        COALESCE(elem->>'variantId',elem->>'variant_id'),
        ''
      );
      v_qty:=COALESCE(NULLIF(elem->>'qty','')::integer,0);

      IF v_order_item_id IS NULL THEN
        RAISE EXCEPTION
          'RETURN_ORDER_ITEM_ID_REQUIRED: يجب تحديد سطر الطلب الأصلي لكل منتج راجع';
      END IF;

      IF v_product IS NULL OR v_qty<=0 THEN
        RAISE EXCEPTION
          'RETURN_ITEM_INVALID: المنتج مفقود او الكمية غير صالحة في حدث %',
          NEW.id;
      END IF;

      SELECT oi.* INTO v_item
      FROM public.order_items_relational oi
      WHERE oi.id=v_order_item_id
        AND oi.order_id=NEW.order_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'RETURN_ORDER_ITEM_NOT_IN_ORDER: سطر الطلب % لا يعود للطلب %',
          v_order_item_id,NEW.order_id;
      END IF;

      IF v_item.product_id IS DISTINCT FROM v_product THEN
        RAISE EXCEPTION
          'RETURN_PRODUCT_MISMATCH: المنتج % لا يطابق سطر الطلب %',
          v_product,v_order_item_id;
      END IF;

      v_db_variant:=NULLIF(
        COALESCE(
          v_item.metadata->>'variantId',
          v_item.metadata->>'variant_id'
        ),
        ''
      );

      IF v_variant IS DISTINCT FROM v_db_variant THEN
        RAISE EXCEPTION
          'RETURN_VARIANT_MISMATCH: النوع المرسل % لا يطابق النوع الأصلي % لسطر الطلب %',
          COALESCE(v_variant,'none'),
          COALESCE(v_db_variant,'none'),
          v_order_item_id;
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
          NULLIF(
            COALESCE(pe.item->>'orderItemId',pe.item->>'order_item_id'),
            ''
          )=v_item.id
          OR (
            NULLIF(
              COALESCE(pe.item->>'orderItemId',pe.item->>'order_item_id'),
              ''
            ) IS NULL
            AND NULLIF(pe.item->>'productId','')=v_item.product_id
            AND NULLIF(
              COALESCE(pe.item->>'variantId',pe.item->>'variant_id'),
              ''
            ) IS NOT DISTINCT FROM v_db_variant
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

      v_unit_sale:=COALESCE(
        v_item.final_unit_sale_price_snapshot,
        v_item.price_at_purchase
      );

      IF v_unit_sale IS NULL OR v_unit_sale<0 THEN
        RAISE EXCEPTION
          'RETURN_SALE_SNAPSHOT_INCOMPLETE: سعر البيع الأصلي غير مكتمل لسطر الطلب %',
          v_item.id;
      END IF;

      v_refund_total:=v_refund_total+(v_qty*v_unit_sale);

      v_canonical_items:=v_canonical_items||jsonb_build_array(
        jsonb_build_object(
          'orderItemId',v_item.id,
          'productId',v_item.product_id,
          'variantId',v_db_variant,
          'qty',v_qty,
          'priceAtPurchase',v_unit_sale,
          'cogsAtTime',v_unit_cogs
        )
      );
    END LOOP;

    -- Client money and cost values are advisory only. PostgreSQL derives the
    -- canonical refund, sale-line identity and COGS from immutable snapshots.
    NEW.affected_items:=v_canonical_items;
    NEW.refund_amount:=v_refund_total;
    NEW.product_write_off_amount:=0;
    NEW.cogs_loss:=0;
  END IF;

  RETURN NEW;
END;
$function$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0071_accounting_return_line_identity_and_refund_guard',
  'e52fea1bc2faf699fff3b79e89ae8c6da982101566c32deac720816b6c534519',
  'Require relational order-line identity and derive verified return refunds from immutable sale snapshots'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
