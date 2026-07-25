-- AQUAVO database repair: procurement lifecycle
-- Date: 2026-07-22
-- Depends on: 20260722_01_inventory_reconciliation.sql

SET lock_timeout = '5s';
SET statement_timeout = '120s';

CREATE TABLE IF NOT EXISTS suppliers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code text NOT NULL UNIQUE,
  legal_name text NOT NULL,
  display_name text NOT NULL,
  country_code text,
  contact_name text,
  email text,
  phone text,
  website text,
  payment_terms text,
  default_currency text NOT NULL DEFAULT 'USD',
  lead_time_days integer,
  minimum_order_value numeric,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_lead_time_check
    CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  CONSTRAINT suppliers_minimum_order_check
    CHECK (minimum_order_value IS NULL OR minimum_order_value >= 0)
);

CREATE TABLE IF NOT EXISTS supplier_products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supplier_id text NOT NULL REFERENCES suppliers(id),
  product_id text NOT NULL REFERENCES products(id),
  variant_id text,
  supplier_sku text,
  manufacturer_part_number text,
  supplier_product_name text,
  unit_of_measure text NOT NULL DEFAULT 'unit',
  pack_size numeric NOT NULL DEFAULT 1,
  minimum_order_quantity numeric,
  last_quoted_unit_cost numeric,
  currency text NOT NULL DEFAULT 'USD',
  lead_time_days integer,
  is_preferred boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_products_variant_fk
    FOREIGN KEY (product_id, variant_id)
    REFERENCES product_variant_reconciliation(product_id, variant_id),
  CONSTRAINT supplier_products_pack_size_check CHECK (pack_size > 0),
  CONSTRAINT supplier_products_moq_check
    CHECK (minimum_order_quantity IS NULL OR minimum_order_quantity > 0),
  CONSTRAINT supplier_products_cost_check
    CHECK (last_quoted_unit_cost IS NULL OR last_quoted_unit_cost >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_products_identity_unique_idx
  ON supplier_products (
    supplier_id,
    product_id,
    COALESCE(variant_id,''),
    COALESCE(supplier_sku,'')
  );

CREATE INDEX IF NOT EXISTS supplier_products_product_idx
  ON supplier_products (product_id, variant_id, is_active);

CREATE TABLE IF NOT EXISTS supplier_quotes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supplier_id text NOT NULL REFERENCES suppliers(id),
  quote_number text,
  quoted_at timestamptz NOT NULL,
  valid_until timestamptz,
  currency text NOT NULL,
  incoterm text,
  shipping_method text,
  shipping_cost numeric,
  customs_cost numeric,
  other_cost numeric,
  status text NOT NULL DEFAULT 'draft',
  source_document_url text,
  source_document_hash text,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_quotes_date_check
    CHECK (valid_until IS NULL OR valid_until >= quoted_at),
  CONSTRAINT supplier_quotes_costs_check
    CHECK (
      COALESCE(shipping_cost,0) >= 0
      AND COALESCE(customs_cost,0) >= 0
      AND COALESCE(other_cost,0) >= 0
    ),
  CONSTRAINT supplier_quotes_status_check
    CHECK (status IN ('draft','received','approved','rejected','expired','converted'))
);

CREATE TABLE IF NOT EXISTS supplier_quote_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  quote_id text NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,
  supplier_product_id text REFERENCES supplier_products(id),
  product_id text NOT NULL REFERENCES products(id),
  variant_id text,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL,
  pack_size numeric NOT NULL DEFAULT 1,
  line_total numeric NOT NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT supplier_quote_items_variant_fk
    FOREIGN KEY (product_id, variant_id)
    REFERENCES product_variant_reconciliation(product_id, variant_id),
  CONSTRAINT supplier_quote_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT supplier_quote_items_cost_check CHECK (unit_cost >= 0),
  CONSTRAINT supplier_quote_items_pack_check CHECK (pack_size > 0),
  CONSTRAINT supplier_quote_items_total_check CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS supplier_quote_items_quote_idx
  ON supplier_quote_items (quote_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_order_number text NOT NULL UNIQUE,
  supplier_id text NOT NULL REFERENCES suppliers(id),
  source_quote_id text REFERENCES supplier_quotes(id),
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  customs_cost numeric NOT NULL DEFAULT 0,
  other_cost numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  ordered_at timestamptz,
  expected_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_orders_status_check
    CHECK (status IN (
      'draft','pending_approval','approved','ordered',
      'partially_received','received','cancelled','closed'
    )),
  CONSTRAINT purchase_orders_cost_check
    CHECK (
      subtotal >= 0
      AND shipping_cost >= 0
      AND customs_cost >= 0
      AND other_cost >= 0
      AND total >= 0
    ),
  CONSTRAINT purchase_orders_expected_check
    CHECK (expected_at IS NULL OR ordered_at IS NULL OR expected_at >= ordered_at)
);

