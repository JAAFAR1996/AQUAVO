import { Router } from "express";
import { storage } from "../storage/index.js";
import { z } from "zod";

export function createCartRouter() {
    const router = Router();

    const getSessionUserId = (req: any): string | undefined => {
        return req.session?.userId;
    };

    // Middleware to ensure user is logged in
    const requireAuth = (req: any, res: any, next: any) => {
        const userId = getSessionUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    };

    router.use(requireAuth);

    router.get("/", async (req, res, next) => {
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
        quantity: z.number().int().positive()
    });

    router.post("/", async (req, res, next) => {
        try {
            const userId = getSessionUserId(req)!;
            const user = await storage.getUser(userId);
            if (!user) return res.status(401).json({ message: "User not found" });

            const data = addItemSchema.parse(req.body);
            const item = await storage.addToCart(userId, data.productId, data.quantity);
            res.status(201).json(item);
        } catch (err) {
            next(err);
        }
    });

    const updateItemSchema = z.object({
        quantity: z.number().int().min(0)
    });

    router.put("/:productId", async (req, res, next) => {
        try {
            const userId = getSessionUserId(req)!;
            const user = await storage.getUser(userId);
            if (!user) return res.status(401).json({ message: "User not found" });

            const { productId } = req.params;
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

    router.delete("/:productId", async (req, res, next) => {
        try {
            const userId = getSessionUserId(req)!;
            const { productId } = req.params;
            await storage.removeFromCart(userId, productId);
            res.status(204).end();
        } catch (err) {
            next(err);
        }
    });

    router.delete("/", async (req, res, next) => {
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
