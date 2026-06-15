import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { orders, users, products, orderItems, productViews, cartSessions } from "../../shared/schema.js";
import { sql, desc, gte, count, sum, eq, and, gt } from "drizzle-orm";
import { pageViews } from "../../shared/schema.js";

const router = Router();

// ─── Real-time Presence Store ─────────────────────────────────────────────────
// Key = sessionId, Value = { pagePath, userId, ts }
// Enter: added immediately on page load
// Leave: removed immediately via sendBeacon (instant updates on navigation)
// Heartbeat: refreshes TTL every 20s (safety net for closed tabs)
interface PresenceEntry { pagePath: string; userId: string | null; ts: number; }
const presence = new Map<string, PresenceEntry>();
const PRESENCE_TTL = 60_000; // 60s — user gone if no heartbeat for 1 min

// Cleanup stale entries every 30s
setInterval(() => {
    const cutoff = Date.now() - PRESENCE_TTL;
    for (const [sid, e] of presence) if (e.ts < cutoff) presence.delete(sid);
}, 30_000);

const getPresenceUserId = (req: Request): string | null =>
    (req.session as Record<string, unknown>)?.userId as string | null ?? null;

// POST /api/analytics/presence — enter page
router.post("/presence", (req: Request, res: Response): void => {
    const { sessionId, pagePath } = ((req.body ?? {}) as { sessionId?: string; pagePath?: string });
    if (!sessionId || !pagePath) { res.json({ ok: true }); return; }
    presence.set(sessionId.slice(0, 64), {
        pagePath: pagePath.slice(0, 255),
        userId: getPresenceUserId(req),
        ts: Date.now(),
    });
    res.json({ ok: true });
});

// POST /api/analytics/presence/leave — leave page instantly
router.post("/presence/leave", (req: Request, res: Response): void => {
    const { sessionId } = ((req.body ?? {}) as { sessionId?: string });
    if (sessionId) presence.delete(sessionId.slice(0, 64));
    res.json({ ok: true });
});

// POST /api/analytics/heartbeat — refresh TTL (safety net, every 20s)
router.post("/heartbeat", (req: Request, res: Response): void => {
    const { sessionId, pagePath } = ((req.body ?? {}) as { sessionId?: string; pagePath?: string });
    if (!sessionId || !pagePath) { res.json({ ok: true }); return; }
    presence.set(sessionId.slice(0, 64), {
        pagePath: pagePath.slice(0, 255),
        userId: getPresenceUserId(req),
        ts: Date.now(),
    });
    res.json({ ok: true });
});

interface AnalyticsQuery {
    period?: "7d" | "30d" | "90d";
}

