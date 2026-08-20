-- Safe rollback for 0083_production_test_order_isolation.
-- Historical quarantine/reversal evidence is intentionally NOT undone: doing so
-- would recreate synthetic Production revenue, stock depletion and messaging.
-- This rollback only disables the future-write guards and restores the prior
-- operational view while preserving the audit trail and first-class test labels.

BEGIN;

DROP TRIGGER IF EXISTS order_items_00_block_test_side_effects ON public.order_items_relational;
DROP TRIGGER IF EXISTS orders_01_block_test_status_side_effects ON public.orders;
DROP TRIGGER IF EXISTS orders_00_guard_production_tests ON public.orders;

DROP FUNCTION IF EXISTS public.block_test_order_line_side_effects();
DROP FUNCTION IF EXISTS public.block_test_order_status_side_effects();
DROP FUNCTION IF EXISTS public.guard_production_test_orders();

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
  f.product_revenue,
  f.merchant_net,
  f.delivery_subsidy,
  f.delivery_surplus,
  f.cash_custody,
  f.cogs_amount,
  f.cost_status,
  CASE
    WHEN f.cogs_amount IS NULL THEN NULL::numeric
    ELSE
      f.product_revenue
      - f.cogs_amount
      - f.delivery_subsidy
      - COALESCE(
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
  s.settlement_id,
  f.policy_version
FROM public.order_accounting_facts f
JOIN public.orders o ON o.id=f.order_id
LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id;

UPDATE public.schema_migrations
SET rolled_back_at=clock_timestamp(),
    notes=COALESCE(notes,'')||' | Safe rollback: guards removed; quarantined test evidence/reversals intentionally preserved.'
WHERE version='0083_production_test_order_isolation'
  AND rolled_back_at IS NULL;

COMMIT;
