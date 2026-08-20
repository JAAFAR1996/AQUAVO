-- 0083_production_test_order_isolation
-- Test/synthetic checkout must never change Production revenue, stock, fulfillment
-- materials, customer messaging, or accounting. Existing internal tests are
-- quarantined by append-only reversals; no accounting evidence is deleted.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_context text,
  ADD COLUMN IF NOT EXISTS test_quarantined_at timestamptz;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_test_context_required_chk;
ALTER TABLE public.orders ADD CONSTRAINT orders_test_context_required_chk
  CHECK (NOT is_test OR NULLIF(btrim(test_context),'') IS NOT NULL) NOT VALID;

CREATE OR REPLACE FUNCTION public.guard_production_test_orders()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
BEGIN
  IF current_setting('aquavo.allow_test_order_write',true)='on' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_test,false)
     OR upper(COALESCE(NEW.order_number,'')) LIKE '%WATEST%'
     OR upper(COALESCE(NEW.order_number,'')) LIKE 'TEST-%'
     OR lower(btrim(COALESCE(NEW.source,''))) IN ('test','synthetic','accounting_test','sandbox')
     OR lower(btrim(COALESCE(NEW.customer_name,'')))='system admin'
     OR EXISTS(
       SELECT 1 FROM public.users u
       WHERE u.id=NEW.user_id AND lower(COALESCE(u.role,''))='admin'
     )
  THEN
    RAISE EXCEPTION
      'PRODUCTION_TEST_ORDER_BLOCKED: use an isolated Neon branch for checkout/order tests'
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END
$guard$;

DROP TRIGGER IF EXISTS orders_00_guard_production_tests ON public.orders;
CREATE TRIGGER orders_00_guard_production_tests
BEFORE INSERT OR UPDATE OF is_test,order_number,source,user_id,customer_name
ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_production_test_orders();

-- Defense in depth: a deliberately flagged row can never create a product-stock sale.
CREATE OR REPLACE FUNCTION public.record_order_item_inventory_sale()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  mode text;
  main_location text;
  line_variant text;
  v_guc_batch_txt text;
  v_row_batch_txt text;
  v_guc_batch uuid;
  v_eligible boolean:=false;
  v_is_test boolean:=false;
BEGIN
  SELECT COALESCE(o.is_test,false)
    INTO v_is_test
  FROM public.orders o
  WHERE o.id=NEW.order_id;

  IF COALESCE(v_is_test,false) THEN
    RETURN NEW;
  END IF;

  SELECT value INTO mode FROM public.settings WHERE key='inventory_ledger_mode';
  IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF;

  v_guc_batch_txt:=NULLIF(btrim(current_setting('aquavo.backfill_batch_id',true)),'');
  v_row_batch_txt:=NULLIF(btrim(NEW.metadata->'backfill'->>'batch_id'),'');

  IF v_guc_batch_txt IS NOT NULL
     AND v_row_batch_txt IS NOT NULL
     AND v_guc_batch_txt=v_row_batch_txt THEN
    BEGIN
      v_guc_batch:=v_guc_batch_txt::uuid;
    EXCEPTION WHEN others THEN
      v_guc_batch:=NULL;
    END;

    IF v_guc_batch IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public.orderitem_backfill_batches
        WHERE batch_id=v_guc_batch
          AND source='orders.items'
          AND migration='backfill_orderitems_from_jsonb.sql'
          AND finished_at IS NULL
          AND rolled_back_at IS NULL
      ) INTO v_eligible;
    END IF;

    IF v_eligible THEN
      INSERT INTO public.orderitem_trigger_safety_audit
        (event_type,batch_id,order_item_id,order_id,detail)
      VALUES(
        'inventory_sale_suppressed',v_guc_batch,NEW.id,NEW.order_id,
        jsonb_build_object('product_id',NEW.product_id,'quantity',NEW.quantity)
      );
      RETURN NEW;
    END IF;
  END IF;

  SELECT id INTO main_location
  FROM public.inventory_locations
  WHERE code='MAIN' AND is_active=true
  LIMIT 1;

  IF main_location IS NULL THEN
    RAISE EXCEPTION 'MAIN inventory location is not configured';
  END IF;

  line_variant:=NULLIF(NEW.metadata->>'variantId','');

  INSERT INTO public.inventory_movements(
    product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
    source_id,idempotency_key,currency,happened_at,created_by,metadata
  ) VALUES(
    NEW.product_id,line_variant,main_location,-NEW.quantity,'sale','order_line',
    NEW.order_id,'order_item:'||NEW.id,'IQD',now(),'database_trigger',
    jsonb_build_object('order_id',NEW.order_id,'order_item_id',NEW.id)
  ) ON CONFLICT(idempotency_key) DO NOTHING;

  RETURN NEW;
