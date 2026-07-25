-- AQUAVO owner rules — 2026-07-23
--
-- Business decisions captured here:
-- 1. The delivery carrier charges IQD 5,000 for every delivered order.
-- 2. Carrier cost is separate from the delivery amount charged to the customer.
-- 3. For variant products, products.stock is a storefront projection equal to
--    the sum of variant stocks; inventory_movements remains canonical.
-- 4. Legacy inventory.quantity_in_stock is historical evidence only.
-- 5. Packaging cost is owner-maintained according to the carton actually used.
-- 6. Confirmed free gifts are valid zero-cost receipts but zero is never a
--    valid reorder price.
--
-- Ledger enforcement intentionally remains OFF until every positive storefront
-- SKU has an approved opening balance.

SET lock_timeout = '5s';
SET statement_timeout = '120s';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_fee numeric;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_carrier_fee_nonnegative_check;
ALTER TABLE orders ADD CONSTRAINT orders_carrier_fee_nonnegative_check
  CHECK (carrier_fee IS NULL OR carrier_fee >= 0) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_carrier_fee_nonnegative_check;

INSERT INTO settings(key,value,updated_at)
VALUES ('carrier_fee','5000',now())
ON CONFLICT(key) DO UPDATE SET value='5000',updated_at=now();

UPDATE orders o
SET carrier_fee=5000,updated_at=now()
WHERE EXISTS (
  SELECT 1
  FROM cash_settlement_items csi
  JOIN cash_settlements cs ON cs.id=csi.settlement_id
  WHERE cs.settlement_number='CS-OWNER-CASH-20260723'
    AND csi.order_id=o.id
);

UPDATE cash_settlement_items csi
SET fee_amount=5000,
    net_amount=csi.gross_amount-5000,
    metadata=COALESCE(csi.metadata,'{}'::jsonb)||jsonb_build_object(
      'owner_confirmed_carrier_fee',5000,
      'owner_confirmed_at',now(),
      'carrier_fee_rule','fixed_5000_per_delivered_order'
    )
WHERE csi.settlement_id=(
  SELECT id FROM cash_settlements
  WHERE settlement_number='CS-OWNER-CASH-20260723'
);

UPDATE cash_settlements cs
SET fees_amount=x.fees,
    net_amount=x.net,
    evidence=COALESCE(cs.evidence,'{}'::jsonb)||jsonb_build_object(
      'owner_confirmed_carrier_fee_per_order',5000,
      'covered_orders',x.items,
      'owner_confirmed_at',now()
    ),
    notes='Owner confirmed the delivery company charges IQD 5,000 for each of the 36 delivered orders. Carrier fees are costs, not AQUAVO revenue.',
    updated_at=now()
FROM (
  SELECT settlement_id,COUNT(*) AS items,
         SUM(fee_amount) AS fees,SUM(net_amount) AS net
  FROM cash_settlement_items
  WHERE settlement_id=(
    SELECT id FROM cash_settlements
    WHERE settlement_number='CS-OWNER-CASH-20260723'
  )
  GROUP BY settlement_id
) x
WHERE cs.id=x.settlement_id;

UPDATE shipping_settlements
SET amount=0,
    notes='Superseded on 2026-07-23: these two IQD 5,000 carrier fees are now included in cash settlement CS-OWNER-CASH-20260723. Preserved as historical evidence; do not count separately.'
WHERE id='shipping-direct-outside-order-20260723';

CREATE OR REPLACE FUNCTION enforce_product_stock_from_variants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE variant_sum bigint;
BEGIN
  IF COALESCE(NEW.has_variants,false)=true THEN
    IF jsonb_typeof(NEW.variants)<>'array' THEN
      RAISE EXCEPTION 'variant product % must have a variants array',NEW.id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(NEW.variants) v
      WHERE NULLIF(v->>'stock','') IS NULL
         OR (v->>'stock')::numeric<0
         OR trunc((v->>'stock')::numeric)<>(v->>'stock')::numeric
    ) THEN
      RAISE EXCEPTION
        'variant stocks for product % must be non-negative whole numbers',NEW.id;
    END IF;

    SELECT COALESCE(SUM((v->>'stock')::bigint),0)
      INTO variant_sum
    FROM jsonb_array_elements(NEW.variants) v;

    NEW.stock:=variant_sum::integer;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_a_enforce_variant_stock_projection ON products;
