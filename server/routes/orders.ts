import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import * as Sentry from "@sentry/node";
import { orderLimiter } from "../middleware/rate-limit.js";
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
    quantity: z.number().int().positive("Quantity must be positive").max(100, "Maximum 100 items per product"),
    variantId: z.preprocess(
        (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
        z.string().min(1, "Variant ID cannot be empty").max(100, "Variant ID too long").optional()
    ),
}).strict("Order items may only include productId, quantity, and optional variantId");

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

    // Tag all order requests so errors surface under the "order" flow in Sentry
    router.use((_req, _res, next) => {
        Sentry.setTag("flow", "order");
        next();
    });

    // Create Order (rate-limited: 10/hour per IP)
    router.post("/", orderLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            // 🔒 Get client IP for ban checking
            const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
                || req.socket.remoteAddress
                || 'unknown';

            // 🚫 Check if IP is banned
            if (db && clientIp !== 'unknown') {
                try {
                    const banResult = await db.execute(sql`
                        SELECT 1 FROM banned_ips WHERE ip_address = ${clientIp} AND is_active = true LIMIT 1
                    `);
                    if (banResult.rows && banResult.rows.length > 0) {
                        res.status(403).json({
                            message: "تم حظر هذا الجهاز من الشراء بسبب رفض استلام طلبات سابقة. تواصل مع الدعم.",
                        });
                        return;
                    }
                } catch (banErr) {
                    console.error("[AQUAVO] IP ban check failed:", banErr);
                    // Don't block order if check fails
                }
            }

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

            // 📝 Store client IP with order for rejection tracking
            if (db && clientIp !== 'unknown') {
                try {
                    await db.execute(sql`
                        UPDATE orders SET client_ip = ${clientIp} WHERE id = ${order.id}
                    `);
                } catch (ipErr) {
                    console.error("[AQUAVO] Failed to store client IP:", ipErr);
                }
            }

            // Audit Log (don't crash order if audit fails)
            try {
                await storage.createAuditLog({
                    userId: userId || null,
                    action: "create",
                    entityType: "order",
                    entityId: order.id,
                    changes: { total: order.total, items: items.length }
                });
            } catch (auditErr) {
                console.error("[AQUAVO] Audit log failed (non-blocking):", auditErr);
            }

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
            // Use JSON.parse/stringify to strip any non-serializable values (BigInt, Decimal, circular refs)
            let safeOrder: Record<string, unknown>;
            try {
                safeOrder = JSON.parse(JSON.stringify(order, (_k, v) =>
                    typeof v === "bigint" ? Number(v) : v
                ));
            } catch {
                safeOrder = {
                    id: (order as any).id,
                    orderNumber: (order as any).orderNumber,
                    status: (order as any).status,
                    total: String((order as any).total ?? 0),
                };
            }

            const response: Record<string, unknown> = { ...safeOrder };
            if (loyaltyResult) {
                response.loyalty = {
                    pointsEarned: loyaltyResult.purchasePoints ?? 0,
                    cashbackEarned: loyaltyResult.roundingPoints ?? 0,
                    cashbackUsed: actualCashbackUsed,
                    roundedTotal: loyaltyResult.roundedTotal != null ? Number(loyaltyResult.roundedTotal) : undefined,
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

        // Batch fetch only items missing productName (old orders) — avoids N+1
        const missingIds = rawItems
            .filter((item: any) => !item.productName)
            .map((item: any) => item.productId);

        const productMap = new Map<string, any>();
        if (missingIds.length > 0) {
            try {
                const products = await storage.getProductsByIds(missingIds);
                products.forEach((p: any) => productMap.set(p.id, p));
            } catch { /* non-blocking — fall back to item IDs */ }
        }

        const enrichedItems = rawItems.map((item: any) => {
            if (item.productName) return item;
            const product = productMap.get(item.productId);
            return {
                ...item,
                productName: product?.name || item.productId,
                priceAtPurchase: item.priceAtPurchase || (product?.price ? String(product.price) : "0"),
            };
        });
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
            const productIds = rawItems.map((item: any) => item.productId);
            const trackProducts = productIds.length > 0 ? await storage.getProductsByIds(productIds) : [];
            const trackMap = new Map(trackProducts.map((p: any) => [p.id, p]));
            const enrichedItems = rawItems.map((item: any) => {
                const product = trackMap.get(item.productId);
                return {
                    name: product?.name || product?.arabicName || "منتج غير معروف",
                    imageUrl: product?.image || "",
                    quantity: item.quantity
                };
            });

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
