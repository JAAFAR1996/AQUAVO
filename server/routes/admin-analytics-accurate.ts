import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { createAnalyticsRouter } from "./analytics.js";

const router = Router();

const NEGATIVE_ORDER_STATUSES = [
  "cancelled",
  "rejected",
  "rejected_returned",
  "rejected_carrier",
  "returned",
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  rejected: "رفض الاستلام",
  rejected_returned: "مرفوض وراجع",
  rejected_carrier: "مرفوض من شركة النقل",
  returned: "مرتجع",
};

function getDays(value: unknown): number {
  if (value === "7d") return 7;
  if (value === "90d") return 90;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.min(Math.floor(numeric), 365);
  return 30;
}

function percentageChange(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

function rowsOf<T>(result: unknown): T[] {
  const rows = (result as { rows?: unknown[] } | null)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

function numberOf(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedSource(value: unknown): string {
  const source = String(value ?? "direct").trim().toLowerCase();
  if (["ig", "instagram.com"].includes(source)) return "instagram";
  if (["fb", "facebook.com", "facebook_dm"].includes(source)) return "facebook";
  if (["chatgpt", "chatgpt.com"].includes(source)) return "chatgpt.com";
  return source || "direct";
}

interface SummaryRow {
  total_orders: string | number;
  delivered_orders: string | number;
  active_orders: string | number;
  rejected_orders: string | number;
  delivered_revenue: string | number;
  previous_orders: string | number;
  previous_delivered_revenue: string | number;
  total_customers: string | number;
  previous_customers: string | number;
  new_customers: string | number;
  previous_new_customers: string | number;
  total_page_views: string | number;
  previous_page_views: string | number;
  unique_visitors: string | number;
  website_orders: string | number;
}

router.get("/", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    if (!db) {
      res.status(500).json({ message: "Database not connected" });
      return;
    }

    const period = typeof req.query.period === "string" ? req.query.period : "30d";
    const days = getDays(period);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

    const summaryResult = await db.execute(sql`
      WITH bounds AS (
        SELECT
          ${previousStartDate}::timestamp AS previous_start_at,
          ${startDate}::timestamp AS start_at,
          ${endDate}::timestamp AS end_at
      ),
      normalized_orders AS (
        SELECT
          o.*,
          COALESCE(o.rounded_total, o.total, 0)::numeric AS charged_total,
          CASE
            WHEN length(regexp_replace(
              translate(COALESCE(o.customer_phone, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
              '[^0-9]', '', 'g'
            )) >= 7
              THEN 'phone:' || right(regexp_replace(
                translate(COALESCE(o.customer_phone, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
                '[^0-9]', '', 'g'
              ), 10)
            WHEN NULLIF(btrim(COALESCE(o.customer_name, '')), '') IS NOT NULL
              THEN 'name:' || lower(btrim(o.customer_name))
            ELSE NULL
          END AS customer_key
        FROM orders o
      ),
      current_orders AS (
        SELECT no.*
        FROM normalized_orders no, bounds b
        WHERE no.created_at >= b.start_at AND no.created_at < b.end_at
      ),
      previous_orders AS (
        SELECT no.*
        FROM normalized_orders no, bounds b
        WHERE no.created_at >= b.previous_start_at AND no.created_at < b.start_at
      ),
      first_valid_order AS (
        SELECT customer_key, min(created_at) AS first_order_at
        FROM normalized_orders
        WHERE customer_key IS NOT NULL
          AND status NOT IN ('cancelled','rejected','rejected_returned','rejected_carrier','returned')
        GROUP BY customer_key
      ),
      current_views AS (
        SELECT pv.*,
          COALESCE(
            NULLIF(pv.session_id, ''),
            NULLIF(pv.user_id, ''),
            'ip:' || COALESCE(NULLIF(pv.ip_address, ''), pv.id)
          ) AS visitor_key
        FROM page_views pv, bounds b
        WHERE pv.created_at >= b.start_at AND pv.created_at < b.end_at
          AND pv.page_path NOT LIKE '/admin%'
          AND NOT EXISTS (
            SELECT 1 FROM users au WHERE au.id = pv.user_id AND au.role = 'admin'
          )
      ),
      previous_views AS (
        SELECT pv.*
        FROM page_views pv, bounds b
        WHERE pv.created_at >= b.previous_start_at AND pv.created_at < b.start_at
          AND pv.page_path NOT LIKE '/admin%'
          AND NOT EXISTS (
            SELECT 1 FROM users au WHERE au.id = pv.user_id AND au.role = 'admin'
          )
      )
      SELECT
        (SELECT count(*) FROM current_orders) AS total_orders,
        (SELECT count(*) FROM current_orders WHERE status = 'delivered') AS delivered_orders,
        (SELECT count(*) FROM current_orders
          WHERE status NOT IN ('delivered','cancelled','rejected','rejected_returned','rejected_carrier','returned')) AS active_orders,
        (SELECT count(*) FROM current_orders
          WHERE status IN ('cancelled','rejected','rejected_returned','rejected_carrier','returned')) AS rejected_orders,
        COALESCE((SELECT sum(charged_total) FROM current_orders WHERE status = 'delivered'), 0) AS delivered_revenue,
        (SELECT count(*) FROM previous_orders) AS previous_orders,
        COALESCE((SELECT sum(charged_total) FROM previous_orders WHERE status = 'delivered'), 0) AS previous_delivered_revenue,
        (SELECT count(DISTINCT customer_key) FROM current_orders
          WHERE customer_key IS NOT NULL
            AND status NOT IN ('cancelled','rejected','rejected_returned','rejected_carrier','returned')) AS total_customers,
        (SELECT count(DISTINCT customer_key) FROM previous_orders
          WHERE customer_key IS NOT NULL
            AND status NOT IN ('cancelled','rejected','rejected_returned','rejected_carrier','returned')) AS previous_customers,
        (SELECT count(*) FROM first_valid_order f, bounds b
          WHERE f.first_order_at >= b.start_at AND f.first_order_at < b.end_at) AS new_customers,
        (SELECT count(*) FROM first_valid_order f, bounds b
          WHERE f.first_order_at >= b.previous_start_at AND f.first_order_at < b.start_at) AS previous_new_customers,
        (SELECT count(*) FROM current_views) AS total_page_views,
        (SELECT count(*) FROM previous_views) AS previous_page_views,
        (SELECT count(DISTINCT visitor_key) FROM current_views) AS unique_visitors,
        (SELECT count(*) FROM current_orders WHERE COALESCE(source, 'website') = 'website') AS website_orders
    `);

    const row = rowsOf<SummaryRow>(summaryResult)[0] ?? ({} as SummaryRow);
    const totalOrders = numberOf(row.total_orders);
    const deliveredOrders = numberOf(row.delivered_orders);
    const activeOrders = numberOf(row.active_orders);
    const rejectedOrders = numberOf(row.rejected_orders);
    const totalRevenue = numberOf(row.delivered_revenue);
    const previousOrders = numberOf(row.previous_orders);
    const previousRevenue = numberOf(row.previous_delivered_revenue);
    const totalCustomers = numberOf(row.total_customers);
    const previousCustomers = numberOf(row.previous_customers);
    const newCustomers = numberOf(row.new_customers);
    const previousNewCustomers = numberOf(row.previous_new_customers);
    const totalPageViews = numberOf(row.total_page_views);
    const previousPageViews = numberOf(row.previous_page_views);
    const uniqueVisitors = numberOf(row.unique_visitors);
    const websiteOrders = numberOf(row.website_orders);

    const salesResult = await db.execute(sql`
      SELECT
        ((o.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date::text AS date,
        COALESCE(sum(COALESCE(o.rounded_total, o.total, 0)), 0) AS revenue,
        count(*) AS order_count
      FROM orders o
      WHERE o.created_at >= ${startDate}::timestamp
        AND o.created_at < ${endDate}::timestamp
        AND o.status = 'delivered'
      GROUP BY 1
      ORDER BY 1
    `);

    const salesByDate = new Map<string, { revenue: number; orders: number }>();
    for (const sale of rowsOf<{ date: string; revenue: unknown; order_count: unknown }>(salesResult)) {
      salesByDate.set(sale.date, {
        revenue: numberOf(sale.revenue),
        orders: numberOf(sale.order_count),
      });
    }

    const salesChart: { date: string; revenue: number; orders: number }[] = [];
    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date(endDate.getTime() - index * 24 * 60 * 60 * 1000);
      const baghdadDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Baghdad",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
      const values = salesByDate.get(baghdadDate);
      salesChart.push({
        date: date.toLocaleDateString("ar-IQ", { timeZone: "Asia/Baghdad", month: "short", day: "numeric" }),
        revenue: values?.revenue ?? 0,
        orders: values?.orders ?? 0,
      });
    }

    const productsResult = await db.execute(sql`
      SELECT
        COALESCE(p.name, oi.metadata->>'productName', 'منتج') AS name,
        COALESCE(sum(oi.quantity), 0) AS sales,
        COALESCE(sum(oi.total_price), 0) AS revenue
      FROM order_items_relational oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.created_at >= ${startDate}::timestamp
        AND o.created_at < ${endDate}::timestamp
        AND o.status = 'delivered'
      GROUP BY COALESCE(p.name, oi.metadata->>'productName', 'منتج')
      ORDER BY sum(oi.quantity) DESC, sum(oi.total_price) DESC
      LIMIT 10
    `);

    const topProducts = rowsOf<{ name: string; sales: unknown; revenue: unknown }>(productsResult).map((product) => ({
      name: String(product.name || "منتج").slice(0, 40),
      sales: numberOf(product.sales),
      revenue: numberOf(product.revenue),
    }));

    const trafficResult = await db.execute(sql`
      WITH clean_views AS (
        SELECT CASE
          WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('ig','instagram.com') THEN 'instagram'
          WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('fb','facebook.com','facebook_dm') THEN 'facebook'
          WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('chatgpt','chatgpt.com') THEN 'chatgpt.com'
          ELSE lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct'))
        END AS source
        FROM page_views pv
        WHERE pv.created_at >= ${startDate}::timestamp
          AND pv.created_at < ${endDate}::timestamp
          AND pv.page_path NOT LIKE '/admin%'
          AND NOT EXISTS (
            SELECT 1 FROM users au WHERE au.id = pv.user_id AND au.role = 'admin'
          )
      )
      SELECT source, count(*) AS visits
      FROM clean_views
      GROUP BY source
      ORDER BY count(*) DESC
    `);

    const trafficRows = rowsOf<{ source: string; visits: unknown }>(trafficResult).map((item) => ({
      source: normalizedSource(item.source),
      visits: numberOf(item.visits),
    }));
    const totalTraffic = trafficRows.reduce((sum, item) => sum + item.visits, 0);
    const trafficSources = trafficRows.map((item) => ({
      source: item.source,
      visits: item.visits,
      percentage: totalTraffic > 0 ? Math.round((item.visits / totalTraffic) * 100) : 0,
    }));

    const statusResult = await db.execute(sql`
      SELECT status, count(*) AS count
      FROM orders
      WHERE created_at >= ${startDate}::timestamp
        AND created_at < ${endDate}::timestamp
      GROUP BY status
      ORDER BY count(*) DESC
    `);

    const ordersByStatus = rowsOf<{ status: string; count: unknown }>(statusResult).map((item) => ({
      status: STATUS_LABELS[item.status] ?? item.status,
      count: numberOf(item.count),
    }));

    res.json({
      summary: {
        totalRevenue,
        revenueChange: percentageChange(totalRevenue, previousRevenue),
        totalOrders,
        ordersChange: percentageChange(totalOrders, previousOrders),
        deliveredOrders,
        activeOrders,
        rejectedOrders,
        totalCustomers,
        customersChange: percentageChange(totalCustomers, previousCustomers),
        newCustomers,
        newCustomersChange: percentageChange(newCustomers, previousNewCustomers),
        totalPageViews,
        pageViewsChange: percentageChange(totalPageViews, previousPageViews),
        uniqueVisitors,
        websiteOrders,
        averageOrderValue: deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0,
        conversionRate: uniqueVisitors > 0 ? (websiteOrders / uniqueVisitors) * 100 : 0,
      },
      salesChart,
      topProducts,
      trafficSources,
      ordersByStatus,
      dataSource: {
        revenue: "delivered_orders_rounded_total",
        orders: "orders_created_in_period",
        customers: "distinct_non_rejected_order_customers",
        pageViews: "page_views_excluding_admin",
        conversionRate: "website_orders_divided_by_unique_non_admin_visitors",
      },
    });
  } catch (error) {
    console.error("Accurate analytics error:", error);
    next(error);
  }
});

