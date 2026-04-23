/**
 * AQUAVO Loyalty Points & Membership System
 * ==========================================
 * نظام نقاط الولاء والعضويات لمتجر أكوافو
 * 
 * المكونات:
 * 1. تقريب الأسعار للسوق العراقي (أقرب 250 دينار)
 * 2. نقاط الشراء (1 نقطة لكل 5,000 دينار)
 * 3. مستويات العضوية (برونزي/فضي/ذهبي/ماسي)
 * 4. استبدال النقاط عند الشراء
 */

import { eq, sql, desc } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  users,
  orders,
  loyaltyTransactions,
  type User,
  type LoyaltyTransaction,
} from "../../shared/schema.js";

// ========================================
// ثوابت النظام
// ========================================

/** أقل فئة عملة عراقية متداولة */
const IRAQI_DENOMINATION = 250;

/** نقطة واحدة لكل هذا المبلغ */
const POINTS_PER_DINAR = 5000;

/** قيمة نقطة الولاء الواحدة عند الاستبدال (بالدينار) */
const LOYALTY_POINT_VALUE_IQD = 20;

/** قيمة نقطة الباقي عند الاستبدال (بالدينار) - 1:1 لأنها باقي فعلي */
const CASHBACK_POINT_VALUE_IQD = 1;

/** نقاط إحالة صديق عند أول شراء */
const REFERRAL_FIRST_PURCHASE_BONUS = 25;

/** نقاط كتابة تقييم */
const REVIEW_POINTS = 10;

/** مستويات العضوية - حدود الإنفاق بالدينار العراقي */
export const MEMBERSHIP_TIERS = {
  bronze: {
    name: "برونزي",
    nameEn: "bronze",
    minSpent: 0,
    maxSpent: 149_999,
    pointMultiplier: 1.0,
    discountPercent: 0,
    freeShipping: false,
    color: "#CD7F32",
    icon: "🥉",
    benefits: [
      "نقطة لكل 5,000 دينار مشتريات",
      "باقي التقريب يتحول لرصيد",
      "كوبون ترحيبي 3%",
      "نقاط إضافية عند دعوة صديق",
    ],
  },
  silver: {
    name: "فضي",
    nameEn: "silver",
    minSpent: 150_000,
    maxSpent: 499_999,
    pointMultiplier: 1.5,
    discountPercent: 3,
    freeShipping: false,
    color: "#C0C0C0",
    icon: "🥈",
    benefits: [
      "1.5x مضاعف نقاط على كل شراء",
      "خصم 3% دائم على جميع المنتجات",
      "أولوية بالشحن والتوصيل",
      "إشعار مبكر بالعروض قبل الجميع",
      "نقاط مضاعفة على التقييمات",
    ],
  },
  gold: {
    name: "ذهبي",
    nameEn: "gold",
    minSpent: 500_000,
    maxSpent: 1_499_999,
    pointMultiplier: 2.0,
    discountPercent: 5,
    freeShipping: true,
    color: "#FFD700",
    icon: "🥇",
    benefits: [
      "2x مضاعف نقاط على كل شراء",
      "خصم 5% دائم على جميع المنتجات",
      "شحن مجاني على جميع الطلبات",
      "دعم فني VIP عبر واتساب",
      "وصول مبكر للمنتجات الجديدة",
      "استشارة مجانية لتجهيز الحوض",
    ],
  },
  diamond: {
    name: "ماسي",
    nameEn: "diamond",
    minSpent: 1_500_000,
    maxSpent: Infinity,
    pointMultiplier: 3.0,
    discountPercent: 8,
    freeShipping: true,
    color: "#B9F2FF",
    icon: "💎",
    benefits: [
      "3x مضاعف نقاط على كل شراء",
      "خصم 8% دائم على جميع المنتجات",
      "شحن مجاني وسريع (أولوية قصوى)",
      "دعم فني VIP مباشر على مدار الساعة",
      "وصول حصري لمنتجات محدودة الإصدار",
      "هدية مفاجئة مع كل طلب",
      "استشارة شهرية مجانية مع خبير أحواض",
      "دعوة لفعاليات AQUAVO الحصرية",
    ],
  },
} as const;

