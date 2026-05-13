/**
 * AQUAVO Loyalty Notification Service
 * =====================================
 * إشعارات تلقائية لنظام الولاء
 * - إشعار كسب النقاط بعد الشراء
 * - إشعار ترقية المستوى
 * - إنشاء كود خصم تلقائي عند عتبة معينة
 */

import { getDb } from "../db.js";
import { notificationLog, users, coupons } from "../../shared/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { MEMBERSHIP_TIERS } from "../storage/loyalty-storage.js";
import { storage } from "../storage/index.js";

/** نتيجة معالجة نقاط الطلب من loyalty-storage */
interface LoyaltyOrderResult {
  purchasePoints: number;
  roundingPoints: number;
  pointsRedeemed: number;
  cashbackRedeemed: number;
  roundedTotal: number;
  newTier: string;
  oldTier: string;
  tierChanged: boolean;
  newLoyaltyBalance: number;
  newCashbackBalance: number;
}

/** عتبات النقاط التي تولّد كود خصم تلقائي */
const POINTS_MILESTONES = [
  { points: 50, discountPercent: 3, label: "مكافأة 50 نقطة" },
  { points: 150, discountPercent: 5, label: "مكافأة 150 نقطة" },
  { points: 500, discountPercent: 8, label: "مكافأة 500 نقطة" },
  { points: 1000, discountPercent: 10, label: "مكافأة 1000 نقطة" },
] as const;

const TIER_NAMES: Record<string, string> = {
  bronze: "برونزي",
  silver: "فضي",
  gold: "ذهبي",
  diamond: "ماسي",
};

const TIER_EMOJIS: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  diamond: "💎",
};

export class LoyaltyNotificationService {

  /**
   * إرسال كل إشعارات الولاء بعد الشراء
   * يتم استدعاءها من orders.ts بعد processOrderPoints
   */
  async sendPostPurchaseNotifications(
    userId: string,
    orderId: string,
    loyaltyResult: LoyaltyOrderResult,
  ): Promise<void> {
    try {
      const db = getDb();
      if (!db) return;

      // 1. إشعار كسب النقاط
      await this.notifyPointsEarned(userId, orderId, loyaltyResult);

      // 2. إشعار ترقية المستوى
      if (loyaltyResult.tierChanged) {
        await this.notifyTierUpgrade(userId, loyaltyResult.oldTier, loyaltyResult.newTier);
      }

      // 3. فحص عتبات النقاط وإنشاء كوبونات
      await this.checkMilestonesAndReward(userId, loyaltyResult.newLoyaltyBalance);

    } catch (error) {
      console.error("[AQUAVO Loyalty Notifications] Error:", error);
      // لا نوقف عملية الشراء بسبب فشل الإشعارات
    }
  }

  /**
   * إشعار: كسب نقاط بعد الشراء
   */
  private async notifyPointsEarned(
    userId: string,
    orderId: string,
    result: LoyaltyOrderResult,
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    const totalEarned = result.purchasePoints + result.roundingPoints;
    if (totalEarned <= 0) return;

    // جلب الرصيد الحالي من DB مباشرة (processOrderPoints لا يرجع newLoyaltyBalance)
    let currentBalance: number | null = result.newLoyaltyBalance ?? null;
    if (currentBalance == null || isNaN(currentBalance)) {
      const [u] = await db.select({ lb: users.loyaltyBalance }).from(users).where(eq(users.id, userId)).limit(1);
      currentBalance = Number(u?.lb ?? 0);
    }

    let bodyText = `حصلت على +${result.purchasePoints} نقطة ولاء`;
    if (result.roundingPoints > 0) {
      bodyText += ` و +${result.roundingPoints} نقطة باقي تقريب`;
    }
    bodyText += ` — رصيدك الحالي: ${currentBalance} نقطة`;

    await db.insert(notificationLog).values({
      userId,
      type: "loyalty_points_earned",
      channel: "in_app",
      title: "🎁 حصلت على نقاط جديدة!",
      body: bodyText,
      url: "/profile?tab=loyalty",
      metadata: {
        orderId,
        purchasePoints: result.purchasePoints,
        roundingPoints: result.roundingPoints,
        totalBalance: result.newLoyaltyBalance,
        cashbackBalance: result.newCashbackBalance,
      },
      sentAt: new Date(),
    });
  }

