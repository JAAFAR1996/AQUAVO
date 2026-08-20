import { getDb } from "../db.js";
import { groqClient } from "./groq-client.js";
import {
  pushSubscriptions, users, products, predictedNeeds,
  churnPredictions, notificationLog, orders, orderItems,
} from "../../shared/schema.js";
import { eq, and, desc, gte, sql, count, isNull } from "drizzle-orm";
import webPush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:info@aquavoiq.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.error("[SmartNotifications] VAPID config error:", e);
  }
}

type NotificationType =
  | "replenishment"
  | "churn_prevention"
  | "welcome"
  | "cart_abandonment"
  | "new_product"
  | "seasonal_tip";

interface NotificationPayload {
  title: string;
  body: string;
  url: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
}

const PRIORITY: Record<NotificationType, number> = {
  churn_prevention: 100,
  cart_abandonment: 90,
  replenishment: 80,
  welcome: 70,
  new_product: 50,
  seasonal_tip: 30,
};

const FREQUENCY_CAPS = {
  maxPerDay: 1,
  maxPerWeek: 3,
  cooldownMinutes: 60,
};

export class SmartNotifications {
  async runAINotificationEngine(): Promise<{
    totalProcessed: number;
    pushSent: number;
    pushFailed: number;
    emailsSent: number;
    skippedFrequencyCap: number;
    byType: Record<string, number>;
  }> {
    console.log("[AI-Notifications] Starting AI Notification Engine...");

    const results = {
      totalProcessed: 0,
      pushSent: 0,
      pushFailed: 0,
      emailsSent: 0,
      skippedFrequencyCap: 0,
      byType: {} as Record<string, number>,
    };

    try {
      const db = getDb();
      if (!db) return results;

      const candidates: Array<{
        userId: string;
        payload: NotificationPayload;
        priority: number;
      }> = [];

      candidates.push(...await this.gatherReplenishmentCandidates());
      candidates.push(...await this.gatherChurnCandidates());
      candidates.push(...await this.gatherWelcomeCandidates());
      candidates.push(...await this.gatherCartAbandonmentCandidates());
      candidates.push(...await this.gatherNewProductCandidates());
      candidates.push(...await this.gatherSeasonalTipCandidates());
      candidates.sort((a, b) => b.priority - a.priority);

      for (const candidate of candidates) {
        try {
          const canSend = await this.checkFrequencyCap(candidate.userId);
          if (!canSend) {
            results.skippedFrequencyCap++;
            continue;
          }

          const logId = await this.logNotification(candidate.userId, candidate.payload, "push");
          if (!logId) continue;

          const pushSent = await this.sendPushToUser(candidate.userId, candidate.payload, logId);
          if (pushSent) {
            results.pushSent++;

            // A replenishment prediction is consumed only after at least one push
            // endpoint accepted the message. A failed/no-subscription attempt must
            // remain eligible for a later delivery once the user opts in again.
            if (candidate.payload.type === "replenishment") {
              const productId = candidate.payload.metadata?.productId;
              if (typeof productId === "string" && productId) {
                await db.update(predictedNeeds)
                  .set({ notified: true })
                  .where(and(
                    eq(predictedNeeds.userId, candidate.userId),
                    eq(predictedNeeds.productId, productId),
                  ));
              }
            }
          } else {
            results.pushFailed++;
            await db.update(notificationLog)
              .set({ failedAt: new Date(), failReason: "Push sending failed or no subscription" })
              .where(eq(notificationLog.id, logId));
          }

          results.totalProcessed++;
          results.byType[candidate.payload.type] = (results.byType[candidate.payload.type] || 0) + 1;
        } catch (error) {
          console.error(`[AI-Notifications] Error processing ${candidate.payload.type} for ${candidate.userId}:`, error);
        }
      }

      console.log(
        `[AI-Notifications] Done: ${results.totalProcessed} processed, ${results.pushSent} sent, ${results.pushFailed} failed, ${results.skippedFrequencyCap} frequency-capped`,
      );
    } catch (error) {
      console.error("[AI-Notifications] Engine error:", error);
    }

    return results;
  }

