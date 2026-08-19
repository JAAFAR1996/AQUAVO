import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage/index.js";
import { orderTrackingLimiter } from "../middleware/rate-limit.js";
import { ORDER_TRACKING_FAILURE_MESSAGE } from "./orders.js";
import { resolveAlWaseetTrackingRuntime } from "../services/alwaseet-tracking-runtime.js";

const router = Router();

// Keep the legacy unsafe GET method closed. Public tracking remains POST-only
// and rate-limited so order-number probing is constrained.
router.get("/track/:orderNumber", orderTrackingLimiter, (_req: Request, res: Response): void => {
  res.status(404).json({ message: ORDER_TRACKING_FAILURE_MESSAGE });
});

router.post("/track/:orderNumber", orderTrackingLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsedOrderNumber = z.string().trim().min(3).max(100).safeParse(req.params.orderNumber);
    if (!parsedOrderNumber.success) {
      res.status(404).json({ message: ORDER_TRACKING_FAILURE_MESSAGE });
      return;
    }

    const order = await storage.getOrder(parsedOrderNumber.data);
    if (!order) {
      res.status(404).json({ message: ORDER_TRACKING_FAILURE_MESSAGE });
      return;
    }

    // Public order numbers carry a cryptographically random suffix and the route
    // is rate-limited. The response exposes tracking state only; customer PII,
    // addresses, items, and payment data are never returned.
    const shipping = await resolveAlWaseetTrackingRuntime({
      id: order.id,
      orderNumber: order.orderNumber,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      total: order.total,
      roundedTotal: order.roundedTotal,
      createdAt: order.createdAt,
    });

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      shipping,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