  /**
   * إشعار: ترقية المستوى
   */
  private async notifyTierUpgrade(
    userId: string,
    oldTier: string,
    newTier: string,
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    const newTierName = TIER_NAMES[newTier] || newTier;
    const newTierEmoji = TIER_EMOJIS[newTier] || "⭐";
    const tierConfig = MEMBERSHIP_TIERS[newTier as keyof typeof MEMBERSHIP_TIERS];

    let benefitsText = "";
    if (tierConfig) {
      const topBenefits = tierConfig.benefits.slice(0, 3).join("، ");
      benefitsText = ` مزاياك الجديدة: ${topBenefits}`;
    }

    await db.insert(notificationLog).values({
      userId,
      type: "loyalty_tier_upgrade",
      channel: "in_app",
      title: `${newTierEmoji} تهانينا! ترقيت لعضو ${newTierName}!`,
      body: `مبروك! انتقلت من ${TIER_NAMES[oldTier] || oldTier} إلى ${newTierName}.${benefitsText}`,
      url: "/profile?tab=loyalty",
      metadata: {
        oldTier,
        newTier,
        discountPercent: tierConfig?.discountPercent || 0,
        pointMultiplier: tierConfig?.pointMultiplier || 1,
      },
      sentAt: new Date(),
    });
  }

  /**
   * فحص عتبات النقاط وإنشاء كود خصم تلقائي
   * عندما يصل المستخدم لـ 50, 150, 500, 1000 نقطة → كوبون تلقائي
   */
  private async checkMilestonesAndReward(
    userId: string,
    currentPoints: number,
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    for (const milestone of POINTS_MILESTONES) {
      if (currentPoints >= milestone.points) {
        // فحص هل المستخدم حصل على هذه المكافأة مسبقاً
        const existingReward = await db
          .select({ id: notificationLog.id })
          .from(notificationLog)
          .where(
            and(
              eq(notificationLog.userId, userId),
              eq(notificationLog.type, `loyalty_milestone_${milestone.points}`),
            )
          )
          .limit(1);

        if (existingReward.length > 0) continue; // حصل عليها مسبقاً

        // إنشاء كود خصم فريد
        const couponCode = `LOYAL${milestone.points}_${userId.substring(0, 6).toUpperCase()}`;

        try {
          await storage.createCoupon({
            code: couponCode,
            type: "percentage",
            value: String(milestone.discountPercent),
            maxUses: 1,
            maxUsesPerUser: 1,
            isActive: true,
            description: `${milestone.label} - خصم ${milestone.discountPercent}% مكافأة الولاء`,
            startDate: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 يوم
            userId,
          });

          // إشعار بالكوبون الجديد
          await db.insert(notificationLog).values({
            userId,
            type: `loyalty_milestone_${milestone.points}`,
            channel: "in_app",
            title: `🎊 مبروك! وصلت لـ ${milestone.points} نقطة!`,
            body: `كمكافأة حصلت على كود خصم ${milestone.discountPercent}%: ${couponCode} — استخدمه خلال 90 يوم!`,
            url: "/profile?tab=coupons",
            metadata: {
              milestone: milestone.points,
              couponCode,
              discountPercent: milestone.discountPercent,
              expiresInDays: 90,
            },
            sentAt: new Date(),
          });

          console.log(`[AQUAVO Loyalty] Milestone ${milestone.points} reached! Coupon ${couponCode} created for user ${userId}`);
        } catch (couponErr) {
          console.error(`[AQUAVO Loyalty] Failed to create milestone coupon:`, couponErr);
        }
      }
    }
  }
}

export const loyaltyNotifications = new LoyaltyNotificationService();
