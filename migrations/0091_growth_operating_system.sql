-- 0091_growth_operating_system.sql
-- AQUAVO Growth OS: attribution, SKU velocity, repurchase lifecycle, bundles,
-- customer aquarium profiles, and expense-capture completeness.
-- Additive only. Existing commerce/accounting truth is never rewritten.

BEGIN;

CREATE TABLE IF NOT EXISTS public.order_attribution (
  order_id text PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  session_id text,
  first_touch jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_touch jsonb NOT NULL DEFAULT '{}'::jsonb,
  gclid text,
  gbraid text,
  wbraid text,
  fbclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_path text,
  referrer_host text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_attribution_google_click_idx
  ON public.order_attribution(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS order_attribution_utm_idx
  ON public.order_attribution(utm_source,utm_medium,utm_campaign);

CREATE TABLE IF NOT EXISTS public.purchase_measurement_receipts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  event_key text NOT NULL,
  status text NOT NULL,
  client_value_iqd numeric,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_measurement_receipts_provider_chk
    CHECK (provider IN ('google_tag','meta_pixel','tiktok','posthog')),
  CONSTRAINT purchase_measurement_receipts_status_chk
    CHECK (status IN ('emitted','blocked','failed')),
  CONSTRAINT purchase_measurement_receipts_value_chk
    CHECK (client_value_iqd IS NULL OR client_value_iqd >= 0),
  CONSTRAINT purchase_measurement_receipts_uq
    UNIQUE(order_id,provider,event_key)
);

CREATE INDEX IF NOT EXISTS purchase_measurement_receipts_order_idx
  ON public.purchase_measurement_receipts(order_id,attempted_at DESC);

CREATE TABLE IF NOT EXISTS public.inventory_sku_daily (
  day date NOT NULL,
  sku_key text NOT NULL,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id text,
  stock numeric NOT NULL DEFAULT 0,
  unit_cost numeric,
  stock_value numeric,
  units_30d numeric NOT NULL DEFAULT 0,
  units_60d numeric NOT NULL DEFAULT 0,
  units_90d numeric NOT NULL DEFAULT 0,
  revenue_90d numeric NOT NULL DEFAULT 0,
  avg_daily_units_90d numeric NOT NULL DEFAULT 0,
  sell_through_90d_pct numeric NOT NULL DEFAULT 0,
  days_inventory numeric,
  classification text NOT NULL,
  sales_basis text NOT NULL,
  reorder_point numeric NOT NULL DEFAULT 0,
  recommended_reorder_qty numeric NOT NULL DEFAULT 0,
  capital_locked numeric NOT NULL DEFAULT 0,
  confidence text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(day,sku_key),
  CONSTRAINT inventory_sku_daily_class_chk
    CHECK (classification IN ('fast','medium','slow','dead','new','stockout')),
  CONSTRAINT inventory_sku_daily_basis_chk
    CHECK (sales_basis IN ('variant','product_fallback','product')),
  CONSTRAINT inventory_sku_daily_confidence_chk
    CHECK (confidence IN ('exact','high','mixed','estimated'))
);

CREATE INDEX IF NOT EXISTS inventory_sku_daily_class_day_idx
  ON public.inventory_sku_daily(classification,day DESC);
CREATE INDEX IF NOT EXISTS inventory_sku_daily_product_day_idx
  ON public.inventory_sku_daily(product_id,day DESC);

CREATE TABLE IF NOT EXISTS public.product_repurchase_profiles (
  sku_key text PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id text,
  is_consumable boolean NOT NULL DEFAULT false,
  interval_min_days integer,
  interval_target_days integer,
  interval_max_days integer,
  profile_source text NOT NULL DEFAULT 'rule',
  confidence text NOT NULL DEFAULT 'estimated',
  active boolean NOT NULL DEFAULT true,
  notes text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_repurchase_profiles_intervals_chk CHECK (
    (is_consumable=false AND interval_min_days IS NULL AND interval_target_days IS NULL AND interval_max_days IS NULL)
    OR
    (is_consumable=true
      AND interval_min_days IS NOT NULL
      AND interval_target_days IS NOT NULL
      AND interval_max_days IS NOT NULL
      AND interval_min_days > 0
      AND interval_min_days <= interval_target_days
      AND interval_target_days <= interval_max_days)
  ),
  CONSTRAINT product_repurchase_profiles_source_chk
    CHECK (profile_source IN ('rule','manual','observed')),
  CONSTRAINT product_repurchase_profiles_confidence_chk
    CHECK (confidence IN ('exact','high','medium','estimated'))
);

CREATE INDEX IF NOT EXISTS product_repurchase_profiles_consumable_idx
  ON public.product_repurchase_profiles(is_consumable,active);

CREATE OR REPLACE VIEW public.v_growth_order_customer_identity AS
WITH raw AS (
  SELECT
    o.id AS order_id,
    o.user_id,
    o.customer_name,
    o.customer_email,
    o.created_at,
    NULLIF(regexp_replace(o.customer_phone,'\\D','','g'),'') AS raw_phone
  FROM public.orders o
),
normalized AS (
  SELECT
    raw.*,
    CASE
      WHEN raw_phone ~ '^009647[0-9]{9}
  customer_key text PRIMARY KEY,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  normalized_phone text,
  customer_name text,
  tank_volume_liters numeric,
  tank_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  livestock jsonb NOT NULL DEFAULT '[]'::jsonb,
  plants jsonb NOT NULL DEFAULT '[]'::jsonb,
  filter_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  heater_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  water_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  source text NOT NULL DEFAULT 'admin',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_aquarium_profiles_volume_chk
    CHECK (tank_volume_liters IS NULL OR tank_volume_liters > 0),
  CONSTRAINT customer_aquarium_profiles_source_chk
    CHECK (source IN ('admin','customer','import','conversation'))
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_aquarium_profiles_phone_uq
  ON public.customer_aquarium_profiles(normalized_phone)
  WHERE normalized_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_lifecycle_jobs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_key text NOT NULL,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  channel text NOT NULL DEFAULT 'whatsapp',
  template_name text,
  recommended_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_lifecycle_jobs_type_chk
    CHECK (job_type IN ('day7_care','repurchase')),
  CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','suppressed','completed','cancelled')),
  CONSTRAINT customer_lifecycle_jobs_channel_chk
    CHECK (channel IN ('whatsapp','manual')),
  CONSTRAINT customer_lifecycle_jobs_uq
    UNIQUE(order_id,job_type)
);

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_due_idx
  ON public.customer_lifecycle_jobs(status,due_at);

CREATE TABLE IF NOT EXISTS public.product_bundles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  description_ar text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  storefront_visible boolean NOT NULL DEFAULT false,
  price_strategy text NOT NULL DEFAULT 'sum',
  fixed_price_iqd numeric,
  discount_pct numeric NOT NULL DEFAULT 0,
  target_margin_pct numeric,
  audience_tag text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundles_price_strategy_chk
    CHECK (price_strategy IN ('sum','fixed','discount')),
  CONSTRAINT product_bundles_discount_chk
    CHECK (discount_pct >= 0 AND discount_pct <= 50),
  CONSTRAINT product_bundles_fixed_price_chk
    CHECK (fixed_price_iqd IS NULL OR fixed_price_iqd >= 0),
  CONSTRAINT product_bundles_margin_chk
    CHECK (target_margin_pct IS NULL OR (target_margin_pct >= 0 AND target_margin_pct <= 100))
);