END
$function$;

-- Defense in depth: flagged tests cannot create COD/accounting facts or journals.
CREATE OR REPLACE FUNCTION public.record_order_delivery_accounting()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_cutover timestamptz;v_recognized_at timestamptz;v_period_key text;
  v_gross numeric;v_customer_fee numeric;v_carrier_fee numeric;
  v_product_revenue numeric;v_rounding numeric;v_merchant_net numeric;
  v_delivery_subsidy numeric;v_delivery_surplus numeric;v_event_id text;
  v_fact_id text;v_cogs numeric;v_line_count bigint;v_bad_cost_count bigint;
  v_cost_status text;
BEGIN
  IF COALESCE(NEW.is_test,false) THEN RETURN NEW; END IF;
  IF lower(COALESCE(NEW.status,''))<>'delivered'
     OR lower(COALESCE(OLD.status,''))='delivered' THEN RETURN NEW; END IF;

  v_cutover:=public.aquavo_active_cutover();
  v_recognized_at:=COALESCE(NEW.delivered_at,clock_timestamp());
  IF v_recognized_at<v_cutover THEN RETURN NEW; END IF;

  v_gross:=COALESCE(NEW.rounded_total,NEW.total,0);
  v_customer_fee:=COALESCE(NEW.shipping_cost,0);
  v_carrier_fee:=COALESCE(NEW.carrier_fee,v_customer_fee,0);

  SELECT
    COALESCE(SUM(COALESCE(final_unit_sale_price_snapshot,price_at_purchase)*quantity),0),
    COUNT(*),
    COUNT(*) FILTER(
      WHERE cost_snapshot_status IS NULL
         OR cost_snapshot_status NOT IN ('exact','verified_zero')
         OR unit_cost_price IS NULL
         OR unit_packaging_cost IS NULL
         OR unit_insert_cost IS NULL
    ),
    SUM((COALESCE(unit_cost_price,0)+COALESCE(unit_packaging_cost,0)+COALESCE(unit_insert_cost,0))*quantity)
  INTO v_product_revenue,v_line_count,v_bad_cost_count,v_cogs
  FROM public.order_items_relational
  WHERE order_id=NEW.id;

  IF v_line_count=0 THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: no relational order items for %',NEW.id;
  END IF;

  v_rounding:=(v_gross-v_customer_fee)-v_product_revenue;
  v_merchant_net:=v_gross-v_carrier_fee;
  v_delivery_subsidy:=GREATEST(v_carrier_fee-v_customer_fee,0);
  v_delivery_surplus:=GREATEST(v_customer_fee-v_carrier_fee,0);
  v_period_key:=to_char(v_recognized_at AT TIME ZONE 'Asia/Baghdad','YYYY-MM');

  IF v_product_revenue<0 OR v_merchant_net<0 THEN
    RAISE EXCEPTION 'ORDER_ACCOUNTING_INVALID: negative revenue/net for order %',NEW.id;
  END IF;

  INSERT INTO public.payment_events(
    order_id,event_type,status,amount,currency,method,provider,idempotency_key,
    occurred_at,evidence,metadata,created_by
  ) VALUES(
    NEW.id,'cod_received','completed',v_gross,'IQD','cod',COALESCE(NEW.carrier,'carrier'),
    'delivery:'||NEW.id||':cod_received',v_recognized_at,
    jsonb_build_object('source','order_delivery_transition','delivered_at',v_recognized_at),
    jsonb_build_object(
      'gross_collected',v_gross,'customer_delivery_fee',v_customer_fee,
      'carrier_fee',v_carrier_fee,'product_revenue',v_product_revenue,
      'rounding_adjustment',v_rounding,'merchant_net',v_merchant_net,
      'delivery_subsidy',v_delivery_subsidy,'delivery_surplus',v_delivery_surplus,
      'policy_version','v3_explicit_rounding_carrier_snapshot'
    ),'database_trigger'
  ) ON CONFLICT(idempotency_key) DO NOTHING;

  SELECT id INTO v_event_id
  FROM public.payment_events
  WHERE idempotency_key='delivery:'||NEW.id||':cod_received'
    AND status='completed' AND amount=v_gross;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'COD_EVENT_MISSING_OR_MISMATCH for delivered order %',NEW.id;
  END IF;

  IF v_bad_cost_count>0 THEN v_cost_status:='incomplete';v_cogs:=NULL;
  ELSIF v_cogs=0 THEN v_cost_status:='verified_zero';
  ELSE v_cost_status:='exact';
  END IF;

  INSERT INTO public.order_accounting_facts(
    order_id,payment_event_id,recognized_at,period_key,gross_collected,
    customer_delivery_fee,carrier_fee,product_revenue,rounding_adjustment,
    merchant_net,delivery_subsidy,delivery_surplus,cash_custody,cogs_amount,
    cost_status,currency,policy_version,carrier_snapshot,evidence
  ) VALUES(
    NEW.id,v_event_id,v_recognized_at,v_period_key,v_gross,v_customer_fee,
    v_carrier_fee,v_product_revenue,v_rounding,v_merchant_net,
    v_delivery_subsidy,v_delivery_surplus,'carrier',v_cogs,v_cost_status,'IQD',
    'v3_explicit_rounding_carrier_snapshot',NEW.carrier,
    jsonb_build_object(
      'created_by','database_trigger','order_number',NEW.order_number,
      'delivered_at',v_recognized_at,'order_total_source',
      CASE WHEN NEW.rounded_total IS NOT NULL THEN 'rounded_total' ELSE 'total' END
    )
  ) ON CONFLICT(order_id) DO NOTHING
  RETURNING id INTO v_fact_id;

  IF v_fact_id IS NULL THEN
    SELECT id INTO v_fact_id FROM public.order_accounting_facts WHERE order_id=NEW.id;
  END IF;

  PERFORM public.post_order_delivery_journal(v_fact_id);
  PERFORM public.post_order_cogs_journal(v_fact_id);
  PERFORM public.post_order_fulfillment_journal(NEW.id);
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.aquavo_enqueue_post_delivery_messages()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF COALESCE(NEW.is_test,false) THEN RETURN NEW; END IF;

  IF NEW.status='delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    INSERT INTO public.customer_message_jobs(order_id,job_type,due_at,metadata)
    VALUES(
      NEW.id,'delivery_care',clock_timestamp(),
      jsonb_build_object(
        'source','order_status_transition','from_status',OLD.status,
        'to_status',NEW.status,'phase','delivery_care_only'
      )
    ) ON CONFLICT(order_id,job_type) DO NOTHING;
  END IF;

  IF OLD.status='delivered'
     AND NEW.status IS DISTINCT FROM 'delivered'
     AND NEW.status IN ('cancelled','rejected','rejected_returned','rejected_carrier','returned') THEN
    UPDATE public.customer_message_jobs
    SET status='cancelled',cancelled_at=clock_timestamp(),locked_at=NULL,
        updated_at=clock_timestamp(),last_error_code='ORDER_NO_LONGER_DELIVERED'
    WHERE order_id=NEW.id
      AND job_type IN ('delivery_care','review_request','review_reminder')
      AND status='pending';
  END IF;

  RETURN NEW;
