-- 0083_production_test_order_isolation
-- Production is not a test environment. Synthetic/internal checkout rows are
-- quarantined with append-only reversals, then database guards make the same
-- failure mode impossible to repeat. No accounting evidence is deleted.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_context text,
  ADD COLUMN IF NOT EXISTS test_quarantined_at timestamptz;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_test_context_required_chk;
ALTER TABLE public.orders ADD CONSTRAINT orders_test_context_required_chk
  CHECK (NOT is_test OR NULLIF(btrim(test_context),'') IS NOT NULL) NOT VALID;

-- Public/application writes cannot create or disguise a test order in Production.
-- Tests belong on an isolated Neon branch. The migration-only GUC is used below
-- solely to classify already-existing historical rows.
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
       SELECT 1
       FROM public.users u
       WHERE u.id=NEW.user_id
         AND lower(COALESCE(u.role,''))='admin'
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

-- Defense in depth for already-quarantined rows: they cannot be re-run through
-- the order lifecycle or receive fresh order lines that would deduct stock.
CREATE OR REPLACE FUNCTION public.block_test_order_status_side_effects()
RETURNS trigger
LANGUAGE plpgsql
AS $status_guard$
BEGIN
  IF COALESCE(OLD.is_test,false)
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION
      'TEST_ORDER_STATUS_CHANGE_BLOCKED: quarantined Production test order % is immutable',
      OLD.id
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$status_guard$;

DROP TRIGGER IF EXISTS orders_01_block_test_status_side_effects ON public.orders;
CREATE TRIGGER orders_01_block_test_status_side_effects
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.block_test_order_status_side_effects();

CREATE OR REPLACE FUNCTION public.block_test_order_line_side_effects()
RETURNS trigger
LANGUAGE plpgsql
AS $line_guard$
BEGIN
  IF EXISTS(
    SELECT 1 FROM public.orders o
    WHERE o.id=NEW.order_id AND COALESCE(o.is_test,false)=true
  ) THEN
    RAISE EXCEPTION
      'TEST_ORDER_LINE_BLOCKED: quarantined Production test order % cannot receive order lines',
      NEW.order_id
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$line_guard$;

DROP TRIGGER IF EXISTS order_items_00_block_test_side_effects ON public.order_items_relational;
CREATE TRIGGER order_items_00_block_test_side_effects
BEFORE INSERT OR UPDATE ON public.order_items_relational
FOR EACH ROW EXECUTE FUNCTION public.block_test_order_line_side_effects();

-- Classify every currently-known internal/synthetic test. This is deliberately
-- evidence-based: explicit WATEST marker, explicit test source, System Admin,
-- or an authenticated admin account used as a storefront customer.
SELECT set_config('aquavo.allow_test_order_write','on',true);

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
      SELECT 1
      FROM public.users u
      WHERE u.id=o.user_id
        AND lower(COALESCE(u.role,''))='admin'
    )
  );

ALTER TABLE public.orders VALIDATE CONSTRAINT orders_test_context_required_chk;

-- Synthetic payment capture/COD is neutralized by a reversing event. The
-- original immutable event remains available for audit.
INSERT INTO public.payment_events(
  order_id,event_type,status,amount,currency,method,provider,idempotency_key,
  occurred_at,evidence,metadata,created_by,reverses_event_id
)
SELECT
  pe.order_id,'refund','completed',pe.amount,pe.currency,pe.method,pe.provider,
  'test_quarantine:'||pe.order_id||':payment_refund',clock_timestamp(),
  jsonb_build_object(
    'source','production_test_quarantine',
    'original_payment_event_id',pe.id
  ),
  jsonb_build_object(
    'test_quarantine',true,
    'reason','synthetic/internal test order must not affect production accounting'
  ),
  'system:integrity_repair',pe.id
FROM public.payment_events pe
JOIN public.orders o ON o.id=pe.order_id
WHERE o.is_test=true
  AND pe.status='completed'
  AND pe.event_type IN ('cod_received','capture')
  AND NOT EXISTS(
    SELECT 1
    FROM public.payment_events r
    WHERE r.reverses_event_id=pe.id
      AND r.status='completed'
      AND r.event_type IN ('refund','chargeback')
  )
ON CONFLICT(idempotency_key) DO NOTHING;

