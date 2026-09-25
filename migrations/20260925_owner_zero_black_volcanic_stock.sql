-- Owner-requested stock reconciliation: black volcanic stone -> 0
-- Date: 2026-09-25
-- Product: houyi-volcanic-stone-black
-- Canonical inventory must be changed through inventory_movements, never by
-- writing products.stock directly while ledger enforcement is active.

BEGIN;

DO $do$
DECLARE
  v_location_id text;
  v_current_qty integer;
  v_product_stock integer;
  v_cost numeric;
  v_has_variants boolean;
BEGIN
  SELECT id
    INTO v_location_id
  FROM public.inventory_locations
  WHERE code='MAIN' AND is_active=true
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'MAIN_INVENTORY_LOCATION_NOT_FOUND';
  END IF;

  SELECT stock, cost_price, COALESCE(has_variants,false)
    INTO v_product_stock, v_cost, v_has_variants
  FROM public.products
  WHERE id='houyi-volcanic-stone-black'
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND: houyi-volcanic-stone-black';
  END IF;

  IF v_has_variants THEN
    RAISE EXCEPTION 'PRODUCT_HAS_VARIANTS_UNEXPECTEDLY: houyi-volcanic-stone-black';
  END IF;

  SELECT COALESCE(SUM(quantity_delta),0)::integer
    INTO v_current_qty
  FROM public.inventory_movements
  WHERE product_id='houyi-volcanic-stone-black'
    AND variant_id IS NULL
    AND location_id=v_location_id;

  IF v_current_qty < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_CANONICAL_BALANCE_BEFORE_RECONCILIATION: %', v_current_qty;
  END IF;

  IF v_current_qty > 0 THEN
    INSERT INTO public.inventory_movements(
      product_id,
      variant_id,
      location_id,
      quantity_delta,
      movement_type,
      source_type,
      source_id,
      idempotency_key,
      unit_cost,
      currency,
      happened_at,
      created_by,
      metadata
    ) VALUES (
      'houyi-volcanic-stone-black',
      NULL,
      v_location_id,
      -v_current_qty,
      'manual_adjustment',
      'owner_stock_reconciliation',
      'OWNER-ZERO-BLACK-VOLCANIC-20260925',
      'owner-stock-reconciliation:houyi-volcanic-stone-black:20260925',
      v_cost,
      'IQD',
      clock_timestamp(),
      'owner_request',
      jsonb_build_object(
        'reason','Owner confirmed black volcanic stone stock must be zero',
        'previous_canonical_quantity',v_current_qty,
        'requested_quantity',0,
        'requested_at','2026-09-25'
      )
    )
    ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;

  SELECT COALESCE(SUM(quantity_delta),0)::integer
    INTO v_current_qty
  FROM public.inventory_movements
  WHERE product_id='houyi-volcanic-stone-black'
    AND variant_id IS NULL
    AND location_id=v_location_id;

  SELECT stock
    INTO v_product_stock
  FROM public.products
  WHERE id='houyi-volcanic-stone-black';

  IF v_current_qty <> 0 THEN
    RAISE EXCEPTION 'CANONICAL_BALANCE_NOT_ZERO_AFTER_RECONCILIATION: %', v_current_qty;
  END IF;

  IF v_product_stock <> 0 THEN
    RAISE EXCEPTION 'STOREFRONT_STOCK_NOT_ZERO_AFTER_PROJECTION: %', v_product_stock;
  END IF;

  RAISE NOTICE 'houyi-volcanic-stone-black reconciled to zero successfully';
END
$do$;

COMMIT;
