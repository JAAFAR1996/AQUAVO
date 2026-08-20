import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

export interface DashboardTruth {
  generatedAt: string;
  periodDays: number;
  inventory: {
    liveProducts: number;
    lowStock: number;
    outOfStock: number;
    purchaseCostValue: number;
    retailValue: number;
    productsMissingCost: number;
    purchaseCostComplete: boolean;
    missingVariantCostCount: number;
    missingVariantCostUnits: number;
    productsWithMissingVariantCost: number;
    missingNonVariantCostProducts: number;
    missingNonVariantCostUnits: number;
  };
  orders: {
    activeNow: number;
    deliveredInPeriod: number;
    failedFinalizedInPeriod: number;
    finalizedInPeriod: number;
    finalizedFailureRate: number | null;
    realizedRevenueInPeriod: number;
    averageDeliveredOrderValue: number | null;
    websiteOrdersInPeriod: number;
    financiallyVerifiedDeliveredInPeriod: number;
    deliveredAwaitingPaymentEvidenceInPeriod: number;
  };
  peakDeliveredOrderHour: { label: string; hour: number; sampleSize: number } | null;
  geography: Array<{ city: string; deliveredOrders: number; percentage: number }>;
  observedCategoryTrends: Array<{
    category: string;
    currentUnits: number;
    previousUnits: number;
    percentageChange: number | null;
    trend: "up" | "down" | "stable" | "new";
    evidence: string;
  }>;
  topProducts: Array<{ name: string; units: number }>;
  today: { createdAndDeliveredOrders: number; createdAndDeliveredRevenue: number };
  week: { deliveredOrders: number; realizedRevenue: number };
  definitions: {
    revenue: string;
    lowStock: string;
    failureRate: string;
    trends: string;
    inventoryCost: string;
    testOrders: string;
  };
}

type Row = Record<string, unknown>;

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function baghdadHour(date: Date): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date).find((part) => part.type === "hour")?.value;
  const hour = Number(hourPart ?? 0);
  return hour === 24 ? 0 : hour;
}

function formatHourRange(hour: number): string {
  const format = (value: number) => {
    const normalized = value % 24;
    const suffix = normalized >= 12 ? "مساءً" : "صباحاً";
    return `${normalized % 12 || 12} ${suffix}`;
  };
  return `${format(hour)}–${format((hour + 3) % 24)}`;
}

function parseCity(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed !== text) return parseCity(parsed);
    } catch {
      // Some legacy rows are plain strings.
    }
    return text.split(/\s[-–—]\s/, 1)[0]?.trim() || text;
  }
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Row;
  const city = row.governorate ?? row.city ?? row.province;
  return typeof city === "string" && city.trim() ? city.trim() : null;
}

// This heuristic already existed before the audit remediation. It is deliberately
// preserved unchanged here until the separate synthetic-order architecture work
// is handled in its own final phase.
const TEST_ORDER_SQL = sql`(
  LOWER(COALESCE(o.source, '')) IN ('test', 'accounting_test')
  OR COALESCE(o.order_number, '') ILIKE '%TEST%'
  OR COALESCE(o.customer_name, '') ILIKE '%اختبار%'
  OR COALESCE(o.shipping_address::text, '') ILIKE '%اختبار%'
)`;

