-- 0089_reconciliation_queue_integrity.sql
-- Reconcile reporting views with current accounting semantics:
--   * financially_counted NULL means AUTO, not "undecided"
--   * test orders do not belong in operational finance queues
--   * invoice totals may be raw or rounded up to the 250 IQD cash denomination
--   * order-total reconciliation checks arithmetic, not a separate rounding policy
-- Also backfill the cost-history events that migration 0087 intentionally changed
-- at product level but did not append to product_cost_history.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0088_allow_zero_stock_variant_shape_changes'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0089_REQUIRES_ACTIVE_0088';
  END IF;
END
$guard$;

CREATE OR REPLACE VIEW public.order_financial_reconciliation AS
WITH paid AS (
  SELECT
    pe.order_id,
    sum(
      CASE
        WHEN pe.status='completed'
          AND pe.event_type IN ('capture','cod_received','adjustment') THEN pe.amount
        WHEN pe.status='completed'
          AND pe.event_type IN ('refund','chargeback') THEN -pe.amount
        ELSE 0::numeric
      END
    ) AS verified_payment_amount,
    count(*) FILTER (WHERE pe.status='completed') AS completed_event_count
  FROM public.payment_events pe
  GROUP BY pe.order_id
),
settled AS (
  SELECT
    csi.order_id,
    sum(csi.net_amount) FILTER (
      WHERE csi.reconciliation_status IN ('matched','approved')
    ) AS reconciled_settlement_amount
  FROM public.cash_settlement_items csi
  GROUP BY csi.order_id
),
adjustments AS (
  SELECT
    a.order_id,
    sum(a.amount) AS adjustment_amount
  FROM public.order_financial_adjustments a
  GROUP BY a.order_id
)
SELECT
  o.id AS order_id,
  o.order_number,
  o.status AS order_status,
  o.payment_status,
  o.cod_received,
  o.financially_counted,
  o.total AS order_total,
  COALESCE(p.verified_payment_amount,0::numeric) AS verified_payment_amount,
  COALESCE(s.reconciled_settlement_amount,0::numeric) AS reconciled_settlement_amount,
  COALESCE(a.adjustment_amount,0::numeric) AS documented_adjustment_amount,
  CASE
    WHEN o.status='delivered'
      AND o.payment_status='pending'
      AND COALESCE(p.verified_payment_amount,0::numeric)=0::numeric
      THEN 'delivered_without_verified_payment'
    WHEN o.payment_status='paid'
      AND COALESCE(p.verified_payment_amount,0::numeric)=0::numeric
      THEN 'paid_status_without_payment_event'
    WHEN COALESCE(p.verified_payment_amount,0::numeric)>0::numeric
      AND o.payment_status<>'paid'
      THEN 'payment_event_without_paid_status'
    WHEN o.cod_received=true
      AND COALESCE(f.cash_custody,'carrier')='carrier'
      AND COALESCE(s.reconciled_settlement_amount,0::numeric)=0::numeric
      THEN 'cod_not_reconciled_to_settlement'
    ELSE 'no_conflict_detected'
  END AS reconciliation_reason
FROM public.orders o
LEFT JOIN paid p ON p.order_id=o.id
LEFT JOIN settled s ON s.order_id=o.id
LEFT JOIN adjustments a ON a.order_id=o.id
LEFT JOIN public.order_accounting_facts f ON f.order_id=o.id;

CREATE OR REPLACE VIEW public.order_financial_reconciliation_queue AS
SELECT
  r.order_id,
  r.order_number,
  r.order_status,
  r.payment_status,
  r.cod_received,
  r.financially_counted,
  r.order_total,
  r.verified_payment_amount,
  r.reconciled_settlement_amount,
  r.documented_adjustment_amount,
  r.reconciliation_reason
FROM public.order_financial_reconciliation r
JOIN public.orders o ON o.id=r.order_id
WHERE r.reconciliation_reason <> 'no_conflict_detected'
  AND COALESCE(o.is_test,false)=false;

CREATE OR REPLACE VIEW public.v_order_accounting AS
SELECT
  f.order_id,
  o.order_number,
  o.source,
  o.status,
  o.payment_status,
  o.cod_received,
  f.recognized_at,
  f.period_key,
  f.gross_collected,
  f.customer_delivery_fee,
  f.carrier_fee,
  COALESCE(
    public.accounting_order_account_balance(f.order_id,'3000'),
    f.product_revenue
  ) AS product_revenue,
  f.merchant_net,
  f.delivery_subsidy,
  f.delivery_surplus,
  f.cash_custody,
  f.cogs_amount,
  f.cost_status,
  CASE
    WHEN f.cogs_amount IS NULL THEN NULL::numeric
    ELSE
      COALESCE(public.accounting_order_account_balance(f.order_id,'3000'),f.product_revenue)
      - f.cogs_amount
      - f.delivery_subsidy
      - COALESCE(
          public.accounting_order_account_balance(f.order_id,'5100'),
          (
            SELECT SUM(e.actual_cost)
            FROM public.order_fulfillment_events e
            WHERE e.order_id=f.order_id
              AND e.workflow_state='confirmed'
          ),
          CASE WHEN COALESCE(o.box_cost,0)>0 THEN o.box_cost ELSE 0 END
        )
  END AS contribution_profit,
  CASE
    WHEN f.cash_custody<>'carrier' THEN 'not_required'::text
    WHEN s.id IS NULL THEN 'unsettled'::text
    ELSE s.status
  END AS settlement_status,
  s.settlement_id,
  f.policy_version
