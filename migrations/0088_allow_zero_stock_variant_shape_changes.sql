-- 0088_allow_zero_stock_variant_shape_changes.sql
-- Allow variant metadata structure changes only when the absent/present side carries zero stock.
-- Actual quantity changes remain blocked and must flow through inventory_movements.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE version='0087_accounting_carton_adjustment_inventory_reconciliation'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0088_REQUIRES_ACTIVE_0087';
  END IF;
END
$guard$;

CREATE OR REPLACE FUNCTION public.guard_products_inventory_direct_write()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_mode text;
  v_variant_stock_changed boolean := false;
BEGIN
  SELECT value INTO v_mode FROM public.settings WHERE key='inventory_ledger_mode';
  IF COALESCE(v_mode,'off') <> 'enforce' THEN
    RETURN NEW;
  END IF;

  -- Inventory projection trigger writes are internal and must be allowed.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    RAISE EXCEPTION 'DIRECT_INVENTORY_WRITE_BLOCKED: product stock must be changed through inventory_movements';
  END IF;

  WITH oldv AS (
    SELECT
      e->>'id' AS variant_id,
      COALESCE(NULLIF(e->>'stock','')::integer,0) AS stock
    FROM jsonb_array_elements(
      CASE WHEN COALESCE(OLD.has_variants,false)
        THEN COALESCE(OLD.variants,'[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) e
  ),
  newv AS (
    SELECT
      e->>'id' AS variant_id,
      COALESCE(NULLIF(e->>'stock','')::integer,0) AS stock
    FROM jsonb_array_elements(
      CASE WHEN COALESCE(NEW.has_variants,false)
        THEN COALESCE(NEW.variants,'[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) e
  )
  SELECT EXISTS(
    SELECT 1
    FROM oldv o
    FULL OUTER JOIN newv n USING (variant_id)
    WHERE COALESCE(o.stock,0) IS DISTINCT FROM COALESCE(n.stock,0)
  )
  INTO v_variant_stock_changed;

  IF v_variant_stock_changed THEN
    RAISE EXCEPTION 'DIRECT_VARIANT_STOCK_WRITE_BLOCKED: variant stock must be changed through inventory_movements';
  END IF;

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.sync_product_variant_reconciliation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- is_default is current-state metadata. Historical truth remains in
  -- source_snapshot, while inactive rows must not reserve the one-default slot.
  UPDATE product_variant_reconciliation
  SET is_active=false,
      is_default=false,
      updated_at=now()
  WHERE product_id=NEW.id;

  INSERT INTO product_variant_reconciliation(
    product_id,variant_id,label,sku,observed_price,observed_original_price,
    observed_stock,is_default,specifications,source_snapshot,
    reconciliation_status,is_active
  )
  SELECT
    NEW.id,
    x.value->>'id',
    COALESCE(NULLIF(x.value->>'label',''),x.value->>'id'),
    NULLIF(x.value->>'sku',''),
    CASE WHEN NULLIF(x.value->>'price','') IS NULL THEN NULL ELSE (x.value->>'price')::numeric END,
    CASE WHEN NULLIF(x.value->>'originalPrice','') IS NULL THEN NULL ELSE (x.value->>'originalPrice')::numeric END,
    CASE WHEN NULLIF(x.value->>'stock','') IS NULL THEN NULL ELSE (x.value->>'stock')::integer END,
    COALESCE((x.value->>'isDefault')::boolean,false),
    COALESCE(x.value->'specifications','{}'::jsonb),
    x.value,
    CASE
      WHEN NULLIF(x.value->>'stock','') IS NOT NULL AND (x.value->>'stock')::integer<0
        THEN 'conflict'
      ELSE 'pending'
    END,
    true
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(NEW.variants)='array' THEN NEW.variants ELSE '[]'::jsonb END
  ) x(value)
  WHERE NULLIF(x.value->>'id','') IS NOT NULL
  ON CONFLICT(product_id,variant_id) DO UPDATE SET
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
$function$;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0088_allow_zero_stock_variant_shape_changes',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Compare only active variant identities, allow zero-stock shape changes, release inactive default-variant slots, and retain the ledger-only guard for every real active stock quantity change. Runner must normalize checksum to SHA-256(file bytes).'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
