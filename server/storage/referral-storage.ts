import {
    type ReferralCode,
    type InsertReferralCode,
    type Referral,
    type InsertReferral,
    referralCodes,
    referrals,
    users
} from "../../shared/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db.js";

// Constants
const REFERRAL_POINTS_REWARD = 50; // نقاط المُحيل عند تسجيل صديق
const REFERRED_DISCOUNT_PERCENT = 5; // خصم الصديق بعد أول شراء

export class ReferralStorage {
    private db = getDb();

    private ensureDb() {
        if (!this.db) {
            throw new Error('Database not connected.');
        }
        return this.db;
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

        // Create referral record
        const [referral] = await db.insert(referrals)
            .values({
                referrerUserId,
                referredUserId,
                referralCodeId,
                status: 'registered',
                signupDate: new Date(),
            })
            .returning();

        // Award points to referrer immediately (50 points on signup)
        await this.awardReferrerPoints(referrerUserId, REFERRAL_POINTS_REWARD);

        // Update referral code stats
        await db.update(referralCodes)
            .set({
                totalReferrals: sql`${referralCodes.totalReferrals} + 1`,
                totalPointsEarned: sql`${referralCodes.totalPointsEarned} + ${REFERRAL_POINTS_REWARD}`,
            })
            .where(eq(referralCodes.id, referralCodeId));

        // Update referral with points awarded
        await db.update(referrals)
            .set({ referrerPointsAwarded: REFERRAL_POINTS_REWARD })
            .where(eq(referrals.id, referral.id));

        return referral;
    }

    // Award points to referrer
    private async awardReferrerPoints(userId: string, points: number): Promise<void> {
        const db = this.ensureDb();
        await db.update(users)
            .set({
                loyaltyPoints: sql`COALESCE(${users.loyaltyPoints}, 0) + ${points}`,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
    }

    // Mark referral as completed (first purchase made)
    async markFirstPurchase(
        referredUserId: string,
        orderId: string
    ): Promise<{ referral: Referral | null; discountCode: string | null }> {
        const db = this.ensureDb();

        // Find the referral for this user
        const [referral] = await db.select()
            .from(referrals)
            .where(
                and(
                    eq(referrals.referredUserId, referredUserId),
                    eq(referrals.status, 'registered')
                )
            )
            .limit(1);

        if (!referral) {
            return { referral: null, discountCode: null };
        }

        // Generate discount code for referred user
        const discountCode = `REF5-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Update referral status
        const [updatedReferral] = await db.update(referrals)
            .set({
                status: 'first_purchase',
                firstOrderId: orderId,
                firstOrderDate: new Date(),
                referredDiscountAwarded: true,
                referredCouponCode: discountCode,
                updatedAt: new Date(),
            })
            .where(eq(referrals.id, referral.id))
            .returning();

        return { referral: updatedReferral, discountCode };
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