// Get analytics data
router.get("/", requireAdmin, async (req: Request<object, object, object, AnalyticsQuery>, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.status(500).json({ message: "Database not connected" });
            return;
        }

        const period = req.query.period || "30d";

        // Calculate date range
        const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - days);

        // Get orders in period
        const ordersInPeriod = await db
            .select({
                totalOrders: count(),
                totalRevenue: sum(orders.total),
            })
            .from(orders)
            .where(gte(orders.createdAt, startDate));

        const currentOrders = ordersInPeriod[0]?.totalOrders || 0;
        const currentRevenue = Number(ordersInPeriod[0]?.totalRevenue) || 0;

        // Get orders in previous period for comparison
        const previousOrdersData = await db
            .select({
                totalOrders: count(),
                totalRevenue: sum(orders.total),
            })
            .from(orders)
            .where(and(gte(orders.createdAt, previousStartDate), sql`${orders.createdAt} < ${startDate}`));

        const previousOrders = previousOrdersData[0]?.totalOrders || 0;
        const previousRevenue = Number(previousOrdersData[0]?.totalRevenue) || 0;

        // Calculate changes
        const ordersChange = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;
        const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        // Get total customers
        const customersData = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.role, "user"));
        const totalCustomers = customersData[0]?.count || 0;

        // Get new customers in period
        const newCustomersData = await db
            .select({ count: count() })
            .from(users)
            .where(and(eq(users.role, "user"), gte(users.createdAt, startDate)));
        const newCustomers = newCustomersData[0]?.count || 0;
        const customersChange = totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0;

        // ==========================================
        // Real Data Integration (Product Views & Sessions)
        // ==========================================

        // 1. Get real page views from product_views table
        const currentViewsData = await db
            .select({ count: count() })
            .from(productViews)
            .where(gte(productViews.viewedAt, startDate));

        const previousViewsData = await db
            .select({ count: count() })
            .from(productViews)
            .where(and(
                gte(productViews.viewedAt, previousStartDate),
                sql`${productViews.viewedAt} < ${startDate}`
            ));

        const totalPageViews = currentViewsData[0]?.count || 0;
        const previousPageViews = previousViewsData[0]?.count || 0;
        const pageViewsChange = previousPageViews > 0
            ? ((totalPageViews - previousPageViews) / previousPageViews) * 100
            : 0;

        // 2. Real Conversion Rate based on Unique Sessions vs Orders
        // Calculate conversion rate = (Total Orders / Unique Cart Sessions) * 100
        const cartSessionsData = await db
            .select({ count: count() })
            .from(cartSessions)
            .where(gte(cartSessions.createdAt, startDate));

        const totalSessions = cartSessionsData[0]?.count || 0;
        const rawConversionRate = totalSessions > 0
            ? (currentOrders / totalSessions) * 100
            : 0;
        const conversionRate = Math.min(rawConversionRate, 100); // لا يتجاوز 100%

        const averageOrderValue = currentOrders > 0 ? currentRevenue / currentOrders : 0;

        // جلب بيانات المبيعات اليومية الحقيقية من قاعدة البيانات
        const dailySalesData = await db
            .select({
                date: sql<string>`(${orders.createdAt})::date::text`,
                revenue: sum(orders.total),
                orderCount: count(),
            })
            .from(orders)
            .where(gte(orders.createdAt, startDate))
            .groupBy(sql`(${orders.createdAt})::date`)
            .orderBy(sql`(${orders.createdAt})::date`);

        // إنشاء خريطة للبيانات اليومية
        const dailyDataMap = new Map<string, { revenue: number; orders: number }>();
        for (const day of dailySalesData) {
            dailyDataMap.set(day.date, {
                revenue: Number(day.revenue) || 0,
                orders: day.orderCount || 0,
            });
        }

        // بناء مصفوفة الرسم البياني مع جميع الأيام (حتى الأيام بدون مبيعات)
        const salesChart = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const dateStr = date.toLocaleDateString("ar-IQ", { month: "short", day: "numeric" });

            const dayData = dailyDataMap.get(dateKey);
            salesChart.push({
                date: dateStr,
                revenue: dayData?.revenue || 0,
                orders: dayData?.orders || 0,
            });
        }

        // جلب أفضل المنتجات مبيعاً من بيانات الطلبات الحقيقية
        const topProductsSales = await db
            .select({
                productId: orderItems.productId,
                productName: products.name,
                totalQuantity: sum(orderItems.quantity),
                totalRevenue: sum(sql`${orderItems.priceAtPurchase} * ${orderItems.quantity}`),
            })
            .from(orderItems)
            .innerJoin(orders, eq(orders.id, orderItems.orderId))
            .leftJoin(products, eq(products.id, orderItems.productId))
            .where(gte(orders.createdAt, startDate))
            .groupBy(orderItems.productId, products.name)
            .orderBy(desc(sum(orderItems.quantity)))
            .limit(10);

        const topProducts = topProductsSales.map(p => ({
            name: (p.productName || "منتج").substring(0, 30),
            sales: Number(p.totalQuantity) || 0,
            revenue: Number(p.totalRevenue) || 0,
        }));

        // 3. Real Traffic Sources from product_views.referrer
        const trafficData = await db
            .select({
                source: productViews.referrer,
                visits: count()
            })
            .from(productViews)
            .where(gte(productViews.viewedAt, startDate))
            .groupBy(productViews.referrer);

        // Normalize specific referrers into main categories for the UI
        let searchVisits = 0;
        let socialVisits = 0;
        let directVisits = 0;
        let otherVisits = 0;

        trafficData.forEach(t => {
            const ref = t.source || "direct";
            const v = t.visits || 0;

            if (ref === "direct") directVisits += v;
            else if (ref.includes("google") || ref.includes("bing") || ref.includes("yahoo")) searchVisits += v;
            else if (ref.includes("facebook") || ref.includes("instagram") || ref.includes("tiktok") || ref.includes("snapchat")) socialVisits += v;
            else otherVisits += v;
        });

        // If we have real tracking data, use it. Otherwise, return zeros instead of fake estimates.
        let trafficSources = [];
        const totalRealVisits = searchVisits + socialVisits + directVisits + otherVisits;

        if (totalRealVisits > 0) {
            trafficSources = [
                { source: "بحث جوجل", visits: searchVisits, percentage: Math.round((searchVisits / totalRealVisits) * 100) },
                { source: "مباشر", visits: directVisits, percentage: Math.round((directVisits / totalRealVisits) * 100) },
                { source: "وسائل التواصل", visits: socialVisits, percentage: Math.round((socialVisits / totalRealVisits) * 100) },
                { source: "أخرى", visits: otherVisits, percentage: Math.round((otherVisits / totalRealVisits) * 100) },
            ].filter(s => s.visits > 0);
        } else {
            trafficSources = [
                { source: "مباشر", visits: 0, percentage: 0 },
            ];
        }

        // Orders by status
        const statusCounts = await db
            .select({
                status: orders.status,
                count: count(),
            })
            .from(orders)
            .groupBy(orders.status);

        const statusLabels: Record<string, string> = {
            pending: "قيد الانتظار",
            confirmed: "مؤكد",
            processing: "قيد التجهيز",
            shipped: "تم الشحن",
            delivered: "تم التسليم",
            cancelled: "ملغي",
        };

        const ordersByStatus = statusCounts.map(s => ({
            status: statusLabels[s.status] || s.status,
            count: s.count,
        }));

        res.json({
            summary: {
                totalRevenue: currentRevenue,
                revenueChange,
                totalOrders: currentOrders,
                ordersChange,
                totalCustomers,
                customersChange,
                totalPageViews,
                pageViewsChange,
                averageOrderValue,
                conversionRate,
            },
            salesChart,
            topProducts,
            trafficSources,
            ordersByStatus,
            // معلومات عن مصادر البيانات
            dataSource: {
                revenue: "real",           // من جدول الطلبات
                orders: "real",            // من جدول الطلبات
                customers: "real",         // من جدول المستخدمين
                pageViews: "real",         // تم تحويله لبيانات حقيقية من جدول product_views
                salesChart: "real",        // من جدول الطلبات اليومية
                topProducts: "real",       // من جدول عناصر الطلبات
                trafficSources: "real",    // تم تحويله لبيانات حقيقية من جدول product_views
                ordersByStatus: "real",    // من جدول الطلبات
            }
        });
    } catch (error) {
        console.error("Analytics error:", error);
        next(error);
    }
});

