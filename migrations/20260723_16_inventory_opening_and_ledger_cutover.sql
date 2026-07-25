-- AQUAVO inventory ledger cutover — owner approved 2026-07-23
--
-- Owner decision:
-- - The current storefront stock (product stock for simple products, variant
--   stock for variant products) is the approved opening balance.
-- - inventory_movements becomes canonical and inventory ledger enforcement is
--   enabled only after exact storefront/ledger equality is reached.
-- - Legacy inventory remains historical evidence only.
--
-- Restore branch before Production execution:
-- br-plain-salad-a4vvz2jd

SET lock_timeout = '5s';
SET statement_timeout = '120s';

UPDATE settings
SET value='off',updated_at=now()
WHERE key='inventory_ledger_mode';

CREATE OR REPLACE FUNCTION set_default_order_carrier_fee()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE configured_fee numeric;
BEGIN
  IF NEW.carrier_fee IS NULL THEN
    SELECT CASE
      WHEN value ~ '^[0-9]+([.][0-9]+)?$' THEN value::numeric
      ELSE 5000
    END
    INTO configured_fee
    FROM settings
    WHERE key='carrier_fee';

    NEW.carrier_fee:=COALESCE(configured_fee,5000);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_default_carrier_fee ON orders;
CREATE TRIGGER orders_set_default_carrier_fee
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION set_default_order_carrier_fee();

WITH main AS (
  SELECT id
  FROM inventory_locations
  WHERE code='MAIN' AND is_active=true
  LIMIT 1
),storefront AS (
  SELECT
    p.id AS product_id,
    v->>'id' AS variant_id,
    COALESCE(NULLIF(v->>'stock','')::int,0) AS displayed_stock
  FROM products p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.variants)='array'
      THEN p.variants ELSE '[]'::jsonb END
  ) v
  WHERE p.deleted_at IS NULL AND p.has_variants=true

  UNION ALL

  SELECT p.id,NULL,p.stock
  FROM products p
  WHERE p.deleted_at IS NULL
    AND COALESCE(p.has_variants,false)=false
),canonical AS (
  SELECT product_id,variant_id,SUM(quantity_delta)::int AS ledger_stock
  FROM inventory_movements
  WHERE location_id=(SELECT id FROM main)
  GROUP BY product_id,variant_id
),adjustments AS (
  SELECT
    s.product_id,s.variant_id,s.displayed_stock,
    COALESCE(c.ledger_stock,0) AS ledger_stock,
    s.displayed_stock-COALESCE(c.ledger_stock,0) AS delta,
    (SELECT id FROM main) AS location_id
  FROM storefront s
  LEFT JOIN canonical c
    ON c.product_id=s.product_id
   AND c.variant_id IS NOT DISTINCT FROM s.variant_id
  WHERE s.displayed_stock-COALESCE(c.ledger_stock,0)>0
)
INSERT INTO inventory_movements(
  id,product_id,variant_id,location_id,quantity_delta,
  movement_type,source_type,source_id,idempotency_key,
  currency,happened_at,metadata,created_by,created_at
)
SELECT
  gen_random_uuid()::text,
  a.product_id,a.variant_id,a.location_id,a.delta,
  'opening_balance','owner_approved_storefront_opening',
  a.product_id||':'||COALESCE(a.variant_id,'base'),
  'owner-opening:20260723:'||a.product_id||':'||COALESCE(a.variant_id,'base'),
  'IQD',now(),
  jsonb_build_object(
    'owner_approved',true,
    'owner','جعفر',
    'displayed_stock',a.displayed_stock,
    'ledger_stock_before',a.ledger_stock,
    'opening_delta',a.delta,
    'restore_branch_id','br-plain-salad-a4vvz2jd',
    'decision','current storefront product/variant stock is the approved opening balance'
  ),
  'owner:جعفر',now()
FROM adjustments a
ON CONFLICT(idempotency_key) DO NOTHING;

WITH storefront AS (
  SELECT
    p.id AS product_id,
    v->>'id' AS variant_id,
    COALESCE(NULLIF(v->>'stock','')::int,0) AS displayed_stock
  FROM products p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.variants)='array'
      THEN p.variants ELSE '[]'::jsonb END
  ) v
  WHERE p.deleted_at IS NULL AND p.has_variants=true
)
UPDATE product_variant_reconciliation pvr
SET observed_stock=s.displayed_stock,
    approved_canonical_stock=s.displayed_stock,
    reconciliation_status='approved',
    reconciliation_notes='Owner approved the current storefront variant stock as canonical opening stock on 2026-07-23.',
    approved_by='owner:جعفر',approved_at=now(),updated_at=now()
FROM storefront s
WHERE pvr.product_id=s.product_id
  AND pvr.variant_id=s.variant_id
  AND pvr.is_active=true;

