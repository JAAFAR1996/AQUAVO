-- 0068_accounting_delivery_return_integrity.sql
-- Fail closed before delivery, restore COGS for sellable returns, and align
-- Accounting V2 views with the immutable journal.
BEGIN;

CREATE OR REPLACE FUNCTION public.assert_order_ready_for_accounting_delivery(p_order_id text)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_line_count bigint;
  v_bad_cost_count bigint;
  v_bad_cost_details text;
  v_fulfillment_count bigint;
  v_bad_fulfillment_count bigint;
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
  INTO v_line_count, v_bad_cost_count
  FROM public.order_items_relational
  WHERE order_id=p_order_id;

  IF v_line_count=0 THEN
    RAISE EXCEPTION
      'ACCOUNTING_DELIVERY_BLOCKED_NO_PRODUCT_LINES: order % has no relational sale lines',
      p_order_id
      USING ERRCODE='23514';
  END IF;

  IF v_bad_cost_count>0 THEN
    SELECT string_agg(
      product_id ||
      CASE
        WHEN NULLIF(metadata->>'variantId','') IS NOT NULL
          THEN '/' || (metadata->>'variantId')
        ELSE ''
      END ||
      '[' || COALESCE(cost_snapshot_status,'missing') || ']',
      ', ' ORDER BY product_id, metadata->>'variantId'
    )
    INTO v_bad_cost_details
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
      'ACCOUNTING_DELIVERY_BLOCKED_PRODUCT_COST: order % has % incomplete product line(s): %',
      p_order_id, v_bad_cost_count, COALESCE(v_bad_cost_details,'unknown')
      USING ERRCODE='23514';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE cost_status<>'exact' OR actual_cost IS NULL
    )
  INTO v_fulfillment_count, v_bad_fulfillment_count
  FROM public.order_fulfillment_events
  WHERE order_id=p_order_id
    AND event_type='original'
    AND workflow_state='confirmed';

  IF v_fulfillment_count=0 THEN
    RAISE EXCEPTION
      'ACCOUNTING_DELIVERY_BLOCKED_FULFILLMENT_MISSING: order % has no confirmed original fulfillment event',
      p_order_id
      USING ERRCODE='23514';
  END IF;

  IF v_bad_fulfillment_count>0 THEN
    RAISE EXCEPTION
      'ACCOUNTING_DELIVERY_BLOCKED_FULFILLMENT_INCOMPLETE: order % has an incomplete confirmed fulfillment snapshot',
      p_order_id
      USING ERRCODE='23514';
  END IF;
END
$function$;

CREATE OR REPLACE FUNCTION public.record_order_delivery_accounting()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_cutover timestamptz;
  v_recognized_at timestamptz;
  v_period_key text;
  v_gross numeric;
  v_customer_fee numeric;
  v_carrier_fee numeric;
  v_product_revenue numeric;
  v_merchant_net numeric;
  v_delivery_subsidy numeric;
  v_delivery_surplus numeric;
  v_event_id text;
  v_fact_id text;
  v_cogs numeric;
  v_cost_status text;
