import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db";
import {
    orders,
    users,
    products,
    orderItems,
    churnPredictions,
    inventoryRecommendations,
} from "../../shared/schema";
import { eq, desc, gte, sql, count, sum, and } from "drizzle-orm";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * AI Dashboard Service
 * لوحة تحكم ذكية للمدير مع تحليلات وتوصيات
 */
export class AIDashboard {
    private model;

    constructor() {
        this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    /**
     * الحصول على ملخص اليوم
     */
    async getDailySummary(): Promise<{
        revenue: number;
        ordersCount: number;
        newCustomers: number;
        topProducts: Array<{ name: string; sales: number }>;
        trends: string[];
        alerts: string[];
        recommendations: string[];
        aiInsights: string;
    }> {
        if (!db) {
            throw new Error("Database not available");
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. إجمالي الإيرادات اليوم
        const revenueResult = await db
            .select({
                total: sql<string>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
            })
            .from(orders)
            .where(gte(orders.createdAt, today));

        const revenue = parseFloat(revenueResult[0]?.total || "0");

        // 2. عدد الطلبات اليوم
        const ordersResult = await db
            .select({ count: count() })
            .from(orders)
            .where(gte(orders.createdAt, today));

        const ordersCount = ordersResult[0]?.count || 0;

        // 3. العملاء الجدد اليوم
        const newCustomersResult = await db
            .select({ count: count() })
            .from(users)
            .where(gte(users.createdAt, today));

        const newCustomers = newCustomersResult[0]?.count || 0;

        // 4. أفضل المنتجات مبيعاً
        const topProductsResult = await db
            .select({
                name: products.name,
                sales: count(),
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(gte(orders.createdAt, today))
            .groupBy(products.id, products.name)
            .orderBy(desc(sql`count(*)`))
            .limit(5);

        const topProducts = topProductsResult.map((p) => ({
            name: p.name,
            sales: p.sales,
        }));

        // 5. جمع التنبيهات
        const alerts = await this.collectAlerts();

        // 6. جمع التوصيات
        const recommendations = await this.collectRecommendations();

        // 7. اكتشاف الاتجاهات
        const trends = await this.detectTrends();

        // 8. تحليل AI
        const aiInsights = await this.generateAIInsights({
            revenue,
            ordersCount,
            newCustomers,
            topProducts,
            alerts,
        });

        return {
            revenue,
            ordersCount,
            newCustomers,
            topProducts,
            trends,
            alerts,
            recommendations,
            aiInsights,
        };
    }

    /**
     * جمع التنبيهات
     */
    private async collectAlerts(): Promise<string[]> {
        const alerts: string[] = [];

        if (!db) return alerts;

        // 1. منتجات منخفضة المخزون
        const lowStock = await db
            .select({ count: count() })
            .from(products)
            .where(sql`CAST(${products.stock} AS INTEGER) < 5`);

        if ((lowStock[0]?.count || 0) > 0) {
            alerts.push(`⚠️ ${lowStock[0].count} منتجات بمخزون منخفض`);
        }

        // 2. طلبات معلقة قديمة
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const pendingOrders = await db
            .select({ count: count() })
            .from(orders)
            .where(
                and(
                    eq(orders.status, "pending"),
                    sql`${orders.createdAt} < ${twoDaysAgo}`
                )
            );

        if ((pendingOrders[0]?.count || 0) > 0) {
            alerts.push(`⏰ ${pendingOrders[0].count} طلبات معلقة منذ أكثر من يومين`);
        }

        // 3. عملاء معرضين للفقدان
        try {
            const highRiskChurn = await db
                .select({ count: count() })
                .from(churnPredictions)
                .where(eq(churnPredictions.riskLevel, "critical"));

            if ((highRiskChurn[0]?.count || 0) > 0) {
                alerts.push(`🚨 ${highRiskChurn[0].count} عملاء في خطر فقدان`);
            }
        } catch (e) {
            // Table might not exist
        }

        return alerts;
    }

    /**
     * جمع التوصيات
     */
    private async collectRecommendations(): Promise<string[]> {
        const recommendations: string[] = [];

        if (!db) return recommendations;

        // 1. منتجات بدون صور
        const noImages = await db
            .select({ count: count() })
            .from(products)
            .where(sql`${products.images} IS NULL OR array_length(${products.images}, 1) = 0`);

        if ((noImages[0]?.count || 0) > 0) {
            recommendations.push(`📸 أضف صور لـ ${noImages[0].count} منتجات`);
        }

        // 2. منتجات بدون وصف
        const noDescription = await db
            .select({ count: count() })
            .from(products)
            .where(sql`${products.description} IS NULL OR LENGTH(${products.description}) < 50`);

        if ((noDescription[0]?.count || 0) > 0) {
            recommendations.push(`📝 حسّن وصف ${noDescription[0].count} منتجات`);
        }

        // 3. توصيات المخزون
        try {
            const urgentStock = await db
                .select({ count: count() })
                .from(inventoryRecommendations)
                .where(eq(inventoryRecommendations.urgency, "critical"));

            if ((urgentStock[0]?.count || 0) > 0) {
                recommendations.push(`📦 ${urgentStock[0].count} منتجات تحتاج إعادة تخزين عاجلة`);
            }
        } catch (e) {
            // Table might not exist
        }

        return recommendations;
    }

    /**
     * اكتشاف الاتجاهات
     */
    private async detectTrends(): Promise<string[]> {
        const trends: string[] = [];

        if (!db) return trends;

        // مقارنة المبيعات مع الأمس
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayRevenue = await db
            .select({
                total: sql<string>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
            })
            .from(orders)
            .where(gte(orders.createdAt, today));

        const yesterdayRevenue = await db
            .select({
                total: sql<string>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
            })
            .from(orders)
            .where(
                and(
                    gte(orders.createdAt, yesterday),
                    sql`${orders.createdAt} < ${today}`
                )
            );

        const todayTotal = parseFloat(todayRevenue[0]?.total || "0");
        const yesterdayTotal = parseFloat(yesterdayRevenue[0]?.total || "0");

        if (yesterdayTotal > 0) {
            const change = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;

            if (change > 20) {
                trends.push(`📈 المبيعات ارتفعت ${change.toFixed(0)}% مقارنة بالأمس`);
            } else if (change < -20) {
                trends.push(`📉 المبيعات انخفضت ${Math.abs(change).toFixed(0)}% مقارنة بالأمس`);
            }
        }

        return trends;
    }

    /**
     * توليد تحليلات AI
     */
    private async generateAIInsights(data: {
        revenue: number;
        ordersCount: number;
        newCustomers: number;
        topProducts: Array<{ name: string; sales: number }>;
        alerts: string[];
    }): Promise<string> {
        try {
            const prompt = `
أنت مستشار أعمال لمتجر AQUAVO للأحواض والأسماك.

بيانات اليوم:
- الإيرادات: ${data.revenue.toLocaleString()} دينار
- عدد الطلبات: ${data.ordersCount}
- عملاء جدد: ${data.newCustomers}
- أفضل المنتجات: ${data.topProducts.map((p) => p.name).join(", ")}
- التنبيهات: ${data.alerts.join(", ") || "لا يوجد"}

اكتب ملخص تحليلي مختصر (3 جمل فقط) مع نصيحة عملية واحدة.
`;

            const result = await this.model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error("AI insights generation failed:", error);
            return "تعذر توليد التحليلات الذكية";
        }
    }

    /**
     * توقعات الأسبوع
     */
    async getWeeklyForecast(): Promise<{
        expectedRevenue: number;
        expectedOrders: number;
        bestDays: string[];
        recommendations: string[];
    }> {
        if (!db) {
            throw new Error("Database not available");
        }

        // جلب بيانات الأسابيع الماضية
        const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

        const weeklyData = await db
            .select({
                total: sql<string>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
                orderCount: count(),
            })
            .from(orders)
            .where(gte(orders.createdAt, fourWeeksAgo));

        const avgWeeklyRevenue = parseFloat(weeklyData[0]?.total || "0") / 4;
        const avgWeeklyOrders = (weeklyData[0]?.orderCount || 0) / 4;

        // استخدام AI للتوقع
        const forecast = await this.generateWeeklyForecast(
            avgWeeklyRevenue,
            avgWeeklyOrders
        );

        return {
            expectedRevenue: Math.round(avgWeeklyRevenue * 1.05), // +5% optimistic
            expectedOrders: Math.round(avgWeeklyOrders * 1.05),
            bestDays: ["الخميس", "الجمعة", "السبت"],
            recommendations: forecast.recommendations,
        };
    }

    /**
     * توليد توقعات أسبوعية
     */
    private async generateWeeklyForecast(
        avgRevenue: number,
        avgOrders: number
    ): Promise<{ recommendations: string[] }> {
        const recommendations: string[] = [];

        if (avgOrders < 10) {
            recommendations.push("📢 زيادة الحملات الإعلانية لجذب عملاء جدد");
        }

        if (avgRevenue < 100000) {
            recommendations.push("🎁 تقديم عروض خاصة لزيادة المبيعات");
        }

        recommendations.push("📱 تفعيل إشعارات للعملاء المنقطعين");

        return { recommendations };
    }

    /**
     * ملخص سريع للوحة التحكم
     */
    async getQuickStats(): Promise<{
        todayRevenue: number;
        todayOrders: number;
        pendingOrders: number;
        lowStockProducts: number;
        highRiskCustomers: number;
    }> {
        if (!db) {
            throw new Error("Database not available");
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // الإيرادات اليوم
        const revenueResult = await db
            .select({
                total: sql<string>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
            })
            .from(orders)
            .where(gte(orders.createdAt, today));

        // الطلبات اليوم
        const ordersResult = await db
            .select({ count: count() })
            .from(orders)
            .where(gte(orders.createdAt, today));

        // الطلبات المعلقة
        const pendingResult = await db
            .select({ count: count() })
            .from(orders)
            .where(eq(orders.status, "pending"));

        // المنتجات منخفضة المخزون
        const lowStockResult = await db
            .select({ count: count() })
            .from(products)
            .where(sql`CAST(${products.stock} AS INTEGER) < 5`);

        // العملاء عالي الخطورة
        let highRiskCustomers = 0;
        try {
            const churnResult = await db
                .select({ count: count() })
                .from(churnPredictions)
                .where(
                    sql`${churnPredictions.riskLevel} IN ('high', 'critical')`
                );
            highRiskCustomers = churnResult[0]?.count || 0;
        } catch (e) {
            // Table might not exist
        }

        return {
            todayRevenue: parseFloat(revenueResult[0]?.total || "0"),
            todayOrders: ordersResult[0]?.count || 0,
            pendingOrders: pendingResult[0]?.count || 0,
            lowStockProducts: lowStockResult[0]?.count || 0,
            highRiskCustomers,
        };
    }
}

// Export singleton instance
export const aiDashboard = new AIDashboard();
