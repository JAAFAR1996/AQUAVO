import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";

const router = Router();

type TruthPatch = {
  inventory: {
    verifiedPurchaseCostValue: number;
    purchaseCostComplete: boolean;
    missingVariantCostCount: number;
    missingVariantCostUnits: number;
    productsWithMissingVariantCost: number;
  };
  orders: {
    verifiedRevenueInPeriod: number;
    financiallyVerifiedDeliveredInPeriod: number;
    deliveredAwaitingPaymentEvidenceInPeriod: number;
    averageVerifiedOrderValue: number | null;
    verifiedRevenueToday: number;
    verifiedOrdersToday: number;
    verifiedRevenueWeek: number;
    verifiedOrdersWeek: number;
  };
};

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function loadTruthPatch(): Promise<TruthPatch> {
  const db = getDb();
  if (!db) throw new Error("Database not connected");

  const [inventoryResult, orderResult] = await Promise.all([
    db.execute(sql`
      WITH live AS (
        SELECT * FROM products WHERE deleted_at IS NULL
      ),
      variant_rows AS (
        SELECT
          p.id AS product_id,
          COALESCE((v->>'stock')::numeric, 0) AS stock,
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
          COALESCE(SUM(stock * cost_price) FILTER (WHERE cost_price > 0), 0) AS verified_cost
        FROM live
        WHERE COALESCE(has_variants, false) = false
      ),
      variants AS (
        SELECT
          COALESCE(SUM(stock * verified_cost) FILTER (WHERE verified_cost IS NOT NULL), 0) AS verified_cost,
          COUNT(*) FILTER (WHERE stock > 0 AND verified_cost IS NULL) AS missing_variants,
          COALESCE(SUM(stock) FILTER (WHERE stock > 0 AND verified_cost IS NULL), 0) AS missing_units,
          COUNT(DISTINCT product_id) FILTER (WHERE stock > 0 AND verified_cost IS NULL) AS affected_products
        FROM variant_rows
      )
      SELECT
        ROUND(n.verified_cost + v.verified_cost)::bigint AS verified_inventory_cost,
        v.missing_variants::int AS missing_variant_count,
        v.missing_units::int AS missing_variant_units,
        v.affected_products::int AS affected_products
      FROM nonvariant n CROSS JOIN variants v
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
        FROM payment_events
        GROUP BY order_id
      ),
      scoped AS (
        SELECT
          o.id,
          o.status,
          o.created_at,
          COALESCE(vp.amount, 0) AS verified_amount
        FROM orders o
        LEFT JOIN verified_payments vp ON vp.order_id = o.id
        WHERE o.created_at >= now() - interval '30 days'
      )
      SELECT
        COALESCE(SUM(verified_amount) FILTER (WHERE status = 'delivered' AND verified_amount > 0), 0) AS revenue_30d,
        COUNT(*) FILTER (WHERE status = 'delivered' AND verified_amount > 0) AS paid_delivered_30d,
        COUNT(*) FILTER (WHERE status = 'delivered' AND verified_amount <= 0) AS unpaid_delivered_30d,
        COALESCE(SUM(verified_amount) FILTER (
          WHERE status = 'delivered'
            AND verified_amount > 0
            AND created_at >= ((now() AT TIME ZONE 'Asia/Baghdad')::date AT TIME ZONE 'Asia/Baghdad')
        ), 0) AS revenue_today,
        COUNT(*) FILTER (
          WHERE status = 'delivered'
            AND verified_amount > 0
            AND created_at >= ((now() AT TIME ZONE 'Asia/Baghdad')::date AT TIME ZONE 'Asia/Baghdad')
        ) AS paid_delivered_today,
        COALESCE(SUM(verified_amount) FILTER (
          WHERE status = 'delivered'
            AND verified_amount > 0
            AND created_at >= now() - interval '7 days'
        ), 0) AS revenue_week,
        COUNT(*) FILTER (
          WHERE status = 'delivered'
            AND verified_amount > 0
            AND created_at >= now() - interval '7 days'
        ) AS paid_delivered_week
      FROM scoped
    `),
  ]);

  const inventory = rowsOf(inventoryResult)[0] ?? {};
  const orders = rowsOf(orderResult)[0] ?? {};
  const verifiedRevenue = numberValue(orders.revenue_30d);
  const verifiedOrderCount = numberValue(orders.paid_delivered_30d);
  const missingVariantCostCount = numberValue(inventory.missing_variant_count);

  return {
    inventory: {
      verifiedPurchaseCostValue: numberValue(inventory.verified_inventory_cost),
      purchaseCostComplete: missingVariantCostCount === 0,
      missingVariantCostCount,
      missingVariantCostUnits: numberValue(inventory.missing_variant_units),
      productsWithMissingVariantCost: numberValue(inventory.affected_products),
    },
    orders: {
      verifiedRevenueInPeriod: verifiedRevenue,
      financiallyVerifiedDeliveredInPeriod: verifiedOrderCount,
      deliveredAwaitingPaymentEvidenceInPeriod: numberValue(orders.unpaid_delivered_30d),
      averageVerifiedOrderValue: verifiedOrderCount > 0 ? Math.round(verifiedRevenue / verifiedOrderCount) : null,
      verifiedRevenueToday: numberValue(orders.revenue_today),
      verifiedOrdersToday: numberValue(orders.paid_delivered_today),
      verifiedRevenueWeek: numberValue(orders.revenue_week),
      verifiedOrdersWeek: numberValue(orders.paid_delivered_week),
    },
  };
}