END
$function$;

-- Quarantine every existing row carrying hard evidence of an internal test.
PERFORM set_config('aquavo.allow_test_order_write','on',true);

UPDATE public.orders o
SET is_test=true,
    test_context=CASE
      WHEN upper(COALESCE(o.order_number,'')) LIKE '%WATEST%'
        THEN 'whatsapp_delivery_care_integration_test'
      WHEN lower(btrim(COALESCE(o.source,''))) IN ('test','synthetic','accounting_test','sandbox')
        THEN 'historical_accounting_test'
      ELSE 'admin_internal_checkout_test'
    END,
    test_quarantined_at=COALESCE(o.test_quarantined_at,clock_timestamp()),
    archived_at=COALESCE(o.archived_at,clock_timestamp()),
    updated_at=clock_timestamp()
WHERE COALESCE(o.is_test,false)=false
  AND (
    upper(COALESCE(o.order_number,'')) LIKE '%WATEST%'
    OR lower(btrim(COALESCE(o.source,''))) IN ('test','synthetic','accounting_test','sandbox')
    OR lower(btrim(COALESCE(o.customer_name,'')))='system admin'
    OR EXISTS(
      SELECT 1 FROM public.users u
      WHERE u.id=o.user_id AND lower(COALESCE(u.role,''))='admin'
    )
  );

