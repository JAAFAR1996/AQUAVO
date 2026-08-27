-- 0088_variant_stock_ledger_sync_and_oxygen_tube_repair.sql
-- Owner-approved inventory repair on 2026-08-28.
--
-- Problem:
--   The admin variant editor historically wrote products.variants[*].stock
--   directly. The canonical inventory ledger lives in inventory_movements, so a
--   variant could be advertised as in stock while checkout correctly rejected
--   the sale because its canonical balance was lower.
--
-- This migration does two things:
--   1) gives all future direct variant-stock edits a canonical target-set path;
--   2) reconciles houyi-oxygenation-tube to the owner-confirmed physical target
--      of 25 black + 25 white, using delta = target - canonical balance.
--
-- It never blindly adds 25. It aborts on an unexpected product/variant/location
-- shape and verifies both canonical and storefront-projected stock before commit.

BEGIN;

CREATE OR REPLACE FUNCTION public.aquavo_set_variant_stock_target(
  p_product_id text,
  p_variant_id text,
  p_target_stock integer,
  p_source_type text,
  p_source_id text,
  p_created_by text DEFAULT 'system'
) RETURNS integer
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_main_location text;
  v_current bigint;
  v_delta integer;
  v_after bigint;
BEGIN
  IF p_product_id IS NULL OR btrim(p_product_id) = ''
     OR p_variant_id IS NULL OR btrim(p_variant_id) = '' THEN
    RAISE EXCEPTION 'VARIANT_STOCK_TARGET_INVALID_ID';
  END IF;

  IF p_target_stock IS NULL OR p_target_stock < 0 THEN
    RAISE EXCEPTION 'VARIANT_STOCK_TARGET_INVALID_QUANTITY: %', p_target_stock;
  END IF;

  SELECT id INTO v_main_location
  FROM public.inventory_locations
  WHERE code = 'MAIN' AND is_active = true
  ORDER BY id
  LIMIT 1;

  IF v_main_location IS NULL THEN
    RAISE EXCEPTION 'VARIANT_STOCK_TARGET_MAIN_LOCATION_MISSING';
  END IF;

  -- Product row lock serializes an admin target change with checkout's product
  -- locking path. The canonical ledger guard remains the final non-negative
  -- invariant.
  PERFORM 1
  FROM public.products p
  WHERE p.id = p_product_id
    AND p.deleted_at IS NULL
    AND COALESCE(p.has_variants, false) = true
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(p.variants, '[]'::jsonb)) v
      WHERE v->>'id' = p_variant_id
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VARIANT_STOCK_TARGET_VARIANT_NOT_FOUND: product=%, variant=%',
      p_product_id, p_variant_id;
  END IF;

  SELECT COALESCE(SUM(im.quantity_delta), 0)::bigint
  INTO v_current
  FROM public.inventory_movements im
  WHERE im.product_id = p_product_id
    AND im.variant_id IS NOT DISTINCT FROM p_variant_id
    AND im.location_id = v_main_location;

  v_delta := p_target_stock - v_current;

  IF v_delta <> 0 THEN
    INSERT INTO public.inventory_movements(
      product_id,
      variant_id,
      location_id,
      quantity_delta,
      movement_type,
      source_type,
      source_id,
      idempotency_key,
      happened_at,
      created_by,
      metadata
    ) VALUES (
      p_product_id,
      p_variant_id,
      v_main_location,
      v_delta,
      'adjustment',
      p_source_type,
      p_source_id,
      p_source_type || ':' || p_source_id || ':' || p_product_id || ':' || p_variant_id,
      clock_timestamp(),
      p_created_by,
      jsonb_build_object(
        'mode', 'set_target',
        'canonical_before', v_current,
        'target_stock', p_target_stock,
        'delta', v_delta,
        'reason', 'variant stock target reconciled through canonical inventory ledger'
      )
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  SELECT COALESCE(SUM(im.quantity_delta), 0)::bigint
  INTO v_after
  FROM public.inventory_movements im
  WHERE im.product_id = p_product_id
    AND im.variant_id IS NOT DISTINCT FROM p_variant_id
    AND im.location_id = v_main_location;

  IF v_after <> p_target_stock THEN
    RAISE EXCEPTION
      'VARIANT_STOCK_TARGET_POSTCONDITION_FAILED: product=%, variant=%, expected=%, actual=%',
      p_product_id, p_variant_id, p_target_stock, v_after;
  END IF;

  RETURN v_delta;
END
$fn$;

-- Keep the legacy admin variants endpoint safe even before its UI is split into
-- metadata-vs-inventory controls. Only an actual stock-number change produces a
-- ledger movement. Projection updates caused by inventory_movements are nested
-- triggers and are deliberately ignored to prevent recursion.
CREATE OR REPLACE FUNCTION public.aquavo_sync_direct_variant_stock_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $trg$
DECLARE
  v_new record;
  v_old_stock integer;
  v_new_stock integer;
  v_source_id text;
  v_main_location text;
  v_removed record;
  v_removed_balance bigint;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_main_location
  FROM public.inventory_locations
  WHERE code = 'MAIN' AND is_active = true
  ORDER BY id
  LIMIT 1;

  IF v_main_location IS NULL THEN
    RAISE EXCEPTION 'DIRECT_VARIANT_STOCK_EDIT_MAIN_LOCATION_MISSING';
  END IF;

  -- Refuse deleting a variant that still owns inventory. Its balance must first
  -- be explicitly set to zero, preserving SKU-level inventory evidence.
  FOR v_removed IN
    SELECT old_v->>'id' AS variant_id
    FROM jsonb_array_elements(COALESCE(OLD.variants, '[]'::jsonb)) old_v
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(NEW.variants, '[]'::jsonb)) new_v
      WHERE new_v->>'id' = old_v->>'id'
    )
  LOOP
    SELECT COALESCE(SUM(im.quantity_delta), 0)::bigint
    INTO v_removed_balance
    FROM public.inventory_movements im
    WHERE im.product_id = NEW.id
      AND im.variant_id IS NOT DISTINCT FROM v_removed.variant_id
      AND im.location_id = v_main_location;

    IF v_removed_balance <> 0 THEN
      RAISE EXCEPTION
        'DIRECT_VARIANT_DELETE_BLOCKED_WITH_STOCK: product=%, variant=%, canonical=%',
        NEW.id, v_removed.variant_id, v_removed_balance;
    END IF;
  END LOOP;

  FOR v_new IN
    SELECT new_v->>'id' AS variant_id, new_v AS elem
    FROM jsonb_array_elements(COALESCE(NEW.variants, '[]'::jsonb)) new_v
  LOOP
    IF v_new.variant_id IS NULL OR btrim(v_new.variant_id) = '' THEN
      RAISE EXCEPTION 'DIRECT_VARIANT_STOCK_EDIT_MISSING_VARIANT_ID: product=%', NEW.id;
    END IF;

    v_new_stock := COALESCE(NULLIF(v_new.elem->>'stock', '')::integer, 0);

    SELECT COALESCE(NULLIF(old_v->>'stock', '')::integer, 0)
    INTO v_old_stock
    FROM jsonb_array_elements(COALESCE(OLD.variants, '[]'::jsonb)) old_v
    WHERE old_v->>'id' = v_new.variant_id
    LIMIT 1;

    -- New variants and explicit stock changes are inventory operations.
    IF v_old_stock IS NULL OR v_old_stock IS DISTINCT FROM v_new_stock THEN
      v_source_id := NEW.id || ':' || v_new.variant_id || ':' || txid_current()::text || ':' || gen_random_uuid()::text;

      PERFORM public.aquavo_set_variant_stock_target(
        NEW.id,
        v_new.variant_id,
        v_new_stock,
        'admin_variant_stock_target',
        v_source_id,
        'admin-variant-editor'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END
$trg$;

DROP TRIGGER IF EXISTS products_sync_direct_variant_stock_edit ON public.products;
CREATE TRIGGER products_sync_direct_variant_stock_edit
AFTER UPDATE OF variants, has_variants ON public.products
FOR EACH ROW
WHEN (OLD.variants IS DISTINCT FROM NEW.variants OR OLD.has_variants IS DISTINCT FROM NEW.has_variants)
EXECUTE FUNCTION public.aquavo_sync_direct_variant_stock_edit();

-- Targeted owner-confirmed repair. The helper computes the delta from whatever
-- canonical balance exists at execution time; it does not assume the balance is
-- zero and it does not rely on the currently advertised JSON stock.
SELECT public.aquavo_set_variant_stock_target(
  'houyi-oxygenation-tube',
  'black',
  25,
  'owner_stock_reconciliation',
  'OXYGEN-TUBE-25-EACH-20260828',
  'owner:Jaafar'
);

SELECT public.aquavo_set_variant_stock_target(
  'houyi-oxygenation-tube',
  'white',
  25,
  'owner_stock_reconciliation',
  'OXYGEN-TUBE-25-EACH-20260828',
  'owner:Jaafar'
);

DO $verify$
DECLARE
  v_main_location text;
  v_black_canonical bigint;
  v_white_canonical bigint;
  v_black_projected integer;
  v_white_projected integer;
BEGIN
  SELECT id INTO v_main_location
  FROM public.inventory_locations
  WHERE code = 'MAIN' AND is_active = true
  ORDER BY id
  LIMIT 1;

  SELECT COALESCE(SUM(quantity_delta), 0)::bigint
  INTO v_black_canonical
  FROM public.inventory_movements
  WHERE product_id = 'houyi-oxygenation-tube'
    AND variant_id = 'black'
    AND location_id = v_main_location;

  SELECT COALESCE(SUM(quantity_delta), 0)::bigint
  INTO v_white_canonical
  FROM public.inventory_movements
  WHERE product_id = 'houyi-oxygenation-tube'
    AND variant_id = 'white'
    AND location_id = v_main_location;

  SELECT
    MAX(CASE WHEN v->>'id' = 'black' THEN (v->>'stock')::integer END),
    MAX(CASE WHEN v->>'id' = 'white' THEN (v->>'stock')::integer END)
  INTO v_black_projected, v_white_projected
  FROM public.products p
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants, '[]'::jsonb)) v
  WHERE p.id = 'houyi-oxygenation-tube'
    AND p.deleted_at IS NULL;

  IF v_black_canonical <> 25 OR v_white_canonical <> 25
     OR v_black_projected <> 25 OR v_white_projected <> 25 THEN
    RAISE EXCEPTION
      'OXYGEN_TUBE_STOCK_REPAIR_VERIFY_FAILED: canonical black=%, white=%; projected black=%, white=%',
      v_black_canonical, v_white_canonical, v_black_projected, v_white_projected;
  END IF;
END
$verify$;

COMMIT;