router.get("/dashboard-insights", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const patch = await loadTruthPatch();
    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      const payload = body as {
        success?: boolean;
        data?: {
          inventory?: Record<string, unknown>;
          orders?: Record<string, unknown>;
          today?: Record<string, unknown>;
          week?: Record<string, unknown>;
          definitions?: Record<string, unknown>;
        };
      };

      if (payload?.success && payload.data) {
        payload.data.inventory = {
          ...(payload.data.inventory ?? {}),
          purchaseCostValue: patch.inventory.verifiedPurchaseCostValue,
          purchaseCostComplete: patch.inventory.purchaseCostComplete,
          missingVariantCostCount: patch.inventory.missingVariantCostCount,
          missingVariantCostUnits: patch.inventory.missingVariantCostUnits,
          productsWithMissingVariantCost: patch.inventory.productsWithMissingVariantCost,
        };
        payload.data.orders = {
          ...(payload.data.orders ?? {}),
          realizedRevenueInPeriod: patch.orders.verifiedRevenueInPeriod,
          financiallyVerifiedDeliveredInPeriod: patch.orders.financiallyVerifiedDeliveredInPeriod,
          deliveredAwaitingPaymentEvidenceInPeriod: patch.orders.deliveredAwaitingPaymentEvidenceInPeriod,
          averageDeliveredOrderValue: patch.orders.averageVerifiedOrderValue,
        };
        payload.data.today = {
          ...(payload.data.today ?? {}),
          createdAndDeliveredOrders: patch.orders.verifiedOrdersToday,
          createdAndDeliveredRevenue: patch.orders.verifiedRevenueToday,
        };
        payload.data.week = {
          ...(payload.data.week ?? {}),
          deliveredOrders: patch.orders.verifiedOrdersWeek,
          realizedRevenue: patch.orders.verifiedRevenueWeek,
        };
        payload.data.definitions = {
          ...(payload.data.definitions ?? {}),
          revenue: "المبالغ المثبتة بأحداث دفع مكتملة للطلبات الموصلة فقط؛ الطلب الموصل بلا إثبات قبض لا يدخل بالإيراد.",
          inventoryCost: patch.inventory.purchaseCostComplete
            ? "تكلفة شراء المخزون كاملة من تكاليف موثقة لكل خيار."
            : `المبلغ الظاهر تكلفة موثقة جزئياً؛ ${patch.inventory.missingVariantCostUnits} وحدة ضمن ${patch.inventory.missingVariantCostCount} خياراً ما زالت بلا تكلفة مثبتة.`,
        };
      }

      return originalJson(payload);
    }) as Response["json"];

    next();
  } catch (error) {
    console.error("[Pricing Truth Override] Dashboard verification failed:", error);
    return res.status(500).json({ success: false, error: "تعذر التحقق من التكلفة أو الإيراد؛ لم يُعرض رقم بديل." });
  }
});

router.post("/dashboard-chat", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return next();

  const normalized = message.toLowerCase();
  const asksInventory = ["مخزون", "تكلفة", "كلفة", "رأس المال", "راس المال"].some((term) => normalized.includes(term));
  const asksRevenue = ["مبيعات", "ايراد", "إيراد", "ارباح", "أرباح", "ربح", "اليوم", "الأسبوع", "الاسبوع"].some((term) => normalized.includes(term));

  if (!asksInventory && !asksRevenue) return next();

  try {
    const truth = await loadTruthPatch();

    if (asksInventory) {
      const completeness = truth.inventory.purchaseCostComplete
        ? "وكل تكاليف الخيارات الحالية موثقة."
        : `لكن ${truth.inventory.missingVariantCostUnits.toLocaleString("en-US")} وحدة موزعة على ${truth.inventory.missingVariantCostCount} خياراً في ${truth.inventory.productsWithMissingVariantCost} منتجات ما زالت بلا تكلفة مثبتة، لذلك هذا مجموع موثّق جزئياً وليس التكلفة النهائية الكاملة.`;
      return res.json({
        success: true,
        response: `تكلفة شراء المخزون المثبتة حالياً ${truth.inventory.verifiedPurchaseCostValue.toLocaleString("en-US")} د.ع. ${completeness}`,
        source: "verified_database_calculation",
      });
    }

    return res.json({
      success: true,
      response:
        `الإيراد المثبت لآخر 30 يوم هو ${truth.orders.verifiedRevenueInPeriod.toLocaleString("en-US")} د.ع من ` +
        `${truth.orders.financiallyVerifiedDeliveredInPeriod} طلبات موصلة لها دليل دفع مكتمل. ` +
        `${truth.orders.deliveredAwaitingPaymentEvidenceInPeriod} طلبات موصلة لم تدخل بالإيراد لأنها بلا إثبات قبض حتى الآن.`,
      source: "verified_database_calculation",
    });
  } catch (error) {
    console.error("[Pricing Truth Override] Chat verification failed:", error);
    return res.status(500).json({ success: false, error: "تعذر التحقق من البيانات؛ لم يتم إنشاء جواب تقديري." });
  }
});

export default router;
