/**
 * AQUAVO Winback & AI Bonus Engine
 * ==================================
 * استرجاع الزبائن + ربط الإشعارات الذكية بالنقاط
 *
 * Rules:
 * - 45+ days inactive → +30 loyalty points on next order
 * - 90+ days inactive → 7% discount coupon (max 10,000 IQD), valid 7 days
 * - Winback triggers once per absence period (no repeated winbacks)
 * - AI bonus: max 1 per week per user
 */

import { eq, sql, desc } from "drizzle-orm";
import { getDb } from "../db.js";
// Canonical realized-status set, so this eligibility query cannot drift from accounting.
import { REALIZED_STATUS_SQL } from "../services/accounting-engine.js";
import {
  users,
  orders,
  loyaltyTransactions,
  loyaltyCoupons,
} from "../../shared/schema.js";

// ========================================
// Constants
// ========================================

/** Days of inactivity for points winback */
const WINBACK_POINTS_DAYS = 45;

/** Days of inactivity for discount winback */
const WINBACK_DISCOUNT_DAYS = 90;

/** Points awarded for winback */
const WINBACK_POINTS = 30;

/** Discount percentage for deep winback */
const WINBACK_DISCOUNT_PERCENT = 7;

/** Max discount in IQD */
const WINBACK_MAX_DISCOUNT_IQD = 10_000;

/** Coupon validity days */
const WINBACK_COUPON_DAYS = 7;

/** Min days between AI bonuses */
const AI_BONUS_COOLDOWN_DAYS = 7;

/** Points for AI-triggered bonus */
const AI_BONUS_POINTS = 15;

// ========================================
// Winback Engine
// ========================================

export class WinbackEngine {
  private ensureDb() {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    return db;
  }

  /**
   * فحص غياب المستخدم وتوليد مكافأة الرجوع
   * يُستدعى عند تسجيل الدخول أو عند وضع طلب جديد
   */
  async checkWinback(userId: string): Promise<{
    type: "points" | "discount" | "none";
    value?: number;
    couponId?: string;
    message?: string;
  }> {
    const db = this.ensureDb();

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { type: "none" };

    // جلب آخر طلب مسلّم
    const [lastOrder] = await db
      .select()
      .from(orders)
      // "Last order they actually RECEIVED" — bound to the canonical realized set.
      .where(sql`${orders.userId} = ${userId} AND ${orders.status} IN ${REALIZED_STATUS_SQL}`)
      .orderBy(desc(orders.createdAt))
      .limit(1);

    if (!lastOrder) return { type: "none" };

    const lastOrderDate = new Date(lastOrder.createdAt);
    const now = new Date();
    const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

    // فحص: هل حصل على winback مسبقاً لهذه الفترة؟
    const existingWinback = await db
      .select()
      .from(loyaltyTransactions)
      .where(sql`
        ${loyaltyTransactions.userId} = ${userId} 
        AND ${loyaltyTransactions.type} = 'winback' 
        AND ${loyaltyTransactions.createdAt} > ${lastOrderDate.toISOString()}
      `)
      .limit(1);

    if (existingWinback.length > 0) return { type: "none" };

    // 90+ يوم → كوبون خصم 7%
    if (daysSinceLastOrder >= WINBACK_DISCOUNT_DAYS) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + WINBACK_COUPON_DAYS);

      const [coupon] = await db.insert(loyaltyCoupons).values({
        userId,
        type: "discount_pct",
        value: { amount: WINBACK_MAX_DISCOUNT_IQD, percent: WINBACK_DISCOUNT_PERCENT, label: `خصم ${WINBACK_DISCOUNT_PERCENT}% — هدية رجعتك` },
        minOrderAmount: 25_000,
        maxDiscount: WINBACK_MAX_DISCOUNT_IQD,
        expiresAt,
        source: "winback",
      }).returning();

      // log transaction
      await db.insert(loyaltyTransactions).values({
        userId,
        type: "winback",
        pointsType: "loyalty",
        status: "approved",
        amount: 0,
        balanceAfter: user.loyaltyPoints ?? 0,
        description: `كوبون خصم ${WINBACK_DISCOUNT_PERCENT}% — رجعتك بعد ${daysSinceLastOrder} يوم`,
        metadata: { daysSinceLastOrder, couponId: coupon.id, type: "discount" },
      });

