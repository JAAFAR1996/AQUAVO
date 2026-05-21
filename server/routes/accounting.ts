import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { orders, products, shippingSettlements, productCostHistory, orderReturnEvents, expenses } from "../../shared/schema.js";
import { and, gte, lte, inArray, eq, desc, isNull } from "drizzle-orm";
import {
  accountingCostHistoryInputSchema,
  accountingCostInputSchema,
  accountingCostUpdateSchema,
  accountingPeriodSchema,
  accountingSettlementInputSchema,
  orderReturnEventInputSchema,
  orderReturnEventStatusUpdateSchema,
  type AccountingInventory,
  type AccountingPeriod,
  type CostAuditRiskStatus,
} from "../../shared/accounting.js";

const router = Router();
router.use(requireAdmin);

type Db = NonNullable<ReturnType<typeof getDb>>;
type OrderRow = typeof orders.$inferSelect;
type ProductRow = typeof products.$inferSelect;
type CostHistoryRow = typeof productCostHistory.$inferSelect;

interface OrderLineItem {
  productId?: string;
  quantity?: number | string;
  priceAtPurchase?: number | string;
}

interface ProductCost {
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  packagingCost: number;
  insertCost: number;
  costsComplete: boolean;
}

interface CostResolver {
  getCurrent(productId: string): ProductCost | undefined;
  getEffective(productId: string, at: Date): ProductCost | undefined;
}

interface OrderProfitItem {
  productId: string;
  name: string;
  qty: number;
  priceAtPurchase: number;
}

interface OrderProfit {
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  createdAt: string;
  revenue: number;
  cogs: number;
  packaging: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  shipping: number;
  boxCost: number;
  netProfit: number;
  margin: number;
  costsComplete: boolean;
  missingCostLines: number;
  missingProductLines: number;
  items: OrderProfitItem[];
}

interface ProductProfit {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  packaging: number;
  netProfit: number;
  margin: number;
  costPrice: number;
  packagingCost: number;
  insertCost: number;
  costsComplete: boolean;
  missingCostLines: number;
  missingProductLines: number;
}

const competitorCheckSchema = z.object({
  productName: z.string().trim().min(1),
  brand: z.string().trim().optional(),
});

function getAccountingDb(res: Response): Db | null {
  const db = getDb();
  if (!db) {
    res.status(503).json({ success: false, message: "قاعدة البيانات غير مهيأة" });
    return null;
  }
  return db;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// المبلغ الفعلي الذي يدفعه الزبون — مقرّب لأقرب 250 دينار
function orderCollectedAmount(order: OrderRow): number {
  if (order.roundedTotal != null) return toNumber(order.roundedTotal);
  const raw = toNumber(order.total);
  return Math.round(raw / 250) * 250;
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

// الطلبات المحققة (delivered فقط) — الإيراد الفعلي
const REALIZED_STATUSES = ["delivered"] as const;
// الطلبات الملغاة/المرفوضة
const CANCELLED_STATUSES = ["cancelled", "rejected", "rejected_returned", "rejected_carrier", "returned"] as const;
// الطلبات قيد التنفيذ
const IN_PROGRESS_STATUSES = ["pending", "confirmed", "processing", "shipped"] as const;

function periodRange(period: AccountingPeriod, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === "custom" && from && to) {
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "week") {
    const day = now.getDay();
    const diffToSat = (day + 1) % 7; // السبت بداية الأسبوع (عراقي)
    const start = new Date(now);
    start.setDate(now.getDate() - diffToSat);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  // month (default)
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function getPeriodQuery(req: Request): { period: AccountingPeriod; from?: string; to?: string } {
  const rawPeriod = typeof req.query.period === "string" ? req.query.period : "month";
  const parsedPeriod = accountingPeriodSchema.safeParse(rawPeriod);
  const period = parsedPeriod.success ? parsedPeriod.data : "month";
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  return { period, from, to };
}

function getOrderItems(order: OrderRow): OrderLineItem[] {
  return Array.isArray(order.items) ? (order.items as OrderLineItem[]) : [];
}

function lineQuantity(item: OrderLineItem): number {
  const qty = toNumber(item.quantity);
  return qty > 0 ? qty : 1;
}

function orderSubtotal(items: OrderLineItem[]): number {
  return items.reduce((sum, item) => {
    return sum + toNumber(item.priceAtPurchase) * lineQuantity(item);
  }, 0);
}

function productCostFromProduct(product: ProductRow): ProductCost {
  const costPrice = toNumber(product.costPrice);
  return {
    productId: product.id,
    name: product.name,
    price: toNumber(product.price),
    costPrice,
    packagingCost: toNumber(product.packagingCost),
    insertCost: toNumber(product.insertCost),
    costsComplete: costPrice > 0,
  };
}

function productCostFromHistory(product: ProductRow, history: CostHistoryRow): ProductCost {
  const costPrice = toNumber(history.costPrice);
  return {
    productId: product.id,
    name: product.name,
    price: toNumber(product.price),
    costPrice,
    packagingCost: toNumber(history.packagingCost),
    insertCost: toNumber(history.insertCost),
    costsComplete: costPrice > 0,
  };
}

async function buildCostResolver(db: Db, productIds: Set<string>): Promise<CostResolver> {
  const productMap = new Map<string, ProductRow>();
  const historyMap = new Map<string, CostHistoryRow[]>();

  if (productIds.size > 0) {
    const ids = [...productIds];
    const productRows = await db.select().from(products).where(inArray(products.id, ids));
    for (const product of productRows) productMap.set(product.id, product);

    const historyRows = await db
      .select()
      .from(productCostHistory)
      .where(inArray(productCostHistory.productId, ids))
      .orderBy(desc(productCostHistory.effectiveFrom), desc(productCostHistory.createdAt));

    for (const history of historyRows) {
      const rows = historyMap.get(history.productId) ?? [];
      rows.push(history);
      historyMap.set(history.productId, rows);
    }
  }

  return {
    getCurrent(productId: string) {
      const product = productMap.get(productId);
      return product ? productCostFromProduct(product) : undefined;
    },
    getEffective(productId: string, at: Date) {
      const product = productMap.get(productId);
      if (!product) return undefined;

      const effectiveHistory = historyMap
        .get(productId)
        ?.find((history) => toDate(history.effectiveFrom).getTime() <= at.getTime());

      return effectiveHistory
        ? productCostFromHistory(product, effectiveHistory)
        : productCostFromProduct(product);
    },
  };
}

function collectProductIds(orderRows: OrderRow[]): Set<string> {
  const productIds = new Set<string>();
  for (const order of orderRows) {
    for (const item of getOrderItems(order)) {
      if (item.productId) productIds.add(item.productId);
    }
  }
  return productIds;
}

async function getOrdersForPeriod(db: Db, start: Date, end: Date): Promise<OrderRow[]> {
  return await db
    .select()
    .from(orders)
    .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));
}

// للربح الفعلي فقط: طلبات موصّلة
async function getRealizedOrdersForPeriod(db: Db, start: Date, end: Date): Promise<OrderRow[]> {
  return await db
    .select()
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        inArray(orders.status, [...REALIZED_STATUSES])
      )
    );
}

