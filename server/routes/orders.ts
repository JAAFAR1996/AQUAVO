import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import { z } from "zod";
import { analyticsTracker } from "../services/analytics-tracker.js";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { loyaltyStorage } from "../storage/loyalty-storage.js";
import { ReferralStorage } from "../storage/referral-storage.js";
import { loyaltyNotifications } from "../services/loyalty-notifications.js";

const referralStorage = new ReferralStorage();

// Order validation schema
const createOrderItemSchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.number().int().positive("Quantity must be positive").max(100, "Maximum 100 items per product")
});

const createOrderCustomerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
    phone: z.string().min(10, "Invalid phone number").max(15, "Phone number too long"),
    address: z.string().min(10, "Address too short").max(500, "Address too long"),
    email: z.string().email("Invalid email").optional().or(z.literal(""))
});

const createOrderSchema = z.object({
    items: z.array(createOrderItemSchema).min(1, "At least one item required").max(50, "Maximum 50 items per order"),
    customerInfo: createOrderCustomerSchema,
    couponCode: z.string().optional(),
    // نظام النقاط - اختياري
    usePoints: z.boolean().optional().default(false),
    useCashback: z.boolean().optional().default(false),
    pointsToUse: z.number().int().min(0).optional().default(0),
    cashbackToUse: z.number().int().min(0).optional().default(0),
});

