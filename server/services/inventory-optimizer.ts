import { groqClient } from "./groq-client.js";
import { getDb } from "../db.js";
import { TEST_ORDER_SQL } from "./dashboard-truth.js";
import { alias } from "drizzle-orm/pg-core";
import {
    inventoryRecommendations,
    products,
    orderItems,
    orders,
} from "../../shared/schema.js";
import { eq, desc, and, gte, isNull, inArray, not, sum, lt } from "drizzle-orm";
import { aiMonitor } from "./ai-monitor.js";

/**
 * Inventory Optimizer Service
 * يحلل المخزون ويقدم توصيات ذكية
 */
type RecommendationWrite = Pick<typeof inventoryRecommendations.$inferInsert,
    "productId" | "currentStock" | "suggestedOrderQuantity" | "urgency" | "aiReason">;

function requireDatabase() {
    const db = getDb();
    if (!db) throw new Error("Database not connected");
    return db;
}

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
            const db = requireDatabase();
            // Get product info
            const product = await db
                .select({ stock: products.stock, name: products.name })
                .from(products)
                .where(and(eq(products.id, productId), isNull(products.deletedAt)))
                .limit(1);

            if (product.length === 0) {
                throw new Error("Product not found");
            }

            const p = product[0];

            // Calculate average daily sales (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Match the delivered, non-test unit counts used by dashboard-truth.
            const o = alias(orders, "o");
            const salesData = await db
                .select({
                    totalSold: sum(orderItems.quantity),
                })
                .from(orderItems)
                .innerJoin(o, eq(orderItems.orderId, o.id))
                .where(
                    and(
                        eq(orderItems.productId, productId),
                        eq(o.status, "delivered"), not(TEST_ORDER_SQL),
                        gte(o.createdAt, thirtyDaysAgo), lt(o.createdAt, new Date())
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
        failed: number;
        urgent: number;
        soon: number;
        excess: number;
    }> {
        console.log("[InventoryOptimizer] Starting inventory analysis...");

        try {
            const db = requireDatabase();
            const allProducts = await db.select({ id: products.id }).from(products).where(isNull(products.deletedAt));
            let failed = 0;

            let urgent = 0;
            let soon = 0;
            let excess = 0;

            for (const product of allProducts) {
                try {
                    const analysis = await this.analyzeProduct(product.id);

                    // Save recommendation
                    await this.saveRecommendation({
                        productId: product.id,
                        currentStock: analysis.currentStock,
                        suggestedOrderQuantity: analysis.suggestedReorderQty,
                        urgency: analysis.recommendation === "urgent" ? "critical" : analysis.recommendation === "soon" ? "high" : "low",
                        aiReason: analysis.reason,
                    });

                    if (analysis.recommendation === "urgent") urgent++;
                    if (analysis.recommendation === "soon") soon++;
                    if (analysis.recommendation === "excess") excess++;
                } catch (error) {
                    failed++;
                    console.error(`Error analyzing product ${product.id}:`, error);
                }
            }

            const analyzed = allProducts.length - failed;
            console.log(
                `[InventoryOptimizer] Analysis complete: ${analyzed} saved, ${failed} failed, ${urgent} urgent, ${soon} soon, ${excess} excess`
            );

            // Generate AI summary if there are urgent items
            let aiSummary: string | undefined;
            if ((urgent > 0 || soon > 0) && groqClient.hasKeys()) {
                try {
                    aiSummary = await groqClient.chatText(
                        [{ role: "user", content: `أنت مدير مخزون لمتجر أحواض أسماك. لخّص الوضع في جملة: ${urgent} منتج عاجل، ${soon} قريب النفاد، ${excess} فائض، من أصل ${analyzed} منتج.` }],
                        { temperature: 0.3, maxTokens: 80, model: "llama-3.1-8b-instant" }
                    );
                    aiMonitor.log({ event: "inventory_optimization", level: "info", success: true, model: "llama-3.1-8b-instant", details: { analyzed, failed, urgent, soon, excess } });
                } catch {
                    // AI summary is optional
                }
            }

            return {
                analyzed, failed,
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
    async saveRecommendation(data: RecommendationWrite): Promise<void> {
        await requireDatabase().transaction(async tx => {
            // The existing schema has a non-unique product index. Serializing
            // refreshes on the parent row prevents duplicate inserts on retries.
            await tx.select({ id: products.id }).from(products).where(eq(products.id, data.productId)).for("update");
            const [existing] = await tx.select({ id: inventoryRecommendations.id })
                .from(inventoryRecommendations).where(eq(inventoryRecommendations.productId, data.productId))
                .orderBy(desc(inventoryRecommendations.createdAt)).limit(1);
            if (existing) {
                // Preserve the operator's ordered, dismissed or completed status.
                await tx.update(inventoryRecommendations).set({ ...data, updatedAt: new Date() })
                    .where(eq(inventoryRecommendations.id, existing.id));
            } else {
                await tx.insert(inventoryRecommendations).values({ ...data, status: "pending" });
            }
        });
    }

    async getUrgentRecommendations() {
        const rows = await requireDatabase().select({
            id: inventoryRecommendations.id,
            productId: products.id,
            productName: products.name,
            currentStock: inventoryRecommendations.currentStock,
            suggestedOrderQuantity: inventoryRecommendations.suggestedOrderQuantity,
            urgency: inventoryRecommendations.urgency,
            reason: inventoryRecommendations.aiReason,
        }).from(inventoryRecommendations)
            .innerJoin(products, eq(products.id, inventoryRecommendations.productId))
            .where(and(
                isNull(products.deletedAt),
                eq(inventoryRecommendations.status, "pending"),
                inArray(inventoryRecommendations.urgency, ["critical", "high"]),
            )).orderBy(desc(inventoryRecommendations.updatedAt));
        // Keep legacy dashboard response fields for existing callers.
        return rows.map(row => ({
            ...row,
            recommendationType: row.urgency === "critical" ? "urgent" : "soon",
            priority: row.urgency === "critical" ? "urgent" : "high",
            suggestedAction: `طلب ${row.suggestedOrderQuantity} وحدة`,
        }));
    }

    async dismissRecommendation(id: string): Promise<boolean> {
        const updated = await requireDatabase().update(inventoryRecommendations)
            .set({ status: "dismissed", updatedAt: new Date() })
            .where(and(eq(inventoryRecommendations.id, id), eq(inventoryRecommendations.status, "pending")))
            .returning({ id: inventoryRecommendations.id });
        return updated.length > 0;
    }

}

// Export singleton instance
export const inventoryOptimizer = new InventoryOptimizer();