function calcOrderProfit(order: OrderRow, costs: CostResolver): OrderProfit {
  const rawItems = getOrderItems(order);
  const createdAt = toDate(order.createdAt);
  let cogs = 0;
  let missingCostLines = 0;
  let missingProductLines = 0;
  const resolvedItems: OrderProfitItem[] = [];

  for (const item of rawItems) {
    const qty = lineQuantity(item);
    const price = toNumber(item.priceAtPurchase);

    if (!item.productId) {
      missingProductLines++;
      resolvedItems.push({ productId: "", name: "منتج غير معروف", qty, priceAtPurchase: price });
      continue;
    }

    const cost = costs.getEffective(item.productId, createdAt);
    if (!cost) {
      missingProductLines++;
      resolvedItems.push({ productId: item.productId, name: item.productId, qty, priceAtPurchase: price });
      continue;
    }
    if (!cost.costsComplete) missingCostLines++;

    // Full per-unit product cost: purchase price + per-unit packaging + inserts
    cogs += (cost.costPrice + cost.packagingCost + cost.insertCost) * qty;
    resolvedItems.push({ productId: item.productId, name: cost.name, qty, priceAtPurchase: price });
  }

  // الإيراد = المبلغ الذي يستلمه البائع فعلاً من الشركة (مقرّب - الشحن)
  const shipping = toNumber(order.shippingCost);
  const revenue = orderCollectedAmount(order) - shipping;
  const packaging = toNumber(order.boxCost);
  const couponDiscount = toNumber(order.discountTotal);
  const loyaltyDiscount = toNumber(order.pointsDiscount);
  // الكوبونات والنقاط مدموجة في المبلغ المحصّل — تُعرض للمعلومة فقط
  const netProfit = revenue - cogs - packaging;
  const margin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber ?? null,
    customerName: order.customerName ?? null,
    customerPhone: order.customerPhone ?? null,
    status: order.status ?? "pending",
    createdAt: createdAt.toISOString(),
    revenue,
    cogs,
    packaging,
    boxCost: packaging,
    couponDiscount,
    loyaltyDiscount,
    shipping,
    netProfit,
    margin,
    costsComplete: missingCostLines === 0 && missingProductLines === 0,
    missingCostLines,
    missingProductLines,
    items: resolvedItems,
  };
}

function serializeCostHistory(history: CostHistoryRow) {
  return {
    id: history.id,
    productId: history.productId,
    costPrice: toNumber(history.costPrice),
    packagingCost: toNumber(history.packagingCost),
    insertCost: toNumber(history.insertCost),
    effectiveFrom: toDate(history.effectiveFrom).toISOString(),
    note: history.note ?? null,
    changedBy: history.changedBy ?? null,
    createdAt: toDate(history.createdAt).toISOString(),
  };
}

