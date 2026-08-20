-- Safety-preserving rollback for 0086_accounting_cutover_readiness_and_test_reporting.
-- Restore the pre-0086 top-level readiness semantics. The monthly view keeps
-- first-class test exclusion intentionally: reintroducing known synthetic orders
-- into official reporting is not a safe rollback and would recreate a proven bug.

BEGIN;

DROP VIEW IF EXISTS public.accounting_readiness_status;

CREATE VIEW public.accounting_readiness_status AS
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
      WHERE o.status='delivered'
        AND o.financially_counted IS TRUE
        AND oi.cost_snapshot_status='exact'
    ) AS realized_exact_cost_lines,
    count(*) FILTER(
      WHERE o.status='delivered'
        AND o.financially_counted IS TRUE
        AND oi.unit_sale_price_snapshot IS NOT NULL
        AND oi.discount_snapshot IS NOT NULL
        AND oi.final_unit_sale_price_snapshot IS NOT NULL
        AND oi.sale_price_snapshot_at IS NOT NULL
        AND oi.sale_price_source IS NOT NULL
    ) AS realized_sale_snapshot_lines
  FROM public.order_items_relational oi
  JOIN public.orders o ON o.id=oi.order_id
), product_stats AS (
  SELECT
    count(*) AS active_products,
    count(*) FILTER(
      WHERE cost_price_resolution IN ('known','verified_zero')
    ) AS product_cost_resolved,
    count(*) FILTER(
      WHERE packaging_cost_resolution IN ('known','verified_zero')
    ) AS packaging_cost_resolved,
    count(*) FILTER(
      WHERE insert_cost_resolution IN ('known','verified_zero')
    ) AS insert_cost_resolved
  FROM public.products
  WHERE deleted_at IS NULL
), settings_state AS (
  SELECT
    max(value) FILTER(WHERE key='inventory_ledger_mode') AS inventory_ledger_mode,
    max(value) FILTER(WHERE key='payment_ledger_enabled') AS payment_ledger_enabled,
    max(value) FILTER(WHERE key='financial_snapshot_writer_enabled') AS snapshot_writer_enabled
  FROM public.settings
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

COMMENT ON VIEW public.accounting_readiness_status IS
'Pre-0086 readiness semantics restored by rollback. Monthly reporting intentionally retains test-order exclusion because synthetic Production data must never be counted again.';

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' | Safety-preserving rollback: top-level readiness semantics restored; test-order exclusion intentionally retained in monthly reporting.'
WHERE version='0086_accounting_cutover_readiness_and_test_reporting'
  AND rolled_back_at IS NULL;

COMMIT;
