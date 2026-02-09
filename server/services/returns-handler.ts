import { groqClient } from "./groq-client.js";
import { db } from "../db.js";
import {
    returnRequests,
    orders,
    orderItems,
    products,
    type InsertReturnRequest,
} from "../../shared/schema.js";
import { eq, desc, and } from "drizzle-orm";

/**
 * Returns Handler Service
 * يعالج طلبات الإرجاع باستخدام الذكاء الاصطناعي
 */
export class ReturnsHandler {

    /**
     * إنشاء طلب إرجاع
     */
    async createRequest(params: {
        orderId: string;
        userId: string;
        productId: string;
        reason: string;
        description: string;
        photos?: string[];
    }): Promise<{ requestId: string; status: string }> {
        try {
            // Validate order exists and belongs to user
            const order = await db
                .select()
                .from(orders)
                .where(
                    and(
                        eq(orders.id, params.orderId),
                        eq(orders.userId, params.userId)
                    )
                )
                .limit(1);

            if (order.length === 0) {
                throw new Error("Order not found");
            }

            // Validate product was in order
            const orderItem = await db
                .select()
                .from(orderItems)
                .where(
                    and(
                        eq(orderItems.orderId, params.orderId),
                        eq(orderItems.productId, params.productId)
                    )
                )
                .limit(1);

            if (orderItem.length === 0) {
                throw new Error("Product not found in order");
            }

            // Create return request
            const [request] = await db
                .insert(returnRequests)
                .values({
                    orderId: params.orderId,
                    userId: params.userId,
                    productId: params.productId,
                    reason: params.reason,
                    description: params.description,
                    photos: params.photos || [],
                    status: "pending",
                    createdAt: new Date(),
                })
                .returning({ id: returnRequests.id });

            return {
                requestId: request.id,
                status: "pending",
            };
        } catch (error) {
            console.error("Error creating return request:", error);
            throw error;
        }
    }

    /**
     * تحليل طلب الإرجاع بالذكاء الاصطناعي
     */
    async analyzeRequest(requestId: string): Promise<{
        recommendation: "approve" | "reject" | "review";
        confidence: number;
        reason: string;
        suggestedRefund: number;
        fraudRisk: "low" | "medium" | "high";
    }> {
        try {
            // Get request details
            const request = await db
                .select()
                .from(returnRequests)
                .where(eq(returnRequests.id, requestId))
                .limit(1);

            if (request.length === 0) {
                throw new Error("Request not found");
            }

            const r = request[0];

            // Get product info
            const product = await db
                .select()
                .from(products)
                .where(eq(products.id, r.productId))
                .limit(1);

            const p = product[0];

            // Get order info
            const order = await db
                .select()
                .from(orders)
                .where(eq(orders.id, r.orderId))
                .limit(1);

            // Calculate days since order
            const orderDate = new Date(order[0]?.createdAt || new Date());
            const daysSinceOrder = Math.floor(
                (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Use AI to analyze
            const prompt = `
أنت نظام ذكي لتحليل طلبات الإرجاع لمتجر أحواض الأسماك.

معلومات طلب الإرجاع:
- المنتج: ${p?.name || "غير معروف"}
- السعر: ${p?.price || 0} دينار
- سبب الإرجاع: ${r.reason}
- الوصف: ${r.description}
- أيام منذ الشراء: ${daysSinceOrder}
- صور مرفقة: ${(r.photos as string[])?.length || 0}

سياسة الإرجاع:
- الإرجاع مسموح خلال 14 يوم للمنتجات الجديدة
- المنتجات التالفة أو العيوب: إرجاع كامل
- تغيير الرأي: خصم 15%

حلل الطلب وقرر:
1. هل يُوافق/يُرفض/يحتاج مراجعة؟
2. نسبة الثقة في القرار
3. هل هناك احتمال احتيال؟
4. مبلغ الاسترداد المقترح

أجب بصيغة JSON:
{
  "recommendation": "approve|reject|review",
  "confidence": 0-100,
  "reason": "...",
  "suggestedRefundPercent": 0-100,
  "fraudRisk": "low|medium|high"
}
`;

            const text = await groqClient.chatText(
                [{ role: "user", content: prompt }],
                { temperature: 0.3, maxTokens: 300, model: "llama-3.1-8b-instant" }
            ) || "";

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Failed to parse AI response");
            }

            const parsed = JSON.parse(jsonMatch[0]);
            const productPrice = parseFloat(p?.price || "0");
            const suggestedRefund = (productPrice * parsed.suggestedRefundPercent) / 100;

            // Update request with AI analysis
            await db
                .update(returnRequests)
                .set({
                    aiAnalysis: {
                        recommendation: parsed.recommendation,
                        confidence: parsed.confidence,
                        reason: parsed.reason,
                        fraudRisk: parsed.fraudRisk,
                    },
                    suggestedRefund: suggestedRefund.toString(),
                    updatedAt: new Date(),
                })
                .where(eq(returnRequests.id, requestId));

            return {
                recommendation: parsed.recommendation,
                confidence: parsed.confidence,
                reason: parsed.reason,
                suggestedRefund,
                fraudRisk: parsed.fraudRisk,
            };
        } catch (error) {
            console.error("Error analyzing request:", error);
            throw error;
        }
    }

    /**
     * الموافقة على طلب الإرجاع
     */
    async approveRequest(
        requestId: string,
        refundAmount: number
    ): Promise<void> {
        try {
            await db
                .update(returnRequests)
                .set({
                    status: "approved",
                    approvedRefund: refundAmount.toString(),
                    processedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(returnRequests.id, requestId));
        } catch (error) {
            console.error("Error approving request:", error);
            throw error;
        }
    }

    /**
     * رفض طلب الإرجاع
     */
    async rejectRequest(requestId: string, reason: string): Promise<void> {
        try {
            await db
                .update(returnRequests)
                .set({
                    status: "rejected",
                    rejectionReason: reason,
                    processedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(returnRequests.id, requestId));
        } catch (error) {
            console.error("Error rejecting request:", error);
            throw error;
        }
    }

    /**
     * الحصول على طلبات الإرجاع للمستخدم
     */
    async getUserRequests(userId: string): Promise<
        Array<{
            id: string;
            orderId: string;
            productId: string;
            reason: string;
            status: string;
            createdAt: Date;
        }>
    > {
        try {
            return await db
                .select()
                .from(returnRequests)
                .where(eq(returnRequests.userId, userId))
                .orderBy(desc(returnRequests.createdAt));
        } catch (error) {
            console.error("Error getting user requests:", error);
            throw error;
        }
    }

    /**
     * الحصول على الطلبات المعلقة (للإدارة)
     */
    async getPendingRequests(): Promise<
        Array<{
            id: string;
            userId: string;
            orderId: string;
            productId: string;
            reason: string;
            aiAnalysis: unknown;
            suggestedRefund: string | null;
            createdAt: Date;
        }>
    > {
        try {
            return await db
                .select()
                .from(returnRequests)
                .where(eq(returnRequests.status, "pending"))
                .orderBy(desc(returnRequests.createdAt));
        } catch (error) {
            console.error("Error getting pending requests:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const returnsHandler = new ReturnsHandler();