router.get("/summary", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);
    const allOrders = await getOrdersForPeriod(db, start, end);
    const realizedOrders = allOrders.filter((o) => REALIZED_STATUSES.includes(o.status as (typeof REALIZED_STATUSES)[number]));
    const costs = await buildCostResolver(db, collectProductIds(realizedOrders));

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalPackaging = 0;
    let totalCoupons = 0;
    let totalLoyalty = 0;
    let missingCostLines = 0;
    let missingProductLines = 0;

    for (const order of realizedOrders) {
      const profit = calcOrderProfit(order, costs);
      totalRevenue += profit.revenue;
      totalCogs += profit.cogs;
      totalPackaging += profit.packaging;
      // الكوبونات والنقاط للعرض فقط — مدموجة في الإيراد المحصّل
      totalCoupons += profit.couponDiscount;
      totalLoyalty += profit.loyaltyDiscount;
      missingCostLines += profit.missingCostLines;
      missingProductLines += profit.missingProductLines;
    }

    const deliveredCount = allOrders.filter((o) => o.status === "delivered").length;
    const cancelledCount = allOrders.filter((o) => CANCELLED_STATUSES.includes(o.status as (typeof CANCELLED_STATUSES)[number])).length;
    const rejectedCount = allOrders.filter((o) => ["rejected", "rejected_returned", "rejected_carrier"].includes(o.status ?? "")).length;
    const inProgressCount = allOrders.filter((o) => IN_PROGRESS_STATUSES.includes(o.status as (typeof IN_PROGRESS_STATUSES)[number])).length;
    const rtoCount = allOrders.filter((o) => [...CANCELLED_STATUSES].includes(o.status as (typeof CANCELLED_STATUSES)[number])).length;
    const rtoRate = allOrders.length > 0 ? Math.round((rtoCount / allOrders.length) * 100) : 0;
    const aov = deliveredCount > 0 ? Math.round(totalRevenue / deliveredCount) : 0;

    // التكاليف = بضاعة + كارتونات فقط (الكوبونات مدموجة في الإيراد)
    const totalCosts = totalCogs + totalPackaging;
    const netProfit = totalRevenue - totalCosts;
    const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // ── Verified return events for period ──────────────────────────────
    const returnEventsInPeriod = await db
      .select()
      .from(orderReturnEvents)
      .where(and(gte(orderReturnEvents.createdAt, start), lte(orderReturnEvents.createdAt, end)));

    const verifiedReturnRows = returnEventsInPeriod.filter((e) => e.status === "verified");

    const sumReturn = (key: keyof typeof verifiedReturnRows[0]) =>
      verifiedReturnRows.reduce((s, e) => s + toNumber(e[key]), 0);

    const totalRefundAmount = sumReturn("refundAmount");
    const totalDeliveryCostLoss = sumReturn("deliveryCostLoss");
    const totalReturnShippingCost = sumReturn("returnShippingCost");
    const totalPackagingLoss = sumReturn("packagingLoss");
    const totalProductWriteOffAmount = sumReturn("productWriteOffAmount");
    const totalCogsLoss = sumReturn("cogsLoss");
    const totalReturnFinancialImpact =
      totalRefundAmount + totalDeliveryCostLoss + totalReturnShippingCost +
      totalPackagingLoss + totalProductWriteOffAmount + totalCogsLoss;

    const netProfitBeforeReturns = netProfit;
    const netProfitAfterReturns = netProfit - totalReturnFinancialImpact;
    const marginBeforeReturns = margin;
    const marginAfterReturns = totalRevenue > 0 ? Math.round((netProfitAfterReturns / totalRevenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        period,
        totalOrders: allOrders.length,
        deliveredCount,
        cancelledCount,
        rejectedCount,
        inProgressCount,
        rtoRate,
        aov,
        totalRevenue,
        totalCogs,
        totalPackaging,
        totalCoupons,
        totalLoyalty,
        totalCosts,
        netProfit,
        margin,
        costsComplete: missingCostLines === 0 && missingProductLines === 0,
        missingCostLines,
        missingProductLines,
        totalReturnEvents: returnEventsInPeriod.length,
        verifiedReturnEvents: verifiedReturnRows.length,
        totalRefundAmount,
        totalDeliveryCostLoss,
        totalReturnShippingCost,
        totalPackagingLoss,
        totalProductWriteOffAmount,
        totalCogsLoss,
        totalReturnFinancialImpact,
        netProfitBeforeReturns,
        netProfitAfterReturns,
        marginBeforeReturns,
        marginAfterReturns,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/products", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);

    const activeProducts = await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt));

    const allOrders = await getRealizedOrdersForPeriod(db, start, end);

    const allProductIds = new Set<string>([
      ...collectProductIds(allOrders),
      ...activeProducts.map((p) => p.id),
    ]);
    const costs = await buildCostResolver(db, allProductIds);
    const profitMap: Record<string, ProductProfit> = {};

    for (const order of allOrders) {
      const items = getOrderItems(order);
      const subtotal = orderSubtotal(items);
      const createdAt = toDate(order.createdAt);
      const orderRevenue = orderCollectedAmount(order) - toNumber(order.shippingCost);
      const revenueRatio = subtotal > 0 ? orderRevenue / subtotal : 1;
      const boxCost = toNumber(order.boxCost);

      for (const item of items) {
        const productId = item.productId;
        const qty = lineQuantity(item);
        const price = toNumber(item.priceAtPurchase);
        const lineGross = price * qty;
        const lineRevenue = lineGross * revenueRatio;
        const lineDeduct = subtotal > 0 ? boxCost * (lineGross / subtotal) : 0;

        if (!productId) continue;

        const currentCost = costs.getCurrent(productId);
        const effectiveCost = costs.getEffective(productId, createdAt);
        if (!currentCost || !effectiveCost) continue;

        const lineCogs = effectiveCost.costPrice * qty;
        const linePack = (effectiveCost.packagingCost + effectiveCost.insertCost) * qty;
        const lineProfit = lineRevenue - lineCogs - linePack - lineDeduct;

        if (!profitMap[productId]) {
          profitMap[productId] = {
            productId,
            name: currentCost.name,
            unitsSold: 0,
            revenue: 0,
            cogs: 0,
            packaging: 0,
            netProfit: 0,
            margin: 0,
            costPrice: currentCost.costPrice,
            packagingCost: currentCost.packagingCost,
            insertCost: currentCost.insertCost,
            costsComplete: true,
            missingCostLines: 0,
            missingProductLines: 0,
          };
        }

        profitMap[productId].unitsSold += qty;
        profitMap[productId].revenue += lineRevenue;
        profitMap[productId].cogs += lineCogs;
        profitMap[productId].packaging += linePack;
        profitMap[productId].netProfit += lineProfit;
        if (!effectiveCost.costsComplete) {
          profitMap[productId].missingCostLines++;
          profitMap[productId].costsComplete = false;
        }
      }
    }

    // ── Verified return events — per-product allocation via affectedItems ──
    interface ProductReturnAccum {
      returnedQty: number;
      returnRefundAmount: number;
      returnCogsLoss: number;
    }
    const productReturnMap = new Map<string, ProductReturnAccum>();

    const verifiedReturnEventsForProducts = await db
      .select()
      .from(orderReturnEvents)
      .where(and(
        eq(orderReturnEvents.status, "verified"),
        gte(orderReturnEvents.createdAt, start),
        lte(orderReturnEvents.createdAt, end),
      ));

    for (const evt of verifiedReturnEventsForProducts) {
      const items = Array.isArray(evt.affectedItems)
        ? (evt.affectedItems as Array<{ productId: string; qty: number; priceAtPurchase: number; cogsAtTime: number }>)
        : [];
      for (const item of items) {
        const existing = productReturnMap.get(item.productId) ??
          { returnedQty: 0, returnRefundAmount: 0, returnCogsLoss: 0 };
        existing.returnedQty += item.qty;
        existing.returnRefundAmount += item.qty * item.priceAtPurchase;
        existing.returnCogsLoss += item.qty * item.cogsAtTime;
        productReturnMap.set(item.productId, existing);
      }
    }

    const result = activeProducts
      .map((product) => {
        const salePrice = toNumber(product.price);
        const costPrice = toNumber(product.costPrice);
        const packagingCost = toNumber(product.packagingCost);
        const insertCost = toNumber(product.insertCost);
        const stock = Number(product.stock ?? 0);
        const threshold = Number(product.lowStockThreshold ?? 10);
        const comingSoon = salePrice <= 0;

        const profit = profitMap[product.id];
        const unitsSold = profit?.unitsSold ?? 0;
        const revenue = profit?.revenue ?? 0;
        const cogs = profit?.cogs ?? 0;
        const packaging = profit?.packaging ?? 0;
        const netProfit = profit?.netProfit ?? 0;
        const missingCostLines = profit?.missingCostLines ?? 0;
        const missingProductLines = profit?.missingProductLines ?? 0;
        const costsComplete = profit ? profit.costsComplete : costPrice > 0;

        const margin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
        const grossProfit = revenue - cogs;
        const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;

        const totalCostPerUnit = costPrice + packagingCost + insertCost;
        const inventoryValueAtCost = costPrice > 0 ? costPrice * stock : 0;
        const potentialRevenueFromStock = comingSoon ? 0 : salePrice * stock;
        const potentialGrossProfitFromStock =
          costPrice > 0 && !comingSoon ? (salePrice - totalCostPerUnit) * stock : 0;

        let recommendationLabel: string;
        if (comingSoon) {
          recommendationLabel = "قريباً جداً";
        } else if (costPrice <= 0) {
          recommendationLabel = "كلفة ناقصة";
        } else if (totalCostPerUnit > salePrice) {
          recommendationLabel = "لا يصلح للإعلان وحده";
        } else if (stock === 0) {
          recommendationLabel = "نفد المخزون";
        } else if (stock > 0 && stock <= 3) {
          recommendationLabel = "مخزون منخفض";
        } else if (grossMargin < 20 && revenue > 0) {
          recommendationLabel = "هامش ضعيف";
        } else if (revenue > 0) {
          recommendationLabel = "جيد";
        } else {
          recommendationLabel = "لا مبيعات";
        }

        const ret = productReturnMap.get(product.id);
        const returnedQty = ret?.returnedQty ?? 0;
        const returnRefundAmount = ret?.returnRefundAmount ?? 0;
        const returnCogsLoss = ret?.returnCogsLoss ?? 0;
        const returnWriteOffAmount = 0; // event-level only — cannot split per product
        const returnFinancialImpact = returnRefundAmount + returnCogsLoss + returnWriteOffAmount;
        const adjustedGrossProfit = grossProfit - returnFinancialImpact;
        const adjustedNetProfit = netProfit - returnFinancialImpact;
        const adjustedMargin = revenue > 0 ? Math.round((adjustedNetProfit / revenue) * 100) : 0;
        const returnRate = unitsSold > 0 ? Math.round((returnedQty / unitsSold) * 100) : 0;

        return {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category,
          salePrice,
          costPrice,
          packagingCost,
          insertCost,
          stock,
          unitsSold,
          revenue,
          cogs,
          packaging,
          netProfit,
          margin,
          grossProfit,
          grossMargin,
          inventoryValueAtCost,
          potentialRevenueFromStock,
          potentialGrossProfitFromStock,
          comingSoon,
          recommendationLabel,
          costsComplete,
          missingCostLines,
          missingProductLines,
          returnedQty,
          returnRefundAmount,
          returnCogsLoss,
          returnWriteOffAmount,
          returnFinancialImpact,
          adjustedGrossProfit,
          adjustedNetProfit,
          adjustedMargin,
          returnRate,
        };
      })
      .sort((a, b) => b.grossProfit - a.grossProfit);

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(result, (_k, v) => (typeof v === "bigint" ? Number(v) : v))),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/orders", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);
    const allOrders = await getOrdersForPeriod(db, start, end);
    const costs = await buildCostResolver(db, collectProductIds(allOrders));
    const result = allOrders
      .map((order) => calcOrderProfit(order, costs))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get("/cod-summary", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const [allCodOrders, settlements, verifiedReturnEvents] = await Promise.all([
      db.select().from(orders),
      db.select().from(shippingSettlements).orderBy(desc(shippingSettlements.createdAt)),
      db.select().from(orderReturnEvents).where(eq(orderReturnEvents.status, "verified")),
    ]);

    const deliveredOrders = allCodOrders.filter((order) => order.status === "delivered");
    const inTransitOrders = allCodOrders.filter((order) => order.status === "shipped");
    // ما يستحقه البائع = المبلغ المحصّل فعلاً - رسوم التوصيل (الشركة تاخذها لنفسها)
    const orderNetAmount = (order: OrderRow) =>
      orderCollectedAmount(order) - toNumber(order.shippingCost);

    const totalDelivered = deliveredOrders.reduce((sum, order) => sum + orderNetAmount(order), 0);
    const totalInTransit = inTransitOrders.reduce((sum, order) => sum + orderNetAmount(order), 0);
    const totalCod = totalDelivered;
    // المبلغ المستلم = مجموع كل الدفعات المسجّلة من شركات الشحن
    const totalReceived = settlements.reduce((sum, s) => sum + toNumber(s.amount), 0);
    // خصومات الراجعات المعتمدة — مبالغ مُستردة مرتبطة بطلبيات مسلّمة فقط
    const deliveredOrderIds = new Set(deliveredOrders.map((o) => o.id));
    const approvedReturnDeductions = verifiedReturnEvents
      .filter((e) => deliveredOrderIds.has(e.orderId))
      .reduce((sum, e) => sum + toNumber(e.refundAmount), 0);
    const totalPending = Math.max(0, totalDelivered - totalReceived - approvedReturnDeductions);

    res.json({
      success: true,
      data: {
        totalCod,
        totalDelivered,
        totalInTransit,
        totalReceived,
        approvedReturnDeductions,
        totalPending,
        settlements: settlements.map((settlement) => ({
          id: settlement.id,
          carrier: settlement.carrier,
          amount: toNumber(settlement.amount),
          notes: settlement.notes,
          createdAt: toDate(settlement.createdAt).toISOString(),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// معدلات الإرجاع — طلبات وعناصر، بدون فلتر الفترة
router.get("/return-metrics", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);

    const [allOrdersAllTime, allOrdersInPeriod, allReturnEvents] = await Promise.all([
      db.select().from(orders),
      getOrdersForPeriod(db, start, end),
      db.select().from(orderReturnEvents),
    ]);

    // ── معدل إرجاع الطلبات (period-filtered, order-level) ──────────────
    const RETURN_ORDER_STATUSES = ["cancelled", "rejected", "rejected_returned", "rejected_carrier", "returned", "refunded"] as const;
    const periodReturnedOrders = allOrdersInPeriod.filter((o) =>
      (RETURN_ORDER_STATUSES as readonly string[]).includes(o.status ?? "")
    );
    const orderReturnRate = allOrdersInPeriod.length > 0
      ? Math.round((periodReturnedOrders.length / allOrdersInPeriod.length) * 100)
      : 0;

    // ── معدل إرجاع المنتجات (all-time, item-level) ─────────────────────

    // المصدر 1: عناصر من أحداث الإرجاع المعتمدة (all-time)
    const verifiedEvents = allReturnEvents.filter((e) => e.status === "verified");
    let returnedItemsFromEvents = 0;
    for (const ev of verifiedEvents) {
      if (Array.isArray(ev.affectedItems)) {
        for (const item of ev.affectedItems as { qty?: number }[]) {
          returnedItemsFromEvents += toNumber(item.qty ?? 1);
        }
      }
    }

    // المصدر 2: طلبات حالتها returned/refunded/rejected_returned بدون حدث إرجاع معتمد مسجّل لها
    const ordersWithVerifiedEvent = new Set(verifiedEvents.map((e) => e.orderId));
    const ITEM_RETURN_STATUSES = ["returned", "refunded", "rejected_returned"];
    let returnedItemsFromOrders = 0;
    for (const o of allOrdersAllTime) {
      if (!ITEM_RETURN_STATUSES.includes(o.status ?? "")) continue;
      if (ordersWithVerifiedEvent.has(o.id)) continue; // already counted via events
      const items = getOrderItems(o);
      returnedItemsFromOrders += items.reduce((sum, item) => sum + lineQuantity(item), 0);
    }

    const returnedItemsAllTime = returnedItemsFromEvents + returnedItemsFromOrders;

    // الإجمالي المُباع (all-time, delivered)
    let totalSoldItemsAllTime = 0;
    for (const o of allOrdersAllTime) {
      if (o.status !== "delivered") continue;
      const items = getOrderItems(o);
      totalSoldItemsAllTime += items.reduce((sum, item) => sum + lineQuantity(item), 0);
    }

    const productReturnRate = totalSoldItemsAllTime > 0
      ? Math.round((returnedItemsAllTime / totalSoldItemsAllTime) * 100 * 10) / 10
      : 0;

    // ── all-time order-level counts for display ─────────────────────────
    const allTimeReturnedOrders = allOrdersAllTime.filter((o) =>
      (RETURN_ORDER_STATUSES as readonly string[]).includes(o.status ?? "")
    );

    res.json({
      success: true,
      data: {
        // معدل إرجاع الطلبات (period)
        orderReturnRate,
        periodReturnedOrdersCount: periodReturnedOrders.length,
        periodTotalOrdersCount: allOrdersInPeriod.length,
        // معدل إرجاع المنتجات (all-time)
        productReturnRate,
        returnedItemsAllTime,
        returnedItemsFromEvents,
        returnedItemsFromOrders,
        totalSoldItemsAllTime,
        // all-time order counts
        allTimeReturnedOrdersCount: allTimeReturnedOrders.length,
        allTimeTotalOrdersCount: allOrdersAllTime.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// تفاصيل الطلبيات المسلّمة — للكشف عن 10,000 د.ع بانتظار التسوية
router.get("/cod-details", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const [allOrders, settlements, verifiedReturnEvents] = await Promise.all([
      db.select().from(orders),
      db.select().from(shippingSettlements),
      db.select().from(orderReturnEvents).where(eq(orderReturnEvents.status, "verified")),
    ]);

    const deliveredOrders = allOrders.filter((o) => o.status === "delivered");
    const totalReceived = settlements.reduce((sum, s) => sum + toNumber(s.amount), 0);

    const orderNetAmount = (order: OrderRow) =>
      orderCollectedAmount(order) - toNumber(order.shippingCost);

    const totalDelivered = deliveredOrders.reduce((sum, o) => sum + orderNetAmount(o), 0);

    // خصومات الراجعات المعتمدة لكل طلبية مسلّمة
    const deductionByOrder = new Map<string, number>();
    const deliveredOrderIds = new Set(deliveredOrders.map((o) => o.id));
    for (const e of verifiedReturnEvents) {
      if (!deliveredOrderIds.has(e.orderId)) continue;
      deductionByOrder.set(e.orderId, (deductionByOrder.get(e.orderId) ?? 0) + toNumber(e.refundAmount));
    }
    const approvedReturnDeductions = [...deductionByOrder.values()].reduce((s, v) => s + v, 0);
    const totalPending = Math.max(0, totalDelivered - totalReceived - approvedReturnDeductions);

    const result = deliveredOrders
      .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
      .map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber ?? null,
        customerName: o.customerName ?? null,
        customerPhone: o.customerPhone ?? null,
        orderTotal: toNumber(o.total),
        shippingCost: toNumber(o.shippingCost),
        collectedAmount: orderCollectedAmount(o),
        netAmount: orderNetAmount(o),
        returnDeduction: deductionByOrder.get(o.id) ?? 0,
        paymentStatus: o.paymentStatus ?? null,
        orderStatus: o.status ?? "delivered",
        carrier: o.carrier ?? null,
        createdAt: toDate(o.createdAt).toISOString(),
      }));

    res.json({
      success: true,
      data: {
        deliveredOrders: result,
        totalDelivered,
        totalReceived,
        approvedReturnDeductions,
        totalPending,
      },
    });
  } catch (err) {
    next(err);
  }
});

// طلبيات مُرجَعة — للعرض في قسم المرتجعات
router.get("/returned-orders", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const RETURN_STATUSES = ["returned", "refunded", "rejected_returned"];

    const [allOrders, returnEvents] = await Promise.all([
      db.select().from(orders),
      db.select().from(orderReturnEvents).where(eq(orderReturnEvents.status, "verified")),
    ]);

    const returnedOrders = allOrders.filter((o) =>
      RETURN_STATUSES.includes(o.status ?? "")
    );

    const verifiedEventsByOrder = new Map<string, typeof returnEvents[0][]>();
    for (const ev of returnEvents) {
      const list = verifiedEventsByOrder.get(ev.orderId) ?? [];
      list.push(ev);
      verifiedEventsByOrder.set(ev.orderId, list);
    }

    const totalRefundAmount = returnEvents.reduce((sum, e) => sum + toNumber(e.refundAmount), 0);

    const result = returnedOrders
      .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
      .map((o) => {
        const events = verifiedEventsByOrder.get(o.id) ?? [];
        const refund = events.reduce((s, e) => s + toNumber(e.refundAmount), 0);
        return {
          orderId: o.id,
          orderNumber: o.orderNumber ?? null,
          customerName: o.customerName ?? null,
          customerPhone: o.customerPhone ?? null,
          orderTotal: toNumber(o.total),
          shippingCost: toNumber(o.shippingCost),
          orderStatus: o.status ?? "returned",
          paymentStatus: o.paymentStatus ?? null,
          carrier: o.carrier ?? null,
          createdAt: toDate(o.createdAt).toISOString(),
          returnedAt: o.updatedAt ? toDate(o.updatedAt).toISOString() : null,
          hasVerifiedReturnEvent: events.length > 0,
          refundAmount: refund,
        };
      });

    res.json({
      success: true,
      data: {
        orders: result,
        totalCount: result.length,
        totalRefundAmount,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/settlements", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const parsed = accountingSettlementInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات الدفعة غير صالحة", errors: parsed.error.flatten() });
      return;
    }

    const { carrier, amount, notes, orderIds } = parsed.data;
    const [settlement] = await db
      .insert(shippingSettlements)
      .values({ carrier, amount: String(amount), notes: notes ?? null })
      .returning();

    if (Array.isArray(orderIds) && orderIds.length > 0) {
      await db.update(orders).set({ codReceived: true }).where(inArray(orders.id, orderIds));
    }

    res.status(201).json({
      success: true,
      data: {
        id: settlement.id,
        carrier: settlement.carrier,
        amount: toNumber(settlement.amount),
        notes: settlement.notes,
        createdAt: toDate(settlement.createdAt).toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/settlements", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const list = await db.select().from(shippingSettlements).orderBy(desc(shippingSettlements.createdAt));
    res.json({
      success: true,
      data: list.map((settlement) => ({
        id: settlement.id,
        carrier: settlement.carrier,
        amount: toNumber(settlement.amount),
        notes: settlement.notes,
        createdAt: toDate(settlement.createdAt).toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/costs/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { productId } = req.params as { productId: string };
    const parsed = accountingCostUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات الكلفة غير صالحة", errors: parsed.error.flatten() });
      return;
    }

    const { costPrice, packagingCost, insertCost, note } = parsed.data;
    const effectiveFrom = parsed.data.effectiveFrom ? new Date(parsed.data.effectiveFrom) : new Date();
    const changedBy = (req as any).user?.id ?? null;

    // Atomic: product update + history insert. If either fails, both roll back.
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(products)
        .set({
          costPrice: String(costPrice),
          packagingCost: String(packagingCost),
          insertCost: String(insertCost),
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning({ id: products.id });

      if (!updated) {
        throw Object.assign(new Error("المنتج غير موجود"), { statusCode: 404 });
      }

      await tx.insert(productCostHistory).values({
        productId,
        costPrice: String(costPrice),
        packagingCost: String(packagingCost),
        insertCost: String(insertCost),
        effectiveFrom,
        note: note?.trim() ?? null,
        changedBy,
      });
    });

    res.json({ success: true, data: { costPrice, packagingCost, insertCost, effectiveFrom: effectiveFrom.toISOString() } });
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.status(404).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
});

router.post("/competitor-check", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = competitorCheckSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "productName مطلوب", errors: parsed.error.flatten() });
      return;
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, message: "TAVILY_API_KEY غير مضبوط في .env — سجّل مجاناً على tavily.com (1000 بحث/شهر)" });
      return;
    }

    const query = `سعر ${parsed.data.productName} ${parsed.data.brand ?? ""} للبيع في العراق`.trim();
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 10,
        include_answer: false,
        include_images: false,
      }),
    });
    if (!response.ok) throw new Error(`Tavily error: ${response.status}`);
    const data = await response.json() as Record<string, unknown>;

    const rawResults = Array.isArray(data.results) ? data.results as Record<string, unknown>[] : [];

    // Extract price from content using IQD / دينار patterns
    const priceRegex = /[\d,،٠-٩]+(?:\.\d+)?\s*(?:IQD|دينار|د\.ع|iq)/i;
    const results = rawResults
      .map((item) => {
        const content = String(item.content ?? "");
        const match = content.match(priceRegex);
        const rawPrice = match ? match[0].replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[,،]/g, "") : "";
        const price = parseFloat(rawPrice) || 0;
        return {
          store: String(item.title ?? "غير معروف"),
          price,
          currency: "IQD",
          url: String(item.url ?? "#"),
          title: String(item.title ?? parsed.data.productName),
          snippet: content.slice(0, 200),
        };
      })
      .filter((r) => r.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 8);

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

router.get("/cost-history/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { productId } = req.params as { productId: string };
    const history = await db
      .select()
      .from(productCostHistory)
      .where(eq(productCostHistory.productId, productId))
      .orderBy(desc(productCostHistory.effectiveFrom), desc(productCostHistory.createdAt));

    res.json({ success: true, data: history.map(serializeCostHistory) });
  } catch (err) {
    next(err);
  }
});

