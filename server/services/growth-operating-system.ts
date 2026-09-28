import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

type Row = Record<string, unknown>;
type PurchaseProvider = "google_tag" | "meta_pixel" | "tiktok" | "posthog";
type MeasurementStatus = "emitted" | "blocked" | "failed";

function rowsOf<T extends Row = Row>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function n(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampText(value: unknown, max = 200): string | null {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function validateDay(day: string): string {
  if (!/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(day)) {
    throw new Error("GROWTH_OS_INVALID_DAY");
  }
  return day;
}

export function baghdadGrowthDay(offsetDays = 0): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(Date.now() + offsetDays * 86_400_000));
}

function normalizePhone(value: unknown): string | null {
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const easternArabic = "۰۱۲۳۴۵۶۷۸۹";
  let digits = String(value ?? "")
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (digit) => String(arabicIndic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(easternArabic.indexOf(digit)))
    .replace(/\D/g, "");
  if (digits.startsWith("00964")) digits = digits.slice(2);
  if (digits.startsWith("9640")) digits = "964" + digits.slice(4);
  if (digits.startsWith("0") && digits.length === 11) digits = "964" + digits.slice(1);
  if (digits.startsWith("7") && digits.length === 10) digits = "964" + digits;
  return /^9647\d{9}$/.test(digits) ? digits : null;
}

function firstName(value: unknown): string {
  const raw = String(value ?? "").trim().replace(/\s+/g, " ");
  return raw.split(" ")[0]?.slice(0, 30) || "عزيزي";
}

export async function recordPurchaseMeasurementReceipt(input: {
  publicOrderId: string;
  aqSid: string;
  provider: PurchaseProvider;
  eventKey: string;
  status: MeasurementStatus;
  clientValueIqd?: number | null;
  details?: Record<string, unknown>;
}) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");

  const orderResult = await db.execute(sql`
    SELECT id,total
    FROM public.orders
    WHERE COALESCE(is_test,false)=false
      AND aq_sid=${input.aqSid.slice(0,128)}
      AND (id=${input.publicOrderId} OR order_number=${input.publicOrderId})
    LIMIT 1
  `);
  const order = rowsOf(orderResult)[0];
  if (!order) return { ok: false, reason: "order_not_found" };

  const value = input.clientValueIqd == null
    ? null
    : Math.max(0, Number(input.clientValueIqd) || 0);

  await db.execute(sql`
    INSERT INTO public.purchase_measurement_receipts(
      order_id,provider,event_key,status,client_value_iqd,details,attempted_at,updated_at
    ) VALUES(
      ${String(order.id)},${input.provider},${input.eventKey.slice(0,200)},${input.status},
      ${value},${JSON.stringify(input.details ?? {})}::jsonb,now(),now()
    )
    ON CONFLICT(order_id,provider,event_key) DO UPDATE SET
      status=EXCLUDED.status,
      client_value_iqd=COALESCE(EXCLUDED.client_value_iqd,public.purchase_measurement_receipts.client_value_iqd),
      details=EXCLUDED.details,
      attempted_at=LEAST(public.purchase_measurement_receipts.attempted_at,EXCLUDED.attempted_at),
      updated_at=now()
  `);

  return { ok: true };
}

export async function getAttributionHealth() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");

  const result = await db.execute(sql`
    WITH realized AS (
      SELECT id,aq_sid,attribution_gclid,attribution_fbclid
      FROM public.orders
      WHERE COALESCE(is_test,false)=false
        AND status='delivered'
        AND payment_status='paid'
        AND cod_received=true
    ),
    google_receipts AS (
      SELECT DISTINCT order_id
      FROM public.purchase_measurement_receipts
      WHERE provider='google_tag' AND status='emitted'
    ),
    meta_receipts AS (
      SELECT DISTINCT order_id
      FROM public.purchase_measurement_receipts
      WHERE provider='meta_pixel' AND status='emitted'
    )
    SELECT
      COUNT(*)::int AS realized_orders,
      COUNT(*) FILTER (WHERE r.aq_sid IS NOT NULL)::int AS attributed_orders,
      COUNT(*) FILTER (WHERE r.attribution_gclid IS NOT NULL)::int AS google_click_orders,
      COUNT(*) FILTER (WHERE r.attribution_fbclid IS NOT NULL)::int AS meta_click_orders,
      COUNT(g.order_id)::int AS google_measured_orders,
      COUNT(m.order_id)::int AS meta_measured_orders
    FROM realized r
    LEFT JOIN google_receipts g ON g.order_id=r.id
    LEFT JOIN meta_receipts m ON m.order_id=r.id
  `);
  const row = rowsOf(result)[0] ?? {};
  const realized = n(row.realized_orders);
  const googleMeasured = n(row.google_measured_orders);
  const metaMeasured = n(row.meta_measured_orders);
  const attributed = n(row.attributed_orders);

  const provider = await db.execute(sql`
    SELECT
      COALESCE(SUM(spend_iqd),0) AS spend_iqd,
      COALESCE(SUM(tracked_conversions),0) AS tracked_conversions,
      COALESCE(SUM(conversion_value_iqd),0) AS conversion_value_iqd
    FROM public.business_marketing_daily
  `);
  const marketing = rowsOf(provider)[0] ?? {};

  return {
    realizedOrders: realized,
    attributedOrders: attributed,
    attributionCoveragePct: realized > 0 ? attributed / realized * 100 : 0,
    googleClickOrders: n(row.google_click_orders),
    metaClickOrders: n(row.meta_click_orders),
    googleMeasuredOrders: googleMeasured,
    googlePurchaseMeasurementCoveragePct: realized > 0 ? googleMeasured / realized * 100 : 0,
    metaMeasuredOrders: metaMeasured,
    metaPurchaseMeasurementCoveragePct: realized > 0 ? metaMeasured / realized * 100 : 0,
    providerSpendIqd: n(marketing.spend_iqd),
    providerTrackedConversions: n(marketing.tracked_conversions),
    providerConversionValueIqd: n(marketing.conversion_value_iqd),
  };
}

