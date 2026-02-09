import { groqClient } from "./groq-client.js";
import { db } from "../db.js";
import { orders, users, orderItems, products } from "../../shared/schema.js";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";

/**
 * Fraud Detector Service
 * كشف الطلبات المشبوهة والاحتيال
 */
export class FraudDetector {

    /**
     * تحليل طلب للكشف عن الاحتيال
     */
    async analyzeOrder(orderId: string): Promise<{
        riskScore: number;
        riskLevel: "low" | "medium" | "high" | "critical";
        flags: string[];
        recommendation: "approve" | "review" | "reject";
        reasoning: string;
    }> {
        try {
            if (!db) {
                throw new Error("Database not available");
            }

            // جلب بيانات الطلب
            const [order] = await db
                .select()
                .from(orders)
                .where(eq(orders.id, orderId))
                .limit(1);

            if (!order) {
                throw new Error("Order not found");
            }

            // جلب بيانات المستخدم
            const [user] = order.userId
                ? await db
                    .select()
                    .from(users)
                    .where(eq(users.id, order.userId))
                    .limit(1)
                : [null];

            // جلب منتجات الطلب
            const items = await db
                .select()
                .from(orderItems)
                .where(eq(orderItems.orderId, orderId));

            // جمع المؤشرات
            const indicators = await this.collectFraudIndicators(order, user, items);

            // حساب درجة الخطر
            const riskScore = this.calculateRiskScore(indicators);

            // تحديد مستوى الخطر
            const riskLevel = this.getRiskLevel(riskScore);

            // استخدام AI لتحليل إضافي
            const aiAnalysis = await this.getAIAnalysis(order, user, indicators);

            return {
                riskScore,
                riskLevel,
                flags: indicators.flags,
                recommendation: this.getRecommendation(riskScore),
                reasoning: aiAnalysis,
            };
        } catch (error) {
            console.error("Error analyzing order for fraud:", error);
            throw error;
        }
    }