export async function loadDashboardTruth(): Promise<DashboardTruth> {
  const db = getDb();
  if (!db) throw new Error("Database not connected");

  const [inventoryResult, orderResult, deliveredResult, categoryResult, topProductsResult] = await Promise.all([
    db.execute(sql`
      WITH live AS (
        SELECT * FROM public.products WHERE deleted_at IS NULL
      ), variant_rows AS (
        SELECT
          p.id AS product_id,
          COALESCE(NULLIF(v->>'stock','')::numeric, 0) AS stock,
          COALESCE(NULLIF(v->>'price','')::numeric, 0) AS price,
          CASE
            WHEN v->>'costStatus'='verified_derived' AND NULLIF(v->>'costPrice','') IS NOT NULL
            THEN (v->>'costPrice')::numeric
          END AS verified_cost
        FROM live p
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants, '[]'::jsonb)) v
        WHERE p.has_variants=true
      ), nonvariant AS (
        SELECT
          COALESCE(SUM(stock * price),0) AS retail_value,
          COALESCE(SUM(stock * cost_price) FILTER (WHERE cost_price > 0),0) AS verified_cost,
          COUNT(*) FILTER (
            WHERE stock > 0 AND NOT (
              COALESCE(cost_price,0) > 0 OR COALESCE(cost_price_resolution,'')='verified_zero'
            )
          )::int AS missing_products,
          COALESCE(SUM(stock) FILTER (
            WHERE stock > 0 AND NOT (
              COALESCE(cost_price,0) > 0 OR COALESCE(cost_price_resolution,'')='verified_zero'
            )
          ),0)::int AS missing_units
        FROM live WHERE COALESCE(has_variants,false)=false
      ), variants AS (
        SELECT
          COALESCE(SUM(stock * price),0) AS retail_value,
          COALESCE(SUM(stock * verified_cost) FILTER (WHERE verified_cost IS NOT NULL),0) AS verified_cost,
          COUNT(*) FILTER (WHERE stock > 0 AND verified_cost IS NULL)::int AS missing_variants,
          COALESCE(SUM(stock) FILTER (WHERE stock > 0 AND verified_cost IS NULL),0)::int AS missing_units,
          COUNT(DISTINCT product_id) FILTER (WHERE stock > 0 AND verified_cost IS NULL)::int AS affected_products
        FROM variant_rows
      )
      SELECT
        (SELECT COUNT(*)::int FROM live) AS live_products,
        (SELECT COUNT(*) FILTER (WHERE stock=0)::int FROM live) AS out_of_stock,
        (SELECT COUNT(*) FILTER (WHERE stock>0 AND stock<=low_stock_threshold)::int FROM live) AS low_stock,
        ROUND(n.retail_value + v.retail_value)::bigint AS retail_value,
        ROUND(n.verified_cost + v.verified_cost)::bigint AS verified_inventory_cost,
        n.missing_products AS missing_nonvariant_products,
        n.missing_units AS missing_nonvariant_units,
        v.missing_variants AS missing_variant_count,
        v.missing_units AS missing_variant_units,
        v.affected_products AS affected_variant_products,
        (n.missing_products + v.affected_products)::int AS products_missing_cost
      FROM nonvariant n CROSS JOIN variants v
    `),
    db.execute(sql`
      WITH verified_payments AS (
        SELECT order_id,
          SUM(CASE
            WHEN status='completed' AND event_type IN ('capture','cod_received','adjustment') THEN amount
            WHEN status='completed' AND event_type IN ('refund','chargeback') THEN -amount
            ELSE 0
          END) AS amount
        FROM public.payment_events GROUP BY order_id
      ), scoped AS (
        SELECT o.id,o.status,o.source,o.created_at,o.archived_at,
          COALESCE(vp.amount,0) AS verified_amount,
          ${TEST_ORDER_SQL} AS is_test
        FROM public.orders o
        LEFT JOIN verified_payments vp ON vp.order_id=o.id
      )
      SELECT
        COUNT(*) FILTER (
          WHERE NOT is_test AND archived_at IS NULL
            AND status NOT IN ('delivered','cancelled','rejected','rejected_carrier','rejected_returned','returned','refunded')
        )::int AS active_now,
        COUNT(*) FILTER (WHERE NOT is_test AND created_at>=now()-interval '30 days' AND status='delivered')::int AS delivered_30d,
        COUNT(*) FILTER (
          WHERE NOT is_test AND created_at>=now()-interval '30 days'
            AND status IN ('cancelled','rejected','rejected_carrier','rejected_returned','returned','refunded')
        )::int AS failed_30d,
        COUNT(*) FILTER (
          WHERE NOT is_test AND created_at>=now()-interval '30 days'
            AND LOWER(COALESCE(source,'')) IN ('website','web','store')
        )::int AS website_30d,
        COALESCE(SUM(verified_amount) FILTER (
          WHERE NOT is_test AND created_at>=now()-interval '30 days' AND status='delivered' AND verified_amount>0
        ),0)::bigint AS revenue_30d,
        COUNT(*) FILTER (
          WHERE NOT is_test AND created_at>=now()-interval '30 days' AND status='delivered' AND verified_amount>0
        )::int AS verified_delivered_30d,
        COUNT(*) FILTER (
          WHERE NOT is_test AND created_at>=now()-interval '30 days' AND status='delivered' AND verified_amount<=0
        )::int AS unpaid_delivered_30d,
        COALESCE(SUM(verified_amount) FILTER (
          WHERE NOT is_test AND status='delivered' AND verified_amount>0
            AND created_at>=((now() AT TIME ZONE 'Asia/Baghdad')::date AT TIME ZONE 'Asia/Baghdad')
        ),0)::bigint AS revenue_today,
        COUNT(*) FILTER (
          WHERE NOT is_test AND status='delivered' AND verified_amount>0
            AND created_at>=((now() AT TIME ZONE 'Asia/Baghdad')::date AT TIME ZONE 'Asia/Baghdad')
        )::int AS verified_today,
        COALESCE(SUM(verified_amount) FILTER (
          WHERE NOT is_test AND status='delivered' AND verified_amount>0 AND created_at>=now()-interval '7 days'
        ),0)::bigint AS revenue_week,
        COUNT(*) FILTER (
          WHERE NOT is_test AND status='delivered' AND verified_amount>0 AND created_at>=now()-interval '7 days'
        )::int AS verified_week
      FROM scoped
    `),
    db.execute(sql`
      SELECT o.created_at,o.shipping_address
      FROM public.orders o
      WHERE o.status='delivered' AND o.created_at>=now()-interval '30 days'
        AND NOT ${TEST_ORDER_SQL}
      ORDER BY o.created_at DESC
    `),
    db.execute(sql`
      SELECT p.category,
        COALESCE(SUM(CASE WHEN o.created_at>=now()-interval '30 days' THEN oi.quantity ELSE 0 END),0)::int AS current_units,
        COALESCE(SUM(CASE WHEN o.created_at<now()-interval '30 days' THEN oi.quantity ELSE 0 END),0)::int AS previous_units
      FROM public.order_items_relational oi
      INNER JOIN public.orders o ON o.id=oi.order_id
      INNER JOIN public.products p ON p.id=oi.product_id
      WHERE o.status='delivered' AND o.created_at>=now()-interval '60 days' AND o.created_at<now()
        AND NOT ${TEST_ORDER_SQL}
      GROUP BY p.category
      ORDER BY COALESCE(SUM(oi.quantity),0) DESC
    `),
    db.execute(sql`
      SELECT p.name,COALESCE(SUM(oi.quantity),0)::int AS units
      FROM public.order_items_relational oi
      INNER JOIN public.orders o ON o.id=oi.order_id
      INNER JOIN public.products p ON p.id=oi.product_id
      WHERE o.status='delivered' AND o.created_at>=now()-interval '30 days'
        AND NOT ${TEST_ORDER_SQL}
      GROUP BY p.id,p.name ORDER BY SUM(oi.quantity) DESC LIMIT 5
    `),
  ]);

  const inventory = rowsOf(inventoryResult)[0] ?? {};
  const orders = rowsOf(orderResult)[0] ?? {};
  const deliveredRows = rowsOf(deliveredResult);

  const missingVariantCostCount = num(inventory.missing_variant_count);
  const missingVariantCostUnits = num(inventory.missing_variant_units);
  const missingNonVariantCostProducts = num(inventory.missing_nonvariant_products);
  const missingNonVariantCostUnits = num(inventory.missing_nonvariant_units);
  const purchaseCostComplete = missingVariantCostCount===0 && missingNonVariantCostProducts===0;

  const deliveredInPeriod = num(orders.delivered_30d);
  const failedFinalizedInPeriod = num(orders.failed_30d);
  const finalizedInPeriod = deliveredInPeriod + failedFinalizedInPeriod;
  const verifiedDelivered = num(orders.verified_delivered_30d);
  const realizedRevenue = num(orders.revenue_30d);

  const hourCounts = new Map<number,number>();
  const cityCounts = new Map<string,number>();
  for (const row of deliveredRows) {
    const createdAt = new Date(String(row.created_at ?? ""));
    if (Number.isFinite(createdAt.getTime())) {
      const hour = baghdadHour(createdAt);
      hourCounts.set(hour,(hourCounts.get(hour)??0)+1);
    }
    const city = parseCity(row.shipping_address);
    if (city) cityCounts.set(city,(cityCounts.get(city)??0)+1);
  }

  const peak = Array.from(hourCounts.entries()).sort((a,b)=>b[1]-a[1])[0];
  const peakDeliveredOrderHour = deliveredRows.length>=5 && peak
    ? { hour: peak[0], label: formatHourRange(peak[0]), sampleSize: deliveredRows.length }
    : null;
  const geography = Array.from(cityCounts.entries())
    .map(([city,deliveredOrders])=>({
      city, deliveredOrders,
      percentage: deliveredRows.length ? Math.round((deliveredOrders/deliveredRows.length)*1000)/10 : 0,
    }))
    .sort((a,b)=>b.deliveredOrders-a.deliveredOrders)
    .slice(0,5);

  const observedCategoryTrends = rowsOf(categoryResult)
    .map((row) => {
      const currentUnits=num(row.current_units);
      const previousUnits=num(row.previous_units);
      if (currentUnits+previousUnits<3) return null;
      let trend: "up"|"down"|"stable"|"new"="stable";
      let percentageChange:number|null=null;
      if (previousUnits===0 && currentUnits>0) trend="new";
      else if (previousUnits>0) {
        percentageChange=Math.round(((currentUnits-previousUnits)/previousUnits)*1000)/10;
        if (percentageChange>=10) trend="up";
        else if (percentageChange<=-10) trend="down";
      }
      return {
        category:String(row.category||"غير مصنف"),currentUnits,previousUnits,percentageChange,trend,
        evidence:`${currentUnits} وحدة بآخر 30 يوم مقابل ${previousUnits} بالـ30 يوم السابقة`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a,b)=>b.currentUnits+b.previousUnits-(a.currentUnits+a.previousUnits))
    .slice(0,5);

  const topProducts=rowsOf(topProductsResult).map((row)=>({name:String(row.name||"منتج غير مسمى"),units:num(row.units)}));

  return {
    generatedAt:new Date().toISOString(),
    periodDays:30,
    inventory:{
      liveProducts:num(inventory.live_products),
      lowStock:num(inventory.low_stock),
      outOfStock:num(inventory.out_of_stock),
      purchaseCostValue:num(inventory.verified_inventory_cost),
      retailValue:num(inventory.retail_value),
      productsMissingCost:num(inventory.products_missing_cost),
      purchaseCostComplete,
      missingVariantCostCount,
      missingVariantCostUnits,
      productsWithMissingVariantCost:num(inventory.affected_variant_products),
      missingNonVariantCostProducts,
      missingNonVariantCostUnits,
    },
    orders:{
      activeNow:num(orders.active_now),
      deliveredInPeriod,
      failedFinalizedInPeriod,
      finalizedInPeriod,
      finalizedFailureRate:finalizedInPeriod ? Math.round((failedFinalizedInPeriod/finalizedInPeriod)*1000)/10 : null,
      realizedRevenueInPeriod:realizedRevenue,
      averageDeliveredOrderValue:verifiedDelivered ? Math.round(realizedRevenue/verifiedDelivered) : null,
      websiteOrdersInPeriod:num(orders.website_30d),
      financiallyVerifiedDeliveredInPeriod:verifiedDelivered,
      deliveredAwaitingPaymentEvidenceInPeriod:num(orders.unpaid_delivered_30d),
    },
    peakDeliveredOrderHour,
    geography,
    observedCategoryTrends,
    topProducts,
    today:{createdAndDeliveredOrders:num(orders.verified_today),createdAndDeliveredRevenue:num(orders.revenue_today)},
    week:{deliveredOrders:num(orders.verified_week),realizedRevenue:num(orders.revenue_week)},
    definitions:{
      revenue:"المبالغ المثبتة بأحداث دفع مكتملة للطلبات الموصلة فقط؛ الطلب الموصل بلا إثبات قبض لا يدخل بالإيراد.",
      lowStock:"منتج مخزونه أكبر من صفر وأقل من أو يساوي حد التنبيه؛ النافد محسوب بشكل منفصل.",
      failureRate:"الطلبات النهائية غير الناجحة ÷ كل الطلبات النهائية خلال 30 يوماً، بعد استبعاد نمط الاختبارات الحالي.",
      trends:"مقارنة وحدات المنتجات في الطلبات الموصلة بآخر 30 يوماً مع الـ30 يوماً السابقة؛ ليست توقعاً للمستقبل.",
      inventoryCost:purchaseCostComplete
        ? "تكلفة شراء المخزون كاملة من تكاليف موثقة لكل منتج وخيار."
        : `المبلغ الظاهر تكلفة موثقة جزئياً؛ ${missingVariantCostUnits+missingNonVariantCostUnits} وحدة ما زالت بلا تكلفة مثبتة.`,
      testOrders:"تم الحفاظ على منطق استبعاد الاختبارات الموجود قبل هذا الإصلاح بدون توسيعه؛ عزل الاختبارات الكامل مؤجل للمرحلة الأخيرة.",
    },
  };
}