export async function refreshRepurchaseProfiles() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_NOT_CONNECTED");

  await db.execute(sql`
    INSERT INTO public.product_repurchase_profiles(
      sku_key,product_id,variant_id,is_consumable,interval_min_days,interval_target_days,interval_max_days,
      profile_source,confidence,active,notes,updated_at
    )
    SELECT
      p.id || '::',
      p.id,
      NULL,
      CASE
        WHEN p.category='طعام الأسماك' AND COALESCE(p.subcategory,'')<>'أدوات التغذية' THEN true
        WHEN p.subcategory='أدوات فحص المياه' THEN true
        WHEN p.name ILIKE '%قطن فلترة%' THEN true
        WHEN p.name ILIKE '%كربون نشط%' THEN true
        WHEN p.category='معالجة المياه'
          AND p.subcategory NOT IN ('علاج الأمراض','مكافحة الطحالب')
          AND p.name NOT ILIKE '%طحالب%'
          AND p.name NOT ILIKE '%علاج%'
          AND p.name NOT ILIKE '%دواء%' THEN true
        WHEN p.subcategory='التسميد'
          AND p.name NOT ILIKE '%سرنجة%'
          AND p.name NOT ILIKE '%أداة%' THEN true
        WHEN p.subcategory='مواد طبيعية' THEN true
        WHEN p.name ILIKE '%مزيل ترسبات%' THEN true
        ELSE false
      END,
      CASE
        WHEN p.category='طعام الأسماك' AND COALESCE(p.subcategory,'')<>'أدوات التغذية' THEN 30
        WHEN p.subcategory='أدوات فحص المياه' THEN 45
        WHEN p.name ILIKE '%قطن فلترة%' THEN 21
        WHEN p.name ILIKE '%كربون نشط%' THEN 30
        WHEN p.category='معالجة المياه'
          AND p.subcategory NOT IN ('علاج الأمراض','مكافحة الطحالب')
          AND p.name NOT ILIKE '%طحالب%'
          AND p.name NOT ILIKE '%علاج%'
          AND p.name NOT ILIKE '%دواء%' THEN 30
        WHEN p.subcategory='التسميد'
          AND p.name NOT ILIKE '%سرنجة%'
          AND p.name NOT ILIKE '%أداة%' THEN 45
        WHEN p.subcategory='مواد طبيعية' THEN 30
        WHEN p.name ILIKE '%مزيل ترسبات%' THEN 60
        ELSE NULL
      END,
      CASE
        WHEN p.category='طعام الأسماك' AND COALESCE(p.subcategory,'')<>'أدوات التغذية' THEN 45
        WHEN p.subcategory='أدوات فحص المياه' THEN 60
        WHEN p.name ILIKE '%قطن فلترة%' THEN 30
        WHEN p.name ILIKE '%كربون نشط%' THEN 45
        WHEN p.category='معالجة المياه'
          AND p.subcategory NOT IN ('علاج الأمراض','مكافحة الطحالب')
          AND p.name NOT ILIKE '%طحالب%'
          AND p.name NOT ILIKE '%علاج%'
          AND p.name NOT ILIKE '%دواء%' THEN 45
        WHEN p.subcategory='التسميد'
          AND p.name NOT ILIKE '%سرنجة%'
          AND p.name NOT ILIKE '%أداة%' THEN 60
        WHEN p.subcategory='مواد طبيعية' THEN 45
        WHEN p.name ILIKE '%مزيل ترسبات%' THEN 90
        ELSE NULL
      END,
      CASE
        WHEN p.category='طعام الأسماك' AND COALESCE(p.subcategory,'')<>'أدوات التغذية' THEN 75
        WHEN p.subcategory='أدوات فحص المياه' THEN 90
        WHEN p.name ILIKE '%قطن فلترة%' THEN 45
        WHEN p.name ILIKE '%كربون نشط%' THEN 60
        WHEN p.category='معالجة المياه'
          AND p.subcategory NOT IN ('علاج الأمراض','مكافحة الطحالب')
          AND p.name NOT ILIKE '%طحالب%'
          AND p.name NOT ILIKE '%علاج%'
          AND p.name NOT ILIKE '%دواء%' THEN 75
        WHEN p.subcategory='التسميد'
          AND p.name NOT ILIKE '%سرنجة%'
          AND p.name NOT ILIKE '%أداة%' THEN 90
        WHEN p.subcategory='مواد طبيعية' THEN 75
        WHEN p.name ILIKE '%مزيل ترسبات%' THEN 120
        ELSE NULL
      END,
      'rule','medium',true,'AQUAVO Growth OS rule profile',now()
    FROM public.products p
    WHERE p.deleted_at IS NULL
    ON CONFLICT(sku_key) DO UPDATE SET
      product_id=EXCLUDED.product_id,
      is_consumable=EXCLUDED.is_consumable,
      interval_min_days=EXCLUDED.interval_min_days,
      interval_target_days=EXCLUDED.interval_target_days,
      interval_max_days=EXCLUDED.interval_max_days,
      confidence=EXCLUDED.confidence,
      active=true,
      notes=EXCLUDED.notes,
      updated_at=now()
    WHERE public.product_repurchase_profiles.profile_source='rule'
  `);

  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS profiles,
      COUNT(*) FILTER (WHERE is_consumable AND active)::int AS consumables
    FROM public.product_repurchase_profiles
  `);
  const row=rowsOf(result)[0] ?? {};
  return { profiles:n(row.profiles), consumables:n(row.consumables) };
}

export async function refreshInventorySkuDaily(dayInput?: string) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const day=validateDay(dayInput ?? baghdadGrowthDay(-1));

  await db.execute(sql`
    WITH
    cleared AS (
      DELETE FROM public.inventory_sku_daily
      WHERE day=${day}::date
      RETURNING sku_key
    ),
    stock AS (
      SELECT b.product_id,b.variant_id,SUM(b.canonical_stock)::numeric AS stock
      FROM public.inventory_canonical_balances b
      JOIN public.products p ON p.id=b.product_id AND p.deleted_at IS NULL
      WHERE
        (
          p.has_variants=true
          AND b.variant_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) vv
            WHERE vv->>'id'=b.variant_id
          )
        )
        OR
        (
          COALESCE(p.has_variants,false)=false
          AND b.variant_id IS NULL
        )
      GROUP BY b.product_id,b.variant_id
    ),
    variant_sales AS (
      SELECT
        oi.product_id,
        NULLIF(oi.metadata->>'variantId','') AS variant_id,
        SUM(oi.quantity) FILTER (
          WHERE (COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
            BETWEEN ${day}::date-29 AND ${day}::date
        )::numeric AS units_30d,
        SUM(oi.quantity) FILTER (
          WHERE (COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
            BETWEEN ${day}::date-59 AND ${day}::date
        )::numeric AS units_60d,
        SUM(oi.quantity) FILTER (
          WHERE (COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
            BETWEEN ${day}::date-89 AND ${day}::date
        )::numeric AS units_90d,
        SUM(oi.total_price) FILTER (
          WHERE (COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
            BETWEEN ${day}::date-89 AND ${day}::date
        )::numeric AS revenue_90d
      FROM public.order_items_relational oi
      JOIN public.orders o ON o.id=oi.order_id
      LEFT JOIN public.v_order_accounting v ON v.order_id=o.id
      WHERE COALESCE(o.is_test,false)=false
        AND o.status='delivered' AND o.payment_status='paid' AND o.cod_received=true
        AND NULLIF(oi.metadata->>'variantId','') IS NOT NULL
      GROUP BY oi.product_id,NULLIF(oi.metadata->>'variantId','')
    ),
    product_sales AS (
      SELECT
        oi.product_id,
        SUM(oi.quantity) FILTER (
          WHERE (COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
            BETWEEN ${day}::date-29 AND ${day}::date
        )::numeric AS units_30d,
        SUM(oi.quantity) FILTER (
          WHERE (COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
            BETWEEN ${day}::date-59 AND ${day}::date
        )::numeric AS units_60d,
        SUM(oi.quantity) FILTER (
          WHERE (COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
            BETWEEN ${day}::date-89 AND ${day}::date
        )::numeric AS units_90d,
        SUM(oi.total_price) FILTER (
          WHERE (COALESCE(v.recognized_at,o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date
            BETWEEN ${day}::date-89 AND ${day}::date
        )::numeric AS revenue_90d
      FROM public.order_items_relational oi
      JOIN public.orders o ON o.id=oi.order_id
      LEFT JOIN public.v_order_accounting v ON v.order_id=o.id
      WHERE COALESCE(o.is_test,false)=false
        AND o.status='delivered' AND o.payment_status='paid' AND o.cod_received=true
      GROUP BY oi.product_id
    ),
    base AS (
      SELECT
        s.product_id,s.variant_id,p.name,p.created_at,s.stock,
        COALESCE(
          (
            SELECT NULLIF(vv->>'costPrice','')::numeric
            FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) vv
            WHERE vv->>'id'=s.variant_id
              AND COALESCE(vv->>'costStatus','') IN ('verified_derived','exact','known','verified_zero')
            LIMIT 1
          ),
          CASE
            WHEN p.cost_price_resolution IN ('known','verified_zero')
             AND p.packaging_cost_resolution IN ('known','verified_zero')
             AND p.insert_cost_resolution IN ('known','verified_zero')
            THEN COALESCE(p.cost_price,0)+COALESCE(p.packaging_cost,0)+COALESCE(p.insert_cost,0)
          END
        ) AS unit_cost,
        CASE WHEN s.variant_id IS NOT NULL AND vs.variant_id IS NOT NULL
          THEN COALESCE(vs.units_30d,0) ELSE COALESCE(ps.units_30d,0) END AS units_30d,
        CASE WHEN s.variant_id IS NOT NULL AND vs.variant_id IS NOT NULL
          THEN COALESCE(vs.units_60d,0) ELSE COALESCE(ps.units_60d,0) END AS units_60d,
        CASE WHEN s.variant_id IS NOT NULL AND vs.variant_id IS NOT NULL
          THEN COALESCE(vs.units_90d,0) ELSE COALESCE(ps.units_90d,0) END AS units_90d,
        CASE WHEN s.variant_id IS NOT NULL AND vs.variant_id IS NOT NULL
          THEN COALESCE(vs.revenue_90d,0) ELSE COALESCE(ps.revenue_90d,0) END AS revenue_90d,
        CASE
          WHEN s.variant_id IS NULL THEN 'product'
          WHEN vs.variant_id IS NOT NULL THEN 'variant'
          ELSE 'product_fallback'
        END AS sales_basis
      FROM stock s
      JOIN public.products p ON p.id=s.product_id AND p.deleted_at IS NULL
      LEFT JOIN variant_sales vs ON vs.product_id=s.product_id AND vs.variant_id=s.variant_id
      LEFT JOIN product_sales ps ON ps.product_id=s.product_id
    ),
    scored AS (
      SELECT
        b.*,
        GREATEST(0,(${day}::date-(b.created_at AT TIME ZONE 'Asia/Baghdad')::date))::int AS age_days,
        COALESCE(b.units_90d/90.0,0) AS avg_daily_units_90d,
        CASE
          WHEN b.stock<=0 THEN 'stockout'
          WHEN GREATEST(0,(${day}::date-(b.created_at AT TIME ZONE 'Asia/Baghdad')::date))<30
            AND b.units_90d=0 THEN 'new'
          WHEN b.units_30d>=4 OR b.units_90d>=12 THEN 'fast'
          WHEN b.units_30d>=2 OR b.units_90d>=6 THEN 'medium'
          WHEN b.units_90d>0 THEN 'slow'
          WHEN GREATEST(0,(${day}::date-(b.created_at AT TIME ZONE 'Asia/Baghdad')::date))>=60 THEN 'dead'
          ELSE 'new'
        END AS classification
      FROM base b
    )
    INSERT INTO public.inventory_sku_daily(
      day,sku_key,product_id,variant_id,stock,unit_cost,stock_value,units_30d,units_60d,units_90d,
      revenue_90d,avg_daily_units_90d,sell_through_90d_pct,days_inventory,classification,sales_basis,
      reorder_point,recommended_reorder_qty,capital_locked,confidence,details,calculated_at
    )
    SELECT
      ${day}::date,
      s.product_id || '::' || COALESCE(s.variant_id,''),
      s.product_id,s.variant_id,s.stock,s.unit_cost,
      CASE WHEN s.unit_cost IS NULL THEN NULL ELSE s.stock*s.unit_cost END,
      s.units_30d,s.units_60d,s.units_90d,s.revenue_90d,s.avg_daily_units_90d,
      CASE WHEN s.units_90d+s.stock>0
        THEN ROUND(100.0*s.units_90d/(s.units_90d+s.stock),2) ELSE 0 END,
      CASE WHEN s.avg_daily_units_90d>0
        THEN ROUND(s.stock/s.avg_daily_units_90d,1) ELSE NULL END,
      s.classification,
      s.sales_basis,
      CEIL(s.avg_daily_units_90d*44),
      CASE
        WHEN s.sales_basis<>'product_fallback'
         AND s.units_90d>=2
         AND s.stock < CEIL(s.avg_daily_units_90d*44)
        THEN GREATEST(0,CEIL(s.avg_daily_units_90d*60-s.stock))
        ELSE 0
      END,
      CASE WHEN s.classification IN ('slow','dead') AND s.unit_cost IS NOT NULL
        THEN s.stock*s.unit_cost ELSE 0 END,
      CASE
        WHEN s.unit_cost IS NULL THEN 'estimated'
        WHEN s.sales_basis='product_fallback' THEN 'mixed'
        ELSE 'high'
      END,
      jsonb_build_object(
        'productName',s.name,'ageDays',s.age_days,'leadTimeDays',30,
        'safetyDays',14,'targetCoverageDays',60,
        'classificationRules','fast>=4/30d or >=12/90d; medium>=2/30d or >=6/90d; slow any sale/90d; dead no sale and age>=60d'
      ),
      now()
    FROM scored s
    ON CONFLICT(day,sku_key) DO UPDATE SET
      stock=EXCLUDED.stock,unit_cost=EXCLUDED.unit_cost,stock_value=EXCLUDED.stock_value,
      units_30d=EXCLUDED.units_30d,units_60d=EXCLUDED.units_60d,units_90d=EXCLUDED.units_90d,
      revenue_90d=EXCLUDED.revenue_90d,avg_daily_units_90d=EXCLUDED.avg_daily_units_90d,
      sell_through_90d_pct=EXCLUDED.sell_through_90d_pct,days_inventory=EXCLUDED.days_inventory,
      classification=EXCLUDED.classification,sales_basis=EXCLUDED.sales_basis,
      reorder_point=EXCLUDED.reorder_point,recommended_reorder_qty=EXCLUDED.recommended_reorder_qty,
      capital_locked=EXCLUDED.capital_locked,confidence=EXCLUDED.confidence,details=EXCLUDED.details,
      calculated_at=now()
  `);

  return getInventoryIntelligence(50,day);
}

export async function getInventoryIntelligence(limitInput=50, dayInput?: string) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const limit=Math.max(1,Math.min(200,Math.floor(Number(limitInput)||50)));

  const dayResult=dayInput
    ? [{day:validateDay(dayInput)}]
    : rowsOf(await db.execute(sql`SELECT MAX(day) AS day FROM public.inventory_sku_daily`));
  const rawDay=dayResult[0]?.day;
  const day=rawDay instanceof Date
    ? rawDay.toISOString().slice(0,10)
    : String(rawDay ?? "").slice(0,10);
  if(!day) {
    return {
      day:null,
      summary:{skuCount:0,fast:0,medium:0,slow:0,dead:0,new:0,stockout:0,capitalLocked:0,reorderSkus:0,reorderValue:0},
      items:[],
    };
  }

  const summary=await db.execute(sql`
    SELECT
      COUNT(*)::int AS sku_count,
      COUNT(*) FILTER(WHERE classification='fast')::int AS fast,
      COUNT(*) FILTER(WHERE classification='medium')::int AS medium,
      COUNT(*) FILTER(WHERE classification='slow')::int AS slow,
      COUNT(*) FILTER(WHERE classification='dead')::int AS dead,
      COUNT(*) FILTER(WHERE classification='new')::int AS new_count,
      COUNT(*) FILTER(WHERE classification='stockout')::int AS stockout,
      COALESCE(SUM(capital_locked),0) AS capital_locked,
      COUNT(*) FILTER(WHERE recommended_reorder_qty>0)::int AS reorder_skus,
      COALESCE(SUM(recommended_reorder_qty*COALESCE(unit_cost,0)),0) AS reorder_value
    FROM public.inventory_sku_daily
    WHERE day=${day}::date
  `);
  const items=await db.execute(sql`
    SELECT i.*,p.name,p.category,p.subcategory,p.is_storefront_visible
    FROM public.inventory_sku_daily i
    JOIN public.products p ON p.id=i.product_id
    WHERE i.day=${day}::date
    ORDER BY
      CASE i.classification
        WHEN 'stockout' THEN 0 WHEN 'fast' THEN 1 WHEN 'medium' THEN 2
        WHEN 'slow' THEN 3 WHEN 'dead' THEN 4 ELSE 5
      END,
      i.recommended_reorder_qty DESC,i.capital_locked DESC,p.name
    LIMIT ${limit}
  `);
  const s=rowsOf(summary)[0] ?? {};
  return {
    day,
    summary:{
      skuCount:n(s.sku_count),fast:n(s.fast),medium:n(s.medium),slow:n(s.slow),
      dead:n(s.dead),new:n(s.new_count),stockout:n(s.stockout),
      capitalLocked:n(s.capital_locked),reorderSkus:n(s.reorder_skus),reorderValue:n(s.reorder_value),
    },
    items:rowsOf(items).map((row)=>({
      skuKey:String(row.sku_key ?? ""),
      productId:String(row.product_id ?? ""),
      variantId:row.variant_id == null ? null : String(row.variant_id),
      name:String(row.name ?? ""),
      category:String(row.category ?? ""),
      subcategory:String(row.subcategory ?? ""),
      stock:n(row.stock),
      unitCost:row.unit_cost == null ? null : n(row.unit_cost),
      stockValue:row.stock_value == null ? null : n(row.stock_value),
      units30d:n(row.units_30d),units60d:n(row.units_60d),units90d:n(row.units_90d),
      sellThrough90dPct:n(row.sell_through_90d_pct),
      daysInventory:row.days_inventory == null ? null : n(row.days_inventory),
      classification:String(row.classification ?? ""),
      salesBasis:String(row.sales_basis ?? ""),
      reorderPoint:n(row.reorder_point),
      recommendedReorderQty:n(row.recommended_reorder_qty),
      capitalLocked:n(row.capital_locked),
      confidence:String(row.confidence ?? ""),
      storefrontVisible:Boolean(row.is_storefront_visible),
    })),
  };
}

export async function refreshCustomerAquariumProfiles() {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");

  // Repair the old profile vocabulary first. `fishType` was never a
  // livestock list; its real values are system classes such as freshwater,
  // saltwater and planted. Keep those in water_profile so the CRM does not
  // later recommend against fictitious livestock.
  await db.execute(sql`
    UPDATE public.customer_profiles cp
    SET
      livestock='[]'::jsonb,
      water_profile=CASE
        WHEN cp.water_profile='{}'::jsonb
          THEN jsonb_build_object('legacySystemType',u.aquarium_profile->>'fishType')
        ELSE cp.water_profile
      END,
      updated_at=now()
    FROM public.users u
    WHERE cp.user_id=u.id
      AND cp.aquarium_profile_source='import'
      AND COALESCE(u.aquarium_profile->>'fishType','') IN ('freshwater','saltwater','planted')
      AND cp.livestock=jsonb_build_array(u.aquarium_profile->>'fishType')
  `);

  await db.execute(sql`
    UPDATE public.customer_profiles cp
    SET
      tank_dimensions=CASE
        WHEN COALESCE(u.aquarium_profile->>'tankSize','')<>'' AND cp.tank_dimensions='{}'::jsonb
          THEN jsonb_build_object('legacySizeClass',u.aquarium_profile->>'tankSize')
        ELSE cp.tank_dimensions
      END,
      water_profile=CASE
        WHEN COALESCE(u.aquarium_profile->>'fishType','')<>'' AND cp.water_profile='{}'::jsonb
          THEN jsonb_build_object('legacySystemType',u.aquarium_profile->>'fishType')
        ELSE cp.water_profile
      END,
      goals=CASE
        WHEN COALESCE(u.aquarium_profile->>'mainProblem','')<>'' AND cp.goals='[]'::jsonb
          THEN jsonb_build_array(u.aquarium_profile->>'mainProblem')
        ELSE cp.goals
      END,
      aquarium_notes=CASE
        WHEN COALESCE(u.aquarium_profile->>'tankAge','')<>'' AND cp.aquarium_notes IS NULL
          THEN 'Tank age: ' || (u.aquarium_profile->>'tankAge')
        ELSE cp.aquarium_notes
      END,
      aquarium_profile_source=COALESCE(cp.aquarium_profile_source,'import'),
      aquarium_last_verified_at=COALESCE(cp.aquarium_last_verified_at,u.updated_at),
      updated_at=now()
    FROM public.users u
    WHERE cp.user_id=u.id
      AND u.aquarium_profile IS NOT NULL
      AND u.aquarium_profile<>'{}'::jsonb
  `);

  return getCustomerProfileCoverage();
}

export async function getCustomerProfileCoverage() {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const result=await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER(
        WHERE tank_volume_liters IS NOT NULL
           OR tank_dimensions<>'{}'::jsonb
           OR livestock<>'[]'::jsonb
           OR plants<>'[]'::jsonb
           OR filter_setup<>'{}'::jsonb
           OR heater_setup<>'{}'::jsonb
           OR water_profile<>'{}'::jsonb
           OR goals<>'[]'::jsonb
      )::int AS detailed
    FROM public.customer_profiles
  `);
  const row=rowsOf(result)[0] ?? {};
  const total=n(row.total),detailed=n(row.detailed);
  return {total,detailed,coveragePct:total>0?detailed/total*100:0};
}

export async function getCustomerAquariumProfiles(limitInput=50) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const limit=Math.max(1,Math.min(200,Math.floor(Number(limitInput)||50)));
  const result=await db.execute(sql`
    SELECT
      id,phone,name,city,user_id,total_orders_count,total_spent_iqd,last_order_at,segment,
      tank_volume_liters,tank_dimensions,livestock,plants,filter_setup,heater_setup,
      water_profile,goals,aquarium_notes,aquarium_profile_source,aquarium_last_verified_at,updated_at
    FROM public.customer_profiles
    ORDER BY COALESCE(last_order_at,updated_at) DESC,id DESC
    LIMIT ${limit}
  `);
  return rowsOf(result);
}

export async function updateCustomerAquariumProfile(input:{
  id:number;
  tankVolumeLiters?:number|null;
  tankDimensions?:Record<string,unknown>;
  livestock?:unknown[];
  plants?:unknown[];
  filterSetup?:Record<string,unknown>;
  heaterSetup?:Record<string,unknown>;
  waterProfile?:Record<string,unknown>;
  goals?:unknown[];
  notes?:string|null;
  source?:"admin"|"customer"|"import"|"conversation";
}) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  if(!Number.isInteger(input.id) || input.id<=0) throw new Error("CUSTOMER_PROFILE_INVALID_ID");

  const current=await db.execute(sql`
    SELECT id FROM public.customer_profiles WHERE id=${input.id} LIMIT 1
  `);
  if(rowsOf(current).length===0) return {ok:false,reason:"profile_not_found"};

  const hasVolume=input.tankVolumeLiters !== undefined;
  const hasDimensions=input.tankDimensions !== undefined;
  const hasLivestock=input.livestock !== undefined;
  const hasPlants=input.plants !== undefined;
  const hasFilter=input.filterSetup !== undefined;
  const hasHeater=input.heaterSetup !== undefined;
  const hasWater=input.waterProfile !== undefined;
  const hasGoals=input.goals !== undefined;
  const hasNotes=input.notes !== undefined;

  await db.execute(sql`
    UPDATE public.customer_profiles
    SET
      tank_volume_liters=CASE WHEN ${hasVolume} THEN ${input.tankVolumeLiters ?? null} ELSE tank_volume_liters END,
      tank_dimensions=CASE WHEN ${hasDimensions} THEN ${JSON.stringify(input.tankDimensions ?? {})}::jsonb ELSE tank_dimensions END,
      livestock=CASE WHEN ${hasLivestock} THEN ${JSON.stringify(input.livestock ?? [])}::jsonb ELSE livestock END,
      plants=CASE WHEN ${hasPlants} THEN ${JSON.stringify(input.plants ?? [])}::jsonb ELSE plants END,
      filter_setup=CASE WHEN ${hasFilter} THEN ${JSON.stringify(input.filterSetup ?? {})}::jsonb ELSE filter_setup END,
      heater_setup=CASE WHEN ${hasHeater} THEN ${JSON.stringify(input.heaterSetup ?? {})}::jsonb ELSE heater_setup END,
      water_profile=CASE WHEN ${hasWater} THEN ${JSON.stringify(input.waterProfile ?? {})}::jsonb ELSE water_profile END,
      goals=CASE WHEN ${hasGoals} THEN ${JSON.stringify(input.goals ?? [])}::jsonb ELSE goals END,
      aquarium_notes=CASE WHEN ${hasNotes} THEN ${clampText(input.notes,2000)} ELSE aquarium_notes END,
      aquarium_profile_source=${input.source ?? "admin"},
      aquarium_last_verified_at=now(),
      updated_at=now()
    WHERE id=${input.id}
  `);
  return {ok:true,id:input.id};
}

export async function planCustomerLifecycleJobs() {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");

  await refreshRepurchaseProfiles();
  await refreshCustomerAquariumProfiles();

  await db.execute(sql`
    WITH delivered AS (
      SELECT
        o.id AS order_id,
        public.aquavo_normalize_iraqi_phone(o.customer_phone) AS customer_phone,
        COALESCE(v.recognized_at,dc.created_at,o.updated_at AT TIME ZONE 'UTC',o.created_at AT TIME ZONE 'UTC') AS delivered_at
      FROM public.orders o
      LEFT JOIN public.v_order_accounting v ON v.order_id=o.id
      LEFT JOIN LATERAL (
        SELECT MAX(j.created_at) AS created_at
        FROM public.customer_message_jobs j
        WHERE j.order_id=o.id AND j.job_type='delivery_care'
      ) dc ON true
      WHERE COALESCE(o.is_test,false)=false
        AND o.status='delivered'
        AND o.payment_status='paid'
        AND o.cod_received=true
    )
    INSERT INTO public.customer_lifecycle_jobs(
      customer_phone,order_id,job_type,due_at,status,channel,metadata
    )
    SELECT
      d.customer_phone,d.order_id,'day7_care',d.delivered_at+interval '7 days','planned','manual',
      jsonb_build_object('source','growth_os','deliveredAt',d.delivered_at)
    FROM delivered d
    WHERE d.customer_phone IS NOT NULL
      AND d.delivered_at >= now()-interval '45 days'
    ON CONFLICT(order_id,job_type) DO NOTHING
  `);

  await db.execute(sql`
    WITH delivered AS (
      SELECT
        o.id AS order_id,
        public.aquavo_normalize_iraqi_phone(o.customer_phone) AS customer_phone,
        COALESCE(v.recognized_at,dc.created_at,o.updated_at AT TIME ZONE 'UTC',o.created_at AT TIME ZONE 'UTC') AS delivered_at
      FROM public.orders o
      LEFT JOIN public.v_order_accounting v ON v.order_id=o.id
      LEFT JOIN LATERAL (
        SELECT MAX(j.created_at) AS created_at
        FROM public.customer_message_jobs j
        WHERE j.order_id=o.id AND j.job_type='delivery_care'
      ) dc ON true
      WHERE COALESCE(o.is_test,false)=false
        AND o.status='delivered'
        AND o.payment_status='paid'
        AND o.cod_received=true
    ),
    repurchase AS (
      SELECT
        d.customer_phone,d.order_id,d.delivered_at,
        MIN(pr.interval_target_days) AS target_days,
        jsonb_agg(DISTINCT oi.product_id) AS products
      FROM delivered d
      JOIN public.order_items_relational oi ON oi.order_id=d.order_id
      JOIN public.product_repurchase_profiles pr
        ON pr.sku_key=oi.product_id || '::'
       AND pr.is_consumable=true AND pr.active=true
      WHERE d.customer_phone IS NOT NULL
        AND d.delivered_at >= now()-interval '90 days'
      GROUP BY d.customer_phone,d.order_id,d.delivered_at
    )
    INSERT INTO public.customer_lifecycle_jobs(
      customer_phone,order_id,job_type,due_at,status,channel,recommended_product_ids,metadata
    )
    SELECT
      r.customer_phone,r.order_id,'repurchase',
      r.delivered_at + make_interval(days=>r.target_days),
      'planned','manual',r.products,
      jsonb_build_object('source','consumables_engine','targetDays',r.target_days,'deliveredAt',r.delivered_at)
    FROM repurchase r
    ON CONFLICT(order_id,job_type) DO NOTHING
  `);

  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs j
    SET status='cancelled',cancelled_at=now(),updated_at=now(),
        metadata=j.metadata || jsonb_build_object('cancelReason','order_no_longer_eligible')
    FROM public.orders o
    WHERE o.id=j.order_id
      AND j.status IN ('planned','ready')
      AND (o.status<>'delivered' OR o.payment_status<>'paid' OR COALESCE(o.cod_received,false)=false)
  `);

  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs j
    SET status='suppressed',updated_at=now(),
        metadata=j.metadata || jsonb_build_object('suppressReason','already_replenished','suppressedAt',now())
    WHERE j.job_type='repurchase'
      AND j.status IN ('planned','ready')
      AND EXISTS (
        SELECT 1
        FROM public.orders later
        JOIN public.order_items_relational li ON li.order_id=later.id
        WHERE COALESCE(later.is_test,false)=false
          AND later.status='delivered'
          AND later.payment_status='paid'
          AND later.cod_received=true
          AND public.aquavo_normalize_iraqi_phone(later.customer_phone)=j.customer_phone
          AND later.created_at > (
            SELECT original.created_at FROM public.orders original WHERE original.id=j.order_id
          )
          AND li.product_id IN (
            SELECT jsonb_array_elements_text(j.recommended_product_ids)
          )
      )
  `);

  await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='ready',updated_at=now()
    WHERE status='planned' AND due_at<=now()
  `);

  return getLifecycleOverview(50);
}

export async function getLifecycleOverview(limitInput=50) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const limit=Math.max(1,Math.min(200,Math.floor(Number(limitInput)||50)));

  const summary=await db.execute(sql`
    SELECT
      COUNT(*) FILTER(WHERE status='ready')::int AS ready,
      COUNT(*) FILTER(WHERE status='planned')::int AS planned,
      COUNT(*) FILTER(WHERE status='completed')::int AS completed,
      COUNT(*) FILTER(WHERE status='suppressed')::int AS suppressed,
      COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled,
      COUNT(*) FILTER(WHERE job_type='day7_care' AND status='ready')::int AS day7_ready,
      COUNT(*) FILTER(WHERE job_type='repurchase' AND status='ready')::int AS repurchase_ready
    FROM public.customer_lifecycle_jobs
  `);

  const jobs=await db.execute(sql`
    SELECT
      j.id,j.job_type,j.due_at,j.status,j.customer_phone,j.recommended_product_ids,j.metadata,
      o.order_number,o.customer_name,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'price',p.price))
        FROM public.products p
        WHERE p.id IN (SELECT jsonb_array_elements_text(j.recommended_product_ids))
      ),'[]'::jsonb) AS recommended_products
    FROM public.customer_lifecycle_jobs j
    JOIN public.orders o ON o.id=j.order_id
    WHERE j.status IN ('ready','planned')
    ORDER BY CASE j.status WHEN 'ready' THEN 0 ELSE 1 END,j.due_at ASC
    LIMIT ${limit}
  `);

  const s=rowsOf(summary)[0] ?? {};
  return {
    summary:{
      ready:n(s.ready),planned:n(s.planned),completed:n(s.completed),suppressed:n(s.suppressed),
      cancelled:n(s.cancelled),day7Ready:n(s.day7_ready),repurchaseReady:n(s.repurchase_ready),
    },
    jobs:rowsOf(jobs).map((row)=>{
      const phone=normalizePhone(row.customer_phone);
      const name=firstName(row.customer_name);
      const type=String(row.job_type);
      const message=type==="day7_care"
        ? `هلا ${name}، حبيت نطمن عليك بعد استلام طلبك من AQUAVO. كلشي تمام بالحوض والمعدات؟ إذا عندك أي ملاحظة أو سؤال إحنا بالخدمة.`
        : `هلا ${name}، حسب مشترياتك السابقة ممكن يكون قرب وقت تجديد بعض المستهلكات. إذا تحب نراجع احتياج حوضك قبل لا تطلب، اكتبلنا ونرتبلك المناسب فقط.`;
      return {
        id:String(row.id),
        jobType:type,
        dueAt:row.due_at,
        status:String(row.status),
        orderNumber:String(row.order_number ?? ""),
        customerName:String(row.customer_name ?? ""),
        customerPhone:phone,
        recommendedProducts:row.recommended_products ?? [],
        message,
        whatsappUrl:phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null,
      };
    }),
  };
}

export async function markLifecycleJobCompleted(jobId:string) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const result=await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='completed',completed_at=now(),updated_at=now()
    WHERE id=${jobId} AND status IN ('ready','planned')
    RETURNING id,job_type,order_id,status,completed_at
  `);
  const row=rowsOf(result)[0];
  if(!row) return {ok:false,reason:"job_not_found_or_terminal"};
  return {ok:true,job:row};
}