// GET /api/analytics/insights - AI Insights with real data
router.get("/insights", requireAdmin, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.status(500).json({ message: "Database not connected" });
            return;
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get all orders from last 30 days
        const recentOrders = await db
            .select()
            .from(orders)
            .where(gte(orders.createdAt, thirtyDaysAgo));

        // 1. Peak Shopping Hours
        const hourCounts = new Map<number, number>();
        let peakHoursText = "لا توجد بيانات كافية";

        if (recentOrders.length > 0) {
            for (const order of recentOrders) {
                if (order.createdAt) {
                    const hour = new Date(order.createdAt).getHours();
                    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
                }
            }

            const sortedHours = Array.from(hourCounts.entries())
                .sort((a, b) => b[1] - a[1]);

            if (sortedHours.length > 0) {
                peakHoursText = `${sortedHours[0][0]}-${(sortedHours[0][0] + 3) % 24} ${sortedHours[0][0] >= 12 ? 'مساءً' : 'صباحاً'}`;
            }
        }

        // 2. Cart Abandonment Rate (estimate based on order completion rate)
        // Since we don't have a carts table, estimate based on incomplete vs complete orders
        const allOrdersData = await db
            .select({ count: count() })
            .from(orders)
            .where(gte(orders.createdAt, thirtyDaysAgo));

        const totalOrders = allOrdersData[0]?.count || 0;
        const completedOrders = recentOrders.filter(o => o.status === 'delivered').length;

        // Calculate cart abandonment from real completion rate only
        const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) : 0;
        const abandonmentRate = totalOrders > 0 ? Math.round((1 - completionRate) * 100) : 0;

        // 3. Geographic Distribution
        const cityCount = new Map<string, number>();
        for (const order of recentOrders) {
            try {
                if (!order.shippingAddress) continue;
                const addressStr = typeof order.shippingAddress === 'string'
                    ? order.shippingAddress
                    : JSON.stringify(order.shippingAddress);
                const address = JSON.parse(addressStr);
                const city = address.governorate || address.city || "غير محدد";
                cityCount.set(city, (cityCount.get(city) || 0) + 1);
            } catch (e) {
                // Skip invalid addresses
            }
        }

        const totalOrdersForGeo = recentOrders.length;
        const cityDistribution = Array.from(cityCount.entries())
            .map(([city, count]) => ({
                city,
                count,
                percentage: totalOrdersForGeo > 0 ? Math.round((count / totalOrdersForGeo) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        const geographyText = cityDistribution.length > 0
            ? cityDistribution.map(c => `${c.percentage}% من ${c.city}`).join("، ")
            : "لا توجد بيانات كافية";

        // 4. Demand Forecasts (based on historical sales)
        const allOrderItems = await db
            .select()
            .from(orderItems)
            .limit(1000);

        // Get product categories and their sales
        const categorySales = new Map<string, number>();
        for (const item of allOrderItems) {
            const [product] = await db
                .select()
                .from(products)
                .where(eq(products.id, item.productId))
                .limit(1);

            if (product) {
                const category = product.category;
                categorySales.set(category, (categorySales.get(category) || 0) + item.quantity);
            }
        }

        // Calculate seasonal factors
        const now = new Date();
        const month = now.getMonth();
        const isSummer = month >= 5 && month <= 8;
        const isWinter = month >= 11 || month <= 2;

        const forecasts = Array.from(categorySales.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, sales]) => {
                let trend: "up" | "down" | "stable" = "stable";
                let percentage = 5;
                let reason = "طلب ثابت على مدار السنة";

                // Apply seasonal logic
                if (isSummer && category.includes("أحواض")) {
                    trend = "up";
                    percentage = 35;
                    reason = "موسم العائلات - بداية الصيف";
                } else if (isSummer && category.includes("فلتر")) {
                    trend = "up";
                    percentage = 25;
                    reason = "طلب مرتفع مع الأحواض";
                } else if (isWinter && category.includes("سخان")) {
                    trend = "up";
                    percentage = 45;
                    reason = "الماء بارد - ضرورة";
                } else if (isWinter && (category.includes("دواء") || category.includes("علاج"))) {
                    trend = "up";
                    percentage = 30;
                    reason = "أمراض موسمية";
                }

                return { category, trend, percentage, reason };
            });

        // No fallback - only show real data
        // forecasts array stays empty if no order data exists

        // Response
        res.json({
            success: true,
            data: {
                peakHours: peakHoursText,
                cartAbandonment: abandonmentRate,
                geography: geographyText,
                forecasts
            }
        });
    } catch (error) {
        console.error("AI Insights error:", error);
        next(error);
    }
});