router.get("/sources", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    if (!db) {
      res.json({ sources: [], total: 0, days: 30, recentBySource: {} });
      return;
    }

    const days = getDays(req.query.days);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db.execute(sql`
      WITH clean_views AS (
        SELECT
          pv.*,
          CASE
            WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('ig','instagram.com') THEN 'instagram'
            WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('fb','facebook.com','facebook_dm') THEN 'facebook'
            WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('chatgpt','chatgpt.com') THEN 'chatgpt.com'
            ELSE lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct'))
          END AS source,
          COALESCE(
            NULLIF(pv.session_id, ''),
            NULLIF(pv.user_id, ''),
            'ip:' || COALESCE(NULLIF(pv.ip_address, ''), pv.id)
          ) AS visitor_key
        FROM page_views pv
        WHERE pv.created_at >= ${since}::timestamp
          AND pv.page_path NOT LIKE '/admin%'
          AND NOT EXISTS (
            SELECT 1 FROM users au WHERE au.id = pv.user_id AND au.role = 'admin'
          )
      )
      SELECT source, count(*) AS visits, count(DISTINCT visitor_key) AS unique_users
      FROM clean_views
      GROUP BY source
      ORDER BY count(*) DESC
    `);

    const sourceRows = rowsOf<{ source: string; visits: unknown; unique_users: unknown }>(result).map((item) => ({
      source: normalizedSource(item.source),
      visits: numberOf(item.visits),
      uniqueUsers: numberOf(item.unique_users),
    }));
    const total = sourceRows.reduce((sum, item) => sum + item.visits, 0);
    const sources = sourceRows.map((item) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.visits / total) * 100) : 0,
    }));

    const recentBySource: Record<string, unknown[]> = {};
    for (const item of sources.slice(0, 8)) {
      const recentResult = await db.execute(sql`
        WITH clean_views AS (
          SELECT
            pv.page_path,
            pv.user_id,
            pv.utm_campaign,
            pv.device_type,
            pv.created_at,
            CASE
              WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('ig','instagram.com') THEN 'instagram'
              WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('fb','facebook.com','facebook_dm') THEN 'facebook'
              WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('chatgpt','chatgpt.com') THEN 'chatgpt.com'
              ELSE lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct'))
            END AS source
          FROM page_views pv
          WHERE pv.created_at >= ${since}::timestamp
            AND pv.page_path NOT LIKE '/admin%'
            AND NOT EXISTS (
              SELECT 1 FROM users au WHERE au.id = pv.user_id AND au.role = 'admin'
            )
        )
        SELECT
          cv.page_path AS "pagePath",
          cv.user_id AS "userId",
          u.full_name AS "userFullName",
          u.email AS "userEmail",
          cv.utm_campaign AS "utmCampaign",
          cv.device_type AS "deviceType",
          cv.created_at AS "createdAt"
        FROM clean_views cv
        LEFT JOIN users u ON u.id = cv.user_id
        WHERE cv.source = ${item.source}
        ORDER BY cv.created_at DESC
        LIMIT 5
      `);
      recentBySource[item.source] = rowsOf(recentResult);
    }

    res.json({ sources, total, days, recentBySource });
  } catch (error) {
    next(error);
  }
});

