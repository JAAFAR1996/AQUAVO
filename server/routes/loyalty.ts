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

    // ========================================
    // POST /api/loyalty/aquarium-profile - حفظ ملف الحوض
    // ========================================
    const aquariumProfileSchema = z.object({
        tankSize: z.string().min(1, "حجم الحوض مطلوب"),
        fishType: z.string().min(1, "نوع الأسماك مطلوب"),
        mainProblem: z.string().min(1, "المشكلة الرئيسية مطلوبة"),
        tankAge: z.string().min(1, "عمر الحوض مطلوب"),
    });

    router.post("/aquarium-profile", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const validation = aquariumProfileSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    error: "بيانات غير صالحة",
                    details: validation.error.errors,
                });
            }

            const result = await loyaltyStorage.saveAquariumProfile(userId, validation.data);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/orders/:orderId/bonus - عرض مكافأة الطلب
    // ========================================
    router.get("/orders/:orderId/bonus", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const orderId = req.params.orderId as string;
            const result = await loyaltyStorage.getOrderBonus(orderId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/milestones - معالم التقدم
    // ========================================
    router.get("/milestones", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const result = await loyaltyStorage.checkMilestones(userId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/welcome-status - حالة نقاط الترحيب
    // ========================================
    router.get("/welcome-status", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
                    welcomeBonusClaimed: true, // If user is logged in, bonus was given at registration
                    points: balance.loyaltyPoints,
                    tier: balance.tier,
                    amountToNextTier: balance.amountToNextTier,
                    progressPercent: balance.progressPercent,
                },
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/coupons - كوبونات المستخدم الفعالة
    // ========================================
    router.get("/coupons", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const showAll = req.query.all === "true";
            const coupons = showAll
                ? await loyaltyStorage.getUserAllCoupons(userId)
                : await loyaltyStorage.getUserActiveCoupons(userId);

            res.json({
                success: true,
                data: coupons,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/badges - شارات المستخدم
    // ========================================
    router.get("/badges", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const { badgeEngine } = await import("../storage/badge-engine.js");
            const badgesList = await badgeEngine.getUserBadges(userId);

            res.json({
                success: true,
                data: badgesList,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // POST /api/loyalty/badges/check - فحص ومنح شارات جديدة
    // ========================================
    router.post("/badges/check", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const { badgeEngine } = await import("../storage/badge-engine.js");
            const awarded = await badgeEngine.checkAndAwardBadges(userId);

            res.json({
                success: true,
                data: {
                    newBadges: awarded,
                    count: awarded.length,
                },
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/challenges - تحديات الشهر
    // ========================================
    router.get("/challenges", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const { challengeStorage } = await import("../storage/challenge-storage.js");
            const challengesList = await challengeStorage.getUserChallenges(userId);

            res.json({
                success: true,
                data: challengesList,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/winback - فحص وتفعيل مكافأة الرجوع
    // ========================================
    router.get("/winback", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const { winbackEngine } = await import("../storage/winback-engine.js");
            const result = await winbackEngine.checkWinback(userId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/loyalty/recommendations - توصيات مخصصة
    // ========================================
    router.get("/recommendations", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const balance = await loyaltyStorage.getBalance(userId);
            const { winbackEngine } = await import("../storage/winback-engine.js");
            const recommendations = winbackEngine.getRecommendations(balance.aquariumProfile);

            res.json({
                success: true,
                data: recommendations,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // POST /api/loyalty/ai-bonus - مكافأة ذكية (يُستخدم من الـ backend notifications)
    // ========================================
    router.post("/ai-bonus", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sess = getSession(req);
            const userId = sess?.userId;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const { reason } = req.body;
            if (!reason || typeof reason !== "string") {
                return res.status(400).json({ error: "reason is required" });
            }

            const { winbackEngine } = await import("../storage/winback-engine.js");
            const result = await winbackEngine.awardAIBonus(userId, reason);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}
