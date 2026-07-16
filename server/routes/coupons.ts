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
                res.status(400).json({ message: "رمز الكوبون مطلوب" });
                return;
            }

            const coupon = await storage.getCouponByCode(code);

            if (!coupon) {
                res.status(404).json({ message: "رمز الكوبون غير صحيح" });
                return;
            }

            if (!coupon.isActive) {
                res.status(400).json({ message: "هذا الكوبون غير فعال حالياً" });
                return;
            }

            const now = new Date();
            if (coupon.startDate && new Date(coupon.startDate) > now) {
                res.status(400).json({ message: "هذا الكوبون لم يبدأ بعد" });
                return;
            }

            if (coupon.endDate && new Date(coupon.endDate) < now) {
                res.status(400).json({ message: "انتهت صلاحية هذا الكوبون" });
                return;
            }

            if (coupon.minOrderAmount && totalAmount && totalAmount < Number(coupon.minOrderAmount)) {
                res.status(400).json({
                    message: `يجب أن يكون مجموع الطلب ${coupon.minOrderAmount} د.ع على الأقل لاستخدام هذا الكوبون`
                });
                return;
            }

            if (coupon.maxUses !== null && coupon.maxUses !== undefined && (coupon.usedCount ?? 0) >= coupon.maxUses) {
                res.status(400).json({ message: "تم استخدام هذا الكوبون بالكامل" });
                return;
            }

            res.json(coupon);
        } catch (error) {
            console.error("Coupon validation error:", error);
            res.status(500).json({ message: "حدث خطأ أثناء التحقق من الكوبون" });
        }
    });

    return router;
}
