import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { getSession } from "../middleware/auth.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { createOrderSchema } from "./orders.js";
import {
  createProductionTestOrder,
  deleteProductionTestOrder,
  transitionProductionTestOrder,
} from "../services/production-test-orders.js";
import { dispatchDeliveryCareForOrder } from "../services/customer-messaging.js";

const uuidSchema = z.string().uuid();
const testStatusSchema = z.object({ status: z.string().trim().min(1).max(64) });

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const rows = (result as { rows?: Array<Record<string, unknown>> } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

/** Mounted at /api/orders before the genuine storefront order router. */
export function createProductionTestCheckoutRouter() {
  const router = Router();

  // The session stores userId only. Use the canonical DB-backed admin guard
  // instead of reading a non-existent session.role value.
  router.post("/test", requireAccountingAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = getSession(req);
      if (!session?.userId) {
        res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
        return;
      }

      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "بيانات طلب الاختبار غير صالحة", errors: parsed.error.flatten() });
        return;
      }

      if (parsed.data.couponCode || parsed.data.usePoints || parsed.data.useCashback || parsed.data.pointsToUse || parsed.data.cashbackToUse) {
        res.status(400).json({ message: "طلب الاختبار لا يستخدم كوبونات أو نقاط أو Cashback حتى يبقى معزولاً" });
        return;
      }

      const rawIdempotencyKey = req.get("Idempotency-Key");
      const idempotencyKey = rawIdempotencyKey ? uuidSchema.safeParse(rawIdempotencyKey) : null;
      if (idempotencyKey && !idempotencyKey.success) {
        res.status(400).json({ message: "Invalid Idempotency-Key header" });
        return;
      }

      const order = await createProductionTestOrder({
        userId: session.userId,
        items: parsed.data.items,
        customerInfo: parsed.data.customerInfo,
        idempotencyKey: idempotencyKey?.success ? idempotencyKey.data : undefined,
      });

      res.status(201).json({
        ...order,
        testOrder: true,
        isolation: {
          inventory: "skipped",
          accounting: "skipped",
          loyalty: "skipped",
          logistics: "skipped",
          whatsappDeliveryCare: "enabled_on_delivered",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

/** Mounted at /api/admin before the genuine Accounting V2 order-status router. */
export function createProductionTestAdminRouter() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.put("/orders/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.body?.status == null) { next(); return; }
    const db = getDb();
    if (!db) { res.status(503).json({ message: "قاعدة البيانات غير مهيأة" }); return; }

    try {
      const probe = await db.execute(sql`SELECT is_test FROM public.orders WHERE id=${req.params.id} LIMIT 1`);
      const row = rowsOf(probe)[0];
      if (!row || !Boolean(row.is_test)) { next(); return; }

      const parsed = testStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "حالة طلب الاختبار غير صالحة" });
        return;
      }

      const result = await transitionProductionTestOrder(req.params.id, parsed.data.status);
      let whatsapp: Awaited<ReturnType<typeof dispatchDeliveryCareForOrder>> | null = null;
      if (parsed.data.status === "delivered" && result.oldStatus !== "delivered") {
        whatsapp = await dispatchDeliveryCareForOrder(req.params.id);
      }

      res.json({
        ...result.order,
        testOrder: true,
        productionEffectsSkipped: true,
        whatsappDeliveryCare: whatsapp,
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/orders/:id/test", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await deleteProductionTestOrder(req.params.id);
      if (result.notFound) {
        res.status(404).json({ message: "طلب الاختبار غير موجود" });
        return;
      }
      res.json({ success: result.deleted, testOrderDeleted: result.deleted });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