export type TierName = keyof typeof MEMBERSHIP_TIERS;

// ========================================
// واجهات البيانات
// ========================================

export interface RoundingResult {
  /** المبلغ الأصلي */
  originalAmount: number;
  /** المبلغ بعد التقريب لأقرب 250 */
  roundedAmount: number;
  /** الفرق (الباقي) يتحول لنقاط cashback */
  remainder: number;
}

export interface PurchasePointsResult {
  /** نقاط الشراء المكتسبة (loyalty) */
  purchasePoints: number;
  /** نقاط الباقي المكتسبة (cashback) */
  roundingPoints: number;
  /** المبلغ بعد التقريب */
  roundedTotal: number;
  /** المستوى الجديد (إن تغير) */
  newTier: TierName;
  /** هل تغير المستوى؟ */
  tierChanged: boolean;
}

export interface RedeemResult {
  /** نقاط الولاء المستخدمة */
  loyaltyPointsUsed: number;
  /** نقاط الباقي المستخدمة */
  cashbackUsed: number;
  /** إجمالي الخصم بالدينار */
  totalDiscount: number;
  /** المبلغ النهائي بعد الخصم */
  finalAmount: number;
}

export interface LoyaltyBalance {
  /** نقاط الولاء */
  loyaltyPoints: number;
  /** قيمتها بالدينار */
  loyaltyValueIQD: number;
  /** نقاط الباقي */
  cashbackBalance: number;
  /** قيمتها بالدينار */
  cashbackValueIQD: number;
  /** إجمالي القيمة */
  totalValueIQD: number;
  /** المستوى الحالي */
  tier: TierName;
  /** بيانات المستوى */
  tierInfo: typeof MEMBERSHIP_TIERS[TierName];
  /** إجمالي المشتريات */
  totalSpent: number;
  /** المبلغ المتبقي للمستوى التالي */
  amountToNextTier: number | null;
  /** نسبة التقدم للمستوى التالي */
  progressPercent: number;
}

// ========================================
// الفئة الرئيسية
// ========================================

export class LoyaltyStorage {
  private ensureDb() {
    const db = getDb();
    if (!db) {
      throw new Error("Database not connected.");
    }
    return db;
  }

  // ----------------------------------------
  // 1. تقريب الأسعار العراقي
  // ----------------------------------------

  /**
   * تقريب المبلغ لأقرب فئة عملة عراقية (250 دينار)
   * الباقي يتحول لنقاط cashback
   */
  roundToIraqiDenomination(amount: number): RoundingResult {
    if (amount <= 0) {
      return { originalAmount: 0, roundedAmount: 0, remainder: 0 };
    }
    const rounded = Math.ceil(amount / IRAQI_DENOMINATION) * IRAQI_DENOMINATION;
    return {
      originalAmount: amount,
      roundedAmount: rounded,
      remainder: rounded - amount,
    };
  }

  // ----------------------------------------
  // 2. حساب نقاط الشراء
  // ----------------------------------------

  /**
   * حساب المستوى بناءً على إجمالي المشتريات
   */
  calculateTier(totalSpent: number): TierName {
    if (totalSpent >= MEMBERSHIP_TIERS.diamond.minSpent) return "diamond";
    if (totalSpent >= MEMBERSHIP_TIERS.gold.minSpent) return "gold";
    if (totalSpent >= MEMBERSHIP_TIERS.silver.minSpent) return "silver";
    return "bronze";
  }

  /**
   * حساب نقاط الشراء مع مضاعف المستوى
   */
  calculatePurchasePoints(amount: number, tier: TierName): number {
    const basePoints = Math.floor(amount / POINTS_PER_DINAR);
    const multiplier = MEMBERSHIP_TIERS[tier].pointMultiplier;
    return Math.floor(basePoints * multiplier);
  }

  /**
   * حساب أقصى خصم ممكن من النقاط
   */
  calculateMaxRedemption(
    loyaltyPoints: number,
    cashbackBalance: number,
  ): number {
    return (loyaltyPoints * LOYALTY_POINT_VALUE_IQD) + (cashbackBalance * CASHBACK_POINT_VALUE_IQD);
  }

