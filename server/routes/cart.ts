import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { isStockError } from "../storage/order-storage.js";
import { z } from "zod";
import { analyticsTracker } from "../services/analytics-tracker.js";
import * as Sentry from "@sentry/node";

const availabilityRequestSchema = z.object({
    items: z.array(z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).optional(),
        quantity: z.number().int().positive().max(999),
    })).min(1).max(100),
});

export function createCartRouter(): RouterType {
    const router = Router();

    // Tag all cart requests so errors surface under the "cart" flow in Sentry
    router.use((_req, _res, next) => {
        Sentry.setTag("flow", "cart");
        next();
    });

    const getSessionUserId = (req: Request): string | undefined => {
        return (req as any).session?.userId;
    };

    /**
     * Public, read-only cart availability preflight.
     *
     * Guest carts live in browser storage, so their quantity snapshot can become
     * stale after another sale or an inventory correction. This endpoint gives
     * both guest and signed-in carts one fresh, cache-free source of truth before
     * a quantity mutation or checkout. It deliberately returns availability only
     * — never internal cost/accounting fields and never trusts client prices.
     *
     * Final order creation remains the authoritative transactional guard; this is
     * the UX guard that prevents customers reaching the last step with stale stock.
     */
    router.post("/availability", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { items } = availabilityRequestSchema.parse(req.body);
            const productIds = Array.from(new Set(items.map((item) => item.productId)));
            const productRows = await storage.getProductsByIds(productIds);
            const productById = new Map(productRows.map((product) => [product.id, product]));

            const results = items.map((item) => {
                const product = productById.get(item.productId);
                if (!product) {
                    return {
                        productId: item.productId,
                        variantId: item.variantId ?? null,
                        productName: "هذا المنتج",
                        variantLabel: null,
                        requestedQuantity: item.quantity,
                        availableStock: 0,
                        status: "unavailable" as const,
                        reason: "PRODUCT_NOT_FOUND" as const,
                    };
                }

                if (item.variantId) {
                    const variants = Array.isArray(product.variants) ? product.variants : [];
                    const variant = variants.find((candidate) => candidate.id === item.variantId);
                    if (!variant) {
                        return {
                            productId: item.productId,
                            variantId: item.variantId,
                            productName: product.name,
                            variantLabel: null,
                            requestedQuantity: item.quantity,
                            availableStock: 0,
                            status: "unavailable" as const,
                            reason: "VARIANT_NOT_FOUND" as const,
                        };
                    }

                    const parsedStock = Number(variant.stock ?? 0);
                    const availableStock = Number.isFinite(parsedStock) ? Math.max(0, Math.floor(parsedStock)) : 0;
                    return {
                        productId: item.productId,
                        variantId: item.variantId,
                        productName: product.name,
                        variantLabel: variant.label ?? null,
                        requestedQuantity: item.quantity,
                        availableStock,
                        status: item.quantity <= availableStock
                            ? "available" as const
                            : availableStock > 0
                                ? "limited" as const
                                : "unavailable" as const,
                        reason: item.quantity <= availableStock
                            ? null
                            : availableStock > 0
                                ? "INSUFFICIENT_STOCK" as const
                                : "OUT_OF_STOCK" as const,
                    };
                }

                const parsedStock = Number(product.stock ?? 0);
                const availableStock = Number.isFinite(parsedStock) ? Math.max(0, Math.floor(parsedStock)) : 0;
                return {
                    productId: item.productId,
                    variantId: null,
                    productName: product.name,
                    variantLabel: null,
                    requestedQuantity: item.quantity,
                    availableStock,
                    status: item.quantity <= availableStock
                        ? "available" as const
                        : availableStock > 0
                            ? "limited" as const
                            : "unavailable" as const,
                    reason: item.quantity <= availableStock
                        ? null
                        : availableStock > 0
                            ? "INSUFFICIENT_STOCK" as const
                            : "OUT_OF_STOCK" as const,
                };
            });

            res.set("Cache-Control", "no-store, max-age=0");
            res.json({ items: results, checkedAt: new Date().toISOString() });
        } catch (err) {
            next(err);
        }
    });

    // Middleware to ensure user is logged in. The availability preflight above is
    // intentionally public; all persisted-cart mutations below remain authenticated.
    const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
        const userId = getSessionUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        next();
    };

    router.use(requireAuth);

    router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = getSessionUserId(req)!;
            const items = await storage.getCartItems(userId);
            res.json(items);
        } catch (err) {
            next(err);
        }
    });

    const addItemSchema = z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        variantPrice: z.number().positive().optional(), // سعر الخيار المحدد
        variantLabel: z.string().optional(),           // اسم الخيار (مثل: 40×23 سم)
        variantId: z.string().optional(),              // معرّف الخيار
    });

    router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = getSessionUserId(req)!;
            const user = await storage.getUser(userId);
            if (!user) {
                res.status(401).json({ message: "User not found" });
                return;
            }

            const data = addItemSchema.parse(req.body);

            // Block Coming Soon products (price=0) unless a positive variantPrice is supplied
            if (!data.variantPrice || data.variantPrice <= 0) {
                const product = await storage.getProduct(data.productId);
                if (!product || parseFloat(String(product.price ?? 0)) <= 0) {
                    res.status(400).json({ message: "هذا المنتج غير متاح حالياً للشراء" });
                    return;
                }
            }

            const item = await storage.addToCart(
                userId,
                data.productId,
                data.quantity,
                data.variantPrice,
                data.variantLabel,
                data.variantId
            );

            // Track cart add interaction (fire-and-forget)
            analyticsTracker.trackCartAdd({
                userId,
                sessionId: req.sessionID || "unknown",
                productId: data.productId,
                quantity: data.quantity,
                from: (req.query.from as string) || "unknown",
            }).catch(() => {});

            res.status(201).json(item);
        } catch (err) {
            // Stock conflicts → 409 with the clean Arabic message (no English leak)
            if (err instanceof Error && isStockError(err.message)) {
                res.status(409).json({ message: err.message, code: "OUT_OF_STOCK" });
                return;
            }
            next(err);
        }
    });

    const updateItemSchema = z.object({
        quantity: z.number().int().min(0)
    });

    router.put("/:itemId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = getSessionUserId(req)!;
            const user = await storage.getUser(userId);
            if (!user) {
                res.status(401).json({ message: "User not found" });
                return;
            }

            const { itemId } = req.params as { itemId: string };
            const data = updateItemSchema.parse(req.body);

            if (data.quantity === 0) {
                await storage.removeFromCart(userId, itemId);
                res.json({ message: "Item removed" });
            } else {
                const item = await storage.updateCartItem(userId, itemId, data.quantity);
                res.json(item);
            }
        } catch (err) {
            // Stock conflicts → 409 with the clean Arabic message (no English leak),
            // matching the POST / handler above.
            if (err instanceof Error && isStockError(err.message)) {
                res.status(409).json({ message: err.message, code: "OUT_OF_STOCK" });
                return;
            }
            next(err);
        }
    });

    router.delete("/:itemId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = getSessionUserId(req)!;
            const { itemId } = req.params as { itemId: string };
            await storage.removeFromCart(userId, itemId);

            // Track cart remove interaction (fire-and-forget)
            analyticsTracker.trackCartRemove({
                userId,
                sessionId: req.sessionID || "unknown",
                productId: "unknown_item", // We don't have the productId here easily without fetching the item first.
            }).catch(() => {});

            res.status(204).end();
        } catch (err) {
            next(err);
        }
    });

    router.delete("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = getSessionUserId(req)!;
            await storage.clearCart(userId);
            res.status(204).end();
        } catch (err) {
            next(err);
        }
    });

    return router;
}
