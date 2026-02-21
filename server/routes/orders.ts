import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import { z } from "zod";
import { analyticsTracker } from "../services/analytics-tracker.js";

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
    couponCode: z.string().optional()
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

            const { items, customerInfo, couponCode } = validationResult.data;

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

            // Track purchase interactions for each item (fire-and-forget)
            for (const item of items) {
                analyticsTracker.trackPurchase({
                    userId: userId || undefined,
                    sessionId: (req as any).sessionID || "unknown",
                    productId: item.productId,
                    orderId: order.id,
                    quantity: item.quantity,
                    price: 0, // Price is calculated server-side in createOrderSecure
                }).catch(() => {});
            }

            res.status(201).json(order);
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
            // Only return safe tracking info, hide customer PII
            res.json({
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                total: order.total,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
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
            res.json(order);
        } catch (err) {
            next(err);
        }
    });

    return router;
}
