import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { orders, products, shippingSettlements, productCostHistory, orderReturnEvents, expenses, manualInvoices, accountingManualAdjustments, accountingPeriodCloses } from "../../shared/schema.js";
import { and, gte, lte, inArray, eq, desc, isNull } from "drizzle-orm";
import {
  accountingCostHistoryInputSchema,
  accountingCostInputSchema,
  accountingCostUpdateSchema,
  accountingPeriodSchema,
  accountingSettlementInputSchema,
  orderReturnEventInputSchema,
  orderReturnEventStatusUpdateSchema,
  manualAdjustmentCreateSchema,
  reviewFlagStatusUpdateSchema,
  type AccountingInventory,
  type AccountingPeriod,
  type CostAuditRiskStatus,
} from "../../shared/accounting.js";
import {
  createAdjustment,
  approveAdjustment,
  rejectAdjustment,
  listAdjustments,
  listReviewFlags,
  updateReviewFlagStatus,
} from "../services/accountingManualOverrides.js";
import {
  recordFinancialChange,
  listFinancialAuditTrail,
  actorFromRequest,
  type FinancialEntityType,
} from "../services/accountingAuditTrail.js";
// Canonical order-financial definitions — single source of truth (Stage A).
import {
  toMoney as toNumber,
  orderCollectedAmount,
  REALIZED_STATUSES,
  CANCELLED_STATUSES,
  IN_PROGRESS_STATUSES,
} from "../../shared/order-financials.js";
// Canonical financial calculation engine — the single source of truth for all
// profit/cost/ledger formulas. Extracted from this file so other modules can
// import the same engine instead of reimplementing the math.
import {
  lineCostSnapshot,
  toDate,
  eventSalesReturnDeduction,
  eventActualReturnLoss,
  periodRange,
  getOrderItems,
  lineQuantity,
  orderSubtotal,
  buildCostResolver,
  collectProductIds,
  getOrdersForPeriod,
  buildWhatsappInvoiceBreakdown,
  getRealizedOrdersForPeriod,
  calcOrderProfit,
  computePeriodFinancials,
  monthKeyToRange,
  serializeCostHistory,
  buildLedger,
  type Db,
  type OrderRow,
  type ProductProfit,
} from "../services/accounting-engine.js";

// Re-exported so existing consumers (e.g. cost-snapshot.test.ts) that import
// `lineCostSnapshot` from this route module keep working after the extraction.
export { lineCostSnapshot };

const router = Router();
router.use(requireAdmin);


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


function getPeriodQuery(req: Request): { period: AccountingPeriod; from?: string; to?: string } {
  const rawPeriod = typeof req.query.period === "string" ? req.query.period : "month";
  const parsedPeriod = accountingPeriodSchema.safeParse(rawPeriod);
  const period = parsedPeriod.success ? parsedPeriod.data : "month";
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  return { period, from, to };
}


