import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { pricingEngine } from "../services/pricing-engine.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { and, count, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const PRICE_HISTORY_MIN_POINTS = 5;
const TERMINAL_FAILURE_STATUSES = new Set(["cancelled", "rejected", "returned", "refunded"]);
const TERMINAL_STATUSES = new Set(["delivered", ...TERMINAL_FAILURE_STATUSES]);

interface ProductVariantSnapshot {
  price?: number | string;
  stock?: number | string;
}

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
  };
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

function getBaghdadStartOfDayUtc(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  // Baghdad is UTC+3 and currently has no daylight-saving transition.
  return new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
}

function parseVariants(value: unknown): ProductVariantSnapshot[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as ProductVariantSnapshot[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as ProductVariantSnapshot[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function calculateRetailValue(product: {
  price: unknown;
  stock: number | null;
  hasVariants: boolean | null;
  variants: unknown;
}): number {
  const variants = parseVariants(product.variants);
  if (product.hasVariants && variants.length > 0) {
    return variants.reduce(
      (sum, variant) => sum + numberValue(variant.price) * numberValue(variant.stock),
      0,
    );
  }
  return numberValue(product.price) * numberValue(product.stock);
}

function amountActuallyCharged(order: { roundedTotal: unknown; total: unknown }): number {
  const rounded = numberValue(order.roundedTotal);
  return rounded > 0 ? rounded : numberValue(order.total);
}

function parseCity(shippingAddress: unknown): string | null {
  if (!shippingAddress) return null;

  let address: unknown = shippingAddress;
  if (typeof shippingAddress === "string") {
    try {
      address = JSON.parse(shippingAddress);
    } catch {
      return shippingAddress.trim() || null;
    }
  }

  if (!address || typeof address !== "object") return null;
  const record = address as Record<string, unknown>;
  const city = record.governorate ?? record.city ?? record.province;
  return typeof city === "string" && city.trim() ? city.trim() : null;
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

async function loadDashboardTruth(): Promise<DashboardTruth> {
  const db = getDb();
  if (!db) throw new Error("Database not connected");

  const now = new Date();
  const currentStart = new Date(now.getTime() - 30 * DAY_MS);
  const previousStart = new Date(now.getTime() - 60 * DAY_MS);
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);
  const todayStart = getBaghdadStartOfDayUtc(now);

  const [productRows, allOrderStatuses, recentOrders, categoryRows, topProductRows] = await Promise.all([
    db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        price: schema.products.price,
        costPrice: schema.products.costPrice,
        stock: schema.products.stock,
        lowStockThreshold: schema.products.lowStockThreshold,
        hasVariants: schema.products.hasVariants,
        variants: schema.products.variants,
      })
      .from(schema.products)
      .where(isNull(schema.products.deletedAt)),
    db.select({ status: schema.orders.status }).from(schema.orders),
    db
      .select({
        id: schema.orders.id,
        status: schema.orders.status,
        source: schema.orders.source,
        createdAt: schema.orders.createdAt,
        roundedTotal: schema.orders.roundedTotal,
        total: schema.orders.total,
        shippingAddress: schema.orders.shippingAddress,
      })
      .from(schema.orders)
      .where(gte(schema.orders.createdAt, previousStart)),
    db
      .select({
        category: schema.products.category,
        currentUnits: sql<string>`COALESCE(SUM(CASE WHEN ${schema.orders.createdAt} >= ${currentStart} THEN ${schema.orderItems.quantity} ELSE 0 END), 0)`,
        previousUnits: sql<string>`COALESCE(SUM(CASE WHEN ${schema.orders.createdAt} < ${currentStart} THEN ${schema.orderItems.quantity} ELSE 0 END), 0)`,
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
      .innerJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
      .where(
        and(
          eq(schema.orders.status, "delivered"),
          gte(schema.orders.createdAt, previousStart),
          sql`${schema.orders.createdAt} < ${now}`,
        ),
      )
      .groupBy(schema.products.category),
    db
      .select({
        name: schema.products.name,
        units: sql<string>`COALESCE(SUM(${schema.orderItems.quantity}), 0)`,
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
      .innerJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
      .where(
        and(
          eq(schema.orders.status, "delivered"),
          gte(schema.orders.createdAt, currentStart),
        ),
      )
      .groupBy(schema.products.id, schema.products.name)
      .orderBy(desc(sql`SUM(${schema.orderItems.quantity})`))
      .limit(5),
  ]);

  const liveProducts = productRows.length;
  const outOfStock = productRows.filter((product) => numberValue(product.stock) === 0).length;
  const lowStock = productRows.filter((product) => {
    const stock = numberValue(product.stock);
    const threshold = numberValue(product.lowStockThreshold);
    return stock > 0 && stock <= threshold;
  }).length;
  const purchaseCostValue = Math.round(
    productRows.reduce(
      (sum, product) => sum + numberValue(product.costPrice) * numberValue(product.stock),
      0,
    ),
  );
  const retailValue = Math.round(productRows.reduce((sum, product) => sum + calculateRetailValue(product), 0));
  const productsMissingCost = productRows.filter(
    (product) => numberValue(product.stock) > 0 && numberValue(product.costPrice) <= 0,
  ).length;

  const activeNow = allOrderStatuses.filter((order) => !TERMINAL_STATUSES.has(order.status)).length;
  const currentOrders = recentOrders.filter((order) => new Date(order.createdAt) >= currentStart);
  const deliveredInPeriod = currentOrders.filter((order) => order.status === "delivered");
  const failedFinalizedInPeriod = currentOrders.filter((order) => TERMINAL_FAILURE_STATUSES.has(order.status));
  const finalizedInPeriod = deliveredInPeriod.length + failedFinalizedInPeriod.length;
  const finalizedFailureRate =
    finalizedInPeriod > 0
      ? Math.round((failedFinalizedInPeriod.length / finalizedInPeriod) * 1000) / 10
      : null;
  const realizedRevenueInPeriod = Math.round(
    deliveredInPeriod.reduce((sum, order) => sum + amountActuallyCharged(order), 0),
  );
  const averageDeliveredOrderValue =
    deliveredInPeriod.length > 0
      ? Math.round(realizedRevenueInPeriod / deliveredInPeriod.length)
      : null;
  const websiteOrdersInPeriod = currentOrders.filter((order) =>
    ["website", "web", "store"].includes(String(order.source ?? "").toLowerCase()),
  ).length;

  const hourCounts = new Map<number, number>();
  for (const order of deliveredInPeriod) {
    const hour = getBaghdadHour(new Date(order.createdAt));
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const peakHourEntry = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const peakDeliveredOrderHour =
    deliveredInPeriod.length >= 5 && peakHourEntry
      ? {
          hour: peakHourEntry[0],
          label: formatHourRange(peakHourEntry[0]),
          sampleSize: deliveredInPeriod.length,
        }
      : null;

  const cityCounts = new Map<string, number>();
  for (const order of deliveredInPeriod) {
    const city = parseCity(order.shippingAddress);
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const geography = Array.from(cityCounts.entries())
    .map(([city, deliveredOrders]) => ({
      city,
      deliveredOrders,
      percentage:
        deliveredInPeriod.length > 0
          ? Math.round((deliveredOrders / deliveredInPeriod.length) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.deliveredOrders - a.deliveredOrders)
    .slice(0, 5);

  const observedCategoryTrends = categoryRows
    .map((row) => {
      const currentUnits = numberValue(row.currentUnits);
      const previousUnits = numberValue(row.previousUnits);
      const totalEvidence = currentUnits + previousUnits;
      if (totalEvidence < 3) return null;

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
        category: row.category || "غير مصنف",
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
    name: row.name,
    units: numberValue(row.units),
  }));

  const createdAndDeliveredToday = deliveredInPeriod.filter(
    (order) => new Date(order.createdAt) >= todayStart,
  );
  const deliveredThisWeek = deliveredInPeriod.filter(
    (order) => new Date(order.createdAt) >= weekStart,
  );

  return {
    generatedAt: now.toISOString(),
    periodDays: 30,
    inventory: {
      liveProducts,
      lowStock,
      outOfStock,
      purchaseCostValue,
      retailValue,
      productsMissingCost,
    },
    orders: {
      activeNow,
      deliveredInPeriod: deliveredInPeriod.length,
      failedFinalizedInPeriod: failedFinalizedInPeriod.length,
      finalizedInPeriod,
      finalizedFailureRate,
      realizedRevenueInPeriod,
      averageDeliveredOrderValue,
      websiteOrdersInPeriod,
    },
    peakDeliveredOrderHour,
    geography,
    observedCategoryTrends,
    topProducts,
    today: {
      createdAndDeliveredOrders: createdAndDeliveredToday.length,
      createdAndDeliveredRevenue: Math.round(
        createdAndDeliveredToday.reduce((sum, order) => sum + amountActuallyCharged(order), 0),
      ),
    },
    week: {
      deliveredOrders: deliveredThisWeek.length,
      realizedRevenue: Math.round(
        deliveredThisWeek.reduce((sum, order) => sum + amountActuallyCharged(order), 0),
      ),
    },
    definitions: {
      revenue: "قيمة الطلبات الموصلة فقط باستخدام rounded_total عند توفره، وإلا total.",
      lowStock: "منتج مخزونه أكبر من صفر وأقل من أو يساوي حد إعادة التخزين المسجل له.",
      failureRate: "الطلبات المرفوضة أو الملغاة أو المرتجعة ÷ الطلبات النهائية فقط؛ الطلبات النشطة لا تدخل.",
      trends: "تغير وحدات المنتجات الموصلة بآخر 30 يوم مقارنة بالـ30 يوم السابقة؛ ليست تنبؤاً مستقبلياً.",
    },
  };
}

/**
 * POST /api/pricing/suggestions
 * Read-only. Suggestions are returned only when a product has enough real price-history evidence.
 */
router.post("/suggestions", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body as { productIds?: string[] };
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ success: false, error: "productIds array is required" });
    }

    const uniqueProductIds = [...new Set(productIds.filter((id): id is string => typeof id === "string" && id.length > 0))];
    if (uniqueProductIds.length === 0) {
      return res.json({
        success: true,
        data: {
          suggestions: [],
          count: 0,
          status: "insufficient_data",
          evidence: { productsRequested: 0, eligibleProducts: 0, minimumHistoryPoints: PRICE_HISTORY_MIN_POINTS },
        },
      });
    }

    const db = getDb();
    if (!db) return res.status(500).json({ success: false, error: "Database not connected" });

    const historyCounts = await db
      .select({
        productId: schema.priceHistory.productId,
        points: count(),
      })
      .from(schema.priceHistory)
      .where(inArray(schema.priceHistory.productId, uniqueProductIds))
      .groupBy(schema.priceHistory.productId);

    const eligibleIds = historyCounts
      .filter((row) => numberValue(row.points) >= PRICE_HISTORY_MIN_POINTS)
      .map((row) => row.productId);

    if (eligibleIds.length === 0) {
      return res.json({
        success: true,
        data: {
          suggestions: [],
          count: 0,
          status: "insufficient_data",
          evidence: {
            productsRequested: uniqueProductIds.length,
            eligibleProducts: 0,
            totalHistoryPoints: historyCounts.reduce((sum, row) => sum + numberValue(row.points), 0),
            minimumHistoryPoints: PRICE_HISTORY_MIN_POINTS,
          },
        },
      });
    }

    const [suggestionsMap, productRows] = await Promise.all([
      pricingEngine.getBulkPriceSuggestions(eligibleIds),
      db.select().from(schema.products).where(inArray(schema.products.id, eligibleIds)),
    ]);
    const productMap = new Map(productRows.map((product) => [product.id, product]));

    const suggestions = [];
    for (const [productId, suggestion] of suggestionsMap.entries()) {
      const product = productMap.get(productId);
      if (!product) continue;

      let reasonType: "demand_high" | "demand_low" | "stock_low" | "stock_high" | "seasonal";
      if (suggestion.reason.includes("مخزون منخفض")) reasonType = "stock_low";
      else if (suggestion.reason.includes("مخزون زائد")) reasonType = "stock_high";
      else if (suggestion.reason.includes("موسم")) reasonType = "seasonal";
      else if (suggestion.reasonType === "increase") reasonType = "demand_high";
      else if (suggestion.reasonType === "decrease") reasonType = "demand_low";
      else reasonType = "seasonal";

      suggestions.push({
        product: {
          id: product.id,
          name: product.name,
          price: numberValue(product.price),
          category: product.category,
          image: product.image,
          thumbnail: product.thumbnail,
          stock: product.stock,
        },
        currentPrice: suggestion.currentPrice,
        suggestedPrice: suggestion.suggestedPrice,
        reason: suggestion.reason,
        reasonType,
        percentChange: suggestion.changePercent,
        confidence: suggestion.confidence,
        expectedImpact: suggestion.expectedImpact,
      });
    }

    return res.json({
      success: true,
      data: {
        suggestions,
        count: suggestions.length,
        status: suggestions.length > 0 ? "supported_suggestions" : "no_supported_change",
        evidence: {
          productsRequested: uniqueProductIds.length,
          eligibleProducts: eligibleIds.length,
          totalHistoryPoints: historyCounts.reduce((sum, row) => sum + numberValue(row.points), 0),
          minimumHistoryPoints: PRICE_HISTORY_MIN_POINTS,
        },
      },
    });
  } catch (error) {
    console.error("[Pricing API] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "خطأ في حساب الاقتراحات",
    });
  }
});

/** Verified, read-only facts for the admin AI tab. */
router.get("/dashboard-insights", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const truth = await loadDashboardTruth();
    return res.json({ success: true, data: truth });
  } catch (error) {
    console.error("[Pricing] Dashboard insights error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "تعذر جلب بيانات الإدارة",
    });
  }
});