  private async gatherReplenishmentCandidates(): Promise<Array<{
    userId: string;
    payload: NotificationPayload;
    priority: number;
  }>> {
    const candidates: Array<{ userId: string; payload: NotificationPayload; priority: number }> = [];

    try {
      const db = getDb();
      if (!db) return candidates;

      const predictions = await db
        .select({
          userId: predictedNeeds.userId,
          productId: predictedNeeds.productId,
          probability: predictedNeeds.probability,
          reason: predictedNeeds.reason,
          productName: products.name,
          productSlug: products.slug,
        })
        .from(predictedNeeds)
        .innerJoin(products, eq(predictedNeeds.productId, products.id))
        .where(and(
          eq(predictedNeeds.converted, false),
          eq(predictedNeeds.notified, false),
        ))
        .orderBy(desc(predictedNeeds.probability))
        .limit(50);

      const highProb = predictions.filter((p) => Number(p.probability) >= 60);
      const byUser = new Map<string, typeof highProb[0]>();
      for (const pred of highProb) {
        if (pred.userId && !byUser.has(pred.userId)) byUser.set(pred.userId, pred);
      }

      for (const [userId, pred] of byUser) {
        const content = await this.generateAIContent("replenishment", {
          productName: pred.productName,
          reason: pred.reason,
        });

        candidates.push({
          userId,
          payload: {
            title: content.title,
            body: content.body,
            url: `/products/${pred.productSlug || pred.productId}`,
            type: "replenishment",
            metadata: { productId: pred.productId, probability: Number(pred.probability), aiGenerated: true },
          },
          priority: PRIORITY.replenishment,
        });
      }
    } catch (error) {
      console.error("[AI-Notifications] Replenishment gather error:", error);
    }

    return candidates;
  }

