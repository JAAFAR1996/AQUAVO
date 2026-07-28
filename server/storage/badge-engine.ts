/**
 * AQUAVO Badge Engine
 * ===================
 * محرك الشارات الاحترافية — يفحص ويمنح الشارات تلقائياً
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "../db.js";
// Canonical realized-status set, so this eligibility query cannot drift from accounting.
import { REALIZED_STATUS_SQL } from "../services/accounting-engine.js";
import {
  users,
  orders,
  badges,
  userBadges,
  loyaltyTransactions,
  type Badge,
} from "../../shared/schema.js";

// ========================================
// تعريف الشارات الافتراضية
// ========================================

export const DEFAULT_BADGES: Array<{
  slug: string;
  title: string;
  description: string;
  icon: string;
  pointsReward: number;
  criteria: { type: string; target: number };
  sortOrder: number;
}> = [
  {
    slug: "first_order",
    title: "أول طلب",
    description: "أكملت أول عملية شراء",
    icon: "ShoppingCart",
    pointsReward: 10,
    criteria: { type: "orders_count", target: 1 },
    sortOrder: 1,
  },
  {
    slug: "aquarium_expert",
    title: "صاحب حوض منظّم",
    description: "أكملت استبيان ملف الحوض",
    icon: "Fish",
    pointsReward: 15,
    criteria: { type: "quiz_completed", target: 1 },
    sortOrder: 2,
  },
  {
    slug: "maintenance_pro",
    title: "خبير الصيانة",
    description: "اشتريت 3 منتجات صيانة",
    icon: "Wrench",
    pointsReward: 30,
    criteria: { type: "maintenance_products", target: 3 },
    sortOrder: 3,
  },
  {
    slug: "trusted_customer",
    title: "عميل موثوق",
    description: "5 طلبات مؤكدة الاستلام",
    icon: "ShieldCheck",
    pointsReward: 40,
    criteria: { type: "orders_count", target: 5 },
    sortOrder: 4,
  },
  {
    slug: "aquavo_friend",
    title: "صديق AQUAVO",
    description: "أحلت 3 أصدقاء سجلوا بالموقع",
    icon: "Users",
    pointsReward: 50,
    criteria: { type: "referrals_count", target: 3 },
    sortOrder: 5,
  },
  {
    slug: "tier_silver",
    title: "المستوى الفضي",
    description: "وصلت للمستوى الفضي",
    icon: "Star",
    pointsReward: 25,
    criteria: { type: "tier_reached", target: 1 }, // silver = 1
    sortOrder: 6,
  },
  {
    slug: "tier_gold",
    title: "المستوى الذهبي",
    description: "وصلت للمستوى الذهبي",
    icon: "Crown",
    pointsReward: 50,
    criteria: { type: "tier_reached", target: 2 }, // gold = 2
    sortOrder: 7,
  },
  {
    slug: "tier_diamond",
    title: "المستوى الماسي",
    description: "وصلت للمستوى الماسي",
    icon: "Crown",
    pointsReward: 100,
    criteria: { type: "tier_reached", target: 3 }, // diamond = 3
    sortOrder: 8,
  },
];

const TIER_INDEX: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
};

// ========================================
// Badge Engine Class
// ========================================

export class BadgeEngine {
  private ensureDb() {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    return db;
  }

  /**
   * تهيئة الشارات الافتراضية (يُستدعى مرة عند بدء التشغيل)
   */
  async seedBadges(): Promise<void> {
    const db = this.ensureDb();

    for (const badge of DEFAULT_BADGES) {
      const existing = await db
        .select()
        .from(badges)
        .where(eq(badges.slug, badge.slug))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(badges).values(badge);
      }
    }
  }

  /**
   * فحص ومنح جميع الشارات المستحقة لمستخدم
   */
  async checkAndAwardBadges(userId: string): Promise<Badge[]> {
    const db = this.ensureDb();
    const awarded: Badge[] = [];

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return [];

    // رصيد متغير — يتحدث مع كل شارة جديدة
    let runningBalance = user.loyaltyPoints ?? 0;

    // جلب كل الشارات
    const allBadges = await db.select().from(badges);

    // جلب شارات المستخدم الحالية
    const userBadgesList = await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    const earnedSlugs = new Set<string>();
    for (const ub of userBadgesList) {
      const badge = allBadges.find(b => b.id === ub.badgeId);
      if (badge) earnedSlugs.add(badge.slug);
    }

    // عدد الطلبات المسلّمة
    const deliveredOrders = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      // Eligibility means the customer actually RECEIVED an order. Bound to the
      // canonical realized-status set so a literal here cannot drift from accounting.
      .where(sql`${orders.userId} = ${userId} AND ${orders.status} IN ${REALIZED_STATUS_SQL}`);
    const ordersCount = Number(deliveredOrders[0]?.count ?? 0);

    // عدد الإحالات
    const referralTx = await db
      .select({ count: sql<number>`count(*)` })
      .from(loyaltyTransactions)
      .where(sql`${loyaltyTransactions.userId} = ${userId} AND ${loyaltyTransactions.type} = 'referral_earn'`);
    const referralsCount = Number(referralTx[0]?.count ?? 0);

    // المستوى الحالي
    const currentTier = (user.loyaltyTier as string) || "bronze";
    const tierIndex = TIER_INDEX[currentTier] ?? 0;

    // ملف الحوض
    const quizCompleted = !!user.aquariumProfile;

    for (const badge of allBadges) {
      if (earnedSlugs.has(badge.slug)) continue;

      const criteria = badge.criteria as { type: string; target: number };
      let earned = false;

      switch (criteria.type) {
        case "orders_count":
          earned = ordersCount >= criteria.target;
          break;
        case "quiz_completed":
          earned = quizCompleted;
          break;
        case "referrals_count":
          earned = referralsCount >= criteria.target;
          break;
        case "tier_reached":
          earned = tierIndex >= criteria.target;
          break;
        case "maintenance_products":
          // simplified: count delivered orders as proxy
          earned = ordersCount >= criteria.target;
          break;
      }

      if (earned) {
        // منح الشارة
        await db.insert(userBadges).values({
          userId,
          badgeId: badge.id,
        });

        // منح النقاط
        if (badge.pointsReward && badge.pointsReward > 0) {
          runningBalance += badge.pointsReward;
          await db
            .update(users)
            .set({ loyaltyPoints: runningBalance, updatedAt: new Date() })
            .where(eq(users.id, userId));

          await db.insert(loyaltyTransactions).values({
            userId,
            type: "badge_earn",
            pointsType: "loyalty",
            status: "approved",
            amount: badge.pointsReward,
            balanceAfter: runningBalance,
            description: `حصلت على شارة "${badge.title}" — +${badge.pointsReward} نقطة`,
            metadata: { badgeSlug: badge.slug },
          });
        }

        awarded.push(badge);
      }
    }

    return awarded;
  }

  /**
   * جلب شارات المستخدم مع حالة كل شارة
   */
  async getUserBadges(userId: string): Promise<Array<Badge & { earned: boolean; earnedAt: Date | null }>> {
    const db = this.ensureDb();

    const allBadges = await db.select().from(badges).orderBy(badges.sortOrder);
    const userBadgesList = await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId));

    const earnedMap = new Map<string, Date>();
    for (const ub of userBadgesList) {
      earnedMap.set(ub.badgeId, ub.earnedAt);
    }

    return allBadges.map(badge => ({
      ...badge,
      earned: earnedMap.has(badge.id),
      earnedAt: earnedMap.get(badge.id) ?? null,
    }));
  }
}

export const badgeEngine = new BadgeEngine();
