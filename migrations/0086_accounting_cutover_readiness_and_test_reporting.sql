-- 0086_accounting_cutover_readiness_and_test_reporting
-- Reporting after the declared accounting cutover must use real Production
-- orders only. Legacy pre-cutover snapshot gaps remain explicitly visible, but
-- they do not make the authoritative post-cutover ledger permanently unready.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM public.schema_migrations
    WHERE version='0083_production_test_order_isolation'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0086_REQUIRES_ACTIVE_0083_TEST_ORDER_ISOLATION';
  END IF;
END
$guard$;

CREATE OR REPLACE VIEW public.accounting_readiness_status AS
WITH cutover AS (
  SELECT cutover_at
  FROM public.accounting_cutovers
  WHERE status='active'
  ORDER BY cutover_at DESC
  LIMIT 1
), real_facts AS (
  SELECT f.*
  FROM public.order_accounting_facts f
  JOIN public.orders o ON o.id=f.order_id
  CROSS JOIN cutover c
  WHERE COALESCE(o.is_test,false)=false
    AND f.recognized_at>=c.cutover_at
), line_stats AS (
  SELECT
    COUNT(*) AS total_lines,
    COUNT(*) FILTER(
      WHERE oi.final_unit_sale_price_snapshot IS NOT NULL
        AND oi.sale_price_snapshot_at IS NOT NULL
        AND oi.sale_price_source IS NOT NULL
    ) AS sale_snapshot_lines,
    COUNT(*) FILTER(
      WHERE oi.cost_snapshot_status IN ('exact','verified_zero')
        AND oi.unit_cost_price IS NOT NULL
        AND oi.unit_packaging_cost IS NOT NULL
        AND oi.unit_insert_cost IS NOT NULL
    ) AS exact_cost_lines,
    COUNT(*) AS realized_lines,
    COUNT(*) FILTER(
      WHERE oi.cost_snapshot_status IN ('exact','verified_zero')
        AND oi.unit_cost_price IS NOT NULL
        AND oi.unit_packaging_cost IS NOT NULL
        AND oi.unit_insert_cost IS NOT NULL
    ) AS realized_exact_cost_lines,
    COUNT(*) FILTER(
      WHERE oi.final_unit_sale_price_snapshot IS NOT NULL
        AND oi.sale_price_snapshot_at IS NOT NULL
        AND oi.sale_price_source IS NOT NULL
    ) AS realized_sale_snapshot_lines
  FROM public.order_items_relational oi
  JOIN real_facts f ON f.order_id=oi.order_id
), product_stats AS (
  SELECT
    COUNT(*) AS active_products,
    COUNT(*) FILTER(
      WHERE cost_price_resolution IN ('known','verified_zero')
    ) AS product_cost_resolved,
    COUNT(*) FILTER(
      WHERE packaging_cost_resolution IN ('known','verified_zero')
    ) AS packaging_cost_resolved,
    COUNT(*) FILTER(
      WHERE insert_cost_resolution IN ('known','verified_zero')
    ) AS insert_cost_resolved
  FROM public.products
  WHERE deleted_at IS NULL
), settings_state AS (
  SELECT
    MAX(value) FILTER(WHERE key='inventory_ledger_mode') AS inventory_ledger_mode,
    MAX(value) FILTER(WHERE key='payment_ledger_enabled') AS payment_ledger_enabled,
    MAX(value) FILTER(WHERE key='financial_snapshot_writer_enabled') AS snapshot_writer_enabled
  FROM public.settings
), historical AS (
  SELECT
    COUNT(*) FILTER(
      WHERE oi.cost_snapshot_status IS NULL
         OR oi.cost_snapshot_status NOT IN ('exact','verified_zero')
         OR oi.unit_cost_price IS NULL
         OR oi.unit_packaging_cost IS NULL
         OR oi.unit_insert_cost IS NULL
    ) AS legacy_realized_lines_without_exact_cost
  FROM public.order_items_relational oi
  JOIN public.orders o ON o.id=oi.order_id
  CROSS JOIN cutover c
  WHERE COALESCE(o.is_test,false)=false
    AND o.status='delivered'
    AND o.created_at<c.cutover_at
), current_returns AS (
  SELECT COUNT(*) AS n
  FROM public.order_return_events r
  JOIN public.orders o ON o.id=r.order_id
  CROSS JOIN cutover c
  WHERE COALESCE(o.is_test,false)=false
    AND r.updated_at>=c.cutover_at
    AND r.status='recorded'
), current_unsettled AS (
  SELECT COUNT(*) AS n
  FROM real_facts f
  WHERE f.cash_custody='carrier'
    AND NOT EXISTS(
      SELECT 1
      FROM public.order_accounting_settlements s
      WHERE s.order_fact_id=f.id
        AND s.status='matched'
    )
), review_flags AS (
  SELECT COUNT(*) AS n
  FROM public.accounting_review_flags
  WHERE status='open'
    AND category<>'deployment_governance'
), journal_totals AS (
  SELECT
    COALESCE(SUM(jl.debit),0)::numeric AS debits,
    COALESCE(SUM(jl.credit),0)::numeric AS credits
  FROM public.journal_entries je
  JOIN public.journal_lines jl ON jl.entry_id=je.id
  CROSS JOIN cutover c
  WHERE je.entry_date>=c.cutover_at
), ledger_totals AS (
  SELECT
    COALESCE(SUM(jl.credit-jl.debit) FILTER(WHERE jl.account_code='3000'),0)::numeric AS product_revenue,
    COALESCE(SUM(jl.debit-jl.credit) FILTER(WHERE jl.account_code='4000'),0)::numeric AS cogs,
    COALESCE(SUM(jl.debit-jl.credit) FILTER(WHERE jl.account_code='5100'),0)::numeric AS fulfillment_cost,
    COALESCE(SUM(jl.credit-jl.debit) FILTER(WHERE jl.account_code='3050'),0)::numeric AS rounding_adjustment
  FROM public.journal_entries je
  JOIN public.journal_lines jl ON jl.entry_id=je.id
  CROSS JOIN cutover c
  WHERE je.entry_date>=c.cutover_at
)
SELECT
  now() AS checked_at,
  s.inventory_ledger_mode,
  s.payment_ledger_enabled,
  s.snapshot_writer_enabled,
  l.total_lines,
  l.sale_snapshot_lines,
  l.exact_cost_lines,
  l.realized_lines,
  l.realized_exact_cost_lines,
  l.realized_sale_snapshot_lines,
  p.active_products,
  p.product_cost_resolved,
  p.packaging_cost_resolved,
  p.insert_cost_resolved,
  (
    s.inventory_ledger_mode='enforce'
    AND s.payment_ledger_enabled='true'
    AND s.snapshot_writer_enabled='true'
  ) AS operational_accounting_ready,
  (
    l.realized_lines>0
    AND l.realized_exact_cost_lines=l.realized_lines
    AND l.realized_sale_snapshot_lines=l.realized_lines
    AND p.product_cost_resolved=p.active_products
    AND p.packaging_cost_resolved=p.active_products
    AND p.insert_cost_resolved=p.active_products
    AND (SELECT n FROM current_returns)=0
    AND (SELECT debits-credits FROM journal_totals)=0
  ) AS tax_report_ready,
  CASE
    WHEN l.realized_exact_cost_lines<>l.realized_lines
      THEN 'current_realized_lines_lack_exact_cost_snapshots'
    WHEN l.realized_sale_snapshot_lines<>l.realized_lines
      THEN 'current_realized_lines_lack_sale_price_snapshots'
    WHEN p.product_cost_resolved<>p.active_products
      THEN 'current_product_cost_evidence_incomplete'
    WHEN p.packaging_cost_resolved<>p.active_products
      THEN 'packaging_cost_evidence_incomplete'
    WHEN p.insert_cost_resolved<>p.active_products
      THEN 'insert_cost_evidence_incomplete'
    WHEN (SELECT n FROM current_returns)<>0
      THEN 'unverified_returns'
    WHEN (SELECT debits-credits FROM journal_totals)<>0
      THEN 'journal_unbalanced'
    ELSE NULL
  END AS primary_tax_blocker,
  (SELECT cutover_at FROM cutover) AS cutover_at,
  (SELECT COUNT(*) FROM real_facts) AS realized_orders,
  h.legacy_realized_lines_without_exact_cost,
  (h.legacy_realized_lines_without_exact_cost=0) AS historical_exact_cost_complete,
  (p.product_cost_resolved=p.active_products) AS current_product_cost_complete,
  (p.packaging_cost_resolved=p.active_products) AS current_packaging_cost_complete,
  (p.insert_cost_resolved=p.active_products) AS current_insert_cost_complete,
  (SELECT n FROM current_returns) AS unverified_returns,
  (SELECT n FROM current_unsettled) AS unsettled_carrier_orders,
  (SELECT n FROM review_flags) AS open_review_flags,
  (SELECT debits FROM journal_totals) AS journal_debits,
  (SELECT credits FROM journal_totals) AS journal_credits,
  (SELECT debits-credits FROM journal_totals) AS journal_difference,
  lt.product_revenue,
  COALESCE((SELECT SUM(merchant_net) FROM real_facts),0)::numeric AS merchant_net,
  lt.cogs,
  lt.fulfillment_cost,
  lt.rounding_adjustment