/** Deterministic admin assistant: answers only from verified database calculations. */
router.post("/dashboard-chat", requireAdmin, async (req: Request, res: Response) => {
  try {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) return res.status(400).json({ success: false, error: "الرسالة مطلوبة" });

    const truth = await loadDashboardTruth();
    const normalized = message.toLowerCase();
    let response: string;

    if (normalized.includes("مبيعات اليوم") || normalized.includes("ايرادات اليوم") || normalized.includes("إيرادات اليوم")) {
      response =
        `اليوم توجد ${truth.today.createdAndDeliveredOrders} طلبات أُنشئت اليوم وحالتها موصّل، ` +
        `بقيمة ${truth.today.createdAndDeliveredRevenue.toLocaleString("en-US")} د.ع. ` +
        `هذا الرقم لا يشمل الطلبات الجارية أو المرفوضة.`;
    } else if (normalized.includes("اقل مخزون") || normalized.includes("الأقل مخزون") || normalized.includes("اعادة تخزين") || normalized.includes("إعادة تخزين")) {
      response =
        `حالياً: ${truth.inventory.outOfStock} منتجات نافدة، و${truth.inventory.lowStock} منتجات منخفضة المخزون ` +
        `وفق حد إعادة التخزين المسجل لكل منتج. تكلفة شراء المخزون المسجلة ` +
        `${truth.inventory.purchaseCostValue.toLocaleString("en-US")} د.ع.`;
    } else if (normalized.includes("أفضل منتج") || normalized.includes("افضل منتج") || normalized.includes("الأكثر مبيع")) {
      const top = truth.topProducts[0];
      response = top
        ? `أفضل منتج خلال آخر 30 يوم بين الطلبات الموصلة هو «${top.name}» بعدد ${top.units} وحدة.`
        : "لا توجد طلبات موصلة كافية خلال آخر 30 يوم لتحديد أفضل منتج.";
    } else if (normalized.includes("هذا الأسبوع") || normalized.includes("هذا الاسبوع") || normalized.includes("الأسبوع")) {
      response =
        `خلال آخر 7 أيام: ${truth.week.deliveredOrders} طلبات موصلة بقيمة محققة ` +
        `${truth.week.realizedRevenue.toLocaleString("en-US")} د.ع. يوجد حالياً ${truth.orders.activeNow} طلب نشط.`;
    } else if (normalized.includes("قيمة المخزون") || normalized.includes("تكلفة المخزون")) {
      response =
        `تكلفة شراء المخزون المسجلة هي ${truth.inventory.purchaseCostValue.toLocaleString("en-US")} د.ع، ` +
        `وقيمة البيع الحالية النظرية لكل الكميات هي ${truth.inventory.retailValue.toLocaleString("en-US")} د.ع. ` +
        `القيمتان مختلفتان ولا تمثلان الربح.`;
    } else {
      response =
        `ملخص موثّق لآخر 30 يوم: ${truth.orders.deliveredInPeriod} طلبات موصلة، ` +
        `${truth.orders.realizedRevenueInPeriod.toLocaleString("en-US")} د.ع إيراد محقق، ` +
        `${truth.orders.activeNow} طلب نشط، ${truth.inventory.outOfStock} منتجات نافدة، ` +
        `و${truth.inventory.lowStock} منتجات منخفضة المخزون. ` +
        `اسألني عن مبيعات اليوم، المخزون، أفضل منتج، أو أداء الأسبوع.`;
    }

    return res.json({
      success: true,
      data: {
        response,
        generatedAt: truth.generatedAt,
        definitions: truth.definitions,
      },
    });
  } catch (error) {
    console.error("[Pricing] Dashboard chat error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "تعذر قراءة بيانات الإدارة",
    });
  }
});