router.post("/cost-history/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { productId } = req.params as { productId: string };
    const parsed = accountingCostHistoryInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات تاريخ الكلفة غير صالحة", errors: parsed.error.flatten() });
      return;
    }

    const { costPrice, packagingCost, insertCost, effectiveFrom, note } = parsed.data;
    const changedBy = (req as any).user?.id ?? null;
    const [entry] = await db
      .insert(productCostHistory)
      .values({
        productId,
        costPrice: String(costPrice),
        packagingCost: String(packagingCost),
        insertCost: String(insertCost),
        effectiveFrom: new Date(effectiveFrom),
        note: note?.trim() ?? null,
        changedBy,
      })
      .returning();

    res.status(201).json({ success: true, data: serializeCostHistory(entry) });
  } catch (err) {
    next(err);
  }
});

router.get("/coupons", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);
    const allOrders = await getRealizedOrdersForPeriod(db, start, end);
    const map: Record<string, { couponCode: string; usageCount: number; totalDiscount: number }> = {};

    for (const order of allOrders) {
      if (!order.couponId) continue;
      const discount = toNumber(order.discountTotal);
      if (!map[order.couponId]) {
        map[order.couponId] = { couponCode: order.couponId, usageCount: 0, totalDiscount: 0 };
      }
      map[order.couponId].usageCount++;
      map[order.couponId].totalDiscount += discount;
    }

    const result = Object.values(map)
      .map((coupon) => ({
        ...coupon,
        avgDiscount: coupon.usageCount > 0 ? Math.round(coupon.totalDiscount / coupon.usageCount) : 0,
      }))
      .sort((a, b) => b.totalDiscount - a.totalDiscount);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.patch("/orders/:orderId/box-cost", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { orderId } = req.params as { orderId: string };
    const parsed = z.object({ boxCost: z.coerce.number().min(0) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "قيمة الكارتونة غير صالحة" });
      return;
    }

    const [updated] = await db
      .update(orders)
      .set({ boxCost: String(parsed.data.boxCost), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id });

    if (!updated) {
      res.status(404).json({ success: false, message: "الطلبية غير موجودة" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/inventory", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const activeProducts = await db
      .select({
        price: products.price,
        costPrice: products.costPrice,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(isNull(products.deletedAt));

    let inventoryValueAtCost = 0;
    let inventoryValueAtRetail = 0;
    let productsWithCost = 0;
    let productsWithoutCost = 0;
    let comingSoonProducts = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;

    for (const p of activeProducts) {
      const price = toNumber(p.price);
      const costPrice = toNumber(p.costPrice);
      const stock = Number(p.stock ?? 0);
      const threshold = Number(p.lowStockThreshold ?? 10);

      // Coming Soon: price <= 0 — excluded from inventory metrics
      if (price <= 0) {
        comingSoonProducts++;
        continue;
      }

      if (stock === 0) {
        outOfStockProducts++;
      } else if (stock <= threshold) {
        lowStockProducts++;
      }

      if (costPrice > 0) {
        productsWithCost++;
        inventoryValueAtCost += costPrice * stock;
      } else {
        productsWithoutCost++;
      }

      inventoryValueAtRetail += price * stock;
    }

    res.json({
      success: true,
      data: {
        inventoryValueAtCost,
        inventoryValueAtRetail,
        totalProducts: activeProducts.length,
        productsWithCost,
        productsWithoutCost,
        comingSoonProducts,
        lowStockProducts,
        outOfStockProducts,
      } satisfies AccountingInventory,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/cost-history-audit", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    // Fetch all active products
    const activeProducts = await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt));

    // Fetch ALL delivered orders (all time — no date filter)
    const deliveredOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.status, [...REALIZED_STATUSES]));

    // Build per-product delivered-order metrics
    const orderStats: Record<string, { count: number; earliest: Date }> = {};
    for (const order of deliveredOrders) {
      const items = getOrderItems(order);
      const orderDate = toDate(order.createdAt);
      for (const item of items) {
        if (!item.productId) continue;
        const existing = orderStats[item.productId];
        if (!existing) {
          orderStats[item.productId] = { count: 1, earliest: orderDate };
        } else {
          existing.count++;
          if (orderDate < existing.earliest) existing.earliest = orderDate;
        }
      }
    }

    // Fetch ALL cost history rows
    const allHistory = await db
      .select()
      .from(productCostHistory)
      .orderBy(productCostHistory.effectiveFrom);

    // Build per-product history map (earliest effectiveFrom)
    const historyMap: Record<string, Date> = {};
    for (const row of allHistory) {
      const d = toDate(row.effectiveFrom);
      const existing = historyMap[row.productId];
      if (!existing || d < existing) historyMap[row.productId] = d;
    }

    const result = activeProducts.map((product) => {
      const salePrice = toNumber(product.price);
      const costPrice = toNumber(product.costPrice);
      const packagingCost = toNumber(product.packagingCost);
      const insertCost = toNumber(product.insertCost);

      const stats = orderStats[product.id];
      const deliveredOrderCount = stats?.count ?? 0;
      const firstDeliveredOrderDate = stats ? stats.earliest.toISOString() : null;

      const earliestHistory = historyMap[product.id];
      const hasCostHistory = earliestHistory !== undefined;
      const earliestEffectiveFrom = earliestHistory ? earliestHistory.toISOString() : null;

      let riskStatus: CostAuditRiskStatus;
      if (deliveredOrderCount === 0) {
        riskStatus = "No sales yet";
      } else if (costPrice <= 0) {
        riskStatus = "Missing cost";
      } else if (!hasCostHistory) {
        riskStatus = "Needs baseline";
      } else if (stats && earliestHistory > stats.earliest) {
        // History exists but doesn't reach back to the first order
        riskStatus = "Needs baseline";
      } else {
        riskStatus = "OK";
      }

      return {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        costPrice,
        packagingCost,
        insertCost,
        firstDeliveredOrderDate,
        deliveredOrderCount,
        hasCostHistory,
        earliestEffectiveFrom,
        riskStatus,
        salePrice,
      };
    });

    // Sort: Needs baseline → Missing cost → OK → No sales yet
    const ORDER: Record<CostAuditRiskStatus, number> = {
      "Needs baseline": 0,
      "Missing cost": 1,
      "OK": 2,
      "No sales yet": 3,
    };
    result.sort((a, b) => ORDER[a.riskStatus] - ORDER[b.riskStatus]);

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify(result, (_k, v) => (typeof v === "bigint" ? Number(v) : v))),
    });
  } catch (err) {
    next(err);
  }
});

