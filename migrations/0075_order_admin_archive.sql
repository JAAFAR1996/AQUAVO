-- 0075_order_admin_archive
-- Adds a presentation-only operational archive marker to orders.
-- This migration does not delete, rewrite, or reclassify accounting, payment,
-- inventory, fulfillment, return, customer, or invoice history.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS archived_at timestamp without time zone;

COMMENT ON COLUMN public.orders.archived_at IS
  'Admin operational archive timestamp. Archiving hides an order from the active admin queue without deleting financial, inventory, fulfillment, customer, or audit history.';

CREATE INDEX IF NOT EXISTS orders_archived_at_idx
  ON public.orders (archived_at)
  WHERE archived_at IS NOT NULL;

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0075_order_admin_archive',
  '0075007500750075007500750075007500750075007500750075007500750075',
  'Add reversible operational order archiving without changing financial, inventory, fulfillment, return, payment, or invoice history'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;