    /**
     * جمع مؤشرات الاحتيال
     */
    private async collectFraudIndicators(
        order: any,
        user: any,
        items: any[]
    ): Promise<{
        flags: string[];
        scores: Record<string, number>;
    }> {
        const flags: string[] = [];
        const scores: Record<string, number> = {};

        // 1. طلب من مستخدم جديد
        if (user) {
            const accountAge = Date.now() - new Date(user.createdAt).getTime();
            const daysOld = accountAge / (1000 * 60 * 60 * 24);

            if (daysOld < 1) {
                flags.push("حساب جديد جداً (أقل من يوم)");
                scores.newAccount = 30;
            } else if (daysOld < 7) {
                flags.push("حساب جديد (أقل من أسبوع)");
                scores.newAccount = 15;
            }
        } else {
            flags.push("طلب من زائر غير مسجل");
            scores.guestOrder = 20;
        }

        // 2. قيمة طلب عالية
        const orderTotal = parseFloat(order.total || "0");
        if (orderTotal > 500000) {
            flags.push("قيمة طلب عالية جداً (> 500,000)");
            scores.highValue = 25;
        } else if (orderTotal > 200000) {
            flags.push("قيمة طلب عالية (> 200,000)");
            scores.highValue = 10;
        }

        // 3. كمية منتجات كبيرة
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        if (totalQuantity > 10) {
            flags.push(`كمية كبيرة (${totalQuantity} قطعة)`);
            scores.highQuantity = 15;
        }

        // 4. طلب في وقت غير معتاد
        const orderHour = new Date(order.createdAt).getHours();
        if (orderHour >= 1 && orderHour <= 5) {
            flags.push("طلب في وقت متأخر من الليل");
            scores.unusualTime = 10;
        }

        // 5. تحقق من الطلبات السابقة للمستخدم
        if (user?.id && db) {
            const recentOrders = await db
                .select({ count: count() })
                .from(orders)
                .where(
                    and(
                        eq(orders.userId, user.id),
                        gte(orders.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
                    )
                );

            const ordersToday = recentOrders[0]?.count || 0;
            if (ordersToday > 3) {
                flags.push(`طلبات متعددة اليوم (${ordersToday})`);
                scores.multipleOrders = 20;
            }
        }

        // 6. منتجات عالية القيمة
        const hasExpensiveItems = items.some(
            (item) => parseFloat(item.price || "0") > 100000
        );
        if (hasExpensiveItems) {
            flags.push("يحتوي على منتجات غالية");
            scores.expensiveItems = 10;
        }

        // 7. عنوان التوصيل
        if (!order.address || order.address.length < 20) {
            flags.push("عنوان توصيل غير مكتمل");
            scores.incompleteAddress = 15;
        }

        // 8. رقم هاتف
        if (!order.phone || order.phone.length < 10) {
            flags.push("رقم هاتف غير صالح");
            scores.invalidPhone = 20;
        }

        return { flags, scores };
    }

    /**
     * حساب درجة الخطر
     */
    private calculateRiskScore(indicators: {
        flags: string[];
        scores: Record<string, number>;
    }): number {
        const totalScore = Object.values(indicators.scores).reduce(
            (sum, score) => sum + score,
            0
        );

        // تطبيع الدرجة (0-100)
        return Math.min(100, totalScore);
    }

    /**
     * تحديد مستوى الخطر
     */
    private getRiskLevel(
        score: number
    ): "low" | "medium" | "high" | "critical" {
        if (score >= 70) return "critical";
        if (score >= 50) return "high";
        if (score >= 30) return "medium";
        return "low";
    }

    /**
     * تحديد التوصية
     */
    private getRecommendation(
        score: number
    ): "approve" | "review" | "reject" {
        if (score >= 70) return "reject";
        if (score >= 40) return "review";
        return "approve";
    }

    /**
     * تحليل AI إضافي
     */
    private async getAIAnalysis(
        order: any,
        user: any,
        indicators: { flags: string[]; scores: Record<string, number> }
    ): Promise<string> {
        try {
            const prompt = `
أنت خبير كشف احتيال لمتجر إلكتروني.

معلومات الطلب:
- رقم: ${order.id}
- القيمة: ${order.total} دينار
- العنوان: ${order.address || "غير محدد"}
- الهاتف: ${order.phone || "غير محدد"}
- التاريخ: ${order.createdAt}

معلومات العميل:
- مسجل: ${user ? "نعم" : "لا"}
- تاريخ التسجيل: ${user?.createdAt || "غير متاح"}
- البريد: ${user?.email || "غير متاح"}

المؤشرات المكتشفة:
${indicators.flags.map((f) => `- ${f}`).join("\n")}

اكتب تحليل مختصر (جملتين) عن مستوى الخطر.
`;

            const result = await groqClient.chatText(
                [{ role: "user", content: prompt }],
                { temperature: 0.3, maxTokens: 150, model: "llama-3.1-8b-instant" }
            );
            return (result || "").trim();
        } catch (error) {
            console.error("AI analysis failed:", error);
            return "تعذر الحصول على تحليل AI";
        }
    }

    /**
     * تحليل جميع الطلبات الحديثة
     */
    async analyzeRecentOrders(): Promise<{
        analyzed: number;
        flagged: number;
        critical: number;
    }> {
        if (!db) {
            throw new Error("Database not available");
        }

        console.log("[FraudDetector] Analyzing recent orders...");

        // جلب الطلبات الجديدة (آخر 24 ساعة)
        const recentOrders = await db
            .select({ id: orders.id })
            .from(orders)
            .where(
                gte(orders.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
            )
            .orderBy(desc(orders.createdAt))
            .limit(50);

        let analyzed = 0;
        let flagged = 0;
        let critical = 0;

        for (const order of recentOrders) {
            try {
                const result = await this.analyzeOrder(order.id);
                analyzed++;

                if (result.riskScore >= 30) {
                    flagged++;
                }

                if (result.riskLevel === "critical") {
                    critical++;
                    console.log(
                        `⚠️ Critical risk order: ${order.id} (Score: ${result.riskScore})`
                    );
                }
            } catch (error) {
                console.error(`Error analyzing order ${order.id}:`, error);
            }
        }

        console.log(
            `[FraudDetector] Complete: ${analyzed} analyzed, ${flagged} flagged, ${critical} critical`
        );

        return { analyzed, flagged, critical };
    }

    /**
     * الحصول على الطلبات عالية الخطورة
     */
    async getHighRiskOrders(): Promise<
        Array<{
            orderId: string;
            riskScore: number;
            riskLevel: string;
            flags: string[];
        }>
    > {
        if (!db) {
            throw new Error("Database not available");
        }

        // جلب الطلبات الجديدة
        const recentOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.status, "pending"))
            .orderBy(desc(orders.createdAt))
            .limit(20);

        const highRiskOrders: Array<{
            orderId: string;
            riskScore: number;
            riskLevel: string;
            flags: string[];
        }> = [];

        for (const order of recentOrders) {
            try {
                const result = await this.analyzeOrder(order.id);

                if (result.riskScore >= 40) {
                    highRiskOrders.push({
                        orderId: order.id,
                        riskScore: result.riskScore,
                        riskLevel: result.riskLevel,
                        flags: result.flags,
                    });
                }
            } catch (error) {
                console.error(`Error analyzing order ${order.id}:`, error);
            }
        }

        return highRiskOrders.sort((a, b) => b.riskScore - a.riskScore);
    }
}

// Export singleton instance
export const fraudDetector = new FraudDetector();
