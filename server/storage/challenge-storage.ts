/**
 * AQUAVO Monthly Challenges
 * ==========================
 * تحديات شهرية متجددة — 3 تحديات + ختم الشهر
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  users,
  challenges,
  userChallenges,
  loyaltyTransactions,
  type Challenge,
  type UserChallenge,
} from "../../shared/schema.js";

/** نقاط إكمال الـ 3 تحديات */
const MONTHLY_COMPLETION_BONUS = 50;

// ========================================
// تعريف التحديات الافتراضية
// ========================================

const DEFAULT_CHALLENGES: Array<{
  title: string;
  description: string;
  type: string;
  target: number;
  rewardPoints: number;
}> = [
  {
    title: "اكتب تقييمك الحقيقي لمنتج اشتريته",
    description: "قيّم أي منتج اشتريته — إيجابي أو سلبي",
    type: "review",
    target: 1,
    rewardPoints: 15,
  },
  {
    title: "ادعُ صديق للتسجيل",
    description: "شارك رابط الإحالة مع صديق يسجل بالموقع",
    type: "referral",
    target: 1,
    rewardPoints: 75,
  },
  {
    title: "اطلب من فئتين مختلفتين هالشهر",
    description: "اشترِ منتجات من فئتين مختلفتين على الأقل",
    type: "cross_category",
    target: 2,
    rewardPoints: 30,
  },
];

// ========================================
// Challenge Storage Class
// ========================================

export class ChallengeStorage {
  private ensureDb() {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    return db;
  }

  /**
   * توليد تحديات الشهر الحالي (يُستدعى يدوياً أو بـ cron)
   */
  async seedCurrentMonth(): Promise<Challenge[]> {
    const db = this.ensureDb();
    const month = new Date().toISOString().slice(0, 7); // '2026-05'

    // فحص: هل التحديات موجودة؟
    const existing = await db
      .select()
      .from(challenges)
      .where(eq(challenges.month, month));

    if (existing.length >= 3) return existing;

    const created: Challenge[] = [];
    for (const def of DEFAULT_CHALLENGES) {
      // فحص تكرار
      const exists = await db
        .select()
        .from(challenges)
        .where(sql`${challenges.month} = ${month} AND ${challenges.type} = ${def.type}`)
        .limit(1);

      if (exists.length === 0) {
        const [challenge] = await db.insert(challenges).values({
          month,
          ...def,
        }).returning();
        created.push(challenge);
      }
    }

    return created.length > 0 ? created : existing;
  }

  /**
   * جلب تحديات الشهر مع تقدم المستخدم
   */
  async getUserChallenges(userId: string): Promise<Array<Challenge & {
    progress: number;
    completed: boolean;
    pointsAwarded: boolean;
  }>> {
    const db = this.ensureDb();
    const month = new Date().toISOString().slice(0, 7);

    // تأكد من وجود تحديات الشهر
    await this.seedCurrentMonth();

    const monthChallenges = await db
      .select()
      .from(challenges)
      .where(eq(challenges.month, month));

    const userProgress = await db
      .select()
      .from(userChallenges)
      .where(eq(userChallenges.userId, userId));

    const progressMap = new Map<string, UserChallenge>();
    for (const uc of userProgress) {
      progressMap.set(uc.challengeId, uc);
    }

    return monthChallenges.map(ch => {
      const uc = progressMap.get(ch.id);
      return {
        ...ch,
        progress: uc?.progress ?? 0,
        completed: !!uc?.completedAt,
        pointsAwarded: uc?.pointsAwarded ?? false,
      };
    });
  }

