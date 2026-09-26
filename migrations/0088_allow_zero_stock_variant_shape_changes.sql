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

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0088_allow_zero_stock_variant_shape_changes',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Compare only active variant identities (has_variants=true), allow zero-stock shape changes, and retain the ledger-only guard for every real active stock quantity change. Runner must normalize checksum to SHA-256(file bytes).'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