CREATE INDEX IF NOT EXISTS purchase_orders_supplier_status_idx
  ON purchase_orders (supplier_id, status, created_at);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_order_id text NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supplier_product_id text REFERENCES supplier_products(id),
  product_id text NOT NULL REFERENCES products(id),
  variant_id text,
  ordered_quantity numeric NOT NULL,
  received_quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL,
  line_total numeric NOT NULL,
  unit_of_measure text NOT NULL DEFAULT 'unit',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT purchase_order_items_variant_fk
    FOREIGN KEY (product_id, variant_id)
    REFERENCES product_variant_reconciliation(product_id, variant_id),
  CONSTRAINT purchase_order_items_quantity_check
    CHECK (ordered_quantity > 0 AND received_quantity >= 0),
  CONSTRAINT purchase_order_items_received_check
    CHECK (received_quantity <= ordered_quantity),
  CONSTRAINT purchase_order_items_cost_check
    CHECK (unit_cost >= 0 AND line_total >= 0)
);

CREATE INDEX IF NOT EXISTS purchase_order_items_po_idx
  ON purchase_order_items (purchase_order_id);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  receipt_number text NOT NULL UNIQUE,
  purchase_order_id text NOT NULL REFERENCES purchase_orders(id),
  location_id text NOT NULL REFERENCES inventory_locations(id),
  status text NOT NULL DEFAULT 'draft',
  received_at timestamptz,
  carrier text,
  tracking_number text,
  received_by text,
  verified_by text,
  verified_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goods_receipts_status_check
    CHECK (status IN ('draft','received','verified','posted','rejected','cancelled'))
);

CREATE INDEX IF NOT EXISTS goods_receipts_po_idx
  ON goods_receipts (purchase_order_id, status);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goods_receipt_id text NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id text NOT NULL REFERENCES purchase_order_items(id),
  product_id text NOT NULL REFERENCES products(id),
  variant_id text,
  accepted_quantity numeric NOT NULL DEFAULT 0,
  damaged_quantity numeric NOT NULL DEFAULT 0,
  missing_quantity numeric NOT NULL DEFAULT 0,
  rejected_quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric,
  lot_number text,
  expiry_date date,
  inventory_movement_id text REFERENCES inventory_movements(id),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT goods_receipt_items_variant_fk
    FOREIGN KEY (product_id, variant_id)
    REFERENCES product_variant_reconciliation(product_id, variant_id),
  CONSTRAINT goods_receipt_items_quantities_check
    CHECK (
      accepted_quantity >= 0
      AND damaged_quantity >= 0
      AND missing_quantity >= 0
      AND rejected_quantity >= 0
    ),
  CONSTRAINT goods_receipt_items_nonempty_check
    CHECK (
      accepted_quantity + damaged_quantity + missing_quantity + rejected_quantity > 0
    ),
  CONSTRAINT goods_receipt_items_cost_check
    CHECK (unit_cost IS NULL OR unit_cost >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS goods_receipt_items_po_item_unique_idx
  ON goods_receipt_items (goods_receipt_id, purchase_order_item_id);

CREATE TABLE IF NOT EXISTS landed_cost_allocations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_order_id text NOT NULL REFERENCES purchase_orders(id),
  purchase_order_item_id text REFERENCES purchase_order_items(id),
  allocation_type text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  allocation_method text NOT NULL,
  exchange_rate_to_iqd numeric,
  allocated_amount_iqd numeric,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landed_cost_allocations_amount_check CHECK (amount >= 0),
  CONSTRAINT landed_cost_allocations_rate_check
    CHECK (exchange_rate_to_iqd IS NULL OR exchange_rate_to_iqd > 0),
  CONSTRAINT landed_cost_allocations_method_check
    CHECK (allocation_method IN ('quantity','weight','volume','value','manual'))
);

