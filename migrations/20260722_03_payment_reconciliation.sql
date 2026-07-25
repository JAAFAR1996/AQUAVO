-- AQUAVO database repair: payment and COD reconciliation
-- Date: 2026-07-22
-- Depends on: 20260722_01_inventory_reconciliation.sql

SET lock_timeout = '5s';
SET statement_timeout = '120s';

CREATE TABLE IF NOT EXISTS payment_events (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES orders(id),
  event_type text NOT NULL,
  status text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  method text NOT NULL,
  provider text,
  provider_transaction_id text,
  idempotency_key text NOT NULL UNIQUE,
  occurred_at timestamptz NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reverses_event_id text REFERENCES payment_events(id),
  CONSTRAINT payment_events_amount_check CHECK (amount >= 0),
  CONSTRAINT payment_events_type_check
    CHECK (event_type IN (
      'authorization','capture','cod_received','refund',
      'chargeback','adjustment','void'
    )),
  CONSTRAINT payment_events_status_check
    CHECK (status IN ('pending','completed','failed','cancelled','reversed'))
);

CREATE INDEX IF NOT EXISTS payment_events_order_idx
  ON payment_events (order_id, occurred_at);

CREATE INDEX IF NOT EXISTS payment_events_provider_idx
  ON payment_events (provider, provider_transaction_id);

CREATE TABLE IF NOT EXISTS cash_settlements (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  settlement_number text NOT NULL UNIQUE,
  carrier text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  gross_amount numeric NOT NULL DEFAULT 0,
  fees_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'IQD',
  received_at timestamptz,
  bank_reference text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_settlements_amount_check
    CHECK (gross_amount >= 0 AND fees_amount >= 0 AND net_amount >= 0),
  CONSTRAINT cash_settlements_status_check
    CHECK (status IN ('draft','received','reconciled','closed','rejected'))
);

CREATE TABLE IF NOT EXISTS cash_settlement_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  settlement_id text NOT NULL REFERENCES cash_settlements(id) ON DELETE CASCADE,
  order_id text NOT NULL REFERENCES orders(id),
  payment_event_id text REFERENCES payment_events(id),
  gross_amount numeric NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  reconciliation_status text NOT NULL DEFAULT 'pending',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT cash_settlement_items_amount_check
    CHECK (gross_amount >= 0 AND fee_amount >= 0 AND net_amount >= 0),
  CONSTRAINT cash_settlement_items_status_check
    CHECK (reconciliation_status IN ('pending','matched','mismatch','approved','rejected')),
  CONSTRAINT cash_settlement_items_order_unique UNIQUE (settlement_id, order_id)
);

CREATE INDEX IF NOT EXISTS cash_settlement_items_order_idx
  ON cash_settlement_items (order_id, reconciliation_status);

CREATE TABLE IF NOT EXISTS order_financial_adjustments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES orders(id),
  adjustment_type text NOT NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by text,
  approved_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_financial_adjustments_amount_check CHECK (amount <> 0),
  CONSTRAINT order_financial_adjustments_type_check
    CHECK (adjustment_type IN (
      'rounding','discount','shipping','refund','manual_correction'
    ))
);

CREATE INDEX IF NOT EXISTS order_financial_adjustments_order_idx
  ON order_financial_adjustments (order_id, created_at);

INSERT INTO data_source_registry
  (domain, source_name, source_kind, decision_status,
   allowed_for_automated_decisions, canonical_replacement, notes)
VALUES
  ('payments','orders.payment_status','column','reconciliation',false,
   'payment_events','Order status alone is not independent payment evidence.'),
  ('payments','payments','table','legacy',false,
   'payment_events','Existing one-to-one table is empty and cannot represent multiple events.'),
  ('payments','payment_events','ledger','canonical',true,NULL,
   'Canonical append-only payment event ledger.')
ON CONFLICT (domain, source_name) DO UPDATE SET
  source_kind = EXCLUDED.source_kind,
  decision_status = EXCLUDED.decision_status,
  allowed_for_automated_decisions = EXCLUDED.allowed_for_automated_decisions,
  canonical_replacement = EXCLUDED.canonical_replacement,
  notes = EXCLUDED.notes,
  updated_at = now();

CREATE OR REPLACE FUNCTION reject_payment_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'payment events are immutable; create a reversing event instead';
END;
$$;

DROP TRIGGER IF EXISTS payment_events_immutable ON payment_events;
CREATE TRIGGER payment_events_immutable
BEFORE UPDATE OR DELETE ON payment_events
FOR EACH ROW EXECUTE FUNCTION reject_payment_event_mutation();