export async function suppressLifecycleJob(jobId:string, reason:string) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const cleanReason=clampText(reason,500) ?? "manual_suppression";
  const result=await db.execute(sql`
    UPDATE public.customer_lifecycle_jobs
    SET status='suppressed',
        metadata=metadata || jsonb_build_object('suppressReason',${cleanReason},'suppressedAt',now()),
        updated_at=now()
    WHERE id=${jobId} AND status IN ('ready','planned')
    RETURNING id,job_type,order_id,status,updated_at
  `);
  const row=rowsOf(result)[0];
  if(!row) return {ok:false,reason:"job_not_found_or_terminal"};
  return {ok:true,job:row};
}

const DEFAULT_BUNDLES = [
  {
    slug:"betta-care-starter",
    name:"باقة بداية البيتا",
    description:"أساسيات الرعاية اليومية للبيتا بدون شراء قطع غير ضرورية.",
    audience:"betta",
    items:[
      ["yee-c1-1124-1",null],
      ["general-sponge-filter-xy180","xy-180"],
      ["sunsun-air-pump",null],
      ["houyi-oxygenation-tube","4m-black"],
      ["yee-02924",null],
      ["houyi-suction-thermometer",null],
    ],
  },
  {
    slug:"guppy-starter",
    name:"باقة بداية الجوبي",
    description:"فلترة وتهوية وطعام ومعالجة ماء مناسبة كبداية لحوض جوبي.",
    audience:"guppy",
    items:[
      ["yee-c1-1113-2",null],
      ["general-sponge-filter-xy180","xy-180"],
      ["sunsun-air-pump",null],
      ["houyi-oxygenation-tube","4m-black"],
      ["yee-02924",null],
      ["houyi-suction-thermometer",null],
    ],
  },
  {
    slug:"planted-tank-starter",
    name:"باقة بداية الحوض المزروع",
    description:"مواد تأسيس وعناية بالأكواسكيب والنباتات.",
    audience:"planted",
    items:[
      ["yee-07509","fine15"],
      ["houyi-moss-glue-5g",null],
      ["houyi-tool-kit",null],
      ["houyi-base-fertilizer",null],
      ["houyi-moss-line",null],
    ],
  },
  {
    slug:"filter-maintenance-pack",
    name:"باقة صيانة الفلتر",
    description:"مواد وأدوات أساسية لصيانة الفلتر والخراطيم.",
    audience:"maintenance",
    items:[
      ["houyi-white-cotton",null],
      ["houyi-activated-carbon",null],
      ["houyi-net-bag","white-15x20"],
      ["houyi-hose-brush",null],
    ],
  },
  {
    slug:"water-testing-pack",
    name:"باقة فحص ومراقبة الماء",
    description:"فحص سريع ومراقبة حرارة الحوض مع أساسيات معالجة الماء.",
    audience:"testing",
    items:[
      ["yee-c4-1123-1a",null],
      ["houyi-led-light",null],
      ["yee-02924",null],
    ],
  },
] as const;

