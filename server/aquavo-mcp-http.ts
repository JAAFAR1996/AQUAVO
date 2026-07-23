/**
 * AQUAVO MCP Server — HTTP/SSE Transport
 * للاستخدام مع Claude.ai web و أي AI يدعم remote MCP
 *
 * تشغيل: npx tsx server/aquavo-mcp-http.ts
 * PORT: 3333 (أو PORT env var)
 */

import {
  loadEnvFilesPreservingDatabaseTargets,
  resolveDatabaseTarget,
  logResolvedDatabaseTarget,
} from "./db-target.js";
// Explicitly inherited DATABASE_URL wins over any local .env (see server/db-target.ts).
const __envLoad = loadEnvFilesPreservingDatabaseTargets();
if (process.env.DATABASE_URL?.trim()) {
  logResolvedDatabaseTarget(resolveDatabaseTarget("primary", { inherited: __envLoad.inherited }));
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";
import {
  sql,
  eq,
  ilike,
  or,
  and,
  desc,
  asc,
  gte,
  lte,
  isNull,
  gt,
} from "drizzle-orm";
import * as schema from "../shared/schema.js";
// ── Canonical accounting engine (see server/services/accounting-engine.ts) ───
// MCP finance tools must report the engine's numbers, never a local SQL sum.
import {
  computePeriodFinancials,
  getRealizedOrdersForPeriod,
  lineQuantity,
  type Db as AccountingDb,
  type OrderLineItem,
} from "./services/accounting-engine.js";
import { toMoney } from "../shared/order-financials.js";
import http from "http";
import { randomUUID, timingSafeEqual } from "crypto";

// ─── Auth Guard ────────────────────────────────────────────────────────────────

const MCP_TOKEN = process.env.AQUAVO_MCP_TOKEN?.trim();
if (!MCP_TOKEN) {
  console.error("[AQUAVO MCP] AQUAVO_MCP_TOKEN غير موجود — أضفه في .env.local");
  process.exit(1);
}

// ─── DB Setup ──────────────────────────────────────────────────────────────────

neonConfig.webSocketConstructor = ws;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[AQUAVO MCP] DATABASE_URL غير موجود");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl, max: 5 });
const db = drizzle(pool, { schema });
/** Same Drizzle/Neon handle the app uses — accepted by the accounting engine. */
const accountingDb = db as unknown as AccountingDb;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function safe(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
}

// ─── MCP Server Factory ────────────────────────────────────────────────────────
// نصنع instance جديد لكل connection (stateless per-session)

function buildMcpServer(): Server {
  const server = new Server(
    { name: "aquavo-store", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_products",
        description: "قائمة منتجات AQUAVO مع السعر والمخزون والفئة. يدعم فلترة وبحث.",
        inputSchema: {
          type: "object",
          properties: {
            search: { type: "string" },
            category: { type: "string" },
            brand: { type: "string" },
            in_stock_only: { type: "boolean" },
            low_stock_only: { type: "boolean" },
            limit: { type: "number" },
            offset: { type: "number" },
            sort_by: { type: "string", enum: ["price_asc", "price_desc", "newest", "stock_asc", "name"] },
          },
        },
      },
      {
        name: "get_product",
        description: "تفاصيل منتج واحد بالكامل + مراجعاته.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            slug: { type: "string" },
          },
        },
      },
      {
        name: "get_inventory_summary",
        description: "ملخص المخزون: إجمالي، منتهي، منخفض.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_orders",
        description: "قائمة الطلبات مع فلتر بالحالة والتاريخ.",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string" },
            limit: { type: "number" },
            offset: { type: "number" },
            date_from: { type: "string" },
            date_to: { type: "string" },
            source: { type: "string" },
            search: { type: "string" },
          },
        },
      },
      {
        name: "get_order",
        description: "تفاصيل طلب واحد + بيانات الزبون.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            order_number: { type: "string" },
          },
        },
      },
      {
        name: "get_orders_summary",
        description: "إحصائيات الطلبات مجمّعة بالحالة.",
        inputSchema: {
          type: "object",
          properties: {
            date_from: { type: "string" },
            date_to: { type: "string" },
          },
        },
      },
      {
        name: "get_customers",
        description: "قائمة الزبائن مع معلومات التواصل والولاء.",
        inputSchema: {
          type: "object",
          properties: {
            search: { type: "string" },
            loyalty_tier: { type: "string" },
            limit: { type: "number" },
            offset: { type: "number" },
          },
        },
      },
      {
        name: "get_customer",
        description: "تفاصيل زبون واحد + طلباته + سلة التسوق.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
          },
        },
      },
      {
        name: "get_dashboard_stats",
        description: "إحصائيات لوحة التحكم: إيرادات، طلبات، زبائن، منتجات.",
        inputSchema: {
          type: "object",
          properties: {
            period: { type: "string", enum: ["7d", "30d", "90d"] },
          },
        },
      },
      {
        name: "get_revenue_breakdown",
        description: "تفصيل الإيرادات: مبيعات، شحن، خصومات حسب الفترة.",
        inputSchema: {
          type: "object",
          properties: {
            period: { type: "string", enum: ["7d", "30d", "90d"] },
          },
        },
      },
      {
        name: "get_top_products",
        description: "أكثر المنتجات مبيعاً.",
        inputSchema: {
          type: "object",
          properties: {
            period: { type: "string", enum: ["7d", "30d", "90d"] },
            limit: { type: "number" },
          },
        },
      },
      {
        name: "get_reviews",
        description: "مراجعات المنتجات.",
        inputSchema: {
          type: "object",
          properties: {
            product_id: { type: "string" },
            status: { type: "string" },
            min_rating: { type: "number" },
            limit: { type: "number" },
          },
        },
      },
      {
        name: "get_coupons",
        description: "قائمة الكوبونات.",
        inputSchema: {
          type: "object",
          properties: {
            active_only: { type: "boolean" },
          },
        },
      },
      {
        name: "get_expenses",
        description: "مصاريف المتجر.",
        inputSchema: {
          type: "object",
          properties: {
            category: { type: "string" },
            date_from: { type: "string" },
            date_to: { type: "string" },
            limit: { type: "number" },
          },
        },
      },
      {
        name: "search",
        description: "بحث شامل في المنتجات والطلبات والزبائن.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    console.log(`[AUDIT] tool=${name} args=[${Object.keys(args).join(",")}] ts=${new Date().toISOString()}`);

    try {
      switch (name) {
        case "get_products": {
          const { search, category, brand, in_stock_only, low_stock_only, limit = 50, offset = 0, sort_by = "newest" } = args as Record<string, any>;
          const conditions = [isNull(schema.products.deletedAt)];
          if (category) conditions.push(ilike(schema.products.category, `%${category}%`));
          if (brand) conditions.push(ilike(schema.products.brand, `%${brand}%`));
          if (in_stock_only) conditions.push(gt(schema.products.stock, 0));
          if (low_stock_only) conditions.push(sql`${schema.products.stock} <= ${schema.products.lowStockThreshold} AND ${schema.products.stock} > 0`);
          if (search) conditions.push(or(ilike(schema.products.name, `%${search}%`), ilike(schema.products.brand, `%${search}%`)));
          const orderBy = sort_by === "price_asc" ? asc(schema.products.price) : sort_by === "price_desc" ? desc(schema.products.price) : sort_by === "stock_asc" ? asc(schema.products.stock) : sort_by === "name" ? asc(schema.products.name) : desc(schema.products.createdAt);
          const rows = await db.select({ id: schema.products.id, slug: schema.products.slug, name: schema.products.name, brand: schema.products.brand, category: schema.products.category, subcategory: schema.products.subcategory, price: schema.products.price, originalPrice: schema.products.originalPrice, stock: schema.products.stock, lowStockThreshold: schema.products.lowStockThreshold, rating: schema.products.rating, reviewCount: schema.products.reviewCount, isNew: schema.products.isNew, isBestSeller: schema.products.isBestSeller, hasVariants: schema.products.hasVariants, thumbnail: schema.products.thumbnail, costPrice: schema.products.costPrice, createdAt: schema.products.createdAt }).from(schema.products).where(and(...conditions)).orderBy(orderBy).limit(Math.min(Number(limit), 200)).offset(Number(offset));
          return { content: [{ type: "text", text: JSON.stringify(safe(rows), null, 2) }] };
        }

        case "get_product": {
          const { id, slug } = args as Record<string, string>;
          if (!id && !slug) throw new Error("يجب توفير id أو slug");
          const [product] = await db.select().from(schema.products).where(id ? eq(schema.products.id, id) : eq(schema.products.slug, slug)).limit(1);
          if (!product) throw new Error("المنتج غير موجود");
          const reviews = await db.select({ id: schema.reviews.id, rating: schema.reviews.rating, title: schema.reviews.title, comment: schema.reviews.comment, status: schema.reviews.status, createdAt: schema.reviews.createdAt }).from(schema.reviews).where(eq(schema.reviews.productId, product.id)).orderBy(desc(schema.reviews.createdAt)).limit(10);
          return { content: [{ type: "text", text: JSON.stringify(safe({ product, reviews }), null, 2) }] };
        }

        case "get_inventory_summary": {
          const [totals] = await db.select({ total: sql<number>`COUNT(*)`, out_of_stock: sql<number>`SUM(CASE WHEN ${schema.products.stock} = 0 THEN 1 ELSE 0 END)`, low_stock: sql<number>`SUM(CASE WHEN ${schema.products.stock} > 0 AND ${schema.products.stock} <= ${schema.products.lowStockThreshold} THEN 1 ELSE 0 END)`, in_stock: sql<number>`SUM(CASE WHEN ${schema.products.stock} > ${schema.products.lowStockThreshold} THEN 1 ELSE 0 END)` }).from(schema.products).where(isNull(schema.products.deletedAt));
          const critical = await db.select({ id: schema.products.id, name: schema.products.name, stock: schema.products.stock, lowStockThreshold: schema.products.lowStockThreshold }).from(schema.products).where(and(isNull(schema.products.deletedAt), sql`${schema.products.stock} <= ${schema.products.lowStockThreshold}`)).orderBy(asc(schema.products.stock)).limit(20);
          return { content: [{ type: "text", text: JSON.stringify(safe({ summary: totals, critical_items: critical }), null, 2) }] };
        }

        case "get_orders": {
          const { status, limit = 50, offset = 0, date_from, date_to, source, search } = args as Record<string, any>;
          const conditions = [];
          if (status) conditions.push(eq(schema.orders.status, status));
          if (source) conditions.push(eq(schema.orders.source, source));
          if (date_from) conditions.push(gte(schema.orders.createdAt, new Date(date_from)));
          if (date_to) conditions.push(lte(schema.orders.createdAt, new Date(date_to)));
          if (search) conditions.push(or(ilike(schema.orders.customerName, `%${search}%`), ilike(schema.orders.customerPhone, `%${search}%`), ilike(schema.orders.orderNumber, `%${search}%`)));
          const rows = await db.select({ id: schema.orders.id, orderNumber: schema.orders.orderNumber, status: schema.orders.status, paymentStatus: schema.orders.paymentStatus, total: schema.orders.total, roundedTotal: schema.orders.roundedTotal, shippingCost: schema.orders.shippingCost, customerName: schema.orders.customerName, customerPhone: schema.orders.customerPhone, source: schema.orders.source, carrier: schema.orders.carrier, shippingAddress: schema.orders.shippingAddress, items: schema.orders.items, createdAt: schema.orders.createdAt }).from(schema.orders).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(schema.orders.createdAt)).limit(Math.min(Number(limit), 200)).offset(Number(offset));
          return { content: [{ type: "text", text: JSON.stringify(safe(rows), null, 2) }] };
        }

        case "get_order": {
          const { id, order_number } = args as Record<string, string>;
          if (!id && !order_number) throw new Error("يجب توفير id أو order_number");
          const [order] = await db.select().from(schema.orders).where(id ? eq(schema.orders.id, id) : eq(schema.orders.orderNumber, order_number)).limit(1);
          if (!order) throw new Error("الطلب غير موجود");
          let customer = null;
          if ((order as any).userId) {
            const [u] = await db.select({ id: schema.users.id, email: schema.users.email, fullName: schema.users.fullName, phone: schema.users.phone, loyaltyTier: schema.users.loyaltyTier }).from(schema.users).where(eq(schema.users.id, (order as any).userId)).limit(1);
            customer = u || null;
          }
          return { content: [{ type: "text", text: JSON.stringify(safe({ order, customer }), null, 2) }] };
        }

        case "get_orders_summary": {
          const { date_from, date_to } = args as Record<string, any>;
          const conditions = [];
          if (date_from) conditions.push(gte(schema.orders.createdAt, new Date(date_from)));
          if (date_to) conditions.push(lte(schema.orders.createdAt, new Date(date_to)));
          const byStatus = await db.select({ status: schema.orders.status, count: sql<number>`COUNT(*)`, total: sql<number>`SUM(${schema.orders.roundedTotal}::numeric)` }).from(schema.orders).where(conditions.length ? and(...conditions) : undefined).groupBy(schema.orders.status).orderBy(desc(sql`COUNT(*)`));
          // Money from the canonical engine: realized orders only, collected − shipping.
          const [summaryCounts] = await db.select({ total_orders: sql<number>`COUNT(*)` }).from(schema.orders).where(conditions.length ? and(...conditions) : undefined);
          const summaryFin = await computePeriodFinancials(accountingDb, date_from ? new Date(date_from) : new Date(0), date_to ? new Date(date_to) : new Date());
          const overall = {
            total_orders: Number(summaryCounts?.total_orders ?? 0),
            total_revenue: summaryFin.revenue,
            avg_order_value: summaryFin.deliveredOrders > 0 ? Math.round(summaryFin.revenue / summaryFin.deliveredOrders) : 0,
            realized_orders: summaryFin.deliveredOrders,
            revenue_basis: "realized_collected_minus_shipping",
          };
          return { content: [{ type: "text", text: JSON.stringify(safe({ by_status: byStatus, overall }), null, 2) }] };
        }

        case "get_customers": {
          const { search, loyalty_tier, limit = 50, offset = 0 } = args as Record<string, any>;
          const conditions = [isNull(schema.users.deletedAt), eq(schema.users.role, "user")];
          if (loyalty_tier) conditions.push(eq(schema.users.loyaltyTier, loyalty_tier));
          if (search) conditions.push(or(ilike(schema.users.fullName, `%${search}%`), ilike(schema.users.email, `%${search}%`), ilike(schema.users.phone, `%${search}%`)));
          const rows = await db.select({ id: schema.users.id, email: schema.users.email, fullName: schema.users.fullName, phone: schema.users.phone, loyaltyPoints: schema.users.loyaltyPoints, loyaltyTier: schema.users.loyaltyTier, cashbackBalance: schema.users.cashbackBalance, totalSpent: schema.users.totalSpent, createdAt: schema.users.createdAt }).from(schema.users).where(and(...conditions)).orderBy(desc(schema.users.createdAt)).limit(Math.min(Number(limit), 200)).offset(Number(offset));
          return { content: [{ type: "text", text: JSON.stringify(safe(rows), null, 2) }] };
        }

        case "get_customer": {
          const { id, email } = args as Record<string, string>;
          if (!id && !email) throw new Error("يجب توفير id أو email");
          const [user] = await db.select({ id: schema.users.id, email: schema.users.email, fullName: schema.users.fullName, phone: schema.users.phone, loyaltyPoints: schema.users.loyaltyPoints, loyaltyTier: schema.users.loyaltyTier, cashbackBalance: schema.users.cashbackBalance, totalSpent: schema.users.totalSpent, aquariumProfile: schema.users.aquariumProfile, createdAt: schema.users.createdAt }).from(schema.users).where(id ? eq(schema.users.id, id) : eq(schema.users.email, email)).limit(1);
          if (!user) throw new Error("الزبون غير موجود");
          const orders = await db.select({ id: schema.orders.id, orderNumber: schema.orders.orderNumber, status: schema.orders.status, total: schema.orders.roundedTotal, createdAt: schema.orders.createdAt }).from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.createdAt)).limit(10);
          const cart = await db.select({ productId: schema.cartItems.productId, quantity: schema.cartItems.quantity, variantLabel: schema.cartItems.variantLabel }).from(schema.cartItems).where(eq(schema.cartItems.userId, user.id));
          return { content: [{ type: "text", text: JSON.stringify(safe({ customer: user, recent_orders: orders, cart }), null, 2) }] };
        }

        case "get_dashboard_stats": {
          const { period = "30d" } = args as Record<string, any>;
          const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
          const since = new Date(); since.setDate(since.getDate() - days);
          // Canonical realized financials for the window.
          const dashFin = await computePeriodFinancials(accountingDb, since, new Date());
          const revenue = {
            orders_count: dashFin.deliveredOrders,
            revenue: dashFin.revenue,
            avg_order: dashFin.deliveredOrders > 0 ? Math.round(dashFin.revenue / dashFin.deliveredOrders) : 0,
            revenue_basis: "realized_collected_minus_shipping",
          };
          const [pendingOrders] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.orders).where(eq(schema.orders.status, "pending"));
          const [newCustomers] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.users).where(and(gte(schema.users.createdAt, since), isNull(schema.users.deletedAt), eq(schema.users.role, "user")));
          const [totalCustomers] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.users).where(and(isNull(schema.users.deletedAt), eq(schema.users.role, "user")));
          const [totalProducts] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.products).where(isNull(schema.products.deletedAt));
          const [outOfStock] = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.products).where(and(isNull(schema.products.deletedAt), eq(schema.products.stock, 0)));
          return { content: [{ type: "text", text: JSON.stringify(safe({ period, revenue_and_orders: revenue, pending_orders: pendingOrders.count, new_customers_in_period: newCustomers.count, total_customers: totalCustomers.count, total_products: totalProducts.count, out_of_stock_products: outOfStock.count }), null, 2) }] };
        }

        case "get_revenue_breakdown": {
          const { period = "30d" } = args as Record<string, any>;
          const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
          const since = new Date(); since.setDate(since.getDate() - days);
          // Only the order-SOURCE split stays a count query; money comes from the engine.
          const [srcCounts] = await db.select({ total_orders: sql<number>`COUNT(*)`, whatsapp_orders: sql<number>`SUM(CASE WHEN ${schema.orders.source} = 'whatsapp' THEN 1 ELSE 0 END)`, website_orders: sql<number>`SUM(CASE WHEN ${schema.orders.source} = 'website' THEN 1 ELSE 0 END)` }).from(schema.orders).where(gte(schema.orders.createdAt, since));
          const breakdownNow = new Date();
          const fin = await computePeriodFinancials(accountingDb, since, breakdownNow);
          const realizedForBreakdown = await getRealizedOrdersForPeriod(accountingDb, since, breakdownNow);
          const breakdown = {
            total_orders: Number(srcCounts?.total_orders ?? 0),
            confirmed_orders: fin.deliveredOrders,
            total_revenue: fin.revenue,
            total_shipping: Math.round(realizedForBreakdown.reduce((s, o) => s + toMoney(o.shippingCost), 0)),
            total_discounts: Math.round(realizedForBreakdown.reduce((s, o) => s + toMoney(o.discountTotal), 0)),
            total_box_cost: fin.packaging,
            cogs: fin.cogs,
            gross_profit: fin.grossProfit,
            expenses_total: fin.expensesTotal,
            final_net_profit: fin.finalNetProfit,
            // NULL = UNKNOWN, never 0.
            exact_cogs: fin.exactCogs,
            exact_final_net_profit: fin.exactFinalNetProfit,
            cost_status: fin.costStatus,
            orders_with_incomplete_cost: fin.ordersWithIncompleteCost,
            whatsapp_orders: Number(srcCounts?.whatsapp_orders ?? 0),
            website_orders: Number(srcCounts?.website_orders ?? 0),
          };
          return { content: [{ type: "text", text: JSON.stringify(safe({ period, ...breakdown }), null, 2) }] };
        }

        case "get_top_products": {
          const { period = "30d", limit = 10 } = args as Record<string, any>;
          const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
          const since = new Date(); since.setDate(since.getDate() - days);
          // Realized orders only, via the canonical filter.
          const recentOrders = await getRealizedOrdersForPeriod(accountingDb, since, new Date());
          const productSales: Record<string, { qty: number; revenue: number }> = {};
          for (const order of recentOrders) {
            if (!Array.isArray(order.items)) continue;
            for (const item of order.items as OrderLineItem[]) {
              if (!item.productId) continue;
              if (!productSales[item.productId]) productSales[item.productId] = { qty: 0, revenue: 0 };
              const qty = lineQuantity(item);
              productSales[item.productId].qty += qty;
              productSales[item.productId].revenue += toMoney(item.priceAtPurchase) * qty;
            }
          }
          const sorted = Object.entries(productSales).sort((a, b) => b[1].qty - a[1].qty).slice(0, Number(limit));
          const enriched = await Promise.all(sorted.map(async ([productId, stats]) => {
            const [p] = await db.select({ name: schema.products.name }).from(schema.products).where(eq(schema.products.id, productId)).limit(1);
            return { productId, name: p?.name ?? "غير معروف", ...stats };
          }));
          return { content: [{ type: "text", text: JSON.stringify(safe(enriched), null, 2) }] };
        }

        case "get_reviews": {
          const { product_id, status, min_rating, limit = 50 } = args as Record<string, any>;
          const conditions = [];
          if (product_id) conditions.push(eq(schema.reviews.productId, product_id));
          if (status) conditions.push(eq(schema.reviews.status, status));
          if (min_rating) conditions.push(gte(schema.reviews.rating, Number(min_rating)));
          const rows = await db.select({ id: schema.reviews.id, productId: schema.reviews.productId, rating: schema.reviews.rating, title: schema.reviews.title, comment: schema.reviews.comment, status: schema.reviews.status, verifiedPurchase: schema.reviews.verifiedPurchase, createdAt: schema.reviews.createdAt }).from(schema.reviews).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(schema.reviews.createdAt)).limit(Math.min(Number(limit), 100));
          return { content: [{ type: "text", text: JSON.stringify(safe(rows), null, 2) }] };
        }

        case "get_coupons": {
          const { active_only } = args as Record<string, any>;
          const conditions = active_only ? [eq(schema.coupons.isActive, true)] : [];
          const rows = await db.select().from(schema.coupons).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(schema.coupons.createdAt));
          return { content: [{ type: "text", text: JSON.stringify(safe(rows), null, 2) }] };
        }

        case "get_expenses": {
          const { category, date_from, date_to, limit = 50 } = args as Record<string, any>;
          const conditions = [isNull(schema.expenses.deletedAt)];
          if (category) conditions.push(ilike(schema.expenses.category, `%${category}%`));
          if (date_from) conditions.push(gte(schema.expenses.expenseDate, new Date(date_from)));
          if (date_to) conditions.push(lte(schema.expenses.expenseDate, new Date(date_to)));
          const rows = await db.select().from(schema.expenses).where(and(...conditions)).orderBy(desc(schema.expenses.expenseDate)).limit(Math.min(Number(limit), 200));
          const [totals] = await db.select({ total: sql<number>`SUM(${schema.expenses.amount}::numeric)` }).from(schema.expenses).where(and(...conditions));
          return { content: [{ type: "text", text: JSON.stringify(safe({ total: totals.total, expenses: rows }), null, 2) }] };
        }

        case "search": {
          const { query } = args as Record<string, string>;
          if (!query?.trim()) throw new Error("يجب توفير نص للبحث");
          const q = `%${query}%`;
          const [products_res, orders_res, customers_res] = await Promise.all([
            db.select({ id: schema.products.id, name: schema.products.name, price: schema.products.price, stock: schema.products.stock, category: schema.products.category }).from(schema.products).where(and(isNull(schema.products.deletedAt), or(ilike(schema.products.name, q), ilike(schema.products.brand, q)))).limit(10),
            db.select({ id: schema.orders.id, orderNumber: schema.orders.orderNumber, status: schema.orders.status, total: schema.orders.roundedTotal, customerName: schema.orders.customerName, customerPhone: schema.orders.customerPhone, createdAt: schema.orders.createdAt }).from(schema.orders).where(or(ilike(schema.orders.customerName, q), ilike(schema.orders.customerPhone, q), ilike(schema.orders.orderNumber, q))).limit(10),
            db.select({ id: schema.users.id, email: schema.users.email, fullName: schema.users.fullName, phone: schema.users.phone }).from(schema.users).where(and(isNull(schema.users.deletedAt), or(ilike(schema.users.fullName, q), ilike(schema.users.email, q), ilike(schema.users.phone, q)))).limit(10),
          ]);
          return { content: [{ type: "text", text: JSON.stringify(safe({ products: products_res, orders: orders_res, customers: customers_res }), null, 2) }] };
        }

        default:
          throw new Error(`أداة غير معروفة: ${name}`);
      }
    } catch (err) {
      console.error(`[MCP ERROR] tool=${name}`, err);
      return { content: [{ type: "text", text: "خطأ داخلي — راجع سجلات الـ server" }], isError: true };
    }
  });

  return server;
}