// ── Return Events (read-only) ──────────────────────────────────────────────

router.get("/return-events", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    // ── filters ──────────────────────────────────────────────────────────
    const { period, from, to } = getPeriodQuery(req);
    const typeFilter = typeof req.query.type === "string" ? req.query.type : undefined;
    const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
    const orderIdFilter = typeof req.query.orderId === "string" ? req.query.orderId : undefined;
    const searchFilter = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : undefined;

    // ── fetch return events ────────────────────────────────────────────
    const conditions = [];
    if (period !== "custom" || (from && to)) {
      // Only apply date filter when a real period is requested
      // For "all" period we skip — periodRange would need a default
      if (period !== ("all" as AccountingPeriod)) {
        const { start, end } = periodRange(period, from, to);
        conditions.push(gte(orderReturnEvents.createdAt, start));
        conditions.push(lte(orderReturnEvents.createdAt, end));
      }
    }
    if (typeFilter) conditions.push(eq(orderReturnEvents.type, typeFilter));
    if (statusFilter) conditions.push(eq(orderReturnEvents.status, statusFilter));
    if (orderIdFilter) conditions.push(eq(orderReturnEvents.orderId, orderIdFilter));

    const events = await db
      .select()
      .from(orderReturnEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orderReturnEvents.createdAt));

    // ── enrich with order info ─────────────────────────────────────────
    const orderIds = [...new Set(events.map((e) => e.orderId))];
    const orderRows =
      orderIds.length > 0
        ? await db
            .select({
              id: orders.id,
              orderNumber: orders.orderNumber,
              status: orders.status,
              createdAt: orders.createdAt,
              roundedTotal: orders.roundedTotal,
              shippingCost: orders.shippingCost,
              boxCost: orders.boxCost,
            })
            .from(orders)
            .where(inArray(orders.id, orderIds))
        : [];

    const orderMap = new Map(orderRows.map((o) => [o.id, o]));

    // ── apply search (by order number) ─────────────────────────────────
    let enriched = events.map((e) => {
      const order = orderMap.get(e.orderId);
      return {
        id: e.id,
        orderId: e.orderId,
        orderNumber: order?.orderNumber ?? null,
        orderStatus: order?.status ?? null,
        orderCreatedAt: order?.createdAt ? toDate(order.createdAt).toISOString() : null,
        orderRoundedTotal: order?.roundedTotal != null ? toNumber(order.roundedTotal) : null,
        orderShippingCost: order?.shippingCost != null ? toNumber(order.shippingCost) : null,
        orderBoxCost: order?.boxCost != null ? toNumber(order.boxCost) : null,
        type: e.type,
        reason: e.reason,
        refundAmount: toNumber(e.refundAmount),
        deliveryCostLoss: toNumber(e.deliveryCostLoss),
        returnShippingCost: toNumber(e.returnShippingCost),
        packagingLoss: toNumber(e.packagingLoss),
        productWriteOffAmount: toNumber(e.productWriteOffAmount),
        cogsLoss: toNumber(e.cogsLoss),
        restocked: e.restocked ?? false,
        restockedAt: e.restockedAt ? toDate(e.restockedAt).toISOString() : null,
        affectedItems: e.affectedItems ?? null,
        status: e.status,
        note: e.note,
        createdBy: e.createdBy,
        createdAt: toDate(e.createdAt).toISOString(),
        updatedAt: toDate(e.updatedAt).toISOString(),
      };
    });

    if (searchFilter) {
      enriched = enriched.filter(
        (e) =>
          e.orderNumber?.toLowerCase().includes(searchFilter) ||
          e.orderId.toLowerCase().includes(searchFilter),
      );
    }

    // ── summary ────────────────────────────────────────────────────────
    // Only verified return events should affect accounting reports.
    const sumOf = (rows: typeof enriched, key: keyof (typeof enriched)[0]) =>
      rows.reduce((acc, e) => acc + (typeof e[key] === "number" ? (e[key] as number) : 0), 0);

    const financialImpactOf = (rows: typeof enriched) =>
      sumOf(rows, "refundAmount") +
      sumOf(rows, "deliveryCostLoss") +
      sumOf(rows, "returnShippingCost") +
      sumOf(rows, "packagingLoss") +
      sumOf(rows, "productWriteOffAmount") +
      sumOf(rows, "cogsLoss");

    const recordedEvents = enriched.filter((e) => e.status === "recorded");
    const verifiedEvents = enriched.filter((e) => e.status === "verified");
    const disputedEvents = enriched.filter((e) => e.status === "disputed");

    res.json({
      success: true,
      data: enriched,
      summary: {
        totalEvents: enriched.length,
        recordedEvents: recordedEvents.length,
        verifiedEvents: verifiedEvents.length,
        disputedEvents: disputedEvents.length,
        totalRefundAmount: sumOf(enriched, "refundAmount"),
        totalDeliveryCostLoss: sumOf(enriched, "deliveryCostLoss"),
        totalReturnShippingCost: sumOf(enriched, "returnShippingCost"),
        totalPackagingLoss: sumOf(enriched, "packagingLoss"),
        totalProductWriteOffAmount: sumOf(enriched, "productWriteOffAmount"),
        totalCogsLoss: sumOf(enriched, "cogsLoss"),
        totalFinancialImpactAll: financialImpactOf(enriched),
        totalFinancialImpactVerified: financialImpactOf(verifiedEvents),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/return-events/:id/status", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { id } = req.params as { id: string };
    const parsed = orderReturnEventStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "حالة غير صالحة", errors: parsed.error.flatten() });
      return;
    }

    const { status, note } = parsed.data;
    const updateValues: Record<string, unknown> = { status, updatedAt: new Date() };
    if (note !== undefined) updateValues.note = note;

    const [updated] = await db
      .update(orderReturnEvents)
      .set(updateValues)
      .where(eq(orderReturnEvents.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, message: "حدث الإرجاع غير موجود" });
      return;
    }

    res.json({
      success: true,
      data: {
        ...updated,
        refundAmount: toNumber(updated.refundAmount),
        deliveryCostLoss: toNumber(updated.deliveryCostLoss),
        returnShippingCost: toNumber(updated.returnShippingCost),
        packagingLoss: toNumber(updated.packagingLoss),
        productWriteOffAmount: toNumber(updated.productWriteOffAmount),
        cogsLoss: toNumber(updated.cogsLoss),
        createdAt: toDate(updated.createdAt).toISOString(),
        updatedAt: toDate(updated.updatedAt).toISOString(),
        restockedAt: updated.restockedAt ? toDate(updated.restockedAt).toISOString() : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/return-events/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { id } = req.params as { id: string };
    const [existing] = await db.select({ id: orderReturnEvents.id, status: orderReturnEvents.status })
      .from(orderReturnEvents).where(eq(orderReturnEvents.id, id));

    if (!existing) {
      res.status(404).json({ success: false, message: "حدث الإرجاع غير موجود" });
      return;
    }
    if (existing.status !== "disputed") {
      res.status(400).json({ success: false, message: "لا يمكن حذف التعديل إلا إذا كان مستبعداً — استخدم مسح التعديل أولاً" });
      return;
    }

    await db.delete(orderReturnEvents).where(eq(orderReturnEvents.id, id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/return-events", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const parsed = orderReturnEventInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات غير صالحة", errors: parsed.error.flatten() });
      return;
    }

    const {
      orderId, type, reason,
      refundAmount, deliveryCostLoss, returnShippingCost,
      packagingLoss, productWriteOffAmount, cogsLoss,
      restocked, affectedItems, note,
    } = parsed.data;

    // Accept either internal UUID or human-readable orderNumber (e.g. FH-260512-0001)
    let resolvedId: string = orderId;
    const [byUuid] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId));
    if (!byUuid) {
      const [byNum] = await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNumber, orderId));
      if (!byNum) {
        res.status(404).json({ success: false, message: "الطلب غير موجود — تأكد من رقم الطلب" });
        return;
      }
      resolvedId = byNum.id;
    }

    const createdBy = (req as Request & { user?: { id: string } }).user?.id ?? null;

    const [entry] = await db
      .insert(orderReturnEvents)
      .values({
        orderId: resolvedId,
        type,
        reason: reason ?? null,
        refundAmount: String(refundAmount ?? 0),
        deliveryCostLoss: String(deliveryCostLoss ?? 0),
        returnShippingCost: String(returnShippingCost ?? 0),
        packagingLoss: String(packagingLoss ?? 0),
        productWriteOffAmount: String(productWriteOffAmount ?? 0),
        cogsLoss: String(cogsLoss ?? 0),
        restocked: restocked ?? false,
        affectedItems: affectedItems ?? null,
        status: "recorded",
        note: note ?? null,
        createdBy,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: {
        ...entry,
        refundAmount: toNumber(entry.refundAmount),
        deliveryCostLoss: toNumber(entry.deliveryCostLoss),
        returnShippingCost: toNumber(entry.returnShippingCost),
        packagingLoss: toNumber(entry.packagingLoss),
        productWriteOffAmount: toNumber(entry.productWriteOffAmount),
        cogsLoss: toNumber(entry.cogsLoss),
        createdAt: toDate(entry.createdAt).toISOString(),
        updatedAt: toDate(entry.updatedAt).toISOString(),
        restockedAt: entry.restockedAt ? toDate(entry.restockedAt).toISOString() : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/report", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);

    // ── 1. Delivered orders + per-product profit ───────────────────────
    const realizedOrders = await getRealizedOrdersForPeriod(db, start, end);
    const costs = await buildCostResolver(db, collectProductIds(realizedOrders));

    let totalRevenue = 0, totalCogs = 0, totalPackaging = 0, missingCostLines = 0;
    const profitByProduct: Record<string, {
      name: string; unitsSold: number; revenue: number; cogs: number; packaging: number; netProfit: number;
    }> = {};

    for (const order of realizedOrders) {
      const profit = calcOrderProfit(order, costs);
      totalRevenue += profit.revenue;
      totalCogs += profit.cogs;
      totalPackaging += profit.packaging;
      missingCostLines += profit.missingCostLines;

      const items = getOrderItems(order);
      const subtotal = orderSubtotal(items);
      const createdAt = toDate(order.createdAt);
      const orderRevenue = orderCollectedAmount(order) - toNumber(order.shippingCost);
      const revenueRatio = subtotal > 0 ? orderRevenue / subtotal : 1;
      const boxCost = toNumber(order.boxCost);

      for (const item of items) {
        const productId = item.productId;
        if (!productId) continue;
        const qty = lineQuantity(item);
        const price = toNumber(item.priceAtPurchase);
        const lineGross = price * qty;
        const lineRevenue = lineGross * revenueRatio;
        const lineDeduct = subtotal > 0 ? boxCost * (lineGross / subtotal) : 0;
        const effectiveCost = costs.getEffective(productId, createdAt);
        const currentCost = costs.getCurrent(productId);
        if (!currentCost || !effectiveCost) continue;
        const lineCogs = effectiveCost.costPrice * qty;
        const linePack = (effectiveCost.packagingCost + effectiveCost.insertCost) * qty;
        const lineProfit = lineRevenue - lineCogs - linePack - lineDeduct;
        if (!profitByProduct[productId]) {
          profitByProduct[productId] = { name: currentCost.name, unitsSold: 0, revenue: 0, cogs: 0, packaging: 0, netProfit: 0 };
        }
        profitByProduct[productId].unitsSold += qty;
        profitByProduct[productId].revenue += lineRevenue;
        profitByProduct[productId].cogs += lineCogs;
        profitByProduct[productId].packaging += linePack;
        profitByProduct[productId].netProfit += lineProfit;
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
    const netProfitRaw = totalRevenue - totalCogs - totalPackaging;
    const costsComplete = missingCostLines === 0;
    const deliveredOrders = realizedOrders.length;
    const unitsSold = Object.values(profitByProduct).reduce((s, p) => s + p.unitsSold, 0);
    const averageOrderValue = deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0;

    // ── 2. Expenses ────────────────────────────────────────────────────
    const expenseRows = await db
      .select()
      .from(expenses)
      .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end)));

    const expensesTotal = expenseRows.reduce((sum, e) => sum + toNumber(e.amount), 0);
    const expenseCategoryMap: Record<string, number> = {};
    for (const e of expenseRows) {
      expenseCategoryMap[e.category] = (expenseCategoryMap[e.category] ?? 0) + toNumber(e.amount);
    }
    const expensesByCategory = Object.entries(expenseCategoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    // ── 3. Return events ───────────────────────────────────────────────
    const returnEventsInPeriod = await db
      .select()
      .from(orderReturnEvents)
      .where(and(gte(orderReturnEvents.createdAt, start), lte(orderReturnEvents.createdAt, end)));

    const verifiedReturnRows = returnEventsInPeriod.filter((e) => e.status === "verified");
    const recordedReturnRows = returnEventsInPeriod.filter((e) => e.status === "recorded");

    const sumRet = (key: keyof typeof verifiedReturnRows[0]) =>
      verifiedReturnRows.reduce((s, e) => s + toNumber(e[key]), 0);

    const totalReturnFinancialImpact =
      sumRet("refundAmount") + sumRet("deliveryCostLoss") + sumRet("returnShippingCost") +
      sumRet("packagingLoss") + sumRet("productWriteOffAmount") + sumRet("cogsLoss");

    const netProfitBeforeReturns = netProfitRaw;
    const netProfitAfterReturns = netProfitRaw - totalReturnFinancialImpact;
    const finalNetProfit = netProfitAfterReturns - expensesTotal;
    const marginAfterReturns = totalRevenue > 0 ? Math.round((netProfitAfterReturns / totalRevenue) * 100) : 0;
    const marginAfterExpenses = totalRevenue > 0 ? Math.round((finalNetProfit / totalRevenue) * 100) : 0;

    // Enrich verified events with order numbers
    const retOrderIds = [...new Set(verifiedReturnRows.map((e) => e.orderId))];
    const retOrderRows = retOrderIds.length > 0
      ? await db.select({ id: orders.id, orderNumber: orders.orderNumber })
          .from(orders).where(inArray(orders.id, retOrderIds))
      : [];
    const retOrderMap = new Map(retOrderRows.map((o) => [o.id, o.orderNumber ?? null]));

    // ── 4. Top products ────────────────────────────────────────────────
    const productEntries = Object.entries(profitByProduct).map(([productId, p]) => {
      const rev = Math.round(p.revenue);
      const gp = Math.round(p.revenue - p.cogs);
      return {
        productId,
        name: p.name,
        unitsSold: p.unitsSold,
        revenue: rev,
        grossProfit: gp,
        grossMargin: rev > 0 ? Math.round((gp / rev) * 100) : 0,
        netProfit: Math.round(p.netProfit),
        margin: rev > 0 ? Math.round((p.netProfit / rev) * 100) : 0,
      };
    });

    const topByRevenue = [...productEntries].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const topByGrossProfit = [...productEntries].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5);
    const weakMarginProducts = [...productEntries]
      .filter((p) => p.revenue > 0)
      .sort((a, b) => a.grossMargin - b.grossMargin)
      .slice(0, 5);

    // Returned products (from affectedItems JSONB)
    const returnedProductMap: Record<string, { name: string; returnedQty: number; returnFinancialImpact: number; unitsSold: number }> = {};
    for (const evt of verifiedReturnRows) {
      const items = Array.isArray(evt.affectedItems)
        ? (evt.affectedItems as Array<{ productId: string; qty: number; priceAtPurchase: number; cogsAtTime: number }>)
        : [];
      for (const item of items) {
        const sold = profitByProduct[item.productId];
        if (!returnedProductMap[item.productId]) {
          returnedProductMap[item.productId] = { name: sold?.name ?? item.productId, returnedQty: 0, returnFinancialImpact: 0, unitsSold: sold?.unitsSold ?? 0 };
        }
        returnedProductMap[item.productId].returnedQty += item.qty;
        returnedProductMap[item.productId].returnFinancialImpact += item.qty * (item.priceAtPurchase + item.cogsAtTime);
      }
    }
    const returnedProducts = Object.entries(returnedProductMap).map(([productId, p]) => ({
      productId,
      name: p.name,
      returnedQty: p.returnedQty,
      returnFinancialImpact: Math.round(p.returnFinancialImpact),
      unitsSold: p.unitsSold,
      returnRate: p.unitsSold > 0 ? Math.round((p.returnedQty / p.unitsSold) * 100) : 0,
    }));

    // ── 5. Inventory + Low stock ────────────────────────────────────────
    const activeProducts = await db.select().from(products).where(isNull(products.deletedAt));

    let inventoryValueAtCost = 0, potentialRevenueFromStock = 0, potentialGrossProfitFromStock = 0;
    let lowStockCount = 0, outOfStockCount = 0, comingSoonCount = 0;
    const lowStockList: Array<{ productId: string; name: string; stock: number; salePrice: number; status: string }> = [];

    for (const p of activeProducts) {
      const salePrice = toNumber(p.price);
      const costPrice = toNumber(p.costPrice);
      const stock = Number(p.stock ?? 0);
      const threshold = Number(p.lowStockThreshold ?? 10);
      if (salePrice <= 0) { comingSoonCount++; continue; }
      if (stock === 0) {
        outOfStockCount++;
        lowStockList.push({ productId: p.id, name: p.name, stock, salePrice, status: "نفد" });
      } else if (stock <= threshold) {
        lowStockCount++;
        lowStockList.push({ productId: p.id, name: p.name, stock, salePrice, status: "منخفض" });
      }
      if (costPrice > 0) inventoryValueAtCost += costPrice * stock;
      potentialRevenueFromStock += salePrice * stock;
      if (costPrice > 0) potentialGrossProfitFromStock += (salePrice - costPrice) * stock;
    }

    const lowStockProducts = lowStockList.sort((a, b) => a.stock - b.stock).slice(0, 10);

    // ── 6. Warnings ────────────────────────────────────────────────────
    const notes: Array<{ type: "warning" | "info"; message: string }> = [];
    if (!costsComplete) {
      notes.push({ type: "warning", message: `${missingCostLines} سطر منتج بدون كلفة — أرقام الربح غير دقيقة` });
    }
    if (recordedReturnRows.length > 0) {
      notes.push({ type: "warning", message: `${recordedReturnRows.length} راجع مسجّل غير معتمد — لا يدخل في الأرقام` });
    }
    if (expenseRows.length === 0) {
      notes.push({ type: "warning", message: "لا مصاريف مسجّلة لهذه الفترة — صافي الربح النهائي قد يبدو أعلى مما هو فعلياً" });
    }

    res.json({
      success: true,
      data: JSON.parse(JSON.stringify({
        summary: {
          period,
          revenue: Math.round(totalRevenue),
          deliveredOrders,
          unitsSold,
          totalCogs: Math.round(totalCogs),
          totalPackaging: Math.round(totalPackaging),
          grossProfit: Math.round(grossProfit),
          grossMargin,
          expensesTotal: Math.round(expensesTotal),
          returnLossVerified: Math.round(totalReturnFinancialImpact),
          netProfitBeforeReturns: Math.round(netProfitBeforeReturns),
          netProfitAfterReturns: Math.round(netProfitAfterReturns),
          finalNetProfit: Math.round(finalNetProfit),
          marginAfterReturns,
          marginAfterExpenses,
          averageOrderValue,
          costsComplete,
          missingCostLines,
        },
        returns: {
          verifiedReturnEvents: verifiedReturnRows.length,
          recordedReturnEvents: recordedReturnRows.length,
          refundAmount: Math.round(sumRet("refundAmount")),
          deliveryCostLoss: Math.round(sumRet("deliveryCostLoss")),
          returnShippingCost: Math.round(sumRet("returnShippingCost")),
          packagingLoss: Math.round(sumRet("packagingLoss")),
          productWriteOffAmount: Math.round(sumRet("productWriteOffAmount")),
          cogsLoss: Math.round(sumRet("cogsLoss")),
          totalReturnFinancialImpact: Math.round(totalReturnFinancialImpact),
          events: verifiedReturnRows.map((e) => ({
            id: e.id,
            orderId: e.orderId,
            orderNumber: retOrderMap.get(e.orderId) ?? null,
            type: e.type,
            refundAmount: toNumber(e.refundAmount),
            deliveryCostLoss: toNumber(e.deliveryCostLoss),
            returnShippingCost: toNumber(e.returnShippingCost),
            packagingLoss: toNumber(e.packagingLoss),
            productWriteOffAmount: toNumber(e.productWriteOffAmount),
            cogsLoss: toNumber(e.cogsLoss),
            totalImpact:
              toNumber(e.refundAmount) + toNumber(e.deliveryCostLoss) + toNumber(e.returnShippingCost) +
              toNumber(e.packagingLoss) + toNumber(e.productWriteOffAmount) + toNumber(e.cogsLoss),
            reason: e.reason ?? null,
            note: e.note ?? null,
            status: e.status,
            createdAt: toDate(e.createdAt).toISOString(),
          })),
        },
        expenses: {
          total: Math.round(expensesTotal),
          byCategory: expensesByCategory,
        },
        topProducts: {
          topByRevenue,
          topByGrossProfit,
          weakMarginProducts,
          returnedProducts,
          lowStockProducts,
        },
        inventory: {
          inventoryValueAtCost: Math.round(inventoryValueAtCost),
          potentialRevenueFromStock: Math.round(potentialRevenueFromStock),
          potentialGrossProfitFromStock: Math.round(potentialGrossProfitFromStock),
          lowStockCount,
          outOfStockCount,
          comingSoonCount,
        },
        notes,
        generatedAt: new Date().toISOString(),
      }, (_k, v) => (typeof v === "bigint" ? Number(v) : v))),
    });
  } catch (err) {
    next(err);
  }
});

export function createAccountingRouter() {
  return router;
}
