import { db } from "../db.js";
import {
    autoOrders,
    products,
    users,
    orders,
    orderItems,
    type InsertAutoOrder,
} from "../../shared/schema.js";
import { eq, and, lte, gte, sql } from "drizzle-orm";

/**
 * Auto Order Processor Service
 * يدير الطلبات التلقائية/الاشتراكات للعملاء
 */
export class AutoOrderProcessor {
    /**
     * إنشاء طلب تلقائي جديد
     */
    async create(params: {
        userId: string;
        productId: string;
        frequency: "weekly" | "biweekly" | "monthly";
        quantity: number;
        startDate?: Date;
    }): Promise<{ id: string; nextOrderDate: Date }> {
        try {
            // Validate product exists
            const product = await db
                .select()
                .from(products)
                .where(eq(products.id, params.productId))
                .limit(1);

            if (product.length === 0) {
                throw new Error("Product not found");
            }

            // Calculate next order date
            const startDate = params.startDate || new Date();
            const nextOrderDate = this.calculateNextOrderDate(startDate, params.frequency);

            // Create auto order
            const [autoOrder] = await db
                .insert(autoOrders)
                .values({
                    userId: params.userId,
                    productId: params.productId,
                    frequency: params.frequency,
                    quantity: params.quantity,
                    nextOrderDate,
                    status: "active",
                    createdAt: new Date(),
                })
                .returning({ id: autoOrders.id });

            return {
                id: autoOrder.id,
                nextOrderDate,
            };
        } catch (error) {
            console.error("Error creating auto order:", error);
            throw error;
        }
    }

    /**
     * حساب تاريخ الطلب التالي
     */
    private calculateNextOrderDate(
        fromDate: Date,
        frequency: "weekly" | "biweekly" | "monthly"
    ): Date {
        const nextDate = new Date(fromDate);

        switch (frequency) {
            case "weekly":
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case "biweekly":
                nextDate.setDate(nextDate.getDate() + 14);
                break;
            case "monthly":
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
        }

        return nextDate;
    }

    /**
     * معالجة الطلبات المجدولة
     */
    /**
     * @deprecated QUARANTINED — DISABLED, always throws.
     *
     * This write path is broken and unsafe on three counts:
     *   1. it inserts `totalAmount`, `shippingMethod`, `paymentMethod` and
     *      `priceAtTime` — none of which exist in the schema, so every run would
     *      abort mid-way;
     *   2. it never writes `orders.items`, so the order would have no JSONB lines;
     *   3. it uses `db.insert(...)` with NO transaction, so a partial failure
     *      leaves an order with deducted stock and no line items.
     *
     * It is quarantined rather than deleted so the defect stays visible. To revive
     * it, route order creation through `storage.createOrderSecure()` (which writes
     * both line-item stores in one transaction) and delete this guard — not before.
     */
    async processScheduledOrders(): Promise<{
        processed: number;
        failed: number;
        skipped: number;
    }> {
        // Intentionally quarantined. The removed legacy implementation created
        // orders outside the canonical transaction and mutated products.stock
        // directly. Re-enable only by routing order creation through
        // storage.createOrderSecure(), whose relational line insert drives the
        // canonical inventory ledger trigger.
        throw new Error(
            "AutoOrderProcessor.processScheduledOrders() is QUARANTINED: automatic orders must use storage.createOrderSecure()."
        );
    }

    /**
     * إيقاف مؤقت للطلب التلقائي
     */
    async pause(orderId: string): Promise<void> {
        try {
            await db
                .update(autoOrders)
                .set({
                    status: "paused",
                    updatedAt: new Date(),
                })
                .where(eq(autoOrders.id, orderId));
        } catch (error) {
            console.error("Error pausing auto order:", error);
            throw error;
        }
    }

    /**
     * استئناف الطلب التلقائي
     */
    async resume(orderId: string): Promise<void> {
        try {
            // Calculate next order date from today
            const autoOrder = await db
                .select()
                .from(autoOrders)
                .where(eq(autoOrders.id, orderId))
                .limit(1);

            if (autoOrder.length === 0) {
                throw new Error("Auto order not found");
            }

            const nextOrderDate = this.calculateNextOrderDate(
                new Date(),
                autoOrder[0].frequency as "weekly" | "biweekly" | "monthly"
            );

            await db
                .update(autoOrders)
                .set({
                    status: "active",
                    nextOrderDate,
                    updatedAt: new Date(),
                })
                .where(eq(autoOrders.id, orderId));
        } catch (error) {
            console.error("Error resuming auto order:", error);
            throw error;
        }
    }

    /**
     * إلغاء الطلب التلقائي
     */
    async cancel(orderId: string): Promise<void> {
        try {
            await db
                .update(autoOrders)
                .set({
                    status: "cancelled",
                    cancelledAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(autoOrders.id, orderId));
        } catch (error) {
            console.error("Error cancelling auto order:", error);
            throw error;
        }
    }

    /**
     * الحصول على الطلبات التلقائية للمستخدم
     */
    async getUserAutoOrders(userId: string): Promise<
        Array<{
            id: string;
            productId: string;
            frequency: string;
            quantity: number;
            nextOrderDate: Date;
            status: string;
            totalOrders: number | null;
        }>
    > {
        try {
            return await db
                .select()
                .from(autoOrders)
                .where(eq(autoOrders.userId, userId));
        } catch (error) {
            console.error("Error getting user auto orders:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const autoOrderProcessor = new AutoOrderProcessor();
