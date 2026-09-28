-- 0090_business_operating_system.sql
-- AQUAVO Business Operating System primitives.
-- Additive only: does not rewrite orders, accounting facts, inventory, or legacy rows.

CREATE TABLE IF NOT EXISTS public.business_metric_definitions (
  metric_key text PRIMARY KEY,
  label_ar text NOT NULL,
  unit text NOT NULL,
  description text NOT NULL,
  formula text NOT NULL,
  definition_version text NOT NULL DEFAULT 'bos_v1',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_marketing_daily (
  day date NOT NULL,
  platform text NOT NULL,
  account_key text NOT NULL DEFAULT 'default',
  spend_iqd numeric NOT NULL DEFAULT 0,
  spend_original numeric,
  currency text NOT NULL DEFAULT 'IQD',
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  tracked_conversions numeric NOT NULL DEFAULT 0,
  conversion_value_iqd numeric NOT NULL DEFAULT 0,
  source text NOT NULL,
  confidence text NOT NULL DEFAULT 'exact',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(day, platform, account_key),
  CONSTRAINT business_marketing_daily_nonnegative_chk CHECK (
    spend_iqd >= 0 AND impressions >= 0 AND clicks >= 0
    AND tracked_conversions >= 0 AND conversion_value_iqd >= 0
  ),
  CONSTRAINT business_marketing_daily_confidence_chk CHECK (
    confidence IN ('exact','estimated','unknown')
  )
);

CREATE TABLE IF NOT EXISTS public.business_daily_snapshots (
  day date PRIMARY KEY,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  currency text NOT NULL DEFAULT 'IQD',
  realized_orders integer NOT NULL DEFAULT 0,
  exact_orders integer NOT NULL DEFAULT 0,
  estimated_orders integer NOT NULL DEFAULT 0,
  gross_collected numeric NOT NULL DEFAULT 0,
  product_revenue numeric NOT NULL DEFAULT 0,
  cogs numeric NOT NULL DEFAULT 0,
  delivery_subsidy numeric NOT NULL DEFAULT 0,
  fulfillment_cost numeric NOT NULL DEFAULT 0,
  contribution_profit numeric NOT NULL DEFAULT 0,
  operating_expenses numeric NOT NULL DEFAULT 0,
  ad_spend numeric NOT NULL DEFAULT 0,
  net_operating_profit numeric NOT NULL DEFAULT 0,
  customers_total integer NOT NULL DEFAULT 0,
  repeat_customers_total integer NOT NULL DEFAULT 0,
  repeat_customer_rate_pct numeric NOT NULL DEFAULT 0,
  new_customers integer NOT NULL DEFAULT 0,
  avg_order_value numeric NOT NULL DEFAULT 0,
  inventory_value numeric,
  packaging_inventory_value numeric,
  dead_stock_value numeric,
  low_stock_skus integer,
  stockout_skus integer,
  blended_cac numeric,
  roas numeric,
  mer numeric,
  confidence text NOT NULL,
  calculation_version text NOT NULL DEFAULT 'bos_v1',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_daily_snapshots_confidence_chk CHECK (
    confidence IN ('exact','mixed','estimated')
  ),
  CONSTRAINT business_daily_snapshots_counts_chk CHECK (
    realized_orders >= 0 AND exact_orders >= 0 AND estimated_orders >= 0
    AND customers_total >= 0 AND repeat_customers_total >= 0 AND new_customers >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.business_event_log (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  occurred_at timestamptz NOT NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  title text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  fingerprint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_event_log_severity_chk CHECK (
    severity IN ('info','warning','critical')
  )
);

CREATE TABLE IF NOT EXISTS public.business_findings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fingerprint text NOT NULL UNIQUE,
  finding_type text NOT NULL,
  metric_key text REFERENCES public.business_metric_definitions(metric_key) ON DELETE SET NULL,
  severity text NOT NULL,
  title_ar text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_findings_severity_chk CHECK (
    severity IN ('info','warning','critical')
  ),
  CONSTRAINT business_findings_status_chk CHECK (
    status IN ('open','resolved')
  )
);

CREATE INDEX IF NOT EXISTS business_marketing_daily_platform_day_idx
  ON public.business_marketing_daily(platform, day DESC);
CREATE INDEX IF NOT EXISTS business_daily_snapshots_calculated_idx
  ON public.business_daily_snapshots(calculated_at DESC);
CREATE INDEX IF NOT EXISTS business_event_log_occurred_idx
  ON public.business_event_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS business_event_log_severity_idx
  ON public.business_event_log(severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS business_findings_open_idx
  ON public.business_findings(status, severity, last_seen_at DESC);

INSERT INTO public.business_metric_definitions(metric_key,label_ar,unit,description,formula)
VALUES
  ('gross_collected','إجمالي المحصل','IQD','النقد المحصل من الطلبات المحققة، شاملاً أجرة التوصيل التي دفعها الزبون.','SUM(realized_order.gross_collected)'),
  ('product_revenue','مبيعات المنتجات','IQD','إيراد المنتجات بعد استبعاد أجرة التوصيل من الطلب المحقق.','SUM(realized_order.product_revenue)'),
  ('cogs','كلفة البضاعة المباعة','IQD','كلفة الوحدات المباعة. بعد cutover تؤخذ من Accounting V2؛ وما قبله يعاد بناؤها من لقطة الافتتاح ثم الكلفة الحالية الموثقة كحل أخير.','SUM(realized_order.cogs)'),
  ('contribution_profit','ربح المساهمة','IQD','مبيعات المنتجات ناقص COGS ودعم التوصيل وكلفة تجهيز الطلب.','product_revenue - cogs - delivery_subsidy - fulfillment_cost'),
  ('operating_expenses','المصاريف التشغيلية','IQD','المصاريف التشغيلية المرحلة إلى دفتر الأستاذ، مع استبعاد COGS والتغليف ودعم التوصيل لتجنب العد المزدوج.','GL expense accounts excluding 4000,5100,5200'),
  ('ad_spend','الإنفاق الإعلاني','IQD','الإنفاق المؤكد المستورد من منصات الإعلان إلى سجل التسويق اليومي.','SUM(business_marketing_daily.spend_iqd)'),
  ('net_operating_profit','الربح التشغيلي الصافي','IQD','ربح المساهمة ناقص المصاريف التشغيلية والإنفاق الإعلاني المسجل.','contribution_profit - operating_expenses - ad_spend'),
  ('repeat_customer_rate_pct','نسبة العملاء المتكررين','percent','نسبة العملاء الذين لديهم طلبان محققان أو أكثر إلى إجمالي العملاء أصحاب الطلبات المحققة.','repeat_customers / customers_total * 100'),
  ('inventory_value','قيمة المخزون','IQD','القيمة المحاسبية الحالية للمخزون المتاح وفق مصالحة أصل المخزون.','v_accounting_inventory_asset_reconciliation.on_hand_inventory_iqd'),
  ('dead_stock_value','قيمة المخزون الراكد','IQD','تقدير كلفة المخزون الحالي لمنتجات لم تسجل بيعاً محققاً خلال 60 يوماً.','canonical_stock * authoritative_current_unit_cost for products with no realized sale in 60d'),
  ('blended_cac','كلفة اكتساب عميل ممزوجة','IQD/customer','الإنفاق الإعلاني اليومي مقسوماً على العملاء الجدد في اليوم؛ ليست Attribution مدفوعاً خالصاً.','ad_spend / new_customers'),
  ('roas','ROAS','ratio','قيمة التحويلات المنسوبة من منصة الإعلان مقسومة على الإنفاق الإعلاني.','attributed_conversion_value / ad_spend'),
  ('mer','MER','ratio','إيراد المنتجات المحقق مقسوماً على الإنفاق الإعلاني الكلي.','product_revenue / ad_spend')
ON CONFLICT(metric_key) DO UPDATE SET
  label_ar=EXCLUDED.label_ar,
  unit=EXCLUDED.unit,
  description=EXCLUDED.description,
  formula=EXCLUDED.formula,
  definition_version='bos_v1',
  active=true,
  updated_at=now();

INSERT INTO public.schema_migrations(version,checksum,notes)
VALUES(
  '0090_business_operating_system',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'Create AQUAVO Business Operating System primitives: governed metric definitions, marketing facts, daily snapshots, event timeline and findings. No legacy business rows are rewritten. Runner must normalize checksum to SHA-256(file bytes).'
)
ON CONFLICT(version) DO UPDATE SET
  checksum=EXCLUDED.checksum,
  notes=EXCLUDED.notes,
  rolled_back_at=NULL,
  applied_at=now();