// ─── Helper: detect source from referrer URL ────────────────────────────────
function detectSourceFromReferrer(referrer: string | null, utmSource: string | null): string {
    if (utmSource) return utmSource.toLowerCase().trim();
    if (!referrer) return "direct";
    try {
        const host = new URL(referrer).hostname.toLowerCase();
        if (host.includes("facebook.com") || host.includes("fb.com") || host.includes("m.facebook.com") || host.includes("l.facebook.com")) return "facebook";
        if (host.includes("instagram.com") || host.includes("l.instagram.com")) return "instagram";
        if (host.includes("tiktok.com") || host.includes("vm.tiktok.com")) return "tiktok";
        if (host.includes("google.")) return "google";
        if (host.includes("bing.com")) return "bing";
        if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
        if (host.includes("twitter.com") || host.includes("t.co") || host.includes("x.com")) return "twitter";
        if (host.includes("snapchat.com")) return "snapchat";
        if (host.includes("linkedin.com")) return "linkedin";
        if (host.includes("whatsapp.com") || host.includes("wa.me")) return "whatsapp";
        if (host.includes("telegram.org") || host.includes("t.me")) return "telegram";
        return "other";
    } catch {
        return "direct";
    }
}

// ─── POST /api/analytics/track-visit — (public) ─────────────────────────────
router.post("/track-visit", async (req: Request, res: Response): Promise<void> => {
    try {
        const db = getDb();
        if (!db) { res.status(200).json({ ok: true }); return; }

        const { pagePath, referrer, utmSource, utmMedium, utmCampaign, clientSessionId } = (req.body ?? {}) as {
            pagePath?: string;
            referrer?: string;
            utmSource?: string;
            utmMedium?: string;
            utmCampaign?: string;
            clientSessionId?: string;
        };

        if (!pagePath) { res.status(200).json({ ok: true }); return; }

        const userId = (req.session as any)?.userId ?? null;
        // Prefer client-side sessionId (always available), fallback to server session
        const sessionId = clientSessionId ?? (req.session as any)?.id ?? null;
        const detectedSource = detectSourceFromReferrer(referrer ?? null, utmSource ?? null);
        const userAgent = req.headers["user-agent"] ?? null;
        const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? null;
        const deviceType = userAgent
            ? /mobile|android|iphone|ipad/i.test(userAgent) ? "mobile"
            : /tablet/i.test(userAgent) ? "tablet"
            : "desktop"
            : null;

        const [inserted] = await db.insert(pageViews).values({
            pagePath: pagePath.slice(0, 255),
            userId,
            sessionId,
            referrer: referrer?.slice(0, 500) ?? null,
            utmSource: utmSource?.slice(0, 100) ?? null,
            utmMedium: utmMedium?.slice(0, 100) ?? null,
            utmCampaign: utmCampaign?.slice(0, 200) ?? null,
            detectedSource,
            userAgent: userAgent?.slice(0, 500) ?? null,
            ipAddress: ip?.slice(0, 50) ?? null,
            deviceType,
        }).returning({ id: pageViews.id });

        res.status(200).json({ ok: true, viewId: inserted?.id ?? null });
    } catch {
        // Tracking failures must never break the site
        res.status(200).json({ ok: true });
    }
});

