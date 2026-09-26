-- 0088_allow_zero_stock_variant_shape_changes_rollback.sql
BEGIN;

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
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    RAISE EXCEPTION 'DIRECT_INVENTORY_WRITE_BLOCKED: product stock must be changed through inventory_movements';
  END IF;
  WITH oldv AS (
    SELECT e->>'id' AS variant_id, COALESCE(NULLIF(e->>'stock','')::integer,0) AS stock
    FROM jsonb_array_elements(COALESCE(OLD.variants,'[]'::jsonb)) e
  ),
  newv AS (
    SELECT e->>'id' AS variant_id, COALESCE(NULLIF(e->>'stock','')::integer,0) AS stock
    FROM jsonb_array_elements(COALESCE(NEW.variants,'[]'::jsonb)) e
  )
  SELECT EXISTS(
    SELECT 1
    FROM oldv o
    FULL OUTER JOIN newv n USING (variant_id)
    WHERE o.stock IS DISTINCT FROM n.stock
  )
  INTO v_variant_stock_changed;
  IF v_variant_stock_changed THEN
    RAISE EXCEPTION 'DIRECT_VARIANT_STOCK_WRITE_BLOCKED: variant stock must be changed through inventory_movements';
  END IF;
  RETURN NEW;
END;
$function$;

COMMIT;
