import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { orders, products, shippingSettlements, productCostHistory } from "../../shared/schema.js";
import { and, gte, lte, isNull, inArray, eq, desc } from "drizzle-orm";
import { ApifyClient } from "apify-client";

const router = Router();
router.use(requireAdmin);

// ─── helpers ────────────────────────────────────────────────────────────────

function periodRange(period: string, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === "custom" && from && to) {
    return { start: new Date(from), end: new Date(to) };
  }
  if (period === "day") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end:   new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  // default: month
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

interface CostMap {
  [productId: string]: {
    costPrice: number;
    packagingCost: number;
    insertCost: number;
    name: string;
    price: number;
  };
}

interface OrderProfit {
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  createdAt: Date;
  revenue: number;
  cogs: number;
  packaging: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  shipping: number;
  netProfit: number;
  margin: number;
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
}

function calcOrderProfit(order: any, costMap: CostMap): OrderProfit {
  const items: Array<{ productId: string; quantity: number; priceAtPurchase: number }> =
    Array.isArray(order.items) ? order.items : [];

  const orderTotal = Number(order.total) || 0;
  let revenue = 0;
  let cogs = 0;
  let packaging = 0;

  for (const item of items) {
    const qty = item.quantity || 1;
    const price = Number(item.priceAtPurchase) || 0;
    revenue += price * qty;

    const c = costMap[item.productId];
    if (c) {
      cogs += c.costPrice * qty;
      packaging += (c.packagingCost + c.insertCost) * qty;
    }
  }

  const couponDiscount   = Number(order.discountTotal)   || 0;
  const loyaltyDiscount  = Number(order.pointsDiscount)  || 0;
  const shipping         = Number(order.shippingCost)    || 0;

  const netProfit = revenue - cogs - packaging - couponDiscount - loyaltyDiscount - shipping;
  const margin    = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

  return {
    orderId:        order.id,
    orderNumber:    order.orderNumber ?? null,
    customerName:   order.customerName ?? null,
    createdAt:      order.createdAt,
    revenue,
    cogs,
    packaging,
    couponDiscount,
    loyaltyDiscount,
    shipping,
    netProfit,
    margin,
  };
}

// ─── GET /api/admin/accounting/summary ──────────────────────────────────────

router.get("/summary", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { period = "month", from, to } = req.query as Record<string, string>;
    const { start, end } = periodRange(period, from, to);

    const allOrders = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));

    const productIds = new Set<string>();
    for (const o of allOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const item of items as any[]) {
        if (item.productId) productIds.add(item.productId);
      }
    }

    const costMap: CostMap = {};
    if (productIds.size > 0) {
      const prods = await db
        .select()
        .from(products)
        .where(and(inArray(products.id, [...productIds]), isNull(products.deletedAt)));
      for (const p of prods) {
        costMap[p.id] = {
          costPrice:     Number(p.costPrice)     || 0,
          packagingCost: Number(p.packagingCost) || 0,
          insertCost:    Number(p.insertCost)    || 0,
          name:          p.name,
          price:         Number(p.price)         || 0,
        };
      }
    }

    let totalRevenue = 0, totalCogs = 0, totalPackaging = 0;
    let totalCoupons = 0, totalLoyalty = 0, totalShipping = 0;
    let totalOrders = 0;

    for (const o of allOrders) {
      const p = calcOrderProfit(o, costMap);
      totalRevenue   += p.revenue;
      totalCogs      += p.cogs;
      totalPackaging += p.packaging;
      totalCoupons   += p.couponDiscount;
      totalLoyalty   += p.loyaltyDiscount;
      totalShipping  += p.shipping;
      totalOrders++;
    }

    const totalCosts  = totalCogs + totalPackaging + totalCoupons + totalLoyalty + totalShipping;
    const netProfit   = totalRevenue - totalCosts;
    const margin      = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        period,
        totalOrders,
        totalRevenue,
        totalCogs,
        totalPackaging,
        totalCoupons,
        totalLoyalty,
        totalShipping,
        totalCosts,
        netProfit,
        margin,
      },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/accounting/products ─────────────────────────────────────