CREATE INDEX IF NOT EXISTS landed_cost_allocations_po_idx
  ON landed_cost_allocations (purchase_order_id, purchase_order_item_id);

CREATE OR REPLACE FUNCTION post_goods_receipt(receipt_id text, actor text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  receipt_record record;
  item_record record;
  movement_id text;
  movement_key text;
BEGIN
  SELECT id, purchase_order_id, location_id, status, received_at
    INTO receipt_record
  FROM goods_receipts
  WHERE id=receipt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'goods receipt % not found', receipt_id;
  END IF;

  IF receipt_record.status='posted' THEN
    RETURN;
  END IF;

  IF receipt_record.status<>'verified' THEN
    RAISE EXCEPTION 'goods receipt % must be verified before posting', receipt_id;
  END IF;

  FOR item_record IN
    SELECT id, purchase_order_item_id, product_id, variant_id,
           accepted_quantity, unit_cost
    FROM goods_receipt_items
    WHERE goods_receipt_id=receipt_id
    FOR UPDATE
  LOOP
    IF item_record.accepted_quantity > 0 THEN
      IF item_record.accepted_quantity <> trunc(item_record.accepted_quantity) THEN
        RAISE EXCEPTION
          'accepted quantity must be a whole inventory unit for receipt item %',
          item_record.id;
      END IF;

      movement_key := 'goods_receipt_item:' || item_record.id;
      movement_id := NULL;

      INSERT INTO inventory_movements (
        product_id, variant_id, location_id, quantity_delta,
        movement_type, source_type, source_id, idempotency_key,
        unit_cost, currency, happened_at, created_by, metadata
      )
      VALUES (
        item_record.product_id,
        item_record.variant_id,
        receipt_record.location_id,
        item_record.accepted_quantity::integer,
        'purchase_receipt',
        'goods_receipt_item',
        item_record.id,
        movement_key,
        item_record.unit_cost,
        (SELECT currency FROM purchase_orders WHERE id=receipt_record.purchase_order_id),
        COALESCE(receipt_record.received_at,now()),
        actor,
        jsonb_build_object(
          'goods_receipt_id',receipt_id,
          'purchase_order_id',receipt_record.purchase_order_id
        )
      )
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id INTO movement_id;

      IF movement_id IS NULL THEN
        SELECT id INTO movement_id
        FROM inventory_movements
        WHERE idempotency_key=movement_key;
      ELSE
        UPDATE purchase_order_items
        SET received_quantity=received_quantity + item_record.accepted_quantity
        WHERE id=item_record.purchase_order_item_id;
      END IF;

      UPDATE goods_receipt_items
      SET inventory_movement_id=movement_id
      WHERE id=item_record.id
        AND inventory_movement_id IS DISTINCT FROM movement_id;
    END IF;
  END LOOP;

  UPDATE goods_receipts
  SET status='posted',
      verified_at=COALESCE(verified_at,now()),
      verified_by=COALESCE(verified_by,actor),
      updated_at=now()
  WHERE id=receipt_id;

  UPDATE purchase_orders po
  SET status=CASE
        WHEN EXISTS (
          SELECT 1
          FROM purchase_order_items poi
          WHERE poi.purchase_order_id=po.id
            AND poi.received_quantity < poi.ordered_quantity
        ) THEN 'partially_received'
        ELSE 'received'
      END,
      updated_at=now()
  WHERE po.id=receipt_record.purchase_order_id;
END;
$$;

INSERT INTO database_repair_runs (
  plan_version, migration_name, environment, status,
  executed_by, verification_summary, notes
)
SELECT
  '2026-07-22-v1',
  '20260722_02_procurement',
  current_database(),
  'prepared',
  current_user,
  jsonb_build_object(
    'suppliers',(SELECT COUNT(*) FROM suppliers),
    'purchase_orders',(SELECT COUNT(*) FROM purchase_orders),
    'goods_receipts',(SELECT COUNT(*) FROM goods_receipts)
  ),
  'Procurement lifecycle created. No purchasing records were inferred.'
WHERE NOT EXISTS (
  SELECT 1 FROM database_repair_runs
  WHERE migration_name='20260722_02_procurement'
    AND environment=current_database()
);
