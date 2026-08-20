import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";

const router = Router();

interface DashboardTruth {
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
  peakDeliveredOrderHour: {
    label: string;
    hour: number;
    sampleSize: number;
  } | null;
  geography: Array<{
    city: string;
    deliveredOrders: number;
    percentage: number;
  }>;
  observedCategoryTrends: Array<{
    category: string;
    currentUnits: number;
    previousUnits: number;
    percentageChange: number | null;
    trend: "up" | "down" | "stable" | "new";
    evidence: string;
  }>;
  topProducts: Array<{
    name: string;
    units: number;
  }>;
  today: {
    createdAndDeliveredOrders: number;
    createdAndDeliveredRevenue: number;
  };
  week: {
    deliveredOrders: number;
    realizedRevenue: number;
  };
  definitions: {
    revenue: string;
    lowStock: string;
    failureRate: string;
    trends: string;
    inventoryCost: string;
    testOrders: string;
  };
}

function rowsOf<T extends Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBaghdadHour(date: Date): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;

  const hour = Number(hourPart ?? 0);
  return hour === 24 ? 0 : hour;
}

function formatHourRange(hour: number): string {
  const end = (hour + 3) % 24;
  const formatHour = (value: number) => {
    const normalized = value % 24;
    const suffix = normalized >= 12 ? "مساءً" : "صباحاً";
    const display = normalized % 12 || 12;
    return `${display} ${suffix}`;
  };
  return `${formatHour(hour)}–${formatHour(end)}`;
}

function parseCity(shippingAddress: unknown): string | null {
  if (!shippingAddress) return null;

  if (typeof shippingAddress === "string") {
    const text = shippingAddress.trim();
    if (!text) return null;

    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed !== text) return parseCity(parsed);
    } catch {
      // Legacy rows may contain a plain address string inside the JSONB column.
    }

    const firstSegment = text.split(/\s[-–—]\s/, 1)[0]?.trim();
    return firstSegment || text;
  }

  if (typeof shippingAddress !== "object") return null;
  const record = shippingAddress as Record<string, unknown>;
  const city = record.governorate ?? record.city ?? record.province;
  return typeof city === "string" && city.trim() ? city.trim() : null;
}

