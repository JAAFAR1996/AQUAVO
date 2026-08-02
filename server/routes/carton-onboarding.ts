import { Router, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { actorFromRequest } from "../services/accountingAuditTrail.js";
import { setupCartonAtomically } from "../services/carton-onboarding-service.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";

const router = Router();

const setupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة — انتظر دقيقة وحاول مرة ثانية" },
});

export function businessDateInBaghdad(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ بدء الكلفة غير صالح")
  .refine((value) => !Number.isNaN(Date.parse(value + "T00:00:00.000Z")), "تاريخ بدء الكلفة غير صالح")
  .refine(
    (value) => value <= businessDateInBaghdad(),
    "تاريخ بدء الكلفة لا يمكن أن يكون في المستقبل عند إنشاء الكارتونة",
  );

export const cartonSetupSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()),
  notes: z.string().trim().max(2000).nullable().optional(),
  internalLengthCm: z.number().finite().positive(),
  internalWidthCm: z.number().finite().positive(),
  internalHeightCm: z.number().finite().positive(),
  maxWeightKg: z.number().finite().positive(),
  lowStockThreshold: z.number().int().nonnegative(),
  openingQuantity: z.number().int().nonnegative(),
  unitCostIqd: z.number().int().positive(),
  costEffectiveDate: dateSchema,
  costSource: z.string().trim().min(3).max(1000),
  idempotencyKey: z.string().trim().min(16).max(160),
});

function requireCsrfSignal(req: Request, res: Response, next: NextFunction) {
  const header = req.get("x-csrf-token");
  if (!header || header.length < 16) {
    res.status(403).json({ error: "CSRF_REQUIRED", message: "تعذر التحقق من أمان الطلب. حدّث الصفحة وحاول مرة ثانية." });
    return;
  }
  next();
}

function database(): FulfillmentDb {
  const value = getDb() as FulfillmentDb | null;
  if (!value) throw new Error("Database not available");
  return value;
}

function sendError(error: unknown, res: Response): void {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("DUPLICATE_CARTON_SKU")) {
    res.status(409).json({ error: "DUPLICATE_CARTON_SKU", message: "رمز الكارتونة مستخدم من قبل." });
    return;
  }
  if (message.includes("IDEMPOTENCY_KEY_REUSED")) {
    res.status(409).json({ error: "IDEMPOTENCY_KEY_REUSED", message: "تعذر إعادة العملية لأن طلباً مختلفاً استخدم نفس مفتاح الحفظ." });
    return;
  }
  console.error("[carton-onboarding] setup failed", { message });
  res.status(500).json({
    error: "CARTON_SETUP_FAILED",
    message: "ما تم إنشاء الكارتونة. لم تُحفظ أي بيانات جزئية، جرّب مرة ثانية.",
  });
}

router.post(
  "/cartons/setup",
  requireAdmin,
  setupLimiter,
  requireCsrfSignal,
  async (req, res) => {
    const parsed = cartonSetupSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "VALIDATION_INVALID",
        message: "راجع الحقول: الكمية وحد التنبيه أعداد صحيحة غير سالبة، والكلفة والقياسات والوزن أكبر من صفر.",
        details: parsed.error.flatten(),
      });
      return;
    }

    const headerKey = req.get("idempotency-key")?.trim();
    if (headerKey && headerKey !== parsed.data.idempotencyKey) {
      res.status(400).json({ error: "IDEMPOTENCY_MISMATCH", message: "مفتاح الحفظ غير متطابق." });
      return;
    }

    try {
      const actor = actorFromRequest(req);
      const result = await setupCartonAtomically(database(), parsed.data, actor);
      res.status(result.replayed ? 200 : 201).json({
        ...result,
        messages: [
          "تم إنشاء الكارتونة.",
          "تم تسجيل العدد المتوفر.",
          "تم تسجيل كلفة الوحدة وتاريخ سريانها.",
        ],
      });
    } catch (error) {
      sendError(error, res);
    }
  },
);

export default router;