// ─── POST /api/analytics/update-visit — update duration on page exit ─────────
router.post("/update-visit", async (req: Request, res: Response): Promise<void> => {
    try {
        const db = getDb();
        if (!db) { res.status(200).json({ ok: true }); return; }

        const { viewId, duration } = (req.body ?? {}) as { viewId?: string; duration?: number };
        if (!viewId || typeof duration !== "number" || duration < 0) {
            res.status(200).json({ ok: true }); return;
        }

        // Cap duration at 30 minutes (1800s) to prevent outliers
        const cappedDuration = Math.min(Math.round(duration), 1800);

        await db.update(pageViews)
            .set({ duration: cappedDuration })
            .where(eq(pageViews.id, viewId));

        res.status(200).json({ ok: true });
    } catch {
        res.status(200).json({ ok: true });
    }
});

// ─── GET /api/admin/analytics/journeys — per-session page journey ────────────
router.get("/journeys", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) { res.json([]); return; }

        const days = Math.min(Number(req.query.days) || 7, 30);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Get recent page views with sessions, ordered by session then time
        const rows = await db
            .select({
                id: pageViews.id,
                sessionId: pageViews.sessionId,
                userId: pageViews.userId,
                pagePath: pageViews.pagePath,
                duration: pageViews.duration,
                detectedSource: pageViews.detectedSource,
                deviceType: pageViews.deviceType,
                ipAddress: pageViews.ipAddress,
                createdAt: pageViews.createdAt,
                fullName: users.fullName,
                email: users.email,
            })
            .from(pageViews)
            .leftJoin(users, eq(pageViews.userId, users.id))
            .where(and(
                gte(pageViews.createdAt, since),
                sql`${pageViews.sessionId} IS NOT NULL`
            ))
            .orderBy(desc(pageViews.createdAt))
            .limit(500);

        // Group by sessionId
        const sessionsMap = new Map<string, {
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

        for (const row of rows) {
            const sid = row.sessionId!;
            if (!sessionsMap.has(sid)) {
                sessionsMap.set(sid, {
                    sessionId: sid,
                    userId: row.userId,
                    fullName: row.fullName,
                    email: row.email,
                    ipAddress: row.ipAddress,
                    source: row.detectedSource ?? "direct",
                    deviceType: row.deviceType,
                    startedAt: (row.createdAt as Date).toISOString(),
                    pages: [],
                });
            }
            sessionsMap.get(sid)!.pages.push({
                path: row.pagePath,
                duration: row.duration,
                timestamp: (row.createdAt as Date).toISOString(),
            });
        }

        // Sort pages within each session chronologically (oldest first)
        const journeys = Array.from(sessionsMap.values()).map(s => {
            s.pages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            // Use the earliest page timestamp as startedAt
            if (s.pages.length > 0) s.startedAt = s.pages[0].timestamp;
            return s;
        });

        // Sort sessions by most recent first
        journeys.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

        // Return top 50 sessions
        res.json(journeys.slice(0, 50));
    } catch (err: any) {
        next(err);
    }
});

