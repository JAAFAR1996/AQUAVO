/**
 * AQUAVO MCP Server
 *
 * MCP server يعطي أي AI وصول كامل لقراءة بيانات موقع AQUAVO:
 * منتجات، طلبات، زبائن، أرقام، مراجعات، كوبونات، مصاريف.
 *
 * تشغيل: node --loader ts-node/esm server/aquavo-mcp.ts
 * أو مع tsx: npx tsx server/aquavo-mcp.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
  like,
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

// ─── DB Setup ────────────────────────────────────────────────────────────────

neonConfig.webSocketConstructor = ws;
const rawUrl = process.env.DATABASE_URL ?? "";
const databaseUrl = rawUrl.replace(/[&?]channel_binding=require/g, "");

if (!databaseUrl) {
  console.error("[AQUAVO MCP] DATABASE_URL غير موجود");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl, max: 3 });
const db = drizzle(pool, { schema });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** تحويل BigInt/Decimal لـ JSON آمن */
function safe(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) =>
      typeof v === "bigint" ? Number(v) : v
    )
  );
}

/** نص محدود الطول */
function truncate(s: string | null | undefined, n = 200): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "aquavo-store", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool Definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ── Products ──
    {
      name: "get_products",
      description:
        "قائمة منتجات AQUAVO مع تفاصيل السعر، المخزون، الفئة، العلامة التجارية. يدعم فلترة وبحث.",
      inputSchema: {
        type: "object",
        properties: {
          search: { type: "string", description: "بحث بالاسم أو الوصف" },
          category: { type: "string", description: "فلتر بالفئة" },
          brand: { type: "string", description: "فلتر بالعلامة التجارية" },
          in_stock_only: { type: "boolean", description: "فقط المنتجات المتوفرة" },
          low_stock_only: { type: "boolean", description: "فقط المنتجات منخفضة المخزون" },
          limit: { type: "number", description: "عدد النتائج (افتراضي 50)" },
          offset: { type: "number", description: "ترقيم الصفحات" },
          include_deleted: { type: "boolean", description: "شمل المنتجات المحذوفة" },
          sort_by: {
            type: "string",
            enum: ["price_asc", "price_desc", "newest", "stock_asc", "name"],
            description: "ترتيب النتائج",
          },
        },
      },
    },
    {
      name: "get_product",
      description: "تفاصيل منتج واحد بالكامل: مواصفات، متغيرات، مراجعات، تكلفة.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "معرّف المنتج" },
          slug: { type: "string", description: "slug المنتج" },
        },
      },
    },
    {
      name: "get_inventory_summary",
      description: "ملخص المخزون: إجمالي المنتجات، المنتجات المنتهية، منخفضة المخزون، ومتوسط المخزون.",
      inputSchema: { type: "object", properties: {} },
    },
    // ── Orders ──
    {
      name: "get_orders",
      description:
        "قائمة الطلبات مع تفاصيل العميل، المنتجات، المبالغ، الحالة. يدعم فلترة بالحالة والتاريخ.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "فلتر الحالة: pending, confirmed, delivered, cancelled, rejected...",
          },
          limit: { type: "number", description: "عدد النتائج (افتراضي 50)" },
          offset: { type: "number", description: "ترقيم الصفحات" },
          date_from: { type: "string", description: "من تاريخ (ISO 8601)" },
          date_to: { type: "string", description: "إلى تاريخ (ISO 8601)" },
          source: { type: "string", description: "مصدر الطلب: website أو whatsapp" },
          search: { type: "string", description: "بحث باسم العميل أو رقم الطلب أو البريد" },
        },
      },
    },
    {
      name: "get_order",
      description: "تفاصيل طلب واحد: المنتجات، العميل، المبالغ، تتبع الحالة.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "معرّف الطلب (UUID)" },
          order_number: { type: "string", description: "رقم الطلب" },
        },
      },
    },
    {
      name: "get_orders_summary",
      description: "ملخص الطلبات: العدد والمبالغ مجمّعة حسب الحالة.",
      inputSchema: {
        type: "object",
        properties: {
          date_from: { type: "string", description: "من تاريخ (ISO 8601)" },
          date_to: { type: "string", description: "إلى تاريخ (ISO 8601)" },
        },
      },
    },
    // ── Customers / Users ──
    {
      name: "get_customers",
      description: "قائمة الزبائن مع معلومات التواصل، الولاء، تاريخ التسجيل.",
      inputSchema: {
        type: "object",
        properties: {
          search: { type: "string", description: "بحث بالاسم أو البريد أو رقم الهاتف" },
          role: { type: "string", description: "user أو admin" },
          limit: { type: "number", description: "عدد النتائج (افتراضي 50)" },
          offset: { type: "number", description: "ترقيم الصفحات" },
          loyalty_tier: { type: "string", description: "فلتر بالمستوى: bronze, silver, gold, platinum" },
        },
      },
    },
    {
      name: "get_customer",
      description: "تفاصيل زبون واحد: طلباته، نقاط الولاء، سلة التسوق، المفضلة.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "معرّف المستخدم" },
          email: { type: "string", description: "البريد الإلكتروني" },
        },
      },
    },
    // ── Analytics & Dashboard ──
    {
      name: "get_dashboard_stats",
      description:
        "إحصائيات لوحة التحكم الرئيسية: إجمالي الإيرادات، عدد الطلبات، الزبائن، المنتجات، وأرقام اليوم.",
      inputSchema: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["7d", "30d", "90d"],
            description: "الفترة الزمنية (افتراضي 30d)",
          },
        },
      },
    },
    {
      name: "get_revenue_breakdown",
      description: "تفصيل الإيرادات: مبيعات، شحن، خصومات، أرباح، تكاليف — حسب الفترة.",
      inputSchema: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["7d", "30d", "90d"],
            description: "الفترة الزمنية (افتراضي 30d)",
          },
        },
      },
    },
    {
      name: "get_top_products",
      description: "أكثر المنتجات مبيعاً حسب الفترة الزمنية.",
      inputSchema: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["7d", "30d", "90d"],
            description: "الفترة الزمنية (افتراضي 30d)",
          },
          limit: { type: "number", description: "عدد النتائج (افتراضي 10)" },
        },
      },
    },
    // ── Reviews ──
    {
      name: "get_reviews",
      description: "مراجعات المنتجات مع التقييم والتعليق ومعلومات المستخدم.",
      inputSchema: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "فلتر بمعرّف المنتج" },
          status: { type: "string", description: "approved, pending, rejected" },
          min_rating: { type: "number", description: "أقل تقييم (1-5)" },
          limit: { type: "number", description: "عدد النتائج (افتراضي 50)" },
        },
      },
    },
    // ── Coupons ──
    {
      name: "get_coupons",
      description: "قائمة الكوبونات: الكود، نوع الخصم، القيمة، الاستخدام، الصلاحية.",
      inputSchema: {
        type: "object",
        properties: {
          active_only: { type: "boolean", description: "فقط الكوبونات النشطة" },
        },
      },
    },
    // ── Expenses ──
    {
      name: "get_expenses",
      description: "مصاريف المتجر: إيجار، رواتب، تسويق، شحن، وغيرها.",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string", description: "فلتر بالفئة" },
          date_from: { type: "string", description: "من تاريخ" },
          date_to: { type: "string", description: "إلى تاريخ" },
          limit: { type: "number", description: "عدد النتائج (افتراضي 50)" },
        },
      },
    },
    // ── Global Search ──
    {
      name: "search",
      description:
        "بحث شامل في المنتجات، الطلبات، والزبائن دفعة واحدة.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "نص البحث" },
        },
        required: ["query"],
      },
    },
  ],
}));

