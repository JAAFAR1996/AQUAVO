-- 0090_customer_lifecycle_integrity.sql
-- Make AQUAVO's customer lifecycle joinable end-to-end without letting analytics
-- or CRM failures block commerce:
--   * durable browser-session + acquisition fields on orders
--   * phone-centric CRM backfill aligned with the live production schema
--   * resilient CRM refresh triggers for guest + registered orders
--   * verified-purchase repair for historical reviews
--   * stale-cart abandonment classification
--   * retire the disconnected legacy logistics event backlog
--
-- No financial settlement facts are synthesized here.

BEGIN;

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.schema_migrations
    WHERE version='0089_reconciliation_queue_integrity'
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION '0090_REQUIRES_ACTIVE_0089';
  END IF;
END
$guard$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS view_session_id text,
  ADD COLUMN IF NOT EXISTS aq_sid text,
  ADD COLUMN IF NOT EXISTS attribution_utm_source text,
  ADD COLUMN IF NOT EXISTS attribution_utm_medium text,
  ADD COLUMN IF NOT EXISTS attribution_utm_campaign text,
  ADD COLUMN IF NOT EXISTS attribution_utm_content text,
  ADD COLUMN IF NOT EXISTS attribution_utm_term text,
  ADD COLUMN IF NOT EXISTS attribution_fbclid text,
  ADD COLUMN IF NOT EXISTS attribution_gclid text,
  ADD COLUMN IF NOT EXISTS attribution_ttclid text,
  ADD COLUMN IF NOT EXISTS attribution_igshid text,
  ADD COLUMN IF NOT EXISTS aq_campaign_id text,
  ADD COLUMN IF NOT EXISTS aq_adset_id text,
  ADD COLUMN IF NOT EXISTS aq_ad_id text,
  ADD COLUMN IF NOT EXISTS aq_creative_id text,
  ADD COLUMN IF NOT EXISTS aq_concept_id text,
  ADD COLUMN IF NOT EXISTS aq_hypothesis_id text,
  ADD COLUMN IF NOT EXISTS aq_experiment_id text,
  ADD COLUMN IF NOT EXISTS attribution_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_touch_utm_source text,
  ADD COLUMN IF NOT EXISTS first_touch_utm_medium text,
  ADD COLUMN IF NOT EXISTS first_touch_utm_campaign text,
  ADD COLUMN IF NOT EXISTS first_touch_aq_campaign_id text,
  ADD COLUMN IF NOT EXISTS first_touch_captured_at timestamptz;

COMMENT ON COLUMN public.orders.view_session_id IS
  'Opaque per-tab storefront session (cs_...) joining page/product/cart/checkout/order lifecycle. NULL means unavailable or pre-0090.';
COMMENT ON COLUMN public.orders.aq_sid IS
  'Opaque durable browser acquisition id joining campaign touch history to an order. NULL means unattributed; never infer attribution by timestamp.';
COMMENT ON COLUMN public.orders.attribution_captured_at IS
  'Timestamp when the last/selected campaign touch was observed in the browser, not when the order was placed.';
COMMENT ON COLUMN public.orders.first_touch_captured_at IS
  'Timestamp when the browser first observed acquisition campaign metadata.';