      return {
        type: "discount",
        value: WINBACK_DISCOUNT_PERCENT,
        couponId: coupon.id,
        message: `رجعت! خذ خصم ${WINBACK_DISCOUNT_PERCENT}% على طلبك القادم — صالح لـ ${WINBACK_COUPON_DAYS} أيام.`,
      };
    }

    // 45+ يوم → +30 نقطة
    if (daysSinceLastOrder >= WINBACK_POINTS_DAYS) {
      const newBalance = (user.loyaltyPoints ?? 0) + WINBACK_POINTS;

      await db
        .update(users)
        .set({ loyaltyPoints: newBalance, updatedAt: new Date() })
        .where(eq(users.id, userId));

      await db.insert(loyaltyTransactions).values({
        userId,
        type: "winback",
        pointsType: "loyalty",
        status: "approved",
        amount: WINBACK_POINTS,
        balanceAfter: newBalance,
        description: `رجعت! +${WINBACK_POINTS} نقطة ترحيبية بعد ${daysSinceLastOrder} يوم`,
        metadata: { daysSinceLastOrder, type: "points" },
      });

      return {
        type: "points",
        value: WINBACK_POINTS,
        message: `رجعت! خذ ${WINBACK_POINTS} نقطة ترحيبية.`,
      };
    }

    return { type: "none" };
  }

  /**
   * AI Bonus — مكافأة ذكية مرتبطة بإشعار
   * (مثال: تذكير بشراء علف، رجوع بعد غياب قصير)
   * حد أقصى: مرة واحدة أسبوعياً
   */
  async awardAIBonus(userId: string, reason: string): Promise<{
    awarded: boolean;
    points?: number;
    message?: string;
  }> {
    const db = this.ensureDb();

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { awarded: false };

    // فحص cooldown: هل حصل على AI bonus خلال الأسبوع الأخير؟
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - AI_BONUS_COOLDOWN_DAYS);

    const recentAIBonus = await db
      .select()
      .from(loyaltyTransactions)
      .where(sql`
        ${loyaltyTransactions.userId} = ${userId} 
        AND ${loyaltyTransactions.type} = 'ai_bonus' 
        AND ${loyaltyTransactions.createdAt} > ${cooldownDate.toISOString()}
      `)
      .limit(1);

    if (recentAIBonus.length > 0) return { awarded: false };

    const newBalance = (user.loyaltyPoints ?? 0) + AI_BONUS_POINTS;

    await db
      .update(users)
      .set({ loyaltyPoints: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await db.insert(loyaltyTransactions).values({
      userId,
      type: "ai_bonus",
      pointsType: "loyalty",
      status: "approved",
      amount: AI_BONUS_POINTS,
      balanceAfter: newBalance,
      description: `+${AI_BONUS_POINTS} نقطة — ${reason}`,
      metadata: { reason },
    });

    return {
      awarded: true,
      points: AI_BONUS_POINTS,
      message: `طلبك الجاي ممكن يفتح نقاط إضافية — +${AI_BONUS_POINTS} نقطة`,
    };
  }

  /**
   * توصيات مخصصة بناءً على aquarium_profile
   */
  getRecommendations(aquariumProfile: {
    tankSize?: string;
    fishType?: string;
    mainProblem?: string;
    tankAge?: string;
  } | null): Array<{
    category: string;
    label: string;
    reason: string;
  }> {
    if (!aquariumProfile) return [];

    const recommendations: Array<{ category: string; label: string; reason: string }> = [];

    // Based on tank size
    if (aquariumProfile.tankSize === "small") {
      recommendations.push({
        category: "filters",
        label: "فلاتر أحواض صغيرة",
        reason: "مناسبة لحجم حوضك",
      });
    } else if (aquariumProfile.tankSize === "large" || aquariumProfile.tankSize === "xlarge") {
      recommendations.push({
        category: "filters",
        label: "فلاتر خارجية قوية",
        reason: "حوضك كبير ويحتاج فلتر بقدرة عالية",
      });
    }

    // Based on fish type
    if (aquariumProfile.fishType === "freshwater") {
      recommendations.push({
        category: "food",
        label: "أعلاف أسماك المياه العذبة",
        reason: "تغذية مناسبة لأسماكك",
      });
    } else if (aquariumProfile.fishType === "saltwater") {
      recommendations.push({
        category: "salt",
        label: "أملاح بحرية ومكملات",
        reason: "ضرورية لأحواض المياه المالحة",
      });
    } else if (aquariumProfile.fishType === "planted") {
      recommendations.push({
        category: "fertilizers",
        label: "أسمدة نباتية وإضاءة LED",
        reason: "لنمو نباتات حوضك",
      });
    }

    // Based on main problem
    switch (aquariumProfile.mainProblem) {
      case "algae":
        recommendations.push({
          category: "treatment",
          label: "معالجات الطحالب",
          reason: "تساعدك تتخلص من مشكلة الطحالب",
        });
        break;
      case "disease":
        recommendations.push({
          category: "medicine",
          label: "أدوية الأسماك",
          reason: "لعلاج ومنع الأمراض",
        });
        break;
      case "water_quality":
        recommendations.push({
          category: "testing",
          label: "أدوات فحص المياه",
          reason: "لمراقبة جودة مياه حوضك",
        });
        break;
      case "feeding":
        recommendations.push({
          category: "food",
          label: "أعلاف متخصصة ومغذيات",
          reason: "لتحسين تغذية أسماكك",
        });
        break;
    }

    // Based on tank age
    if (aquariumProfile.tankAge === "new") {
      recommendations.push({
        category: "cycling",
        label: "مستلزمات تدوير الحوض الجديد",
        reason: "حوضك جديد ويحتاج بكتيريا نافعة",
      });
    }

    return recommendations;
  }
}

export const winbackEngine = new WinbackEngine();
