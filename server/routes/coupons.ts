import type { Router as RouterType, Request, Response } from "express";
import { Router } from "express";
import { lockEligibleCoupon, INVALID_COUPON_MESSAGE } from "../services/coupon-policy.js";
import { securityDb } from "../services/security-db.js";
import { apiLimiter } from "../middleware/rate-limit.js";
export function createCouponRouter(): RouterType {
  const router = Router();
  router.post("/validate", apiLimiter, async (req: Request, res: Response): Promise<void> => {
    const { code, totalAmount } = req.body ?? {};
    if (typeof code !== "string" || !Number.isFinite(Number(totalAmount)) || Number(totalAmount) < 0) {
      res.status(400).json({ message: INVALID_COUPON_MESSAGE }); return;
    }
    try {
      const coupon = await securityDb().transaction((tx) => lockEligibleCoupon(tx, code, req.session?.userId ?? null, Number(totalAmount)));
      res.set("Cache-Control", "no-store");
      res.json(coupon);
    } catch (error) {
      const status = Number((error as { status?: number }).status) === 400 ? 400 : 503;
      res.status(status).json({ message: status === 400 ? INVALID_COUPON_MESSAGE : "تعذر التحقق من الخصم حالياً" });
    }
  });
  return router;
}