BEGIN
  IF lower(COALESCE(NEW.status,''))<>'delivered'
     OR lower(COALESCE(OLD.status,''))='delivered' THEN
    RETURN NEW;
  END IF;

  v_cutover:=public.aquavo_active_cutover();
  v_recognized_at:=COALESCE(NEW.delivered_at,clock_timestamp());
  IF v_recognized_at<v_cutover THEN
    RETURN NEW;
  END IF;

  -- P0: no payment event, immutable fact or journal may be created unless every
  -- sale-time product cost and the original AQUAVO fulfillment cost is exact.
  PERFORM public.assert_order_ready_for_accounting_delivery(NEW.id);

  v_gross:=COALESCE(NEW.rounded_total,NEW.total,0);
  v_customer_fee:=COALESCE(NEW.shipping_cost,0);
  v_carrier_fee:=COALESCE(NEW.carrier_fee,v_customer_fee,0);
  v_product_revenue:=v_gross-v_customer_fee;
  v_merchant_net:=v_gross-v_carrier_fee;
  v_delivery_subsidy:=GREATEST(v_carrier_fee-v_customer_fee,0);
  v_delivery_surplus:=GREATEST(v_customer_fee-v_carrier_fee,0);
  v_period_key:=to_char(v_recognized_at AT TIME ZONE 'Asia/Baghdad','YYYY-MM');

  IF v_product_revenue<0 THEN
    RAISE EXCEPTION
      'ORDER_ACCOUNTING_INVALID: customer delivery fee exceeds gross total for order %',
      NEW.id;
  END IF;
  IF v_merchant_net<0 THEN
    RAISE EXCEPTION
      'ORDER_ACCOUNTING_INVALID: carrier fee exceeds gross total for order %',
      NEW.id;
  END IF;

  SELECT SUM(
    (unit_cost_price+unit_packaging_cost+unit_insert_cost)*quantity
  )
  INTO v_cogs
  FROM public.order_items_relational
  WHERE order_id=NEW.id;

  v_cost_status:=CASE WHEN v_cogs=0 THEN 'verified_zero' ELSE 'exact' END;

  INSERT INTO public.payment_events(
    order_id,event_type,status,amount,currency,method,provider,idempotency_key,
    occurred_at,evidence,metadata,created_by
  ) VALUES(
    NEW.id,'cod_received','completed',v_gross,'IQD','cod',
    COALESCE(NEW.carrier,'carrier'),
    'delivery:'||NEW.id||':cod_received',
    v_recognized_at,
    jsonb_build_object(
      'source','order_delivery_transition',
      'delivered_at',v_recognized_at
    ),
    jsonb_build_object(
      'gross_collected',v_gross,
      'customer_delivery_fee',v_customer_fee,
      'carrier_fee',v_carrier_fee,
      'product_revenue',v_product_revenue,
      'merchant_net',v_merchant_net,
      'delivery_subsidy',v_delivery_subsidy,
      'delivery_surplus',v_delivery_surplus,
      'policy_version','v2_gross_includes_delivery_carrier_keeps_fee'
    ),
    'database_trigger'
  )
  ON CONFLICT(idempotency_key) DO NOTHING;

  SELECT id INTO v_event_id
  FROM public.payment_events
  WHERE idempotency_key='delivery:'||NEW.id||':cod_received'
    AND status='completed'
    AND amount=v_gross;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'COD_EVENT_MISSING_OR_MISMATCH for delivered order %',NEW.id;
  END IF;

  INSERT INTO public.order_accounting_facts(
    order_id,payment_event_id,recognized_at,period_key,gross_collected,
    customer_delivery_fee,carrier_fee,product_revenue,merchant_net,
    delivery_subsidy,delivery_surplus,cash_custody,cogs_amount,cost_status,
    currency,policy_version,evidence
  ) VALUES(
    NEW.id,v_event_id,v_recognized_at,v_period_key,v_gross,
    v_customer_fee,v_carrier_fee,v_product_revenue,v_merchant_net,
    v_delivery_subsidy,v_delivery_surplus,'carrier',v_cogs,v_cost_status,
    'IQD','v2_gross_includes_delivery_carrier_keeps_fee',
    jsonb_build_object(
      'created_by','database_trigger',
      'order_number',NEW.order_number,
      'delivered_at',v_recognized_at,
      'order_total_source',
      CASE WHEN NEW.rounded_total IS NOT NULL THEN 'rounded_total' ELSE 'total' END
    )
  )
  ON CONFLICT(order_id) DO NOTHING
  RETURNING id INTO v_fact_id;

  IF v_fact_id IS NULL THEN
    SELECT id INTO v_fact_id
    FROM public.order_accounting_facts
    WHERE order_id=NEW.id;
  END IF;

  PERFORM public.post_order_delivery_journal(v_fact_id);
  PERFORM public.post_order_cogs_journal(v_fact_id);
  PERFORM public.post_order_fulfillment_journal(NEW.id);
  RETURN NEW;
END
$function$;

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
  v_item record;
  v_used jsonb:='{}'::jsonb;
  v_used_qty integer;
  v_unit_cogs numeric;
  v_total_cogs numeric:=0;
  v_canonical_items jsonb:='[]'::jsonb;
