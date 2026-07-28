import { groqClient } from "./groq-client.js";
import { db } from "../db.js";
import {
    predictedNeeds,
    orders,
    orderItems,
    orderItemsPreMigrationColumns,
    products,
    users,
    type InsertPredictedNeed,
} from "../../shared/schema.js";
import { eq, desc, and, gte, lt, sql } from "drizzle-orm";
// Canonical collected-amount definition — the ONE rule for "what the customer
// paid" (prefers persisted roundedTotal, else rounds total to the IQD step).
import { orderCollectedAmount } from "../../shared/order-financials.js";

/**
 * Predictive Analytics Service
 * يحلل سلوك العملاء ويتوقع احتياجاتهم المستقبلية
 */
export class PredictiveAnalytics {

    /**
     * تحليل تاريخ شراء المستخدم
     */
    async analyzePurchaseHistory(userId: string): Promise<{
        products: Array<{
            productId: string;
            productName: string;
            purchaseCount: number;
            lastPurchaseDate: Date;
            avgDaysBetweenPurchases: number;
        }>;
        totalOrders: number;
        avgOrderValue: number;
    }> {
        try {
            // Get user's order history
            const userOrders = await db
                .select({
                    orderId: orders.id,
                    total: orders.total,
                    roundedTotal: orders.roundedTotal,
                    createdAt: orders.createdAt,
                })
                .from(orders)
                .where(eq(orders.userId, userId))
                .orderBy(desc(orders.createdAt));

            if (userOrders.length === 0) {
                return { products: [], totalOrders: 0, avgOrderValue: 0 };
            }

            // Calculate average order value from the CANONICAL collected amount
            // (was raw parseFloat(orders.total), which ignores the persisted
            // roundedTotal the customer was actually charged).
            const totalAmount = userOrders.reduce(
                (sum, order) => sum + orderCollectedAmount(order),
                0
            );
            const avgOrderValue = totalAmount / userOrders.length;

            // Get products purchased by user
            const orderIds = userOrders.map((o) => o.orderId);
            const purchasedProducts = await db
                .select({
                    productId: orderItems.productId,
                    productName: products.name,
                    quantity: orderItems.quantity,
                    orderDate: orders.createdAt,
                })
                .from(orderItems)
                .innerJoin(products, eq(orderItems.productId, products.id))
                .innerJoin(orders, eq(orderItems.orderId, orders.id))
                .where(eq(orders.userId, userId))
                .orderBy(desc(orders.createdAt));

            // Group by product and calculate stats
            const productStats = new Map<
                string,
                {
                    productId: string;
                    productName: string;
                    purchases: Date[];
                }
            >();

            for (const item of purchasedProducts) {
                if (!item.productId) continue;

                const existing = productStats.get(item.productId);
                if (existing) {
                    existing.purchases.push(item.orderDate!);
                } else {
                    productStats.set(item.productId, {
                        productId: item.productId,
                        productName: item.productName || "",
                        purchases: [item.orderDate!],
                    });
                }
            }

            // Calculate average days between purchases
            const productsWithStats = Array.from(productStats.values()).map((p) => {
                const sortedDates = p.purchases.sort(
                    (a, b) => b.getTime() - a.getTime()
                );
                let avgDays = 30; // Default to 30 days

                if (sortedDates.length >= 2) {
                    let totalDays = 0;
                    for (let i = 0; i < sortedDates.length - 1; i++) {
                        const diff =
                            sortedDates[i].getTime() - sortedDates[i + 1].getTime();
                        totalDays += diff / (1000 * 60 * 60 * 24);
                    }
                    avgDays = totalDays / (sortedDates.length - 1);
                }

                return {
                    productId: p.productId,
                    productName: p.productName,
                    purchaseCount: p.purchases.length,
                    lastPurchaseDate: sortedDates[0],
                    avgDaysBetweenPurchases: Math.round(avgDays),
                };
            });

            return {
                products: productsWithStats,
                totalOrders: userOrders.length,
                avgOrderValue,
            };
        } catch (error) {
            console.error("Error analyzing purchase history:", error);
            throw error;
        }
    }

