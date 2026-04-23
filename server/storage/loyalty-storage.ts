/**
 * AQUAVO Loyalty Points & Membership System
 * ==========================================
 * نظام نقاط الولاء والعضويات لمتجر أكوافو
 * 
 * المكونات:
 * 1. تقريب الأسعار للسوق العراقي (أقرب 250 دينار - دائماً لأعلى)
 * 2. نقاط الولاء (1 نقطة لكل 5,000 دينار) - للعضوية فقط، لا تُستبدل بفلوس أبداً، أبدية
 * 3. مستويات العضوية (برونزي/فضي/ذهبي/ماسي) - تعتمد على نقاط الولاء
 * 4. نقاط الباقي (cashback) - تُستبدل كخصم مالي، لها صلاحية
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

/**
 * ⚠️ نقاط الولاء لا تُستبدل بفلوس أبداً!
 * تُستخدم فقط لترقية مستوى العضوية. أبدية ولا تنتهي.
 */
const LOYALTY_POINT_VALUE_IQD = 0; // لا قيمة مالية - للعضوية فقط

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
  /** نقاط الولاء المستخدمة - دائماً 0 لأنها لا تُصرف */
  loyaltyPointsUsed: number;
  /** نقاط الباقي المستخدمة */
  cashbackUsed: number;
  /** إجمالي الخصم بالدينار (من الباقي فقط) */
  totalDiscount: number;
  /** المبلغ النهائي بعد الخصم */
  finalAmount: number;
}