  private async gatherChurnCandidates(): Promise<Array<{
    userId: string;
    payload: NotificationPayload;
    priority: number;
  }>> {
    const candidates: Array<{ userId: string; payload: NotificationPayload; priority: number }> = [];

    try {
      const db = getDb();
      if (!db) return candidates;

      const highRiskUsers = await db
        .select({
          userId: churnPredictions.userId,
          churnScore: churnPredictions.churnScore,
          riskLevel: churnPredictions.riskLevel,
          actionPlan: churnPredictions.actionPlan,
        })
        .from(churnPredictions)
        .where(sql`${churnPredictions.riskLevel} IN ('high', 'critical')`)
        .orderBy(desc(churnPredictions.churnScore))
        .limit(20);

      for (const user of highRiskUsers) {
        if (!user.userId) continue;

        const recentChurn = await db
          .select({ count: count() })
          .from(notificationLog)
          .where(and(
            eq(notificationLog.userId, user.userId),
            eq(notificationLog.type, "churn_prevention"),
            isNull(notificationLog.failedAt),
            gte(notificationLog.sentAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
          ));
        if (Number(recentChurn[0]?.count) > 0) continue;

        const content = await this.generateAIContent("churn_prevention", {
          churnScore: Number(user.churnScore),
          riskLevel: user.riskLevel,
          actionPlan: user.actionPlan,
        });

        candidates.push({
          userId: user.userId,
          payload: {
            title: content.title,
            body: content.body,
            url: "/products?recommended=1&source=notification",
            type: "churn_prevention",
            metadata: { churnScore: Number(user.churnScore), aiGenerated: true },
          },
          priority: PRIORITY.churn_prevention + (user.riskLevel === "critical" ? 10 : 0),
        });
      }
    } catch (error) {
      console.error("[AI-Notifications] Churn gather error:", error);
    }

    return candidates;
  }

  private async gatherWelcomeCandidates(): Promise<Array<{
    userId: string;
    payload: NotificationPayload;
    priority: number;
  }>> {
    const candidates: Array<{ userId: string; payload: NotificationPayload; priority: number }> = [];

    try {
      const db = getDb();
      if (!db) return candidates;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newUsers = await db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(gte(users.createdAt, oneDayAgo))
        .limit(50);

      for (const user of newUsers) {
        if (!user.id) continue;

        const alreadyWelcomed = await db
          .select({ count: count() })
          .from(notificationLog)
          .where(and(
            eq(notificationLog.userId, user.id),
            eq(notificationLog.type, "welcome"),
            isNull(notificationLog.failedAt),
          ));
        if (Number(alreadyWelcomed[0]?.count) > 0) continue;

        const name = user.fullName || "صديقنا الجديد";
        candidates.push({
          userId: user.id,
          payload: {
            title: "مرحباً بك في AQUAVO! 🐠",
            body: `أهلاً ${name}! اكتشف مجموعتنا من منتجات الأحواض والأسماك. تسوّق الآن واحصل على تجربة مميزة.`,
            url: "/products",
            type: "welcome",
            metadata: { aiGenerated: false },
          },
          priority: PRIORITY.welcome,
        });
      }
    } catch (error) {
      console.error("[AI-Notifications] Welcome gather error:", error);
    }

    return candidates;
  }

  private async gatherCartAbandonmentCandidates(): Promise<Array<{
    userId: string;
    payload: NotificationPayload;
    priority: number;
  }>> {
    const candidates: Array<{ userId: string; payload: NotificationPayload; priority: number }> = [];

    try {
      const db = getDb();
      if (!db) return candidates;
      const { productInteractions } = await import("../../shared/schema.js");
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const cartAdders = await db
        .select({ userId: productInteractions.userId, productId: productInteractions.productId })
        .from(productInteractions)
        .where(and(
          eq(productInteractions.interactionType, "cart_add"),
          gte(productInteractions.createdAt, oneDayAgo),
        ))
        .limit(50);

      const userCarts = new Map<string, string[]>();
      for (const item of cartAdders) {
        if (!item.userId) continue;
        const existing = userCarts.get(item.userId) || [];
        if (item.productId) existing.push(item.productId);
        userCarts.set(item.userId, existing);
      }

      for (const [userId, productIds] of userCarts) {
        const recentPurchase = await db
          .select({ count: count() })
          .from(productInteractions)
          .where(and(
            eq(productInteractions.userId, userId),
            eq(productInteractions.interactionType, "purchase"),
            gte(productInteractions.createdAt, oneDayAgo),
          ));
        if (Number(recentPurchase[0]?.count) > 0) continue;

        const alreadyNotified = await db
          .select({ count: count() })
          .from(notificationLog)
          .where(and(
            eq(notificationLog.userId, userId),
            eq(notificationLog.type, "cart_abandonment"),
            isNull(notificationLog.failedAt),
            gte(notificationLog.sentAt, oneDayAgo),
          ));
        if (Number(alreadyNotified[0]?.count) > 0) continue;

        const content = await this.generateAIContent("cart_abandonment", { itemCount: productIds.length });
        candidates.push({
          userId,
          payload: {
            title: content.title,
            body: content.body,
            url: "/cart",
            type: "cart_abandonment",
            metadata: { aiGenerated: true },
          },
          priority: PRIORITY.cart_abandonment,
        });
      }
    } catch (error) {
      console.error("[AI-Notifications] Cart abandonment gather error:", error);
    }

    return candidates;
  }

  private async gatherNewProductCandidates(): Promise<Array<{
    userId: string;
    payload: NotificationPayload;
    priority: number;
  }>> {
    const candidates: Array<{ userId: string; payload: NotificationPayload; priority: number }> = [];

    try {
      const db = getDb();
      if (!db) return candidates;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const newProducts = await db
        .select({ id: products.id, name: products.name, slug: products.slug, category: products.category })
        .from(products)
        .where(gte(products.createdAt, oneDayAgo))
        .limit(10);
      if (newProducts.length === 0) return candidates;

      for (const product of newProducts) {
        if (!product.category) continue;
        const interestedUsers = await db
          .selectDistinct({ userId: orders.userId })
          .from(orders)
          .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(eq(products.category, product.category))
          .limit(30);

        for (const user of interestedUsers) {
          if (!user.userId) continue;
          const alreadyNotified = await db
            .select({ count: count() })
            .from(notificationLog)
            .where(and(
              eq(notificationLog.userId, user.userId),
              eq(notificationLog.type, "new_product"),
              isNull(notificationLog.failedAt),
              gte(notificationLog.sentAt, oneDayAgo),
            ));
          if (Number(alreadyNotified[0]?.count) > 0) continue;

          candidates.push({
            userId: user.userId,
            payload: {
              title: "منتج جديد يناسبك! 🆕",
              body: `وصل "${product.name}" — شوفه الحين!`,
              url: `/products/${product.slug || product.id}`,
              type: "new_product",
              metadata: { productId: product.id, aiGenerated: false },
            },
            priority: PRIORITY.new_product,
          });
        }
      }
    } catch (error) {
      console.error("[AI-Notifications] New product gather error:", error);
    }

    return candidates;
  }

  private async gatherSeasonalTipCandidates(): Promise<Array<{
    userId: string;
    payload: NotificationPayload;
    priority: number;
  }>> {
    const candidates: Array<{ userId: string; payload: NotificationPayload; priority: number }> = [];

    try {
      const db = getDb();
      if (!db) return candidates;
      const today = new Date();
      if (today.getDay() !== 6) return candidates;

      const month = today.getMonth();
      const seasons: Record<number, string> = {
        0: "شتاء", 1: "شتاء", 2: "ربيع", 3: "ربيع", 4: "صيف", 5: "صيف",
        6: "صيف", 7: "صيف", 8: "خريف", 9: "خريف", 10: "شتاء", 11: "شتاء",
      };
      const season = seasons[month] || "صيف";
      const content = await this.generateAIContent("seasonal_tip", { season, month });

      const subscribedUsers = await db
        .selectDistinct({ userId: pushSubscriptions.userId })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.isActive, true))
        .limit(100);

      for (const sub of subscribedUsers) {
        if (!sub.userId) continue;
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const alreadySent = await db
          .select({ count: count() })
          .from(notificationLog)
          .where(and(
            eq(notificationLog.userId, sub.userId),
            eq(notificationLog.type, "seasonal_tip"),
            isNull(notificationLog.failedAt),
            gte(notificationLog.sentAt, oneWeekAgo),
          ));
        if (Number(alreadySent[0]?.count) > 0) continue;

        candidates.push({
          userId: sub.userId,
          payload: {
            ...content,
            url: "/blog",
            type: "seasonal_tip",
            metadata: { aiGenerated: true, variant: season },
          },
          priority: PRIORITY.seasonal_tip,
        });
      }
    } catch (error) {
      console.error("[AI-Notifications] Seasonal tip gather error:", error);
    }