// ─── Tool Handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      // ──────────────────────────────────────────────────────────────────────
      // PRODUCTS
      // ──────────────────────────────────────────────────────────────────────
      case "get_products": {
        const {
          search,
          category,
          brand,
          in_stock_only,
          low_stock_only,
          limit = 50,
          offset = 0,
          include_deleted = false,
          sort_by = "newest",
        } = args as Record<string, any>;

        const conditions = [];
        if (!include_deleted) conditions.push(isNull(schema.products.deletedAt));
        if (category) conditions.push(ilike(schema.products.category, `%${category}%`));
        if (brand) conditions.push(ilike(schema.products.brand, `%${brand}%`));
        if (in_stock_only) conditions.push(gt(schema.products.stock, 0));
        if (low_stock_only) {
          conditions.push(
            sql`${schema.products.stock} <= ${schema.products.lowStockThreshold} AND ${schema.products.stock} > 0`
          );
        }
        if (search) {
          conditions.push(
            or(
              ilike(schema.products.name, `%${search}%`),
              ilike(schema.products.description, `%${search}%`),
              ilike(schema.products.brand, `%${search}%`)
            )
          );
        }

        const orderBy =
          sort_by === "price_asc" ? asc(schema.products.price) :
          sort_by === "price_desc" ? desc(schema.products.price) :
          sort_by === "stock_asc" ? asc(schema.products.stock) :
          sort_by === "name" ? asc(schema.products.name) :
          desc(schema.products.createdAt);

        const rows = await db
          .select({
            id: schema.products.id,
            slug: schema.products.slug,
            name: schema.products.name,
            brand: schema.products.brand,
            category: schema.products.category,
            subcategory: schema.products.subcategory,
            price: schema.products.price,
            originalPrice: schema.products.originalPrice,
            stock: schema.products.stock,
            lowStockThreshold: schema.products.lowStockThreshold,
            rating: schema.products.rating,
            reviewCount: schema.products.reviewCount,
            isNew: schema.products.isNew,
            isBestSeller: schema.products.isBestSeller,
            isProductOfWeek: schema.products.isProductOfWeek,
            hasVariants: schema.products.hasVariants,
            thumbnail: schema.products.thumbnail,
            costPrice: schema.products.costPrice,
            packagingCost: schema.products.packagingCost,
            insertCost: schema.products.insertCost,
            createdAt: schema.products.createdAt,
            deletedAt: schema.products.deletedAt,
          })
          .from(schema.products)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(orderBy)
          .limit(Math.min(Number(limit), 200))
          .offset(Number(offset));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe(rows), null, 2),
            },
          ],
        };
      }

      case "get_product": {
        const { id, slug } = args as Record<string, string>;
        if (!id && !slug) throw new Error("يجب توفير id أو slug");

        const condition = id
          ? eq(schema.products.id, id)
          : eq(schema.products.slug, slug);

        const [product] = await db
          .select()
          .from(schema.products)
          .where(condition)
          .limit(1);

        if (!product) throw new Error("المنتج غير موجود");

        // جلب المراجعات
        const reviews = await db
          .select({
            id: schema.reviews.id,
            rating: schema.reviews.rating,
            title: schema.reviews.title,
            comment: schema.reviews.comment,
            status: schema.reviews.status,
            createdAt: schema.reviews.createdAt,
          })
          .from(schema.reviews)
          .where(eq(schema.reviews.productId, product.id))
          .orderBy(desc(schema.reviews.createdAt))
          .limit(10);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe({ product, reviews }), null, 2),
            },
          ],
        };
      }

      case "get_inventory_summary": {
        const [totals] = await db
          .select({
            total: sql<number>`COUNT(*)`,
            out_of_stock: sql<number>`SUM(CASE WHEN ${schema.products.stock} = 0 THEN 1 ELSE 0 END)`,
            low_stock: sql<number>`SUM(CASE WHEN ${schema.products.stock} > 0 AND ${schema.products.stock} <= ${schema.products.lowStockThreshold} THEN 1 ELSE 0 END)`,
            in_stock: sql<number>`SUM(CASE WHEN ${schema.products.stock} > ${schema.products.lowStockThreshold} THEN 1 ELSE 0 END)`,
            avg_stock: sql<number>`AVG(${schema.products.stock})`,
            total_stock_value: sql<number>`SUM(${schema.products.stock} * ${schema.products.costPrice}::numeric)`,
          })
          .from(schema.products)
          .where(isNull(schema.products.deletedAt));

        // أكثر المنتجات نقصاً في المخزون
        const critical = await db
          .select({
            id: schema.products.id,
            name: schema.products.name,
            stock: schema.products.stock,
            lowStockThreshold: schema.products.lowStockThreshold,
          })
          .from(schema.products)
          .where(
            and(
              isNull(schema.products.deletedAt),
              sql`${schema.products.stock} <= ${schema.products.lowStockThreshold}`
            )
          )
          .orderBy(asc(schema.products.stock))
          .limit(20);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe({ summary: totals, critical_items: critical }), null, 2),
            },
          ],
        };
      }

      // ──────────────────────────────────────────────────────────────────────
      // ORDERS
      // ──────────────────────────────────────────────────────────────────────
      case "get_orders": {
        const {
          status,
          limit = 50,
          offset = 0,
          date_from,
          date_to,
          source,
          search,
        } = args as Record<string, any>;

        const conditions = [];
        if (status) conditions.push(eq(schema.orders.status, status));
        if (source) conditions.push(eq(schema.orders.source, source));
        if (date_from) conditions.push(gte(schema.orders.createdAt, new Date(date_from)));
        if (date_to) conditions.push(lte(schema.orders.createdAt, new Date(date_to)));
        if (search) {
          conditions.push(
            or(
              ilike(schema.orders.customerName, `%${search}%`),
              ilike(schema.orders.customerEmail, `%${search}%`),
              ilike(schema.orders.customerPhone, `%${search}%`),
              ilike(schema.orders.orderNumber, `%${search}%`)
            )
          );
        }

        const rows = await db
          .select({
            id: schema.orders.id,
            orderNumber: schema.orders.orderNumber,
            status: schema.orders.status,
            paymentStatus: schema.orders.paymentStatus,
            total: schema.orders.total,
            roundedTotal: schema.orders.roundedTotal,
            shippingCost: schema.orders.shippingCost,
            discountTotal: schema.orders.discountTotal,
            customerName: schema.orders.customerName,
            customerEmail: schema.orders.customerEmail,
            customerPhone: schema.orders.customerPhone,
            source: schema.orders.source,
            carrier: schema.orders.carrier,
            codReceived: schema.orders.codReceived,
            boxCost: schema.orders.boxCost,
            financiallyCounted: schema.orders.financiallyCounted,
            shippingAddress: schema.orders.shippingAddress,
            items: schema.orders.items,
            createdAt: schema.orders.createdAt,
          })
          .from(schema.orders)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(schema.orders.createdAt))
          .limit(Math.min(Number(limit), 200))
          .offset(Number(offset));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe(rows), null, 2),
            },
          ],
        };
      }

      case "get_order": {
        const { id, order_number } = args as Record<string, string>;
        if (!id && !order_number) throw new Error("يجب توفير id أو order_number");

        const condition = id
          ? eq(schema.orders.id, id)
          : eq(schema.orders.orderNumber, order_number);

        const [order] = await db
          .select()
          .from(schema.orders)
          .where(condition)
          .limit(1);

        if (!order) throw new Error("الطلب غير موجود");

        // جلب بيانات المستخدم إن وُجد
        let customer = null;
        if ((order as any).userId) {
          const [u] = await db
            .select({
              id: schema.users.id,
              email: schema.users.email,
              fullName: schema.users.fullName,
              phone: schema.users.phone,
              loyaltyTier: schema.users.loyaltyTier,
              loyaltyPoints: schema.users.loyaltyPoints,
            })
            .from(schema.users)
            .where(eq(schema.users.id, (order as any).userId))
            .limit(1);
          customer = u || null;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe({ order, customer }), null, 2),
            },
          ],
        };
      }

      case "get_orders_summary": {
        const { date_from, date_to } = args as Record<string, any>;

        const conditions = [];
        if (date_from) conditions.push(gte(schema.orders.createdAt, new Date(date_from)));
        if (date_to) conditions.push(lte(schema.orders.createdAt, new Date(date_to)));

        const byStatus = await db
          .select({
            status: schema.orders.status,
            count: sql<number>`COUNT(*)`,
            total: sql<number>`SUM(${schema.orders.roundedTotal}::numeric)`,
          })
          .from(schema.orders)
          .where(conditions.length ? and(...conditions) : undefined)
          .groupBy(schema.orders.status)
          .orderBy(desc(sql`COUNT(*)`));

        const [overall] = await db
          .select({
            total_orders: sql<number>`COUNT(*)`,
            total_revenue: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.roundedTotal}::numeric ELSE 0 END)`,
            total_shipping: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.shippingCost}::numeric ELSE 0 END)`,
            avg_order_value: sql<number>`AVG(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.roundedTotal}::numeric END)`,
          })
          .from(schema.orders)
          .where(conditions.length ? and(...conditions) : undefined);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe({ by_status: byStatus, overall }), null, 2),
            },
          ],
        };
      }

      // ──────────────────────────────────────────────────────────────────────
      // CUSTOMERS
      // ──────────────────────────────────────────────────────────────────────
      case "get_customers": {
        const {
          search,
          role,
          limit = 50,
          offset = 0,
          loyalty_tier,
        } = args as Record<string, any>;

        const conditions = [isNull(schema.users.deletedAt)];
        if (role) conditions.push(eq(schema.users.role, role));
        if (loyalty_tier) conditions.push(eq(schema.users.loyaltyTier, loyalty_tier));
        if (search) {
          conditions.push(
            or(
              ilike(schema.users.fullName, `%${search}%`),
              ilike(schema.users.email, `%${search}%`),
              ilike(schema.users.phone, `%${search}%`)
            )
          );
        }

        const rows = await db
          .select({
            id: schema.users.id,
            email: schema.users.email,
            fullName: schema.users.fullName,
            phone: schema.users.phone,
            role: schema.users.role,
            emailVerified: schema.users.emailVerified,
            loyaltyPoints: schema.users.loyaltyPoints,
            loyaltyTier: schema.users.loyaltyTier,
            cashbackBalance: schema.users.cashbackBalance,
            totalSpent: schema.users.totalSpent,
            createdAt: schema.users.createdAt,
          })
          .from(schema.users)
          .where(and(...conditions))
          .orderBy(desc(schema.users.createdAt))
          .limit(Math.min(Number(limit), 200))
          .offset(Number(offset));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe(rows), null, 2),
            },
          ],
        };
      }

      case "get_customer": {
        const { id, email } = args as Record<string, string>;
        if (!id && !email) throw new Error("يجب توفير id أو email");

        const condition = id
          ? eq(schema.users.id, id)
          : eq(schema.users.email, email);

        const [user] = await db
          .select({
            id: schema.users.id,
            email: schema.users.email,
            fullName: schema.users.fullName,
            phone: schema.users.phone,
            role: schema.users.role,
            emailVerified: schema.users.emailVerified,
            loyaltyPoints: schema.users.loyaltyPoints,
            pendingLoyaltyPoints: schema.users.pendingLoyaltyPoints,
            loyaltyTier: schema.users.loyaltyTier,
            cashbackBalance: schema.users.cashbackBalance,
            totalSpent: schema.users.totalSpent,
            aquariumProfile: schema.users.aquariumProfile,
            birthDate: schema.users.birthDate,
            createdAt: schema.users.createdAt,
          })
          .from(schema.users)
          .where(condition)
          .limit(1);

        if (!user) throw new Error("الزبون غير موجود");

        // آخر طلبات الزبون
        const orders = await db
          .select({
            id: schema.orders.id,
            orderNumber: schema.orders.orderNumber,
            status: schema.orders.status,
            total: schema.orders.roundedTotal,
            createdAt: schema.orders.createdAt,
          })
          .from(schema.orders)
          .where(eq(schema.orders.userId, user.id))
          .orderBy(desc(schema.orders.createdAt))
          .limit(10);

        // سلة التسوق الحالية
        const cart = await db
          .select({
            productId: schema.cartItems.productId,
            quantity: schema.cartItems.quantity,
            variantLabel: schema.cartItems.variantLabel,
          })
          .from(schema.cartItems)
          .where(eq(schema.cartItems.userId, user.id));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe({ customer: user, recent_orders: orders, cart }), null, 2),
            },
          ],
        };
      }

      // ──────────────────────────────────────────────────────────────────────
      // ANALYTICS & DASHBOARD
      // ──────────────────────────────────────────────────────────────────────
      case "get_dashboard_stats": {
        const { period = "30d" } = args as Record<string, any>;
        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [revenue] = await db
          .select({
            orders_count: sql<number>`COUNT(*)`,
            revenue: sql<number>`SUM(${schema.orders.roundedTotal}::numeric)`,
            avg_order: sql<number>`AVG(${schema.orders.roundedTotal}::numeric)`,
          })
          .from(schema.orders)
          .where(
            and(
              gte(schema.orders.createdAt, since),
              sql`${schema.orders.status} IN ('delivered', 'confirmed')`
            )
          );

        const [pendingOrders] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(schema.orders)
          .where(eq(schema.orders.status, "pending"));

        const [newCustomers] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(schema.users)
          .where(
            and(
              gte(schema.users.createdAt, since),
              isNull(schema.users.deletedAt),
              eq(schema.users.role, "user")
            )
          );

        const [totalCustomers] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(schema.users)
          .where(and(isNull(schema.users.deletedAt), eq(schema.users.role, "user")));

        const [totalProducts] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(schema.products)
          .where(isNull(schema.products.deletedAt));

        const [outOfStock] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(schema.products)
          .where(and(isNull(schema.products.deletedAt), eq(schema.products.stock, 0)));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                safe({
                  period,
                  revenue_and_orders: revenue,
                  pending_orders: pendingOrders.count,
                  new_customers_in_period: newCustomers.count,
                  total_customers: totalCustomers.count,
                  total_products: totalProducts.count,
                  out_of_stock_products: outOfStock.count,
                }),
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_revenue_breakdown": {
        const { period = "30d" } = args as Record<string, any>;
        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [breakdown] = await db
          .select({
            total_orders: sql<number>`COUNT(*)`,
            confirmed_orders: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN 1 ELSE 0 END)`,
            total_revenue: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.roundedTotal}::numeric ELSE 0 END)`,
            total_shipping: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.shippingCost}::numeric ELSE 0 END)`,
            total_discounts: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.discountTotal}::numeric ELSE 0 END)`,
            total_box_cost: sql<number>`SUM(CASE WHEN ${schema.orders.status} IN ('delivered','confirmed') THEN ${schema.orders.boxCost}::numeric ELSE 0 END)`,
            whatsapp_orders: sql<number>`SUM(CASE WHEN ${schema.orders.source} = 'whatsapp' THEN 1 ELSE 0 END)`,
            website_orders: sql<number>`SUM(CASE WHEN ${schema.orders.source} = 'website' THEN 1 ELSE 0 END)`,
          })
          .from(schema.orders)
          .where(gte(schema.orders.createdAt, since));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe({ period, ...breakdown }), null, 2),
            },
          ],
        };
      }

      case "get_top_products": {
        const { period = "30d", limit = 10 } = args as Record<string, any>;
        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
        const since = new Date();
        since.setDate(since.getDate() - days);

        // جلب الطلبات المكتملة في الفترة
        const recentOrders = await db
          .select({ items: schema.orders.items, total: schema.orders.roundedTotal })
          .from(schema.orders)
          .where(
            and(
              gte(schema.orders.createdAt, since),
              sql`${schema.orders.status} IN ('delivered', 'confirmed')`
            )
          );

        // تجميع الكميات حسب المنتج
        const productSales: Record<string, { qty: number; revenue: number }> = {};
        for (const order of recentOrders) {
          if (!Array.isArray(order.items)) continue;
          for (const item of order.items as any[]) {
            if (!item.productId) continue;
            if (!productSales[item.productId]) productSales[item.productId] = { qty: 0, revenue: 0 };
            productSales[item.productId].qty += Number(item.quantity) || 1;
            productSales[item.productId].revenue +=
              (Number(item.priceAtPurchase) || 0) * (Number(item.quantity) || 1);
          }
        }

        // ترتيب وجلب اسم المنتج
        const sorted = Object.entries(productSales)
          .sort((a, b) => b[1].qty - a[1].qty)
          .slice(0, Number(limit));

        const enriched = await Promise.all(
          sorted.map(async ([productId, stats]) => {
            const [p] = await db
              .select({ name: schema.products.name, price: schema.products.price })
              .from(schema.products)
              .where(eq(schema.products.id, productId))
              .limit(1);
            return { productId, name: p?.name ?? "غير معروف", ...stats };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe(enriched), null, 2),
            },
          ],
        };
      }

      // ──────────────────────────────────────────────────────────────────────
      // REVIEWS
      // ──────────────────────────────────────────────────────────────────────
      case "get_reviews": {
        const { product_id, status, min_rating, limit = 50 } = args as Record<string, any>;

        const conditions = [];
        if (product_id) conditions.push(eq(schema.reviews.productId, product_id));
        if (status) conditions.push(eq(schema.reviews.status, status));
        if (min_rating) conditions.push(gte(schema.reviews.rating, Number(min_rating)));

        const rows = await db
          .select({
            id: schema.reviews.id,
            productId: schema.reviews.productId,
            userId: schema.reviews.userId,
            rating: schema.reviews.rating,
            title: schema.reviews.title,
            comment: schema.reviews.comment,
            status: schema.reviews.status,
            verifiedPurchase: schema.reviews.verifiedPurchase,
            helpfulCount: schema.reviews.helpfulCount,
            createdAt: schema.reviews.createdAt,
          })
          .from(schema.reviews)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(schema.reviews.createdAt))
          .limit(Math.min(Number(limit), 100));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe(rows), null, 2),
            },
          ],
        };
      }

      // ──────────────────────────────────────────────────────────────────────
      // COUPONS
      // ──────────────────────────────────────────────────────────────────────
      case "get_coupons": {
        const { active_only } = args as Record<string, any>;

        const conditions = [];
        if (active_only) conditions.push(eq(schema.coupons.isActive, true));

        const rows = await db
          .select()
          .from(schema.coupons)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(schema.coupons.createdAt));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe(rows), null, 2),
            },
          ],
        };
      }

      // ──────────────────────────────────────────────────────────────────────
      // EXPENSES
      // ──────────────────────────────────────────────────────────────────────
      case "get_expenses": {
        const { category, date_from, date_to, limit = 50 } = args as Record<string, any>;

        const conditions = [isNull(schema.expenses.deletedAt)];
        if (category) conditions.push(ilike(schema.expenses.category, `%${category}%`));
        if (date_from) conditions.push(gte(schema.expenses.expenseDate, new Date(date_from)));
        if (date_to) conditions.push(lte(schema.expenses.expenseDate, new Date(date_to)));

        const rows = await db
          .select()
          .from(schema.expenses)
          .where(and(...conditions))
          .orderBy(desc(schema.expenses.expenseDate))
          .limit(Math.min(Number(limit), 200));

        // إجمالي المصاريف
        const [totals] = await db
          .select({
            total: sql<number>`SUM(${schema.expenses.amount}::numeric)`,
          })
          .from(schema.expenses)
          .where(and(...conditions));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(safe({ total: totals.total, expenses: rows }), null, 2),
            },
          ],
        };
      }

      // ──────────────────────────────────────────────────────────────────────
      // GLOBAL SEARCH
      // ──────────────────────────────────────────────────────────────────────
      case "search": {
        const { query } = args as Record<string, string>;
        if (!query?.trim()) throw new Error("يجب توفير نص للبحث");

        const q = `%${query}%`;

        const [products_res, orders_res, customers_res] = await Promise.all([
          db
            .select({
              id: schema.products.id,
              name: schema.products.name,
              price: schema.products.price,
              stock: schema.products.stock,
              category: schema.products.category,
            })
            .from(schema.products)
            .where(
              and(
                isNull(schema.products.deletedAt),
                or(ilike(schema.products.name, q), ilike(schema.products.brand, q))
              )
            )
            .limit(10),

          db
            .select({
              id: schema.orders.id,
              orderNumber: schema.orders.orderNumber,
              status: schema.orders.status,
              total: schema.orders.roundedTotal,
              customerName: schema.orders.customerName,
              customerPhone: schema.orders.customerPhone,
              createdAt: schema.orders.createdAt,
            })
            .from(schema.orders)
            .where(
              or(
                ilike(schema.orders.customerName, q),
                ilike(schema.orders.customerPhone, q),
                ilike(schema.orders.orderNumber, q),
                ilike(schema.orders.customerEmail, q)
              )
            )
            .limit(10),

          db
            .select({
              id: schema.users.id,
              email: schema.users.email,
              fullName: schema.users.fullName,
              phone: schema.users.phone,
              loyaltyTier: schema.users.loyaltyTier,
            })
            .from(schema.users)
            .where(
              and(
                isNull(schema.users.deletedAt),
                or(
                  ilike(schema.users.fullName, q),
                  ilike(schema.users.email, q),
                  ilike(schema.users.phone, q)
                )
              )
            )
            .limit(10),
        ]);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                safe({ products: products_res, orders: orders_res, customers: customers_res }),
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`أداة غير معروفة: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `خطأ: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[AQUAVO MCP] Server running — ready for connections");
}

main().catch((err) => {
  console.error("[AQUAVO MCP] Fatal error:", err);
  process.exit(1);
});
