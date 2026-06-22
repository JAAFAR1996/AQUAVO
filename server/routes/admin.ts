import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAdmin, getSession } from "../middleware/auth.js";
import { insertProductSchema } from "../../shared/schema.js";
import { broadcastDiscountForProduct } from "./newsletter.js";
import { embeddingGenerator } from "../services/embedding-generator.js";
import { clearProductsCache } from "./products.js";
import { sql, eq, desc, gte, and, count, sum } from "drizzle-orm";
import { z } from "zod";
import {
    users, orders, pageViews, searchQueries, productViews, cartItems,
    favorites, reviews, churnPredictions, customerProfiles, products,
} from "../../shared/schema.js";
import { OperationalError } from "../middleware/error-handler.js";
import { getDb } from "../db.js";
import { recordFinancialChange, actorFromRequest, type FinancialEntityType } from "../services/accountingAuditTrail.js";

/** Strip sensitive fields before sending user data to client */
function sanitizeUser(user: Record<string, any>) {
    const { passwordHash, verificationToken, verificationTokenExpiresAt, ...safe } = user;
    return safe;
}

const numericInputSchema = z.union([z.string(), z.number()]);

const adminOrderUpdateSchema = z.object({
    status: z.string().min(1).max(64).optional(),
    paymentStatus: z.string().min(1).max(64).optional(),
    shippingCost: numericInputSchema.optional(),
    roundedTotal: numericInputSchema.optional(),
    carrier: z.string().max(100).nullable().optional(),
    codReceived: z.boolean().optional(),
    boxCost: numericInputSchema.optional(),
    source: z.string().min(1).max(64).optional(),
    financiallyCounted: z.boolean().nullable().optional(),
}).strip();

const adminProductUpdateSchema = z.object({
    slug: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    categoryId: z.string().nullable().optional(),
    subcategory: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    price: numericInputSchema.optional(),
    originalPrice: numericInputSchema.nullable().optional(),
    currency: z.string().optional(),
    images: z.array(z.string()).optional(),
    thumbnail: z.string().optional(),
    rating: numericInputSchema.optional(),
    reviewCount: z.number().int().min(0).optional(),
    stock: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    isNew: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    isProductOfWeek: z.boolean().optional(),
    specifications: z.record(z.string(), z.any()).optional(),
    variants: z.array(z.any()).nullable().optional(),
    hasVariants: z.boolean().optional(),
    costPrice: numericInputSchema.optional(),
    packagingCost: numericInputSchema.optional(),
    insertCost: numericInputSchema.optional(),
    imageBase64: z.string().optional(),
}).strip();

const adminSettingsUpdateSchema = z.object({
    store_name: z.string(),
    support_email: z.string(),
    maintenance_mode: z.string(),
    orders_enabled: z.string(),
    shipping_fee: z.string(),
}).strip();

export function getCloudinaryFolder(brand?: string | null, slugOrId?: string | null): string {
    const cleanBrand = brand
        ? brand.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
        : "unknown";
    const brandName = cleanBrand || "unknown";

    const cleanSlugOrId = slugOrId
        ? slugOrId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
        : "unnamed";
    const slugName = cleanSlugOrId || "unnamed";

    return `aquavo/products/${brandName}/${slugName}`;
}

export function validateImageUrls(thumbnail: string | undefined | null, images: string[] | undefined | null) {
    if (thumbnail && thumbnail.trim() !== "") {
        if (thumbnail.startsWith('data:')) {
            throw new OperationalError("عذراً، فشل رفع الصورة المصغرة (Thumbnail) إلى Cloudinary.", 400);
        }
        const isCloudinary = thumbnail.startsWith('https://res.cloudinary.com/');
        const isLocal = thumbnail.startsWith('/images/') || thumbnail.startsWith('images/');
        if (!isCloudinary && !isLocal) {
            throw new OperationalError(`عذراً، الرابط ${thumbnail} ليس رابطاً صالحاً (يجب أن يكون رابط Cloudinary أو مساراً محلياً سابقاً).`, 400);
        }
    }

    if (images && Array.isArray(images)) {
        for (const img of images) {
            if (img && img.trim() !== "") {
                if (img.startsWith('data:')) {
                    throw new OperationalError("عذراً، فشل رفع إحدى الصور الإضافية إلى Cloudinary.", 400);
                }
                const isCloudinary = img.startsWith('https://res.cloudinary.com/');
                const isLocal = img.startsWith('/images/') || img.startsWith('images/');
                if (!isCloudinary && !isLocal) {
                    throw new OperationalError(`عذراً، الرابط ${img} ليس رابطاً صالحاً (يجب أن يكون رابط Cloudinary أو مساراً محلياً سابقاً).`, 400);
                }
            }
        }
    }
}

