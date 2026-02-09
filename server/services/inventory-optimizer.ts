import { groqClient } from "./groq-client.js";
import { db } from "../db.js";
import {
    inventoryRecommendations,
    products,
    orderItems,
    orders,
    type InsertInventoryRecommendation,
} from "../../shared/schema.js";
import { eq, desc, and, gte, sql, count, sum } from "drizzle-orm";

/**
 * Inventory Optimizer Service
 * يحلل المخزون ويقدم توصيات ذكية
 */
export class InventoryOptimizer {

    /**
     * تحليل منتج واحد
     */
    async analyzeProduct(productId: string): Promise<{
        productId: string;
        productName: string;
        currentStock: number;
        avgDailySales: number;
        daysUntilStockout: number;
        recommendation: "urgent" | "soon" | "normal" | "excess";
        suggestedReorderQty: number;
        reason: string;
    }> {
        try {
            // Get product info
            const product = await db
                .select()
                .from(products)
                .where(eq(products.id, productId))
                .limit(1);

            if (product.length === 0) {
                throw new Error("Product not found");
            }

            const p = product[0];

            // Calculate average daily sales (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const salesData = await db
                .select({
                    totalSold: sum(orderItems.quantity),
                })
                .from(orderItems)
                .innerJoin(orders, eq(orderItems.orderId, orders.id))
                .where(
                    and(
                        eq(orderItems.productId, productId),
                        gte(orders.createdAt, thirtyDaysAgo)
                    )
                );

            const totalSold = Number(salesData[0]?.totalSold || 0);
            const avgDailySales = totalSold / 30;
            const currentStock = p.stock || 0;

            // Calculate days until stockout
            const daysUntilStockout =
                avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999;

            // Determine recommendation
            let recommendation: "urgent" | "soon" | "normal" | "excess";
            let reason: string;

            if (daysUntilStockout <= 7) {
                recommendation = "urgent";
                reason = `المخزون سينفد خلال ${daysUntilStockout} أيام فقط!`;
            } else if (daysUntilStockout <= 14) {
                recommendation = "soon";
                reason = `المخزون سينفد خلال ${daysUntilStockout} يوم`;
            } else if (daysUntilStockout > 90) {
                recommendation = "excess";
                reason = `المخزون يكفي لـ ${daysUntilStockout} يوم - قد يكون زائداً`;
            } else {
                recommendation = "normal";
                reason = `المخزون يكفي لـ ${daysUntilStockout} يوم`;
            }

            // Calculate suggested reorder quantity (30 days stock)
            const suggestedReorderQty = Math.max(
                0,
                Math.ceil(avgDailySales * 30 - currentStock)
            );

            return {
                productId,
                productName: p.name || "",
                currentStock,
                avgDailySales: Math.round(avgDailySales * 100) / 100,
                daysUntilStockout,
                recommendation,
                suggestedReorderQty,
                reason,
            };
        } catch (error) {
            console.error("Error analyzing product:", error);
            throw error;
        }
    }

    /**
     * تحليل جميع المنتجات
     */
    async analyzeAllProducts(): Promise<{
        analyzed: number;
        urgent: number;
        soon: number;
        excess: number;
    }> {
        console.log("[InventoryOptimizer] Starting inventory analysis...");

        try {
            const allProducts = await db.select({ id: products.id }).from(products);

            let urgent = 0;
            let soon = 0;
            let excess = 0;

            for (const product of allProducts) {
                try {
                    const analysis = await this.analyzeProduct(product.id);

                    // Save recommendation
                    await this.saveRecommendation({
                        productId: product.id,
                        recommendationType: analysis.recommendation,
                        currentStock: analysis.currentStock,
                        suggestedAction: analysis.suggestedReorderQty > 0
                            ? `طلب ${analysis.suggestedReorderQty} وحدة`
                            : "لا حاجة للإجراء",
                        reason: analysis.reason,
                        estimatedImpact: analysis.recommendation === "urgent"
                            ? "خسارة مبيعات محتملة"
                            : undefined,
                        priority: analysis.recommendation === "urgent"
                            ? "high"
                            : analysis.recommendation === "soon"
                                ? "medium"
                                : "low",
                    });

                    if (analysis.recommendation === "urgent") urgent++;
                    if (analysis.recommendation === "soon") soon++;
                    if (analysis.recommendation === "excess") excess++;
                } catch (error) {
                    console.error(`Error analyzing product ${product.id}:`, error);
                }
            }

            console.log(
                `[InventoryOptimizer] Analysis complete: ${allProducts.length} products, ${urgent} urgent, ${soon} soon, ${excess} excess`
            );

            // Generate AI summary if there are urgent items
            let aiSummary: string | undefined;
            if ((urgent > 0 || soon > 0) && groqClient.hasKeys()) {
                try {
                    aiSummary = await groqClient.chatText(
                        [{ role: "user", content: `أنت مدير مخزون لمتجر أحواض أسماك. لخّص الوضع في جملة: ${urgent} منتج عاجل، ${soon} قريب النفاد، ${excess} فائض، من أصل ${allProducts.length} منتج.` }],
                        { temperature: 0.3, maxTokens: 80, model: "llama-3.1-8b-instant" }
                    );
                } catch {
                    // AI summary is optional
                }
            }

            return {
                analyzed: allProducts.length,
                urgent,
                soon,
                excess,
                ...(aiSummary ? { aiSummary: aiSummary.trim() } : {}),
            };
        } catch (error) {
            console.error("[InventoryOptimizer] Analysis failed:", error);
            throw error;
        }
    }

    /**
     * حفظ التوصية
     */
    async saveRecommendation(data: InsertInventoryRecommendation): Promise<void> {
        try {
            // Check if exists
            const existing = await db
                .select()
                .from(inventoryRecommendations)
                .where(eq(inventoryRecommendations.productId, data.productId))
                .limit(1);

            if (existing.length > 0) {
                await db
                    .update(inventoryRecommendations)
                    .set({
                        ...data,
                        updatedAt: new Date(),
                    })
                    .where(eq(inventoryRecommendations.productId, data.productId));
            } else {
                await db.insert(inventoryRecommendations).values({
                    ...data,
                    createdAt: new Date(),
                });
            }
        } catch (error) {
            console.error("Error saving recommendation:", error);
            throw error;
        }
    }

    /**
     * الحصول على التوصيات العاجلة
     */
    async getUrgentRecommendations(): Promise<
        Array<{
            id: string;
            productId: string;
            recommendationType: string;
            currentStock: number | null;
            suggestedAction: string | null;
            reason: string | null;
            priority: string | null;
        }>
    > {
        try {
            return await db
                .select()
                .from(inventoryRecommendations)
                .where(
                    and(
                        sql`${inventoryRecommendations.recommendationType} IN ('urgent', 'soon')`,
                        eq(inventoryRecommendations.dismissed, false)
                    )
                )
                .orderBy(desc(inventoryRecommendations.createdAt));
        } catch (error) {
            console.error("Error getting urgent recommendations:", error);
            throw error;
        }
    }

    /**
     * تجاهل توصية
     */
    async dismissRecommendation(id: string): Promise<void> {
        try {
            await db
                .update(inventoryRecommendations)
                .set({
                    dismissed: true,
                    dismissedAt: new Date(),
                })
                .where(eq(inventoryRecommendations.id, id));
        } catch (error) {
            console.error("Error dismissing recommendation:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const inventoryOptimizer = new InventoryOptimizer();
