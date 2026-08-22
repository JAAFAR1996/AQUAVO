import { Router, type NextFunction, type Request, type Response } from "express";
import { and, gte, lte, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { manualInvoices, orderReturnEvents, products } from "../../shared/schema.js";
import {
  accountingPeriodSchema,
  type AccountingPeriod,
} from "../../shared/accounting.js";
import {
  CANCELLED_STATUSES,
  IN_PROGRESS_STATUSES,
  REALIZED_STATUSES,
  toMoney as toNumber,
} from "../../shared/order-financials.js";
import {
  buildCostResolver,
  buildFulfillmentResolver,
  buildRelationalLineResolver,
  buildWhatsappInvoiceBreakdown,
  calcOrderProfit,
  collectProductIds,
  computeTaxReadiness,
  eventActualReturnLoss,
  eventSalesReturnDeduction,
  getOrderItems,
  getOrdersForPeriod,
  getRealizedOrdersForPeriod,
  lineQuantity,
  periodRange,
  toDate,
  type Db,
  type OrderFulfillmentCost,
  type OrderRow,
} from "../services/accounting-engine.js";

/**
 * Transitional canonical accounting surface for packaging.
 *
 * The legacy accounting route predates fulfillment snapshots and reads
 * `orders.box_cost` directly. That is now wrong for any order touched by the
 * fulfillment system: the immutable fulfillment lines are the real evidence and
 * contain the carton + AQUAVO preparation materials. This router is mounted
 * immediately before the legacy route and owns only the endpoints whose maths
 * depended on box_cost.
 *
 * Historical orders are never guessed. If a confirmed original shipment has no
 * tracked carton line, the known preparation lines are kept as a best-effort
 * amount but `costsComplete=false` and exact profit stays null. Separate review
 * flags identify those historical orders for evidence-based correction.
 */
const router = Router();
router.use(requireAdmin);

function accountingDb(res: Response): Db | null {
  const db = getDb();
  if (!db) {
    res.status(503).json({ success: false, message: "قاعدة البيانات غير مهيأة" });
    return null;
  }
  return db;
}

function rowsOf<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return ((value as { rows?: T[] } | null)?.rows ?? []) as T[];
}

function periodQuery(req: Request): { period: AccountingPeriod; from?: string; to?: string } {
  const raw = typeof req.query.period === "string" ? req.query.period : "month";
  const parsed = accountingPeriodSchema.safeParse(raw);
  return {
    period: parsed.success ? parsed.data : "month",
    from: typeof req.query.from === "string" ? req.query.from : undefined,
    to: typeof req.query.to === "string" ? req.query.to : undefined,
  };
}

/**
 * True only when the confirmed ORIGINAL shipment contains a catalogue carton
 * whose stock is tracked. A free-text line called "صندوق" is not enough: it
 * cannot move stock or prove which approved carton price was used.
 */
async function trackedCartonEvidence(db: Db, orderIds: readonly string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (orderIds.length === 0) return result;
  const query = await db.execute(sql`
    SELECT
      e.order_id,
      COALESCE(BOOL_OR(
        m.material_kind = 'carton'
        AND m.stock_tracked = TRUE
        AND COALESCE(l.quantity, 0)::numeric > 0
      ), FALSE) AS has_carton
    FROM public.order_fulfillment_events e
    LEFT JOIN public.order_fulfillment_lines l ON l.event_id = e.id
    LEFT JOIN public.fulfillment_materials m ON m.id = l.material_id
    WHERE e.order_id IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})
      AND e.event_type = 'original'
      AND e.workflow_state IN ('confirmed', 'adjusted')
      AND e.reversal_of_event_id IS NULL
    GROUP BY e.order_id
  `);
  for (const row of rowsOf<{ order_id: string; has_carton: boolean }>(query)) {
    result.set(row.order_id, row.has_carton === true);
  }
  return result;
}

interface CanonicalPackaging {
  /** Best known amount. null means even the immutable fulfillment cost is incomplete. */
  value: number | null;
  /** Exact evidence for the whole AQUAVO fulfillment package, including a real carton. */
  complete: boolean;
  source: "fulfillment" | "legacy_box_cost";
}