router.get("/pages", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    if (!db) {
      res.status(500).json({ pages: [], days: 30, totalViews: 0 });
      return;
    }

    const days = getDays(req.query.days);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db.execute(sql`
      WITH clean_views AS (
        SELECT
          pv.*,
          CASE
            WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('ig','instagram.com') THEN 'instagram'
            WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('fb','facebook.com','facebook_dm') THEN 'facebook'
            ELSE lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct'))
          END AS source,
          COALESCE(
            NULLIF(pv.session_id, ''),
            NULLIF(pv.user_id, ''),
            'ip:' || COALESCE(NULLIF(pv.ip_address, ''), pv.id)
          ) AS visitor_key
        FROM page_views pv
        WHERE pv.created_at >= ${since}::timestamp
          AND pv.page_path NOT LIKE '/admin%'
          AND NOT EXISTS (
            SELECT 1 FROM users au WHERE au.id = pv.user_id AND au.role = 'admin'
          )
      )
      SELECT
        page_path AS "pagePath",
        count(*)::int AS views,
        count(DISTINCT visitor_key)::int AS "uniqueUsers",
        count(*) FILTER (WHERE user_id IS NULL)::int AS "anonymousViews",
        COALESCE(round(avg(duration)), 0)::int AS "avgDuration",
        count(*) FILTER (WHERE device_type = 'mobile')::int AS "mobileViews",
        count(*) FILTER (WHERE device_type = 'desktop')::int AS "desktopViews",
        count(*) FILTER (WHERE source = 'google')::int AS "fromGoogle",
        count(*) FILTER (WHERE source = 'facebook')::int AS "fromFacebook",
        count(*) FILTER (WHERE source = 'direct')::int AS "fromDirect",
        count(*) FILTER (WHERE source = 'instagram')::int AS "fromInstagram",
        count(*) FILTER (WHERE source = 'tiktok')::int AS "fromTiktok",
        count(*) FILTER (WHERE source = 'whatsapp')::int AS "fromWhatsapp",
        count(*) FILTER (WHERE source NOT IN ('google','facebook','direct','instagram','tiktok','whatsapp'))::int AS "fromOther"
      FROM clean_views
      GROUP BY page_path
      ORDER BY count(*) DESC
      LIMIT ${limit}
    `);

    const totalResult = await db.execute(sql`
      SELECT count(*) AS total
      FROM page_views pv
      WHERE pv.created_at >= ${since}::timestamp
        AND pv.page_path NOT LIKE '/admin%'
        AND NOT EXISTS (
          SELECT 1 FROM users au WHERE au.id = pv.user_id AND au.role = 'admin'
        )
    `);

    res.json({
      pages: rowsOf(result),
      days,
      totalViews: numberOf(rowsOf<{ total: unknown }>(totalResult)[0]?.total),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/journeys", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    if (!db) {
      res.json([]);
      return;
    }

    const days = getDays(req.query.days);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db.execute(sql`
      SELECT
        pv.session_id AS "sessionId",
        pv.user_id AS "userId",
        u.full_name AS "fullName",
        u.email,
        pv.ip_address AS "ipAddress",
        CASE
          WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('ig','instagram.com') THEN 'instagram'
          WHEN lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct')) IN ('fb','facebook.com','facebook_dm') THEN 'facebook'
          ELSE lower(COALESCE(NULLIF(pv.detected_source, ''), 'direct'))
        END AS source,
        pv.device_type AS "deviceType",
        pv.page_path AS "pagePath",
        pv.duration,
        pv.created_at AS "createdAt"
      FROM page_views pv
      LEFT JOIN users u ON u.id = pv.user_id
      WHERE pv.created_at >= ${since}::timestamp
        AND pv.session_id IS NOT NULL
        AND pv.page_path NOT LIKE '/admin%'
        AND NOT EXISTS (
          SELECT 1 FROM users au WHERE au.id = pv.user_id AND au.role = 'admin'
        )
      ORDER BY pv.created_at DESC
      LIMIT 500
    `);

    type JourneyRow = {
      sessionId: string;
      userId: string | null;
      fullName: string | null;
      email: string | null;
      ipAddress: string | null;
      source: string;
      deviceType: string | null;
      pagePath: string;
      duration: number | null;
      createdAt: Date | string;
    };

    const sessions = new Map<string, {
      sessionId: string;
      userId: string | null;
      fullName: string | null;
      email: string | null;
      ipAddress: string | null;
      source: string;
      deviceType: string | null;
      startedAt: string;
      pages: { path: string; duration: number | null; timestamp: string }[];
    }>();

    for (const row of rowsOf<JourneyRow>(result)) {
      const timestamp = new Date(row.createdAt).toISOString();
      const existing = sessions.get(row.sessionId) ?? {
        sessionId: row.sessionId,
        userId: row.userId,
        fullName: row.fullName,
        email: row.email,
        ipAddress: row.ipAddress,
        source: normalizedSource(row.source),
        deviceType: row.deviceType,
        startedAt: timestamp,
        pages: [],
      };
      existing.pages.push({ path: row.pagePath, duration: row.duration, timestamp });
      sessions.set(row.sessionId, existing);
    }

    const journeys = Array.from(sessions.values()).map((session) => {
      session.pages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      session.startedAt = session.pages[0]?.timestamp ?? session.startedAt;
      return session;
    }).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    res.json(journeys.slice(0, 50));
  } catch (error) {
    next(error);
  }
});

