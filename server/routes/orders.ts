import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAuth, getSession } from "../middleware/auth.js";
import { insertOrderSchema } from "../../shared/schema.js";
import { z } from "zod";

// Order validation schema (2025 Best Practices)
const createOrderItemSchema = z.object({
    productId: z.string().uuid("Invalid product ID format"),
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

            // Validate input (2025 Best Practice: Always validate before processing)
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

            res.status(201).json(order);
        } catch (err: any) {
            // Convert known validation errors to 400 (2025 Best Practice)
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
