BEGIN;

-- Operational hardening only. This migration intentionally does not alter tax
-- configuration, tax profiles, historical pre-cutover tax evidence, or tax-final state.

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0078_accounting_external_handoff_hardening'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0080_REQUIRES_ACTIVE_0078_ACCOUNTING_EXTERNAL_HANDOFF_HARDENING';
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 1. Keep order-level operational profit aligned with the canonical V3 ledger.
--    Cash rounding is a real order-level contribution component recorded in 3050.
--    The legacy first V3 order already carries its historical rounding inside
--    product_revenue; later V3 facts use rounding_adjustment explicitly.
-- -----------------------------------------------------------------------------
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
      + COALESCE(f.rounding_adjustment,0)
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
'Canonical operational order register. contribution_profit includes explicit V3 cash rounding while product sales remain separately classified in account 3000.';

-- -----------------------------------------------------------------------------
-- 2. Validate legacy NOT VALID constraints after Production was independently
--    checked to contain zero violations. Fail closed if any expected constraint
--    is absent rather than silently claiming hardening succeeded.
-- -----------------------------------------------------------------------------
DO $do$
DECLARE
  r record;
  v_validated boolean;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('public','accounting_period_closes','accounting_period_closes_close_type_chk'),
      ('public','order_items_relational','order_items_cost_confidence_chk'),
      ('public','order_items_relational','order_items_cost_nonneg'),
      ('public','order_items_relational','order_items_cost_source_chk'),
      ('public','order_items_relational','order_items_cost_status_chk'),
      ('public','order_items_relational','order_items_cost_version_chk'),
      ('public','order_items_relational','order_items_sale_price_identity_chk'),
      ('public','order_items_relational','order_items_sale_price_nonneg'),
      ('public','order_items_relational','order_items_sale_price_provenance_chk'),
      ('public','order_items_relational','order_items_sale_price_source_chk'),
      ('public','orders','orders_coupon_id_coupons_id_fk')
    ) AS expected(schema_name,table_name,constraint_name)
  LOOP
    SELECT c.convalidated
      INTO v_validated
    FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname=r.schema_name
      AND t.relname=r.table_name
      AND c.conname=r.constraint_name;

    IF NOT FOUND THEN
      RAISE EXCEPTION '0080_EXPECTED_CONSTRAINT_MISSING: %.%.%',
        r.schema_name,r.table_name,r.constraint_name;
    END IF;

    IF NOT v_validated THEN
      EXECUTE format(
        'ALTER TABLE %I.%I VALIDATE CONSTRAINT %I',
        r.schema_name,r.table_name,r.constraint_name
      );
    END IF;
  END LOOP;
END
$do$;

-- -----------------------------------------------------------------------------
-- 3. Least privilege for append-only / immutable accounting evidence.
--    Application code and trigger functions may INSERT and SELECT these rows,
--    but ordinary runtime must not own UPDATE/DELETE capability in addition to
--    the existing database immutability triggers.
-- -----------------------------------------------------------------------------
DO $do$
DECLARE
  v_table text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') THEN
    FOREACH v_table IN ARRAY ARRAY[
      'inventory_cost_events',
      'inventory_movements',
      'journal_entries',
      'journal_lines',
      'order_accounting_carrier_corrections',
      'order_accounting_facts',
      'order_accounting_settlements',
      'payment_events'
    ]
    LOOP
      IF to_regclass(format('public.%I',v_table)) IS NULL THEN
        RAISE EXCEPTION '0080_APPEND_ONLY_TABLE_MISSING: %',v_table;
      END IF;
      EXECUTE format('REVOKE UPDATE, DELETE ON TABLE public.%I FROM aquavo_runtime',v_table);
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO aquavo_runtime',v_table);
    END LOOP;
  END IF;
END
$do$;

-- -----------------------------------------------------------------------------
-- 4. Machine-readable operational hardening state for release verification.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_accounting_operational_hardening AS
WITH targeted_constraints AS (
  SELECT COUNT(*) FILTER (WHERE NOT c.convalidated) AS unvalidated_count,
         COUNT(*) AS present_count
  FROM pg_constraint c
  JOIN pg_class t ON t.oid=c.conrelid
  JOIN pg_namespace n ON n.oid=t.relnamespace
  WHERE n.nspname='public'
    AND (t.relname,c.conname) IN (
      ('accounting_period_closes','accounting_period_closes_close_type_chk'),
      ('order_items_relational','order_items_cost_confidence_chk'),
      ('order_items_relational','order_items_cost_nonneg'),
      ('order_items_relational','order_items_cost_source_chk'),
      ('order_items_relational','order_items_cost_status_chk'),
      ('order_items_relational','order_items_cost_version_chk'),
      ('order_items_relational','order_items_sale_price_identity_chk'),
      ('order_items_relational','order_items_sale_price_nonneg'),
      ('order_items_relational','order_items_sale_price_provenance_chk'),
      ('order_items_relational','order_items_sale_price_source_chk'),
      ('orders','orders_coupon_id_coupons_id_fk')
    )
), runtime_role AS (
  SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aquavo_runtime') AS exists
), append_only_acl AS (
  SELECT CASE
    WHEN NOT (SELECT exists FROM runtime_role) THEN 0::bigint
    ELSE (
      SELECT COUNT(*)
      FROM (VALUES
        ('inventory_cost_events'),
        ('inventory_movements'),
        ('journal_entries'),
        ('journal_lines'),
        ('order_accounting_carrier_corrections'),
        ('order_accounting_facts'),
        ('order_accounting_settlements'),
        ('payment_events')
      ) AS x(table_name)
      WHERE has_table_privilege('aquavo_runtime',format('public.%I',x.table_name),'UPDATE')
         OR has_table_privilege('aquavo_runtime',format('public.%I',x.table_name),'DELETE')
    )
  END AS excessive_mutation_privileges
)
SELECT
  (SELECT present_count FROM targeted_constraints)=11 AS expected_constraints_present,
  (SELECT unvalidated_count FROM targeted_constraints)=0 AS target_constraints_validated,
  COALESCE((SELECT excessive_mutation_privileges FROM append_only_acl),0)=0 AS append_only_acl_hardened,
  pg_get_viewdef('public.v_order_accounting'::regclass,true)
    ILIKE '%rounding_adjustment%' AS order_profit_includes_rounding;

COMMENT ON VIEW public.v_accounting_operational_hardening IS
'Operational Accounting V3 release invariants: validated legacy constraints, least-privilege append-only ACLs, and rounding-aware per-order contribution profit.';

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0080_accounting_operational_hardening',
  '0080008000800080008000800080008000800080008000800080008000800080',
  'Operational hardening only: align per-order contribution profit with V3 rounding, validate clean legacy constraints, and enforce least privilege on immutable accounting evidence'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;
