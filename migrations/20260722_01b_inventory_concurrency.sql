-- AQUAVO database repair: serialize concurrent inventory movements
-- Date: 2026-07-22
-- Depends on: 20260722_01_inventory_reconciliation.sql

CREATE OR REPLACE FUNCTION prevent_negative_inventory_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance bigint;
  lock_key text;
BEGIN
  lock_key := NEW.product_id || '|' || COALESCE(NEW.variant_id,'') || '|' || NEW.location_id;

  -- Serialize all movements that affect the same product/variant/location.
  -- This closes the race where two concurrent sales both observe the same balance.
  PERFORM pg_advisory_xact_lock(hashtextextended(lock_key,0));

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
