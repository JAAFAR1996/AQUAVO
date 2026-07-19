import type { Router as RouterType, Request, Response } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";

interface CouponValidateRequest {
    code?: string;
    totalAmount?: number;
}

export function createCouponRouter(): RouterType {
    const router = Router();

    // Validate Coupon
    router.post("/validate", async (req: Request, res: Response): Promise<void> => {
        try {
            const { code, totalAmount } = req.body as CouponValidateRequest;

            if (!code) {
                // `code` is stable, additive presentation metadata for the client to map
                // to a localized message. It does NOT change validation rules or statuses.
                res.status(400).json({ code: "MISSING_CODE", message: "رمز الكوبون مطلوب" });
                return;
            }

            const coupon = await storage.getCouponByCode(code);

            if (!coupon) {
                res.status(404).json({ code: "NOT_FOUND", message: "رمز الكوبون غير صحيح" });
                return;
            }

            if (!coupon.isActive) {
                res.status(400).json({ code: "INACTIVE", message: "هذا الكوبون غير فعال حالياً" });
                return;
            }

            const now = new Date();
            if (coupon.startDate && new Date(coupon.startDate) > now) {
                res.status(400).json({ code: "NOT_STARTED", message: "هذا الكوبون لم يبدأ بعد" });
                return;
            }

            if (coupon.endDate && new Date(coupon.endDate) < now) {
                res.status(400).json({ code: "EXPIRED", message: "انتهت صلاحية هذا الكوبون" });
                return;
            }

            if (coupon.minOrderAmount && totalAmount && totalAmount < Number(coupon.minOrderAmount)) {
                res.status(400).json({
                    code: "MIN_ORDER",
                    minOrderAmount: Number(coupon.minOrderAmount),
                    message: `يجب أن يكون مجموع الطلب ${coupon.minOrderAmount} د.ع على الأقل لاستخدام هذا الكوبون`
                });
                return;
            }

            if (coupon.maxUses !== null && coupon.maxUses !== undefined && (coupon.usedCount ?? 0) >= coupon.maxUses) {
                res.status(400).json({ code: "USAGE_LIMIT", message: "تم استخدام هذا الكوبون بالكامل" });
                return;
            }

            res.json(coupon);
        } catch (error) {
            console.error("Coupon validation error:", error);
            res.status(500).json({ code: "SERVER_ERROR", message: "حدث خطأ أثناء التحقق من الكوبون" });
        }
    });

    return router;
}
