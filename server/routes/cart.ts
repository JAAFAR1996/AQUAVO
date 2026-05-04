import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { z } from "zod";
import { analyticsTracker } from "../services/analytics-tracker.js";

export function createCartRouter(): RouterType {
    const router = Router();

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
            next(err);
        }
    });

    const updateItemSchema = z.object({
        quantity: z.number().int().min(0)
    });

    router.put("/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = getSessionUserId(req)!;
            const user = await storage.getUser(userId);
            if (!user) {
                res.status(401).json({ message: "User not found" });
                return;
            }

            const { productId } = req.params as { productId: string };
            const data = updateItemSchema.parse(req.body);

            if (data.quantity === 0) {
                await storage.removeFromCart(userId, productId);
                res.json({ message: "Item removed" });
            } else {
                const item = await storage.updateCartItem(userId, productId, data.quantity);
                res.json(item);
            }
        } catch (err) {
            next(err);
        }
    });

    router.delete("/:productId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = getSessionUserId(req)!;
            const { productId } = req.params as { productId: string };
            await storage.removeFromCart(userId, productId);

            // Track cart remove interaction (fire-and-forget)
            analyticsTracker.trackCartRemove({
                userId,
                sessionId: req.sessionID || "unknown",
                productId,
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
