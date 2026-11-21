import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAuth, getSession } from "../middleware/auth.js";
import { createSharedRateLimitStore } from "../middleware/shared-rate-limit-store.js";
import { getAccountEmailVerification, requestAccountEmailVerification, confirmAccountEmailVerification } from "../services/account-email-verification.js";

function budget(namespace: string, max: number, windowMs: number, account = false) {
  return rateLimit({
    store: createSharedRateLimitStore(namespace), max, windowMs, standardHeaders: true, legacyHeaders: false,
    ...(account ? { keyGenerator: (req: Parameters<typeof getSession>[0]) => getSession(req)?.userId || "unauthenticated" } : {}),
    message: { message: "تم تجاوز محاولات تأكيد البريد المسموحة. حاول بوقت لاحق" },
  });
}
const statusBudget = budget("email-verification-status", 60, 60_000, true);
const requestIpBudget = budget("email-verification-request-ip", 10, 3600_000);
const requestAccountBudget = budget("email-verification-request-account", 3, 3600_000, true);
const confirmIpBudget = budget("email-verification-confirm-ip", 30, 600_000);
const confirmAccountBudget = budget("email-verification-confirm-account", 5, 600_000, true);

export function createAccountEmailVerificationRouter() {
  const router = Router();
  router.use((_req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); });
  router.use(requireAuth);
  router.get("/", statusBudget, async (req, res, next) => {
    try { res.json(await getAccountEmailVerification(getSession(req)!.userId!)); }
    catch (error) { next(error); }
  });
  router.post("/request", requestIpBudget, requestAccountBudget, async (req, res, next) => {
    try {
      z.object({}).strict().parse(req.body ?? {});
      res.json(await requestAccountEmailVerification(getSession(req)!.userId!));
    } catch (error) { next(error); }
  });
  router.post("/confirm", confirmIpBudget, confirmAccountBudget, async (req, res, next) => {
    try {
      const { code } = z.object({ code: z.string().regex(/^\d{8}$/) }).strict().parse(req.body);
      res.json(await confirmAccountEmailVerification(getSession(req)!.userId!, code));
    } catch (error) { next(error); }
  });
  return router;
}