CREATE TABLE IF NOT EXISTS public.product_bundle_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bundle_id text NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id text,
  quantity integer NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundle_items_qty_chk CHECK (quantity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_bundle_items_identity_uq
  ON public.product_bundle_items(bundle_id,product_id,COALESCE(variant_id,''));

CREATE TABLE IF NOT EXISTS public.business_expense_inbox (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fingerprint text NOT NULL UNIQUE,
  expense_date date NOT NULL,
  category text NOT NULL,
  amount_iqd numeric NOT NULL,
  original_amount numeric,
  currency text NOT NULL DEFAULT 'IQD',
  vendor text,
  description text,
  source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'captured',
  journal_entry_id text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_expense_inbox_amount_chk CHECK (amount_iqd >= 0),
  CONSTRAINT business_expense_inbox_status_chk
    CHECK (status IN ('captured','posted','ignored'))
);

CREATE INDEX IF NOT EXISTS business_expense_inbox_status_date_idx
  ON public.business_expense_inbox(status,expense_date DESC);

INSERT INTO public.business_metric_definitions(metric_key,label_ar,unit,description,formula)
VALUES
  ('attribution_coverage_pct','تغطية Attribution','percent','نسبة الطلبات المحققة التي لديها first/last-touch attribution محفوظ.','attributed_realized_orders / realized_orders * 100'),
  ('purchase_measurement_coverage_pct','تغطية Purchase Measurement','percent','نسبة الطلبات المحققة التي سجل المتصفح أنه أطلق Google purchase لها.','measured_realized_orders / realized_orders * 100'),
  ('ready_lifecycle_jobs','متابعات العملاء المستحقة','count','عدد مهام Day-7 وإعادة الشراء الجاهزة للتواصل.','COUNT(customer_lifecycle_jobs WHERE status=ready)'),
  ('fast_inventory_value','قيمة مخزون Fast','IQD','قيمة المخزون المصنف سريع الحركة.','SUM(stock_value WHERE classification=fast)'),
  ('slow_dead_inventory_value','قيمة Slow/Dead','IQD','رأس المال الموجود في مخزون بطيء أو راكد.','SUM(stock_value WHERE classification IN slow,dead)'),
  ('unposted_expense_inbox','مصاريف غير مرحلة','IQD','مبالغ مثبتة في صندوق المصاريف ولم ترحل بعد إلى دفتر الأستاذ.','SUM(amount_iqd WHERE status=captured)')
ON CONFLICT(metric_key) DO UPDATE SET
  label_ar=EXCLUDED.label_ar,
  unit=EXCLUDED.unit,
  description=EXCLUDED.description,
  formula=EXCLUDED.formula,
  definition_version='growth_os_v1',
  active=true,
  updated_at=now();

UPDATE public.business_metric_definitions
SET definition_version='growth_os_v1',updated_at=now()
WHERE metric_key IN (
  'attribution_coverage_pct','purchase_measurement_coverage_pct','ready_lifecycle_jobs',
  'fast_inventory_value','slow_dead_inventory_value','unposted_expense_inbox'
);

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0091_growth_operating_system',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'AQUAVO Growth OS: attribution receipts, SKU velocity/reorder intelligence, repurchase lifecycle, bundles, customer aquarium profiles, and expense completeness. Additive only.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
 THEN substring(raw_phone from 3)
      WHEN raw_phone ~ '^96407[0-9]{9}
  customer_key text PRIMARY KEY,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  normalized_phone text,
  customer_name text,
  tank_volume_liters numeric,
  tank_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  livestock jsonb NOT NULL DEFAULT '[]'::jsonb,
  plants jsonb NOT NULL DEFAULT '[]'::jsonb,
  filter_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  heater_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  water_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  source text NOT NULL DEFAULT 'admin',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_aquarium_profiles_volume_chk
    CHECK (tank_volume_liters IS NULL OR tank_volume_liters > 0),
  CONSTRAINT customer_aquarium_profiles_source_chk
    CHECK (source IN ('admin','customer','import','conversation'))
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_aquarium_profiles_phone_uq
  ON public.customer_aquarium_profiles(normalized_phone)
  WHERE normalized_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_lifecycle_jobs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_key text NOT NULL,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  channel text NOT NULL DEFAULT 'whatsapp',
  template_name text,
  recommended_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_lifecycle_jobs_type_chk
    CHECK (job_type IN ('day7_care','repurchase')),
  CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','suppressed','completed','cancelled')),
  CONSTRAINT customer_lifecycle_jobs_channel_chk
    CHECK (channel IN ('whatsapp','manual')),
  CONSTRAINT customer_lifecycle_jobs_uq
    UNIQUE(order_id,job_type)
);

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_due_idx
  ON public.customer_lifecycle_jobs(status,due_at);