function canonicalPackaging(
  order: OrderRow,
  fulfillment: OrderFulfillmentCost | undefined,
  hasTrackedCarton: boolean,
): CanonicalPackaging {
  if (fulfillment && fulfillment.eventCount > 0) {
    return {
      value: fulfillment.totalFulfillmentCost,
      complete:
        fulfillment.totalFulfillmentCost != null &&
        fulfillment.status === "exact" &&
        hasTrackedCarton,
      source: "fulfillment",
    };
  }
  // Historical orders that predate fulfillment keep their legacy evidence
  // exactly as recorded. We do not rewrite history simply because a newer path
  // exists today.
  return {
    value: toNumber(order.boxCost),
    complete: true,
    source: "legacy_box_cost",
  };
}

function canonicalOrderProfit(
  order: OrderRow,
  base: ReturnType<typeof calcOrderProfit>,
  fulfillment: OrderFulfillmentCost | undefined,
  hasTrackedCarton: boolean,
) {
  const packaging = canonicalPackaging(order, fulfillment, hasTrackedCarton);
  const packagingKnown = packaging.value != null;
  const bestEffortPackaging = packaging.value ?? 0;
  const netProfit = base.revenue - base.cogs - bestEffortPackaging;
  const margin = base.revenue > 0 ? Math.round((netProfit / base.revenue) * 100) : 0;
  const productExact = base.costStatus === "exact" || base.costStatus === "verified_zero";
  const exact = productExact && packaging.complete && packagingKnown;

  return {
    ...base,
    // Keep the published compatibility fields but change their SOURCE, not just
    // their label: both now carry the canonical AQUAVO fulfillment amount.
    packaging: bestEffortPackaging,
    boxCost: bestEffortPackaging,
    netProfit,
    margin,
    costsComplete: base.costsComplete && packaging.complete && packagingKnown,
    estimatedNetProfit: netProfit,
    exactNetProfit: exact ? netProfit : null,
  };
}