async function loadDashboardTruth(): Promise<DashboardTruth> {
  const db = getDb();
  if (!db) throw new Error("Database not connected");

  const [inventoryResult, orderSummaryResult, deliveredRowsResult, categoryRowsResult, topProductRowsResult] =
    await Promise.all([
      db.execute(sql`
        WITH live AS (
          SELECT *
          FROM public.products
          WHERE deleted_at IS NULL
        ),
        variant_rows AS (
          SELECT
            p.id AS product_id,
            COALESCE(NULLIF(v->>'stock', '')::numeric, 0) AS stock,
            COALESCE(NULLIF(v->>'price', '')::numeric, 0) AS price,
            CASE
              WHEN v->>'costStatus' = 'verified_derived'
                AND NULLIF(v->>'costPrice', '') IS NOT NULL
              THEN (v->>'costPrice')::numeric
            END AS verified_cost
          FROM live p
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.variants, '[]'::jsonb)) v
          WHERE p.has_variants = true
        ),
        nonvariant AS (
          SELECT
            COALESCE(SUM(stock * price), 0) AS retail_value,
            COALESCE(SUM(stock * cost_price) FILTER (WHERE cost_price > 0), 0) AS verified_cost,
            COUNT(*) FILTER (
              WHERE stock > 0
                AND NOT (
                  COALESCE(cost_price, 0) > 0
                  OR COALESCE(cost_price_resolution, '') = 'verified_zero'
                )
            )::int AS missing_products,
            COALESCE(SUM(stock) FILTER (
              WHERE stock > 0
                AND NOT (
                  COALESCE(cost_price, 0) > 0
                  OR COALESCE(cost_price_resolution, '') = 'verified_zero'
                )
            ), 0)::int AS missing_units
          FROM live
          WHERE COALESCE(has_variants, false) = false
        ),
        variants AS (
          SELECT
            COALESCE(SUM(stock * price), 0) AS retail_value,
            COALESCE(SUM(stock * verified_cost) FILTER (WHERE verified_cost IS NOT NULL), 0) AS verified_cost,
            COUNT(*) FILTER (WHERE stock > 0 AND verified_cost IS NULL)::int AS missing_variants,
            COALESCE(SUM(stock) FILTER (WHERE stock > 0 AND verified_cost IS NULL), 0)::int AS missing_units,
            COUNT(DISTINCT product_id) FILTER (WHERE stock > 0 AND verified_cost IS NULL)::int AS affected_products
          FROM variant_rows
        )
        SELECT
          (SELECT COUNT(*)::int FROM live) AS live_products,
          (SELECT COUNT(*) FILTER (WHERE stock = 0)::int FROM live) AS out_of_stock,
          (SELECT COUNT(*) FILTER (WHERE stock > 0 AND stock <= low_stock_threshold)::int FROM live) AS low_stock,
          ROUND(n.retail_value + v.retail_value)::bigint AS retail_value,
          ROUND(n.verified_cost + v.verified_cost)::bigint AS verified_inventory_cost,
          n.missing_products AS missing_nonvariant_products,
          n.missing_units AS missing_nonvariant_units,
          v.missing_variants AS missing_variant_count,
          v.missing_units AS missing_variant_units,
          v.affected_products AS affected_variant_products,
          (n.missing_products + v.affected_products)::int AS products_missing_cost
        FROM nonvariant n
        CROSS JOIN variants v
      `),
      db.execute(sql`
        WITH verified_payments AS (
          SELECT
            order_id,
            SUM(
              CASE
                WHEN status = 'completed' AND event_type IN ('capture', 'cod_received', 'adjustment') THEN amount
                WHEN status = 'completed' AND event_type IN ('refund', 'chargeback') THEN -amount
                ELSE 0
              END
            ) AS amount
          FROM public.payment_events
          GROUP BY order_id
        ),
        scoped AS (
          SELECT
            o.id,
            o.status,
            o.source,
            o.created_at,
            o.archived_at,
            COALESCE(vp.amount, 0) AS verified_amount,
            (
              LOWER(COALESCE(o.source, '')) IN ('test', 'accounting_test')
              OR COALESCE(o.order_number, '') ILIKE '%TEST%'
              OR COALESCE(o.customer_name, '') ILIKE '%اختبار%'
              OR COALESCE(o.shipping_address::text, '') ILIKE '%اختبار%'
            ) AS is_test
          FROM public.orders o
          LEFT JOIN verified_payments vp ON vp.order_id = o.id
        )
        SELECT
          COUNT(*) FILTER (
            WHERE NOT is_test
              AND archived_at IS NULL
              AND status NOT IN (
                'delivered', 'cancelled', 'rejected', 'rejected_carrier',
                'rejected_returned', 'returned', 'refunded'
              )
          )::int AS active_now,
          COUNT(*) FILTER (
            WHERE NOT is_test
              AND created_at >= now() - interval '30 days'
              AND status = 'delivered'
          )::int AS delivered_30d,
          COUNT(*) FILTER (
            WHERE NOT is_test
              AND created_at >= now() - interval '30 days'
              AND status IN (
                'cancelled', 'rejected', 'rejected_carrier',
                'rejected_returned', 'returned', 'refunded'
              )
          )::int AS failed_30d,
          COUNT(*) FILTER (
            WHERE NOT is_test
              AND created_at >= now() - interval '30 days'
              AND LOWER(COALESCE(source, '')) IN ('website', 'web', 'store')
          )::int AS website_30d,
          COALESCE(SUM(verified_amount) FILTER (
            WHERE NOT is_test
              AND created_at >= now() - interval '30 days'
              AND status = 'delivered'
              AND verified_amount > 0
          ), 0)::bigint AS revenue_30d,
          COUNT(*) FILTER (
            WHERE NOT is_test
              AND created_at >= now() - interval '30 days'
              AND status = 'delivered'
              AND verified_amount > 0
          )::int AS verified_delivered_30d,
          COUNT(*) FILTER (
            WHERE NOT is_test
              AND created_at >= now() - interval '30 days'
              AND status = 'delivered'
              AND verified_amount <= 0
          )::int AS unpaid_delivered_30d,
          COALESCE(SUM(verified_amount) FILTER (
            WHERE NOT is_test
              AND status = 'delivered'
              AND verified_amount > 0
              AND created_at >= ((now() AT TIME ZONE 'Asia/Baghdad')::date AT TIME ZONE 'Asia/Baghdad')
          ), 0)::bigint AS revenue_today,
          COUNT(*) FILTER (
            WHERE NOT is_test
              AND status = 'delivered'
              AND verified_amount > 0
              AND created_at >= ((now() AT TIME ZONE 'Asia/Baghdad')::date AT TIME ZONE 'Asia/Baghdad')
          )::int AS verified_today,
          COALESCE(SUM(verified_amount) FILTER (
            WHERE NOT is_test
              AND status = 'delivered'
              AND verified_amount > 0
              AND created_at >= now() - interval '7 days'
          ), 0)::bigint AS revenue_week,
          COUNT(*) FILTER (
            WHERE NOT is_test
              AND status = 'delivered'
              AND verified_amount > 0
              AND created_at >= now() - interval '7 days'
          )::int AS verified_week
        FROM scoped
      `),
      db.execute(sql`
        SELECT o.created_at, o.shipping_address
        FROM public.orders o
        WHERE o.status = 'delivered'
          AND o.created_at >= now() - interval '30 days'
          AND NOT (
            LOWER(COALESCE(o.source, '')) IN ('test', 'accounting_test')
            OR COALESCE(o.order_number, '') ILIKE '%TEST%'
            OR COALESCE(o.customer_name, '') ILIKE '%اختبار%'
            OR COALESCE(o.shipping_address::text, '') ILIKE '%اختبار%'
          )
        ORDER BY o.created_at DESC
      `),
      db.execute(sql`
        SELECT
          p.category,
          COALESCE(SUM(
            CASE WHEN o.created_at >= now() - interval '30 days' THEN oi.quantity ELSE 0 END
          ), 0)::int AS current_units,
          COALESCE(SUM(
            CASE WHEN o.created_at < now() - interval '30 days' THEN oi.quantity ELSE 0 END
          ), 0)::int AS previous_units
        FROM public.order_items_relational oi
        INNER JOIN public.orders o ON o.id = oi.order_id
        INNER JOIN public.products p ON p.id = oi.product_id
        WHERE o.status = 'delivered'
          AND o.created_at >= now() - interval '60 days'
          AND o.created_at < now()
          AND NOT (
            LOWER(COALESCE(o.source, '')) IN ('test', 'accounting_test')
            OR COALESCE(o.order_number, '') ILIKE '%TEST%'
            OR COALESCE(o.customer_name, '') ILIKE '%اختبار%'
            OR COALESCE(o.shipping_address::text, '') ILIKE '%اختبار%'
          )
        GROUP BY p.category
        ORDER BY COALESCE(SUM(oi.quantity), 0) DESC
      `),
      db.execute(sql`
        SELECT
          p.name,
          COALESCE(SUM(oi.quantity), 0)::int AS units
        FROM public.order_items_relational oi
        INNER JOIN public.orders o ON o.id = oi.order_id
        INNER JOIN public.products p ON p.id = oi.product_id
        WHERE o.status = 'delivered'
          AND o.created_at >= now() - interval '30 days'
          AND NOT (
            LOWER(COALESCE(o.source, '')) IN ('test', 'accounting_test')
            OR COALESCE(o.order_number, '') ILIKE '%TEST%'
            OR COALESCE(o.customer_name, '') ILIKE '%اختبار%'
            OR COALESCE(o.shipping_address::text, '') ILIKE '%اختبار%'
          )
        GROUP BY p.id, p.name
        ORDER BY SUM(oi.quantity) DESC
        LIMIT 5
      `),
    ]);

  const inventoryRow = rowsOf(inventoryResult)[0] ?? {};
  const orderRow = rowsOf(orderSummaryResult)[0] ?? {};
  const deliveredRows = rowsOf(deliveredRowsResult);
  const categoryRows = rowsOf(categoryRowsResult);
  const topProductRows = rowsOf(topProductRowsResult);

  const liveProducts = numberValue(inventoryRow.live_products);
  const lowStock = numberValue(inventoryRow.low_stock);
  const outOfStock = numberValue(inventoryRow.out_of_stock);
  const retailValue = numberValue(inventoryRow.retail_value);
  const purchaseCostValue = numberValue(inventoryRow.verified_inventory_cost);
  const missingVariantCostCount = numberValue(inventoryRow.missing_variant_count);
  const missingVariantCostUnits = numberValue(inventoryRow.missing_variant_units);
  const productsWithMissingVariantCost = numberValue(inventoryRow.affected_variant_products);
  const missingNonVariantCostProducts = numberValue(inventoryRow.missing_nonvariant_products);
  const missingNonVariantCostUnits = numberValue(inventoryRow.missing_nonvariant_units);
  const productsMissingCost = numberValue(inventoryRow.products_missing_cost);
  const purchaseCostComplete = missingVariantCostCount === 0 && missingNonVariantCostProducts === 0;

  const activeNow = numberValue(orderRow.active_now);
  const deliveredInPeriod = numberValue(orderRow.delivered_30d);
  const failedFinalizedInPeriod = numberValue(orderRow.failed_30d);
  const finalizedInPeriod = deliveredInPeriod + failedFinalizedInPeriod;
  const finalizedFailureRate =
    finalizedInPeriod > 0
      ? Math.round((failedFinalizedInPeriod / finalizedInPeriod) * 1000) / 10
      : null;
  const realizedRevenueInPeriod = numberValue(orderRow.revenue_30d);
  const financiallyVerifiedDeliveredInPeriod = numberValue(orderRow.verified_delivered_30d);
  const deliveredAwaitingPaymentEvidenceInPeriod = numberValue(orderRow.unpaid_delivered_30d);
  const averageDeliveredOrderValue =
    financiallyVerifiedDeliveredInPeriod > 0
      ? Math.round(realizedRevenueInPeriod / financiallyVerifiedDeliveredInPeriod)
      : null;
  const websiteOrdersInPeriod = numberValue(orderRow.website_30d);

  const hourCounts = new Map<number, number>();
  for (const row of deliveredRows) {
    const createdAt = new Date(String(row.created_at));
    if (Number.isNaN(createdAt.getTime())) continue;
    const hour = getBaghdadHour(createdAt);
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const peakHourEntry = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const peakDeliveredOrderHour =
    deliveredRows.length >= 5 && peakHourEntry
      ? {
          hour: peakHourEntry[0],
          label: formatHourRange(peakHourEntry[0]),
          sampleSize: deliveredRows.length,
        }
      : null;

  const cityCounts = new Map<string, number>();
  for (const row of deliveredRows) {
    const city = parseCity(row.shipping_address);
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const geography = Array.from(cityCounts.entries())
    .map(([city, deliveredOrders]) => ({
      city,
      deliveredOrders,
      percentage:
        deliveredRows.length > 0
          ? Math.round((deliveredOrders / deliveredRows.length) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.deliveredOrders - a.deliveredOrders)
    .slice(0, 5);

  const observedCategoryTrends = categoryRows
    .map((row) => {
      const currentUnits = numberValue(row.current_units);
      const previousUnits = numberValue(row.previous_units);
      if (currentUnits + previousUnits < 3) return null;

      let trend: "up" | "down" | "stable" | "new" = "stable";
      let percentageChange: number | null = null;
      if (previousUnits === 0 && currentUnits > 0) {
        trend = "new";
      } else if (previousUnits > 0) {
        percentageChange = Math.round(((currentUnits - previousUnits) / previousUnits) * 1000) / 10;
        if (percentageChange >= 10) trend = "up";
        else if (percentageChange <= -10) trend = "down";
      }

      return {
        category: String(row.category || "غير مصنف"),
        currentUnits,
        previousUnits,
        percentageChange,
        trend,
        evidence: `${currentUnits} وحدة بآخر 30 يوم مقابل ${previousUnits} بالـ30 يوم السابقة`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.currentUnits + b.previousUnits - (a.currentUnits + a.previousUnits))
    .slice(0, 5);

  const topProducts = topProductRows.map((row) => ({
    name: String(row.name || "منتج غير مسمى"),
    units: numberValue(row.units),
  }));

  return {
    generatedAt: new Date().toISOString(),
    periodDays: 30,
    inventory: {
      liveProducts,
      lowStock,
      outOfStock,
      purchaseCostValue,
      retailValue,
      productsMissingCost,
      purchaseCostComplete,
      missingVariantCostCount,
      missingVariantCostUnits,
      productsWithMissingVariantCost,
      missingNonVariantCostProducts,
      missingNonVariantCostUnits,
    },
    orders: {
      activeNow,
      deliveredInPeriod,
      failedFinalizedInPeriod,
      finalizedInPeriod,
      finalizedFailureRate,
      realizedRevenueInPeriod,
      averageDeliveredOrderValue,
      websiteOrdersInPeriod,
      financiallyVerifiedDeliveredInPeriod,
      deliveredAwaitingPaymentEvidenceInPeriod,
    },
    peakDeliveredOrderHour,
    geography,
    observedCategoryTrends,
    topProducts,
    today: {
      createdAndDeliveredOrders: numberValue(orderRow.verified_today),
      createdAndDeliveredRevenue: numberValue(orderRow.revenue_today),
    },
    week: {
      deliveredOrders: numberValue(orderRow.verified_week),
      realizedRevenue: numberValue(orderRow.revenue_week),
    },
    definitions: {
      revenue:
        "المبالغ المثبتة بأحداث دفع مكتملة للطلبات الموصلة فقط؛ الطلب الموصل بلا إثبات قبض لا يدخل بالإيراد.",
      lowStock: "منتج مخزونه أكبر من صفر وأقل من أو يساوي حد التنبيه؛ النافد محسوب بشكل منفصل.",
      failureRate:
        "الطلبات النهائية غير الناجحة ÷ كل الطلبات النهائية خلال 30 يوماً، بعد استبعاد الطلبات الاختبارية.",
      trends:
        "مقارنة وحدات المنتجات في الطلبات الموصلة بآخر 30 يوماً مع الـ30 يوماً السابقة؛ ليست توقعاً للمستقبل.",
      inventoryCost: purchaseCostComplete
        ? "تكلفة شراء المخزون كاملة من تكاليف موثقة لكل منتج وخيار."
        : `المبلغ الظاهر تكلفة موثقة جزئياً؛ ${missingVariantCostUnits + missingNonVariantCostUnits} وحدة ما زالت بلا تكلفة مثبتة.`,
      testOrders:
        "طلبات الاختبار المعروفة مستبعدة من مؤشرات المبيعات والطلبات تلقائياً ولا تؤثر على أرقام التشغيل.",
    },
  };
}

router.get("/dashboard-insights", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const data = await loadDashboardTruth();
    res.set("Cache-Control", "no-store, private");
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[Pricing Truth Override] Dashboard verification failed:", error);
    return res.status(500).json({
      success: false,
      error: "تعذر التحقق من البيانات المباشرة؛ لم يتم عرض رقم قديم أو تقديري.",
    });
  }
});

router.post("/dashboard-chat", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return next();

  const normalized = message.toLowerCase();
  const asksInventory = ["مخزون", "تكلفة", "كلفة", "رأس المال", "راس المال"].some((term) =>
    normalized.includes(term),
  );
  const asksRevenue = ["مبيعات", "ايراد", "إيراد", "ارباح", "أرباح", "ربح", "اليوم", "الأسبوع", "الاسبوع"].some(
    (term) => normalized.includes(term),
  );

  if (!asksInventory && !asksRevenue) return next();

  try {
    const truth = await loadDashboardTruth();

    if (asksInventory) {
      const completeness = truth.inventory.purchaseCostComplete
        ? "وكل تكاليف الوحدات والخيارات الحالية موثقة."
        : `لكن ${(
            truth.inventory.missingVariantCostUnits + truth.inventory.missingNonVariantCostUnits
          ).toLocaleString("en-US")} وحدة ما زالت بلا تكلفة مثبتة، لذلك هذا مجموع موثّق جزئياً وليس التكلفة النهائية الكاملة.`;

      return res.json({
        success: true,
        response: `تكلفة شراء المخزون المثبتة حالياً ${truth.inventory.purchaseCostValue.toLocaleString("en-US")} د.ع. ${completeness}`,
        source: "verified_live_database",
        generatedAt: truth.generatedAt,
      });
    }

    return res.json({
      success: true,
      response:
        `الإيراد المثبت لآخر 30 يوم هو ${truth.orders.realizedRevenueInPeriod.toLocaleString("en-US")} د.ع من ` +
        `${truth.orders.financiallyVerifiedDeliveredInPeriod} طلبات موصلة لها دليل دفع مكتمل. ` +
        `${truth.orders.deliveredAwaitingPaymentEvidenceInPeriod} طلبات موصلة لم تدخل بالإيراد لأنها بلا إثبات قبض حتى الآن.`,
      source: "verified_live_database",
      generatedAt: truth.generatedAt,
    });
  } catch (error) {
    console.error("[Pricing Truth Override] Chat verification failed:", error);
    return res.status(500).json({ success: false, error: "تعذر التحقق من البيانات؛ لم يتم إنشاء جواب تقديري." });
  }
});

export default router;
