-- AQUAVO database repair: inventory reconciliation foundation
-- Date: 2026-07-22
-- Non-destructive: existing product and legacy inventory rows are not updated or deleted.

SET lock_timeout = '5s';
SET statement_timeout = '120s';

CREATE TABLE IF NOT EXISTS data_source_registry (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  domain text NOT NULL,
  source_name text NOT NULL,
  source_kind text NOT NULL,
  decision_status text NOT NULL,
  allowed_for_automated_decisions boolean NOT NULL DEFAULT false,
  canonical_replacement text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_source_registry_unique UNIQUE (domain, source_name),
  CONSTRAINT data_source_registry_status_check
    CHECK (decision_status IN ('canonical','reconciliation','legacy','prohibited'))
);

CREATE TABLE IF NOT EXISTS database_repair_runs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  plan_version text NOT NULL,
  migration_name text NOT NULL,
  environment text NOT NULL,
  branch_id text,
  status text NOT NULL DEFAULT 'prepared',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  executed_by text,
  migration_hash text,
  verification_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  CONSTRAINT database_repair_runs_status_check
    CHECK (status IN ('prepared','running','verified','approved','applied','failed','rolled_back'))
);

CREATE TABLE IF NOT EXISTS database_repair_findings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  repair_run_id text REFERENCES database_repair_runs(id),
  finding_code text NOT NULL,
  severity text NOT NULL,
  domain text NOT NULL,
  entity_type text,
  entity_id text,
  status text NOT NULL DEFAULT 'open',
  observed_value jsonb,
  proposed_value jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution_notes text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT database_repair_findings_severity_check
    CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT database_repair_findings_status_check
    CHECK (status IN ('open','investigating','proposed','approved','resolved','rejected')),
  CONSTRAINT database_repair_findings_unique UNIQUE (finding_code, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS database_repair_findings_status_idx
  ON database_repair_findings (status, severity, domain);

CREATE TABLE IF NOT EXISTS inventory_legacy_snapshots (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_table text NOT NULL,
  source_pk text NOT NULL,
  source_hash text NOT NULL,
  row_data jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by text,
  CONSTRAINT inventory_legacy_snapshots_unique
    UNIQUE (source_table, source_pk, source_hash)
);

CREATE TABLE IF NOT EXISTS product_variant_reconciliation (
  product_id text NOT NULL REFERENCES products(id),
  variant_id text NOT NULL,
  label text NOT NULL,
  sku text,
  observed_price numeric,
  observed_original_price numeric,
  observed_stock integer,
  approved_canonical_stock integer,
  is_default boolean NOT NULL DEFAULT false,
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_snapshot jsonb NOT NULL,
  reconciliation_status text NOT NULL DEFAULT 'pending',
  reconciliation_notes text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, variant_id),
  CONSTRAINT product_variant_reconciliation_stock_check
    CHECK (approved_canonical_stock IS NULL OR approved_canonical_stock >= 0),
  CONSTRAINT product_variant_reconciliation_status_check
    CHECK (reconciliation_status IN ('pending','conflict','counted','approved','rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS product_variant_one_default_idx
  ON product_variant_reconciliation (product_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS product_variant_reconciliation_status_idx
  ON product_variant_reconciliation (reconciliation_status, product_id);

CREATE TABLE IF NOT EXISTS inventory_locations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  location_type text NOT NULL DEFAULT 'warehouse',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_locations_type_check
    CHECK (location_type IN ('warehouse','store','in_transit','damaged','returns','virtual'))
);

CREATE TABLE IF NOT EXISTS inventory_reconciliations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id text NOT NULL REFERENCES products(id),
  variant_id text,
  location_id text NOT NULL REFERENCES inventory_locations(id),
  observed_product_stock integer,
  observed_variant_stock integer,
  observed_legacy_inventory_stock integer,
  physical_count integer,
  approved_opening_stock integer,
  status text NOT NULL DEFAULT 'pending',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  counted_by text,
  counted_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_reconciliations_variant_fk
    FOREIGN KEY (product_id, variant_id)
    REFERENCES product_variant_reconciliation(product_id, variant_id),
  CONSTRAINT inventory_reconciliations_physical_check
    CHECK (physical_count IS NULL OR physical_count >= 0),
  CONSTRAINT inventory_reconciliations_opening_check
    CHECK (approved_opening_stock IS NULL OR approved_opening_stock >= 0),
  CONSTRAINT inventory_reconciliations_status_check
    CHECK (status IN ('pending','count_required','counted','approved','rejected','applied'))
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_reconciliations_active_unique_idx
  ON inventory_reconciliations (product_id, COALESCE(variant_id, ''), location_id)
  WHERE status IN ('pending','count_required','counted','approved');

CREATE TABLE IF NOT EXISTS inventory_movements (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id text NOT NULL REFERENCES products(id),
  variant_id text,
  location_id text NOT NULL REFERENCES inventory_locations(id),
  quantity_delta integer NOT NULL,
  movement_type text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  idempotency_key text NOT NULL UNIQUE,
  unit_cost numeric,
  currency text NOT NULL DEFAULT 'IQD',
  happened_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_movement_id text REFERENCES inventory_movements(id),
  CONSTRAINT inventory_movements_variant_fk
    FOREIGN KEY (product_id, variant_id)
    REFERENCES product_variant_reconciliation(product_id, variant_id),
  CONSTRAINT inventory_movements_quantity_check CHECK (quantity_delta <> 0),
  CONSTRAINT inventory_movements_type_check
    CHECK (movement_type IN (
      'opening_balance','purchase_receipt','sale','sale_reversal','return_in',
      'return_out','damage','loss','transfer_in','transfer_out','manual_adjustment'
    ))
);

CREATE INDEX IF NOT EXISTS inventory_movements_balance_idx
  ON inventory_movements (product_id, variant_id, location_id, happened_at);

CREATE INDEX IF NOT EXISTS inventory_movements_source_idx
  ON inventory_movements (source_type, source_id);

INSERT INTO data_source_registry
  (domain, source_name, source_kind, decision_status,
   allowed_for_automated_decisions, canonical_replacement, notes)
VALUES
  ('inventory','products.stock','column','reconciliation',false,
   'inventory_movements','Product-level stock conflicts with variant and legacy inventory values.'),
  ('inventory','products.variants[*].stock','jsonb','legacy',false,
   'product_variant_reconciliation + inventory_movements','Copied as observed evidence; not approved canonical stock.'),
  ('inventory','inventory.quantity_in_stock','table_column','prohibited',false,
   'inventory_movements','Legacy table has incompatible product identifiers and confirmed discrepancies.'),
  ('inventory','inventory_movements','ledger','canonical',true,NULL,
   'Canonical stock is derived from approved movement entries.')
ON CONFLICT (domain, source_name) DO UPDATE SET
  source_kind = EXCLUDED.source_kind,
  decision_status = EXCLUDED.decision_status,
  allowed_for_automated_decisions = EXCLUDED.allowed_for_automated_decisions,
  canonical_replacement = EXCLUDED.canonical_replacement,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO inventory_locations (code, name, location_type)
VALUES ('MAIN','Main inventory','warehouse')
ON CONFLICT (code) DO NOTHING;

INSERT INTO inventory_legacy_snapshots
  (source_table, source_pk, source_hash, row_data, captured_by)
SELECT
  'inventory',
  i.id::text,
  md5(to_jsonb(i)::text),
  to_jsonb(i),
  'migration:20260722_01_inventory_reconciliation'
FROM inventory i
ON CONFLICT (source_table, source_pk, source_hash) DO NOTHING;

INSERT INTO product_variant_reconciliation (
  product_id, variant_id, label, sku, observed_price, observed_original_price,
  observed_stock, is_default, specifications, source_snapshot, reconciliation_status
)
SELECT
  p.id,
  x.value->>'id',
  COALESCE(NULLIF(x.value->>'label',''), x.value->>'id'),
  NULLIF(x.value->>'sku',''),
  CASE WHEN NULLIF(x.value->>'price','') IS NULL
    THEN NULL ELSE (x.value->>'price')::numeric END,
  CASE WHEN NULLIF(x.value->>'originalPrice','') IS NULL
    THEN NULL ELSE (x.value->>'originalPrice')::numeric END,
  CASE WHEN NULLIF(x.value->>'stock','') IS NULL
    THEN NULL ELSE (x.value->>'stock')::integer END,
  COALESCE((x.value->>'isDefault')::boolean,false),
  COALESCE(x.value->'specifications','{}'::jsonb),
  x.value,
  CASE
    WHEN NULLIF(x.value->>'stock','') IS NOT NULL
      AND (x.value->>'stock')::integer < 0 THEN 'conflict'
    ELSE 'pending'
  END
FROM products p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(p.variants)='array' THEN p.variants ELSE '[]'::jsonb END
) x(value)
WHERE NULLIF(x.value->>'id','') IS NOT NULL
ON CONFLICT (product_id, variant_id) DO UPDATE SET
  label = EXCLUDED.label,
  sku = EXCLUDED.sku,
  observed_price = EXCLUDED.observed_price,
  observed_original_price = EXCLUDED.observed_original_price,
  observed_stock = EXCLUDED.observed_stock,
  is_default = EXCLUDED.is_default,
  specifications = EXCLUDED.specifications,
  source_snapshot = EXCLUDED.source_snapshot,
  reconciliation_status = CASE
    WHEN product_variant_reconciliation.reconciliation_status='approved'
      THEN product_variant_reconciliation.reconciliation_status
    ELSE EXCLUDED.reconciliation_status
  END,
  updated_at = now();

CREATE OR REPLACE VIEW inventory_canonical_balances AS
SELECT
  product_id,
  variant_id,
  location_id,
  SUM(quantity_delta)::bigint AS canonical_stock,
  MAX(happened_at) AS last_movement_at
FROM inventory_movements
GROUP BY product_id, variant_id, location_id;

CREATE OR REPLACE VIEW inventory_product_source_comparison AS
WITH variant_summary AS (
  SELECT
    product_id,
    COUNT(*) AS variant_count,
    SUM(COALESCE(observed_stock,0)) AS observed_variant_stock_sum,
    MAX(observed_stock) FILTER (WHERE is_default) AS observed_default_variant_stock,
    COUNT(*) FILTER (WHERE is_default) AS default_variant_count,
    COUNT(*) FILTER (WHERE observed_stock < 0) AS negative_variant_count
  FROM product_variant_reconciliation
  GROUP BY product_id
),
legacy_summary AS (
  SELECT
    p.id AS product_id,
    MAX(CASE
      WHEN NULLIF(s.row_data->>'quantity_in_stock','') IS NULL THEN NULL
      ELSE (s.row_data->>'quantity_in_stock')::integer
    END) AS observed_legacy_inventory_stock
  FROM inventory_legacy_snapshots s
  JOIN products p ON s.row_data->>'sku' = 'PROD-' || p.id
  WHERE s.source_table='inventory'
  GROUP BY p.id
)
SELECT
  p.id AS product_id,
  p.name,
  p.has_variants,
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
    WHEN ls.observed_legacy_inventory_stock IS NOT NULL
      AND p.stock IS DISTINCT FROM ls.observed_legacy_inventory_stock
      THEN 'legacy_product_mismatch'
    ELSE 'no_conflict_detected'
  END AS reconciliation_reason
FROM products p
LEFT JOIN variant_summary vs ON vs.product_id=p.id
LEFT JOIN legacy_summary ls ON ls.product_id=p.id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW inventory_reconciliation_queue AS
SELECT *
FROM inventory_product_source_comparison
WHERE reconciliation_reason <> 'no_conflict_detected';

INSERT INTO inventory_reconciliations (
  product_id, variant_id, location_id, observed_product_stock,
  observed_variant_stock, observed_legacy_inventory_stock, status, evidence
)
SELECT
  p.id,
  pvr.variant_id,
  il.id,
  p.stock,
  pvr.observed_stock,
  CASE WHEN NULLIF(s.row_data->>'quantity_in_stock','') IS NULL
    THEN NULL ELSE (s.row_data->>'quantity_in_stock')::integer END,
  CASE
    WHEN pvr.observed_stock < 0
      OR (p.has_variants=true AND p.stock IS DISTINCT FROM vs.variant_stock_sum)
      OR (NULLIF(s.row_data->>'quantity_in_stock','') IS NOT NULL
          AND p.stock IS DISTINCT FROM (s.row_data->>'quantity_in_stock')::integer)
      THEN 'count_required'
    ELSE 'pending'
  END,
  jsonb_build_object(
    'product_stock',p.stock,
    'variant_snapshot',pvr.source_snapshot,
    'legacy_inventory_snapshot',s.row_data
  )
FROM products p
JOIN inventory_locations il ON il.code='MAIN'
LEFT JOIN product_variant_reconciliation pvr ON pvr.product_id=p.id
LEFT JOIN LATERAL (
  SELECT SUM(COALESCE(x.observed_stock,0)) AS variant_stock_sum
  FROM product_variant_reconciliation x
  WHERE x.product_id=p.id
) vs ON true
LEFT JOIN inventory_legacy_snapshots s
  ON s.source_table='inventory'
 AND s.row_data->>'sku'='PROD-' || p.id
WHERE p.deleted_at IS NULL
  AND (
    pvr.variant_id IS NOT NULL
    OR NOT EXISTS (
      SELECT 1 FROM product_variant_reconciliation z WHERE z.product_id=p.id
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_reconciliations r
    WHERE r.product_id=p.id
      AND r.variant_id IS NOT DISTINCT FROM pvr.variant_id
      AND r.location_id=il.id
      AND r.status IN ('pending','count_required','counted','approved')
  );

CREATE OR REPLACE FUNCTION prevent_negative_inventory_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE current_balance bigint;
BEGIN
  SELECT COALESCE(SUM(quantity_delta),0)
    INTO current_balance
  FROM inventory_movements
  WHERE product_id=NEW.product_id
    AND variant_id IS NOT DISTINCT FROM NEW.variant_id
    AND location_id=NEW.location_id;

  IF current_balance + NEW.quantity_delta < 0 THEN
    RAISE EXCEPTION
      'insufficient canonical inventory balance for product %, variant %, location %',
      NEW.product_id, NEW.variant_id, NEW.location_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_movements_prevent_negative ON inventory_movements;
CREATE TRIGGER inventory_movements_prevent_negative
BEFORE INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION prevent_negative_inventory_balance();

CREATE OR REPLACE FUNCTION reject_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'inventory movements are immutable; create a reversal movement instead';
END;
$$;

DROP TRIGGER IF EXISTS inventory_movements_immutable ON inventory_movements;
CREATE TRIGGER inventory_movements_immutable
BEFORE UPDATE OR DELETE ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION reject_inventory_movement_mutation();

INSERT INTO database_repair_runs (
  plan_version, migration_name, environment, status,
  executed_by, verification_summary, notes
)
SELECT
  '2026-07-22-v1',
  '20260722_01_inventory_reconciliation',
  current_database(),
  'prepared',
  current_user,
  jsonb_build_object(
    'variant_rows',(SELECT COUNT(*) FROM product_variant_reconciliation),
    'legacy_snapshots',(SELECT COUNT(*) FROM inventory_legacy_snapshots),
    'reconciliation_rows',(SELECT COUNT(*) FROM inventory_reconciliations),
    'conflict_products',(SELECT COUNT(*) FROM inventory_reconciliation_queue)
  ),
  'Non-destructive inventory foundation. No canonical opening balance was inferred.'
WHERE NOT EXISTS (
  SELECT 1 FROM database_repair_runs
  WHERE migration_name='20260722_01_inventory_reconciliation'
    AND environment=current_database()
);
