import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { storage } from "../storage/index.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import * as Sentry from "@sentry/node";
import { orderLimiter, orderTrackingLimiter } from "../middleware/rate-limit.js";
import { z } from "zod";
import { analyticsTracker } from "../services/analytics-tracker.js";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { loyaltyStorage } from "../storage/loyalty-storage.js";
import { isStockError } from "../storage/order-storage.js";
import { ReferralStorage } from "../storage/referral-storage.js";
import { loyaltyNotifications } from "../services/loyalty-notifications.js";
import { sendOrderNotification } from "../services/order-notifications.js";
import { toPublicOrderItem } from "../../shared/public-product.js";

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

export const createOrderSchema = z.object({
    items: z.array(createOrderItemSchema).min(1, "At least one item required").max(50, "Maximum 50 items per order"),
    customerInfo: createOrderCustomerSchema,
    couponCode: z.string().optional(),
    // نظام النقاط - اختياري
    usePoints: z.boolean().optional().default(false),
    useCashback: z.boolean().optional().default(false),
    pointsToUse: z.number().int().min(0).optional().default(0),
    cashbackToUse: z.number().int().min(0).optional().default(0),
});

const idempotencyKeySchema = z.string().uuid();

export const ORDER_TRACKING_FAILURE_MESSAGE = "تعذر التحقق من الطلب. تأكد من المعلومات وحاول مرة ثانية.";

export function normalizePhoneDigits(value: string): string {
    const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
    const easternArabic = "۰۱۲۳۴۵۶۷۸۹";
    return value
        .replace(/[٠-٩]/g, (digit) => String(arabicIndic.indexOf(digit)))
        .replace(/[۰-۹]/g, (digit) => String(easternArabic.indexOf(digit)))
        .replace(/\D/g, "");
}

const orderTrackingSchema = z.object({
    phoneLast4: z.string().transform(normalizePhoneDigits).refine(
        (value) => value.length === 4,
        "The last four phone digits are required",
    ),
}).strict();

export function verifyOrderTrackingPhone(customerPhone: string | null | undefined, phoneLast4: string): boolean {
    const storedDigits = normalizePhoneDigits(customerPhone ?? "");
    const expected = storedDigits.length >= 4 ? storedDigits.slice(-4) : "0000";
    const supplied = normalizePhoneDigits(phoneLast4).padEnd(4, "0").slice(0, 4);
    return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)) && storedDigits.length >= 4;
}

export function buildPublicOrderTrackingResponse(order: {
    orderNumber: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}) {
    const orderDate = new Date(order.createdAt);
    const estimatedDelivery = new Date(orderDate);
    estimatedDelivery.setDate(orderDate.getDate() + (order.status === "delivered" ? 0 : order.status === "shipped" ? 2 : 4));

    return {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        estimatedDelivery,
    };
}