CREATE TRIGGER products_a_enforce_variant_stock_projection
BEFORE INSERT OR UPDATE OF variants,has_variants ON products
FOR EACH ROW EXECUTE FUNCTION enforce_product_stock_from_variants();

CREATE OR REPLACE FUNCTION project_inventory_movement_to_product_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE main_location text;
DECLARE current_balance bigint;
DECLARE variant_product boolean;
BEGIN
  SELECT id INTO main_location
  FROM inventory_locations
  WHERE code='MAIN' AND is_active=true
  LIMIT 1;

  IF main_location IS NULL OR NEW.location_id<>main_location THEN
    RETURN NEW;
  END IF;

  SELECT has_variants INTO variant_product
  FROM products
  WHERE id=NEW.product_id
  FOR UPDATE;

  SELECT COALESCE(SUM(quantity_delta),0)
    INTO current_balance
  FROM inventory_movements
  WHERE product_id=NEW.product_id
    AND variant_id IS NOT DISTINCT FROM NEW.variant_id
    AND location_id=NEW.location_id;

  IF NEW.variant_id IS NULL THEN
    IF COALESCE(variant_product,false)=false THEN
      UPDATE products
      SET stock=current_balance::integer,updated_at=now()
      WHERE id=NEW.product_id;
    END IF;
  ELSE
    UPDATE products p
    SET variants=(
      SELECT jsonb_agg(
        CASE WHEN elem->>'id'=NEW.variant_id
          THEN jsonb_set(elem,'{stock}',to_jsonb(current_balance::integer),false)
          ELSE elem END
        ORDER BY ord
      )
      FROM jsonb_array_elements(p.variants)
      WITH ORDINALITY AS x(elem,ord)
    ),updated_at=now()
    WHERE p.id=NEW.product_id
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(p.variants) z
        WHERE z->>'id'=NEW.variant_id
      );

    UPDATE product_variant_reconciliation
    SET observed_stock=current_balance::integer,
        approved_canonical_stock=current_balance::integer,
        reconciliation_status='approved',updated_at=now()
    WHERE product_id=NEW.product_id AND variant_id=NEW.variant_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_movements_project_product_stock
  ON inventory_movements;
CREATE TRIGGER inventory_movements_project_product_stock
AFTER INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION project_inventory_movement_to_product_stock();

UPDATE database_repair_findings
SET evidence=COALESCE(evidence,'{}'::jsonb)||jsonb_build_object(
  'negative_variants_before_quarantine',(
    SELECT jsonb_agg(jsonb_build_object(
      'id',v->>'id','label',v->>'label','stock',v->>'stock'
    ))
    FROM products p
    CROSS JOIN LATERAL jsonb_array_elements(p.variants) v
    WHERE p.id='houyi-south-american-sand'
      AND COALESCE(NULLIF(v->>'stock','')::int,0)<0
  ),
  'owner_rule','negative legacy variant availability is quarantined to zero',
  'quarantined_at',now()
)
WHERE finding_code='INV-SOURCE-CONFLICT'
  AND entity_id='houyi-south-american-sand';

UPDATE products p
SET variants=(
  SELECT jsonb_agg(
    CASE WHEN COALESCE(NULLIF(elem->>'stock','')::int,0)<0
      THEN jsonb_set(elem,'{stock}','0'::jsonb,false)
      ELSE elem END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.variants)
  WITH ORDINALITY AS x(elem,ord)
),updated_at=now()
WHERE p.id='houyi-south-american-sand';

UPDATE products p
SET stock=(
  SELECT COALESCE(SUM(COALESCE(NULLIF(v->>'stock','')::int,0)),0)::int
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.variants)='array'
      THEN p.variants ELSE '[]'::jsonb END
  ) v
),updated_at=now()
WHERE p.deleted_at IS NULL AND p.has_variants=true;