  // ----------------------------------------
  // 3. معالجة الشراء الكاملة
  // ----------------------------------------

  /**
   * معالجة النقاط بعد إتمام طلب شراء
   * يُستدعى من orders.ts بعد إنشاء الطلب بنجاح
   */
  async processOrderPoints(
    userId: string,
    orderId: string,
    orderTotal: number,
    pointsUsed: number = 0,
    cashbackUsed: number = 0,
  ): Promise<PurchasePointsResult> {
    const db = this.ensureDb();

    // 1. جلب بيانات المستخدم الحالية
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const currentLoyalty = user.loyaltyPoints ?? 0;
    const currentCashback = user.cashbackBalance ?? 0;
    const currentTotalSpent = user.totalSpent ?? 0;
    const currentTier = (user.loyaltyTier as TierName) || "bronze";

    // 2. حساب الخصم من النقاط
    const loyaltyDiscount = pointsUsed * LOYALTY_POINT_VALUE_IQD;
    const cashbackDiscount = cashbackUsed * CASHBACK_POINT_VALUE_IQD;
    const totalPointsDiscount = loyaltyDiscount + cashbackDiscount;

    // 3. المبلغ بعد خصم النقاط
    const amountAfterDiscount = Math.max(0, orderTotal - totalPointsDiscount);

    // 4. تقريب المبلغ
    const rounding = this.roundToIraqiDenomination(amountAfterDiscount);

    // 5. حساب نقاط الشراء الجديدة (على المبلغ المقرب)
    const purchasePoints = this.calculatePurchasePoints(rounding.roundedAmount, currentTier);
    const roundingPoints = rounding.remainder; // 1 نقطة cashback = 1 دينار

    // 6. تحديث الأرصدة
    const newLoyaltyPoints = currentLoyalty - pointsUsed + purchasePoints;
    const newCashbackBalance = currentCashback - cashbackUsed + roundingPoints;
    const newTotalSpent = currentTotalSpent + Math.round(rounding.roundedAmount);

    // 7. تحديث المستوى
    const newTier = this.calculateTier(newTotalSpent);
    const tierChanged = newTier !== currentTier;

    // 8. تحديث المستخدم في قاعدة البيانات
    await db
      .update(users)
      .set({
        loyaltyPoints: newLoyaltyPoints,
        cashbackBalance: newCashbackBalance,
        totalSpent: newTotalSpent,
        loyaltyTier: newTier,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // 9. تحديث الطلب بمعلومات النقاط
    await db
      .update(orders)
      .set({
        roundedTotal: String(rounding.roundedAmount),
        pointsUsed,
        cashbackUsed,
        pointsDiscount: String(totalPointsDiscount),
        pointsEarned: purchasePoints,
        roundingCashback: roundingPoints,
      })
      .where(eq(orders.id, orderId));

    // 10. تسجيل حركات النقاط

    // خصم النقاط المستخدمة
    if (pointsUsed > 0) {
      await this.logTransaction(userId, {
        type: "redeem",
        pointsType: "loyalty",
        amount: -pointsUsed,
        balanceAfter: newLoyaltyPoints,
        orderId,
        description: `استبدال ${pointsUsed} نقطة ولاء (خصم ${loyaltyDiscount.toLocaleString()} د.ع)`,
        metadata: { discount: loyaltyDiscount },
      });
    }

    if (cashbackUsed > 0) {
      await this.logTransaction(userId, {
        type: "redeem",
        pointsType: "cashback",
        amount: -cashbackUsed,
        balanceAfter: newCashbackBalance,
        orderId,
        description: `استبدال ${cashbackUsed} نقطة باقي (خصم ${cashbackDiscount.toLocaleString()} د.ع)`,
        metadata: { discount: cashbackDiscount },
      });
    }

    // إضافة نقاط الشراء
    if (purchasePoints > 0) {
      await this.logTransaction(userId, {
        type: "purchase_earn",
        pointsType: "loyalty",
        amount: purchasePoints,
        balanceAfter: newLoyaltyPoints,
        orderId,
        description: `كسبت ${purchasePoints} نقطة من شراء بقيمة ${rounding.roundedAmount.toLocaleString()} د.ع`,
        metadata: { orderTotal: rounding.roundedAmount, tier: currentTier, multiplier: MEMBERSHIP_TIERS[currentTier].pointMultiplier },
      });
    }

    // إضافة نقاط الباقي
    if (roundingPoints > 0) {
      await this.logTransaction(userId, {
        type: "rounding_earn",
        pointsType: "cashback",
        amount: roundingPoints,
        balanceAfter: newCashbackBalance,
        orderId,
        description: `باقي التقريب: ${roundingPoints} نقطة (${rounding.originalAmount.toLocaleString()} → ${rounding.roundedAmount.toLocaleString()} د.ع)`,
        metadata: { original: rounding.originalAmount, rounded: rounding.roundedAmount },
      });
    }

    // ترقية المستوى
    if (tierChanged) {
      const tierInfo = MEMBERSHIP_TIERS[newTier];
      await this.logTransaction(userId, {
        type: "tier_bonus",
        pointsType: "loyalty",
        amount: 0,
        balanceAfter: newLoyaltyPoints,
        orderId,
        description: `🎉 تمت ترقيتك إلى عضو ${tierInfo.name}! مبارك!`,
        metadata: { oldTier: currentTier, newTier, benefits: tierInfo.benefits },
      });
    }

    return {
      purchasePoints,
      roundingPoints,
      roundedTotal: rounding.roundedAmount,
      newTier,
      tierChanged,
    };
  }

  // ----------------------------------------
  // 4. حساب الخصم المسبق (قبل الدفع)
  // ----------------------------------------

  /**
   * حساب الخصم عند استخدام النقاط (يُعرض في صفحة الدفع)
   */
  async previewRedemption(
    userId: string,
    orderTotal: number,
    useLoyaltyPoints: boolean = true,
    useCashback: boolean = true,
  ): Promise<RedeemResult> {
    const db = this.ensureDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const availableLoyalty = user.loyaltyPoints ?? 0;
    const availableCashback = user.cashbackBalance ?? 0;

    let loyaltyPointsUsed = 0;
    let cashbackUsed = 0;
    let totalDiscount = 0;

    // حساب خصم نقاط الباقي أولاً (قيمتها أقل فلا تأكل من الأرباح)
    if (useCashback && availableCashback > 0) {
      const maxCashbackDiscount = availableCashback * CASHBACK_POINT_VALUE_IQD;
      const cashbackDiscount = Math.min(maxCashbackDiscount, orderTotal);
      cashbackUsed = Math.ceil(cashbackDiscount / CASHBACK_POINT_VALUE_IQD);
      totalDiscount += cashbackDiscount;
    }

    // ثم خصم نقاط الولاء
    const remainingAmount = orderTotal - totalDiscount;
    if (useLoyaltyPoints && availableLoyalty > 0 && remainingAmount > 0) {
      const maxLoyaltyDiscount = availableLoyalty * LOYALTY_POINT_VALUE_IQD;
      const loyaltyDiscount = Math.min(maxLoyaltyDiscount, remainingAmount);
      loyaltyPointsUsed = Math.ceil(loyaltyDiscount / LOYALTY_POINT_VALUE_IQD);
      totalDiscount += loyaltyDiscount;
    }

    // لا يمكن أن يصبح المبلغ سالباً
    const finalAmount = Math.max(0, orderTotal - totalDiscount);

    return {
      loyaltyPointsUsed,
      cashbackUsed,
      totalDiscount,
      finalAmount,
    };
  }

  // ----------------------------------------
  // 5. عرض الرصيد والإحصائيات
  // ----------------------------------------

  /**
   * جلب رصيد النقاط الكامل مع معلومات المستوى
   */
  async getBalance(userId: string): Promise<LoyaltyBalance> {
    const db = this.ensureDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const loyaltyPoints = user.loyaltyPoints ?? 0;
    const cashbackBalance = user.cashbackBalance ?? 0;
    const totalSpent = user.totalSpent ?? 0;
    const tier = (user.loyaltyTier as TierName) || "bronze";
    const tierInfo = MEMBERSHIP_TIERS[tier];

    // حساب التقدم للمستوى التالي
    const tierOrder: TierName[] = ["bronze", "silver", "gold", "diamond"];
    const currentIndex = tierOrder.indexOf(tier);
    const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;

    let amountToNextTier: number | null = null;
    let progressPercent = 100;

    if (nextTier) {
      const nextTierInfo = MEMBERSHIP_TIERS[nextTier];
      amountToNextTier = nextTierInfo.minSpent - totalSpent;
      const rangeStart = tierInfo.minSpent;
      const rangeEnd = nextTierInfo.minSpent;
      const progress = totalSpent - rangeStart;
      const range = rangeEnd - rangeStart;
      progressPercent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
    }

    return {
      loyaltyPoints,
      loyaltyValueIQD: loyaltyPoints * LOYALTY_POINT_VALUE_IQD,
      cashbackBalance,
      cashbackValueIQD: cashbackBalance * CASHBACK_POINT_VALUE_IQD,
      totalValueIQD: (loyaltyPoints * LOYALTY_POINT_VALUE_IQD) + (cashbackBalance * CASHBACK_POINT_VALUE_IQD),
      tier,
      tierInfo,
      totalSpent,
      amountToNextTier: amountToNextTier && amountToNextTier > 0 ? amountToNextTier : null,
      progressPercent,
    };
  }

  /**
   * جلب سجل حركات النقاط
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<LoyaltyTransaction[]> {
    const db = this.ensureDb();

    return await db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.userId, userId))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(Math.min(limit, 50))
      .offset(offset);
  }

  // ----------------------------------------
  // 6. نقاط التقييم
  // ----------------------------------------

  /**
   * منح نقاط عند كتابة تقييم
   */
  async awardReviewPoints(userId: string, reviewId: string): Promise<number> {
    const db = this.ensureDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return 0;

    const newBalance = (user.loyaltyPoints ?? 0) + REVIEW_POINTS;

    await db
      .update(users)
      .set({
        loyaltyPoints: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await this.logTransaction(userId, {
      type: "review_earn",
      pointsType: "loyalty",
      amount: REVIEW_POINTS,
      balanceAfter: newBalance,
      description: `كسبت ${REVIEW_POINTS} نقاط لكتابة تقييم`,
      metadata: { reviewId },
    });

    return REVIEW_POINTS;
  }

  // ----------------------------------------
  // 7. نقاط الإحالة (أول شراء)
  // ----------------------------------------

  /**
   * منح نقاط إضافية للمُحيل عند أول شراء للصديق
   */
  async awardReferralPurchaseBonus(
    referrerUserId: string,
    orderId: string,
  ): Promise<number> {
    const db = this.ensureDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, referrerUserId))
      .limit(1);

    if (!user) return 0;

    const newBalance = (user.loyaltyPoints ?? 0) + REFERRAL_FIRST_PURCHASE_BONUS;

    await db
      .update(users)
      .set({
        loyaltyPoints: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(users.id, referrerUserId));

    await this.logTransaction(referrerUserId, {
      type: "referral_earn",
      pointsType: "loyalty",
      amount: REFERRAL_FIRST_PURCHASE_BONUS,
      balanceAfter: newBalance,
      orderId,
      description: `كسبت ${REFERRAL_FIRST_PURCHASE_BONUS} نقطة لأن صديقك المُحال اشترى أول طلب!`,
      metadata: { triggeredBy: "first_purchase" },
    });

    return REFERRAL_FIRST_PURCHASE_BONUS;
  }

  // ----------------------------------------
  // مساعد تسجيل الحركات
  // ----------------------------------------

  private async logTransaction(
    userId: string,
    data: Omit<typeof loyaltyTransactions.$inferInsert, "id" | "userId" | "createdAt">,
  ): Promise<void> {
    const db = this.ensureDb();

    try {
      await db.insert(loyaltyTransactions).values({
        userId,
        ...data,
      });
    } catch (error) {
      console.error("[Loyalty] Failed to log transaction:", error);
      // لا نرمي خطأ لأن تسجيل الحركة ثانوي
    }
  }
}

// Singleton instance
export const loyaltyStorage = new LoyaltyStorage();