export function createOrderRouter(): RouterType {
    const router = Router();

    // Create Order
    router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            // Validate input
            const validationResult = createOrderSchema.safeParse(req.body);
            if (!validationResult.success) {
                res.status(400).json({
                    message: "بيانات الطلب غير صالحة",
                    errors: validationResult.error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
                return;
            }

            const { items, customerInfo, couponCode, usePoints, useCashback, pointsToUse, cashbackToUse } = validationResult.data;

            const order = await storage.createOrderSecure(
                userId || null,
                items,
                customerInfo,
                couponCode
            );

            // Audit Log
            await storage.createAuditLog({
                userId: userId || "guest",
                action: "create",
                entityType: "order",
                entityId: order.id,
                changes: { total: order.total, items: items.length }
            });

            // Mark cart session as converted for accurate analytics
            analyticsTracker.trackSessionStatus(
                (req as any).sessionID || "unknown",
                "converted"
            ).catch(() => { });

            // Track purchase interactions for each item (fire-and-forget)
            for (const item of items) {
                analyticsTracker.trackPurchase({
                    userId: userId || undefined,
                    sessionId: (req as any).sessionID || "unknown",
                    productId: item.productId,
                    orderId: order.id,
                    quantity: item.quantity,
                    price: 0, // Price is calculated server-side in createOrderSecure
                }).catch(() => { });
            }

            // === AQUAVO LOYALTY POINTS SYSTEM ===
            // ⚠️ نقاط الولاء لا تُصرف أبداً - فقط الباقي (cashback)
            let loyaltyResult = null;
            let actualCashbackUsed = 0;
            if (userId) {
                try {
                    const orderTotal = parseFloat(String(order.total)) || 0;

                    // ✅ التحقق من رصيد الباقي الفعلي قبل المعالجة

                    if (useCashback && cashbackToUse > 0) {
                        const balance = await loyaltyStorage.getBalance(userId);
                        // لا نسمح باستخدام أكثر مما يملك
                        actualCashbackUsed = Math.min(cashbackToUse, balance.cashbackBalance);
                    }

                    loyaltyResult = await loyaltyStorage.processOrderPoints(
                        userId,
                        order.id,
                        orderTotal,
                        0, // نقاط الولاء لا تُصرف أبداً
                        actualCashbackUsed,
                    );

                    console.log(`[AQUAVO Loyalty] Order ${order.id}: +${loyaltyResult.purchasePoints} points, +${loyaltyResult.roundingPoints} cashback, tier: ${loyaltyResult.newTier}${loyaltyResult.tierChanged ? ' (UPGRADED!)' : ''}`);

                    // إرسال إشعارات الولاء (نقاط، ترقية، كوبونات)
                    loyaltyNotifications.sendPostPurchaseNotifications(
                        userId,
                        order.id,
                        loyaltyResult,
                    ).catch(err => console.error('[AQUAVO Loyalty Notifications] Failed:', err));
                    // === REFERRAL: Mark First Purchase ===
                    try {
                        const referralResult = await referralStorage.markFirstPurchase(userId, order.id);
                        if (referralResult.referral) {
                            // منح نقاط إضافية للمُحيل عند أول شراء للصديق
                            await loyaltyStorage.awardReferralPurchaseBonus(
                                referralResult.referral.referrerUserId,
                                order.id,
                            );
                            console.log(`[AQUAVO Referral] First purchase by referred user ${userId}, referrer ${referralResult.referral.referrerUserId} awarded bonus points`);
                        }
                    } catch (refErr) {
                        console.error("[AQUAVO Referral] markFirstPurchase failed:", refErr);
                    }
                } catch (loyaltyErr) {
                    console.error("[AQUAVO Loyalty] Points processing failed:", loyaltyErr);
                    // لا نوقف الطلب بسبب فشل النقاط
                }
            }

            // === AQUAVO AI CORPORATION - EVENT BUS TRIGGER ===
            try {
                if (db) {
                    await db.execute(sql`
                        INSERT INTO event_bus (source_agent, target_agent, event_type, payload, status, priority, created_at)
                        VALUES ('sales', 'logistics', 'new_order_received', ${JSON.stringify({ orderId: order.id, customerAddress: customerInfo.address })}::jsonb, 'pending', 1, NOW())
                    `);
                    console.log("[AQUAVO AI] Alerted Logistics Agent for Order", order.id);
                }
            } catch (e) {
                console.error("[AQUAVO AI] EventBus Notification Failed:", e);
            }

            // إضافة معلومات النقاط في الرد
            const response: any = { ...order };
            if (loyaltyResult) {
                response.loyalty = {
                    pointsEarned: loyaltyResult.purchasePoints,
                    cashbackEarned: loyaltyResult.roundingPoints,
                    cashbackUsed: actualCashbackUsed,
                    roundedTotal: loyaltyResult.roundedTotal,
                    tier: loyaltyResult.newTier,
                    tierUpgraded: loyaltyResult.tierChanged,
                };
            }

            res.status(201).json(response);
        } catch (err: any) {
            // Convert known validation errors to 400
            if (err.message?.includes('not found') ||
                err.message?.includes('Insufficient stock') ||
                err.message?.includes('Invalid')) {
                res.status(400).json({ message: err.message });
                return;
            }
            next(err);
        }
    });

    // Enrich order items with product names/prices from DB (handles old orders missing productName)
    async function enrichOrderItems(order: any) {
        const rawItems = (order.items as any[]) || [];
        const enrichedItems = await Promise.all(
            rawItems.map(async (item: any) => {
                // If productName already exists (new orders), use it
                if (item.productName) return item;
                // Otherwise fetch from DB (old orders)
                try {
                    const product = await storage.getProduct(item.productId);
                    return {
                        ...item,
                        productName: product?.name || item.productId,
                        priceAtPurchase: item.priceAtPurchase || (product?.price ? String(product.price) : "0"),
                    };
                } catch {
                    return { ...item, productName: item.productId, priceAtPurchase: item.priceAtPurchase || "0" };
                }
            })
        );
        // Build loyalty object from stored DB columns
        const loyalty = {
            pointsEarned: (order as any).pointsEarned ?? 0,
            cashbackEarned: (order as any).roundingCashback ?? 0,
            cashbackUsed: (order as any).cashbackUsed ?? 0,
            roundedTotal: (order as any).roundedTotal ? parseFloat(String((order as any).roundedTotal)) : undefined,
        };
        return { ...order, items: enrichedItems, loyalty };
    }

    // Get My Orders
    router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const orders = await storage.getOrders(sess?.userId);
            // Enrich all orders with product names
            const enriched = await Promise.all((orders || []).map(enrichOrderItems));
            res.json(enriched);
        } catch (err) {
            next(err);
        }
    });

    // Track Order Publicly - only expose safe fields (no PII)
    // Must be defined BEFORE /:id to avoid route conflict
    router.get("/track/:orderNumber", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { orderNumber } = req.params as { orderNumber: string };
            const order = await storage.getOrder(orderNumber);
            if (!order) {
                res.status(404).json({ message: "Order not found" });
                return;
            }

            // Get order items from the JSONB field (items are stored inline, not in a separate table)
            const rawItems = (order.items as any[]) || [];
            const enrichedItems = await Promise.all(
                rawItems.map(async (item: any) => {
                    const product = await storage.getProduct(item.productId);
                    return {
                        name: product?.name || product?.arabicName || "منتج غير معروف",
                        imageUrl: product?.image || "",
                        quantity: item.quantity
                    };
                })
            );

            // Calculate estimated delivery
            // Base estimation: orders take 1-3 days to process, then 1-3 days to ship
            const orderDate = new Date(order.createdAt || new Date());
            const estimatedDate = new Date(orderDate);

            if (order.status === "delivered") {
                estimatedDate.setDate(orderDate.getDate()); // Already delivered
            } else if (order.status === "shipped") {
                estimatedDate.setDate(orderDate.getDate() + 2); // 2 days from order if shipped
            } else {
                estimatedDate.setDate(orderDate.getDate() + 4); // General estimate: 4 days
            }

            // Only return safe tracking info, hide customer PII
            res.json({
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                total: order.total,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                estimatedDelivery: estimatedDate,
                items: enrichedItems
            });
        } catch (err) {
            next(err);
        }
    });

    // Get Order by ID for authenticated user (order confirmation page)
    router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const reqUser = (req as any).user;

            const order = await storage.getOrder(id);
            if (!order) {
                res.status(404).json({ message: "Order not found" });
                return;
            }
            // Only allow the order owner or admin to view it
            if (order.userId && order.userId !== reqUser?.id && reqUser?.role !== "admin") {
                res.status(403).json({ message: "Access denied" });
                return;
            }
            // Enrich with product names
            const enriched = await enrichOrderItems(order);
            res.json(enriched);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