ALTER TABLE public.orders VALIDATE CONSTRAINT orders_test_context_required_chk;

-- Reverse synthetic payment evidence without mutating the original event.
INSERT INTO public.payment_events(
  order_id,event_type,status,amount,currency,method,provider,idempotency_key,
  occurred_at,evidence,metadata,created_by,reverses_event_id
)
SELECT
  pe.order_id,'refund','completed',pe.amount,pe.currency,pe.method,pe.provider,
  'test_quarantine:'||pe.order_id||':payment_refund',clock_timestamp(),
  jsonb_build_object('source','production_test_quarantine','original_payment_event_id',pe.id),
  jsonb_build_object('test_quarantine',true,'reason','synthetic/internal test order must not affect production accounting'),
  'system:integrity_repair',pe.id
FROM public.payment_events pe
JOIN public.orders o ON o.id=pe.order_id
WHERE o.is_test=true
  AND pe.status='completed'
  AND pe.event_type IN ('cod_received','capture')
  AND NOT EXISTS(
    SELECT 1 FROM public.payment_events r
    WHERE r.reverses_event_id=pe.id
      AND r.status='completed'
      AND r.event_type IN ('refund','chargeback')
  )
ON CONFLICT(idempotency_key) DO NOTHING;

-- Reverse every posted order journal exactly once.
DO $do$
DECLARE r record;v_entry text;
BEGIN
  FOR r IN
    SELECT je.*
    FROM public.journal_entries je
    JOIN public.orders o ON o.id=je.source_id
    WHERE o.is_test=true
      AND je.source_type='order'
      AND NOT EXISTS(
        SELECT 1 FROM public.journal_entries x
        WHERE x.reversal_of_entry_id=je.id
      )
    ORDER BY je.entry_number
  LOOP
    v_entry:=NULL;
    INSERT INTO public.journal_entries(
      entry_date,period_key,source_type,source_id,event_kind,description,
      total_debit,total_credit,reversal_of_entry_id,evidence,created_by
    ) VALUES(
      clock_timestamp(),to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),
      'test_order_quarantine',r.id,'journal_reversal',
      'عكس أثر طلب اختبار داخلي: '||r.description,r.total_debit,r.total_credit,r.id,
      jsonb_build_object(
        'test_order_id',r.source_id,'original_entry_id',r.id,
        'reason','synthetic/internal test order quarantine'
      ),'system:integrity_repair'
    ) ON CONFLICT(source_type,source_id,event_kind) DO NOTHING
    RETURNING id INTO v_entry;

    IF v_entry IS NOT NULL THEN
      INSERT INTO public.journal_lines(
        entry_id,line_number,account_code,debit,credit,memo,dimensions
      )
      SELECT
        v_entry,jl.line_number,jl.account_code,jl.credit,jl.debit,
        'عكس طلب اختبار: '||COALESCE(jl.memo,''),jl.dimensions
      FROM public.journal_lines jl
      WHERE jl.entry_id=r.id
      ORDER BY jl.line_number;
      PERFORM public.validate_journal_entry(v_entry);
    END IF;
  END LOOP;