// ─── GET /api/admin/analytics/sources — platform breakdown ──────────────────
router.get("/sources", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) { res.json({ sources: [], total: 0 }); return; }

        const days = Math.min(Number(req.query.days) || 30, 90);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Per-platform counts
        const rows = await db
            .select({
                source: pageViews.detectedSource,
                visits: count(),
                uniqueUsers: sql<number>`count(distinct ${pageViews.userId})`,
            })
            .from(pageViews)
            .where(gte(pageViews.createdAt, since))
            .groupBy(pageViews.detectedSource)
            .orderBy(desc(count()));

        const total = rows.reduce((s, r) => s + Number(r.visits), 0);

        const sources = rows.map(r => ({
            source: r.source ?? "direct",
            visits: Number(r.visits),
            uniqueUsers: Number(r.uniqueUsers),
            percentage: total > 0 ? Math.round((Number(r.visits) / total) * 100) : 0,
        }));

        // Last 5 visitors per platform (with user info if logged in)
        const recentBySource: Record<string, any[]> = {};
        const topSources = rows.slice(0, 6).map(r => r.source ?? "direct");

        for (const src of topSources) {
            const recent = await db
                .select({
                    pagePath: pageViews.pagePath,
                    userId: pageViews.userId,
                    userFullName: users.fullName,
                    userEmail: users.email,
                    utmCampaign: pageViews.utmCampaign,
                    deviceType: pageViews.deviceType,
                    createdAt: pageViews.createdAt,
                })
                .from(pageViews)
                .leftJoin(users, eq(pageViews.userId, users.id))
                .where(and(
                    gte(pageViews.createdAt, since),
                    eq(pageViews.detectedSource, src)
                ))
                .orderBy(desc(pageViews.createdAt))
                .limit(5);
            recentBySource[src] = recent;
        }

        res.json({ sources, total, days, recentBySource });
    } catch (err: any) {
        next(err);
    }
});

