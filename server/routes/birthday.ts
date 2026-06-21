import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { storage } from "../storage/index.js";
import { requireAuth, getSession } from "../middleware/auth.js";

// Birthday gift (2026): when a logged-in user whose birthday is today opens the
// site, they get a one-time, user-specific 10% coupon. Issuance is verified
// server-side from the stored birthDate — the client is never trusted.

const BIRTHDAY_DISCOUNT = 10; // percent
const COUPON_VALID_DAYS = 14; // window to use the gift

// month/day in Asia/Baghdad (project standard timezone) for a given date.
function baghdadMonthDay(date: Date): { month: number; day: number; year: number } {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Baghdad",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return { month: get("month"), day: get("day"), year: get("year") };
}

export function createBirthdayRouter(): RouterType {
    const router = Router();

    router.get(
        "/status",
        requireAuth,
        async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const sess = getSession(req);
                const userId = sess?.userId;
                const user = (req as any).user;
                if (!userId || !user) {
                    res.sendStatus(401);
                    return;
                }

                if (!user.birthDate) {
                    res.json({ isBirthday: false });
                    return;
                }

                const today = baghdadMonthDay(new Date());
                const bday = baghdadMonthDay(new Date(user.birthDate));

                if (today.month !== bday.month || today.day !== bday.day) {
                    res.json({ isBirthday: false });
                    return;
                }

                // It's their birthday — find or create this year's gift coupon.
                const code = `BDAY-${today.year}-${userId.slice(0, 8).toUpperCase()}`;

                const existing = await storage.getCouponByCode(code);
                if (existing) {
                    res.json({ isBirthday: true, coupon: existing, discount: BIRTHDAY_DISCOUNT });
                    return;
                }

                const now = new Date();
                const endDate = new Date(now.getTime() + COUPON_VALID_DAYS * 24 * 60 * 60 * 1000);

                const coupon = await storage.createCoupon({
                    code,
                    type: "percentage",
                    value: String(BIRTHDAY_DISCOUNT),
                    maxUses: 1,
                    maxUsesPerUser: 1,
                    usedCount: 0,
                    isActive: true,
                    startDate: now,
                    endDate,
                    userId,
                    description: "🎂 هدية عيد ميلادك — خصم 10%",
                });

                res.json({ isBirthday: true, coupon, discount: BIRTHDAY_DISCOUNT });
            } catch (err) {
                next(err);
            }
        }
    );

    return router;
}