CREATE INDEX IF NOT EXISTS idx_orders_view_session_created
  ON public.orders(view_session_id, created_at)
  WHERE view_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_aq_sid_created
  ON public.orders(aq_sid, created_at)
  WHERE aq_sid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.aquavo_normalize_iraqi_phone(raw_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  digits text;
BEGIN
  IF raw_phone IS NULL OR btrim(raw_phone)='' THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(
    translate(
      raw_phone,
      '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
      '01234567890123456789'
    ),
    '[^0-9]',
    '',
    'g'
  );

  IF digits LIKE '00964%' THEN
    digits := substr(digits, 3);
  END IF;

  IF digits LIKE '9640%' THEN
    digits := '964' || substr(digits, 5);
  ELSIF digits LIKE '0%' AND length(digits)=11 THEN
    digits := '964' || substr(digits, 2);
  ELSIF digits LIKE '7%' AND length(digits)=10 THEN
    digits := '964' || digits;
  END IF;

  IF digits ~ '^9647[0-9]{9}$' THEN
    RETURN digits;
  END IF;

  RETURN NULL;
END
$fn$;

CREATE UNIQUE INDEX IF NOT EXISTS customer_profiles_phone_uidx
  ON public.customer_profiles(phone);

CREATE INDEX IF NOT EXISTS customer_profiles_user_id_idx
  ON public.customer_profiles(user_id);

WITH normalized_orders AS (
  SELECT
    o.*,
    public.aquavo_normalize_iraqi_phone(o.customer_phone) AS canonical_phone
  FROM public.orders o
  WHERE COALESCE(o.is_test,false)=false
),
eligible AS (
  SELECT *
  FROM normalized_orders
  WHERE canonical_phone IS NOT NULL
),
rollup AS (
  SELECT
    canonical_phone AS phone,
    (array_agg(NULLIF(btrim(customer_name),'') ORDER BY created_at DESC)
      FILTER (WHERE NULLIF(btrim(customer_name),'') IS NOT NULL))[1] AS latest_name,
    CASE
      WHEN count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)=1
      THEN max(user_id) FILTER (WHERE user_id IS NOT NULL)
      ELSE NULL
    END AS resolved_user_id,
    count(*)::int AS total_orders_count,
    count(*) FILTER (WHERE status='delivered')::int AS total_purchases,
    COALESCE(
      sum(COALESCE(rounded_total,total)) FILTER (WHERE status='delivered'),
      0
    )::int AS total_spent_iqd,
    max(created_at) AS last_order_at,
    CASE
      WHEN count(*) FILTER (WHERE status='delivered') >= 2 THEN 'repeat'
      WHEN count(*) FILTER (WHERE status='delivered') = 1 THEN 'customer'
      ELSE 'lead'
    END AS segment,
    CASE
      WHEN count(*) FILTER (WHERE status='delivered') > 0
      THEN round(
        (
          sum(COALESCE(rounded_total,total)) FILTER (WHERE status='delivered')
          /
          count(*) FILTER (WHERE status='delivered')
        )::numeric,
        2
      )
      ELSE NULL
    END AS average_order_value
  FROM eligible
  GROUP BY canonical_phone
)
INSERT INTO public.customer_profiles(
  phone,
  name,
  user_id,
  total_orders_count,
  total_spent_iqd,
  last_order_at,
  segment,
  average_order_value,
  total_purchases,
  created_at,
  updated_at
)
SELECT
  phone,
  latest_name,
  resolved_user_id,
  total_orders_count,
  total_spent_iqd,
  last_order_at,
  segment,
  average_order_value,
  total_purchases,
  now(),
  now()
FROM rollup
ON CONFLICT(phone) DO UPDATE SET
  name=COALESCE(EXCLUDED.name, public.customer_profiles.name),
  user_id=COALESCE(EXCLUDED.user_id, public.customer_profiles.user_id),
  total_orders_count=EXCLUDED.total_orders_count,
  total_spent_iqd=EXCLUDED.total_spent_iqd,
  last_order_at=EXCLUDED.last_order_at,
  segment=EXCLUDED.segment,
  average_order_value=EXCLUDED.average_order_value,
  total_purchases=EXCLUDED.total_purchases,
  updated_at=now();

