import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import {
  getBusinessAssessment,
  getBusinessFindings,
  getBusinessHistory,
  getBusinessOverview,
  getInventoryHealth,
  ingestMarketingDaily,
  rebuildBusinessHistory,
  refreshBusinessSnapshot,
} from "../services/business-intelligence.js";

const daySchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/);
const marketingSchema = z.object({
  day: daySchema,
  platform: z.string().trim().min(2).max(40),
  accountKey: z.string().trim().min(1).max(100).optional(),
  spendIqd: z.number().nonnegative(),
  spendOriginal: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().min(3).max(8).optional(),
  impressions: z.number().int().nonnegative().optional(),
  clicks: z.number().int().nonnegative().optional(),
  trackedConversions: z.number().nonnegative().optional(),
  conversionValueIqd: z.number().nonnegative().optional(),
  source: z.string().trim().min(2).max(100),
  confidence: z.enum(["exact", "estimated", "unknown"]).optional(),
  evidence: z.record(z.unknown()).optional(),
}).strict();

export function createBusinessIntelligenceRouter() {
  const router = Router();
  router.use(requireAccountingAdmin);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/overview", async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json(await getBusinessOverview()); } catch (error) { next(error); }
  });

  router.get("/assessment", async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json(await getBusinessAssessment()); } catch (error) { next(error); }
  });

  router.get("/history", async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await getBusinessHistory(Number(req.query.days ?? 90))); } catch (error) { next(error); }
  });

  router.get("/inventory", async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await getInventoryHealth(Number(req.query.limit ?? 25))); } catch (error) { next(error); }
  });

  router.get("/findings", async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json(await getBusinessFindings()); } catch (error) { next(error); }
  });

  router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = z.object({ day: daySchema.optional() }).strict().safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid day", issues: parsed.error.issues });
        return;
      }
      res.json(await refreshBusinessSnapshot(parsed.data.day));
    } catch (error) { next(error); }
  });

  router.post("/rebuild-history", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = z.object({ from: daySchema, to: daySchema }).strict().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid range", issues: parsed.error.issues });
        return;
      }
      res.json(await rebuildBusinessHistory(parsed.data.from, parsed.data.to));
    } catch (error) { next(error); }
  });

  router.post("/marketing", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = marketingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid marketing payload", issues: parsed.error.issues });
        return;
      }
      res.json(await ingestMarketingDaily(parsed.data));
    } catch (error) { next(error); }
  });

  return router;
}
