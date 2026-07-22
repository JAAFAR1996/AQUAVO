-- AQUAVO database repair: current cost-history baseline
-- Date: 2026-07-22
-- This does not reconstruct historical costs. It records the current known
-- values as a clearly labelled baseline from migration time forward.

INSERT INTO product_cost_history (
  product_id,cost_price,packaging_cost,insert_cost,
  effective_from,note,changed_by
)
SELECT
  p.id,
  p.cost_price,
  COALESCE(p.packaging_cost,0),
  COALESCE(p.insert_cost,0),
  now(),
  'Current-cost baseline captured during database repair; not a historical reconstruction.',
  'migration:20260722_14_cost_history_baseline'
FROM products p
WHERE p.deleted_at IS NULL
  AND COALESCE(p.cost_price,0)>0
  AND NOT EXISTS (
    SELECT 1 FROM product_cost_history h WHERE h.product_id=p.id
  );

CREATE OR REPLACE VIEW product_cost_reconciliation AS
SELECT
  p.id AS product_id,
  p.name,
  p.deleted_at,
  p.cost_price AS current_cost_price,
  p.packaging_cost AS current_packaging_cost,
  p.insert_cost AS current_insert_cost,
  latest.cost_price AS latest_history_cost_price,
  latest.packaging_cost AS latest_history_packaging_cost,
  latest.insert_cost AS latest_history_insert_cost,
  latest.effective_from AS latest_history_effective_from,
  CASE
    WHEN COALESCE(p.cost_price,0)=0 THEN 'zero_current_cost'
    WHEN latest.product_id IS NULL THEN 'missing_cost_history'
    WHEN p.cost_price IS DISTINCT FROM latest.cost_price
      OR COALESCE(p.packaging_cost,0) IS DISTINCT FROM COALESCE(latest.packaging_cost,0)
      OR COALESCE(p.insert_cost,0) IS DISTINCT FROM COALESCE(latest.insert_cost,0)
      THEN 'current_history_mismatch'
    ELSE 'no_conflict_detected'
  END AS reconciliation_reason
FROM products p
LEFT JOIN LATERAL (
  SELECT h.product_id,h.cost_price,h.packaging_cost,h.insert_cost,h.effective_from
  FROM product_cost_history h
  WHERE h.product_id=p.id
  ORDER BY h.effective_from DESC,h.created_at DESC,h.id DESC
  LIMIT 1
) latest ON true
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW product_cost_reconciliation_queue AS
SELECT *
FROM product_cost_reconciliation
WHERE reconciliation_reason<>'no_conflict_detected';

INSERT INTO database_repair_findings (
  finding_code,severity,domain,entity_type,entity_id,status,
  observed_value,evidence
)
SELECT
  'PRODUCT-COST-RECONCILIATION',
  CASE WHEN reconciliation_reason='zero_current_cost' THEN 'high' ELSE 'medium' END,
  'accounting','product',product_id,'open',
  jsonb_build_object(
    'reason',reconciliation_reason,
    'current_cost_price',current_cost_price,
    'current_packaging_cost',current_packaging_cost,
    'current_insert_cost',current_insert_cost,
    'latest_history_cost_price',latest_history_cost_price,
    'latest_history_packaging_cost',latest_history_packaging_cost,
    'latest_history_insert_cost',latest_history_insert_cost,
    'latest_history_effective_from',latest_history_effective_from
  ),
  jsonb_build_object(
    'product_name',name,
    'source_view','product_cost_reconciliation_queue'
  )
FROM product_cost_reconciliation_queue
ON CONFLICT (finding_code,entity_type,entity_id) DO UPDATE SET
  severity=EXCLUDED.severity,
  observed_value=EXCLUDED.observed_value,
  evidence=EXCLUDED.evidence,
  status=CASE WHEN database_repair_findings.status='resolved'
    THEN database_repair_findings.status ELSE 'open' END;