  /**
   * تحديث تقدم تحدي معين
   */
  async updateProgress(
    userId: string,
    challengeType: string,
    increment: number = 1,
  ): Promise<{ completed: boolean; pointsAwarded: number } | null> {
    const db = this.ensureDb();
    const month = new Date().toISOString().slice(0, 7);

    // جلب التحدي
    const [challenge] = await db
      .select()
      .from(challenges)
      .where(sql`${challenges.month} = ${month} AND ${challenges.type} = ${challengeType}`)
      .limit(1);

    if (!challenge) return null;

    // جلب أو إنشاء تقدم المستخدم
    let [uc] = await db
      .select()
      .from(userChallenges)
      .where(sql`${userChallenges.userId} = ${userId} AND ${userChallenges.challengeId} = ${challenge.id}`)
      .limit(1);

    if (!uc) {
      [uc] = await db.insert(userChallenges).values({
        userId,
        challengeId: challenge.id,
        progress: 0,
      }).returning();
    }

    // لو مكتمل مسبقاً
    if (uc.completedAt) return { completed: true, pointsAwarded: 0 };

    const newProgress = Math.min((uc.progress ?? 0) + increment, challenge.target);
    const justCompleted = newProgress >= challenge.target;

    await db
      .update(userChallenges)
      .set({
        progress: newProgress,
        completedAt: justCompleted ? new Date() : undefined,
        pointsAwarded: justCompleted ? true : undefined,
      })
      .where(eq(userChallenges.id, uc.id));

    let pointsAwarded = 0;

    // منح نقاط التحدي
    if (justCompleted) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user) {
        const newBalance = (user.loyaltyPoints ?? 0) + challenge.rewardPoints;
        await db
          .update(users)
          .set({ loyaltyPoints: newBalance, updatedAt: new Date() })
          .where(eq(users.id, userId));

        await db.insert(loyaltyTransactions).values({
          userId,
          type: "challenge_complete",
          pointsType: "loyalty",
          status: "approved",
          amount: challenge.rewardPoints,
          balanceAfter: newBalance,
          description: `أكملت تحدي: "${challenge.title}" — +${challenge.rewardPoints} نقطة`,
          metadata: { challengeId: challenge.id, challengeType: challenge.type },
        });

        pointsAwarded = challenge.rewardPoints;

        // فحص: هل أكمل كل تحديات الشهر؟
        await this.checkMonthlyCompletion(userId, month);
      }
    }

    return { completed: justCompleted, pointsAwarded };
  }

  /**
   * فحص إكمال جميع تحديات الشهر ومنح "ختم الشهر"
   */
  private async checkMonthlyCompletion(userId: string, month: string): Promise<void> {
    const db = this.ensureDb();

    const monthChallenges = await db
      .select()
      .from(challenges)
      .where(eq(challenges.month, month));

    const userProgress = await db
      .select()
      .from(userChallenges)
      .where(eq(userChallenges.userId, userId));

    const completedIds = new Set(
      userProgress.filter(uc => uc.completedAt).map(uc => uc.challengeId)
    );

    const allCompleted = monthChallenges.every(ch => completedIds.has(ch.id));
    if (!allCompleted) return;

    // فحص: هل حصل على البونص مسبقاً؟
    const existing = await db
      .select()
      .from(loyaltyTransactions)
      .where(sql`${loyaltyTransactions.userId} = ${userId} AND ${loyaltyTransactions.type} = 'monthly_completion' AND ${loyaltyTransactions.metadata}->>'month' = ${month}`)
      .limit(1);

    if (existing.length > 0) return;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return;

    const newBalance = (user.loyaltyPoints ?? 0) + MONTHLY_COMPLETION_BONUS;
    await db
      .update(users)
      .set({ loyaltyPoints: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await db.insert(loyaltyTransactions).values({
      userId,
      type: "monthly_completion",
      pointsType: "loyalty",
      status: "approved",
      amount: MONTHLY_COMPLETION_BONUS,
      balanceAfter: newBalance,
      description: `أكملت جميع تحديات الشهر — ختم الشهر +${MONTHLY_COMPLETION_BONUS} نقطة`,
      metadata: { month },
    });
  }
}

export const challengeStorage = new ChallengeStorage();