export function createAdminRouter(): RouterType {
    const router = Router();

    // Apply admin check to all routes in this router
    router.use(requireAdmin);

    // Dashboard Stats (Example) - logic might need to be added to storage
    // router.get("/stats", ...);

    // Orders
    router.get("/orders", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const orders = await storage.getOrders();

            // Enrich orders with product names
            const enrichedOrders = await Promise.all(orders.map(async (order) => {
                if (order.items && Array.isArray(order.items)) {
                    const enrichedItems = await Promise.all(
                        (order.items as any[]).map(async (item: any) => {
                            let productName = item.productName;
                            let price = item.priceAtPurchase || item.price;
                            if ((!productName || !price) && item.productId) {
                                const product = await storage.getProduct(item.productId);
                                productName = productName || product?.name || `منتج #${item.productId.slice(0, 8)}`;
                                if (!price) price = product?.price || 0;
                            }
                            return {
                                ...item,
                                productName,
                                price: Number(price) || 0
                            };
                        })
                    );
                    return { ...order, items: enrichedItems };
                }
                return order;
            }));

            res.json(enrichedOrders);
        } catch (err) {
            next(err);
        }
    });

    router.put("/orders/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const updates = adminOrderUpdateSchema.parse(req.body);
            const previousOrder = await storage.getOrder(id);
            const order = await storage.updateOrder(id, updates);

            if (order) {
                await storage.createAuditLog({
                    userId: (req as any).session?.userId || "admin",
                    action: "update",
                    entityType: "order",
                    entityId: order.id,
                    changes: updates
                });

                // Financial audit trail: record before→after for money-affecting fields.
                // These bypass REALIZED_STATUSES or change captured amounts, so they must be traceable.
                try {
                    const fdb = getDb();
                    if (fdb) {
                        const actor = actorFromRequest(req);
                        const financialFields: { field: keyof typeof updates; entity: FinancialEntityType }[] = [
                            { field: "financiallyCounted", entity: "order" },
                            { field: "boxCost", entity: "order" },
                            { field: "total", entity: "order" },
                        ];
                        for (const { field, entity } of financialFields) {
                            if (updates[field] === undefined) continue;
                            const oldVal = (previousOrder as any)?.[field] ?? null;
                            const newVal = (order as any)?.[field] ?? null;
                            if (String(oldVal) === String(newVal)) continue;
                            await recordFinancialChange(fdb, {
                                entityType: entity,
                                entityId: order.id,
                                action: field === "financiallyCounted" ? "status_change" : "update",
                                fieldName: String(field),
                                oldValue: oldVal,
                                newValue: newVal,
                                reason: typeof (req.body as any)?.financialReason === "string" ? (req.body as any).financialReason : null,
                                performedBy: actor.id,
                                performedByName: actor.name,
                            });
                        }
                    }
                } catch (auditErr) {
                    console.error("[Admin] Failed to record financial audit trail:", auditErr);
                    // Never block the order update on audit-trail failure.
                }

                const newStatus = updates.status;
                const oldStatus = previousOrder?.status;

                // ✅ فك تجميد النقاط عند تأكيد التوصيل
                if (newStatus === "delivered" && oldStatus !== "delivered") {
                    try {
                        const { loyaltyStorage } = await import("../storage/loyalty-storage.js");
                        if ((order as any).userId) {
                            const orderTotal = parseFloat(String(order.total)) || 0;
                            await loyaltyStorage.approveOrderPoints(
                                (order as any).userId,
                                order.id,
                                orderTotal
                            );
                            console.log(`[Admin] ✅ Approved loyalty points for order ${order.id}`);

                            // 🎁 Bonus Reveal — توليد مكافأة إضافية عند التوصيل
                            try {
                                const bonus = await loyaltyStorage.generateOrderBonus(
                                    (order as any).userId,
                                    order.id
                                );
                                if (bonus) {
                                    console.log(`[Admin] 🎁 Bonus generated for order ${order.id}: ${bonus.label}`);
                                }
                            } catch (bonusErr) {
                                console.error("[Admin] Failed to generate bonus:", bonusErr);
                            }

                            // 📊 Milestone check — فحص معالم التقدم
                            try {
                                const milestoneResult = await loyaltyStorage.checkMilestones(
                                    (order as any).userId
                                );
                                if (milestoneResult.milestones.length > 0) {
                                    console.log(`[Admin] 📊 Milestones for order ${order.id}:`, milestoneResult.milestones.map(m => m.message));
                                }
                            } catch (milestoneErr) {
                                console.error("[Admin] Failed to check milestones:", milestoneErr);
                            }

                            // 🏅 Badge check — فحص الشارات
                            try {
                                const { badgeEngine } = await import("../storage/badge-engine.js");
                                const newBadges = await badgeEngine.checkAndAwardBadges(
                                    (order as any).userId
                                );
                                if (newBadges.length > 0) {
                                    console.log(`[Admin] 🏅 Badges awarded for order ${order.id}:`, newBadges.map(b => b.title));
                                }
                            } catch (badgeErr) {
                                console.error("[Admin] Failed to check badges:", badgeErr);
                            }

                            // 📋 Challenge progress — تحديث التحديات
                            try {
                                const { challengeStorage } = await import("../storage/challenge-storage.js");
                                await challengeStorage.updateProgress(
                                    (order as any).userId,
                                    "cross_category",
                                    1
                                );
                            } catch (challengeErr) {
                                console.error("[Admin] Failed to update challenges:", challengeErr);
                            }
                        }
                    } catch (loyaltyErr) {
                        console.error("[Admin] Failed to approve loyalty points:", loyaltyErr);
                        // Don't block order status update
                    }
                }

                // ❌ إلغاء النقاط المجمدة عند إلغاء الطلب
                if (newStatus === "cancelled" && oldStatus !== "cancelled") {
                    try {
                        const { loyaltyStorage } = await import("../storage/loyalty-storage.js");
                        if ((order as any).userId) {
                            await loyaltyStorage.cancelOrderPoints(
                                (order as any).userId,
                                order.id
                            );
                            console.log(`[Admin] ❌ Cancelled loyalty points for order ${order.id}`);
                        }
                    } catch (loyaltyErr) {
                        console.error("[Admin] Failed to cancel loyalty points:", loyaltyErr);
                    }
                }

                // ❌ رفض الاستلام — إلغاء النقاط + حظر IP بعد 3 رفضات
                if (newStatus === "rejected" && oldStatus !== "rejected") {
                    try {
                        const { loyaltyStorage } = await import("../storage/loyalty-storage.js");
                        if ((order as any).userId) {
                            await loyaltyStorage.cancelOrderPoints(
                                (order as any).userId,
                                order.id
                            );
                            console.log(`[Admin] ❌ Rejected order ${order.id} — loyalty points cancelled`);
                        }

                        // 🚫 حظر بالـ IP (مو بالحساب)
                        const { getDb } = await import("../db.js");
                        const dbConn = getDb();
                        if (dbConn) {
                            // جلب IP الطلب
                            const ipResult = await dbConn.execute(sql`
                                SELECT client_ip FROM orders WHERE id = ${order.id}
                            `);
                            const orderIp = (ipResult.rows?.[0] as any)?.client_ip;

                            if (orderIp) {
                                // إضافة أو تحديث عداد الرفضات لهذا IP
                                await dbConn.execute(sql`
                                    INSERT INTO banned_ips (ip_address, rejection_count, is_active, last_rejection_at, created_at)
                                    VALUES (${orderIp}, 1, false, NOW(), NOW())
                                    ON CONFLICT (ip_address)
                                    DO UPDATE SET
                                        rejection_count = banned_ips.rejection_count + 1,
                                        last_rejection_at = NOW()
                                `);

                                // التحقق: 3 رفضات = حظر
                                const countResult = await dbConn.execute(sql`
                                    SELECT rejection_count FROM banned_ips WHERE ip_address = ${orderIp}
                                `);
                                const rejCount = (countResult.rows?.[0] as any)?.rejection_count || 0;

                                if (rejCount >= 3) {
                                    await dbConn.execute(sql`
                                        UPDATE banned_ips
                                        SET is_active = true, ban_reason = 'حظر تلقائي: رفض استلام 3 طلبات'
                                        WHERE ip_address = ${orderIp}
                                    `);
                                    console.log(`[Admin] 🚫 IP ${orderIp} BANNED after ${rejCount} rejections`);
                                } else {
                                    console.log(`[Admin] ⚠️ IP ${orderIp} rejection count: ${rejCount}/3`);
                                }
                            }
                        }
                    } catch (rejectErr) {
                        console.error("[Admin] Failed to process rejection:", rejectErr);
                    }
                }

                // 📦 رجوع البضاعة للمخزون عند رجوع من العميل
                if (newStatus === "rejected_returned" && oldStatus !== "rejected_returned") {
                    try {
                        const { getDb } = await import("../db.js");
                        const { products: productsTable } = await import("../../shared/schema.js");
                        const { eq: eqOp, sql: sqlOp } = await import("drizzle-orm");
                        const dbConn = getDb();
                        if (dbConn && Array.isArray((order as any).items)) {
                            for (const item of ((order as any).items as any[])) {
                                if (item.productId && item.quantity) {
                                    await dbConn
                                        .update(productsTable)
                                        .set({ stock: sqlOp`stock + ${item.quantity}` } as any)
                                        .where(eqOp(productsTable.id, item.productId));
                                }
                            }
                            console.log(`[Admin] 📦 Stock restored for rejected_returned order ${order.id}`);
                        }
                    } catch (stockErr) {
                        console.error("[Admin] Failed to restore stock:", stockErr);
                    }
                    try {
                        const { loyaltyStorage } = await import("../storage/loyalty-storage.js");
                        if ((order as any).userId) {
                            await loyaltyStorage.cancelOrderPoints((order as any).userId, order.id);
                        }
                    } catch (loyaltyErr) {
                        console.error("[Admin] Failed to cancel loyalty points:", loyaltyErr);
                    }
                }

                // 🚚 رفض + بقي عند شركة الشحن — لا تغيير بالمخزون
                if (newStatus === "rejected_carrier" && oldStatus !== "rejected_carrier") {
                    try {
                        const { loyaltyStorage } = await import("../storage/loyalty-storage.js");
                        if ((order as any).userId) {
                            await loyaltyStorage.cancelOrderPoints((order as any).userId, order.id);
                        }
                    } catch (loyaltyErr) {
                        console.error("[Admin] Failed to cancel loyalty points:", loyaltyErr);
                    }
                }

                // 📦 استلام من شركة النقل — إرجاع المخزون
                if (newStatus === "returned" && oldStatus !== "returned") {
                    try {
                        const orderItems = (order as any).items;
                        if (Array.isArray(orderItems)) {
                            for (const item of orderItems) {
                                const productId = item.productId;
                                const qty = item.quantity || 1;
                                if (productId) {
                                    const product = await storage.getProduct(productId);
                                    if (product) {
                                        const newStock = (product.stock || 0) + qty;
                                        await storage.updateProduct(productId, { stock: newStock });
                                        console.log(`[Admin] 📦 Restored ${qty}x ${product.name} — new stock: ${newStock}`);
                                    }
                                }
                            }
                        }
                        console.log(`[Admin] 📦 Order ${order.id} returned — stock restored`);
                    } catch (stockErr) {
                        console.error("[Admin] Failed to restore stock:", stockErr);
                    }
                }

                // Send push notification when order status changes to shipped
                if (newStatus === "shipped" && oldStatus !== "shipped") {
                    try {
                        const webPush = await import("web-push");
                        const { getDb } = await import("../db.js");
                        const { pushSubscriptions } = await import("../../shared/schema.js");
                        const { eq, and } = await import("drizzle-orm");

                        const db = getDb();
                        const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
                        const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

                        if (db && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && (order as any).userId) {
                            webPush.default.setVapidDetails(
                                process.env.VAPID_SUBJECT || "mailto:info@aquavoiq.com",
                                VAPID_PUBLIC_KEY,
                                VAPID_PRIVATE_KEY
                            );

                            const subscriptions = await db.select().from(pushSubscriptions).where(
                                and(eq(pushSubscriptions.isActive, true), eq(pushSubscriptions.userId, (order as any).userId))
                            );

                            const payload = JSON.stringify({
                                title: "🚚 طلبك في الطريق إليك!",
                                body: `تم شحن طلبك #${order.id.slice(0, 8).toUpperCase()}. سيصل قريباً!`,
                                url: `/order-tracking/${order.id}`,
                                icon: "/icons/icon-192x192.png"
                            });

                            for (const sub of subscriptions) {
                                try {
                                    await webPush.default.sendNotification(
                                        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                                        payload
                                    );
                                } catch (sendErr) {
                                    console.error("Push send error:", sendErr);
                                }
                            }
                        }
                    } catch (pushErr) {
                        console.error("Failed to send push notification:", pushErr);
                    }
                }
            }

            res.json(order);
        } catch (err) { next(err); }
    });

    router.delete("/orders/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const deleted = await storage.deleteOrder(id);
            if (!deleted) {
                res.status(404).json({ success: false, message: "الطلب غير موجود" });
                return;
            }
            await storage.createAuditLog({
                userId: (req as any).session?.userId || "admin",
                action: "delete",
                entityType: "order",
                entityId: id,
                changes: {}
            });
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    });

    // Users
    // Users
    // Users Stats
    router.get("/users/stats", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const stats = await storage.getUserStats();
            res.json(stats);
        } catch (err) { next(err); }
    });

    // Users
    router.get("/users", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Check if pagination params are present
            if (req.query.page || req.query.limit || req.query.search) {
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 20;
                const search = req.query.search as string || undefined;

                const result = await storage.getUsersPaginated(page, limit, search);
                res.json({ ...result, users: result.users.map(sanitizeUser) });
            } else {
                // Backward compatibility: return all users if no pagination requested
                const users = await storage.getUsers();
                res.json(users.map(sanitizeUser));
            }
        } catch (err) {
            next(err);
        }
    });

    // ─── Customer Full Profile ────────────────────────────────────────────────
    router.get("/users/:id/profile", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const db = getDb();
            if (!db) { res.status(500).json({ message: "DB not connected" }); return; }

            const userId = req.params.id;

            // 1. Basic user info
            const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            if (!user) { res.status(404).json({ message: "العميل غير موجود" }); return; }

            // 2. Orders — parse items JSONB
            const userOrders = await db
                .select()
                .from(orders)
                .where(eq(orders.userId, userId))
                .orderBy(desc(orders.createdAt));

            const totalSpent = userOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
            const completedOrders = userOrders.filter(o => o.status === "delivered").length;
            const lastOrderDate = userOrders[0]?.createdAt ?? null;

            // 3. Page journey (last 200 views)
            const journey = await db
                .select({
                    pagePath: pageViews.pagePath,
                    duration: pageViews.duration,
                    deviceType: pageViews.deviceType,
                    detectedSource: pageViews.detectedSource,
                    createdAt: pageViews.createdAt,
                    sessionId: pageViews.sessionId,
                })
                .from(pageViews)
                .where(eq(pageViews.userId, userId))
                .orderBy(desc(pageViews.createdAt))
                .limit(200);

            // 4. Search history
            const searches = await db
                .select({
                    query: searchQueries.query,
                    resultsCount: searchQueries.resultsCount,
                    noResults: searchQueries.noResultsFound,
                    createdAt: searchQueries.createdAt,
                })
                .from(searchQueries)
                .where(eq(searchQueries.userId, userId))
                .orderBy(desc(searchQueries.createdAt))
                .limit(50);

            // 5. Product views with product name
            const prodViews = await db
                .select({
                    productId: productViews.productId,
                    productName: products.name,
                    productCategory: products.category,
                    viewDuration: productViews.viewDuration,
                    viewedAt: productViews.viewedAt,
                    source: productViews.source,
                })
                .from(productViews)
                .leftJoin(products, eq(products.id, productViews.productId))
                .where(eq(productViews.userId, userId))
                .orderBy(desc(productViews.viewedAt))
                .limit(50);

            // 6. Current cart
            const cart = await db
                .select({
                    productId: cartItems.productId,
                    productName: products.name,
                    quantity: cartItems.quantity,
                    variantLabel: cartItems.variantLabel,
                    addedAt: cartItems.createdAt,
                })
                .from(cartItems)
                .leftJoin(products, eq(products.id, cartItems.productId))
                .where(eq(cartItems.userId, userId));

            // 7. Favorites
            const favs = await db
                .select({
                    productId: favorites.productId,
                    productName: products.name,
                    productCategory: products.category,
                    addedAt: favorites.createdAt,
                })
                .from(favorites)
                .leftJoin(products, eq(products.id, favorites.productId))
                .where(eq(favorites.userId, userId));

            // 8. Reviews
            const userReviews = await db
                .select({
                    productId: reviews.productId,
                    productName: products.name,
                    rating: reviews.rating,
                    title: reviews.title,
                    comment: reviews.comment,
                    status: reviews.status,
                    createdAt: reviews.createdAt,
                })
                .from(reviews)
                .leftJoin(products, eq(products.id, reviews.productId))
                .where(eq(reviews.userId, userId))
                .orderBy(desc(reviews.createdAt));

            // 9. Churn prediction
            const [churn] = await db
                .select()
                .from(churnPredictions)
                .where(eq(churnPredictions.userId, userId))
                .limit(1);

            // 10. AI customer profile
            const [aiProfile] = await db
                .select()
                .from(customerProfiles)
                .where(eq(customerProfiles.userId, userId))
                .limit(1);

            // ── Derived Analytics ──
            // Most visited pages
            const pageFreq = new Map<string, number>();
            for (const v of journey) pageFreq.set(v.pagePath, (pageFreq.get(v.pagePath) ?? 0) + 1);
            const topPages = [...pageFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
                .map(([path, count]) => ({ path, count }));

            // Total time on site (sum of page durations)
            const totalTimeOnSite = journey.reduce((s, v) => s + (v.duration ?? 0), 0);

            // Most searched terms
            const searchFreq = new Map<string, number>();
            for (const s of searches) searchFreq.set(s.query, (searchFreq.get(s.query) ?? 0) + 1);
            const topSearches = [...searchFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
                .map(([term, count]) => ({ term, count }));

            // Device breakdown
            const devices = { mobile: 0, desktop: 0, tablet: 0 };
            for (const v of journey) {
                const d = (v.deviceType ?? "desktop") as keyof typeof devices;
                if (d in devices) devices[d]++;
            }

            // Traffic source breakdown
            const sourceFreq = new Map<string, number>();
            for (const v of journey) sourceFreq.set(v.detectedSource ?? "direct", (sourceFreq.get(v.detectedSource ?? "direct") ?? 0) + 1);
            const topSources = [...sourceFreq.entries()].sort((a, b) => b[1] - a[1])
                .map(([source, count]) => ({ source, count }));

            // Days since last activity
            const lastActivity = journey[0]?.createdAt ?? lastOrderDate;
            const daysSinceLastActivity = lastActivity
                ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000)
                : null;

            // Repurchase prediction (simple heuristic)
            let repurchaseLikelihood: "high" | "medium" | "low" | "unknown" = "unknown";
            if (churn) {
                const score = churn.churnScore ?? 0;
                repurchaseLikelihood = score < 30 ? "high" : score < 60 ? "medium" : "low";
            } else if (completedOrders >= 3) {
                repurchaseLikelihood = "high";
            } else if (completedOrders >= 1 && (daysSinceLastActivity ?? 99) < 30) {
                repurchaseLikelihood = "medium";
            } else if (completedOrders === 0) {
                repurchaseLikelihood = "low";
            }

            // Addresses (from orders)
            const addressSet = new Set<string>();
            const addresses: Record<string, string>[] = [];
            for (const o of userOrders) {
                try {
                    const addr = typeof o.shippingAddress === "string"
                        ? JSON.parse(o.shippingAddress)
                        : o.shippingAddress;
                    const key = JSON.stringify(addr);
                    if (!addressSet.has(key)) { addressSet.add(key); addresses.push(addr as Record<string, string>); }
                } catch { /* skip */ }
            }

            const { passwordHash, verificationToken, verificationTokenExpiresAt, ...safeUser } = user;

            res.json({
                user: safeUser,
                stats: {
                    totalOrders: userOrders.length,
                    completedOrders,
                    totalSpent,
                    averageOrderValue: userOrders.length > 0 ? totalSpent / userOrders.length : 0,
                    totalPageViews: journey.length,
                    totalTimeOnSite,
                    totalSearches: searches.length,
                    totalProductViews: prodViews.length,
                    totalReviews: userReviews.length,
                    totalFavorites: favs.length,
                    cartItems: cart.length,
                    daysSinceLastActivity,
                    repurchaseLikelihood,
                    devices,
                    topSources,
                },
                orders: userOrders.map(o => ({
                    id: o.id,
                    orderNumber: o.orderNumber,
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    total: Number(o.total),
                    items: o.items,
                    shippingAddress: o.shippingAddress,
                    source: o.source,
                    createdAt: o.createdAt,
                })),
                journey: journey.map(v => ({
                    pagePath: v.pagePath,
                    duration: v.duration,
                    deviceType: v.deviceType,
                    source: v.detectedSource,
                    sessionId: v.sessionId,
                    timestamp: v.createdAt,
                })),
                topPages,
                searches,
                topSearches,
                productViews: prodViews,
                cart,
                favorites: favs,
                reviews: userReviews,
                addresses,
                churnPrediction: churn ?? null,
                aiProfile: aiProfile ?? null,
            });
        } catch (err) {
            next(err);
        }
    });

    // Discounts
    router.get("/discounts", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const discounts = await storage.getDiscounts();
            res.json(discounts);
        } catch (err) { next(err); }
    });

    router.post("/discounts", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { productId, type, value, startDate, endDate } = req.body;

            // Validate required fields
            if (!productId || !type || value === undefined || value === "") {
                res.status(400).json({
                    message: "الحقول المطلوبة: معرف المنتج، نوع الخصم، والقيمة"
                });
                return;
            }

            // Validate discount type
            if (!["percentage", "fixed"].includes(type)) {
                res.status(400).json({
                    message: "نوع الخصم يجب أن يكون نسبة مئوية أو مبلغ ثابت"
                });
                return;
            }

            // Validate percentage value
            if (type === "percentage") {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < 0 || numValue > 100) {
                    res.status(400).json({
                        message: "النسبة المئوية يجب أن تكون بين 0 و 100"
                    });
                    return;
                }
            }

            // Verify product exists
            const product = await storage.getProduct(productId);
            if (!product) {
                res.status(400).json({
                    message: "المنتج غير موجود"
                });
                return;
            }

            // Build discount object with proper date parsing
            const discountData: Record<string, unknown> = {
                productId,
                type,
                value: value.toString(),
                isActive: true,
            };

            // Parse dates if provided
            if (startDate) {
                discountData.startDate = new Date(startDate);
            }
            if (endDate) {
                discountData.endDate = new Date(endDate);
            }

            const discount = await storage.createDiscount(discountData);
            res.status(201).json(discount);
        } catch (err) {
            console.error("Discount creation error:", err);
            next(err);
        }
    });

    router.delete("/discounts/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            await storage.deleteDiscount(id);
            res.json({ message: "Deleted" });
        } catch (err) { next(err); }
    });

    // Coupons
    router.get("/coupons", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const coupons = await storage.getCoupons();
            res.json(coupons);
        } catch (err) { next(err); }
    });

    router.post("/coupons", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const coupon = await storage.createCoupon(req.body);
            res.status(201).json(coupon);
        } catch (err) { next(err); }
    });

    router.put("/coupons/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const coupon = await storage.updateCoupon(id, req.body);
            res.json(coupon);
        } catch (err) { next(err); }
    });

    router.delete("/coupons/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            await storage.deleteCoupon(id);
            res.json({ message: "Deleted" });
        } catch (err) { next(err); }
    });

    // Audit Logs
    router.get("/audit-logs", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const logs = await storage.getAuditLogs(req.query as any);
            res.json(logs);
        } catch (err) { next(err); }
    });

    // Gallery Management
    router.get("/gallery/submissions", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // False = get all (pending + approved)
            const subs = await storage.getGallerySubmissions(false);
            res.json(subs);
        } catch (err) { next(err); }
    });

    router.post("/gallery/approve/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const sub = await storage.approveGallerySubmission(id);
            res.json(sub);
        } catch (err) { next(err); }
    });

    router.post("/gallery/reject/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            await storage.deleteGallerySubmission(id);
            res.json({ message: "Rejected" });
        } catch (err) { next(err); }
    });

    router.post("/gallery/prize", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const prize = await storage.createOrUpdateGalleryPrize(req.body);
            res.json(prize);
        } catch (err) { next(err); }
    });

    router.post("/gallery/set-winner/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const { nanoid } = await import("nanoid");
            // Logic for winner
            const currentPrize = await storage.getCurrentGalleryPrize();
            if (!currentPrize) {
                res.status(400).json({
                    message: "لا توجد جائزة نشطة للشهر الحالي. يرجى إنشاء جائزة أولاً."
                });
                return;
            }

            // Find submission to get userId
            const submissions = await storage.getGallerySubmissions(false);
            const submission = submissions.find(s => s.id === id);

            if (!submission) {
                res.status(404).json({ message: "Submission not found" });
                return;
            }

            // Use admin-provided coupon code or generate one automatically
            const { couponCode: adminCouponCode } = req.body;
            const code = adminCouponCode && adminCouponCode.trim()
                ? adminCouponCode.trim().toUpperCase()
                : `WINNER-${currentPrize.month.replace('-', '')}-${nanoid(6).toUpperCase()}`;

            // Determine value/type from prize or default
            const couponValue = currentPrize.discountPercentage ? currentPrize.discountPercentage.toString() : "0";
            const couponType = currentPrize.discountPercentage ? 'percentage' : 'fixed';

            // Create Coupon
            await storage.createCoupon({
                code,
                type: couponType,
                value: couponValue,
                maxUses: 1,
                maxUsesPerUser: 1,
                isActive: true,
                description: `Prize for ${currentPrize.month}: ${currentPrize.prize}`,
                userId: submission.userId || undefined
            });

            await storage.setGalleryWinner(id, currentPrize.month, currentPrize.prize, code);
            res.json({ message: "Winner set", coupon: code });
        } catch (err) { next(err); }
    });

    // Delete a past winner (removes submission and image from Cloudinary)
    router.delete("/gallery/winner/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            // Get the submission first to retrieve the image URL
            const submissions = await storage.getGallerySubmissions(false);
            const submission = submissions.find(s => s.id === id);

            if (!submission) {
                res.status(404).json({ message: "Submission not found" });
                return;
            }

            // Only allow deletion of winners
            if (!submission.isWinner) {
                res.status(400).json({ message: "This submission is not a winner" });
                return;
            }

            // Delete the image from Cloudinary if it exists and is a Cloudinary URL
            if (submission.imageUrl && submission.imageUrl.includes('cloudinary.com')) {
                try {
                    const { deleteImage } = await import("../utils/cloudinary.js");
                    await deleteImage(submission.imageUrl);
                } catch (imgError) {
                    console.error("Failed to delete image from Cloudinary:", imgError);
                    // Continue with submission deletion even if image deletion fails
                }
            }

            // Delete the submission from database
            await storage.deleteGallerySubmission(id);

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "delete",
                entityType: "gallery_winner",
                entityId: id,
                changes: { customerName: submission.customerName, winnerMonth: submission.winnerMonth }
            });

            res.json({ message: "Winner deleted successfully" });
        } catch (err) { next(err); }
    });

    // ============ REVIEWS MANAGEMENT ============

    // Get all reviews for admin (all statuses)
    router.get("/reviews", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const reviews = await storage.getAllReviews();

            // Enrich with product + user info + loyalty tier
            const enrichedReviews = await Promise.all(reviews.map(async (review) => {
                const product = await storage.getProduct(review.productId);
                const user = review.userId ? await storage.getUser(review.userId) : null;
                const guestNameField = (review as any).guestName;
                return {
                    ...review,
                    productName: product?.name || "منتج محذوف",
                    userName: user?.fullName || user?.email?.split('@')[0] || guestNameField || "زائر",
                    userTier: user ? ((user as any).loyaltyTier || "bronze") : "guest",
                    isGuest: !review.userId,
                };
            }));

            // Sort: pending first, then by date desc
            enrichedReviews.sort((a, b) => {
                if (a.status === "pending" && b.status !== "pending") return -1;
                if (a.status !== "pending" && b.status === "pending") return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            res.json(enrichedReviews);
        } catch (err) { next(err); }
    });

    // Delete a review (admin only)
    router.delete("/reviews/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const review = await storage.getReview(id);
            if (!review) {
                res.status(404).json({ message: "المراجعة غير موجودة" });
                return;
            }

            await storage.deleteReview(id);

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "delete",
                entityType: "review",
                entityId: id,
                changes: { comment: review.comment?.substring(0, 50) }
            });

            res.json({ message: "تم حذف المراجعة بنجاح" });
        } catch (err) { next(err); }
    });

    // Approve a review (admin)
    router.post("/reviews/:id/approve", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const review = await storage.getReview(id);
            if (!review) {
                res.status(404).json({ message: "المراجعة غير موجودة" });
                return;
            }
            const updated = await storage.updateReview(id, { status: "approved" });

            // Recalculate product rating now that this review is approved
            await storage.updateProductRating(review.productId);

            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "update",
                entityType: "review",
                entityId: id,
                changes: { status: "approved" }
            });

            res.json(updated);
        } catch (err) { next(err); }
    });

    // Reject a review (admin) — deletes it
    router.post("/reviews/:id/reject", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const review = await storage.getReview(id);
            if (!review) {
                res.status(404).json({ message: "المراجعة غير موجودة" });
                return;
            }
            await storage.deleteReview(id);

            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "delete",
                entityType: "review",
                entityId: id,
                changes: { status: "rejected", comment: review.comment?.substring(0, 50) }
            });

            res.json({ message: "تم رفض المراجعة" });
        } catch (err) { next(err); }
    });

    // ============ PRODUCTS MANAGEMENT ============

    router.post("/products", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const data = req.body;

            // Auto-generate ID if not provided
            if (!data.id) {
                data.id = crypto.randomUUID();
            }

            // Auto-generate slug from name if not provided
            if (!data.slug && data.name) {
                data.slug = data.name
                    .toLowerCase()
                    .replace(/[^\w\s\u0621-\u064A-]/g, '')
                    .replace(/\s+/g, '-')
                    .substring(0, 100);
            }

            const folder = getCloudinaryFolder(data.brand, data.slug || data.id);

            let thumbnailUrl = "";
            if (data.imageBase64) {
                try {
                    const { uploadImage } = await import("../utils/cloudinary.js");
                    thumbnailUrl = await uploadImage(data.imageBase64, folder);
                } catch (error) {
                    console.error("Main image upload failed:", error);
                    throw new OperationalError("فشل رفع الصورة الرئيسية إلى Cloudinary. يرجى التحقق من اتصالك بالإنترنت وإعدادات Cloudinary.", 400);
                }
            }

            const processedImages: string[] = [];
            if (data.images && Array.isArray(data.images)) {
                const { uploadImage } = await import("../utils/cloudinary.js");
                for (const img of data.images) {
                    if (typeof img === 'string') {
                        if (img.startsWith('data:image/')) {
                            try {
                                const uploadedUrl = await uploadImage(img, folder);
                                processedImages.push(uploadedUrl);
                            } catch (error) {
                                console.error("Additional image upload failed:", error);
                                throw new OperationalError("فشل رفع إحدى الصور الإضافية إلى Cloudinary. يرجى التحقق من اتصالك بالإنترنت وإعدادات Cloudinary.", 400);
                            }
                        } else {
                            processedImages.push(img);
                        }
                    }
                }
            }

            // Clean up imageBase64 before validation/save
            delete data.imageBase64;

            if (thumbnailUrl) {
                data.thumbnail = thumbnailUrl;
                data.images = [thumbnailUrl, ...processedImages.filter(img => img !== thumbnailUrl)];
            } else {
                data.images = processedImages;
                if (data.images.length > 0) {
                    if (!data.thumbnail || data.thumbnail.trim() === "" || data.thumbnail.startsWith('data:')) {
                        data.thumbnail = data.images[0];
                    }
                }
            }

            // Enforce validation to make sure everything is a Cloudinary URL or allowed local path
            validateImageUrls(data.thumbnail, data.images);

            const parsed = insertProductSchema.parse(data);
            const product = await storage.createProduct(parsed);
            clearProductsCache(); // Invalidate products cache on new product

            // Auto-generate embedding for new product (fire-and-forget)
            embeddingGenerator.generateProductEmbedding(product.id).catch((err) => {
                console.error(`[Admin] Failed to auto-generate embedding for product ${product.id}:`, err);
            });

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "create",
                entityType: "product",
                entityId: product.id,
                changes: parsed as any
            });

            res.status(201).json(product);
        } catch (err) { next(err); }
    });

    router.patch("/products/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            const updates = adminProductUpdateSchema.parse(req.body);

            // Get existing product to merge images
            const existingProduct = await storage.getProduct(id);
            if (!existingProduct) {
                res.status(404).json({ message: "Product not found" });
                return;
            }

            const folder = getCloudinaryFolder(updates.brand || existingProduct.brand, updates.slug || existingProduct.slug || id);

            let thumbnailUrl = "";
            if (updates.imageBase64) {
                try {
                    const { uploadImage } = await import("../utils/cloudinary.js");
                    thumbnailUrl = await uploadImage(updates.imageBase64, folder);
                } catch (error) {
                    console.error("Main image upload failed:", error);
                    throw new OperationalError("فشل رفع الصورة الرئيسية إلى Cloudinary. يرجى التحقق من اتصالك بالإنترنت وإعدادات Cloudinary.", 400);
                }
            }

            const processedImages: string[] = [];
            if (updates.images && Array.isArray(updates.images)) {
                const { uploadImage } = await import("../utils/cloudinary.js");
                for (const image of updates.images) {
                    if (typeof image === 'string') {
                        if (image.startsWith('data:image/')) {
                            try {
                                const uploadedUrl = await uploadImage(image, folder);
                                processedImages.push(uploadedUrl);
                            } catch (error) {
                                console.error("Additional image upload failed:", error);
                                throw new OperationalError("فشل رفع إحدى الصور الإضافية إلى Cloudinary. يرجى التحقق من اتصالك بالإنترنت وإعدادات Cloudinary.", 400);
                            }
                        } else {
                            processedImages.push(image);
                        }
                    }
                }
            }

            // Clean up updates.imageBase64 before validation/save
            delete updates.imageBase64;

            if (thumbnailUrl) {
                updates.thumbnail = thumbnailUrl;
                const currentImages = (updates.images !== undefined)
                    ? processedImages
                    : (existingProduct.images ? [...existingProduct.images] : []);

                updates.images = [thumbnailUrl, ...currentImages.filter((img: string) => img !== thumbnailUrl && !img.startsWith('data:'))];
            } else {
                if (updates.images !== undefined) {
                    updates.images = processedImages;
                    const currentThumbnail = updates.thumbnail !== undefined ? updates.thumbnail : existingProduct.thumbnail;
                    if (!currentThumbnail || currentThumbnail.trim() === "" || currentThumbnail.startsWith('data:')) {
                        updates.thumbnail = processedImages[0] || existingProduct.thumbnail;
                    }
                }
            }

            // Enforce validation to make sure everything is a Cloudinary URL or allowed local path
            validateImageUrls(updates.thumbnail as string | undefined, updates.images as string[] | undefined);

            const product = await storage.updateProduct(id, updates);
            clearProductsCache(); // Invalidate cache on product update

            if (!product) {
                res.status(404).json({ message: "Product not found" });
                return;
            }

            // Re-generate embedding on product update (name/description/category change)
            if (updates.name || updates.description || updates.category || updates.brand) {
                embeddingGenerator.generateProductEmbedding(product.id).catch((err) => {
                    console.error(`[Admin] Failed to re-generate embedding for product ${product.id}:`, err);
                });
            }

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "update",
                entityType: "product",
                entityId: product.id,
                changes: updates
            });

            // Check if price was provided in updates
            if (updates.price) {
                const currentPrice = parseFloat(product.price);
                const oldPrice = product.originalPrice ? parseFloat(product.originalPrice) : Infinity;

                // If currently discounted (price < originalPrice)
                if (oldPrice > currentPrice) {
                    // Trigger broadcast in background
                    broadcastDiscountForProduct(storage, product.id).catch(err => {
                        console.error("Failed to auto-broadcast discount:", err);
                    });
                }
            }

            res.json(product);
        } catch (err: any) { next(err); }
    });

    router.delete("/products/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params as { id: string };
            console.log(`[Admin DELETE] Attempting to delete product: ${id}`);
            
            const success = await storage.deleteProduct(id);
            clearProductsCache(); // Invalidate cache on product delete

            if (!success) {
                console.log(`[Admin DELETE] Product not found: ${id}`);
                res.status(404).json({ message: "Product not found" });
                return;
            }

            // Audit Log
            try {
                await storage.createAuditLog({
                    userId: getSession(req)?.userId || "admin",
                    action: "delete",
                    entityType: "product",
                    entityId: id,
                    changes: {}
                });
            } catch (auditErr) {
                console.error("[Admin DELETE] Audit log failed (non-blocking):", auditErr);
            }

            console.log(`[Admin DELETE] ✅ Product deleted successfully: ${id}`);
            res.json({ message: "Product deleted", success: true });
        } catch (err) {
            console.error(`[Admin DELETE] ❌ Error deleting product:`, err);
            next(err);
        }
    });

    // ============ SETTINGS MANAGEMENT ============

    // Get all settings
    router.get("/settings", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const allSettings = await storage.getAllSettings();
            res.json(allSettings);
        } catch (err) { next(err); }
    });

    // Update settings
    router.put("/settings", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const updates = adminSettingsUpdateSchema.parse(req.body);

            // Validate that body is an object with string values
            if (typeof updates !== 'object' || updates === null) {
                res.status(400).json({ message: "Invalid settings format" });
                return;
            }

            await storage.updateAllSettings(updates);

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "update",
                entityType: "settings",
                entityId: "store_settings",
                changes: updates
            });

            res.json({ message: "Settings updated successfully" });
        } catch (err) { next(err); }
    });

    // ============ AI SYSTEMS MANAGEMENT ============

    // Seed demo data for AI/ML development
    router.post("/ai/seed-demo-data", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { DataSeeder } = await import("../services/data-seeder.js");
            const seeder = new DataSeeder();

            console.log("[Admin API] 🌱 Starting demo data seeding...");
            await seeder.seedAll();

            // Audit Log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "create",
                entityType: "ai_data",
                entityId: "demo_seed",
                changes: { action: "seed_demo_data" }
            });

            res.json({
                success: true,
                message: "تم توليد البيانات التجريبية بنجاح"
            });
        } catch (err) {
            console.error("[Admin API] ❌ Error seeding demo data:", err);
            next(err);
        }
    });

    // Clear demo data
    router.delete("/ai/demo-data", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { DataSeeder } = await import("../services/data-seeder.js");
            const seeder = new DataSeeder();

            await seeder.clearDemoData();

            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "delete",
                entityType: "ai_data",
                entityId: "demo_clear",
                changes: { action: "clear_demo_data" }
            });

            res.json({
                success: true,
                message: "تم حذف البيانات التجريبية"
            });
        } catch (err) { next(err); }
    });

    // Generate embeddings for all products
    router.post("/ai/generate-embeddings", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { embeddingGenerator } = await import("../services/embedding-generator.js");

            console.log("[Admin API] 🚀 Starting embedding generation for all products...");
            const result = await embeddingGenerator.generateAllEmbeddings();

            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "create",
                entityType: "ai_embeddings",
                entityId: "bulk_generate",
                changes: result
            });

            res.json({
                success: true,
                message: `تم توليد embeddings بنجاح: ${result.success} نجح، ${result.failed} فشل`,
                data: result
            });
        } catch (err) {
            console.error("[Admin API] ❌ Error generating embeddings:", err);
            next(err);
        }
    });

    // Generate embeddings for missing products only
    router.post("/ai/generate-missing-embeddings", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { embeddingGenerator } = await import("../services/embedding-generator.js");

            console.log("[Admin API] 🔍 Generating embeddings for missing products...");
            const result = await embeddingGenerator.generateMissingEmbeddings();

            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "create",
                entityType: "ai_embeddings",
                entityId: "missing_generate",
                changes: result
            });

            res.json({
                success: true,
                message: `تم توليد embeddings للمنتجات الناقصة: ${result.success} نجح، ${result.failed} فشل`,
                data: result
            });
        } catch (err) {
            console.error("[Admin API] ❌ Error generating missing embeddings:", err);
            next(err);
        }
    });

    // Get AI systems statistics
    router.get("/ai/stats", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { embeddingGenerator } = await import("../services/embedding-generator.js");
            const { analyticsTracker } = await import("../services/analytics-tracker.js");
            const { getDb } = await import("../db.js");
            const { productInteractions, searchQueries, priceHistory, chatMessages, supportTickets } = await import("../../shared/schema.js");

            const { sql } = await import("drizzle-orm");

            const db = getDb();
            if (!db) {
                throw new Error("Database not initialized");
            }

            // Embedding stats
            const embeddingStats = await embeddingGenerator.getEmbeddingStats();

            // Interaction stats
            // Interaction stats
            const interactionCount = await db.select({ count: sql<number>`count(*)` })
                .from(productInteractions);

            // Search stats
            // Search stats
            const searchCount = await db.select({ count: sql<number>`count(*)` })
                .from(searchQueries);

            // Price history stats
            // Price history stats
            const priceHistoryCount = await db.select({ count: sql<number>`count(*)` })
                .from(priceHistory);

            // Chat stats
            // Chat stats
            const chatCount = await db.select({ count: sql<number>`count(*)` })
                .from(chatMessages);

            // Support ticket stats
            // Support ticket stats
            const ticketCount = await db.select({ count: sql<number>`count(*)` })
                .from(supportTickets);

            // Cart abandonment rate
            const abandonmentRate = await analyticsTracker.getCartAbandonmentRate(30);

            res.json({
                embeddings: embeddingStats,
                interactions: {
                    total: interactionCount[0]?.count || 0
                },
                searches: {
                    total: searchCount[0]?.count || 0
                },
                priceHistory: {
                    total: priceHistoryCount[0]?.count || 0
                },
                chat: {
                    total: chatCount[0]?.count || 0
                },
                support: {
                    total: ticketCount[0]?.count || 0
                },
                analytics: {
                    cartAbandonmentRate: Math.round(abandonmentRate * 10) / 10
                }
            });
        } catch (err) {
            console.error("[Admin API] ❌ Error getting AI stats:", err);
            next(err);
        }
    });

    // Get trending products (from analytics)
    router.get("/ai/trending", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { analyticsTracker } = await import("../services/analytics-tracker.js");
            const days = parseInt(req.query.days as string) || 7;
            const limit = parseInt(req.query.limit as string) || 10;

            const trending = await analyticsTracker.getTrendingProducts(days, limit);

            // Enrich with product details
            const enriched = await Promise.all(trending.map(async (item) => {
                const product = await storage.getProduct(item.productId);
                return {
                    ...item,
                    product
                };
            }));

            res.json(enriched);
        } catch (err) {
            console.error("[Admin API] ❌ Error getting trending products:", err);
            next(err);
        }
    });

    // Get top search keywords
    router.get("/ai/top-searches", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { analyticsTracker } = await import("../services/analytics-tracker.js");
            const days = parseInt(req.query.days as string) || 30;
            const limit = parseInt(req.query.limit as string) || 10;

            const topSearches = await analyticsTracker.getTopSearchKeywords(days, limit);
            res.json(topSearches);
        } catch (err) {
            console.error("[Admin API] ❌ Error getting top searches:", err);
            next(err);
        }
    });

    // Get searches with no results
    router.get("/ai/no-result-searches", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { analyticsTracker } = await import("../services/analytics-tracker.js");
            const days = parseInt(req.query.days as string) || 30;
            const limit = parseInt(req.query.limit as string) || 20;

            const noResults = await analyticsTracker.getNoResultSearches(days, limit);
            res.json(noResults);
        } catch (err) {
            console.error("[Admin API] ❌ Error getting no-result searches:", err);
            next(err);
        }
    });

    // ============ PRODUCT MERGE ============

    // Merge two products: transfer images from source to target, delete source
    router.post("/products/merge", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { targetProductId, sourceProductId } = req.body;

            // Validation
            if (!targetProductId || !sourceProductId) {
                res.status(400).json({
                    success: false,
                    message: "يرجى تقديم معرفات المنتجات المطلوبة",
                    code: "MISSING_PARAMETERS"
                });
                return;
            }

            if (targetProductId === sourceProductId) {
                res.status(400).json({
                    success: false,
                    message: "لا يمكن دمج المنتج مع نفسه",
                    code: "SAME_PRODUCT"
                });
                return;
            }

            // Get both products
            const targetProduct = await storage.getProduct(targetProductId);
            const sourceProduct = await storage.getProduct(sourceProductId);

            if (!targetProduct) {
                res.status(404).json({
                    success: false,
                    message: "المنتج الرئيسي غير موجود",
                    code: "TARGET_NOT_FOUND"
                });
                return;
            }

            if (!sourceProduct) {
                res.status(404).json({
                    success: false,
                    message: "المنتج المصدر غير موجود",
                    code: "SOURCE_NOT_FOUND"
                });
                return;
            }

            // Merge images (remove duplicates)
            const targetImages = Array.isArray(targetProduct.images) ? targetProduct.images : [];
            const sourceImages = Array.isArray(sourceProduct.images) ? sourceProduct.images : [];

            const mergedImages = Array.from(new Set([...targetImages, ...sourceImages]));
            const newImagesCount = mergedImages.length - targetImages.length;

            // Update target product with merged images
            await storage.updateProduct(targetProductId, {
                images: mergedImages,
                updatedAt: new Date()
            });

            // Delete source product (soft delete)
            await storage.deleteProduct(sourceProductId);

            // Audit log
            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "merge",
                entityType: "product",
                entityId: targetProductId,
                changes: {
                    sourceProductId,
                    sourceProductName: sourceProduct.name,
                    addedImages: newImagesCount,
                    totalImages: mergedImages.length
                }
            });

            // Get updated product
            const updatedProduct = await storage.getProduct(targetProductId);

            res.json({
                success: true,
                data: {
                    updatedProduct,
                    deletedProductId: sourceProductId,
                    mergedImagesCount: newImagesCount,
                    totalImages: mergedImages.length
                }
            });
        } catch (err) {
            console.error("[Admin API] ❌ Error merging products:", err);
            next(err);
        }
    });

    // ============ CUSTOMER AI INSIGHTS ============

    // Get all customer profiles (للمدير: عرض جميع ملفات العملاء)
    router.get("/ai/customer-profiles", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { getDb } = await import("../db.js");
            const { customerProfiles, users } = await import("../../shared/schema.js");
            const { desc, eq } = await import("drizzle-orm");

            const db = getDb();
            if (!db) {
                res.status(500).json({ message: "Database not available" });
                return;
            }

            const profiles = await db
                .select({
                    userId: customerProfiles.userId,
                    email: users.email,
                    fullName: users.fullName,
                    phone: users.phone,
                    preferredCategories: customerProfiles.preferredCategories,
                    preferredBrands: customerProfiles.preferredBrands,
                    interests: customerProfiles.interests,
                    engagementLevel: customerProfiles.engagementLevel,
                    aiSummary: customerProfiles.aiSummary,
                    totalPurchases: customerProfiles.totalPurchases,
                    lastInteractionAt: customerProfiles.lastInteractionAt,
                    lastAnalyzedAt: customerProfiles.lastAnalyzedAt,
                })
                .from(customerProfiles)
                .innerJoin(users, eq(customerProfiles.userId, users.id))
                .orderBy(desc(customerProfiles.updatedAt))
                .limit(100);

            res.json({
                success: true,
                data: profiles,
                count: profiles.length,
            });
        } catch (err) { next(err); }
    });

    // Get detailed customer profile (للمدير: ملف عميل كامل)
    router.get("/ai/customer-profile/:userId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.params.userId as string;
            const { customerProfiler } = await import("../services/customer-profiler.js");

            const fullProfile = await customerProfiler.getFullProfile(userId);

            if (!fullProfile || !fullProfile.user) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            res.json({
                success: true,
                data: fullProfile,
            });
        } catch (err) { next(err); }
    });

    // Analyze customer now (تحليل عميل فوري)
    router.post("/ai/analyze-customer/:userId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.params.userId as string;
            const { customerProfiler } = await import("../services/customer-profiler.js");

            await customerProfiler.analyzeAndUpdateProfile(userId);

            // Get updated profile
            const fullProfile = await customerProfiler.getFullProfile(userId);

            await storage.createAuditLog({
                userId: getSession(req)?.userId || "admin",
                action: "update",
                entityType: "customer_profile",
                entityId: userId,
                changes: { action: "ai_analysis" }
            });

            res.json({
                success: true,
                message: "تم تحليل العميل بنجاح",
                data: fullProfile,
            });
        } catch (err) { next(err); }
    });

    // Get users list with profile status (لاختيار عميل للتحليل)
    router.get("/ai/users-with-profiles", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { getDb } = await import("../db.js");
            const { users, customerProfiles, orders } = await import("../../shared/schema.js");
            const { sql, eq, desc } = await import("drizzle-orm");

            const db = getDb();
            if (!db) {
                res.status(500).json({ message: "Database not available" });
                return;
            }

            // Get users with order count and profile status
            const usersWithData = await db
                .select({
                    id: users.id,
                    email: users.email,
                    fullName: users.fullName,
                    phone: users.phone,
                    createdAt: users.createdAt,
                    hasProfile: sql<boolean>`${customerProfiles.userId} IS NOT NULL`,
                    engagementLevel: customerProfiles.engagementLevel,
                    lastAnalyzedAt: customerProfiles.lastAnalyzedAt,
                })
                .from(users)
                .leftJoin(customerProfiles, eq(users.id, customerProfiles.userId))
                .where(eq(users.role, "user"))
                .orderBy(desc(users.createdAt))
                .limit(100);

            res.json({
                success: true,
                data: usersWithData,
            });
        } catch (err) { next(err); }
    });

    return router;
}