// ─── HTTP Server ───────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3333);

// Session store with TTL (30 min) and max cap (100) to prevent unbounded memory growth
const MAX_SESSIONS = 100;
const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; lastSeen: number }>();

function reapSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of sessions) if (s.lastSeen < cutoff) { s.transport.close().catch(() => {}); sessions.delete(id); }
}
setInterval(reapSessions, 5 * 60 * 1000);

const httpServer = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Bearer token check — constant-time to prevent timing attacks
  const auth = req.headers["authorization"] ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const tokenBuf = Buffer.from(bearer);
  const expectedBuf = Buffer.from(MCP_TOKEN);
  const tokenOk = tokenBuf.length === expectedBuf.length && timingSafeEqual(tokenBuf, expectedBuf);
  if (!tokenOk) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "aquavo-store", version: "1.0.0" }));
    return;
  }

  // MCP endpoint
  if (req.url === "/mcp" || req.url === "/") {
    const sessionId = (req.headers["mcp-session-id"] as string) || randomUUID();

    if (req.method === "DELETE") {
      const e = sessions.get(sessionId);
      if (e) { await e.transport.close(); sessions.delete(sessionId); }
      res.writeHead(200); res.end();
      return;
    }

    let entry = sessions.get(sessionId);
    if (!entry) {
      // Reject unknown client-supplied IDs — only server-generated UUIDs can create sessions
      const isServerGenerated = req.headers["mcp-session-id"] === undefined;
      if (!isServerGenerated && sessions.has(sessionId) === false) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unknown session" }));
        return;
      }
      if (sessions.size >= MAX_SESSIONS) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Too many sessions" }));
        return;
      }
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => sessionId });
      const mcpServer = buildMcpServer();
      await mcpServer.connect(transport);
      entry = { transport, lastSeen: Date.now() };
      sessions.set(sessionId, entry);
      transport.onclose = () => sessions.delete(sessionId);
    } else {
      entry.lastSeen = Date.now();
    }

    await entry.transport.handleRequest(req, res);
    return;
  }

  res.writeHead(404); res.end("Not found");
});

httpServer.listen(PORT, () => {
  console.log(`[AQUAVO MCP HTTP] Server running on port ${PORT}`);
  console.log(`[AQUAVO MCP HTTP] MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`[AQUAVO MCP HTTP] Health check: http://localhost:${PORT}/health`);
});