router.get("/summary", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);
    const allOrders = await getOrdersForPeriod(db, start, end);
    const realizedOrders = allOrders.filter((o) => {
      const fc = (o as any).financiallyCounted;
      if (fc === false) return false;
      if (fc === true) return true;
      return REALIZED_STATUSES.includes(o.status as (typeof REALIZED_STATUSES)[number]);
    });

    // Collect product IDs from WhatsApp invoices too so one resolver covers all
    const waItemsForCost = await db
      .select({ items: manualInvoices.items })
      .from(manualInvoices)
      .where(and(gte(manualInvoices.createdAt, start), lte(manualInvoices.createdAt, end)));
    const mergedProductIds = collectProductIds(realizedOrders);
    for (const inv of waItemsForCost) {
      for (const item of (Array.isArray(inv.items) ? (inv.items as Array<{ productId?: string }>) : [])) {
        if (item.productId) mergedProductIds.add(item.productId);
      }
    }
    const costs = await buildCostResolver(db, mergedProductIds);

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

    // ── WhatsApp invoice breakdown ──────────────────────────────────────
    const whatsappOrders = allOrders.filter((o) => o.source === "whatsapp");
    const whatsappOrdersCount = whatsappOrders.length;
    const websiteOrdersCount = allOrders.length - whatsappOrdersCount;
    const waBreakdown = await buildWhatsappInvoiceBreakdown(db, start, end, costs);

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

    const realizedOrderIds = new Set(realizedOrders.map((o) => o.id));
    const totalSalesReturnDeduction = verifiedReturnRows
      .filter((e) => realizedOrderIds.has(e.orderId))
      .reduce((s, e) => s + eventSalesReturnDeduction(e), 0);
    const totalActualReturnLoss = verifiedReturnRows.reduce((s, e) => s + eventActualReturnLoss(e), 0);
    const sellableReturnedCount = verifiedReturnRows.filter((e) => e.restocked === true).length;
    const nonSellableReturnedCount = verifiedReturnRows.filter((e) => e.restocked !== true).length;

    const netProfitBeforeReturns = netProfit;
    // netProfitAfterReturns = netProfit - salesReturnDeduction(revenue reversal) - actualReturnLoss(operational)
    const netProfitAfterReturns = netProfit - totalSalesReturnDeduction - totalActualReturnLoss;
    const marginBeforeReturns = margin;
    const marginAfterReturns = totalRevenue > 0 ? Math.round((netProfitAfterReturns / totalRevenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        period,
        totalOrders: allOrders.length,
        websiteOrdersCount,
        whatsappOrdersCount,
        whatsappInvoices: waBreakdown.summary,
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
        // ── Return breakdown (split model) ──
        salesReturnDeduction: totalSalesReturnDeduction,  // revenue reversal
        actualReturnLoss: totalActualReturnLoss,           // operational + non-recoverable only
        totalReturnFinancialImpact: totalSalesReturnDeduction + totalActualReturnLoss,
        sellableReturnedCount,
        nonSellableReturnedCount,
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
        const currentCostResolved = costs.getCurrent(product.id);
        const costPrice = currentCostResolved?.costPrice ?? toNumber(product.costPrice);
        const packagingCost = currentCostResolved?.packagingCost ?? toNumber(product.packagingCost);
        const insertCost = currentCostResolved?.insertCost ?? toNumber(product.insertCost);
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
          overridden: currentCostResolved?.overridden ?? false,
          overrideReason: currentCostResolved?.overrideReason ?? null,
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

    // ── رصيد شركة التوصيل ──────────────────────────────────────────────────
    // المقبوض من الزبائن (إجمالي) — قبل خصم أي أجور.
    const grossCustomerCollections = deliveredOrders.reduce(
      (sum, order) => sum + orderCollectedAmount(order),
      0,
    );
    // أجور شركة التوصيل — الشركة تأخذها لنفسها، فهي ليست مبلغاً باقياً عندها.
    const carrierFees = deliveredOrders.reduce(
      (sum, order) => sum + toNumber(order.shippingCost),
      0,
    );
    // الصافي المستلم فعلاً = مجموع التسويات المسجّلة.
    const netCashReceived = totalReceived;
    const documentedAdjustments = approvedReturnDeductions;
    // الباقي عند الشركة. لا يُقصّ إلى صفر: أي نقص حقيقي في التسويات المسجّلة
    // يجب أن يظهر بدل أن يُخفى.
    const carrierOutstanding =
      grossCustomerCollections - carrierFees - netCashReceived - documentedAdjustments;
    const totalPending = carrierOutstanding;

    res.json({
      success: true,
      data: {
        totalCod,
        totalDelivered,
        totalInTransit,
        totalReceived,
        approvedReturnDeductions,
        totalPending,
        // الأرقام الأربعة المعروضة في اللوحة — كل واحد مشتق من قاعدة البيانات.
        carrierBalance: {
          grossCustomerCollections,
          carrierFees,
          netCashReceived,
          documentedAdjustments,
          outstanding: carrierOutstanding,
          fullySettled: carrierOutstanding === 0,
        },
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

// تدقيق مبيعات منتج — يبيّن كل طلب، سبب الاحتساب/الاستبعاد، grossQty و netQty بعد الراجعات
router.get("/product-sales-drill/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { productId } = req.params as { productId: string };
    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);

    // جلب جميع الطلبات بالفترة (بدون فلتر الحالة) لعرض المستبعدة أيضاً
    const allOrdersInPeriod = await getOrdersForPeriod(db, start, end);

    // الطلبات الراجعة (verified) لهذا المنتج
    const verifiedReturnsForProduct = await db
      .select()
      .from(orderReturnEvents)
      .where(and(eq(orderReturnEvents.status, "verified")));

    let returnedNetQty = 0;
    for (const evt of verifiedReturnsForProduct) {
      const items = Array.isArray(evt.affectedItems)
        ? (evt.affectedItems as Array<{ productId: string; qty: number }>)
        : [];
      for (const item of items) {
        if (item.productId === productId) returnedNetQty += item.qty;
      }
    }

    type OrderLine = {
      orderId: string;
      orderNumber: string | null;
      orderStatus: string | null;
      orderSource: string | null;
      orderCreatedAt: string;
      qty: number;
      priceAtPurchase: number;
      variantId: string | null;
      variantLabel: string | null;
      counted: boolean;
      exclusionReason: string | null;
    };

    const lines: OrderLine[] = [];
    let grossQty = 0;

    for (const order of allOrdersInPeriod) {
      const items = getOrderItems(order);
      for (const item of items) {
        if (item.productId !== productId) continue;
        const qty = lineQuantity(item);
        if (qty <= 0) continue;

        const isDelivered = REALIZED_STATUSES.includes(order.status as (typeof REALIZED_STATUSES)[number]);
        const isWhatsapp = (order as any).source === "whatsapp";

        let counted = isDelivered;
        let exclusionReason: string | null = null;

        if (!isDelivered) {
          if (["pending", "processing", "shipped", "in_transit"].includes(order.status ?? "")) {
            exclusionReason = "الطلب لم يُسلَّم بعد — لا يُحتسب حتى يصبح delivered";
          } else if (isWhatsapp && !isDelivered) {
            exclusionReason = "فاتورة واتساب غير موصلة — لا تُحتسب مالياً";
          } else {
            exclusionReason = `حالة "${order.status}" لا تُحتسب — فقط delivered`;
          }
        }

        if (counted) grossQty += qty;

        lines.push({
          orderId: order.id,
          orderNumber: (order as any).orderNumber ?? null,
          orderStatus: order.status,
          orderSource: (order as any).source ?? null,
          orderCreatedAt: toDate(order.createdAt).toISOString(),
          qty,
          priceAtPurchase: toNumber(item.priceAtPurchase),
          variantId: item.variantId ?? null,
          variantLabel: item.variantLabel ?? null,
          counted,
          exclusionReason,
        });
      }
    }

    const netQty = Math.max(0, grossQty - returnedNetQty);

    // تجميع حسب الـ variant لعرض تفصيل الأنواع/الأحجام
    const variantMap: Record<string, { variantId: string | null; variantLabel: string | null; grossQty: number; revenue: number }> = {};
    for (const line of lines) {
      if (!line.counted) continue;
      const key = line.variantId ?? "__none__";
      if (!variantMap[key]) {
        variantMap[key] = { variantId: line.variantId, variantLabel: line.variantLabel, grossQty: 0, revenue: 0 };
      }
      variantMap[key].grossQty += line.qty;
      variantMap[key].revenue += line.qty * line.priceAtPurchase;
    }
    const variantBreakdown = Object.values(variantMap).sort((a, b) => b.grossQty - a.grossQty);

    res.json({
      success: true,
      data: {
        productId,
        period,
        grossSoldQty: grossQty,
        verifiedReturnedQty: returnedNetQty,
        netSoldQty: netQty,
        totalLinesInPeriod: lines.length,
        variantBreakdown,
        orders: lines.sort((a, b) => (b.counted ? 1 : 0) - (a.counted ? 1 : 0)),
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

    // المصدر 2: طلبات رجعت فعلياً بدون حدث إرجاع معتمد مسجّل لها
    // rejected/rejected_carrier = رُفض عند التسليم أو من الناقل — المنتج رجع فعلياً
    const ordersWithVerifiedEvent = new Set(verifiedEvents.map((e) => e.orderId));
    const ITEM_RETURN_STATUSES = ["returned", "refunded", "rejected_returned", "rejected", "rejected_carrier"];
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
    const actor = actorFromRequest(req);
    const coveredOrderIds = Array.isArray(orderIds) && orderIds.length > 0 ? orderIds : null;
    const [settlement] = await db
      .insert(shippingSettlements)
      .values({ carrier, amount: String(amount), notes: notes ?? null, coveredOrderIds })
      .returning();

    if (Array.isArray(orderIds) && orderIds.length > 0) {
      await db.update(orders).set({ codReceived: true }).where(inArray(orders.id, orderIds));
    }

    // Audit: settlements move real cash — record who entered what and which orders it covers.
    await recordFinancialChange(db, {
      entityType: "settlement",
      entityId: settlement.id,
      action: "create",
      fieldName: "amount",
      oldValue: null,
      newValue: { carrier, amount, notes: notes ?? null, orderIds: orderIds ?? [] },
      reason: notes ?? null,
      performedBy: actor.id,
      performedByName: actor.name,
    });

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
    const parsed = z
      .object({ boxCost: z.coerce.number().min(0), reason: z.string().trim().min(3).max(500) })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "قيمة الكارتونة أو سبب التعديل غير صالح (السبب مطلوب)" });
      return;
    }

    // Read old value first so we can log before→after.
    const [existing] = await db
      .select({ boxCost: orders.boxCost })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ success: false, message: "الطلبية غير موجودة" });
      return;
    }

    const oldBoxCost = toNumber(existing.boxCost);
    const newBoxCost = parsed.data.boxCost;
    const actor = actorFromRequest(req);

    // Update + audit log atomically — both succeed or both roll back.
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ boxCost: String(newBoxCost), updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await recordFinancialChange(tx, {
        entityType: "order",
        entityId: orderId,
        action: "update",
        fieldName: "boxCost",
        oldValue: oldBoxCost,
        newValue: newBoxCost,
        reason: parsed.data.reason,
        performedBy: actor.id,
        performedByName: actor.name,
      });
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /audit-trail — the immutable financial change log (who changed what, when, why)
router.get("/audit-trail", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const entityTypeRaw = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const validTypes: FinancialEntityType[] = ["order", "expense", "settlement", "return_event", "manual_invoice", "product_cost"];
    const entityType = validTypes.includes(entityTypeRaw as FinancialEntityType)
      ? (entityTypeRaw as FinancialEntityType)
      : undefined;
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

    const trail = await listFinancialAuditTrail(db, {
      entityType,
      entityId,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    res.json({ success: true, data: trail });
  } catch (err) {
    next(err);
  }
});

// GET /report-timeseries — bucketed revenue / cogs / profit / expenses over the period (for charts)
router.get("/report-timeseries", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);

    // Granularity: yearly view → monthly buckets; everything else → daily buckets.
    const granularity: "day" | "month" = period === "year" ? "month" : "day";
    const bucketKey = (d: Date): string =>
      granularity === "month"
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // Pre-build empty buckets so the chart has a continuous x-axis (no gaps).
    const buckets = new Map<string, { date: string; revenue: number; cogs: number; profit: number; expenses: number }>();
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = bucketKey(cursor);
      if (!buckets.has(key)) buckets.set(key, { date: key, revenue: 0, cogs: 0, profit: 0, expenses: 0 });
      if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }

    // Realized orders → revenue / cogs / profit per bucket
    const realizedOrders = await getRealizedOrdersForPeriod(db, start, end);
    const costs = await buildCostResolver(db, collectProductIds(realizedOrders));
    for (const order of realizedOrders) {
      const p = calcOrderProfit(order, costs);
      const b = buckets.get(bucketKey(toDate(order.createdAt)));
      if (!b) continue;
      b.revenue += p.revenue;
      b.cogs += p.cogs;
      b.profit += p.netProfit;
    }

    // Expenses per bucket (exclude soft-deleted)
    const expenseRows = await db
      .select()
      .from(expenses)
      .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end), isNull(expenses.deletedAt)));
    for (const e of expenseRows) {
      const b = buckets.get(bucketKey(toDate(e.expenseDate)));
      if (!b) continue;
      b.expenses += toNumber(e.amount);
    }

    const series = Array.from(buckets.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((b) => ({
        date: b.date,
        revenue: Math.round(b.revenue),
        cogs: Math.round(b.cogs),
        grossProfit: Math.round(b.profit),
        expenses: Math.round(b.expenses),
        netProfit: Math.round(b.profit - b.expenses),
      }));

    res.json({ success: true, data: { granularity, series } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════ Period Close + Reconciliation ═══════════════════════════

// GET /periods — list closed periods, each with live drift vs its frozen snapshot
router.get("/periods", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const rows = await db
      .select()
      .from(accountingPeriodCloses)
      .orderBy(desc(accountingPeriodCloses.periodKey));

    const result = [];
    for (const row of rows) {
      // Recompute fresh and compare against the frozen figures → drift.
      const live = await computePeriodFinancials(db, toDate(row.periodStart), toDate(row.periodEnd));
      const frozenNet = toNumber(row.finalNetProfit);
      const frozenRev = toNumber(row.revenue);
      const netDrift = live.finalNetProfit - frozenNet;
      const revDrift = live.revenue - frozenRev;
      result.push({
        id: row.id,
        periodKey: row.periodKey,
        status: row.status,
        closedAt: toDate(row.closedAt).toISOString(),
        closedByName: row.closedByName ?? row.closedBy ?? null,
        reopenedReason: row.reopenedReason ?? null,
        frozen: {
          revenue: frozenRev,
          grossProfit: toNumber(row.grossProfit),
          expensesTotal: toNumber(row.expensesTotal),
          finalNetProfit: frozenNet,
          deliveredOrders: row.deliveredOrders,
        },
        live: {
          revenue: live.revenue,
          grossProfit: live.grossProfit,
          expensesTotal: live.expensesTotal,
          finalNetProfit: live.finalNetProfit,
          deliveredOrders: live.deliveredOrders,
        },
        drift: { revenue: revDrift, finalNetProfit: netDrift },
        hasDrift: revDrift !== 0 || netDrift !== 0,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /periods/close — freeze a month's financials into an immutable snapshot
router.post("/periods/close", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const parsed = z.object({ periodKey: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "صيغة الفترة غير صالحة (المتوقع YYYY-MM)" });
      return;
    }
    const { periodKey } = parsed.data;
    const range = monthKeyToRange(periodKey);
    if (!range) {
      res.status(400).json({ success: false, message: "فترة غير صالحة" });
      return;
    }

    // Cannot close a period that hasn't ended yet.
    if (range.end > new Date()) {
      res.status(400).json({ success: false, message: "لا يمكن إغلاق فترة لم تنتهِ بعد" });
      return;
    }

    const existing = await db
      .select({ id: accountingPeriodCloses.id, status: accountingPeriodCloses.status })
      .from(accountingPeriodCloses)
      .where(eq(accountingPeriodCloses.periodKey, periodKey))
      .limit(1);
    if (existing.length > 0 && existing[0].status === "closed") {
      res.status(409).json({ success: false, message: "هذه الفترة مغلقة بالفعل" });
      return;
    }

    const fin = await computePeriodFinancials(db, range.start, range.end);
    const actor = actorFromRequest(req);

    const values = {
      periodKey,
      periodStart: range.start,
      periodEnd: range.end,
      revenue: String(fin.revenue),
      cogs: String(fin.cogs),
      grossProfit: String(fin.grossProfit),
      expensesTotal: String(fin.expensesTotal),
      salesReturnDeduction: String(fin.salesReturnDeduction),
      actualReturnLoss: String(fin.actualReturnLoss),
      finalNetProfit: String(fin.finalNetProfit),
      deliveredOrders: fin.deliveredOrders,
      snapshotJson: fin as unknown as object,
      status: "closed",
      closedBy: actor.id,
      closedByName: actor.name,
      closedAt: new Date(),
      reopenedBy: null,
      reopenedReason: null,
      reopenedAt: null,
    };

    if (existing.length > 0) {
      // Re-closing a previously reopened period: overwrite the snapshot.
      await db.update(accountingPeriodCloses).set(values).where(eq(accountingPeriodCloses.periodKey, periodKey));
    } else {
      await db.insert(accountingPeriodCloses).values(values);
    }

    res.status(201).json({ success: true, data: { periodKey, ...fin } });
  } catch (err) {
    next(err);
  }
});

// POST /periods/:periodKey/reopen — reopen a closed period (requires reason)
router.post("/periods/:periodKey/reopen", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { periodKey } = req.params as { periodKey: string };
    const parsed = z.object({ reason: z.string().trim().min(3).max(500) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "سبب إعادة الفتح مطلوب" });
      return;
    }

    const actor = actorFromRequest(req);
    const [updated] = await db
      .update(accountingPeriodCloses)
      .set({
        status: "reopened",
        reopenedBy: actor.id,
        reopenedReason: parsed.data.reason,
        reopenedAt: new Date(),
      })
      .where(eq(accountingPeriodCloses.periodKey, periodKey))
      .returning({ id: accountingPeriodCloses.id });

    if (!updated) {
      res.status(404).json({ success: false, message: "الفترة غير موجودة" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /ledger — double-entry trial balance + income statement (derived, period-scoped)
router.get("/ledger", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);
    const ledger = await buildLedger(db, start, end);

    res.json({ success: true, data: { period, ...ledger } });
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

    // Capture old status — "verified" is the only status that hits P&L, so transitions matter.
    const [before] = await db
      .select({ status: orderReturnEvents.status })
      .from(orderReturnEvents)
      .where(eq(orderReturnEvents.id, id))
      .limit(1);

    if (!before) {
      res.status(404).json({ success: false, message: "حدث الإرجاع غير موجود" });
      return;
    }

    const updateValues: Record<string, unknown> = { status, updatedAt: new Date() };
    if (note !== undefined) updateValues.note = note;

    const actor = actorFromRequest(req);
    const [updated] = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(orderReturnEvents)
        .set(updateValues)
        .where(eq(orderReturnEvents.id, id))
        .returning();

      await recordFinancialChange(tx, {
        entityType: "return_event",
        entityId: id,
        action: "status_change",
        fieldName: "status",
        oldValue: before.status,
        newValue: status,
        reason: note ?? null,
        performedBy: actor.id,
        performedByName: actor.name,
      });

      return [row];
    });

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
      .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end), isNull(expenses.deletedAt)));

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

    const realizedOrderIds = new Set(realizedOrders.map((o) => o.id));
    const totalSalesReturnDeduction = verifiedReturnRows
      .filter((e) => realizedOrderIds.has(e.orderId))
      .reduce((s, e) => s + eventSalesReturnDeduction(e), 0);
    const totalActualReturnLoss = verifiedReturnRows.reduce((s, e) => s + eventActualReturnLoss(e), 0);
    const sellableReturnedCount = verifiedReturnRows.filter((e) => e.restocked === true).length;
    const nonSellableReturnedCount = verifiedReturnRows.filter((e) => e.restocked !== true).length;

    const netProfitBeforeReturns = netProfitRaw;
    const netProfitAfterReturns = netProfitRaw - totalSalesReturnDeduction - totalActualReturnLoss;
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
      const packagingCost = toNumber(p.packagingCost);
      const insertCost = toNumber(p.insertCost);
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
      if (costPrice > 0) potentialGrossProfitFromStock += (salePrice - costPrice - packagingCost - insertCost) * stock;
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
          // ── Return breakdown (split model) ──
          salesReturnDeduction: Math.round(totalSalesReturnDeduction),  // revenue reversal
          actualReturnLoss: Math.round(totalActualReturnLoss),           // operational losses only
          returnLossVerified: Math.round(totalActualReturnLoss),         // kept for Groq audit compat
          sellableReturnedCount,
          nonSellableReturnedCount,
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
          salesReturnDeduction: Math.round(totalSalesReturnDeduction),
          actualReturnLoss: Math.round(totalActualReturnLoss),
          totalReturnFinancialImpact: Math.round(totalSalesReturnDeduction + totalActualReturnLoss),
          sellableReturnedCount,
          nonSellableReturnedCount,
          refundAmount: Math.round(totalSalesReturnDeduction),
          deliveryCostLoss: Math.round(sumRet("deliveryCostLoss")),
          returnShippingCost: Math.round(sumRet("returnShippingCost")),
          packagingLoss: Math.round(sumRet("packagingLoss")),
          productWriteOffAmount: Math.round(sumRet("productWriteOffAmount")),
          cogsLoss: Math.round(sumRet("cogsLoss")),
          events: verifiedReturnRows.map((e) => {
            const isSellable = e.restocked === true;
            const hasIgnoredCogs = isSellable && toNumber(e.cogsLoss) > 0;
            const evtActualLoss = eventActualReturnLoss(e);
            const evtDeduction = eventSalesReturnDeduction(e);
            const productCost = isSellable ? 0 : toNumber(e.cogsLoss);
            const warnings: string[] = [];
            if (hasIgnoredCogs) {
              warnings.push("تم تجاهل كلفة المنتج كخسارة لأن المنتج راجع قابل للبيع.");
            }
            if (evtDeduction > 0 && isSellable) {
              warnings.push("هذا خصم تسوية وليس خسارة منتج، لأن المنتج راجع قابل للبيع.");
            }
            if (!isSellable && toNumber(e.cogsLoss) > 0) {
              warnings.push("تم احتساب كلفة المنتج كخسارة لأنه غير قابل للبيع / تالف.");
            }
            if (e.restocked === false && e.type !== "damaged_return" && toNumber(e.productWriteOffAmount) === 0 && toNumber(e.cogsLoss) === 0) {
              warnings.push("المنتج راجع لكن لم يتم تأكيد رجوعه للمخزون.");
            }
            return {
              id: e.id,
              orderId: e.orderId,
              orderNumber: retOrderMap.get(e.orderId) ?? null,
              type: e.type,
              restocked: e.restocked ?? false,
              isProductLoss: !isSellable,
              refundAmount: evtDeduction,
              settlementDeduction: evtDeduction,
              deliveryCostLoss: toNumber(e.deliveryCostLoss),
              returnShippingCost: toNumber(e.returnShippingCost),
              packagingLoss: toNumber(e.packagingLoss),
              productWriteOffAmount: toNumber(e.productWriteOffAmount),
              cogsLoss: toNumber(e.cogsLoss),
              productCostCounted: productCost,
              actualReturnLoss: evtActualLoss,
              reason: e.reason ?? null,
              note: e.note ?? null,
              status: e.status,
              createdAt: toDate(e.createdAt).toISOString(),
              warnings,
            };
          }),
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

// فواتير واتساب — تفاصيل كاملة مع سبب الإدراج/الاستبعاد
router.get("/whatsapp-invoices", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getAccountingDb(res);
    if (!db) return;

    const { period, from, to } = getPeriodQuery(req);
    const { start, end } = periodRange(period, from, to);

    // Build cost resolver scoped to WhatsApp invoice products
    const waItemRows = await db
      .select({ items: manualInvoices.items })
      .from(manualInvoices)
      .where(and(gte(manualInvoices.createdAt, start), lte(manualInvoices.createdAt, end)));

    const waProductIds = new Set<string>();
    for (const inv of waItemRows) {
      for (const item of (Array.isArray(inv.items) ? (inv.items as Array<{ productId?: string }>) : [])) {
        if (item.productId) waProductIds.add(item.productId);
      }
    }

    const waCosts = await buildCostResolver(db, waProductIds);
    const breakdown = await buildWhatsappInvoiceBreakdown(db, start, end, waCosts);

    res.json({ success: true, data: breakdown });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/accounting/whatsapp-source-review
// Read-only: lists orders that are linked via manual_invoices.order_id
// but have source IS NULL (were not tagged 'whatsapp' at creation time).
// These orders are already counted correctly in revenue once delivered,
// but the missing source tag means they won't appear in WhatsApp drilldowns.
router.get("/whatsapp-source-review", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    if (!db) { res.status(503).json({ success: false, message: "DB unavailable" }); return; }

    // Find manual_invoices rows that have an order_id AND the linked order has source != 'whatsapp'
    const rows = await db
      .select({
        invoiceId:    manualInvoices.id,
        invoiceNo:    manualInvoices.invoiceNo,
        invoiceStatus: manualInvoices.status,
        orderId:      orders.id,
        orderNumber:  orders.orderNumber,
        orderStatus:  orders.status,
        orderSource:  orders.source,
        orderCreatedAt: orders.createdAt,
        orderTotal:   orders.total,
      })
      .from(manualInvoices)
      .innerJoin(orders, eq(orders.id, manualInvoices.orderId))
      .where(isNull(orders.source));

    res.json({
      success: true,
      count: rows.length,
      data: JSON.parse(JSON.stringify(rows, (_k, v) => (typeof v === "bigint" ? Number(v) : v))),
      note: "هذه الطلبيات مرتبطة بفواتير واتساب لكن source=null بدلاً من 'whatsapp'. الإيراد محسوب صح إذا وصلت، لكنها مخفية من تقارير واتساب.",
    });
  } catch (err) {
    next(err);
  }
});

// ==================== Manual Adjustments ====================

// GET /manual-adjustments — list all, optional ?status=&entityType= filters
router.get("/manual-adjustments", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const rows = await listAdjustments({ status, entityType });
    res.json({ success: true, count: rows.length, data: JSON.parse(JSON.stringify(rows)) });
  } catch (err) { next(err); }
});