END
$do$;

-- Product-stock reversal is based on the NET order/product/variant movement.
-- This deliberately sees historical reversals even when old rows lack order_item_id.
DO $do$
DECLARE r record;v_location text;
BEGIN
  SELECT id INTO v_location
  FROM public.inventory_locations
  WHERE code='MAIN' AND is_active=true
  LIMIT 1;

  IF v_location IS NULL THEN
    RAISE EXCEPTION 'MAIN inventory location is not configured';
  END IF;

  FOR r IN
    SELECT
      o.id AS order_id,
      im.product_id,
      im.variant_id,
      SUM(im.quantity_delta)::numeric AS net_qty,
      MAX(oi.unit_cost_price)::numeric AS unit_cost
    FROM public.orders o
    JOIN public.inventory_movements im
      ON im.location_id=v_location
     AND (im.source_id=o.id OR im.metadata->>'order_id'=o.id)
    LEFT JOIN public.order_items_relational oi
      ON oi.order_id=o.id
     AND oi.product_id=im.product_id
     AND NULLIF(COALESCE(oi.metadata->>'variantId',oi.metadata->>'variant_id'),'')
         IS NOT DISTINCT FROM im.variant_id
    WHERE o.is_test=true
    GROUP BY o.id,im.product_id,im.variant_id
  LOOP
    IF r.net_qty>0 THEN
      RAISE EXCEPTION
        'TEST_QUARANTINE_INVENTORY_OVERRESTORED: order=% product=% variant=% net=%',
        r.order_id,r.product_id,COALESCE(r.variant_id,'MAIN'),r.net_qty;
    END IF;

    IF r.net_qty<0 THEN
      INSERT INTO public.inventory_movements(
        product_id,variant_id,location_id,quantity_delta,movement_type,source_type,
        source_id,idempotency_key,unit_cost,currency,happened_at,created_by,metadata
      ) VALUES(
        r.product_id,r.variant_id,v_location,-r.net_qty,'sale_reversal',
        'test_order_quarantine',r.order_id,
        'test_quarantine:'||r.order_id||':'||r.product_id||':'||COALESCE(r.variant_id,'MAIN'),
        r.unit_cost,'IQD',clock_timestamp(),'system:integrity_repair',
        jsonb_build_object(
          'order_id',r.order_id,'product_id',r.product_id,'variant_id',r.variant_id,
          'test_quarantine',true,'net_quantity_before_reversal',r.net_qty
        )
      ) ON CONFLICT(idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
END
$do$;

-- Return consumed preparation materials by immutable reversal rows.
INSERT INTO public.packaging_inventory_movements(
  material_id,purchase_id,movement_type,quantity,order_id,event_id,idempotency_key,
  source_document,reversal_of_movement_id,recorded_by,line_id
)
SELECT
  p.material_id,p.purchase_id,'reversal',-p.quantity,p.order_id,p.event_id,
  'test_quarantine:packaging:'||p.id,'production_test_quarantine',p.id,
  'system:integrity_repair',NULL
FROM public.packaging_inventory_movements p
JOIN public.orders o ON o.id=p.order_id
WHERE o.is_test=true
  AND p.movement_type='fulfillment_usage'
  AND NOT EXISTS(
    SELECT 1 FROM public.packaging_inventory_movements r
    WHERE r.reversal_of_movement_id=p.id
  )
ON CONFLICT(idempotency_key) DO NOTHING;

UPDATE public.customer_message_jobs j
SET status=CASE WHEN j.status='pending' THEN 'cancelled' ELSE j.status END,
    cancelled_at=CASE
      WHEN j.status='pending' THEN COALESCE(j.cancelled_at,clock_timestamp())
      ELSE j.cancelled_at
    END,
    locked_at=CASE WHEN j.status='pending' THEN NULL ELSE j.locked_at END,
    metadata=COALESCE(j.metadata,'{}'::jsonb)||jsonb_build_object(
      'test_quarantined',true,'test_quarantined_at',clock_timestamp()
    ),
    updated_at=clock_timestamp(),
    last_error_code=CASE
      WHEN j.status='pending' THEN 'TEST_ORDER_QUARANTINED'
      ELSE j.last_error_code
    END
FROM public.orders o
WHERE j.order_id=o.id AND o.is_test=true;

CREATE OR REPLACE VIEW public.v_order_accounting AS
SELECT
  f.order_id,o.order_number,o.source,o.status,o.payment_status,o.cod_received,
  f.recognized_at,f.period_key,f.gross_collected,f.customer_delivery_fee,
  f.carrier_fee,f.product_revenue,f.merchant_net,f.delivery_subsidy,
  f.delivery_surplus,f.cash_custody,f.cogs_amount,f.cost_status,
  CASE
    WHEN f.cogs_amount IS NULL THEN NULL::numeric
    ELSE f.product_revenue+COALESCE(f.rounding_adjustment,0)-f.cogs_amount-
      f.delivery_subsidy-COALESCE(
        (
          SELECT SUM(e.actual_cost)
          FROM public.order_fulfillment_events e
          WHERE e.order_id=f.order_id
            AND e.event_type='original'
            AND e.workflow_state='confirmed'
        ),
        CASE WHEN COALESCE(o.box_cost,0)>0 THEN o.box_cost ELSE 0 END
      )
  END AS contribution_profit,
  CASE WHEN s.id IS NULL THEN 'unsettled' ELSE s.status END AS settlement_status,
  s.settlement_id,f.policy_version
FROM public.order_accounting_facts f
JOIN public.orders o ON o.id=f.order_id
LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id
WHERE COALESCE(o.is_test,false)=false;

CREATE OR REPLACE VIEW public.accounting_readiness_status AS
WITH line_stats AS (
  SELECT
    count(*) AS total_lines,
    count(*) FILTER(
      WHERE oi.unit_sale_price_snapshot IS NOT NULL
        AND oi.discount_snapshot IS NOT NULL
        AND oi.final_unit_sale_price_snapshot IS NOT NULL
        AND oi.sale_price_snapshot_at IS NOT NULL
        AND oi.sale_price_source IS NOT NULL
    ) AS sale_snapshot_lines,
    count(*) FILTER(WHERE oi.cost_snapshot_status='exact') AS exact_cost_lines,
    count(*) FILTER(
      WHERE o.status='delivered' AND o.financially_counted IS TRUE
    ) AS realized_lines,
    count(*) FILTER(
      WHERE o.status='delivered' AND o.financially_counted IS TRUE
        AND oi.cost_snapshot_status='exact'
    ) AS realized_exact_cost_lines,
    count(*) FILTER(
      WHERE o.status='delivered' AND o.financially_counted IS TRUE
        AND oi.unit_sale_price_snapshot IS NOT NULL
        AND oi.discount_snapshot IS NOT NULL
        AND oi.final_unit_sale_price_snapshot IS NOT NULL
        AND oi.sale_price_snapshot_at IS NOT NULL
        AND oi.sale_price_source IS NOT NULL
    ) AS realized_sale_snapshot_lines
  FROM public.order_items_relational oi
  JOIN public.orders o ON o.id=oi.order_id
  WHERE COALESCE(o.is_test,false)=false
), product_stats AS (
  SELECT
    count(*) AS active_products,
    count(*) FILTER(WHERE products.cost_price_resolution IN ('known','verified_zero')) AS product_cost_resolved,
    count(*) FILTER(WHERE products.packaging_cost_resolution IN ('known','verified_zero')) AS packaging_cost_resolved,
    count(*) FILTER(WHERE products.insert_cost_resolution IN ('known','verified_zero')) AS insert_cost_resolved
  FROM public.products
  WHERE products.deleted_at IS NULL
), settings_state AS (
  SELECT
    max(settings.value) FILTER(WHERE settings.key='inventory_ledger_mode') AS inventory_ledger_mode,
    max(settings.value) FILTER(WHERE settings.key='payment_ledger_enabled') AS payment_ledger_enabled,
    max(settings.value) FILTER(WHERE settings.key='financial_snapshot_writer_enabled') AS snapshot_writer_enabled
  FROM public.settings
)
SELECT
  now() AS checked_at,s.inventory_ledger_mode,s.payment_ledger_enabled,
  s.snapshot_writer_enabled,l.total_lines,l.sale_snapshot_lines,l.exact_cost_lines,
  l.realized_lines,l.realized_exact_cost_lines,l.realized_sale_snapshot_lines,
  p.active_products,p.product_cost_resolved,p.packaging_cost_resolved,p.insert_cost_resolved,
  s.inventory_ledger_mode='enforce'
    AND s.payment_ledger_enabled='true'
    AND s.snapshot_writer_enabled='true' AS operational_accounting_ready,
  l.realized_lines>0
    AND l.realized_exact_cost_lines=l.realized_lines
    AND l.realized_sale_snapshot_lines=l.realized_lines
    AND p.packaging_cost_resolved=p.active_products
    AND p.insert_cost_resolved=p.active_products AS tax_report_ready,
  CASE
    WHEN l.realized_exact_cost_lines<>l.realized_lines
      THEN 'historical_realized_lines_lack_exact_cost_snapshots'
    WHEN l.realized_sale_snapshot_lines<>l.realized_lines
      THEN 'historical_realized_lines_lack_sale_price_snapshots'
    WHEN p.packaging_cost_resolved<>p.active_products
      THEN 'packaging_cost_evidence_incomplete'
    WHEN p.insert_cost_resolved<>p.active_products
      THEN 'insert_cost_evidence_incomplete'
    ELSE NULL
  END AS primary_tax_blocker
FROM line_stats l CROSS JOIN product_stats p CROSS JOIN settings_state s;

INSERT INTO public.accounting_audit_trail(
  entity_type,entity_id,action,field_name,old_value_json,new_value_json,
  reason,performed_by,performed_by_name
)
SELECT
  'order',o.id,'quarantine','is_test','false'::jsonb,'true'::jsonb,
  'عزل طلب اختبار داخلي من محاسبة ومخزون الإنتاج مع إبقاء الأدلة وعكس آثارها',
  'system:integrity_repair','AQUAVO integrity repair'
FROM public.orders o
WHERE o.is_test=true
  AND NOT EXISTS(
    SELECT 1 FROM public.accounting_audit_trail a
    WHERE a.entity_type='order'
      AND a.entity_id=o.id
      AND a.action='quarantine'
      AND a.field_name='is_test'
  );

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0083_production_test_order_isolation',
  '00830083008300830083008300830083008300830083008300830083008300aa',
  'First-class production test isolation; quarantine known internal tests and reverse immutable payment/journal/product-stock/material effects without deleting evidence'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,notes=EXCLUDED.notes,rolled_back_at=NULL,applied_at=now();

COMMIT;