    /**
     * حساب موعد إعادة الشراء المتوقع
     */
    calculateReplenishmentDate(
        lastPurchaseDate: Date,
        avgDaysBetweenPurchases: number
    ): Date {
        const nextPurchase = new Date(lastPurchaseDate);
        nextPurchase.setDate(nextPurchase.getDate() + avgDaysBetweenPurchases);
        return nextPurchase;
    }

    /**
     * توقع احتياجات المستخدم باستخدام AI
     */
    async predictNeeds(userId: string): Promise<
        Array<{
            productId: string;
            productName: string;
            probability: number;
            predictedDate: Date;
            reason: string;
            category: "replenishment" | "upgrade" | "seasonal" | "complementary";
        }>
    > {
        try {
            const history = await this.analyzePurchaseHistory(userId);

            if (history.products.length === 0) {
                return [];
            }

            const predictions: Array<{
                productId: string;
                productName: string;
                probability: number;
                predictedDate: Date;
                reason: string;
                category: "replenishment" | "upgrade" | "seasonal" | "complementary";
            }> = [];

            const now = new Date();

            for (const product of history.products) {
                const predictedDate = this.calculateReplenishmentDate(
                    product.lastPurchaseDate,
                    product.avgDaysBetweenPurchases
                );

                // Calculate probability based on purchase frequency and timing
                const daysSinceLastPurchase = Math.round(
                    (now.getTime() - product.lastPurchaseDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                let probability = 50; // Base probability
                let reason = "";
                let category: "replenishment" | "upgrade" | "seasonal" | "complementary" =
                    "replenishment";

                // Higher probability if overdue
                if (daysSinceLastPurchase >= product.avgDaysBetweenPurchases) {
                    const overdueFactor = Math.min(
                        daysSinceLastPurchase / product.avgDaysBetweenPurchases,
                        2
                    );
                    probability = Math.min(50 + overdueFactor * 25, 95);
                    reason = `آخر شراء منذ ${daysSinceLastPurchase} يوم - متوسط الشراء كل ${product.avgDaysBetweenPurchases} يوم`;
                } else {
                    // Calculate days until predicted need
                    const daysUntilNeeded = Math.round(
                        (predictedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    probability = Math.max(30, 70 - daysUntilNeeded);
                    reason = `متوقع الحاجة خلال ${daysUntilNeeded} يوم بناءً على نمط الشراء`;
                }

                // Higher probability for frequent purchases
                if (product.purchaseCount >= 3) {
                    probability = Math.min(probability + 10, 95);
                    reason += ` - تم الشراء ${product.purchaseCount} مرات`;
                }

                // Only include predictions with probability > 40
                if (probability > 40) {
                    predictions.push({
                        productId: product.productId,
                        productName: product.productName,
                        probability,
                        predictedDate,
                        reason,
                        category,
                    });
                }
            }

            // Sort by probability descending
            predictions.sort((a, b) => b.probability - a.probability);

            const topPredictions = predictions.slice(0, 10);

            // Enrich top predictions with AI insight
            if (topPredictions.length > 0 && groqClient.hasKeys()) {
                try {
                    const summaryText = topPredictions
                        .slice(0, 5)
                        .map(p => `${p.productName}: احتمال ${p.probability}% - ${p.reason}`)
                        .join("\n");

                    const insight = await groqClient.chatText(
                        [{ role: "user", content: `أنت محلل بيانات لمتجر أحواض أسماك. لخّص هذه التوقعات في جملة واحدة مفيدة للمشرف:\n${summaryText}` }],
                        { temperature: 0.3, maxTokens: 100, model: "llama-3.1-8b-instant" }
                    );

                    if (insight && topPredictions[0]) {
                        topPredictions[0].reason = `${topPredictions[0].reason} | تحليل AI: ${insight.trim()}`;
                    }
                } catch {
                    // AI enrichment is optional
                }
            }

            return topPredictions;
        } catch (error) {
            console.error("Error predicting needs:", error);
            throw error;
        }
    }

    /**
     * حفظ التوقع في قاعدة البيانات
     */
    async savePrediction(data: InsertPredictedNeed): Promise<void> {
        try {
            // Check if prediction already exists
            const existing = await db
                .select()
                .from(predictedNeeds)
                .where(
                    and(
                        eq(predictedNeeds.userId, data.userId),
                        eq(predictedNeeds.productId, data.productId)
                    )
                )
                .limit(1);

            if (existing.length > 0) {
                // Update existing prediction
                await db
                    .update(predictedNeeds)
                    .set({
                        probability: data.probability,
                        predictedDate: data.predictedDate as Date,
                        reason: data.reason,
                        category: data.category,
                        basedOn: data.basedOn,
                        updatedAt: new Date(),
                    })
                    .where(eq(predictedNeeds.id, existing[0].id));
            } else {
                // Insert new prediction
                await db.insert(predictedNeeds).values({
                    ...data,
                    predictedDate: data.predictedDate as Date,
                });
            }
        } catch (error) {
            console.error("Error saving prediction:", error);
            throw error;
        }
    }

    /**
     * الحصول على توقعات المستخدم
     */
    async getPredictionsForUser(userId: string): Promise<
        Array<{
            id: string;
            productId: string;
            probability: string;
            predictedDate: Date | null;
            reason: string | null;
            category: string | null;
            notified: boolean | null;
        }>
    > {
        try {
            return await db
                .select()
                .from(predictedNeeds)
                .where(
                    and(
                        eq(predictedNeeds.userId, userId),
                        eq(predictedNeeds.converted, false)
                    )
                )
                .orderBy(desc(predictedNeeds.probability));
        } catch (error) {
            console.error("Error getting predictions:", error);
            throw error;
        }
    }

    /**
     * تشغيل التوقعات اليومية لجميع المستخدمين
     */
    async runDailyPredictions(): Promise<{
        usersAnalyzed: number;
        predictionsCreated: number;
    }> {
        console.log("[PredictiveAnalytics] Starting daily predictions...");

        try {
            // Get all users with orders in the last 90 days
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const activeUsers = await db
                .selectDistinct({ userId: orders.userId })
                .from(orders)
                .where(gte(orders.createdAt, ninetyDaysAgo));

            let predictionsCreated = 0;

            for (const { userId } of activeUsers) {
                if (!userId) continue;

                try {
                    const predictions = await this.predictNeeds(userId);

                    for (const prediction of predictions) {
                        await this.savePrediction({
                            userId,
                            productId: prediction.productId,
                            probability: prediction.probability.toString(),
                            predictedDate: prediction.predictedDate,
                            reason: prediction.reason,
                            category: prediction.category,
                            basedOn: {
                                lastPurchaseDate: new Date().toISOString(),
                                consumptionRate: 1,
                                similarUsersPattern: false,
                            },
                        });
                        predictionsCreated++;
                    }
                } catch (error) {
                    console.error(`Error processing user ${userId}:`, error);
                    // Continue with other users
                }
            }

            console.log(
                `[PredictiveAnalytics] Completed: ${activeUsers.length} users, ${predictionsCreated} predictions`
            );

            return {
                usersAnalyzed: activeUsers.length,
                predictionsCreated,
            };
        } catch (error) {
            console.error("[PredictiveAnalytics] Daily predictions failed:", error);
            throw error;
        }
    }

    /**
     * التحقق من تحويل التوقع لشراء فعلي
     */
    async checkConversions(): Promise<number> {
        try {
            // Get predictions that haven't been checked
            const pendingPredictions = await db
                .select()
                .from(predictedNeeds)
                .where(eq(predictedNeeds.converted, false));

            let conversions = 0;

            for (const prediction of pendingPredictions) {
                // Check if user bought this product after prediction
                const purchase = await db
                    // DEPLOYMENT COMPATIBILITY: pre-migration projection. See shared/schema.ts.
                    .select(orderItemsPreMigrationColumns)
                    .from(orderItems)
                    .innerJoin(orders, eq(orderItems.orderId, orders.id))
                    .where(
                        and(
                            eq(orders.userId, prediction.userId),
                            eq(orderItems.productId, prediction.productId),
                            gte(orders.createdAt, prediction.createdAt)
                        )
                    )
                    .limit(1);

                if (purchase.length > 0) {
                    await db
                        .update(predictedNeeds)
                        .set({
                            converted: true,
                            convertedAt: new Date(),
                        })
                        .where(eq(predictedNeeds.id, prediction.id));
                    conversions++;
                }
            }

            return conversions;
        } catch (error) {
            console.error("Error checking conversions:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const predictiveAnalytics = new PredictiveAnalytics();
