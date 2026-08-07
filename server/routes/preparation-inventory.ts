import { Router, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";
import { actorFromRequest } from "../services/accountingAuditTrail.js";
import {
  getPreparationInventoryHistory,
  listPreparationInventory,
  setPreparationMaterialTracking,
  stocktakePreparationMaterial,
} from "../services/preparation-inventory-service.js";

const router = Router();
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة — انتظر دقيقة وحاول مرة ثانية" },
});
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(requireAdmin);

function db(): FulfillmentDb {
  const value = getDb() as FulfillmentDb | null;
  if (!value) throw new Error("Database not available");
  return value;
}

const DOMAIN_ERROR_STATUS: Array<[RegExp, number]> = [
  [/NOT_FOUND/, 404],
  [/MATERIAL_INACTIVE/, 409],
  [/STOCK_TRACKING_REQUIRED|QUANTITY_INVALID|CURRENT_QUANTITY_REQUIRED|THRESHOLD_INVALID|_REQUIRED|_INVALID/, 400],
];

function wrap(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const match = DOMAIN_ERROR_STATUS.find(([pattern]) => pattern.test(message));
      if (match) {
        res.status(match[1]).json({ error: message, code: message.split(":")[0] });
        return;
      }
      next(error);
    }
  };
}

const idSchema = z.string().min(1).max(128);
const reasonSchema = z.string().trim().min(3).max(500);
const idempotencySchema = z.string().min(4).max(200);

router.get(
  "/preparation-inventory",
  readLimiter,
  wrap(async (_req, res) => {
    res.json({ items: await listPreparationInventory(db()) });
  }),
);

router.get(
  "/preparation-inventory/:id/movements",
  readLimiter,
  wrap(async (req, res) => {
    const materialId = idSchema.parse(req.params.id);
    res.json(await getPreparationInventoryHistory(db(), materialId));
  }),
);

const stocktakeSchema = z.object({
  quantity: z.number().finite().min(0).max(10_000_000),
  reason: reasonSchema,
  idempotencyKey: idempotencySchema,
});

router.post(
  "/preparation-inventory/:id/stocktake",
  writeLimiter,
  wrap(async (req, res) => {
    const materialId = idSchema.parse(req.params.id);
    const input = stocktakeSchema.parse(req.body ?? {});
    const result = await stocktakePreparationMaterial(db(), {
      materialId,
      targetQuantity: input.quantity,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      actor: actorFromRequest(req),
    });
    res.status(result.reused ? 200 : 201).json(result);
  }),
);

const trackingSchema = z.object({
  enabled: z.boolean(),
  currentQuantity: z.number().finite().min(0).max(10_000_000).optional(),
  lowStockThreshold: z.number().finite().min(0).max(10_000_000).nullable().optional(),
  reason: reasonSchema,
  idempotencyKey: idempotencySchema,
});

router.post(
  "/preparation-inventory/:id/tracking",
  writeLimiter,
  wrap(async (req, res) => {
    const materialId = idSchema.parse(req.params.id);
    const input = trackingSchema.parse(req.body ?? {});
    const result = await setPreparationMaterialTracking(db(), {
      materialId,
      enabled: input.enabled,
      currentQuantity: input.currentQuantity,
      lowStockThreshold: input.lowStockThreshold,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      actor: actorFromRequest(req),
    });
    res.json(result);
  }),
);

export default router;
