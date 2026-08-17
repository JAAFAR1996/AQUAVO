ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS archived_at timestamp without time zone;

COMMENT ON COLUMN public.orders.archived_at IS
  'Admin operational archive timestamp. Archiving hides an order from the active admin queue without deleting financial, inventory, fulfillment, customer, or audit history.';

CREATE INDEX IF NOT EXISTS orders_archived_at_idx
  ON public.orders (archived_at)
  WHERE archived_at IS NOT NULL;
