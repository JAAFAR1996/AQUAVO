-- AQUAVO payment modernization: durable stock reservations + transactional outbox.
-- Safe to apply before application rollout: with no active reservations the guard is a no-op.
-- The executor owns BEGIN/COMMIT and records the checksum in schema_migrations.

CREATE TABLE IF NOT EXISTS public.payment_stock_reservations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id),
  variant_id text,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','released')),
  expires_at timestamptz NOT NULL,
  release_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_stock_reservations_order_line_uidx
  ON public.payment_stock_reservations(order_id, product_id, COALESCE(variant_id, ''));
CREATE INDEX IF NOT EXISTS payment_stock_reservations_active_idx
  ON public.payment_stock_reservations(product_id, variant_id, expires_at)
  WHERE status='active';
CREATE INDEX IF NOT EXISTS payment_stock_reservations_order_idx
  ON public.payment_stock_reservations(order_id);

CREATE TABLE IF NOT EXISTS public.payment_outbox (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_key text NOT NULL UNIQUE,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('analytics','loyalty','logistics','merchant_notification')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_outbox_due_idx
  ON public.payment_outbox(status, next_attempt_at, created_at)
  WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS payment_outbox_order_idx
  ON public.payment_outbox(order_id);

-- Protect reserved sellable stock at the canonical inventory movement layer.
-- A sale may consume its OWN order reservation, but never another checkout's
-- unexpired active reservation. This covers COD/manual paths too, even if an
-- application-side availability check is bypassed.
CREATE OR REPLACE FUNCTION public.enforce_payment_stock_reservations()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_order_id text;
  v_balance numeric;
  v_other_reserved numeric;
BEGIN
  IF NEW.quantity_delta >= 0 OR NEW.movement_type <> 'sale' THEN
    RETURN NEW;
  END IF;

  v_order_id := NULLIF(NEW.metadata->>'order_id', '');

  SELECT COALESCE(SUM(im.quantity_delta), 0)
    INTO v_balance
    FROM public.inventory_movements im
   WHERE im.product_id = NEW.product_id
     AND im.variant_id IS NOT DISTINCT FROM NEW.variant_id
     AND im.location_id = NEW.location_id;

  SELECT COALESCE(SUM(r.quantity), 0)
    INTO v_other_reserved
    FROM public.payment_stock_reservations r
   WHERE r.product_id = NEW.product_id
     AND r.variant_id IS NOT DISTINCT FROM NEW.variant_id
     AND r.status = 'active'
     AND r.expires_at > now()
     AND (v_order_id IS NULL OR r.order_id IS DISTINCT FROM v_order_id);

  IF v_balance + NEW.quantity_delta < v_other_reserved THEN
    RAISE EXCEPTION 'insufficient inventory after active payment reservations for product %, variant %', NEW.product_id, NEW.variant_id
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS inventory_movements_payment_reservation_guard ON public.inventory_movements;
CREATE TRIGGER inventory_movements_payment_reservation_guard
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW
WHEN (NEW.quantity_delta < 0)
EXECUTE FUNCTION public.enforce_payment_stock_reservations();

INSERT INTO public.schema_migrations(version, checksum, notes)
VALUES (
  '20260825_payment_modernization',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'AQUAVO online-payment stock reservations, canonical reservation guard, and transactional outbox'
)
ON CONFLICT(version) DO UPDATE
SET notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();