CREATE OR REPLACE VIEW order_financial_reconciliation AS
WITH paid AS (
  SELECT
    order_id,
    SUM(CASE
      WHEN status='completed'
       AND event_type IN ('capture','cod_received','adjustment') THEN amount
      WHEN status='completed'
       AND event_type IN ('refund','chargeback') THEN -amount
      ELSE 0
    END) AS verified_payment_amount,
    COUNT(*) FILTER (WHERE status='completed') AS completed_event_count
  FROM payment_events
  GROUP BY order_id
),
settled AS (
  SELECT
    order_id,
    SUM(net_amount) FILTER (
      WHERE reconciliation_status IN ('matched','approved')
    ) AS reconciled_settlement_amount
  FROM cash_settlement_items
  GROUP BY order_id
),
adjustments AS (
  SELECT order_id, SUM(amount) AS adjustment_amount
  FROM order_financial_adjustments
  GROUP BY order_id
)
SELECT
  o.id AS order_id,
  o.order_number,
  o.status AS order_status,
  o.payment_status,
  o.cod_received,
  o.financially_counted,
  o.total AS order_total,
  COALESCE(p.verified_payment_amount,0) AS verified_payment_amount,
  COALESCE(s.reconciled_settlement_amount,0) AS reconciled_settlement_amount,
  COALESCE(a.adjustment_amount,0) AS documented_adjustment_amount,
  CASE
    WHEN o.status='delivered'
     AND o.payment_status='pending'
     AND COALESCE(p.verified_payment_amount,0)=0
      THEN 'delivered_without_verified_payment'
    WHEN o.payment_status='paid'
     AND COALESCE(p.verified_payment_amount,0)=0
      THEN 'paid_status_without_payment_event'
    WHEN COALESCE(p.verified_payment_amount,0)>0
     AND o.payment_status<>'paid'
      THEN 'payment_event_without_paid_status'
    WHEN o.cod_received=true
     AND COALESCE(s.reconciled_settlement_amount,0)=0
      THEN 'cod_not_reconciled_to_settlement'
    WHEN o.financially_counted IS NULL
     AND (o.payment_status='paid' OR COALESCE(p.verified_payment_amount,0)>0)
      THEN 'financial_counting_undecided'
    ELSE 'no_conflict_detected'
  END AS reconciliation_reason
FROM orders o
LEFT JOIN paid p ON p.order_id=o.id
LEFT JOIN settled s ON s.order_id=o.id
LEFT JOIN adjustments a ON a.order_id=o.id;

CREATE OR REPLACE VIEW order_financial_reconciliation_queue AS
SELECT *
FROM order_financial_reconciliation
WHERE reconciliation_reason <> 'no_conflict_detected';

CREATE OR REPLACE VIEW manual_invoice_reconciliation_queue AS
SELECT
  mi.id AS invoice_id,
  mi.invoice_no,
  mi.order_id,
  mi.status,
  mi.subtotal,
  mi.discount,
  mi.delivery,
  mi.total,
  (mi.subtotal - mi.discount + mi.delivery) AS calculated_total,
  mi.total - (mi.subtotal - mi.discount + mi.delivery) AS delta,
  CASE
    WHEN mi.order_id IS NOT NULL AND o.id IS NULL
      THEN 'broken_order_link'
    WHEN mi.total <> (mi.subtotal - mi.discount + mi.delivery)
      THEN 'total_formula_mismatch'
    WHEN mi.financially_counted IS NULL
      THEN 'financial_counting_undecided'
    ELSE 'no_conflict_detected'
  END AS reconciliation_reason
FROM manual_invoices mi
LEFT JOIN orders o ON o.id=mi.order_id
WHERE
  (mi.order_id IS NOT NULL AND o.id IS NULL)
  OR mi.total <> (mi.subtotal - mi.discount + mi.delivery)
  OR mi.financially_counted IS NULL;

INSERT INTO database_repair_runs (
  plan_version, migration_name, environment, status,
  executed_by, verification_summary, notes
)
SELECT
  '2026-07-22-v1',
  '20260722_03_payment_reconciliation',
  current_database(),
  'prepared',
  current_user,
  jsonb_build_object(
    'order_financial_conflicts',
      (SELECT COUNT(*) FROM order_financial_reconciliation_queue),
    'manual_invoice_conflicts',
      (SELECT COUNT(*) FROM manual_invoice_reconciliation_queue),
    'payment_events',(SELECT COUNT(*) FROM payment_events)
  ),
  'Payment ledgers created. No payment evidence was inferred from status fields.'
WHERE NOT EXISTS (
  SELECT 1 FROM database_repair_runs
  WHERE migration_name='20260722_03_payment_reconciliation'
    AND environment=current_database()
);