    return candidates;
  }

  private async generateAIContent(
    type: NotificationType,
    context: Record<string, unknown>,
  ): Promise<{ title: string; body: string }> {
    const fallbacks: Record<NotificationType, { title: string; body: string }> = {
      replenishment: {
        title: "وقت التجديد لحوضك",
        body: `توقعنا إنك راح تحتاج "${context.productName || "مستلزماتك"}" قريباً. متوفرة هسه بالمتجر.`,
      },
      churn_prevention: {
        title: "افتقدنا وجودك ويانا",
        body: "مرت فترة على آخر زيارة إلك. جهزنالك عروض خاصة تناسب حوضك بمتجرنا.",
      },
      welcome: {
        title: "مرحباً بك في AQUAVO",
        body: "اكتشف عالم الأحواض والأسماك بمعايير احترافية. احنا هنا لمن تكون جاهز.",
      },
      cart_abandonment: {
        title: "منتجاتك بعدها موجودة",
        body: `عفنا ${context.itemCount || ""} منتجات تنتظرك بالسلة. تكدر تكمل طلبك بأي وقت.`,
      },
      new_product: {
        title: "وصلنا شي يناسب حوضك",
        body: "توفرت منتجات جديدة بمواصفات عالية. ادخل وشوف التفاصيل.",
      },
      seasonal_tip: {
        title: `نصيحة موسم ${context.season || "الصيف"}`,
        body: "شلون تحافظ على استقرار حوضك هذا الموسم؟ اقرأ نصيحة الخبراء.",
      },
    };

    if (groqClient.hasKeys()) {
      try {
        const prompts: Record<NotificationType, string> = {
          replenishment: `أنت خبير أحواض أسماك في متجر AQUAVO العراقي.
اكتب إشعار تذكير بشراء منتج سينفذ قريباً.
المنتج: ${context.productName}
السبب: ${context.reason || "وقت التجديد"}
القواعد: لهجة بغدادية، بدون إيموجي، نبرة هادئة. JSON فقط: {"title":"...","body":"..."}`,
          churn_prevention: `اكتب إشعار استعادة عميل غائب لمتجر AQUAVO باللهجة البغدادية، بدون إيموجي أو إلحاح. JSON فقط: {"title":"...","body":"..."}`,
          welcome: `اكتب إشعار ترحيب بعميل AQUAVO جديد باللهجة البغدادية وبنبرة دافئة، بدون إيموجي. JSON فقط: {"title":"...","body":"..."}`,
          cart_abandonment: `اكتب تذكير هادئ بالسلة المتروكة باللهجة البغدادية. عدد المنتجات: ${context.itemCount}. بدون إيموجي. JSON فقط: {"title":"...","body":"..."}`,
          new_product: `اكتب إشعار بوصول منتج جديد لمتجر AQUAVO باللهجة البغدادية، بدون إيموجي. JSON فقط: {"title":"...","body":"..."}`,
          seasonal_tip: `اكتب نصيحة موسمية قصيرة ومفيدة لحوض أسماك في العراق لفصل ${context.season}، باللهجة البغدادية وبدون إيموجي. JSON فقط: {"title":"...","body":"..."}`,
        };

        const response = await groqClient.chatText(
          [{ role: "user", content: prompts[type] }],
          { temperature: 0.4, maxTokens: 200, model: "llama-3.3-70b-versatile" },
        );
        if (response) {
          const jsonMatch = response.match(/\{[\s\S]*"title"[\s\S]*"body"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (typeof parsed.title === "string" && typeof parsed.body === "string") {
              return { title: parsed.title, body: parsed.body };
            }
          }
        }
      } catch (error) {
        console.error("[AI-Notifications] AI content generation failed, using fallback:", error);
      }
    }

    return fallbacks[type] || fallbacks.replenishment;
  }

  private async sendPushToUser(userId: string, payload: NotificationPayload, logId: string): Promise<boolean> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

    try {
      const db = getDb();
      if (!db) return false;
      const subscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.isActive, true),
        ));
      if (subscriptions.length === 0) return false;

      const pushPayload = JSON.stringify({
        id: logId,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
      });

      let sent = false;
      for (const sub of subscriptions) {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload,
          );
          sent = true;
        } catch (pushError: any) {
          if (pushError?.statusCode === 410 || pushError?.statusCode === 404) {
            await db.update(pushSubscriptions)
              .set({ isActive: false })
              .where(eq(pushSubscriptions.id, sub.id));
          }
        }
      }
      return sent;
    } catch {
      return false;
    }
  }

  private async checkFrequencyCap(userId: string): Promise<boolean> {
    try {
      const db = getDb();
      if (!db) return true;
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = await db
        .select({ count: count() })
        .from(notificationLog)
        .where(and(
          eq(notificationLog.userId, userId),
          isNull(notificationLog.failedAt),
          gte(notificationLog.sentAt, todayStart),
        ));
      if (Number(todayCount[0]?.count) >= FREQUENCY_CAPS.maxPerDay) return false;

      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekCount = await db
        .select({ count: count() })
        .from(notificationLog)
        .where(and(
          eq(notificationLog.userId, userId),
          isNull(notificationLog.failedAt),
          gte(notificationLog.sentAt, weekAgo),
        ));
      if (Number(weekCount[0]?.count) >= FREQUENCY_CAPS.maxPerWeek) return false;

      return true;
    } catch {
      return true;
    }
  }

  private async logNotification(userId: string, payload: NotificationPayload, channel: string): Promise<string | null> {
    try {
      const db = getDb();
      if (!db) return null;
      const result = await db.insert(notificationLog).values({
        userId,
        type: payload.type,
        channel,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        metadata: payload.metadata as any,
        sentAt: new Date(),
      }).returning({ id: notificationLog.id });
      return result[0]?.id || null;
    } catch (error) {
      console.error("[AI-Notifications] Log error:", error);
      return null;
    }
  }

  async sendReplenishmentReminders(): Promise<{
    emailsSent: number;
    pushSent: number;
    usersNotified: number;
  }> {
    const result = await this.runAINotificationEngine();
    return {
      emailsSent: result.emailsSent,
      pushSent: result.pushSent,
      usersNotified: result.pushSent,
    };
  }

  async getUserNotificationStatus(userId: string): Promise<{
    pendingReminders: number;
    lastNotified: Date | null;
  }> {
    try {
      const db = getDb();
      if (!db) return { pendingReminders: 0, lastNotified: null };

      const pending = await db
        .select()
        .from(predictedNeeds)
        .where(and(
          eq(predictedNeeds.userId, userId),
          eq(predictedNeeds.converted, false),
          eq(predictedNeeds.notified, false),
        ));
      const highProb = pending.filter((p) => Number(p.probability) >= 60);

      const lastNotif = await db
        .select({ sentAt: notificationLog.sentAt })
        .from(notificationLog)
        .where(and(
          eq(notificationLog.userId, userId),
          isNull(notificationLog.failedAt),
        ))
        .orderBy(desc(notificationLog.sentAt))
        .limit(1);

      return {
        pendingReminders: highProb.length,
        lastNotified: lastNotif[0]?.sentAt ?? null,
      };
    } catch {
      return { pendingReminders: 0, lastNotified: null };
    }
  }
}

export const smartNotifications = new SmartNotifications();