export function calculateActualCashbackUsed({
    useCashback,
    requestedCashback,
    availableCashback,
    orderTotal,
}: {
    useCashback: boolean;
    requestedCashback: number;
    availableCashback: number;
    orderTotal: number;
}): number {
    if (!useCashback) return 0;

    const requested = Math.max(0, Math.floor(requestedCashback));
    const available = Math.max(0, Math.floor(availableCashback));
    const payableTotal = Math.max(0, Math.floor(orderTotal));

    return Math.min(requested, available, payableTotal);
}

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

            const { items, customerInfo, couponCode, useCashback, cashbackToUse } = validationResult.data;

            const rawIdempotencyKey = req.get("Idempotency-Key");
            const parsedIdempotencyKey = rawIdempotencyKey
                ? idempotencyKeySchema.safeParse(rawIdempotencyKey)
                : null;
            if (parsedIdempotencyKey && !parsedIdempotencyKey.success) {
                res.status(400).json({ message: "Invalid Idempotency-Key header" });
                return;
            }
            const idempotencyKey = parsedIdempotencyKey?.success
                ? parsedIdempotencyKey.data
                : undefined;

            // A repeated request returns the already committed order and skips every
            // inventory, coupon, loyalty, notification, and analytics side effect.
            if (idempotencyKey) {
                const existingOrder = await storage.getOrder(idempotencyKey);
                if (existingOrder) {
                    res.status(200).json(existingOrder);
                    return;
                }
            }

            if (!userId && useCashback && cashbackToUse > 0) {
                res.status(400).json({
                    message: "Cashback redemption requires a logged-in customer",
                });
                return;
            }

            const order = await storage.createOrderSecure(
                userId || null,
                items,
                customerInfo,
                couponCode,
                { useCashback, cashbackToUse },
                idempotencyKey,
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
            // Financial loyalty effects are committed inside createOrderSecure; this block is post-commit side effects only.
            const loyaltyResult = (order as any).loyaltyResult ?? null;
            const actualCashbackUsed = Number((order as any).actualCashbackUsed ?? (order as any).cashbackUsed ?? 0);
            if (userId && loyaltyResult) {
                try {

                    console.log(`[AQUAVO Loyalty] Order ${order.id}: +${loyaltyResult.purchasePoints} points, +${loyaltyResult.roundingPoints} cashback, tier: ${loyaltyResult.newTier}${loyaltyResult.tierChanged ? ' (UPGRADED!)' : ''}`);

                    loyaltyNotifications.sendPostPurchaseNotifications(
                        userId,
                        order.id,
                        loyaltyResult,
                    ).catch(err => console.error('[AQUAVO Loyalty Notifications] Failed:', err));
                    // === REFERRAL: Mark First Purchase ===
                    try {
                        const referralResult = await referralStorage.markFirstPurchase(userId, order.id);
                        if (referralResult.referral) {
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
                    console.error("[AQUAVO Loyalty] Post-commit side effects failed:", loyaltyErr);
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

            // === TELEGRAM ORDER NOTIFICATION ===
            try {
                // Use the order's own stored line items — they already carry the chosen
                // variant label and the real price paid (variant price), so the admin
                // sees EXACTLY what the customer selected, not just the base product.
                const storedItems = ((order as any).items as any[]) || [];
                const notifyItems = storedItems.map((item: any) => ({
                    productId: item.productId,
                    productName: item.productName || item.productId,
                    variantLabel: item.variantLabel,
                    quantity: Number(item.quantity) || 1,
                    priceAtPurchase: item.priceAtPurchase ?? 0,
                    lineTotal: item.lineTotal ?? (Number(item.priceAtPurchase ?? 0) * (Number(item.quantity) || 1)),
                }));

                sendOrderNotification({
                    orderId: order.id,
                    orderNumber: (order as any).orderNumber,
                    customerName: customerInfo.name,
                    customerPhone: customerInfo.phone,
                    customerAddress: customerInfo.address,
                    total: String((order as any).total ?? 0),
                    subtotal: (order as any).subtotal != null ? String((order as any).subtotal) : undefined,
                    shippingCost: (order as any).shippingCost != null ? String((order as any).shippingCost) : undefined,
                    discountTotal: (order as any).discountTotal != null ? String((order as any).discountTotal) : undefined,
                    paymentMethod: "الدفع عند الاستلام",
                    items: notifyItems,
                }).catch(err => console.error("[AQUAVO] Order notification failed:", err));
            } catch (notifyErr) {
                console.error("[AQUAVO] Order notification setup failed:", notifyErr);
            }

            res.status(201).json(response);
        } catch (err: any) {
            const rawIdempotencyKey = req.get("Idempotency-Key");
            const parsedIdempotencyKey = rawIdempotencyKey
                ? idempotencyKeySchema.safeParse(rawIdempotencyKey)
                : null;
            if (parsedIdempotencyKey?.success) {
                const existingOrder = await storage.getOrder(parsedIdempotencyKey.data);
                if (existingOrder) {
                    res.status(200).json(existingOrder);
                    return;
                }
            }
            // A stock/availability rejection is a conflict with the current
            // inventory state, not a malformed request. This includes the
            // DB-level enforce-mode canonical-ledger backstop, which
            // order-storage has already translated to the clean Arabic
            // STOCK_ERROR_INSUFFICIENT message. Return 409 (matching the cart
            // route's OUT_OF_STOCK convention) so a normal out-of-stock race
            // never surfaces as an opaque HTTP 500.
            if (isStockError(err.message) ||
                err.message?.includes('Insufficient stock')) {
                res.status(409).json({ message: err.message, code: "OUT_OF_STOCK" });
                return;
            }
            // Genuine client/validation faults stay 400.
            if (err.message?.includes('not found') ||
                err.message?.includes('Invalid')) {
                res.status(400).json({ message: err.message });
                return;
            }
            next(err);
        }
    });

    // Enrich order items with product names/prices/images from DB.
    // Stored items already carry productName, variantLabel and priceAtPurchase, but
    // NOT the product image — fetch it for every item so the confirmation page and
    // invoice can render a detailed, visual line (and backfill old orders that are
    // missing productName/price).
    async function enrichOrderItems(order: any) {
        const rawItems = (order.items as any[]) || [];

        // Batch fetch products for all line items (image isn't stored on the order).
        const allIds = Array.from(new Set(rawItems.map((item: any) => item.productId).filter(Boolean)));
        const productMap = new Map<string, any>();
        if (allIds.length > 0) {
            try {
                const products = await storage.getProductsByIds(allIds);
                products.forEach((p: any) => productMap.set(p.id, p));
            } catch { /* non-blocking — fall back to item IDs */ }
        }

        const enrichedItems = rawItems.map((item: any) => {
            const product = productMap.get(item.productId);
            // Prefer a variant-specific image when the chosen variant has one.
            let variantImage: string | undefined;
            if (item.variantId && Array.isArray(product?.variants)) {
                variantImage = product.variants.find((v: any) => v.id === item.variantId)?.image || undefined;
            }
            const image = item.image
                || variantImage
                || product?.thumbnail
                || product?.images?.[0]
                || product?.image
                || "";
            // `...item` used to spread the whole OrderLineItem, which carries the immutable per-unit
            // cost SNAPSHOT taken at sale time — costPrice, packagingCost, insertCost, costStatus,
            // costSource (shared/schema.ts:32-39). These routes are authenticated and ownership-checked,
            // so only the customer who placed the order ever saw them; that is still every customer being
            // shown what their purchase cost AQUAVO to buy. Rebuilt from an explicit allowlist instead.
            return toPublicOrderItem({
                ...item,
                productName: item.productName || product?.name || item.productId,
                priceAtPurchase: item.priceAtPurchase || (product?.price ? String(product.price) : "0"),
                image,
            });
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

    // A predictable order number alone must never expose order information.
    // Keep the legacy method closed with the same generic response used for a
    // missing order or failed verifier.
    router.get("/track/:orderNumber", orderTrackingLimiter, (_req: Request, res: Response): void => {
        res.status(404).json({ message: ORDER_TRACKING_FAILURE_MESSAGE });
    });

    // Existing orders need no migration: the last four digits are verified
    // against the customer phone already stored with the order.
    router.post("/track/:orderNumber", orderTrackingLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { orderNumber } = req.params as { orderNumber: string };
            const parsedOrderNumber = z.string().trim().min(3).max(100).safeParse(orderNumber);
            const parsedBody = orderTrackingSchema.safeParse(req.body ?? {});
            if (!parsedOrderNumber.success || !parsedBody.success) {
                res.status(404).json({ message: ORDER_TRACKING_FAILURE_MESSAGE });
                return;
            }

            const order = await storage.getOrder(parsedOrderNumber.data);
            if (!order || !verifyOrderTrackingPhone(order.customerPhone, parsedBody.data.phoneLast4)) {
                res.status(404).json({ message: ORDER_TRACKING_FAILURE_MESSAGE });
                return;
            }

            res.json(buildPublicOrderTrackingResponse(order));
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
            // Only allow the order owner or admin to view full private order details.
            // Guest orders must use the safe public tracking response.
            if (reqUser?.role !== "admin" && order.userId !== reqUser?.id) {
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