FROM public.order_accounting_facts f
JOIN public.orders o ON o.id=f.order_id
LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id
WHERE COALESCE(o.is_test,false)=false;

CREATE OR REPLACE VIEW public.order_total_reconciliation AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.items_subtotal_snapshot,
  o.shipping_cost,
  o.discount_total,
  o.formula_total_snapshot,
  o.total,
  o.rounded_total,
  o.rounding_adjustment_snapshot,
  o.total - o.formula_total_snapshot AS formula_delta,
  CASE
    WHEN o.items_subtotal_snapshot IS NULL THEN 'missing_snapshot'
    WHEN abs(o.total - o.formula_total_snapshot) > 1::numeric THEN 'formula_mismatch'
    ELSE 'no_conflict_detected'
  END AS reconciliation_reason
FROM public.orders o;

CREATE OR REPLACE VIEW public.order_total_reconciliation_queue AS
SELECT
  order_id,
  order_number,
  items_subtotal_snapshot,
  shipping_cost,
  discount_total,
  formula_total_snapshot,
  total,
  rounded_total,
  rounding_adjustment_snapshot,
  formula_delta,
  reconciliation_reason
FROM public.order_total_reconciliation
WHERE reconciliation_reason <> 'no_conflict_detected';

CREATE OR REPLACE VIEW public.manual_invoice_reconciliation_queue AS
WITH evaluated AS (
  SELECT
    mi.id AS invoice_id,
    mi.invoice_no,
    mi.order_id,
    mi.status,
    mi.subtotal,
    mi.discount,
    mi.delivery,
    mi.total,
    mi.subtotal-mi.discount+mi.delivery AS calculated_total,
    mi.total-(mi.subtotal-mi.discount+mi.delivery) AS delta,
    CASE
      WHEN mi.order_id IS NOT NULL AND o.id IS NULL
        THEN 'broken_order_link'
      WHEN mi.total <> (mi.subtotal-mi.discount+mi.delivery)
        AND mi.total <> ceil((mi.subtotal-mi.discount+mi.delivery)/250.0)*250
        AND NOT (
          o.id IS NOT NULL
          AND o.total=(mi.subtotal-mi.discount+mi.delivery)
          AND o.rounded_total=mi.total
        )
        THEN 'total_formula_mismatch'
      ELSE 'no_conflict_detected'
    END AS reconciliation_reason
  FROM public.manual_invoices mi
  LEFT JOIN public.orders o ON o.id=mi.order_id
)
SELECT
  invoice_id,
  invoice_no,
  order_id,
  status,
  subtotal,
  discount,
  delivery,
  total,
  calculated_total,
  delta,
  reconciliation_reason
FROM evaluated
WHERE reconciliation_reason <> 'no_conflict_detected';

-- 0087 deliberately synchronized these top-level product costs from the retained
-- default-variant cost after variant collapse. Append the missing history event;
-- do not modify the current product cost or the GL.
INSERT INTO public.product_cost_history(
  product_id,
  cost_price,
  packaging_cost,
  insert_cost,
  effective_from,
  note,
  changed_by,
  cost_price_resolution,
  packaging_cost_resolution,
  insert_cost_resolution,
  cost_resolution_note,
  approved_by,
  approved_at,
  reason
)
SELECT
  p.id,
  p.cost_price,
  p.packaging_cost,
  p.insert_cost,
  p.cost_resolution_at,
  'Backfill of the authoritative top-level cost synchronization performed by migration 0087',
  'migration_0089',
  p.cost_price_resolution,
  p.packaging_cost_resolution,
  p.insert_cost_resolution,
  p.cost_resolution_note,
  'migration_0087',
  p.cost_resolution_at,
  'variant_collapse_top_level_cost_sync'
FROM public.products p
WHERE p.id IN (
  'houyi-ceramic-ring',
  'houyi-breathing-ring-white',
  'houyi-feeding-cup'
)
  AND p.cost_resolution_by='migration_0087'
  AND p.cost_resolution_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_cost_history h
    WHERE h.product_id=p.id
      AND h.effective_from=p.cost_resolution_at
      AND h.cost_price IS NOT DISTINCT FROM p.cost_price
      AND h.packaging_cost IS NOT DISTINCT FROM p.packaging_cost
      AND h.insert_cost IS NOT DISTINCT FROM p.insert_cost
      AND h.reason='variant_collapse_top_level_cost_sync'
  );

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0089_reconciliation_queue_integrity',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Align finance queues with NULL=auto semantics, exclude test orders, accept valid cash-denomination invoice rounding, scope order-total reconciliation to arithmetic, and append missing 0087 product cost-history events. Runner must normalize checksum to SHA-256(file bytes).'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