router.get("/summary", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = accountingDb(res);
    if (!db) return;
    const { period, from, to } = periodQuery(req);
    const { start, end } = periodRange(period, from, to);
    const allOrders = await getOrdersForPeriod(db, start, end);
    const realizedOrders = allOrders.filter((o) => {
      const fc = (o as OrderRow & { financiallyCounted?: boolean | null }).financiallyCounted;
      if (fc === false) return false;
      if (fc === true) return true;
      return REALIZED_STATUSES.includes(o.status as (typeof REALIZED_STATUSES)[number]);
    });

    // Preserve the WhatsApp invoice cost coverage of the legacy endpoint.
    const waItems = await db
      .select({ items: manualInvoices.items })
      .from(manualInvoices)
      .where(and(gte(manualInvoices.createdAt, start), lte(manualInvoices.createdAt, end)));
    const productIds = collectProductIds(realizedOrders);
    for (const inv of waItems) {
      for (const item of (Array.isArray(inv.items) ? inv.items as Array<{ productId?: string }> : [])) {
        if (item.productId) productIds.add(item.productId);
      }
    }

    const costs = await buildCostResolver(db, productIds);
    const orderIds = realizedOrders.map((o) => o.id);
    const [relational, fulfillment, cartonEvidence] = await Promise.all([
      buildRelationalLineResolver(db, new Set(orderIds)),
      buildFulfillmentResolver(db, new Set(orderIds)),
      trackedCartonEvidence(db, orderIds),
    ]);

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalPackaging = 0;
    let totalCoupons = 0;
    let totalLoyalty = 0;
    let missingCostLines = 0;
    let missingProductLines = 0;
    let exactCostLines = 0;
    let estimatedHistoryLines = 0;
    let estimatedReferenceLines = 0;
    let unknownCostLines = 0;
    let packagingIncompleteOrders = 0;

    for (const order of realizedOrders) {
      const snap = fulfillment.get(order.id);
      const base = calcOrderProfit(order, costs, snap, relational.get(order.id));
      const pack = canonicalPackaging(order, snap, cartonEvidence.get(order.id) === true);
      totalRevenue += base.revenue;
      totalCogs += base.cogs;
      totalPackaging += pack.value ?? 0;
      totalCoupons += base.couponDiscount;
      totalLoyalty += base.loyaltyDiscount;
      missingCostLines += base.missingCostLines;
      missingProductLines += base.missingProductLines;
      exactCostLines += base.exactCostLines;
      estimatedHistoryLines += base.estimatedHistoryLines;
      estimatedReferenceLines += base.estimatedReferenceLines;
      unknownCostLines += base.unknownCostLines;
      if (!pack.complete || pack.value == null) packagingIncompleteOrders++;
    }

    const productTax = computeTaxReadiness({
      exactCostLines,
      estimatedHistoryLines,
      estimatedReferenceLines,
      unknownCostLines,
    });
    const packagingEvidenceComplete = packagingIncompleteOrders === 0;
    const taxReadiness = packagingEvidenceComplete
      ? productTax
      : {
          ...productTax,
          taxReportReady: false,
          taxReadinessWarning:
            productTax.taxReadinessWarning ??
            "غير صالح كتقرير ضريبي نهائي — توثيق كارتونة بعض الطلبات غير مكتمل.",
        };

    const deliveredCount = allOrders.filter((o) => o.status === "delivered").length;
    const cancelledCount = allOrders.filter((o) =>
      CANCELLED_STATUSES.includes(o.status as (typeof CANCELLED_STATUSES)[number]),
    ).length;
    const rejectedCount = allOrders.filter((o) =>
      ["rejected", "rejected_returned", "rejected_carrier"].includes(o.status ?? ""),
    ).length;
    const inProgressCount = allOrders.filter((o) =>
      IN_PROGRESS_STATUSES.includes(o.status as (typeof IN_PROGRESS_STATUSES)[number]),
    ).length;
    const rtoCount = allOrders.filter((o) =>
      CANCELLED_STATUSES.includes(o.status as (typeof CANCELLED_STATUSES)[number]),
    ).length;
    const rtoRate = allOrders.length > 0 ? Math.round((rtoCount / allOrders.length) * 100) : 0;
    const aov = deliveredCount > 0 ? Math.round(totalRevenue / deliveredCount) : 0;

    const whatsappOrdersCount = allOrders.filter((o) => o.source === "whatsapp").length;
    const websiteOrdersCount = allOrders.length - whatsappOrdersCount;
    const waBreakdown = await buildWhatsappInvoiceBreakdown(db, start, end, costs);

    const totalCosts = totalCogs + totalPackaging;
    const netProfit = totalRevenue - totalCosts;
    const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    const returnEventsInPeriod = await db
      .select()
      .from(orderReturnEvents)
      .where(and(gte(orderReturnEvents.createdAt, start), lte(orderReturnEvents.createdAt, end)));
    const verified = returnEventsInPeriod.filter((e) => e.status === "verified");
    const realizedIds = new Set(realizedOrders.map((o) => o.id));
    const salesReturnDeduction = verified
      .filter((e) => realizedIds.has(e.orderId))
      .reduce((sum, e) => sum + eventSalesReturnDeduction(e), 0);
    const actualReturnLoss = verified.reduce((sum, e) => sum + eventActualReturnLoss(e), 0);
    const sellableReturnedCount = verified.filter((e) => e.restocked === true).length;
    const nonSellableReturnedCount = verified.filter((e) => e.restocked !== true).length;
    const netProfitAfterReturns = netProfit - salesReturnDeduction - actualReturnLoss;
    const marginAfterReturns = totalRevenue > 0
      ? Math.round((netProfitAfterReturns / totalRevenue) * 100)
      : 0;

    const productEvidenceExact =
      missingCostLines === 0 &&
      missingProductLines === 0 &&
      estimatedHistoryLines === 0 &&
      estimatedReferenceLines === 0 &&
      unknownCostLines === 0;
    const allExact = productEvidenceExact && packagingEvidenceComplete;

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
        costsComplete:
          missingCostLines === 0 &&
          missingProductLines === 0 &&
          packagingEvidenceComplete,
        missingCostLines,
        missingProductLines,
        estimatedNetProfit: netProfit,
        exactNetProfit: allExact ? netProfit : null,
        ...taxReadiness,
        totalReturnEvents: returnEventsInPeriod.length,
        verifiedReturnEvents: verified.length,
        salesReturnDeduction,
        actualReturnLoss,
        totalReturnFinancialImpact: salesReturnDeduction + actualReturnLoss,
        sellableReturnedCount,
        nonSellableReturnedCount,
        netProfitBeforeReturns: netProfit,
        netProfitAfterReturns,
        marginBeforeReturns: margin,
        marginAfterReturns,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/orders", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = accountingDb(res);
    if (!db) return;
    const { period, from, to } = periodQuery(req);
    const { start, end } = periodRange(period, from, to);
    const allOrders = await getOrdersForPeriod(db, start, end);
    const ids = allOrders.map((o) => o.id);
    const costs = await buildCostResolver(db, collectProductIds(allOrders));
    const [relational, fulfillment, cartonEvidence] = await Promise.all([
      buildRelationalLineResolver(db, new Set(ids)),
      buildFulfillmentResolver(db, new Set(ids)),
      trackedCartonEvidence(db, ids),
    ]);

    const result = allOrders
      .map((order) => {
        const snap = fulfillment.get(order.id);
        const base = calcOrderProfit(order, costs, snap, relational.get(order.id));
        return canonicalOrderProfit(order, base, snap, cartonEvidence.get(order.id) === true);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = accountingDb(res);
    if (!db) return;
    const { period, from, to } = periodQuery(req);
    const { start, end } = periodRange(period, from, to);
    const activeProducts = await db.select().from(products);
    const orders = await getRealizedOrdersForPeriod(db, start, end);
    const ids = orders.map((o) => o.id);
    const productIds = new Set<string>([
      ...collectProductIds(orders),
      ...activeProducts.map((p) => p.id),
    ]);
    const costs = await buildCostResolver(db, productIds);
    const [relational, fulfillment, cartonEvidence] = await Promise.all([
      buildRelationalLineResolver(db, new Set(ids)),
      buildFulfillmentResolver(db, new Set(ids)),
      trackedCartonEvidence(db, ids),
    ]);

    type Acc = {
      productId: string;
      name: string;
      unitsSold: number;
      revenue: number;
      cogs: number;
      packaging: number;
      netProfit: number;
      costsComplete: boolean;
      missingCostLines: number;
      missingProductLines: number;
    };
    const byProduct = new Map<string, Acc>();

    for (const order of orders) {
      const snap = fulfillment.get(order.id);
      const base = calcOrderProfit(order, costs, snap, relational.get(order.id));
      const pack = canonicalPackaging(order, snap, cartonEvidence.get(order.id) === true);
      const grossTotal = base.items.reduce((sum, item) => sum + item.priceAtPurchase * item.qty, 0);

      for (const item of base.items) {
        if (!item.productId) continue;
        const lineGross = item.priceAtPurchase * item.qty;
        const share = grossTotal > 0 ? lineGross / grossTotal : 0;
        const lineRevenue = base.revenue * share;
        let lineCogs = 0;
        let productLineComplete = item.unitCostPrice != null;
        if (item.unitCostPrice != null) {
          const components = [item.unitCostPrice, item.unitPackagingCost, item.unitInsertCost];
          if (components.some((v) => v == null)) productLineComplete = false;
          lineCogs = components
            .filter((v): v is number => v != null)
            .reduce((sum, value) => sum + value, 0) * item.qty;
        }
        const supplierPackaging =
          ((item.unitPackagingCost ?? 0) + (item.unitInsertCost ?? 0)) * item.qty;
        const fulfillmentShare = (pack.value ?? 0) * share;
        const lineNet = lineRevenue - lineCogs - fulfillmentShare;

        const current = costs.getCurrent(item.productId);
        const existing = byProduct.get(item.productId) ?? {
          productId: item.productId,
          name: current?.name ?? item.name,
          unitsSold: 0,
          revenue: 0,
          cogs: 0,
          packaging: 0,
          netProfit: 0,
          costsComplete: true,
          missingCostLines: 0,
          missingProductLines: 0,
        };
        existing.unitsSold += item.qty;
        existing.revenue += lineRevenue;
        existing.cogs += lineCogs;
        existing.packaging += supplierPackaging;
        existing.netProfit += lineNet;
        if (!productLineComplete || !pack.complete || pack.value == null) {
          existing.costsComplete = false;
          existing.missingCostLines++;
        }
        byProduct.set(item.productId, existing);
      }
    }

    const data = activeProducts.map((product) => {
      const current = costs.getCurrent(product.id);
      const acc = byProduct.get(product.id) ?? {
        productId: product.id,
        name: product.name,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        packaging: 0,
        netProfit: 0,
        costsComplete: (current?.costsComplete ?? false),
        missingCostLines: 0,
        missingProductLines: 0,
      };
      const margin = acc.revenue > 0 ? Math.round((acc.netProfit / acc.revenue) * 100) : 0;
      return {
        ...acc,
        margin,
        costPrice: current?.costPrice ?? 0,
        packagingCost: current?.packagingCost ?? 0,
        insertCost: current?.insertCost ?? 0,
      };
    }).sort((a, b) => b.netProfit - a.netProfit);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Legacy manual box-cost mutation is intentionally retired. A carton price is
// now frozen only by confirming the actual carton material in fulfillment.
router.patch("/orders/:orderId/box-cost", (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    message: "تم إلغاء تعديل كلفة الكارتونة يدوياً. اختر الكارتونة الفعلية من تجهيز الطلب حتى تنسحب كلفتها ومخزونها تلقائياً.",
  });
});

export function createCanonicalPackagingAccountingRouter() {
  return router;
}