WITH main AS (
  SELECT id
  FROM inventory_locations
  WHERE code='MAIN' AND is_active=true
  LIMIT 1
),storefront AS (
  SELECT
    p.id AS product_id,
    v->>'id' AS variant_id,
    COALESCE(NULLIF(v->>'stock','')::int,0) AS displayed_stock
  FROM products p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.variants)='array'
      THEN p.variants ELSE '[]'::jsonb END
  ) v
  WHERE p.deleted_at IS NULL AND p.has_variants=true

  UNION ALL

  SELECT p.id,NULL,p.stock
  FROM products p
  WHERE p.deleted_at IS NULL
    AND COALESCE(p.has_variants,false)=false
),canonical AS (
  SELECT product_id,variant_id,SUM(quantity_delta)::int AS ledger_stock
  FROM inventory_movements
  WHERE location_id=(SELECT id FROM main)
  GROUP BY product_id,variant_id
)
UPDATE inventory_reconciliations r
SET physical_count=s.displayed_stock,
    approved_opening_stock=s.displayed_stock,
    status='applied',
    evidence=COALESCE(r.evidence,'{}'::jsonb)||jsonb_build_object(
      'owner_approved',true,
      'owner','جعفر',
      'approved_at',now(),
      'approved_source','current_storefront_stock',
      'canonical_stock_after',COALESCE(c.ledger_stock,0),
      'zero_balance_requires_no_movement',s.displayed_stock=0,
      'restore_branch_id','br-plain-salad-a4vvz2jd'
    ),
    notes='Owner approved current storefront stock as the opening balance; legacy inventory is excluded from truth.',
    counted_by='owner:جعفر',counted_at=now(),
    approved_by='owner:جعفر',approved_at=now(),updated_at=now()
FROM storefront s
LEFT JOIN canonical c
  ON c.product_id=s.product_id
 AND c.variant_id IS NOT DISTINCT FROM s.variant_id
WHERE r.product_id=s.product_id
  AND r.variant_id IS NOT DISTINCT FROM s.variant_id
  AND r.location_id=(SELECT id FROM main)
  AND r.status IN ('pending','count_required','counted','approved')
  AND COALESCE(c.ledger_stock,0)=s.displayed_stock;

UPDATE database_repair_findings
SET status='resolved',
    resolution_notes='Owner approved current product/variant storefront stock as canonical opening balance and enabled the inventory ledger. Legacy inventory remains historical only.',
    resolved_by='owner:جعفر',resolved_at=now(),
    evidence=COALESCE(evidence,'{}'::jsonb)||jsonb_build_object(
      'ledger_cutover','enforce',
      'owner_approved_at',now(),
      'restore_branch_id','br-plain-salad-a4vvz2jd'
    )
WHERE domain='inventory'
  AND status<>'resolved'
  AND finding_code IN (
    'INV-SOURCE-CONFLICT',
    'INV-RECONCILIATION-REQUIRED',
    'INVENTORY-OPENING-BALANCE-REQUIRED'
  );

DO $$
DECLARE mismatch_count bigint;
BEGIN
  WITH main AS (
    SELECT id
    FROM inventory_locations
    WHERE code='MAIN' AND is_active=true
    LIMIT 1
  ),storefront AS (
    SELECT p.id AS product_id,v->>'id' AS variant_id,
           COALESCE(NULLIF(v->>'stock','')::int,0) AS displayed_stock
    FROM products p
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(p.variants)='array'
        THEN p.variants ELSE '[]'::jsonb END
    ) v
    WHERE p.deleted_at IS NULL AND p.has_variants=true

    UNION ALL

    SELECT p.id,NULL,p.stock
    FROM products p
    WHERE p.deleted_at IS NULL
      AND COALESCE(p.has_variants,false)=false
  ),canonical AS (
    SELECT product_id,variant_id,SUM(quantity_delta)::int AS ledger_stock
    FROM inventory_movements
    WHERE location_id=(SELECT id FROM main)
    GROUP BY product_id,variant_id
  )
  SELECT COUNT(*)
    INTO mismatch_count
  FROM storefront s
  LEFT JOIN canonical c
    ON c.product_id=s.product_id
   AND c.variant_id IS NOT DISTINCT FROM s.variant_id
  WHERE s.displayed_stock<>COALESCE(c.ledger_stock,0);

  IF mismatch_count<>0 THEN
    RAISE EXCEPTION
      'inventory ledger cutover aborted: % storefront/ledger mismatches remain',
      mismatch_count;
  END IF;
END;
$$;

UPDATE settings
SET value='enforce',updated_at=now()
WHERE key='inventory_ledger_mode';

INSERT INTO database_repair_runs(
  id,plan_version,migration_name,environment,branch_id,status,
  started_at,completed_at,executed_by,migration_hash,
  verification_summary,notes
)
VALUES (
  'run-20260723-ledger-cutover','3.1',
  '20260723_16_inventory_opening_and_ledger_cutover',
  'production','br-patient-mouse-a4d4cgr4','applied',
  now(),now(),'owner:جعفر','ledger-cutover-20260723-v1',
  jsonb_build_object(
    'owner_opening_rows',(
      SELECT COUNT(*) FROM inventory_movements
      WHERE source_type='owner_approved_storefront_opening'
    ),
    'owner_opening_units',(
      SELECT COALESCE(SUM(quantity_delta),0) FROM inventory_movements
      WHERE source_type='owner_approved_storefront_opening'
    ),
    'ledger_mode',(
      SELECT value FROM settings WHERE key='inventory_ledger_mode'
    ),
    'restore_branch_id','br-plain-salad-a4vvz2jd'
  ),
  'Owner approved current storefront stock as canonical opening stock. Ledger enforcement enabled after exact balance verification.'
)
ON CONFLICT(id) DO UPDATE SET
  completed_at=EXCLUDED.completed_at,
  status=EXCLUDED.status,
  verification_summary=EXCLUDED.verification_summary,
  notes=EXCLUDED.notes;