CREATE TABLE IF NOT EXISTS public.product_bundles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  description_ar text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  storefront_visible boolean NOT NULL DEFAULT false,
  price_strategy text NOT NULL DEFAULT 'sum',
  fixed_price_iqd numeric,
  discount_pct numeric NOT NULL DEFAULT 0,
  target_margin_pct numeric,
  audience_tag text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundles_price_strategy_chk
    CHECK (price_strategy IN ('sum','fixed','discount')),
  CONSTRAINT product_bundles_discount_chk
    CHECK (discount_pct >= 0 AND discount_pct <= 50),
  CONSTRAINT product_bundles_fixed_price_chk
    CHECK (fixed_price_iqd IS NULL OR fixed_price_iqd >= 0),
  CONSTRAINT product_bundles_margin_chk
    CHECK (target_margin_pct IS NULL OR (target_margin_pct >= 0 AND target_margin_pct <= 100))
);

CREATE TABLE IF NOT EXISTS public.product_bundle_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bundle_id text NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id text,
  quantity integer NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundle_items_qty_chk CHECK (quantity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_bundle_items_identity_uq
  ON public.product_bundle_items(bundle_id,product_id,COALESCE(variant_id,''));

CREATE TABLE IF NOT EXISTS public.business_expense_inbox (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fingerprint text NOT NULL UNIQUE,
  expense_date date NOT NULL,
  category text NOT NULL,
  amount_iqd numeric NOT NULL,
  original_amount numeric,
  currency text NOT NULL DEFAULT 'IQD',
  vendor text,
  description text,
  source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'captured',
  journal_entry_id text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_expense_inbox_amount_chk CHECK (amount_iqd >= 0),
  CONSTRAINT business_expense_inbox_status_chk
    CHECK (status IN ('captured','posted','ignored'))
);

CREATE INDEX IF NOT EXISTS business_expense_inbox_status_date_idx
  ON public.business_expense_inbox(status,expense_date DESC);

INSERT INTO public.business_metric_definitions(metric_key,label_ar,unit,description,formula)
VALUES
  ('attribution_coverage_pct','تغطية Attribution','percent','نسبة الطلبات المحققة التي لديها first/last-touch attribution محفوظ.','attributed_realized_orders / realized_orders * 100'),
  ('purchase_measurement_coverage_pct','تغطية Purchase Measurement','percent','نسبة الطلبات المحققة التي سجل المتصفح أنه أطلق Google purchase لها.','measured_realized_orders / realized_orders * 100'),
  ('ready_lifecycle_jobs','متابعات العملاء المستحقة','count','عدد مهام Day-7 وإعادة الشراء الجاهزة للتواصل.','COUNT(customer_lifecycle_jobs WHERE status=ready)'),
  ('fast_inventory_value','قيمة مخزون Fast','IQD','قيمة المخزون المصنف سريع الحركة.','SUM(stock_value WHERE classification=fast)'),
  ('slow_dead_inventory_value','قيمة Slow/Dead','IQD','رأس المال الموجود في مخزون بطيء أو راكد.','SUM(stock_value WHERE classification IN slow,dead)'),
  ('unposted_expense_inbox','مصاريف غير مرحلة','IQD','مبالغ مثبتة في صندوق المصاريف ولم ترحل بعد إلى دفتر الأستاذ.','SUM(amount_iqd WHERE status=captured)')
ON CONFLICT(metric_key) DO UPDATE SET
  label_ar=EXCLUDED.label_ar,
  unit=EXCLUDED.unit,
  description=EXCLUDED.description,
  formula=EXCLUDED.formula,
  definition_version='growth_os_v1',
  active=true,
  updated_at=now();

UPDATE public.business_metric_definitions
SET definition_version='growth_os_v1',updated_at=now()
WHERE metric_key IN (
  'attribution_coverage_pct','purchase_measurement_coverage_pct','ready_lifecycle_jobs',
  'fast_inventory_value','slow_dead_inventory_value','unposted_expense_inbox'
);

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0091_growth_operating_system',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'AQUAVO Growth OS: attribution receipts, SKU velocity/reorder intelligence, repurchase lifecycle, bundles, customer aquarium profiles, and expense completeness. Additive only.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
 THEN '964' || substring(raw_phone from 5)
      WHEN raw_phone ~ '^07[0-9]{9}
  customer_key text PRIMARY KEY,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  normalized_phone text,
  customer_name text,
  tank_volume_liters numeric,
  tank_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  livestock jsonb NOT NULL DEFAULT '[]'::jsonb,
  plants jsonb NOT NULL DEFAULT '[]'::jsonb,
  filter_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  heater_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  water_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  source text NOT NULL DEFAULT 'admin',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_aquarium_profiles_volume_chk
    CHECK (tank_volume_liters IS NULL OR tank_volume_liters > 0),
  CONSTRAINT customer_aquarium_profiles_source_chk
    CHECK (source IN ('admin','customer','import','conversation'))
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_aquarium_profiles_phone_uq
  ON public.customer_aquarium_profiles(normalized_phone)
  WHERE normalized_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_lifecycle_jobs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_key text NOT NULL,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  channel text NOT NULL DEFAULT 'whatsapp',
  template_name text,
  recommended_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_lifecycle_jobs_type_chk
    CHECK (job_type IN ('day7_care','repurchase')),
  CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','suppressed','completed','cancelled')),
  CONSTRAINT customer_lifecycle_jobs_channel_chk
    CHECK (channel IN ('whatsapp','manual')),
  CONSTRAINT customer_lifecycle_jobs_uq
    UNIQUE(order_id,job_type)
);

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_due_idx
  ON public.customer_lifecycle_jobs(status,due_at);