export async function seedDefaultBundles() {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");

  for(const definition of DEFAULT_BUNDLES){
    const expectedItemCount=definition.items.length;
    const bundleResult=await db.execute(sql`
      INSERT INTO public.product_bundles(
        slug,name_ar,description_ar,active,storefront_visible,price_strategy,discount_pct,
        target_margin_pct,audience_tag,metadata,updated_at
      ) VALUES(
        ${definition.slug},${definition.name},${definition.description},true,false,'sum',0,25,
        ${definition.audience},${JSON.stringify({seed:"growth_os_v2",expectedItemCount})}::jsonb,now()
      )
      ON CONFLICT(slug) DO UPDATE SET
        name_ar=EXCLUDED.name_ar,
        description_ar=EXCLUDED.description_ar,
        active=true,
        storefront_visible=false,
        price_strategy='sum',
        discount_pct=0,
        target_margin_pct=25,
        audience_tag=EXCLUDED.audience_tag,
        metadata=EXCLUDED.metadata,
        updated_at=now()
      RETURNING id
    `);
    const bundleId=String(rowsOf(bundleResult)[0]?.id ?? "");
    if(!bundleId) continue;

    await db.execute(sql`DELETE FROM public.product_bundle_items WHERE bundle_id=${bundleId}`);

    for(let index=0; index<definition.items.length; index+=1){
      const [productId,variantId]=definition.items[index];
      await db.execute(sql`
        INSERT INTO public.product_bundle_items(bundle_id,product_id,variant_id,quantity,required,sort_order)
        SELECT ${bundleId},p.id,${variantId},1,true,${index}
        FROM public.products p
        WHERE p.id=${productId}
          AND p.deleted_at IS NULL
          AND p.is_storefront_visible=true
          AND (
            ${variantId}::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) vv
              WHERE vv->>'id'=${variantId}
            )
          )
        ON CONFLICT DO NOTHING
      `);
    }

    await db.execute(sql`
      UPDATE public.product_bundles b
      SET storefront_visible=(
        SELECT COUNT(*)=${expectedItemCount}
        FROM public.product_bundle_items bi
        WHERE bi.bundle_id=b.id
      ),updated_at=now()
      WHERE b.id=${bundleId}
    `);
  }

  return getBundles(false);
}