FROM line_stats l
CROSS JOIN product_stats p
CROSS JOIN settings_state s
CROSS JOIN historical h
CROSS JOIN ledger_totals lt;

COMMENT ON VIEW public.accounting_readiness_status IS
'Authoritative readiness from the active accounting cutover onward. Production test orders are excluded. Historical pre-cutover snapshot incompleteness remains visible separately and is never fabricated.';

CREATE OR REPLACE VIEW public.v_accounting_period_readiness AS
WITH months AS (
  SELECT to_char(gs,'YYYY-MM') AS period_key
  FROM public.accounting_cutovers c
  CROSS JOIN LATERAL generate_series(
    date_trunc('month',c.cutover_at AT TIME ZONE 'Asia/Baghdad'),
    date_trunc('month',clock_timestamp() AT TIME ZONE 'Asia/Baghdad'),
    '1 mon'::interval
  ) gs
  WHERE c.status='active'
), real_facts AS (
  SELECT f.*
  FROM public.order_accounting_facts f
  JOIN public.orders o ON o.id=f.order_id
  WHERE COALESCE(o.is_test,false)=false
), main AS (
  SELECT id
  FROM public.inventory_locations
  WHERE code='MAIN' AND is_active=true
  LIMIT 1
), ledger AS (
  SELECT im.product_id,im.variant_id,SUM(im.quantity_delta)::integer qty
  FROM public.inventory_movements im
  WHERE im.location_id=(SELECT id FROM main)
  GROUP BY im.product_id,im.variant_id
), inventory_check AS (
  SELECT
    (
      SELECT COUNT(*)
      FROM public.products p
      LEFT JOIN ledger l ON l.product_id=p.id AND l.variant_id IS NULL
      WHERE p.deleted_at IS NULL
        AND COALESCE(p.has_variants,false)=false
        AND COALESCE(p.stock,0)<>COALESCE(l.qty,0)
    ) + (
      SELECT COUNT(*)
      FROM public.products p
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) v
      LEFT JOIN ledger l ON l.product_id=p.id AND l.variant_id=v->>'id'
      WHERE p.deleted_at IS NULL
        AND COALESCE(p.has_variants,false)=true
        AND COALESCE(NULLIF(v->>'stock','')::integer,0)<>COALESCE(l.qty,0)
    ) AS mismatches
), flags AS (
  SELECT COUNT(*) n
  FROM public.accounting_review_flags
  WHERE status='open' AND category<>'deployment_governance'
), governance_flags AS (
  SELECT COUNT(*) n
  FROM public.accounting_review_flags
  WHERE status='open' AND category='deployment_governance'
), procurement AS (
  SELECT CASE
    WHEN posted_receipts_missing_fact<>0
      OR facts_missing_journal<>0
      OR paid_supplier_payments_missing_journal<>0
      OR purchase_item_received_mismatches<>0
      OR ap_difference_iqd<>0
      THEN 1
    ELSE 0
  END n
  FROM public.v_procurement_accounting_readiness
), settlement_integrity AS (
  SELECT
    (
      SELECT COUNT(*)
      FROM public.cash_settlements s
      WHERE s.status IN ('reconciled','closed')
        AND COALESCE(s.received_at,s.created_at)>=public.aquavo_active_cutover()
        AND s.net_amount>0
        AND NOT EXISTS(
          SELECT 1
          FROM public.journal_entries j
          WHERE j.source_type='cash_settlement'
            AND j.source_id=s.id
            AND j.event_kind='net_receipt'
            AND j.total_debit=s.net_amount
            AND j.total_credit=s.net_amount
        )
    ) + (
      SELECT COUNT(*)
      FROM (
        SELECT i.order_id
        FROM public.cash_settlement_items i
        JOIN public.cash_settlements s ON s.id=i.settlement_id
        JOIN public.orders o ON o.id=i.order_id
        WHERE COALESCE(o.is_test,false)=false
          AND i.reconciliation_status IN ('matched','approved')
          AND COALESCE(s.received_at,s.created_at)>=public.aquavo_active_cutover()
        GROUP BY i.order_id
        HAVING COUNT(*)>1
      ) d
    ) AS n
)
SELECT
  m.period_key,
  COALESCE((SELECT COUNT(*) FROM real_facts f WHERE f.period_key=m.period_key),0)::bigint AS realized_orders,
  COALESCE((SELECT COUNT(*) FROM real_facts f WHERE f.period_key=m.period_key AND (f.cost_status NOT IN ('exact','verified_zero') OR f.cogs_amount IS NULL)),0)::bigint AS incomplete_cost_orders,
  COALESCE((SELECT COUNT(*) FROM real_facts f JOIN public.orders o ON o.id=f.order_id WHERE f.period_key=m.period_key AND NOT EXISTS(SELECT 1 FROM public.order_fulfillment_events e WHERE e.order_id=f.order_id AND e.event_type='original' AND e.workflow_state='confirmed') AND COALESCE(o.box_cost,0)<=0),0)::bigint AS missing_fulfillment_orders,
  COALESCE((SELECT COUNT(*) FROM real_facts f WHERE f.period_key=m.period_key AND EXISTS(SELECT 1 FROM public.order_fulfillment_events e WHERE e.order_id=f.order_id AND e.event_type='original' AND e.workflow_state='confirmed' AND (e.cost_status NOT IN ('exact','verified_zero') OR e.actual_cost IS NULL))),0)::bigint AS incomplete_fulfillment_orders,
  COALESCE((SELECT COUNT(*) FROM real_facts f WHERE f.period_key=m.period_key AND NOT EXISTS(SELECT 1 FROM public.payment_events p WHERE p.id=f.payment_event_id AND p.status='completed' AND p.amount=f.gross_collected)),0)::bigint AS payment_evidence_errors,
  COALESCE((SELECT COUNT(*) FROM real_facts f WHERE f.period_key=m.period_key AND f.cash_custody='carrier' AND NOT EXISTS(SELECT 1 FROM public.order_accounting_settlements s WHERE s.order_fact_id=f.id AND s.status='matched')),0)::bigint AS unsettled_carrier_orders,
  COALESCE((SELECT COUNT(*) FROM real_facts f WHERE f.period_key=m.period_key AND f.delivery_surplus>0),0)::bigint AS delivery_surplus_exceptions,
  COALESCE((SELECT COUNT(*) FROM public.order_return_events r JOIN public.orders o ON o.id=r.order_id WHERE COALESCE(o.is_test,false)=false AND to_char((r.updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=m.period_key AND r.status='recorded'),0)::bigint AS unverified_returns,
  COALESCE((SELECT COUNT(*) FROM public.expenses e WHERE to_char(COALESCE(e.expense_occurred_at,e.expense_date AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=m.period_key AND e.deleted_at IS NULL AND e.accounting_status NOT IN ('verified','rejected')),0)::bigint AS undocumented_expenses,
  (SELECT mismatches FROM inventory_check) AS inventory_mismatches,
  (SELECT n FROM flags) AS open_review_flags,
  COALESCE((SELECT SUM(l.debit)-SUM(l.credit) FROM public.journal_entries j JOIN public.journal_lines l ON l.entry_id=j.id WHERE j.period_key=m.period_key),0)::numeric AS journal_difference,
  public.accounting_period_account_balance(m.period_key,'3000') AS product_revenue,
  COALESCE((SELECT SUM(f.merchant_net) FROM real_facts f WHERE f.period_key=m.period_key),0)::numeric AS merchant_net,
  COALESCE((SELECT SUM(f.delivery_subsidy) FROM real_facts f WHERE f.period_key=m.period_key),0)::numeric AS delivery_subsidy,
  COALESCE((SELECT SUM(f.delivery_surplus) FROM real_facts f WHERE f.period_key=m.period_key),0)::numeric AS delivery_surplus,
  public.accounting_period_account_balance(m.period_key,'4000') AS cogs,
  public.accounting_period_account_balance(m.period_key,'5100') AS fulfillment_cost,
  public.accounting_period_account_balance(m.period_key,'4100') AS sales_returns,
  public.accounting_period_account_balance(m.period_key,'4200') AS actual_return_loss,
  COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.deleted_at IS NULL AND e.accounting_status='verified' AND to_char(COALESCE(e.expense_occurred_at,e.expense_date AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=m.period_key),0)::numeric AS verified_expenses,
  (SELECT COALESCE(n,0) FROM procurement) AS procurement_integrity_failures,
  (SELECT COALESCE(n,0) FROM settlement_integrity) AS settlement_integrity_failures,
  public.accounting_period_account_balance(m.period_key,'3050') AS rounding_adjustment,
  public.accounting_period_account_balance(m.period_key,'5400') AS fx_net_expense,
  (SELECT n FROM governance_flags) AS governance_review_flags
FROM months m;

COMMENT ON VIEW public.v_accounting_period_readiness IS
'Post-cutover monthly readiness. First-class Production test orders are excluded from order facts and settlement integrity; their immutable journals are neutralized by explicit reversals.';

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0086_accounting_cutover_readiness_and_test_reporting',
  '0086008600860086008600860086008600860086008600860086008600860086',
  'Scope accounting/tax readiness to the active cutover and real Production orders; preserve explicit historical incompleteness; exclude quarantined tests from monthly reporting'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;