BEGIN
  IF OLD.status='disputed' AND NEW.status='verified' THEN
    RAISE EXCEPTION
      'RETURN_REVERIFY_BLOCKED: create a new return event instead of rewriting history';
  END IF;

  IF OLD.status='verified'
     AND NEW.status IS DISTINCT FROM 'verified'
     AND NULLIF(btrim(COALESCE(NEW.note,'')),'') IS NULL THEN
    RAISE EXCEPTION 'RETURN_REVERSAL_REASON_REQUIRED';
  END IF;

  IF NEW.status='verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    IF NEW.restocked=true AND NEW.restocked_at IS NULL THEN
      NEW.restocked_at:=clock_timestamp();
    END IF;

    -- Refused COD orders are handled by the refusal custody/inventory workflow.
    IF NEW.type='rejected_delivery' THEN
      RETURN NEW;
    END IF;

    IF jsonb_array_length(COALESCE(NEW.affected_items,'[]'::jsonb))=0 THEN
      RAISE EXCEPTION
        'RETURN_ITEMS_REQUIRED: a verified return must identify product quantities';
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
          'RETURN_ITEM_INVALID: event % contains a missing product or non-positive quantity',
          NEW.id;
      END IF;

      IF v_variant IS NULL THEN
        SELECT COUNT(*) INTO v_match_count
        FROM public.order_items_relational oi
        WHERE oi.order_id=NEW.order_id
          AND oi.product_id=v_product;

        IF v_match_count=0 THEN
          RAISE EXCEPTION
            'RETURN_ITEM_NOT_IN_ORDER: product % is not part of order %',
            v_product,NEW.order_id;
        ELSIF v_match_count>1 THEN
          RAISE EXCEPTION
            'RETURN_VARIANT_REQUIRED: product % appears in multiple order lines; select the exact variant',
            v_product;
        END IF;

        SELECT oi.* INTO v_item
        FROM public.order_items_relational oi
        WHERE oi.order_id=NEW.order_id
          AND oi.product_id=v_product
        LIMIT 1;
        v_variant:=NULLIF(v_item.metadata->>'variantId','');
      ELSE
        SELECT COUNT(*) INTO v_match_count
        FROM public.order_items_relational oi
        WHERE oi.order_id=NEW.order_id
          AND oi.product_id=v_product
          AND NULLIF(oi.metadata->>'variantId','') IS NOT DISTINCT FROM v_variant;

        IF v_match_count<>1 THEN
          RAISE EXCEPTION
            'RETURN_VARIANT_NOT_IN_ORDER: product % variant % does not resolve to one order line',
            v_product,v_variant;
        END IF;

        SELECT oi.* INTO v_item
        FROM public.order_items_relational oi
        WHERE oi.order_id=NEW.order_id
          AND oi.product_id=v_product
          AND NULLIF(oi.metadata->>'variantId','') IS NOT DISTINCT FROM v_variant
        LIMIT 1;
      END IF;

      v_used_qty:=COALESCE((v_used->>v_item.id)::integer,0);
      IF v_used_qty+v_qty>v_item.quantity THEN
        RAISE EXCEPTION
          'RETURN_QUANTITY_EXCEEDS_ORDER: order line % purchased %, attempted return %',
          v_item.id,v_item.quantity,v_used_qty+v_qty;
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
          'RETURN_COST_SNAPSHOT_INCOMPLETE: order line % cannot be verified until its sale-time cost is exact',
          v_item.id;
      END IF;

      v_unit_cogs:=
        v_item.unit_cost_price+
        v_item.unit_packaging_cost+
        v_item.unit_insert_cost;
      v_total_cogs:=v_total_cogs+(v_unit_cogs*v_qty);

      v_canonical_items:=v_canonical_items || jsonb_build_array(
        jsonb_build_object(
          'orderItemId',v_item.id,
          'productId',v_item.product_id,
          'variantId',v_variant,
          'qty',v_qty,
          'priceAtPurchase',v_item.price_at_purchase,
          'cogsAtTime',v_unit_cogs
        )
      );
    END LOOP;

    NEW.affected_items:=v_canonical_items;

    -- One canonical inventory value: sale-time COGS. Never combine sale price
    -- write-off and COGS for the same units.
    NEW.product_write_off_amount:=0;
    IF NEW.restocked=true THEN
      NEW.cogs_loss:=0;
    ELSE
      NEW.cogs_loss:=v_total_cogs;
    END IF;
  END IF;

  RETURN NEW;