CREATE TABLE IF NOT EXISTS public.product_bundles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  description_ar text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  storefront_visible boolean NOT NULL DEFAULT false,
  price_strategy text NOT NULL DEFAULT 'sum',
  fixed_price_iqd numeric,
  discount_pct numeric NOT NULL DEFAULT 0,
  target_margin_pct numeric,
  audience_tag text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundles_price_strategy_chk
    CHECK (price_strategy IN ('sum','fixed','discount')),
  CONSTRAINT product_bundles_discount_chk
    CHECK (discount_pct >= 0 AND discount_pct <= 50),
  CONSTRAINT product_bundles_fixed_price_chk
    CHECK (fixed_price_iqd IS NULL OR fixed_price_iqd >= 0),
  CONSTRAINT product_bundles_margin_chk
    CHECK (target_margin_pct IS NULL OR (target_margin_pct >= 0 AND target_margin_pct <= 100))
);

CREATE TABLE IF NOT EXISTS public.product_bundle_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bundle_id text NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id text,
  quantity integer NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundle_items_qty_chk CHECK (quantity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_bundle_items_identity_uq
  ON public.product_bundle_items(bundle_id,product_id,COALESCE(variant_id,''));

CREATE TABLE IF NOT EXISTS public.business_expense_inbox (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fingerprint text NOT NULL UNIQUE,
  expense_date date NOT NULL,
  category text NOT NULL,
  amount_iqd numeric NOT NULL,
  original_amount numeric,
  currency text NOT NULL DEFAULT 'IQD',
  vendor text,
  description text,
  source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'captured',
  journal_entry_id text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_expense_inbox_amount_chk CHECK (amount_iqd >= 0),
  CONSTRAINT business_expense_inbox_status_chk
    CHECK (status IN ('captured','posted','ignored'))
);

CREATE INDEX IF NOT EXISTS business_expense_inbox_status_date_idx
  ON public.business_expense_inbox(status,expense_date DESC);

INSERT INTO public.business_metric_definitions(metric_key,label_ar,unit,description,formula)
VALUES
  ('attribution_coverage_pct','تغطية Attribution','percent','نسبة الطلبات المحققة التي لديها first/last-touch attribution محفوظ.','attributed_realized_orders / realized_orders * 100'),
  ('purchase_measurement_coverage_pct','تغطية Purchase Measurement','percent','نسبة الطلبات المحققة التي سجل المتصفح أنه أطلق Google purchase لها.','measured_realized_orders / realized_orders * 100'),
  ('ready_lifecycle_jobs','متابعات العملاء المستحقة','count','عدد مهام Day-7 وإعادة الشراء الجاهزة للتواصل.','COUNT(customer_lifecycle_jobs WHERE status=ready)'),
  ('fast_inventory_value','قيمة مخزون Fast','IQD','قيمة المخزون المصنف سريع الحركة.','SUM(stock_value WHERE classification=fast)'),
  ('slow_dead_inventory_value','قيمة Slow/Dead','IQD','رأس المال الموجود في مخزون بطيء أو راكد.','SUM(stock_value WHERE classification IN slow,dead)'),
  ('unposted_expense_inbox','مصاريف غير مرحلة','IQD','مبالغ مثبتة في صندوق المصاريف ولم ترحل بعد إلى دفتر الأستاذ.','SUM(amount_iqd WHERE status=captured)')
ON CONFLICT(metric_key) DO UPDATE SET
  label_ar=EXCLUDED.label_ar,
  unit=EXCLUDED.unit,
  description=EXCLUDED.description,
  formula=EXCLUDED.formula,
  definition_version='growth_os_v1',
  active=true,
  updated_at=now();

UPDATE public.business_metric_definitions
SET definition_version='growth_os_v1',updated_at=now()
WHERE metric_key IN (
  'attribution_coverage_pct','purchase_measurement_coverage_pct','ready_lifecycle_jobs',
  'fast_inventory_value','slow_dead_inventory_value','unposted_expense_inbox'
);

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0091_growth_operating_system',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'AQUAVO Growth OS: attribution receipts, SKU velocity/reorder intelligence, repurchase lifecycle, bundles, customer aquarium profiles, and expense completeness. Additive only.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
 THEN '964' || substring(raw_phone from 2)
      WHEN raw_phone ~ '^7[0-9]{9}
  customer_key text PRIMARY KEY,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  normalized_phone text,
  customer_name text,
  tank_volume_liters numeric,
  tank_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  livestock jsonb NOT NULL DEFAULT '[]'::jsonb,
  plants jsonb NOT NULL DEFAULT '[]'::jsonb,
  filter_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  heater_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  water_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  source text NOT NULL DEFAULT 'admin',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_aquarium_profiles_volume_chk
    CHECK (tank_volume_liters IS NULL OR tank_volume_liters > 0),
  CONSTRAINT customer_aquarium_profiles_source_chk
    CHECK (source IN ('admin','customer','import','conversation'))
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_aquarium_profiles_phone_uq
  ON public.customer_aquarium_profiles(normalized_phone)
  WHERE normalized_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_lifecycle_jobs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_key text NOT NULL,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  channel text NOT NULL DEFAULT 'whatsapp',
  template_name text,
  recommended_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_lifecycle_jobs_type_chk
    CHECK (job_type IN ('day7_care','repurchase')),
  CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','suppressed','completed','cancelled')),
  CONSTRAINT customer_lifecycle_jobs_channel_chk
    CHECK (channel IN ('whatsapp','manual')),
  CONSTRAINT customer_lifecycle_jobs_uq
    UNIQUE(order_id,job_type)
);

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_due_idx
  ON public.customer_lifecycle_jobs(status,due_at);

