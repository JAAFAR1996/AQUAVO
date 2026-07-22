-- AQUAVO database repair: order integrity, financial snapshots, and findings
-- Date: 2026-07-22
-- Depends on migrations 01-06.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_subtotal_snapshot numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS formula_total_snapshot numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rounding_adjustment_snapshot numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_formula_version text;

-- Deterministic backfill for historical orders that have no public number.
-- The existing unique constraint remains the final collision guard.
UPDATE orders
SET order_number='FH-'||to_char(created_at,'YYMMDD')||'-'||upper(substr(md5(id),1,8))
WHERE order_number IS NULL OR btrim(order_number)='';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_present_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_order_number_present_check
  CHECK (order_number IS NOT NULL AND btrim(order_number)<>'') NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_order_number_present_check;
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;

CREATE OR REPLACE FUNCTION ensure_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number)='' THEN
    NEW.order_number:=
      'FH-'
      ||to_char(COALESCE(NEW.created_at,now()),'YYMMDD')
      ||'-'
      ||upper(substr(md5(COALESCE(NEW.id,gen_random_uuid()::text)),1,8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_ensure_order_number ON orders;
CREATE TRIGGER orders_ensure_order_number
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION ensure_order_number();

CREATE OR REPLACE FUNCTION refresh_order_financial_snapshot(target_order_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  rel_subtotal numeric;
  json_subtotal numeric;
  selected_subtotal numeric;
BEGIN
  SELECT SUM(total_price)
    INTO rel_subtotal
  FROM order_items_relational
  WHERE order_id=target_order_id;

  SELECT SUM(COALESCE(
    NULLIF(item->>'lineTotal','')::numeric,
    NULLIF(item->>'priceAtPurchase','')::numeric
      *COALESCE(NULLIF(item->>'quantity','')::numeric,1)
  ))
  INTO json_subtotal
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(o.items)='array' THEN o.items ELSE '[]'::jsonb END
  ) item
  WHERE o.id=target_order_id;

  selected_subtotal:=COALESCE(rel_subtotal,json_subtotal,0);

  UPDATE orders
  SET items_subtotal_snapshot=selected_subtotal,
      formula_total_snapshot=
        selected_subtotal+COALESCE(shipping_cost,0)-COALESCE(discount_total,0),
      rounding_adjustment_snapshot=COALESCE(rounded_total,total)-total,
      total_formula_version='v1_subtotal_plus_shipping_minus_discount'
  WHERE id=target_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_order_financial_snapshot_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_order_financial_snapshot(COALESCE(NEW.order_id,OLD.order_id));
  RETURN COALESCE(NEW,OLD);
END;
$$;

DROP TRIGGER IF EXISTS order_items_refresh_financial_snapshot ON order_items_relational;
CREATE TRIGGER order_items_refresh_financial_snapshot
AFTER INSERT OR UPDATE OR DELETE ON order_items_relational
FOR EACH ROW EXECUTE FUNCTION refresh_order_financial_snapshot_trigger();

CREATE OR REPLACE FUNCTION refresh_order_financial_snapshot_from_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_order_financial_snapshot(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_refresh_financial_snapshot ON orders;
CREATE TRIGGER orders_refresh_financial_snapshot
AFTER INSERT OR UPDATE OF total,rounded_total,shipping_cost,discount_total,items ON orders
FOR EACH ROW EXECUTE FUNCTION refresh_order_financial_snapshot_from_order();

SELECT refresh_order_financial_snapshot(id) FROM orders;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_nonnegative_money_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_nonnegative_money_check
  CHECK (
    total>=0
    AND shipping_cost>=0
    AND COALESCE(discount_total,0)>=0
    AND COALESCE(points_discount,0)>=0
    AND COALESCE(items_subtotal_snapshot,0)>=0
    AND COALESCE(formula_total_snapshot,0)>=0
  ) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_nonnegative_money_check;

CREATE OR REPLACE VIEW order_total_reconciliation AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.items_subtotal_snapshot,
  o.shipping_cost,
  o.discount_total,
  o.formula_total_snapshot,
  o.total,
  o.rounded_total,
  o.rounding_adjustment_snapshot,
  o.total-o.formula_total_snapshot AS formula_delta,
  CASE
    WHEN o.items_subtotal_snapshot IS NULL THEN 'missing_snapshot'
    WHEN abs(o.total-o.formula_total_snapshot)>1 THEN 'formula_mismatch'
    WHEN o.rounded_total IS NOT NULL AND o.rounded_total<o.total
      THEN 'rounded_below_total'
    ELSE 'no_conflict_detected'
  END AS reconciliation_reason
FROM orders o;

CREATE OR REPLACE VIEW order_total_reconciliation_queue AS
SELECT *
FROM order_total_reconciliation
WHERE reconciliation_reason<>'no_conflict_detected';

CREATE OR REPLACE FUNCTION validate_product_variants_json()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  duplicate_ids integer;
  default_count integer;
  newly_negative integer;
  newly_invalid_price integer;
BEGIN
  IF NEW.variants IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.variants)<>'array' THEN
    RAISE EXCEPTION 'product variants must be a JSON array';
  END IF;

  SELECT
    COUNT(*)-COUNT(DISTINCT x.value->>'id'),
    COUNT(*) FILTER (WHERE COALESCE((x.value->>'isDefault')::boolean,false))
  INTO duplicate_ids,default_count
  FROM jsonb_array_elements(NEW.variants) x(value)
  WHERE NULLIF(x.value->>'id','') IS NOT NULL;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.variants) x(value)
    WHERE NULLIF(x.value->>'id','') IS NULL
  ) THEN
    RAISE EXCEPTION 'every product variant must have a non-empty id';
  END IF;

  IF duplicate_ids>0 THEN
    RAISE EXCEPTION 'product variants contain duplicate ids';
  END IF;

  IF default_count>1 THEN
    RAISE EXCEPTION 'a product can have at most one default variant';
  END IF;

  IF TG_OP='INSERT' THEN
    SELECT
      COUNT(*) FILTER (
        WHERE NULLIF(x.value->>'stock','') IS NULL
           OR (x.value->>'stock')::numeric<0
           OR trunc((x.value->>'stock')::numeric)<>(x.value->>'stock')::numeric
      ),
      COUNT(*) FILTER (
        WHERE NULLIF(x.value->>'price','') IS NULL
           OR (x.value->>'price')::numeric<=0
      )
    INTO newly_negative,newly_invalid_price
    FROM jsonb_array_elements(NEW.variants) x(value);
  ELSE
    SELECT COUNT(*)
    INTO newly_negative
    FROM jsonb_array_elements(NEW.variants) n(value)
    WHERE (
      NULLIF(n.value->>'stock','') IS NULL
      OR (n.value->>'stock')::numeric<0
      OR trunc((n.value->>'stock')::numeric)<>(n.value->>'stock')::numeric
    )
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(OLD.variants)='array'
          THEN OLD.variants ELSE '[]'::jsonb END
      ) o(value)
      WHERE o.value->>'id'=n.value->>'id'
        AND (
          NULLIF(o.value->>'stock','') IS NULL
          OR (o.value->>'stock')::numeric<0
          OR trunc((o.value->>'stock')::numeric)<>(o.value->>'stock')::numeric
        )
    );

    SELECT COUNT(*)
    INTO newly_invalid_price
    FROM jsonb_array_elements(NEW.variants) n(value)
    WHERE (
      NULLIF(n.value->>'price','') IS NULL
      OR (n.value->>'price')::numeric<=0
    )
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(OLD.variants)='array'
          THEN OLD.variants ELSE '[]'::jsonb END
      ) o(value)
      WHERE o.value->>'id'=n.value->>'id'
        AND (
          NULLIF(o.value->>'price','') IS NULL
          OR (o.value->>'price')::numeric<=0
        )
    );
  END IF;

  IF newly_negative>0 THEN
    RAISE EXCEPTION
      'new or worsened variant stock must be a non-negative whole number';
  END IF;

  IF newly_invalid_price>0 THEN
    RAISE EXCEPTION 'new or worsened variant price must be greater than zero';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_validate_variants_json ON products;
