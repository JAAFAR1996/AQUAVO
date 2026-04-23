/**
 * AQUAVO Loyalty API Routes
 * =========================
 * راوتر نقاط الولاء والعضويات
 */

import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { requireAuth, getSession } from "../middleware/auth.js";
import { loyaltyStorage, MEMBERSHIP_TIERS } from "../storage/loyalty-storage.js";
import { z } from "zod";

export function createLoyaltyRouter(): RouterType {
    const router = Router();

    // ========================================
    // GET /api/loyalty/balance - رصيد النقاط والعضوية
    // ========================================
    router.get("/balance", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const balance = await loyaltyStorage.getBalance(userId);

            res.json({
                success: true,
                data: balance,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/history - سجل حركات النقاط
    // ========================================
    router.get("/history", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
            const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

            const history = await loyaltyStorage.getTransactionHistory(userId, limit, offset);

            res.json({
                success: true,
                data: history,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // POST /api/loyalty/preview-redeem - معاينة استبدال النقاط (قبل الشراء)
    // ========================================
    const previewRedeemSchema = z.object({
        orderTotal: z.number().positive("المبلغ يجب أن يكون موجباً"),
        usePoints: z.boolean().optional().default(true),
        useCashback: z.boolean().optional().default(true),
    });

    router.post("/preview-redeem", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const validation = previewRedeemSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    error: "بيانات غير صالحة",
                    details: validation.error.errors,
                });
            }

            const { orderTotal, usePoints, useCashback } = validation.data;

            const preview = await loyaltyStorage.previewRedemption(
                userId,
                orderTotal,
                usePoints,
                useCashback,
            );

            // أيضاً حساب التقريب على المبلغ النهائي
            const rounding = loyaltyStorage.roundToIraqiDenomination(preview.finalAmount);

            res.json({
                success: true,
                data: {
                    ...preview,
                    rounding: {
                        originalAmount: rounding.originalAmount,
                        roundedAmount: rounding.roundedAmount,
                        cashbackEarned: rounding.remainder,
                    },
                    // المبلغ النهائي الذي سيدفعه العميل
                    amountToPay: rounding.roundedAmount,
                },
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/tiers - معلومات المستويات
    // ========================================
    router.get("/tiers", (_req: Request, res: Response) => {
        res.json({
            success: true,
            data: MEMBERSHIP_TIERS,
        });
    });

    // ========================================
    // GET /api/loyalty/tier-progress - تقدم العضوية
    // ========================================
    router.get("/tier-progress", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const balance = await loyaltyStorage.getBalance(userId);

            res.json({
                success: true,
                data: {
                    currentTier: balance.tier,
                    tierInfo: balance.tierInfo,
                    totalSpent: balance.totalSpent,
                    amountToNextTier: balance.amountToNextTier,
                    progressPercent: balance.progressPercent,
                },
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}