CREATE TABLE IF NOT EXISTS public.product_bundles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  description_ar text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  storefront_visible boolean NOT NULL DEFAULT false,
  price_strategy text NOT NULL DEFAULT 'sum',
  fixed_price_iqd numeric,
  discount_pct numeric NOT NULL DEFAULT 0,
  target_margin_pct numeric,
  audience_tag text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundles_price_strategy_chk
    CHECK (price_strategy IN ('sum','fixed','discount')),
  CONSTRAINT product_bundles_discount_chk
    CHECK (discount_pct >= 0 AND discount_pct <= 50),
  CONSTRAINT product_bundles_fixed_price_chk
    CHECK (fixed_price_iqd IS NULL OR fixed_price_iqd >= 0),
  CONSTRAINT product_bundles_margin_chk
    CHECK (target_margin_pct IS NULL OR (target_margin_pct >= 0 AND target_margin_pct <= 100))
);

CREATE TABLE IF NOT EXISTS public.product_bundle_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bundle_id text NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id text,
  quantity integer NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundle_items_qty_chk CHECK (quantity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_bundle_items_identity_uq
  ON public.product_bundle_items(bundle_id,product_id,COALESCE(variant_id,''));

CREATE TABLE IF NOT EXISTS public.business_expense_inbox (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fingerprint text NOT NULL UNIQUE,
  expense_date date NOT NULL,
  category text NOT NULL,
  amount_iqd numeric NOT NULL,
  original_amount numeric,
  currency text NOT NULL DEFAULT 'IQD',
  vendor text,
  description text,
  source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'captured',
  journal_entry_id text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_expense_inbox_amount_chk CHECK (amount_iqd >= 0),
  CONSTRAINT business_expense_inbox_status_chk
    CHECK (status IN ('captured','posted','ignored'))
);

CREATE INDEX IF NOT EXISTS business_expense_inbox_status_date_idx
  ON public.business_expense_inbox(status,expense_date DESC);

INSERT INTO public.business_metric_definitions(metric_key,label_ar,unit,description,formula)
VALUES
  ('attribution_coverage_pct','تغطية Attribution','percent','نسبة الطلبات المحققة التي لديها first/last-touch attribution محفوظ.','attributed_realized_orders / realized_orders * 100'),
  ('purchase_measurement_coverage_pct','تغطية Purchase Measurement','percent','نسبة الطلبات المحققة التي سجل المتصفح أنه أطلق Google purchase لها.','measured_realized_orders / realized_orders * 100'),
  ('ready_lifecycle_jobs','متابعات العملاء المستحقة','count','عدد مهام Day-7 وإعادة الشراء الجاهزة للتواصل.','COUNT(customer_lifecycle_jobs WHERE status=ready)'),
  ('fast_inventory_value','قيمة مخزون Fast','IQD','قيمة المخزون المصنف سريع الحركة.','SUM(stock_value WHERE classification=fast)'),
  ('slow_dead_inventory_value','قيمة Slow/Dead','IQD','رأس المال الموجود في مخزون بطيء أو راكد.','SUM(stock_value WHERE classification IN slow,dead)'),
  ('unposted_expense_inbox','مصاريف غير مرحلة','IQD','مبالغ مثبتة في صندوق المصاريف ولم ترحل بعد إلى دفتر الأستاذ.','SUM(amount_iqd WHERE status=captured)')
ON CONFLICT(metric_key) DO UPDATE SET
  label_ar=EXCLUDED.label_ar,
  unit=EXCLUDED.unit,
  description=EXCLUDED.description,
  formula=EXCLUDED.formula,
  definition_version='growth_os_v1',
  active=true,
  updated_at=now();

UPDATE public.business_metric_definitions
SET definition_version='growth_os_v1',updated_at=now()
WHERE metric_key IN (
  'attribution_coverage_pct','purchase_measurement_coverage_pct','ready_lifecycle_jobs',
  'fast_inventory_value','slow_dead_inventory_value','unposted_expense_inbox'
);

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0091_growth_operating_system',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'AQUAVO Growth OS: attribution receipts, SKU velocity/reorder intelligence, repurchase lifecycle, bundles, customer aquarium profiles, and expense completeness. Additive only.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
 THEN '964' || raw_phone
      WHEN raw_phone ~ '^9647[0-9]{9}
  customer_key text PRIMARY KEY,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  normalized_phone text,
  customer_name text,
  tank_volume_liters numeric,
  tank_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  livestock jsonb NOT NULL DEFAULT '[]'::jsonb,
  plants jsonb NOT NULL DEFAULT '[]'::jsonb,
  filter_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  heater_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  water_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  source text NOT NULL DEFAULT 'admin',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_aquarium_profiles_volume_chk
    CHECK (tank_volume_liters IS NULL OR tank_volume_liters > 0),
  CONSTRAINT customer_aquarium_profiles_source_chk
    CHECK (source IN ('admin','customer','import','conversation'))
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_aquarium_profiles_phone_uq
  ON public.customer_aquarium_profiles(normalized_phone)
  WHERE normalized_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_lifecycle_jobs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_key text NOT NULL,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  channel text NOT NULL DEFAULT 'whatsapp',
  template_name text,
  recommended_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_lifecycle_jobs_type_chk
    CHECK (job_type IN ('day7_care','repurchase')),
  CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','suppressed','completed','cancelled')),
  CONSTRAINT customer_lifecycle_jobs_channel_chk
    CHECK (channel IN ('whatsapp','manual')),
  CONSTRAINT customer_lifecycle_jobs_uq
    UNIQUE(order_id,job_type)
);

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_due_idx
  ON public.customer_lifecycle_jobs(status,due_at);

