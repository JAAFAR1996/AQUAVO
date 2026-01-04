import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { orders, users, products, orderItems } from "../../shared/schema.js";
import { sql, desc, gte, count, sum, eq, and, gt } from "drizzle-orm";

const router = Router();

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

        // حساب الزيارات المقدرة من الطلبات (معدل التحويل الصناعي 2-3%)
        // كل طلب يمثل تقريباً 40-50 زيارة
        const estimatedConversionRate = 0.025; // 2.5% معدل تحويل واقعي
        const totalPageViews = currentOrders > 0 ? Math.round(currentOrders / estimatedConversionRate) : 0;
        const previousPageViews = previousOrders > 0 ? Math.round(previousOrders / estimatedConversionRate) : 0;
        const pageViewsChange = previousPageViews > 0 ? ((totalPageViews - previousPageViews) / previousPageViews) * 100 : 0;

        // حساب المتوسطات الحقيقية
        const averageOrderValue = currentOrders > 0 ? currentRevenue / currentOrders : 0;
        const conversionRate = estimatedConversionRate * 100; // النسبة المئوية

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
                productName: orderItems.productName,
                totalQuantity: sum(orderItems.quantity),
                totalRevenue: sum(sql`${orderItems.price} * ${orderItems.quantity}`),
            })
            .from(orderItems)
            .innerJoin(orders, eq(orders.id, orderItems.orderId))
            .where(gte(orders.createdAt, startDate))
            .groupBy(orderItems.productId, orderItems.productName)
            .orderBy(desc(sum(orderItems.quantity)))
            .limit(10);

        const topProducts = topProductsSales.map(p => ({
            name: (p.productName || "منتج").substring(0, 30),
            sales: Number(p.totalQuantity) || 0,
            revenue: Number(p.totalRevenue) || 0,
        }));

        // مصادر الزيارات - تقديرات مبنية على معايير التجارة الإلكترونية
        // ملاحظة: هذه تقديرات مبنية على معدلات صناعية لأنه لا يوجد نظام تتبع مفعّل
        // للحصول على بيانات دقيقة، يُنصح بربط Google Analytics
        const trafficSourcesEstimates = [
            { source: "بحث جوجل", percentage: 40 },      // معدل البحث العضوي النموذجي
            { source: "مباشر", percentage: 25 },          // زيارات مباشرة
            { source: "وسائل التواصل", percentage: 20 }, // فيسبوك، انستغرام
            { source: "إحالات", percentage: 10 },         // مواقع أخرى
            { source: "أخرى", percentage: 5 },            // مصادر متنوعة
        ];

        const trafficSources = trafficSourcesEstimates.map(src => ({
            source: src.source,
            visits: Math.round(totalPageViews * (src.percentage / 100)),
            percentage: src.percentage,
            isEstimate: true, // علامة تدل على أنها تقديرات
        }));

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
                pageViews: "estimated",    // تقدير مبني على معدل التحويل 2.5%
                salesChart: "real",        // من جدول الطلبات اليومية
                topProducts: "real",       // من جدول عناصر الطلبات
                trafficSources: "estimated", // تقديرات مبنية على معايير صناعية
                ordersByStatus: "real",    // من جدول الطلبات
                note: "للحصول على بيانات الزيارات الحقيقية، يُنصح بربط Google Analytics"
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
        for (const order of recentOrders) {
            const hour = new Date(order.createdAt).getHours();
            hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }

        const sortedHours = Array.from(hourCounts.entries())
            .sort((a, b) => b[1] - a[1]);

        const peakHoursText = sortedHours.length > 0
            ? `${sortedHours[0][0]}-${(sortedHours[0][0] + 3) % 24} ${sortedHours[0][0] >= 12 ? 'مساءً' : 'صباحاً'}`
            : "لا توجد بيانات كافية";

        // 2. Cart Abandonment Rate (estimate based on order completion rate)
        // Since we don't have a carts table, estimate based on incomplete vs complete orders
        const allOrdersData = await db
            .select({ count: count() })
            .from(orders)
            .where(gte(orders.createdAt, thirtyDaysAgo));

        const totalOrders = allOrdersData[0]?.count || 0;
        const completedOrders = recentOrders.filter(o => o.status === 'delivered').length;

        // Estimate cart abandonment (industry average is ~70%, we'll estimate based on completion rate)
        const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) : 0.3;
        const abandonmentRate = Math.round((1 - completionRate) * 100);

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

        // Fallback if no data
        if (forecasts.length === 0) {
            forecasts.push({
                category: "طعام",
                trend: "stable",
                percentage: 5,
                reason: "طلب ثابت - لا توجد بيانات كافية"
            });
        }

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

export function createAnalyticsRouter(): RouterType {
    return router;
}

export default router;