router.get("/active-now", requireAdmin, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const db = getDb();
    if (!db) {
      res.json({ total: 0, byPage: [] });
      return;
    }

    const since = new Date(Date.now() - 5 * 60 * 1000);
    const result = await db.execute(sql`
      WITH recent AS (
        SELECT
          pv.page_path,
          pv.user_id,
          COALESCE(
            NULLIF(pv.session_id, ''),
            NULLIF(pv.user_id, ''),
            'ip:' || COALESCE(NULLIF(pv.ip_address, ''), pv.id)
          ) AS visitor_key,
          row_number() OVER (
            PARTITION BY COALESCE(
              NULLIF(pv.session_id, ''),
              NULLIF(pv.user_id, ''),
              'ip:' || COALESCE(NULLIF(pv.ip_address, ''), pv.id)
            )
            ORDER BY pv.created_at DESC
          ) AS position
        FROM page_views pv
        WHERE pv.created_at >= ${since}::timestamp
          AND pv.page_path NOT LIKE '/admin%'
          AND NOT EXISTS (
            SELECT 1 FROM users au WHERE au.id = pv.user_id AND au.role = 'admin'
          )
      )
      SELECT
        page_path AS "pagePath",
        count(*)::int AS total,
        count(*) FILTER (WHERE user_id IS NOT NULL)::int AS "loggedIn",
        count(*) FILTER (WHERE user_id IS NULL)::int AS anonymous
      FROM recent
      WHERE position = 1
      GROUP BY page_path
      ORDER BY count(*) DESC
    `);

    const byPage = rowsOf<{ pagePath: string; total: number; loggedIn: number; anonymous: number }>(result);
    res.json({ total: byPage.reduce((sum, page) => sum + numberOf(page.total), 0), byPage });
  } catch (error) {
    next(error);
  }
});

// Keep the legacy auxiliary endpoints (for example /insights) available.
router.use(createAnalyticsRouter());

export function createAccurateAdminAnalyticsRouter(): RouterType {
  return router;
}

export default router;