-- Reverse every posted order journal exactly once. Original journals/lines are
-- immutable and are never edited or deleted.
DO $do$
DECLARE
  r record;
  v_entry text;
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
      clock_timestamp(),
      to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM'),
      'test_order_quarantine',r.id,'journal_reversal',
      'عكس أثر طلب اختبار داخلي: '||r.description,
      r.total_debit,r.total_credit,r.id,
      jsonb_build_object(
        'test_order_id',r.source_id,
        'original_entry_id',r.id,
        'reason','synthetic/internal test order quarantine'
      ),
      'system:integrity_repair'
    )
    ON CONFLICT(source_type,source_id,event_kind) DO NOTHING
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

-- Product inventory is neutralized by ORDER-LEVEL net quantity, not by relying
-- on order_item_id metadata. This is essential because legacy test reversals did
-- not always carry an order_item_id. A historical order that is already net zero
-- therefore remains untouched instead of being restored twice.
DO $do$
DECLARE
  r record;
  v_location text;
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
        r.product_id,r.variant_id,v_location,-r.net_qty,
        'sale_reversal','test_order_quarantine',r.order_id,
        'test_quarantine:'||r.order_id||':'||r.product_id||':'||COALESCE(r.variant_id,'MAIN'),
        r.unit_cost,'IQD',clock_timestamp(),'system:integrity_repair',
        jsonb_build_object(
          'order_id',r.order_id,
          'product_id',r.product_id,
          'variant_id',r.variant_id,
          'test_quarantine',true,
          'net_quantity_before_reversal',r.net_qty
        )
      )
      ON CONFLICT(idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
END
$do$;

-- Preparation-material consumption is also append-only; reverse exact original
-- movements one-for-one. line_id is intentionally NULL so the unique usage-line
-- index remains attached only to the original consumption row.
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
    SELECT 1
    FROM public.packaging_inventory_movements r
    WHERE r.reversal_of_movement_id=p.id
  )
ON CONFLICT(idempotency_key) DO NOTHING;

-- Unsent customer messaging is cancelled; already-sent evidence is retained but
-- marked as test-quarantined so operational analytics can exclude it.
UPDATE public.customer_message_jobs j
SET status=CASE WHEN j.status='pending' THEN 'cancelled' ELSE j.status END,
    cancelled_at=CASE
      WHEN j.status='pending' THEN COALESCE(j.cancelled_at,clock_timestamp())
      ELSE j.cancelled_at
    END,
    locked_at=CASE WHEN j.status='pending' THEN NULL ELSE j.locked_at END,
    metadata=COALESCE(j.metadata,'{}'::jsonb)||jsonb_build_object(
      'test_quarantined',true,
      'test_quarantined_at',clock_timestamp()
    ),
    updated_at=clock_timestamp(),
    last_error_code=CASE
      WHEN j.status='pending' THEN 'TEST_ORDER_QUARANTINED'
      ELSE j.last_error_code
    END
FROM public.orders o
WHERE j.order_id=o.id AND o.is_test=true;

-- Operational order accounting excludes first-class test rows while leaving the
-- immutable original facts available for forensic audit.
CREATE OR REPLACE VIEW public.v_order_accounting AS
SELECT
  f.order_id,o.order_number,o.source,o.status,o.payment_status,o.cod_received,
  f.recognized_at,f.period_key,f.gross_collected,f.customer_delivery_fee,
  f.carrier_fee,f.product_revenue,f.merchant_net,f.delivery_subsidy,
  f.delivery_surplus,f.cash_custody,f.cogs_amount,f.cost_status,
  CASE
    WHEN f.cogs_amount IS NULL THEN NULL::numeric
    ELSE f.product_revenue-f.cogs_amount-f.delivery_subsidy-
      COALESCE(
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
  now() AS checked_at,
  s.inventory_ledger_mode,s.payment_ledger_enabled,s.snapshot_writer_enabled,
  l.total_lines,l.sale_snapshot_lines,l.exact_cost_lines,l.realized_lines,
  l.realized_exact_cost_lines,l.realized_sale_snapshot_lines,
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
FROM line_stats l
CROSS JOIN product_stats p
CROSS JOIN settings_state s;

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
    SELECT 1
    FROM public.accounting_audit_trail a
    WHERE a.entity_type='order'
      AND a.entity_id=o.id
      AND a.action='quarantine'
      AND a.field_name='is_test'
  );

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0083_production_test_order_isolation',
  '00830083008300830083008300830083008300830083008300830083008300aa',
  'Fail-closed Production test isolation; quarantine known internal tests and reverse immutable payment/journal/product-stock/material effects without deleting evidence'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;
