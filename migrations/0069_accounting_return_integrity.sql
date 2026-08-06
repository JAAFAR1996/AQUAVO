-- 0069_accounting_return_integrity.sql
-- Build return accounting from immutable sale-time snapshots, preserve variant
-- identity, prevent over-returns, restore COGS only for sellable returns, and
-- avoid charging original product/fulfillment cost twice.
BEGIN;

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
    RAISE EXCEPTION 'RETURN_REVERSAL_REASON_REQUIRED: سبب عكس الراجع مطلوب';
  END IF;

  IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    IF NEW.restocked=true AND NEW.restocked_at IS NULL THEN
      NEW.restocked_at:=clock_timestamp();
    END IF;

    -- COD refusals use their dedicated custody workflow and carry no delivered
    -- sale accounting fact.
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

    -- Values supplied by the client are advisory only. The database freezes the
    -- canonical sale line, variant, sale price and COGS from the original order.
    NEW.affected_items:=v_canonical_items;

    -- Original delivered COGS already expensed inventory. For a non-sellable
    -- return it remains expensed; writing another inventory loss would double
    -- charge the same product. Sellable returns are reversed in the journal.
    NEW.product_write_off_amount:=0;
    NEW.cogs_loss:=0;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_verified_return_journal()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_fact public.order_accounting_facts%ROWTYPE;
  v_entry_id text;
  v_original_id text;
  v_refund_credit_account text;
  v_cash_loss numeric;
  v_restock_cogs numeric;
  v_total numeric;
  v_line integer:=0;
  v_period text;
BEGIN
  IF NEW.created_at<(public.aquavo_active_cutover() AT TIME ZONE 'UTC') THEN
    RETURN NEW;
  END IF;

  IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    v_cash_loss:=
      COALESCE(NEW.delivery_cost_loss,0)+
      COALESCE(NEW.return_shipping_cost,0)+
      CASE
        WHEN COALESCE(NEW.packaging_loss_source,'manual')='manual'
          THEN COALESCE(NEW.packaging_loss,0)
        ELSE 0
      END;

    SELECT COALESCE(SUM(
      COALESCE(NULLIF(elem->>'qty','')::numeric,0)*
      COALESCE(NULLIF(elem->>'cogsAtTime','')::numeric,0)
    ),0)
    INTO v_restock_cogs
    FROM jsonb_array_elements(COALESCE(NEW.affected_items,'[]'::jsonb)) elem
    WHERE NEW.restocked=true
      AND NEW.type<>'rejected_delivery';

    v_total:=COALESCE(NEW.refund_amount,0)+v_cash_loss+v_restock_cogs;

    IF v_total=0 THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_fact
    FROM public.order_accounting_facts
    WHERE order_id=NEW.order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'RETURN_JOURNAL_BLOCKED: الراجع المالي يتطلب Accounting Fact للطلب %',
        NEW.order_id;
    END IF;

    IF v_fact.cash_custody='carrier'
       AND NOT EXISTS(
         SELECT 1
         FROM public.order_accounting_settlements os
         WHERE os.order_fact_id=v_fact.id
           AND os.status='matched'
       ) THEN
      v_refund_credit_account:='1100';
    ELSIF v_fact.cash_custody='bank' THEN
      v_refund_credit_account:='1010';
    ELSE
      v_refund_credit_account:='1000';
    END IF;

    v_period:=to_char(
      NEW.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Baghdad',
      'YYYY-MM'
    );

    INSERT INTO public.journal_entries(
      entry_date,period_key,source_type,source_id,event_kind,description,
      total_debit,total_credit,evidence,created_by
    ) VALUES(
      NEW.updated_at AT TIME ZONE 'UTC',
      v_period,
      'return_event',
      NEW.id,
      'return_verification',
      'اثبات مرتجع معتمد للطلب '||NEW.order_id,
      v_total,
      v_total,
      jsonb_build_object(
        'order_id',NEW.order_id,
        'restocked',NEW.restocked,
        'restock_cogs',v_restock_cogs,
        'note',NEW.note,
        'packaging_loss_source',NEW.packaging_loss_source
      ),
      NEW.created_by
    )
    ON CONFLICT(source_type,source_id,event_kind) DO NOTHING
    RETURNING id INTO v_entry_id;

    IF v_entry_id IS NOT NULL THEN
      IF COALESCE(NEW.refund_amount,0)>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,debit,memo
        ) VALUES(
          v_entry_id,v_line,'4100',NEW.refund_amount,
          'عكس ايراد المبلغ المرتجع'
        );
      END IF;

      IF v_restock_cogs>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,debit,memo
        ) VALUES(
          v_entry_id,v_line,'1200',v_restock_cogs,
          'اعادة كلفة المنتجات الصالحة للبيع الى المخزون'
        );
      END IF;

      IF v_cash_loss>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,debit,memo
        ) VALUES(
          v_entry_id,v_line,'4200',v_cash_loss,
          'كلف الراجع التشغيلية الفعلية'
        );
      END IF;

      IF COALESCE(NEW.refund_amount,0)>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,credit,memo
        ) VALUES(
          v_entry_id,v_line,v_refund_credit_account,NEW.refund_amount,
          'تسوية او دفع مبلغ الراجع'
        );
      END IF;

      IF v_cash_loss>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,credit,memo
        ) VALUES(
          v_entry_id,v_line,'1000',v_cash_loss,
          'كلف نقدية للراجع'
        );
      END IF;

      IF v_restock_cogs>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,credit,memo
        ) VALUES(
          v_entry_id,v_line,'4000',v_restock_cogs,
          'عكس كلفة البضاعة للمنتجات المعادة الى المخزون'
        );
      END IF;

      PERFORM public.validate_journal_entry(v_entry_id);
    END IF;
  END IF;

  IF OLD.status='verified' AND NEW.status IS DISTINCT FROM 'verified' THEN
    SELECT id INTO v_original_id
    FROM public.journal_entries
    WHERE source_type='return_event'
      AND source_id=NEW.id
      AND event_kind='return_verification';

    IF v_original_id IS NOT NULL THEN
      SELECT total_debit,period_key INTO v_total,v_period
      FROM public.journal_entries
      WHERE id=v_original_id;

      INSERT INTO public.journal_entries(
        entry_date,period_key,source_type,source_id,event_kind,description,
        total_debit,total_credit,reversal_of_entry_id,evidence,created_by
      ) VALUES(
        clock_timestamp(),
        to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),
        'return_event',
        NEW.id,
        'return_reversal',
        'عكس راجع معتمد: '||NEW.note,
        v_total,
        v_total,
        v_original_id,
        jsonb_build_object('reason',NEW.note,'original_period',v_period),
        NEW.created_by
      )
      ON CONFLICT(source_type,source_id,event_kind) DO NOTHING
      RETURNING id INTO v_entry_id;

      IF v_entry_id IS NOT NULL THEN
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,debit,credit,memo,dimensions
        )
        SELECT
          v_entry_id,
          line_number,
          account_code,
          credit,
          debit,
          'عكس: '||COALESCE(memo,''),
          dimensions
        FROM public.journal_lines
        WHERE entry_id=v_original_id
        ORDER BY line_number;

        PERFORM public.validate_journal_entry(v_entry_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0069_accounting_return_integrity',
  '491996f704243ebc43a744bb6bb40f0ee8967e05b5afa88a9d18869ff8a17b8a',
  'Canonicalize verified return items from sale snapshots, enforce variant and quantity integrity, and post correct sellable-return COGS reversals'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
