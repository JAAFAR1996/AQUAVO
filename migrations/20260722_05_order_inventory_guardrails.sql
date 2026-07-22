-- AQUAVO database repair: database-side order inventory guardrails
-- Date: 2026-07-22
-- Depends on migrations 01-04.
-- Remains disabled until settings.inventory_ledger_mode is explicitly set to enforce.

ALTER TABLE product_variant_reconciliation
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

INSERT INTO settings (key,value,updated_at)
VALUES
  ('inventory_ledger_mode','off',now()),
  ('payment_ledger_enabled','false',now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION sync_product_variant_reconciliation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE product_variant_reconciliation
  SET is_active=false, updated_at=now()
  WHERE product_id=NEW.id;

  INSERT INTO product_variant_reconciliation (
    product_id, variant_id, label, sku,
    observed_price, observed_original_price, observed_stock,
    is_default, specifications, source_snapshot,
    reconciliation_status, is_active
  )
  SELECT
    NEW.id,
    x.value->>'id',
    COALESCE(NULLIF(x.value->>'label',''),x.value->>'id'),
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
       AND (x.value->>'stock')::integer<0 THEN 'conflict'
      ELSE 'pending'
    END,
    true
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(NEW.variants)='array'
      THEN NEW.variants ELSE '[]'::jsonb END
  ) x(value)
  WHERE NULLIF(x.value->>'id','') IS NOT NULL
  ON CONFLICT (product_id,variant_id) DO UPDATE SET
    label=EXCLUDED.label,
    sku=EXCLUDED.sku,
    observed_price=EXCLUDED.observed_price,
    observed_original_price=EXCLUDED.observed_original_price,
    observed_stock=EXCLUDED.observed_stock,
    is_default=EXCLUDED.is_default,
    specifications=EXCLUDED.specifications,
    source_snapshot=EXCLUDED.source_snapshot,
    is_active=true,
    reconciliation_status=CASE
      WHEN product_variant_reconciliation.reconciliation_status='approved'
        THEN product_variant_reconciliation.reconciliation_status
      ELSE EXCLUDED.reconciliation_status
    END,
    updated_at=now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_sync_variant_reconciliation ON products;
CREATE TRIGGER products_sync_variant_reconciliation
AFTER INSERT OR UPDATE OF variants ON products
FOR EACH ROW EXECUTE FUNCTION sync_product_variant_reconciliation();

CREATE OR REPLACE FUNCTION record_order_item_inventory_sale()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  mode text;
  main_location text;
  line_variant text;
BEGIN
  SELECT value INTO mode FROM settings WHERE key='inventory_ledger_mode';
  IF COALESCE(mode,'off')<>'enforce' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO main_location
  FROM inventory_locations
  WHERE code='MAIN' AND is_active=true
  LIMIT 1;

  IF main_location IS NULL THEN
    RAISE EXCEPTION 'MAIN inventory location is not configured';
  END IF;

  line_variant:=NULLIF(NEW.metadata->>'variantId','');

  INSERT INTO inventory_movements (
    product_id,variant_id,location_id,quantity_delta,
    movement_type,source_type,source_id,idempotency_key,
    currency,happened_at,created_by,metadata
  )
  VALUES (
    NEW.product_id,line_variant,main_location,-NEW.quantity,
    'sale','order_line',NEW.order_id,'order_item:'||NEW.id,
    'IQD',now(),'database_trigger',
    jsonb_build_object('order_id',NEW.order_id,'order_item_id',NEW.id)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_record_inventory_sale ON order_items_relational;
CREATE TRIGGER order_items_record_inventory_sale
AFTER INSERT ON order_items_relational
FOR EACH ROW EXECUTE FUNCTION record_order_item_inventory_sale();

CREATE OR REPLACE FUNCTION reverse_order_inventory_on_terminal_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  mode text;
  main_location text;
  item_row record;
  line_variant text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT value INTO mode FROM settings WHERE key='inventory_ledger_mode';
  IF COALESCE(mode,'off')<>'enforce' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN (
    'cancelled','rejected','rejected_returned','rejected_carrier','returned'
  ) THEN
    IF OLD.status IN (
      'cancelled','rejected','rejected_returned','rejected_carrier','returned'
    ) AND EXISTS (
      SELECT 1 FROM inventory_movements
      WHERE source_type='order_status_reversal' AND source_id=NEW.id
    ) THEN
      RAISE EXCEPTION
        'order % inventory was reversed; reopening requires an explicit inventory workflow',
        NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  SELECT id INTO main_location
  FROM inventory_locations
  WHERE code='MAIN' AND is_active=true
  LIMIT 1;

  FOR item_row IN
    SELECT oi.id,oi.product_id,oi.quantity,oi.metadata
    FROM order_items_relational oi
    WHERE oi.order_id=NEW.id
  LOOP
    IF EXISTS (
      SELECT 1 FROM inventory_movements
      WHERE idempotency_key='order_item:'||item_row.id
    ) THEN
      line_variant:=NULLIF(item_row.metadata->>'variantId','');

      INSERT INTO inventory_movements (
        product_id,variant_id,location_id,quantity_delta,
        movement_type,source_type,source_id,idempotency_key,
        currency,happened_at,created_by,metadata
      )
      VALUES (
        item_row.product_id,line_variant,main_location,item_row.quantity,
        'sale_reversal','order_status_reversal',NEW.id,
        'order_reversal:'||NEW.id||':'||item_row.id,
        'IQD',now(),'database_trigger',
        jsonb_build_object(
          'order_id',NEW.id,
          'order_item_id',item_row.id,
          'status',NEW.status
        )
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_reverse_inventory_on_terminal_status ON orders;
CREATE TRIGGER orders_reverse_inventory_on_terminal_status
AFTER UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION reverse_order_inventory_on_terminal_status();

CREATE OR REPLACE FUNCTION prevent_audited_order_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status<>'pending'
    OR OLD.payment_status<>'pending'
    OR COALESCE(OLD.cod_received,false)=true
    OR EXISTS (SELECT 1 FROM payment_events WHERE order_id=OLD.id)
    OR EXISTS (SELECT 1 FROM cash_settlement_items WHERE order_id=OLD.id)
    OR EXISTS (
      SELECT 1 FROM inventory_movements
      WHERE source_id=OLD.id
        AND source_type IN ('order_line','order_status_reversal')
    )
  THEN
    RAISE EXCEPTION
      'audited order % cannot be hard-deleted; use a status transition',
      OLD.id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS orders_prevent_audited_hard_delete ON orders;
CREATE TRIGGER orders_prevent_audited_hard_delete
BEFORE DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION prevent_audited_order_hard_delete();

REVOKE ALL ON FUNCTION sync_product_variant_reconciliation() FROM PUBLIC;
REVOKE ALL ON FUNCTION record_order_item_inventory_sale() FROM PUBLIC;
REVOKE ALL ON FUNCTION reverse_order_inventory_on_terminal_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION prevent_audited_order_hard_delete() FROM PUBLIC;