CREATE TABLE IF NOT EXISTS public.product_bundles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  description_ar text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  storefront_visible boolean NOT NULL DEFAULT false,
  price_strategy text NOT NULL DEFAULT 'sum',
  fixed_price_iqd numeric,
  discount_pct numeric NOT NULL DEFAULT 0,
  target_margin_pct numeric,
  audience_tag text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundles_price_strategy_chk
    CHECK (price_strategy IN ('sum','fixed','discount')),
  CONSTRAINT product_bundles_discount_chk
    CHECK (discount_pct >= 0 AND discount_pct <= 50),
  CONSTRAINT product_bundles_fixed_price_chk
    CHECK (fixed_price_iqd IS NULL OR fixed_price_iqd >= 0),
  CONSTRAINT product_bundles_margin_chk
    CHECK (target_margin_pct IS NULL OR (target_margin_pct >= 0 AND target_margin_pct <= 100))
);

CREATE TABLE IF NOT EXISTS public.product_bundle_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bundle_id text NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id text,
  quantity integer NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundle_items_qty_chk CHECK (quantity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_bundle_items_identity_uq
  ON public.product_bundle_items(bundle_id,product_id,COALESCE(variant_id,''));

CREATE TABLE IF NOT EXISTS public.business_expense_inbox (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fingerprint text NOT NULL UNIQUE,
  expense_date date NOT NULL,
  category text NOT NULL,
  amount_iqd numeric NOT NULL,
  original_amount numeric,
  currency text NOT NULL DEFAULT 'IQD',
  vendor text,
  description text,
  source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'captured',
  journal_entry_id text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_expense_inbox_amount_chk CHECK (amount_iqd >= 0),
  CONSTRAINT business_expense_inbox_status_chk
    CHECK (status IN ('captured','posted','ignored'))
);

CREATE INDEX IF NOT EXISTS business_expense_inbox_status_date_idx
  ON public.business_expense_inbox(status,expense_date DESC);

INSERT INTO public.business_metric_definitions(metric_key,label_ar,unit,description,formula)
VALUES
  ('attribution_coverage_pct','تغطية Attribution','percent','نسبة الطلبات المحققة التي لديها first/last-touch attribution محفوظ.','attributed_realized_orders / realized_orders * 100'),
  ('purchase_measurement_coverage_pct','تغطية Purchase Measurement','percent','نسبة الطلبات المحققة التي سجل المتصفح أنه أطلق Google purchase لها.','measured_realized_orders / realized_orders * 100'),
  ('ready_lifecycle_jobs','متابعات العملاء المستحقة','count','عدد مهام Day-7 وإعادة الشراء الجاهزة للتواصل.','COUNT(customer_lifecycle_jobs WHERE status=ready)'),
  ('fast_inventory_value','قيمة مخزون Fast','IQD','قيمة المخزون المصنف سريع الحركة.','SUM(stock_value WHERE classification=fast)'),
  ('slow_dead_inventory_value','قيمة Slow/Dead','IQD','رأس المال الموجود في مخزون بطيء أو راكد.','SUM(stock_value WHERE classification IN slow,dead)'),
  ('unposted_expense_inbox','مصاريف غير مرحلة','IQD','مبالغ مثبتة في صندوق المصاريف ولم ترحل بعد إلى دفتر الأستاذ.','SUM(amount_iqd WHERE status=captured)')
ON CONFLICT(metric_key) DO UPDATE SET
  label_ar=EXCLUDED.label_ar,
  unit=EXCLUDED.unit,
  description=EXCLUDED.description,
  formula=EXCLUDED.formula,
  definition_version='growth_os_v1',
  active=true,
  updated_at=now();

UPDATE public.business_metric_definitions
SET definition_version='growth_os_v1',updated_at=now()
WHERE metric_key IN (
  'attribution_coverage_pct','purchase_measurement_coverage_pct','ready_lifecycle_jobs',
  'fast_inventory_value','slow_dead_inventory_value','unposted_expense_inbox'
);

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0091_growth_operating_system',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'AQUAVO Growth OS: attribution receipts, SKU velocity/reorder intelligence, repurchase lifecycle, bundles, customer aquarium profiles, and expense completeness. Additive only.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
 THEN raw_phone
      ELSE NULL
    END AS normalized_phone
  FROM raw
)
SELECT
  order_id,
  user_id,
  customer_name,
  customer_email,
  created_at,
  normalized_phone,
  COALESCE(normalized_phone,user_id,lower(customer_email),order_id) AS customer_key
