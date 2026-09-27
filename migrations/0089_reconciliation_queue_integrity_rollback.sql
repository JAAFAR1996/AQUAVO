-- 0089_reconciliation_queue_integrity_rollback.sql
-- Restores the pre-0089 reconciliation-view behavior.
-- The product_cost_history rows appended by 0089 are intentionally preserved:
-- they document a real 0087 cost change and must remain append-only audit evidence.

BEGIN;

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
      AND COALESCE(s.reconciled_settlement_amount,0::numeric)=0::numeric
      THEN 'cod_not_reconciled_to_settlement'
    WHEN o.financially_counted IS NULL
      AND (o.payment_status='paid' OR COALESCE(p.verified_payment_amount,0::numeric)>0::numeric)
      THEN 'financial_counting_undecided'
    ELSE 'no_conflict_detected'
  END AS reconciliation_reason
FROM public.orders o
LEFT JOIN paid p ON p.order_id=o.id
LEFT JOIN settled s ON s.order_id=o.id
LEFT JOIN adjustments a ON a.order_id=o.id;

CREATE OR REPLACE VIEW public.order_financial_reconciliation_queue AS
SELECT
  order_id,
  order_number,
  order_status,
  payment_status,
  cod_received,
  financially_counted,
  order_total,
  verified_payment_amount,
  reconciled_settlement_amount,
  documented_adjustment_amount,
  reconciliation_reason
FROM public.order_financial_reconciliation
WHERE reconciliation_reason <> 'no_conflict_detected';

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
  CASE WHEN s.id IS NULL THEN 'unsettled'::text ELSE s.status END AS settlement_status,
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
  o.total-o.formula_total_snapshot AS formula_delta,
  CASE
    WHEN o.items_subtotal_snapshot IS NULL THEN 'missing_snapshot'
    WHEN abs(o.total-o.formula_total_snapshot)>1::numeric THEN 'formula_mismatch'
    WHEN o.rounded_total IS NOT NULL AND o.rounded_total<o.total THEN 'rounded_below_total'
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
      WHEN mi.order_id IS NOT NULL AND o.id IS NULL THEN 'broken_order_link'
      WHEN mi.total<>(mi.subtotal-mi.discount+mi.delivery)
        AND NOT (
          o.id IS NOT NULL
          AND o.total=(mi.subtotal-mi.discount+mi.delivery)
          AND o.rounded_total=mi.total
        )
        THEN 'total_formula_mismatch'
      WHEN mi.financially_counted IS NULL THEN 'financial_counting_undecided'
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

UPDATE public.schema_migrations
SET rolled_back_at=now(),
    notes=COALESCE(notes,'')||' | Rolled back reconciliation-view semantics; append-only 0087 cost-history evidence retained.'
WHERE version='0089_reconciliation_queue_integrity'
  AND rolled_back_at IS NULL;

COMMIT;
