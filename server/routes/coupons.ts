import { Router } from "express";
import { storage } from "../storage/index.js";

export function createCouponRouter() {
    const router = Router();

    // Validate Coupon
    router.post("/validate", async (req, res) => {
        try {
            const { code, totalAmount } = req.body;

            if (!code) {
                return res.status(400).json({ message: "رمز الكوبون مطلوب" });
            }

            const coupon = await storage.getCouponByCode(code);

            if (!coupon) {
                return res.status(404).json({ message: "رمز الكوبون غير صحيح" });
            }

            if (!coupon.isActive) {
                return res.status(400).json({ message: "هذا الكوبون غير فعال حالياً" });
            }

            const now = new Date();
            if (coupon.startDate && new Date(coupon.startDate) > now) {
                return res.status(400).json({ message: "هذا الكوبون لم يبدأ بعد" });
            }

            if (coupon.endDate && new Date(coupon.endDate) < now) {
                return res.status(400).json({ message: "انتهت صلاحية هذا الكوبون" });
            }

            if (coupon.minOrderAmount && totalAmount < Number(coupon.minOrderAmount)) {
                return res.status(400).json({
                    message: `يجب أن يكون مجموع الطلب ${coupon.minOrderAmount} د.ع على الأقل لاستخدام هذا الكوبون`
                });
            }

            res.json(coupon);
        } catch (error) {
            console.error("Coupon validation error:", error);
            res.status(500).json({ message: "حدث خطأ أثناء التحقق من الكوبون" });
        }
    });

    return router;
}