CREATE OR REPLACE VIEW inventory_product_source_comparison AS
WITH variant_summary AS (
  SELECT product_id,
         COUNT(*) FILTER (WHERE is_active=true) AS variant_count,
         SUM(COALESCE(observed_stock,0)) FILTER (WHERE is_active=true)
           AS observed_variant_stock_sum,
         MAX(observed_stock) FILTER (WHERE is_active=true AND is_default)
           AS observed_default_variant_stock,
         COUNT(*) FILTER (WHERE is_active=true AND is_default)
           AS default_variant_count,
         COUNT(*) FILTER (WHERE is_active=true AND observed_stock<0)
           AS negative_variant_count
  FROM product_variant_reconciliation
  GROUP BY product_id
),legacy_summary AS (
  SELECT p.id AS product_id,
         MAX(CASE WHEN NULLIF(s.row_data->>'quantity_in_stock','') IS NULL
           THEN NULL
           ELSE (s.row_data->>'quantity_in_stock')::integer END)
           AS observed_legacy_inventory_stock
  FROM inventory_legacy_snapshots s
  JOIN products p ON s.row_data->>'sku'='PROD-'||p.id
  WHERE s.source_table='inventory'
  GROUP BY p.id
)
SELECT p.id AS product_id,p.name,p.has_variants,
       p.stock AS observed_product_stock,
       COALESCE(vs.variant_count,0) AS variant_count,
       vs.observed_variant_stock_sum,
       vs.observed_default_variant_stock,
       COALESCE(vs.default_variant_count,0) AS default_variant_count,
       COALESCE(vs.negative_variant_count,0) AS negative_variant_count,
       ls.observed_legacy_inventory_stock,
       CASE
         WHEN p.has_variants=true AND COALESCE(vs.variant_count,0)=0
           THEN 'missing_variant_rows'
         WHEN COALESCE(vs.negative_variant_count,0)>0
           THEN 'negative_variant_stock'
         WHEN p.has_variants=true
          AND p.stock IS DISTINCT FROM vs.observed_variant_stock_sum
           THEN 'product_variant_mismatch'
         ELSE 'no_conflict_detected'
       END AS reconciliation_reason
FROM products p
LEFT JOIN variant_summary vs ON vs.product_id=p.id
LEFT JOIN legacy_summary ls ON ls.product_id=p.id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW inventory_reconciliation_queue AS
SELECT * FROM inventory_product_source_comparison
WHERE reconciliation_reason<>'no_conflict_detected';

UPDATE data_source_registry
SET decision_status='prohibited',allowed_for_automated_decisions=false,
    canonical_replacement='inventory_movements',
    notes='Owner decision 2026-07-23: legacy inventory.quantity_in_stock is historical evidence only and must never drive availability, purchasing, or profitability.',
    updated_at=now()
WHERE domain='inventory' AND source_name='inventory.quantity_in_stock';

UPDATE data_source_registry
SET decision_status='reconciliation',allowed_for_automated_decisions=false,
    canonical_replacement='inventory_movements',
    notes='Projection for storefront compatibility. Variant products must expose products.stock equal to the sum of variant stock; canonical decisions come from inventory_movements.',
    updated_at=now()
WHERE domain='inventory'
  AND source_name IN ('products.stock','products.variants[*].stock');

UPDATE database_repair_findings f
SET status='resolved',
    resolution_notes=CASE
      WHEN f.observed_value->>'reason'='legacy_product_mismatch'
        THEN 'Resolved by owner decision: the legacy inventory table is historical evidence and is prohibited as a source of truth.'
      ELSE 'Resolved after enforcing non-negative variant stock and products.stock equal to the sum of active variant stocks.'
    END,
    resolved_by='owner:جعفر',resolved_at=now(),
    evidence=COALESCE(f.evidence,'{}'::jsonb)||jsonb_build_object(
      'owner_rule_applied_at',now(),
      'restore_branch_id','br-ancient-morning-a47vz7bu'
    )
WHERE f.finding_code='INV-SOURCE-CONFLICT'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_reconciliation_queue q
    WHERE q.product_id=f.entity_id
  );

INSERT INTO product_cost_history(
  product_id,cost_price,packaging_cost,insert_cost,
  effective_from,note,changed_by
)
SELECT p.id,p.cost_price,COALESCE(p.packaging_cost,0),
       COALESCE(p.insert_cost,0),now(),
       'Owner-confirmed current cost snapshot. Packaging cost is maintained by the owner according to the carton actually used; current value supersedes older carton assumptions.',
       'owner:جعفر'