router.get("/products", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { period = "month", from, to } = req.query as Record<string, string>;
    const { start, end } = periodRange(period, from, to);

    const allOrders = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));

    const productIds = new Set<string>();
    for (const o of allOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const item of items as any[]) {
        if (item.productId) productIds.add(item.productId);
      }
    }

    const costMap: CostMap = {};
    if (productIds.size > 0) {
      const prods = await db
        .select()
        .from(products)
        .where(and(inArray(products.id, [...productIds]), isNull(products.deletedAt)));
      for (const p of prods) {
        costMap[p.id] = {
          costPrice:     Number(p.costPrice)     || 0,
          packagingCost: Number(p.packagingCost) || 0,
          insertCost:    Number(p.insertCost)    || 0,
          name:          p.name,
          price:         Number(p.price)         || 0,
        };
      }
    }

    const profitMap: Record<string, ProductProfit> = {};

    for (const o of allOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      const orderTotal = Number(o.total) || 1;
      const proportionalDeductions =
        (Number(o.discountTotal) || 0) +
        (Number(o.pointsDiscount) || 0) +
        (Number(o.shippingCost) || 0);

      for (const item of items as any[]) {
        const pid = item.productId;
        const qty = item.quantity || 1;
        const price = Number(item.priceAtPurchase) || 0;
        const c = costMap[pid];
        if (!c) continue;

        const lineRevenue = price * qty;
        const lineCogs    = c.costPrice * qty;
        const linePack    = (c.packagingCost + c.insertCost) * qty;
        const lineDeduct  = lineRevenue > 0 ? proportionalDeductions * (lineRevenue / orderTotal) : 0;
        const lineProfit  = lineRevenue - lineCogs - linePack - lineDeduct;

        if (!profitMap[pid]) {
          profitMap[pid] = { productId: pid, name: c.name, unitsSold: 0, revenue: 0, cogs: 0, packaging: 0, netProfit: 0, margin: 0 };
        }
        profitMap[pid].unitsSold  += qty;
        profitMap[pid].revenue    += lineRevenue;
        profitMap[pid].cogs       += lineCogs;
        profitMap[pid].packaging  += linePack;
        profitMap[pid].netProfit  += lineProfit;
      }
    }

    const result = Object.values(profitMap).map(p => ({
      ...p,
      margin: p.revenue > 0 ? Math.round((p.netProfit / p.revenue) * 100) : 0,
    })).sort((a, b) => b.netProfit - a.netProfit);

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/accounting/orders ───────────────────────────────────────

router.get("/orders", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { period = "month", from, to } = req.query as Record<string, string>;
    const { start, end } = periodRange(period, from, to);

    const allOrders = await db
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));

    const productIds = new Set<string>();
    for (const o of allOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const item of items as any[]) {
        if (item.productId) productIds.add(item.productId);
      }
    }

    const costMap: CostMap = {};
    if (productIds.size > 0) {
      const prods = await db
        .select()
        .from(products)
        .where(and(inArray(products.id, [...productIds]), isNull(products.deletedAt)));
      for (const p of prods) {
        costMap[p.id] = {
          costPrice: Number(p.costPrice) || 0,
          packagingCost: Number(p.packagingCost) || 0,
          insertCost: Number(p.insertCost) || 0,
          name: p.name,
          price: Number(p.price) || 0,
        };
      }
    }

    const result = allOrders.map(o => calcOrderProfit(o, costMap));
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/accounting/cod-summary ──────────────────────────────────

