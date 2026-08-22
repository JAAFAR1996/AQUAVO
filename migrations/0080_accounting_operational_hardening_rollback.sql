BEGIN;

-- Safety-preserving rollback:
-- * restore the prior order-level contribution view semantics;
-- * remove the 0080 diagnostic view;
-- * DO NOT make already validated constraints NOT VALID again;
-- * DO NOT re-grant UPDATE/DELETE on immutable accounting evidence.
-- Those two hardenings are monotonic safety improvements and intentionally remain.

DROP VIEW IF EXISTS public.v_accounting_operational_hardening;

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

COMMENT ON VIEW public.v_order_accounting IS
'Prior operational order register semantics restored by 0080 safety-preserving rollback. Constraint validation and append-only ACL hardening intentionally remain in force.';

UPDATE public.schema_migrations
SET rolled_back_at=now(),
    notes=COALESCE(notes,'')||' [safety-preserving rollback: view reverted; validated constraints and least-privilege ACLs retained]'
WHERE version='0080_accounting_operational_hardening'
  AND rolled_back_at IS NULL;

COMMIT;