FROM products p
WHERE p.id='yee-07154'
  AND NOT EXISTS (
    SELECT 1 FROM product_cost_history h
    WHERE h.product_id=p.id
      AND h.cost_price IS NOT DISTINCT FROM p.cost_price
      AND COALESCE(h.packaging_cost,0)
          IS NOT DISTINCT FROM COALESCE(p.packaging_cost,0)
      AND COALESCE(h.insert_cost,0)
          IS NOT DISTINCT FROM COALESCE(p.insert_cost,0)
      AND h.note ILIKE 'Owner-confirmed current cost snapshot%'
  );

UPDATE database_repair_findings
SET status='resolved',
    resolution_notes='Owner confirmed packaging cost is entered according to the carton actually used. Current product packaging cost is authoritative; a matching cost-history snapshot was recorded.',
    resolved_by='owner:جعفر',resolved_at=now(),
    evidence=COALESCE(evidence,'{}'::jsonb)||jsonb_build_object(
      'owner_confirmed_at',now(),
      'packaging_policy','owner_managed_by_carton'
    )
WHERE finding_code='PRODUCT-COST-RECONCILIATION'
  AND entity_id='yee-07154';

UPDATE supplier_products
SET metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object(
      'free_gift',true,'gift_accepted_by_owner',true,
      'valid_reorder_price',false,
      'cost_disposition','accepted_free_gift',
      'owner_confirmed_at',now()
    ),updated_at=now()
WHERE supplier_sku IN ('07140','08116','C4-1117-1')
  AND COALESCE(last_quoted_unit_cost,0)=0;

UPDATE supplier_quote_items sqi
SET metadata=COALESCE(sqi.metadata,'{}'::jsonb)||jsonb_build_object(
      'free_gift',true,'gift_accepted_by_owner',true,
      'valid_reorder_price',false,
      'cost_disposition','accepted_free_gift',
      'owner_confirmed_at',now()
    ),
    notes=concat_ws(' | ',NULLIF(sqi.notes,''),
      'Owner accepted as a free gift; zero is not a valid reorder price.')
FROM supplier_products sp
WHERE sqi.supplier_product_id=sp.id
  AND sp.supplier_sku IN ('07140','08116','C4-1117-1')
  AND sqi.unit_cost=0;

UPDATE database_repair_findings
SET status='resolved',
    resolution_notes='Owner confirmed this zero-cost supplier line is a free gift. Accepted as valid historical receipt; excluded from reorder-price decisions.',
    resolved_by='owner:جعفر',resolved_at=now(),
    evidence=COALESCE(evidence,'{}'::jsonb)||jsonb_build_object(
      'gift_accepted',true,'valid_reorder_price',false,
      'owner_confirmed_at',now()
    )
WHERE finding_code='SUPPLIER-ZERO-COST-LINE'
  AND entity_id IN (
    'YEE-202601050235-07140','YEE-202601050235-08116'
  );

INSERT INTO database_repair_runs(
  id,plan_version,migration_name,environment,branch_id,status,
  started_at,completed_at,executed_by,migration_hash,
  verification_summary,notes
)
VALUES (
  'run-20260723-owner-ledger-rules','3.1',
  '20260723_05_owner_ledger_shipping_cost_rules',
  'production','br-patient-mouse-a4d4cgr4','applied',
  now(),now(),'owner:جعفر','owner-rules-20260723-v1',
  jsonb_build_object(
    'carrier_fee_per_order',5000,'settlement_orders',36,
    'variant_projection_rule',true,'legacy_inventory_prohibited',true,
    'gift_zero_cost_accepted',true,'ledger_enforcement_enabled',false
  ),
  'Owner rules applied. Ledger enforcement remains off because positive storefront SKUs without approved opening balances still exist.'
)
ON CONFLICT(id) DO UPDATE SET
  completed_at=EXCLUDED.completed_at,status=EXCLUDED.status,
  verification_summary=EXCLUDED.verification_summary,
  notes=EXCLUDED.notes;
