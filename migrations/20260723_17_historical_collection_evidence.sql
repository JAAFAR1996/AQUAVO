-- AQUAVO historical collection evidence correction — 2026-07-23
--
-- Order FW-260424-0001 predates the rounded-total field. The application fallback
-- rounded IQD 76,920 to IQD 77,000, while the canonical settlement item proves
-- that the actual customer collection was exactly IQD 76,920.

SET lock_timeout='5s';
SET statement_timeout='30s';

INSERT INTO accounting_manual_adjustments(
  id,entity_type,entity_id,field_name,
  old_value_json,new_value_json,reason,status,
  created_by,approved_by,created_at,approved_at,applied_at,note
)
SELECT
  'owner-rounded-total-fw-260424-0001-20260723',
  'order',o.id,'roundedTotal',
  to_jsonb(o.rounded_total),to_jsonb(csi.gross_amount),
  'Canonical cash-settlement evidence proves the actual collected amount was IQD 76,920. This prevents the legacy fallback from inventing an extra IQD 80.',
  'applied','owner:جعفر','owner:جعفر',now(),now(),now(),
  'Evidence: cash_settlement_items gross_amount for CS-OWNER-CASH-20260723.'
FROM orders o
JOIN cash_settlement_items csi ON csi.order_id=o.id
JOIN cash_settlements cs ON cs.id=csi.settlement_id
WHERE o.id='c5ea24fb-b532-4d03-9d74-9e37587a1cbf'
  AND o.order_number='FW-260424-0001'
  AND o.rounded_total IS NULL
  AND o.total=76920
  AND csi.gross_amount=76920
  AND cs.status='reconciled'
ON CONFLICT(id) DO NOTHING;

UPDATE orders o
SET rounded_total=csi.gross_amount,
    rounding_cashback=0,
    rounding_adjustment_snapshot=0,
    updated_at=now()
FROM cash_settlement_items csi
JOIN cash_settlements cs ON cs.id=csi.settlement_id
WHERE o.id=csi.order_id
  AND o.id='c5ea24fb-b532-4d03-9d74-9e37587a1cbf'
  AND o.order_number='FW-260424-0001'
  AND o.rounded_total IS NULL
  AND o.total=76920
  AND csi.gross_amount=76920
  AND cs.status='reconciled';

DO $$
DECLARE remaining_difference numeric;
BEGIN
  SELECT
    (CASE WHEN o.rounded_total IS NOT NULL
      THEN o.rounded_total
      ELSE round(o.total/250)*250 END)-csi.gross_amount
  INTO remaining_difference
  FROM orders o
  JOIN cash_settlement_items csi ON csi.order_id=o.id
  JOIN cash_settlements cs ON cs.id=csi.settlement_id
  WHERE o.id='c5ea24fb-b532-4d03-9d74-9e37587a1cbf'
    AND cs.status='reconciled';

  IF remaining_difference IS DISTINCT FROM 0::numeric THEN
    RAISE EXCEPTION
      'historical collection correction failed: remaining difference %',
      remaining_difference;
  END IF;
END;
$$;

INSERT INTO database_repair_runs(
  id,plan_version,migration_name,environment,branch_id,status,
  started_at,completed_at,executed_by,migration_hash,
  verification_summary,notes
)
VALUES(
  'run-20260723-historical-collection-evidence','3.1',
  '20260723_17_historical_collection_evidence',
  'production','br-patient-mouse-a4d4cgr4','applied',
  now(),now(),'owner:جعفر','historical-collection-evidence-20260723-v1',
  jsonb_build_object(
    'order_number','FW-260424-0001',
    'actual_collected',76920,
    'removed_fallback_overstatement',80,
    'evidence','cash_settlement_items.gross_amount',
    'restore_branch_id','br-plain-salad-a4vvz2jd'
  ),
  'Historical rounded total aligned to canonical settlement evidence; no customer or settlement amount was invented.'
)
ON CONFLICT(id) DO UPDATE SET
  completed_at=EXCLUDED.completed_at,status=EXCLUDED.status,
  verification_summary=EXCLUDED.verification_summary,
  notes=EXCLUDED.notes;
