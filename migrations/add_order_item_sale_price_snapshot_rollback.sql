-- ============================================================================
-- add_order_item_sale_price_snapshot_rollback.sql
--
-- Reverses add_order_item_sale_price_snapshot.sql.
--
-- ⚠️ DESTRUCTIVE OF PROVENANCE. Dropping these columns discards every
-- sale-price snapshot the application has written since the forward migration
-- was applied. Those snapshots are financial evidence under §11 and cannot be
-- reconstructed — `price_at_purchase` survives, but the provenance (source,
-- timestamp, the list/discount split) does not.
--
-- Only run this to reverse a failed deployment BEFORE any order has been
-- created against the new schema. If orders exist with populated snapshots,
-- export them first.
--
-- EXECUTION CONTRACT: no top-level BEGIN/COMMIT — the executor wraps the file.
-- Idempotent.
-- ============================================================================

-- Loud warning rather than a silent drop: the operator must see what is lost.
DO $warn$
DECLARE
  populated integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items_relational' AND column_name = 'sale_price_source'
  ) THEN
    EXECUTE 'SELECT count(*) FROM order_items_relational WHERE sale_price_source IS NOT NULL'
      INTO populated;
    IF populated > 0 THEN
      RAISE WARNING
        'Dropping sale-price snapshots for % order line(s). This provenance is '
        'NOT recoverable. Abort now if these rows matter.', populated;
    END IF;
  END IF;
END
$warn$;

ALTER TABLE order_items_relational
  DROP CONSTRAINT IF EXISTS order_items_sale_price_provenance_chk,
  DROP CONSTRAINT IF EXISTS order_items_sale_price_identity_chk,
  DROP CONSTRAINT IF EXISTS order_items_sale_price_source_chk,
  DROP CONSTRAINT IF EXISTS order_items_sale_price_nonneg;

ALTER TABLE order_items_relational
  DROP COLUMN IF EXISTS sale_price_source,
  DROP COLUMN IF EXISTS sale_price_snapshot_at,
  DROP COLUMN IF EXISTS final_unit_sale_price_snapshot,
  DROP COLUMN IF EXISTS discount_snapshot,
  DROP COLUMN IF EXISTS unit_sale_price_snapshot;

DO $verify$
DECLARE
  remaining integer;
BEGIN
  SELECT count(*) INTO remaining
  FROM information_schema.columns
  WHERE table_name = 'order_items_relational'
    AND column_name IN (
      'unit_sale_price_snapshot', 'discount_snapshot',
      'final_unit_sale_price_snapshot', 'sale_price_snapshot_at', 'sale_price_source'
    );

  IF remaining <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: % column(s) still present', remaining;
  END IF;
END
$verify$;
