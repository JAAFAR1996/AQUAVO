-- 0076_alwaseet_tracking_mirror
-- Read-only carrier mirror for customer tracking.
-- This table deliberately does NOT own order, inventory, fulfillment, or accounting status.
-- It only remembers which Al-Waseet record was safely matched to an AQUAVO order and the
-- last public-safe tracking snapshot observed from the merchant API.

BEGIN;

CREATE TABLE IF NOT EXISTS public.order_carrier_tracking (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES public.orders(id),
  provider text NOT NULL,
  provider_order_id text NOT NULL,
  provider_qr_id text,
  provider_status_id text,
  provider_status text,
  has_issue boolean NOT NULL DEFAULT false,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  match_method text NOT NULL,
  matched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS order_carrier_tracking_order_provider_uidx
  ON public.order_carrier_tracking(order_id, provider);

CREATE UNIQUE INDEX IF NOT EXISTS order_carrier_tracking_provider_order_uidx
  ON public.order_carrier_tracking(provider, provider_order_id);

CREATE INDEX IF NOT EXISTS order_carrier_tracking_sync_idx
  ON public.order_carrier_tracking(provider, last_synced_at);

INSERT INTO public.schema_migrations(version, checksum, notes)
VALUES(
  '0076_alwaseet_tracking_mirror',
  '0076007600760076007600760076007600760076007600760076007600760076',
  'Add isolated read-only Al-Waseet order matching and tracking snapshot table'
)
ON CONFLICT(version) DO UPDATE
SET checksum=EXCLUDED.checksum,
    notes=EXCLUDED.notes,
    rolled_back_at=NULL,
    applied_at=now();

COMMIT;
