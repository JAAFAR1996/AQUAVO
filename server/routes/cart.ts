import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { isCartVariantError, isStockError } from "../storage/order-storage.js";
import { z } from "zod";
import { analyticsTracker } from "../services/analytics-tracker.js";
import * as Sentry from "@sentry/node";

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

    // Middleware to ensure user is logged in
    const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
        const userId = getSessionUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        next();
    };

    const preflightSchema = z.object({
        items: z.array(z.object({
            productId: z.string().min(1),
            variantId: z.string().min(1).optional(),
            quantity: z.number().int().positive(),
        })).min(1).max(50),
    });

    // Public, read-only cart preflight for guest/localStorage carts.
    // Returns only the same commerce fields already exposed by the public
    // catalogue; it never mutates a cart or requires a customer identity.
    router.post("/preflight", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { items } = preflightSchema.parse(req.body);
            const productIds = [...new Set(items.map((item) => item.productId))];
            const currentProducts = await storage.getProductsByIds(productIds);
            const byId = new Map(currentProducts.map((product) => [product.id, product]));

            const result = items.map((line) => {
                const product = byId.get(line.productId);
                if (!product) {
                    return {
                        productId: line.productId,
                        variantId: line.variantId ?? null,
                        quantity: line.quantity,
                        price: null,
                        stock: 0,
                        valid: false,
                        reason: "PRODUCT_NOT_FOUND",
                    };
                }

                const variants = Array.isArray(product.variants) ? product.variants as any[] : [];
                const hasVariants = Boolean(product.hasVariants);
                let price = Number(product.price ?? 0);
                let stock = Number(product.stock ?? 0);
                let variantLabel: string | null = null;

                if (hasVariants) {
                    if (!line.variantId) {
                        return {
                            productId: product.id,
                            variantId: null,
                            quantity: line.quantity,
                            name: product.name,
                            slug: product.slug,
                            price,
                            stock: 0,
                            valid: false,
                            reason: "VARIANT_REQUIRED",
                        };
                    }
                    const variant = variants.find((candidate) => candidate?.id === line.variantId);
                    if (!variant) {
                        return {
                            productId: product.id,
                            variantId: line.variantId,
                            quantity: line.quantity,
                            name: product.name,
                            slug: product.slug,
                            price,
                            stock: 0,
                            valid: false,
                            reason: "VARIANT_INVALID",
                        };
                    }
                    price = Number(variant.price ?? 0);
                    stock = Number(variant.stock ?? 0);
                    variantLabel = typeof variant.label === "string" ? variant.label : null;
                } else if (line.variantId) {
                    return {
                        productId: product.id,
                        variantId: line.variantId,
                        quantity: line.quantity,
                        name: product.name,
                        slug: product.slug,
                        price,
                        stock: 0,
                        valid: false,
                        reason: "VARIANT_INVALID",
                    };
                }

                const purchasable = Number.isFinite(price) && price > 0;
                const reason = !purchasable
                    ? "NOT_PURCHASABLE"
                    : stock <= 0
                        ? "OUT_OF_STOCK"
                        : line.quantity > stock
                            ? "INSUFFICIENT_STOCK"
                            : null;

                return {
                    productId: product.id,
                    variantId: line.variantId ?? null,
                    quantity: line.quantity,
                    name: product.name,
                    slug: product.slug,
                    thumbnail: product.thumbnail ?? product.images?.[0] ?? null,
                    variantLabel,
                    price: purchasable ? price : null,
                    stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
                    valid: reason === null,
                    reason,
                };
            });

            res.setHeader("Cache-Control", "private, no-store");
            res.json({ items: result });
        } catch (err) {
            next(err);
        }
    });

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
            if (err instanceof Error && isCartVariantError(err.message)) {
                res.status(400).json({ message: err.message, code: "INVALID_VARIANT" });
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
            if (err instanceof Error && isCartVariantError(err.message)) {
                res.status(400).json({ message: err.message, code: "INVALID_VARIANT" });
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