CREATE OR REPLACE FUNCTION public.aquavo_refresh_customer_profile(raw_phone text)
RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  canonical_phone text;
BEGIN
  canonical_phone := public.aquavo_normalize_iraqi_phone(raw_phone);
  IF canonical_phone IS NULL THEN
    RETURN;
  END IF;

  WITH eligible AS (
    SELECT o.*
    FROM public.orders o
    WHERE COALESCE(o.is_test,false)=false
      AND public.aquavo_normalize_iraqi_phone(o.customer_phone)=canonical_phone
  ),
  rollup AS (
    SELECT
      canonical_phone AS phone,
      (array_agg(NULLIF(btrim(customer_name),'') ORDER BY created_at DESC)
        FILTER (WHERE NULLIF(btrim(customer_name),'') IS NOT NULL))[1] AS latest_name,
      CASE
        WHEN count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)=1
        THEN max(user_id) FILTER (WHERE user_id IS NOT NULL)
        ELSE NULL
      END AS resolved_user_id,
      count(*)::int AS total_orders_count,
      count(*) FILTER (WHERE status='delivered')::int AS total_purchases,
      COALESCE(
        sum(COALESCE(rounded_total,total)) FILTER (WHERE status='delivered'),
        0
      )::int AS total_spent_iqd,
      max(created_at) AS last_order_at,
      CASE
        WHEN count(*) FILTER (WHERE status='delivered') >= 2 THEN 'repeat'
        WHEN count(*) FILTER (WHERE status='delivered') = 1 THEN 'customer'
        ELSE 'lead'
      END AS segment,
      CASE
        WHEN count(*) FILTER (WHERE status='delivered') > 0
        THEN round(
          (
            sum(COALESCE(rounded_total,total)) FILTER (WHERE status='delivered')
            /
            count(*) FILTER (WHERE status='delivered')
          )::numeric,
          2
        )
        ELSE NULL
      END AS average_order_value
    FROM eligible
  )
  INSERT INTO public.customer_profiles(
    phone,
    name,
    user_id,
    total_orders_count,
    total_spent_iqd,
    last_order_at,
    segment,
    average_order_value,
    total_purchases,
    created_at,
    updated_at
  )
  SELECT
    phone,
    latest_name,
    resolved_user_id,
    total_orders_count,
    total_spent_iqd,
    last_order_at,
    segment,
    average_order_value,
    total_purchases,
    now(),
    now()
  FROM rollup
  WHERE total_orders_count > 0
  ON CONFLICT(phone) DO UPDATE SET
    name=COALESCE(EXCLUDED.name, public.customer_profiles.name),
    user_id=COALESCE(EXCLUDED.user_id, public.customer_profiles.user_id),
    total_orders_count=EXCLUDED.total_orders_count,
    total_spent_iqd=EXCLUDED.total_spent_iqd,
    last_order_at=EXCLUDED.last_order_at,
    segment=EXCLUDED.segment,
    average_order_value=EXCLUDED.average_order_value,
    total_purchases=EXCLUDED.total_purchases,
    updated_at=now();
END
$fn$;

CREATE OR REPLACE FUNCTION public.aquavo_sync_customer_profile_from_order()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  order_id_for_log text;
BEGIN
  order_id_for_log := CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;

  BEGIN
    IF TG_OP='DELETE' THEN
      PERFORM public.aquavo_refresh_customer_profile(OLD.customer_phone);
    ELSE
      IF TG_OP='UPDATE'
         AND OLD.customer_phone IS DISTINCT FROM NEW.customer_phone THEN
        PERFORM public.aquavo_refresh_customer_profile(OLD.customer_phone);
      END IF;

      PERFORM public.aquavo_refresh_customer_profile(NEW.customer_phone);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'AQUAVO customer profile refresh failed for order %: %',
      order_id_for_log, SQLERRM;
  END;

  IF TG_OP='DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS orders_customer_profile_insert ON public.orders;
CREATE TRIGGER orders_customer_profile_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.aquavo_sync_customer_profile_from_order();

DROP TRIGGER IF EXISTS orders_customer_profile_update ON public.orders;
CREATE TRIGGER orders_customer_profile_update
AFTER UPDATE OF status,payment_status,rounded_total,total,customer_phone,customer_name,user_id
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.aquavo_sync_customer_profile_from_order();

DROP TRIGGER IF EXISTS orders_customer_profile_delete ON public.orders;
CREATE TRIGGER orders_customer_profile_delete
AFTER DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.aquavo_sync_customer_profile_from_order();

UPDATE public.reviews r
SET verified_purchase=true,
    updated_at=now()
WHERE r.user_id IS NOT NULL
  AND COALESCE(r.verified_purchase,false)=false
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items_relational oi ON oi.order_id=o.id
    WHERE o.user_id=r.user_id
      AND o.status='delivered'
      AND COALESCE(o.is_test,false)=false
      AND oi.product_id=r.product_id
  );

UPDATE public.cart_sessions
SET status='abandoned',
    updated_at=now()
WHERE status='active'
  AND updated_at < now() - interval '24 hours';

UPDATE public.event_bus
SET status='failed',
    processed_at=COALESCE(processed_at,now()),
    error_message='LEGACY_LOGISTICS_CONSUMER_RETIRED_2026_09_28'
WHERE event_type='new_order_received'
  AND status='pending';

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0090_customer_lifecycle_integrity',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Add durable order session/acquisition attribution, align and backfill phone-centric CRM profiles with non-blocking refresh triggers, repair verified-purchase reviews, classify stale carts, and retire the disconnected legacy logistics event backlog. No settlement facts are synthesized. Runner must normalize checksum to SHA-256(file bytes).'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