export async function getBundles(publicOnly=true) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");

  const result=await db.execute(sql`
    WITH item_data AS (
      SELECT
        b.id AS bundle_id,
        bi.product_id,bi.variant_id,bi.quantity,bi.required,bi.sort_order,
        p.name,p.slug,p.price,p.thumbnail,p.stock,p.has_variants,p.variants,
        COALESCE(
          (
            SELECT NULLIF(vv->>'price','')::numeric
            FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) vv
            WHERE vv->>'id'=bi.variant_id LIMIT 1
          ),
          p.price
        ) AS unit_price,
        COALESCE(
          (
            SELECT NULLIF(vv->>'stock','')::numeric
            FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) vv
            WHERE vv->>'id'=bi.variant_id LIMIT 1
          ),
          p.stock
        ) AS item_stock,
        (
          SELECT vv->>'label'
          FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) vv
          WHERE vv->>'id'=bi.variant_id LIMIT 1
        ) AS variant_label,
        COALESCE(
          (
            SELECT NULLIF(vv->>'costPrice','')::numeric
            FROM jsonb_array_elements(COALESCE(p.variants,'[]'::jsonb)) vv
            WHERE vv->>'id'=bi.variant_id
              AND COALESCE(vv->>'costStatus','') IN ('verified_derived','exact','known','verified_zero')
            LIMIT 1
          ),
          CASE
            WHEN p.cost_price_resolution IN ('known','verified_zero')
             AND p.packaging_cost_resolution IN ('known','verified_zero')
             AND p.insert_cost_resolution IN ('known','verified_zero')
            THEN COALESCE(p.cost_price,0)+COALESCE(p.packaging_cost,0)+COALESCE(p.insert_cost,0)
          END
        ) AS unit_cost
      FROM public.product_bundles b
      JOIN public.product_bundle_items bi ON bi.bundle_id=b.id
      JOIN public.products p ON p.id=bi.product_id AND p.deleted_at IS NULL AND p.is_storefront_visible=true
      WHERE b.active=true
        AND (${publicOnly}=false OR b.storefront_visible=true)
    ),
    agg AS (
      SELECT
        b.id,b.slug,b.name_ar,b.description_ar,b.price_strategy,b.fixed_price_iqd,b.discount_pct,
        b.target_margin_pct,b.audience_tag,b.storefront_visible,b.metadata,b.updated_at,
        COALESCE(SUM(i.unit_price*i.quantity),0) AS retail_sum,
        SUM(i.unit_cost*i.quantity) AS cost_sum,
        BOOL_AND(CASE WHEN i.required THEN i.item_stock>=i.quantity AND i.unit_price>0 ELSE true END) AS in_stock,
        BOOL_OR(i.has_variants AND i.variant_id IS NULL) AS requires_variant_selection,
        jsonb_agg(jsonb_build_object(
          'productId',i.product_id,'variantId',i.variant_id,'variantLabel',i.variant_label,
          'quantity',i.quantity,'required',i.required,'name',i.name,'slug',i.slug,
          'price',i.unit_price,'stock',i.item_stock,'thumbnail',i.thumbnail,'hasVariants',i.has_variants
        ) ORDER BY i.sort_order) AS items
      FROM public.product_bundles b
      JOIN item_data i ON i.bundle_id=b.id
      GROUP BY b.id
    )
    SELECT *,
      CASE price_strategy
        WHEN 'fixed' THEN fixed_price_iqd
        WHEN 'discount' THEN ROUND(retail_sum*(1-discount_pct/100.0))
        ELSE retail_sum
      END AS bundle_price,
      CASE
        WHEN cost_sum IS NOT NULL
         AND (CASE price_strategy
           WHEN 'fixed' THEN fixed_price_iqd
           WHEN 'discount' THEN ROUND(retail_sum*(1-discount_pct/100.0))
           ELSE retail_sum END)>0
        THEN ROUND(
          100.0*((CASE price_strategy
            WHEN 'fixed' THEN fixed_price_iqd
            WHEN 'discount' THEN ROUND(retail_sum*(1-discount_pct/100.0))
            ELSE retail_sum END)-cost_sum)
          /(CASE price_strategy
            WHEN 'fixed' THEN fixed_price_iqd
            WHEN 'discount' THEN ROUND(retail_sum*(1-discount_pct/100.0))
            ELSE retail_sum END),
          2
        )
        ELSE NULL
      END AS gross_margin_pct
    FROM agg
    ORDER BY name_ar
  `);

  return rowsOf(result).map((row)=>{
    const shared={
      id:String(row.id),
      slug:String(row.slug),
      nameAr:String(row.name_ar),
      descriptionAr:String(row.description_ar),
      priceStrategy:String(row.price_strategy),
      discountPct:n(row.discount_pct),
      retailSum:n(row.retail_sum),
      bundlePrice:n(row.bundle_price),
      inStock:Boolean(row.in_stock),
      requiresVariantSelection:Boolean(row.requires_variant_selection),
      audienceTag:row.audience_tag == null ? null : String(row.audience_tag),
      storefrontVisible:Boolean(row.storefront_visible),
      items:row.items ?? [],
    };
    if(publicOnly) return shared;
    return {
      ...shared,
      estimatedCost:row.cost_sum == null ? null : n(row.cost_sum),
      grossMarginPct:row.gross_margin_pct == null ? null : n(row.gross_margin_pct),
    };
  });
}

