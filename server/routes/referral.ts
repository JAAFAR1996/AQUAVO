import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { ReferralStorage } from "../storage/referral-storage.js";
import { requireAuth } from "../middleware/auth.js";

const referralStorage = new ReferralStorage();

export function createReferralRouter(): RouterType {
    const router = Router();

    // ========================================
    // GET /api/referral/code - Get or create user's referral code
    // ========================================
    router.get("/code", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            // User is attached by requireAuth middleware
            const user = (req as any).user;
            const userId = user?.id;
            const fullName = user?.fullName;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const referralCode = await referralStorage.getOrCreateReferralCode(userId, fullName);

            // Generate shareable link
            const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
            const referralLink = `${baseUrl}/register?ref=${referralCode.code}`;

            res.json({
                code: referralCode.code,
                link: referralLink,
                isActive: referralCode.isActive,
                totalReferrals: referralCode.totalReferrals,
                totalPointsEarned: referralCode.totalPointsEarned,
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/referral/stats - Get referral statistics
    // ========================================
    router.get("/stats", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                return res.status(401).json({ error: "غير مسجل الدخول" });
            }

            const stats = await referralStorage.getReferralStats(userId);

            // Generate shareable link
            const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
            const referralLink = stats.referralCode
                ? `${baseUrl}/register?ref=${stats.referralCode.code}`
                : null;

            res.json({
                referralCode: stats.referralCode?.code || null,
                referralLink,
                totalReferrals: stats.totalReferrals,
                totalPointsEarned: stats.totalPointsEarned,
                recentReferrals: stats.recentReferrals.map(r => ({
                    id: r.id,
                    status: r.status,
                    signupDate: r.signupDate,
                    firstOrderDate: r.firstOrderDate,
                    pointsAwarded: r.referrerPointsAwarded,
                })),
            });
        } catch (error) {
            next(error);
        }
    });

    // ========================================
    // GET /api/referral/validate/:code - Validate a referral code
    // ========================================
    router.get("/validate/:code", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { code } = req.params;

            if (!code) {
                return res.status(400).json({ valid: false, error: "الكود مطلوب" });
            }

            const referralCode = await referralStorage.getReferralCodeByCode(code);

            if (!referralCode) {
                return res.json({ valid: false, error: "كود غير صالح" });
            }

            if (!referralCode.isActive) {
                return res.json({ valid: false, error: "الكود غير نشط" });
            }

            res.json({
                valid: true,
                referrerId: referralCode.userId,
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}
