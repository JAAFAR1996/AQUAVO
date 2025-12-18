import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import { insertOrderSchema } from "../../shared/schema.js";

export function createOrderRouter(): RouterType {
    const router = Router();

    // Create Order
    router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            const { items, customerInfo, couponCode } = req.body;

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

            res.status(201).json(order);
        } catch (err) {
            next(err);
        }
    });

    // Get My Orders
    router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sess = getSession(req);
            const orders = await storage.getOrders(sess?.userId);
            res.json(orders);
        } catch (err) {
            next(err);
        }
    });

    // Track Order Publicly
    router.get("/track/:orderNumber", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { orderNumber } = req.params as { orderNumber: string };
            const order = await storage.getOrder(orderNumber);
            if (!order) {
                res.status(404).json({ message: "Order not found" });
                return;
            }
            res.json(order);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