export async function captureBusinessExpense(input:{
  fingerprint:string;
  expenseDate:string;
  category:string;
  amountIqd:number;
  originalAmount?:number|null;
  currency?:string;
  vendor?:string|null;
  description?:string|null;
  source:string;
  evidence?:Record<string,unknown>;
}) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const day=validateDay(input.expenseDate);

  await db.execute(sql`
    INSERT INTO public.business_expense_inbox(
      fingerprint,expense_date,category,amount_iqd,original_amount,currency,vendor,description,
      source,evidence,status,updated_at
    ) VALUES(
      ${input.fingerprint.slice(0,300)},${day},${input.category.slice(0,100)},
      ${Math.max(0,input.amountIqd)},${input.originalAmount ?? null},
      ${(input.currency ?? "IQD").slice(0,8)},${clampText(input.vendor,200)},
      ${clampText(input.description,1000)},${input.source.slice(0,100)},
      ${JSON.stringify(input.evidence ?? {})}::jsonb,'captured',now()
    )
    ON CONFLICT(fingerprint) DO UPDATE SET
      expense_date=EXCLUDED.expense_date,
      category=EXCLUDED.category,
      amount_iqd=EXCLUDED.amount_iqd,
      original_amount=EXCLUDED.original_amount,
      currency=EXCLUDED.currency,
      vendor=EXCLUDED.vendor,
      description=EXCLUDED.description,
      source=EXCLUDED.source,
      evidence=EXCLUDED.evidence,
      status=CASE
        WHEN public.business_expense_inbox.status='posted' THEN 'posted'
        ELSE 'captured'
      END,
      updated_at=now()
  `);
  return {ok:true,fingerprint:input.fingerprint};
}