// POST /manual-adjustments — create a pending adjustment
// AI/automated callers are blocked: if x-ai-agent or x-automated header present → 403
router.post("/manual-adjustments", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.headers["x-ai-agent"] || req.headers["x-automated"]) {
      res.status(403).json({ success: false, message: "AI لا يمكنه إنشاء تعديلات مالية — يجب أن يتم ذلك من المدير مباشرة." });
      return;
    }
    const parsed = manualAdjustmentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "بيانات غير صحيحة", errors: parsed.error.issues });
      return;
    }
    // Prevent editing products.price from this endpoint
    if (parsed.data.entityType === "product" && parsed.data.fieldName === "price") {
      res.status(403).json({ success: false, message: "سعر البيع محمي — استخدم /api/pricing/apply مع adminConfirm." });
      return;
    }
    const user = (req as any).user;
    const createdBy: string = user?.id ?? "unknown";
    const row = await createAdjustment(parsed.data, createdBy);
    res.status(201).json({ success: true, data: JSON.parse(JSON.stringify(row)) });
  } catch (err) { next(err); }
});

// PATCH /manual-adjustments/:id/approve
router.patch("/manual-adjustments/:id/approve", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    await approveAdjustment(id, user?.id ?? "unknown");
    res.json({ success: true, message: "تم اعتماد التعديل." });
  } catch (err) { next(err); }
});

// PATCH /manual-adjustments/:id/reject
router.patch("/manual-adjustments/:id/reject", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const user = (req as any).user;
    await rejectAdjustment(id, user?.id ?? "unknown");
    res.json({ success: true, message: "تم رفض التعديل." });
  } catch (err) { next(err); }
});

// ==================== Review Flags ====================

// GET /review-flags — list all, optional ?status=&severity= filters
router.get("/review-flags", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const severity = typeof req.query.severity === "string" ? req.query.severity : undefined;
    const rows = await listReviewFlags({ status, severity });
    res.json({ success: true, count: rows.length, data: JSON.parse(JSON.stringify(rows)) });
  } catch (err) { next(err); }
});

// PATCH /review-flags/:id/status
router.patch("/review-flags/:id/status", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const parsed = reviewFlagStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "status يجب أن يكون open | resolved | ignored" });
      return;
    }
    const user = (req as any).user;
    await updateReviewFlagStatus(id, parsed.data.status, user?.id);
    res.json({ success: true, message: "تم تحديث حالة الـ flag." });
  } catch (err) { next(err); }
});

export function createAccountingRouter() {
  return router;
}