/**
 * POST /api/pricing/apply
 * Writes products.price only after an explicit admin confirmation token.
 */
router.post("/apply", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userAgent = req.headers["user-agent"] ?? "";
    const isAiAgent = req.headers["x-ai-agent"] || req.headers["x-automated"];
    if (isAiAgent) {
      console.warn("[Pricing] BLOCKED automated call to /pricing/apply from:", userAgent);
      return res.status(403).json({
        success: false,
        error: "هذا المسار لا يقبل التغيير الآلي. تغيير السعر يحتاج موافقة صريحة من المدير.",
      });
    }

    const { updates, adminConfirm } = req.body as {
      updates?: Array<{ id: string; price: number }>;
      adminConfirm?: string;
    };

    if (adminConfirm !== "I_CONFIRM_PRICE_CHANGE") {
      return res.status(400).json({
        success: false,
        error: "تغيير سعر البيع يحتاج موافقة صريحة من المدير.",
      });
    }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: "updates array is required and must not be empty" });
    }

    const db = getDb();
    if (!db) return res.status(500).json({ success: false, error: "Database not connected" });

    const adminId = (req as Request & { user?: { id: string; email?: string } }).user?.id ?? "unknown";
    const adminEmail = (req as Request & { user?: { id: string; email?: string } }).user?.email ?? "unknown";
    const now = new Date().toISOString();

    console.warn(
      `[Pricing] SALE PRICE CHANGE by admin ${adminEmail} (${adminId}) at ${now}: ` +
        updates.map((update) => `${update.id}→${update.price}`).join(", "),
    );

    const results = [];
    for (const update of updates) {
      if (typeof update.price !== "number" || update.price <= 0) continue;

      const [before] = await db
        .select({ id: schema.products.id, name: schema.products.name, price: schema.products.price })
        .from(schema.products)
        .where(eq(schema.products.id, update.id))
        .limit(1);
      if (!before) continue;

      await db
        .update(schema.products)
        .set({ price: update.price.toString() })
        .where(eq(schema.products.id, update.id));

      console.warn(`[Pricing] Price changed: "${before.name}" ${before.price} → ${update.price} by ${adminEmail}`);
      results.push({
        id: update.id,
        name: before.name,
        oldPrice: numberValue(before.price),
        newPrice: update.price,
      });
    }

    return res.json({
      success: true,
      warning: "تم تغيير سعر البيع بعد موافقة المدير.",
      data: { updated: results.length, products: results, changedBy: adminEmail, changedAt: now },
    });
  } catch (error) {
    console.error("[Pricing API] Error applying prices:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "خطأ في تطبيق الأسعار",
    });
  }
});

router.get("/trend/:productId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { days } = req.query as { days?: string };
    const trend = await pricingEngine.analyzePriceTrend(productId, days ? parseInt(days, 10) : 30);
    if (!trend) {
      return res.status(404).json({
        success: false,
        error: "لا توجد بيانات تاريخية كافية لتحليل الاتجاه",
      });
    }
    return res.json({ success: true, data: trend });
  } catch (error) {
    console.error("[Pricing API] Error analyzing trend:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "خطأ في تحليل الاتجاه",
    });
  }
});

export default router;