export async function ignoreBusinessExpense(fingerprint:string,reason:string) {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");
  const cleanReason=clampText(reason,500) ?? "source_expense_deleted";
  const result=await db.execute(sql`
    UPDATE public.business_expense_inbox
    SET status='ignored',
        evidence=evidence || jsonb_build_object('ignoreReason',${cleanReason}),
        reviewed_at=now(),updated_at=now()
    WHERE fingerprint=${fingerprint}
      AND status<>'posted'
    RETURNING id
  `);
  return {ok:rowsOf(result).length>0};
}

export async function getExpenseCompleteness() {
  const db=getDb();
  if(!db) throw new Error("DATABASE_NOT_CONNECTED");

  const inbox=await db.execute(sql`
    SELECT
      COUNT(*) FILTER(WHERE status='captured')::int AS captured_count,
      COALESCE(SUM(amount_iqd) FILTER(WHERE status='captured'),0) AS captured_amount,
      COUNT(*) FILTER(WHERE status='posted')::int AS posted_count,
      COALESCE(SUM(amount_iqd) FILTER(WHERE status='posted'),0) AS posted_amount
    FROM public.business_expense_inbox
  `);
  const ads=await db.execute(sql`
    SELECT COALESCE(SUM(spend_iqd),0) AS ad_spend,COUNT(*)::int AS ad_rows
    FROM public.business_marketing_daily
  `);
  const row=rowsOf(inbox)[0] ?? {};
  const ad=rowsOf(ads)[0] ?? {};
  return {
    capturedUnpostedCount:n(row.captured_count),
    capturedUnpostedAmount:n(row.captured_amount),
    postedInboxCount:n(row.posted_count),
    postedInboxAmount:n(row.posted_amount),
    marketingSpendCaptured:n(ad.ad_spend),
    marketingRows:n(ad.ad_rows),
    note:"Business OS deducts business_marketing_daily separately; do not count the same ad spend again as generic operating expense.",
  };
}

export async function getGrowthOverview() {
  const [attribution,inventory,lifecycle,customerProfiles,bundles,expenses]=await Promise.all([
    getAttributionHealth(),
    getInventoryIntelligence(20),
    getLifecycleOverview(20),
    getCustomerProfileCoverage(),
    getBundles(false),
    getExpenseCompleteness(),
  ]);

  return {
    generatedAt:new Date().toISOString(),
    attribution,
    inventory,
    lifecycle,
    customerProfiles,
    bundles:{
      count:bundles.length,
      live:bundles.filter((bundle:any)=>bundle.storefrontVisible).length,
      inStock:bundles.filter((bundle:any)=>bundle.inStock).length,
      items:bundles,
    },
    expenses,
  };
}

export async function refreshGrowthOs(dayInput?:string) {
  const day=validateDay(dayInput ?? baghdadGrowthDay(-1));
  const repurchase=await refreshRepurchaseProfiles();
  const customerProfiles=await refreshCustomerAquariumProfiles();
  const inventory=await refreshInventorySkuDaily(day);
  const lifecycle=await planCustomerLifecycleJobs();
  const bundles=await seedDefaultBundles();
  return {day,repurchase,customerProfiles,inventory,lifecycle,bundles};
}