FROM normalized;

CREATE TABLE IF NOT EXISTS public.customer_aquarium_profiles (
  customer_key text PRIMARY KEY,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  normalized_phone text,
  customer_name text,
  tank_volume_liters numeric,
  tank_dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  livestock jsonb NOT NULL DEFAULT '[]'::jsonb,
  plants jsonb NOT NULL DEFAULT '[]'::jsonb,
  filter_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  heater_setup jsonb NOT NULL DEFAULT '{}'::jsonb,
  water_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  source text NOT NULL DEFAULT 'admin',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_aquarium_profiles_volume_chk
    CHECK (tank_volume_liters IS NULL OR tank_volume_liters > 0),
  CONSTRAINT customer_aquarium_profiles_source_chk
    CHECK (source IN ('admin','customer','import','conversation'))
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_aquarium_profiles_phone_uq
  ON public.customer_aquarium_profiles(normalized_phone)
  WHERE normalized_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_lifecycle_jobs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_key text NOT NULL,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  channel text NOT NULL DEFAULT 'whatsapp',
  template_name text,
  recommended_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_lifecycle_jobs_type_chk
    CHECK (job_type IN ('day7_care','repurchase')),
  CONSTRAINT customer_lifecycle_jobs_status_chk
    CHECK (status IN ('planned','ready','suppressed','completed','cancelled')),
  CONSTRAINT customer_lifecycle_jobs_channel_chk
    CHECK (channel IN ('whatsapp','manual')),
  CONSTRAINT customer_lifecycle_jobs_uq
    UNIQUE(order_id,job_type)
);