END
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
  v_inventory_loss numeric;
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

    v_inventory_loss:=
      CASE
        WHEN NEW.restocked=true OR NEW.type='rejected_delivery' THEN 0
        ELSE GREATEST(
          COALESCE(NEW.product_write_off_amount,0),
          COALESCE(NEW.cogs_loss,0)
        )
      END;

    SELECT COALESCE(SUM(
      COALESCE(NULLIF(elem->>'qty','')::numeric,0) *
      COALESCE(NULLIF(elem->>'cogsAtTime','')::numeric,0)
    ),0)
    INTO v_restock_cogs
    FROM jsonb_array_elements(COALESCE(NEW.affected_items,'[]'::jsonb)) elem
    WHERE NEW.restocked=true
      AND NEW.type<>'rejected_delivery';

    v_total:=
      COALESCE(NEW.refund_amount,0)+
      v_cash_loss+
      v_inventory_loss+
      v_restock_cogs;

    IF v_total=0 THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_fact
    FROM public.order_accounting_facts
    WHERE order_id=NEW.order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION
        'RETURN_JOURNAL_BLOCKED: monetary return requires accounting fact for order %',
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
      'إثبات مرتجع معتمد للطلب '||NEW.order_id,
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
          'عكس إيراد المبلغ المرتجع'
        );
      END IF;

      IF v_restock_cogs>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,debit,memo
        ) VALUES(
          v_entry_id,v_line,'1200',v_restock_cogs,
          'إعادة كلفة المنتجات الصالحة للبيع إلى المخزون'
        );
      END IF;

      IF v_cash_loss+v_inventory_loss>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,debit,memo
        ) VALUES(
          v_entry_id,v_line,'4200',v_cash_loss+v_inventory_loss,
          'خسائر المرتجع الفعلية'
        );
      END IF;

      IF COALESCE(NEW.refund_amount,0)>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,credit,memo
        ) VALUES(
          v_entry_id,v_line,v_refund_credit_account,NEW.refund_amount,
          'تسوية أو دفع مبلغ المرتجع'
        );
      END IF;

      IF v_cash_loss>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,credit,memo
        ) VALUES(
          v_entry_id,v_line,'1000',v_cash_loss,
          'كلف نقدية للمرتجع'
        );
      END IF;

      IF v_inventory_loss>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,credit,memo
        ) VALUES(
          v_entry_id,v_line,'1200',v_inventory_loss,
          'شطب كلفة مخزون غير صالح للبيع'
        );
      END IF;

      IF v_restock_cogs>0 THEN
        v_line:=v_line+1;
        INSERT INTO public.journal_lines(
          entry_id,line_number,account_code,credit,memo
        ) VALUES(
          v_entry_id,v_line,'4000',v_restock_cogs,
          'عكس كلفة البضاعة للمنتجات المعادة إلى المخزون'
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
        'عكس مرتجع معتمد: '||NEW.note,
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
END
$function$;

-- Keep the official Accounting V2 readiness report aligned with the journal:
-- a fulfillment snapshot is a restatement of an already-expensed cost, not a new
-- return loss.
DO $do$
DECLARE
  v_def text;
  v_old text:='COALESCE(r.packaging_loss, 0::numeric)';
  v_new text:='CASE WHEN COALESCE(r.packaging_loss_source, ''manual''::text) = ''manual''::text THEN COALESCE(r.packaging_loss, 0::numeric) ELSE 0::numeric END';
BEGIN
  SELECT pg_get_viewdef('public.v_accounting_period_readiness'::regclass,true)
  INTO v_def;

  IF position(v_new IN v_def)=0 THEN
    IF position(v_old IN v_def)=0 THEN
      RAISE EXCEPTION
        'ACCOUNTING_READINESS_VIEW_PATCH_FAILED: packaging loss expression not found';
    END IF;
    v_def:=replace(v_def,v_old,v_new);
    EXECUTE 'CREATE OR REPLACE VIEW public.v_accounting_period_readiness AS '||v_def;
  END IF;
END
$do$;

-- Per-order contribution is merchant cash after carrier fees, product COGS and
-- the confirmed original AQUAVO preparation cost.
DO $do$
DECLARE
  v_def text;
  v_old text:='f.product_revenue - f.cogs_amount - f.delivery_subsidy';
  v_new text:='f.merchant_net - f.cogs_amount - COALESCE((SELECT sum(e.actual_cost) FROM order_fulfillment_events e WHERE e.order_id = f.order_id AND e.event_type = ''original''::text AND e.workflow_state = ''confirmed''::text), 0::numeric)';
BEGIN
  SELECT pg_get_viewdef('public.v_order_accounting'::regclass,true)
  INTO v_def;

  IF position(v_new IN v_def)=0 THEN
    IF position(v_old IN v_def)=0 THEN
      RAISE EXCEPTION
        'ORDER_ACCOUNTING_VIEW_PATCH_FAILED: contribution expression not found';
    END IF;
    v_def:=replace(v_def,v_old,v_new);
    EXECUTE 'CREATE OR REPLACE VIEW public.v_order_accounting AS '||v_def;
  END IF;
END
$do$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0068_accounting_delivery_return_integrity',
  '58549df11bf33ed35f93ffd920f87883c926083aa2a5c42dde547710eae51cc3',
  'Fail closed on incomplete delivery accounting, canonicalize return COGS, restore sellable-return inventory value, and align Accounting V2 views'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