// ─── GET /api/admin/analytics/pages — full per-page analytics ────────────────
router.get("/pages", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) { res.status(500).json({ pages: [], days: 30, totalViews: 0 }); return; }

        const days  = Math.min(Number(req.query.days) || 30, 365);
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const rows = await db
            .select({
                pagePath:       pageViews.pagePath,
                views:          sql<number>`cast(count(*) as int)`,
                uniqueUsers:    sql<number>`cast(count(distinct ${pageViews.userId}) as int)`,
                anonymousViews: sql<number>`cast(count(*) filter (where ${pageViews.userId} is null) as int)`,
                avgDuration:    sql<number>`cast(coalesce(round(avg(${pageViews.duration})), 0) as int)`,
                mobileViews:    sql<number>`cast(count(*) filter (where ${pageViews.deviceType} = 'mobile') as int)`,
                desktopViews:   sql<number>`cast(count(*) filter (where ${pageViews.deviceType} = 'desktop') as int)`,
                fromGoogle:     sql<number>`cast(count(*) filter (where ${pageViews.detectedSource} = 'google') as int)`,
                fromFacebook:   sql<number>`cast(count(*) filter (where ${pageViews.detectedSource} = 'facebook') as int)`,
                fromDirect:     sql<number>`cast(count(*) filter (where ${pageViews.detectedSource} = 'direct') as int)`,
                fromInstagram:  sql<number>`cast(count(*) filter (where ${pageViews.detectedSource} = 'instagram') as int)`,
                fromTiktok:     sql<number>`cast(count(*) filter (where ${pageViews.detectedSource} = 'tiktok') as int)`,
                fromWhatsapp:   sql<number>`cast(count(*) filter (where ${pageViews.detectedSource} = 'whatsapp') as int)`,
                fromOther:      sql<number>`cast(count(*) filter (where ${pageViews.detectedSource} not in ('google','facebook','direct','instagram','tiktok','whatsapp')) as int)`,
            })
            .from(pageViews)
            .where(gte(pageViews.createdAt, since))
            .groupBy(pageViews.pagePath)
            .orderBy(desc(sql`count(*)`))
            .limit(limit);

        const totalViews = rows.reduce((s, r) => s + r.views, 0);
        res.json({ pages: rows, days, totalViews });
    } catch (err: any) {
        next(err);
    }
});

// ─── GET /api/admin/analytics/active-now — pure presence Map ─────────────────
router.get("/active-now", requireAdmin, (req: Request, res: Response): void => {
    const cutoff = Date.now() - PRESENCE_TTL;
    const byPageMap = new Map<string, { total: number; loggedIn: number; anonymous: number }>();

    for (const entry of presence.values()) {
        if (entry.ts < cutoff) continue;
        const e = byPageMap.get(entry.pagePath) ?? { total: 0, loggedIn: 0, anonymous: 0 };
        e.total++;
        if (entry.userId) e.loggedIn++; else e.anonymous++;
        byPageMap.set(entry.pagePath, e);
    }

    const byPage = [...byPageMap.entries()]
        .map(([pagePath, counts]) => ({ pagePath, ...counts }))
        .sort((a, b) => b.total - a.total);

    res.json({ total: byPage.reduce((s, r) => s + r.total, 0), byPage });
});

export function createAnalyticsRouter(): RouterType {
    return router;
}

export default router;