CREATE TRIGGER products_validate_variants_json
BEFORE INSERT OR UPDATE OF variants,has_variants ON products
FOR EACH ROW EXECUTE FUNCTION validate_product_variants_json();

-- New writes are protected immediately; existing broken rows remain visible
-- until their evidence is reviewed and fixed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='orders_coupon_id_coupons_id_fk'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_coupon_id_coupons_id_fk
      FOREIGN KEY (coupon_id) REFERENCES coupons(id) NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='manual_invoices_order_id_orders_id_fk'
  ) THEN
    ALTER TABLE manual_invoices
      ADD CONSTRAINT manual_invoices_order_id_orders_id_fk
      FOREIGN KEY (order_id) REFERENCES orders(id) NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='categories_parent_id_categories_id_fk'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_parent_id_categories_id_fk
      FOREIGN KEY (parent_id) REFERENCES categories(id) NOT VALID;
  END IF;
END
$$;
ALTER TABLE categories
  VALIDATE CONSTRAINT categories_parent_id_categories_id_fk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='cash_flow_order_id_orders_id_fk'
  ) THEN
    ALTER TABLE cash_flow
      ADD CONSTRAINT cash_flow_order_id_orders_id_fk
      FOREIGN KEY (order_id) REFERENCES orders(id) NOT VALID;
  END IF;
END
$$;
ALTER TABLE cash_flow VALIDATE CONSTRAINT cash_flow_order_id_orders_id_fk;

CREATE INDEX IF NOT EXISTS orders_coupon_id_idx ON orders(coupon_id);
CREATE INDEX IF NOT EXISTS manual_invoices_order_id_idx ON manual_invoices(order_id);
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id);
CREATE INDEX IF NOT EXISTS cash_flow_order_id_idx ON cash_flow(order_id);