CREATE INDEX IF NOT EXISTS customer_lifecycle_jobs_due_idx
  ON public.customer_lifecycle_jobs(status,due_at);

CREATE TABLE IF NOT EXISTS public.product_bundles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  description_ar text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  storefront_visible boolean NOT NULL DEFAULT false,
  price_strategy text NOT NULL DEFAULT 'sum',
  fixed_price_iqd numeric,
  discount_pct numeric NOT NULL DEFAULT 0,
  target_margin_pct numeric,
  audience_tag text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundles_price_strategy_chk
    CHECK (price_strategy IN ('sum','fixed','discount')),
  CONSTRAINT product_bundles_discount_chk
    CHECK (discount_pct >= 0 AND discount_pct <= 50),
  CONSTRAINT product_bundles_fixed_price_chk
    CHECK (fixed_price_iqd IS NULL OR fixed_price_iqd >= 0),
  CONSTRAINT product_bundles_margin_chk
    CHECK (target_margin_pct IS NULL OR (target_margin_pct >= 0 AND target_margin_pct <= 100))
);

CREATE TABLE IF NOT EXISTS public.product_bundle_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bundle_id text NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id text,
  quantity integer NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bundle_items_qty_chk CHECK (quantity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS product_bundle_items_identity_uq
  ON public.product_bundle_items(bundle_id,product_id,COALESCE(variant_id,''));

CREATE TABLE IF NOT EXISTS public.business_expense_inbox (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fingerprint text NOT NULL UNIQUE,
  expense_date date NOT NULL,
  category text NOT NULL,
  amount_iqd numeric NOT NULL,
  original_amount numeric,
  currency text NOT NULL DEFAULT 'IQD',
  vendor text,
  description text,
  source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'captured',
  journal_entry_id text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_expense_inbox_amount_chk CHECK (amount_iqd >= 0),
  CONSTRAINT business_expense_inbox_status_chk
    CHECK (status IN ('captured','posted','ignored'))
);

CREATE INDEX IF NOT EXISTS business_expense_inbox_status_date_idx
  ON public.business_expense_inbox(status,expense_date DESC);

INSERT INTO public.business_metric_definitions(metric_key,label_ar,unit,description,formula)
VALUES
  ('attribution_coverage_pct','تغطية Attribution','percent','نسبة الطلبات المحققة التي لديها first/last-touch attribution محفوظ.','attributed_realized_orders / realized_orders * 100'),
  ('purchase_measurement_coverage_pct','تغطية Purchase Measurement','percent','نسبة الطلبات المحققة التي سجل المتصفح أنه أطلق Google purchase لها.','measured_realized_orders / realized_orders * 100'),
  ('ready_lifecycle_jobs','متابعات العملاء المستحقة','count','عدد مهام Day-7 وإعادة الشراء الجاهزة للتواصل.','COUNT(customer_lifecycle_jobs WHERE status=ready)'),
  ('fast_inventory_value','قيمة مخزون Fast','IQD','قيمة المخزون المصنف سريع الحركة.','SUM(stock_value WHERE classification=fast)'),
  ('slow_dead_inventory_value','قيمة Slow/Dead','IQD','رأس المال الموجود في مخزون بطيء أو راكد.','SUM(stock_value WHERE classification IN slow,dead)'),
  ('unposted_expense_inbox','مصاريف غير مرحلة','IQD','مبالغ مثبتة في صندوق المصاريف ولم ترحل بعد إلى دفتر الأستاذ.','SUM(amount_iqd WHERE status=captured)')
ON CONFLICT(metric_key) DO UPDATE SET
  label_ar=EXCLUDED.label_ar,
  unit=EXCLUDED.unit,
  description=EXCLUDED.description,
  formula=EXCLUDED.formula,
  definition_version='growth_os_v1',
  active=true,
  updated_at=now();

UPDATE public.business_metric_definitions
SET definition_version='growth_os_v1',updated_at=now()
WHERE metric_key IN (
  'attribution_coverage_pct','purchase_measurement_coverage_pct','ready_lifecycle_jobs',
  'fast_inventory_value','slow_dead_inventory_value','unposted_expense_inbox'
);

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0091_growth_operating_system',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'AQUAVO Growth OS: attribution receipts, SKU velocity/reorder intelligence, repurchase lifecycle, bundles, customer aquarium profiles, and expense completeness. Additive only.'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();

COMMIT;
