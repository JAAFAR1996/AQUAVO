import {
    type ReferralCode,
    type InsertReferralCode,
    type Referral,
    type InsertReferral,
    referralCodes,
    referrals,
    users,
    loyaltyTransactions
} from "../../shared/schema.js";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { awardFirstReferralPurchase } from "../services/referral-purchase-reward.js";

// Constants
const REFERRAL_POINTS_REWARD = 50; // نقاط المُحيل عند تسجيل صديق
const REFERRED_DISCOUNT_PERCENT = 5; // خصم الصديق بعد أول شراء

export class ReferralStorage {
    private ensureDb() {
        const db = getDb();
        if (!db) {
            throw new Error('Database not connected.');
        }
        return db;
    }

    // ========================================
    // Referral Codes
    // ========================================

    // Generate unique referral code
    private generateCode(userId: string, fullName?: string): string {
        // Use first part of name or random chars + random suffix
        const prefix = (fullName?.split(' ')[0] || 'REF')
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
            .slice(0, 5);
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}${suffix}`;
    }

    // Get or create referral code for user
    async getOrCreateReferralCode(userId: string, fullName?: string): Promise<ReferralCode> {
        const db = this.ensureDb();

        // Check if user already has a code
        const existing = await db.select()
            .from(referralCodes)
            .where(eq(referralCodes.userId, userId))
            .limit(1);

        if (existing.length > 0) {
            return existing[0];
        }

        // Generate unique code
        let code = this.generateCode(userId, fullName);
        let attempts = 0;

        while (attempts < 10) {
            const exists = await db.select()
                .from(referralCodes)
                .where(eq(referralCodes.code, code))
                .limit(1);

            if (exists.length === 0) break;

            code = this.generateCode(userId);
            attempts++;
        }

        // Create new code
        const [newCode] = await db.insert(referralCodes)
            .values({
                code,
                userId,
                isActive: true,
                totalReferrals: 0,
                totalPointsEarned: 0,
            })
            .returning();

        return newCode;
    }

    // Get referral code by code string
    async getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
        const db = this.ensureDb();
        const result = await db.select()
            .from(referralCodes)
            .where(eq(referralCodes.code, code.toUpperCase()))
            .limit(1);
        return result[0];
    }

    // Get referral code by user ID
    async getReferralCodeByUserId(userId: string): Promise<ReferralCode | undefined> {
        const db = this.ensureDb();
        const result = await db.select()
            .from(referralCodes)
            .where(eq(referralCodes.userId, userId))
            .limit(1);
        return result[0];
    }

    // ========================================
    // Referrals
    // ========================================

    // Create a new referral when friend registers
    async createReferral(
        referralCodeId: string,
        referrerUserId: string,
        referredUserId: string
    ): Promise<Referral> {
        const db = this.ensureDb();
        if (referrerUserId === referredUserId) throw Object.assign(new Error("لا يمكن إحالة نفس الحساب."), { status: 400 });
        return db.transaction(async tx => {
            // Stable account lock order prevents two simultaneous signup claims
            // from crediting the same referred account twice or overwriting points.
            const accounts = await tx.select().from(users)
                .where(inArray(users.id, [referrerUserId, referredUserId]))
                .orderBy(asc(users.id)).for("update");
            const referrer = accounts.find(account => account.id === referrerUserId);
            if (!referrer || !accounts.some(account => account.id === referredUserId)) {
                throw Object.assign(new Error("حساب الإحالة غير موجود."), { status: 400 });
            }
            const [existing] = await tx.select().from(referrals)
                .where(eq(referrals.referredUserId, referredUserId))
                .orderBy(asc(referrals.createdAt), asc(referrals.id)).limit(1);
            if (existing) {
                if (existing.referrerUserId !== referrerUserId || existing.referralCodeId !== referralCodeId) {
                    throw Object.assign(new Error("هذا الحساب مرتبط بإحالة سابقة."), { status: 409 });
                }
                // Historical signup credits did not have a ledger. Do not infer
                // that their missing ledger means the 50 points were never paid.
                return existing;
            }
            const [code] = await tx.select().from(referralCodes).where(eq(referralCodes.id, referralCodeId)).limit(1);
            if (!code?.isActive || code.userId !== referrerUserId) {
                throw Object.assign(new Error("كود الإحالة غير متاح."), { status: 400 });
            }
            const [referral] = await tx.insert(referrals).values({
                referrerUserId, referredUserId, referralCodeId,
                status: "registered", signupDate: new Date(),
                referrerPointsAwarded: REFERRAL_POINTS_REWARD,
            }).returning();
            if (!referral) throw new Error("Referral insert returned no record");
            const balance = (referrer.loyaltyPoints ?? 0) + REFERRAL_POINTS_REWARD;
            await tx.update(users).set({ loyaltyPoints: balance, updatedAt: new Date() })
                .where(eq(users.id, referrerUserId));
            await tx.insert(loyaltyTransactions).values({
                userId: referrerUserId, type: "referral_earn", pointsType: "loyalty", status: "approved",
                amount: REFERRAL_POINTS_REWARD, balanceAfter: balance,
                description: `كسبت ${REFERRAL_POINTS_REWARD} نقطة لتسجيل صديقك بالإحالة.`,
                metadata: { triggeredBy: "signup", referralId: referral.id },
            });
            await tx.update(referralCodes).set({
                totalReferrals: sql`COALESCE(${referralCodes.totalReferrals}, 0) + 1`,
                totalPointsEarned: sql`COALESCE(${referralCodes.totalPointsEarned}, 0) + ${REFERRAL_POINTS_REWARD}`,
            }).where(eq(referralCodes.id, referralCodeId));
            return referral;
        });
    }

    // Mark referral as completed (first purchase made)
    async markFirstPurchase(
        referredUserId: string,
        orderId: string
    ): Promise<{ referral: Referral | null; discountCode: string | null }> {
        return awardFirstReferralPurchase({ referredUserId, orderId });
    }

    // Get referral stats for a user
    async getReferralStats(userId: string): Promise<{
        totalReferrals: number;
        totalPointsEarned: number;
        recentReferrals: Referral[];
        referralCode: ReferralCode | null;
    }> {
        const db = this.ensureDb();

        // Get referral code
        const referralCode = await this.getReferralCodeByUserId(userId);

        // Get referrals made by this user
        const userReferrals = await db.select()
            .from(referrals)
            .where(eq(referrals.referrerUserId, userId))
            .orderBy(sql`${referrals.createdAt} DESC`)
            .limit(10);

        const totalReferrals = referralCode?.totalReferrals || 0;
        const totalPointsEarned = referralCode?.totalPointsEarned || 0;

        return {
            totalReferrals,
            totalPointsEarned,
            recentReferrals: userReferrals,
            referralCode: referralCode || null,
        };
    }

    // Check if user was referred
    async getReferralByReferredUser(userId: string): Promise<Referral | undefined> {
        const db = this.ensureDb();
        const result = await db.select()
            .from(referrals)
            .where(eq(referrals.referredUserId, userId))
            .limit(1);
        return result[0];
    }
}