INSERT INTO database_repair_findings (
  finding_code,severity,domain,entity_type,entity_id,status,
  observed_value,evidence
)
SELECT
  'INV-SOURCE-CONFLICT',
  CASE WHEN reconciliation_reason='negative_variant_stock'
    THEN 'critical' ELSE 'high' END,
  'inventory','product',product_id,'open',
  jsonb_build_object(
    'reason',reconciliation_reason,
    'product_stock',observed_product_stock,
    'variant_stock_sum',observed_variant_stock_sum,
    'legacy_inventory_stock',observed_legacy_inventory_stock
  ),
  jsonb_build_object(
    'source_view','inventory_reconciliation_queue','product_name',name
  )
FROM inventory_reconciliation_queue
ON CONFLICT (finding_code,entity_type,entity_id) DO UPDATE SET
  severity=EXCLUDED.severity,
  observed_value=EXCLUDED.observed_value,
  evidence=EXCLUDED.evidence,
  status=CASE WHEN database_repair_findings.status='resolved'
    THEN database_repair_findings.status ELSE 'open' END;

INSERT INTO database_repair_findings (
  finding_code,severity,domain,entity_type,entity_id,status,
  observed_value,evidence
)
SELECT
  'PAYMENT-RECONCILIATION',
  CASE WHEN reconciliation_reason='delivered_without_verified_payment'
    THEN 'critical' ELSE 'high' END,
  'payments','order',order_id,'open',
  jsonb_build_object(
    'reason',reconciliation_reason,
    'order_status',order_status,
    'payment_status',payment_status,
    'cod_received',cod_received,
    'order_total',order_total,
    'verified_payment_amount',verified_payment_amount,
    'settled_amount',reconciled_settlement_amount
  ),
  jsonb_build_object(
    'order_number',order_number,
    'source_view','order_financial_reconciliation_queue'
  )
FROM order_financial_reconciliation_queue
ON CONFLICT (finding_code,entity_type,entity_id) DO UPDATE SET
  severity=EXCLUDED.severity,
  observed_value=EXCLUDED.observed_value,
  evidence=EXCLUDED.evidence,
  status=CASE WHEN database_repair_findings.status='resolved'
    THEN database_repair_findings.status ELSE 'open' END;

INSERT INTO database_repair_findings (
  finding_code,severity,domain,entity_type,entity_id,status,
  observed_value,evidence
)
SELECT
  'INVOICE-RECONCILIATION',
  CASE WHEN reconciliation_reason='broken_order_link'
    THEN 'high' ELSE 'medium' END,
  'accounting','manual_invoice',invoice_id,'open',
  jsonb_build_object(
    'reason',reconciliation_reason,
    'order_id',order_id,
    'subtotal',subtotal,
    'discount',discount,
    'delivery',delivery,
    'total',total,
    'calculated_total',calculated_total,
    'delta',delta
  ),
  jsonb_build_object(
    'invoice_no',invoice_no,
    'source_view','manual_invoice_reconciliation_queue'
  )
FROM manual_invoice_reconciliation_queue
ON CONFLICT (finding_code,entity_type,entity_id) DO UPDATE SET
  severity=EXCLUDED.severity,
  observed_value=EXCLUDED.observed_value,
  evidence=EXCLUDED.evidence,
  status=CASE WHEN database_repair_findings.status='resolved'
    THEN database_repair_findings.status ELSE 'open' END;

INSERT INTO database_repair_findings (
  finding_code,severity,domain,entity_type,entity_id,status,
  observed_value,evidence
)
SELECT
  'ORDER-TOTAL-RECONCILIATION','high','accounting','order',order_id,'open',
  jsonb_build_object(
    'reason',reconciliation_reason,
    'items_subtotal',items_subtotal_snapshot,
    'shipping_cost',shipping_cost,
    'discount_total',discount_total,
    'formula_total',formula_total_snapshot,
    'stored_total',total,
    'rounded_total',rounded_total,
    'formula_delta',formula_delta
  ),
  jsonb_build_object(
    'order_number',order_number,
    'source_view','order_total_reconciliation_queue'
  )
FROM order_total_reconciliation_queue
ON CONFLICT (finding_code,entity_type,entity_id) DO UPDATE SET
  observed_value=EXCLUDED.observed_value,
  evidence=EXCLUDED.evidence,
  status=CASE WHEN database_repair_findings.status='resolved'
    THEN database_repair_findings.status ELSE 'open' END;

INSERT INTO database_repair_findings (
  finding_code,severity,domain,entity_type,entity_id,status,
  observed_value,evidence
)
SELECT
  'BROKEN-ORDER-COUPON-LINK','medium','catalog','order',o.id,'open',
  jsonb_build_object('coupon_id',o.coupon_id),
  jsonb_build_object('order_number',o.order_number)
FROM orders o
LEFT JOIN coupons c ON c.id=o.coupon_id
WHERE o.coupon_id IS NOT NULL AND c.id IS NULL
ON CONFLICT (finding_code,entity_type,entity_id) DO NOTHING;

REVOKE ALL ON FUNCTION ensure_order_number() FROM PUBLIC;
REVOKE ALL ON FUNCTION refresh_order_financial_snapshot(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION refresh_order_financial_snapshot_trigger() FROM PUBLIC;
REVOKE ALL ON FUNCTION refresh_order_financial_snapshot_from_order() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_product_variants_json() FROM PUBLIC;