export interface LoyaltyBalance {
  /** نقاط الولاء الفعالة */
  loyaltyPoints: number;
  /** نقاط الولاء المجمدة */
  pendingLoyaltyPoints: number;
  /** قيمتها بالدينار */
  loyaltyValueIQD: number;
  /** نقاط الباقي الفعالة */
  cashbackBalance: number;
  /** نقاط الباقي المجمدة */
  pendingCashbackBalance: number;
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
   * حساب أقصى خصم ممكن (من رصيد الباقي فقط - نقاط الولاء لا تُصرف)
   */
  calculateMaxRedemption(
    _loyaltyPoints: number,
    cashbackBalance: number,
  ): number {
    // نقاط الولاء لا تُصرف أبداً - فقط الباقي
    return cashbackBalance * CASHBACK_POINT_VALUE_IQD;
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
    const currentPendingLoyalty = user.pendingLoyaltyPoints ?? 0;
    const currentCashback = user.cashbackBalance ?? 0;
    const currentPendingCashback = user.pendingCashbackBalance ?? 0;
    const currentTotalSpent = user.totalSpent ?? 0;
    const currentTier = (user.loyaltyTier as TierName) || "bronze";

    // 2. ⚠️ نقاط الولاء لا تُصرف أبداً - فقط الباقي (cashback) يُصرف
    const actualPointsUsed = 0; // دائماً صفر - نقاط الولاء للعضوية فقط
    
    // 3. ✅ التحقق من رصيد الباقي (بدون حد - فلوسه وحر بيها)
    const safeCashbackUsed = Math.min(cashbackUsed, currentCashback);
    const cashbackDiscount = safeCashbackUsed * CASHBACK_POINT_VALUE_IQD;
    const actualCashbackUsed = safeCashbackUsed;
    const totalPointsDiscount = cashbackDiscount; // فقط الباقي
    const loyaltyDiscount = 0; // نقاط الولاء لا تُصرف

    // 4. المبلغ بعد خصم الباقي
    const amountAfterDiscount = Math.max(0, orderTotal - totalPointsDiscount);

    // 5. تقريب المبلغ (دائماً لأعلى - Math.ceil)
    const rounding = this.roundToIraqiDenomination(amountAfterDiscount);

    // 6. حساب نقاط الولاء الجديدة (للعضوية - لا تُصرف)
    const purchasePoints = this.calculatePurchasePoints(amountAfterDiscount, currentTier);
    const roundingPoints = rounding.remainder; // 1 نقطة cashback = 1 دينار

    // 7. تحديث الأرصدة - نقاط الولاء لا تنقص أبداً!
    const newLoyaltyPoints = currentLoyalty; // لا تتغير! أبدية
    const newPendingLoyalty = currentPendingLoyalty + purchasePoints;
    
    const newCashbackBalance = currentCashback - actualCashbackUsed;
    const newPendingCashback = currentPendingCashback + roundingPoints;

    // ملاحظة: لا نحدث totalSpent أو المستوى إلا بعد تأكيد الاستلام (Approve)

    // 8. تحديث المستخدم في قاعدة البيانات
    await db
      .update(users)
      .set({
        loyaltyPoints: newLoyaltyPoints, // لا تتغير
        pendingLoyaltyPoints: newPendingLoyalty,
        cashbackBalance: newCashbackBalance,
        pendingCashbackBalance: newPendingCashback,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // 9. تحديث الطلب بمعلومات النقاط
    await db
      .update(orders)
      .set({
        roundedTotal: String(rounding.roundedAmount),
        pointsUsed: 0, // نقاط الولاء لا تُصرف
        cashbackUsed: actualCashbackUsed,
        pointsDiscount: String(totalPointsDiscount),
        pointsEarned: purchasePoints,
        roundingCashback: roundingPoints,
      })
      .where(eq(orders.id, orderId));

    // 10. تسجيل حركات النقاط

    // خصم الباقي المستخدم فقط (نقاط الولاء لا تُخصم أبداً)
    if (actualCashbackUsed > 0) {
      await this.logTransaction(userId, {
        type: "redeem",
        pointsType: "cashback",
        amount: -actualCashbackUsed,
        balanceAfter: newCashbackBalance,
        orderId,
        description: `استبدال ${actualCashbackUsed} نقطة باقي (خصم ${cashbackDiscount.toLocaleString()} د.ع)`,
        metadata: { discount: cashbackDiscount },
      });
    }

    // إضافة نقاط الشراء (مجمدة - للعضوية)
    if (purchasePoints > 0) {
      await this.logTransaction(userId, {
        type: "purchase_earn",
        pointsType: "loyalty",
        status: "pending",
        amount: purchasePoints,
        balanceAfter: newPendingLoyalty, // سجلنا الرصيد المجمد هنا مؤقتاً
        orderId,
        description: `نقاط مجمدة: كسبت ${purchasePoints} نقطة ولاء (للعضوية) من شراء بقيمة ${rounding.roundedAmount.toLocaleString()} د.ع`,
        metadata: { orderTotal: rounding.roundedAmount, tier: currentTier, multiplier: MEMBERSHIP_TIERS[currentTier].pointMultiplier },
      });
    }

    // إضافة نقاط الباقي (مجمدة)
    if (roundingPoints > 0) {
      await this.logTransaction(userId, {
        type: "rounding_earn",
        pointsType: "cashback",
        status: "pending",
        amount: roundingPoints,
        balanceAfter: newPendingCashback,
        orderId,
        description: `باقي تقريب مجمد: ${roundingPoints} نقطة (${rounding.originalAmount.toLocaleString()} → ${rounding.roundedAmount.toLocaleString()} د.ع)`,
        metadata: { original: rounding.originalAmount, rounded: rounding.roundedAmount },
      });
    }

    return {
      purchasePoints,
      roundingPoints,
      roundedTotal: rounding.roundedAmount,
      newTier: currentTier, // لم يتغير بعد
      tierChanged: false,
    };
  }

  /**
   * تأكيد النقاط المجمدة وترقية المستوى (يستدعى عند تأكيد استلام الطلب)
   */
  async approveOrderPoints(userId: string, orderId: string, orderTotal: number): Promise<void> {
    const db = this.ensureDb();

    // 1. جلب المستخدم
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error("User not found");

    // 2. جلب الحركات المجمدة لهذا الطلب
    const pendingTx = await db.select()
      .from(loyaltyTransactions)
      .where(
        sql`${loyaltyTransactions.userId} = ${userId} AND ${loyaltyTransactions.orderId} = ${orderId} AND ${loyaltyTransactions.status} = 'pending'`
      );

    if (pendingTx.length === 0) return; // لا يوجد شيء لتوثيقه

    let totalLoyaltyEarned = 0;
    let totalCashbackEarned = 0;

    for (const tx of pendingTx) {
      if (tx.pointsType === "loyalty") totalLoyaltyEarned += tx.amount;
      if (tx.pointsType === "cashback") totalCashbackEarned += tx.amount;
      
      // تحديث حالة الحركة لتصبح معتمدة
      await db.update(loyaltyTransactions)
        .set({ status: "approved" })
        .where(eq(loyaltyTransactions.id, tx.id));
    }

    // 3. تحديث الأرصدة الفعلية والمجمدة
    const newLoyaltyPoints = (user.loyaltyPoints ?? 0) + totalLoyaltyEarned;
    const newPendingLoyalty = Math.max(0, (user.pendingLoyaltyPoints ?? 0) - totalLoyaltyEarned);
    
    const newCashbackBalance = (user.cashbackBalance ?? 0) + totalCashbackEarned;
    const newPendingCashback = Math.max(0, (user.pendingCashbackBalance ?? 0) - totalCashbackEarned);

    const newTotalSpent = (user.totalSpent ?? 0) + Math.round(orderTotal);
    const currentTier = (user.loyaltyTier as TierName) || "bronze";
    const newTier = this.calculateTier(newTotalSpent);
    const tierChanged = newTier !== currentTier;

    // 4. الحفظ في القاعدة
    await db.update(users)
      .set({
        loyaltyPoints: newLoyaltyPoints,
        pendingLoyaltyPoints: newPendingLoyalty,
        cashbackBalance: newCashbackBalance,
        pendingCashbackBalance: newPendingCashback,
        totalSpent: newTotalSpent,
        loyaltyTier: newTier,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // 5. تسجيل حركة الترقية إن حدثت
    if (tierChanged) {
      const tierInfo = MEMBERSHIP_TIERS[newTier];
      await this.logTransaction(userId, {
        type: "tier_bonus",
        pointsType: "loyalty",
        status: "approved",
        amount: 0,
        balanceAfter: newLoyaltyPoints,
        orderId,
        description: `🎉 تمت ترقيتك إلى عضو ${tierInfo.name}! مبارك!`,
        metadata: { oldTier: currentTier, newTier, benefits: tierInfo.benefits },
      });
    }
  }

  // ----------------------------------------
  // 4. حساب الخصم المسبق (قبل الدفع)
  // ----------------------------------------

  /**
   * حساب الخصم عند استخدام رصيد الباقي (يُعرض في صفحة الدفع)
   * ⚠️ نقاط الولاء لا تُصرف أبداً - فقط الباقي (cashback)
   */
  async previewRedemption(
    userId: string,
    orderTotal: number,
    _useLoyaltyPoints: boolean = false, // لا تُستخدم - نقاط الولاء لا تُصرف
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

    const availableCashback = user.cashbackBalance ?? 0;

    const loyaltyPointsUsed = 0; // نقاط الولاء لا تُصرف أبداً
    let cashbackUsed = 0;
    let totalDiscount = 0;

    // \u062d\u0633\u0627\u0628 \u062e\u0635\u0645 \u0631\u0635\u064a\u062f \u0627\u0644\u0628\u0627\u0642\u064a (\u0628\u062f\u0648\u0646 \u062d\u062f - \u0641\u0644\u0648\u0633\u0647 \u0648\u062d\u0631 \u0628\u064a\u0647\u0627)
    if (useCashback && availableCashback > 0) {
      const maxCashbackDiscount = availableCashback * CASHBACK_POINT_VALUE_IQD;
      const cashbackDiscount = Math.min(maxCashbackDiscount, orderTotal);
      cashbackUsed = Math.ceil(cashbackDiscount / CASHBACK_POINT_VALUE_IQD);
      totalDiscount += cashbackDiscount;
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
    const pendingLoyaltyPoints = user.pendingLoyaltyPoints ?? 0;
    const pendingCashbackBalance = user.pendingCashbackBalance ?? 0;
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
      pendingLoyaltyPoints,
      loyaltyValueIQD: 0, // نقاط الولاء لا تُصرف - للعضوية فقط
      cashbackBalance,
      pendingCashbackBalance,
      cashbackValueIQD: cashbackBalance * CASHBACK_POINT_VALUE_IQD,
      totalValueIQD: cashbackBalance * CASHBACK_POINT_VALUE_IQD, // فقط الباقي له قيمة مالية
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
      status: "approved",
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
      status: "approved",
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
