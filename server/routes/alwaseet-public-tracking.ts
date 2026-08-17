import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage/index.js";
import { orderTrackingLimiter } from "../middleware/rate-limit.js";
import {
  ORDER_TRACKING_FAILURE_MESSAGE,
  normalizePhoneDigits,
  verifyOrderTrackingPhone,
} from "./orders.js";
import { resolveAlWaseetTracking } from "../services/alwaseet-tracking.js";

const router = Router();

const orderTrackingSchema = z.object({
  phoneLast4: z.string().transform(normalizePhoneDigits).refine(
    (value) => value.length === 4,
    "The last four phone digits are required",
  ),
}).strict();

// Keep the legacy unsafe GET method closed. This route is mounted before the
// normal orders router so the public tracking response never falls back to the
// old synthetic ETA implementation.
router.get("/track/:orderNumber", orderTrackingLimiter, (_req: Request, res: Response): void => {
  res.status(404).json({ message: ORDER_TRACKING_FAILURE_MESSAGE });
});

router.post("/track/:orderNumber", orderTrackingLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsedOrderNumber = z.string().trim().min(3).max(100).safeParse(req.params.orderNumber);
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

    // Carrier discovery happens only AFTER the caller has proven knowledge of
    // the order phone verifier. Provider outages are swallowed by the resolver.
    const shipping = await resolveAlWaseetTracking({
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