router.get("/cod-summary", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();

    const codOrders = await db!
      .select()
      .from(orders)
      .where(
        inArray(orders.status, ["shipped", "delivered", "rejected_returned", "rejected_carrier"])
      );

    const totalCod = codOrders.reduce((sum, o) => sum + (Number((o as any).roundedTotal ?? o.total) || 0), 0);

    const receivedOrders = codOrders.filter((o: any) => o.codReceived === true);
    const totalReceived = receivedOrders.reduce((sum, o) => sum + (Number((o as any).roundedTotal ?? o.total) || 0), 0);

    const totalPending = totalCod - totalReceived;

    const settlements = await db!
      .select()
      .from(shippingSettlements)
      .orderBy(desc(shippingSettlements.createdAt));

    res.json({
      success: true,
      data: { totalCod, totalReceived, totalPending, settlements },
    });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/accounting/settlements ─────────────────────────────────

router.post("/settlements", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { carrier, amount, notes, orderIds } = req.body as {
      carrier: string;
      amount: number;
      notes?: string;
      orderIds?: string[];
    };

    if (!carrier || !amount || Number(amount) <= 0) {
      res.status(400).json({ success: false, message: "carrier و amount مطلوبان" });
      return;
    }

    const [settlement] = await db!
      .insert(shippingSettlements)
      .values({ carrier, amount: String(amount), notes: notes ?? null })
      .returning();

    if (Array.isArray(orderIds) && orderIds.length > 0) {
      await db!
        .update(orders)
        .set({ codReceived: true } as any)
        .where(inArray(orders.id, orderIds));
    }

    res.status(201).json({ success: true, data: settlement });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/accounting/settlements ──────────────────────────────────

router.get("/settlements", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const list = await db!
      .select()
      .from(shippingSettlements)
      .orderBy(desc(shippingSettlements.createdAt));
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/accounting/costs/:productId ─────────────────────────────

router.post("/costs/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { productId } = req.params as { productId: string };
    const { costPrice, packagingCost, insertCost } = req.body as {
      costPrice: number;
      packagingCost: number;
      insertCost: number;
    };

    if (costPrice === undefined || packagingCost === undefined || insertCost === undefined) {
      res.status(400).json({ success: false, message: "costPrice, packagingCost, insertCost مطلوبة" });
      return;
    }

    const [updated] = await db
      .update(products)
      .set({
        costPrice:     String(Number(costPrice)     || 0),
        packagingCost: String(Number(packagingCost) || 0),
        insertCost:    String(Number(insertCost)    || 0),
        updatedAt:     new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, message: "المنتج غير موجود" });
      return;
    }

    res.json({ success: true, data: { costPrice, packagingCost, insertCost } });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/accounting/competitor-check ─────────────────────────────

router.post("/competitor-check", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productName, brand } = req.body as { productName: string; brand: string };

    if (!productName) {
      res.status(400).json({ success: false, message: "productName مطلوب" });
      return;
    }

    const token = process.env.APIFY_TOKEN;
    if (!token) {
      res.status(500).json({ success: false, message: "APIFY_TOKEN غير مضبوط في .env" });
      return;
    }

    const client = new ApifyClient({ token });
    const query = `${productName} ${brand ?? ""}`.trim();

    const run = await client.actor("apify/google-shopping-scraper").call({
      queries: query,
      countryCode: "IQ",
      maxItems: 8,
      languageCode: "ar",
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 8 });

    const results = (items as any[]).map((item: any) => ({
      store:    item.seller   ?? item.merchantName ?? "غير معروف",
      price:    Number(item.price?.value ?? item.price ?? 0),
      currency: item.price?.currency ?? "IQD",
      url:      item.url      ?? item.productUrl ?? "#",
      title:    item.title    ?? item.name ?? productName,
    })).filter((r: any) => r.price > 0);

    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/accounting/cost-history/:productId ──────────────────────

router.get("/cost-history/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { productId } = req.params as { productId: string };
    const history = await db!
      .select()
      .from(productCostHistory)
      .where(eq(productCostHistory.productId, productId))
      .orderBy(desc(productCostHistory.effectiveFrom));
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/accounting/cost-history/:productId ─────────────────────

router.post("/cost-history/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { productId } = req.params as { productId: string };
    const { costPrice, packagingCost, insertCost, effectiveFrom } = req.body as {
      costPrice: number;
      packagingCost: number;
      insertCost: number;
      effectiveFrom: string;
    };

    if (!effectiveFrom) {
      res.status(400).json({ success: false, message: "effectiveFrom مطلوب" });
      return;
    }

    const [entry] = await db!
      .insert(productCostHistory)
      .values({
        productId,
        costPrice:     String(costPrice     ?? 0),
        packagingCost: String(packagingCost ?? 0),
        insertCost:    String(insertCost    ?? 0),
        effectiveFrom: new Date(effectiveFrom),
      })
      .returning();

    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/accounting/coupons ──────────────────────────────────────

router.get("/coupons", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    const { period = "month", from, to } = req.query as Record<string, string>;
    const { start, end } = periodRange(period, from, to);

    const allOrders = await db!
      .select()
      .from(orders)
      .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));

    const map: Record<string, { couponCode: string; usageCount: number; totalDiscount: number }> = {};
    for (const o of allOrders) {
      if (!o.couponId) continue;
      const discount = Number(o.discountTotal) || 0;
      if (!map[o.couponId]) {
        map[o.couponId] = { couponCode: o.couponId, usageCount: 0, totalDiscount: 0 };
      }
      map[o.couponId].usageCount++;
      map[o.couponId].totalDiscount += discount;
    }

    const result = Object.values(map).map((c) => ({
      ...c,
      avgDiscount: c.usageCount > 0 ? Math.round(c.totalDiscount / c.usageCount) : 0,
    })).sort((a, b) => b.totalDiscount - a.totalDiscount);

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export function createAccountingRouter() { return router; }
