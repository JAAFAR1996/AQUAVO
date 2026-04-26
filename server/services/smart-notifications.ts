import { getDb } from "../db.js";
import { predictiveAnalytics } from "./predictive-analytics.js";
import { churnDetector } from "./churn-detector.js";
import { groqClient } from "./groq-client.js";
import { sendEmail } from "../utils/email.js";
import {
  pushSubscriptions, users, products, predictedNeeds,
  churnPredictions, notificationLog, orders, orderItems,
} from "../../shared/schema.js";
import { eq, and, desc, gte, sql, count } from "drizzle-orm";
import webPush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:info@aquavoiq.com";
const BASE_URL = process.env.VITE_PUBLIC_BASE_URL || "https://www.aquavoiq.com";

// Configure web-push if keys are available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.error("[SmartNotifications] VAPID config error:", e);
  }
}

// Notification types
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

// Priority order (higher = more important, sent first)
const PRIORITY: Record<NotificationType, number> = {
  churn_prevention: 100,
  cart_abandonment: 90,
  replenishment: 80,
  welcome: 70,
  new_product: 50,
  seasonal_tip: 30,
};

// Frequency caps
const FREQUENCY_CAPS = {
  maxPerDay: 1,
  maxPerWeek: 3,
  cooldownMinutes: 60, // Min time between two notifications
};

/**
 * AI Notification Engine — محرك الإشعارات الذكي
 * يقود جميع الإشعارات بالذكاء الاصطناعي
 */
export class SmartNotifications {
  private db = getDb();

  // ==================== MAIN ENGINE ====================

  /**
   * Run the full AI notification engine
   * Called daily by cron job at 4:30 AM
   */
  async runAINotificationEngine(): Promise<{
    totalProcessed: number;
    pushSent: number;
    emailsSent: number;
    skippedFrequencyCap: number;
    byType: Record<string, number>;
  }> {
    console.log("[AI-Notifications] 🧠 Starting AI Notification Engine...");

    const results = {
      totalProcessed: 0,
      pushSent: 0,
      emailsSent: 0,
      skippedFrequencyCap: 0,
      byType: {} as Record<string, number>,
    };

    try {
      const db = getDb();
      if (!db) return results;

      // Gather all notification candidates from all AI systems
      const candidates: Array<{
        userId: string;
        payload: NotificationPayload;
        priority: number;
      }> = [];

      // 1. Replenishment reminders (from predictive analytics)
      const replenishment = await this.gatherReplenishmentCandidates();
      candidates.push(...replenishment);

      // 2. Churn prevention notifications
      const churn = await this.gatherChurnCandidates();
      candidates.push(...churn);

      // 3. Welcome notifications for new users
      const welcome = await this.gatherWelcomeCandidates();
      candidates.push(...welcome);

      // 4. Cart abandonment reminders
      const cart = await this.gatherCartAbandonmentCandidates();
      candidates.push(...cart);

      // 5. New product alerts
      const newProducts = await this.gatherNewProductCandidates();
      candidates.push(...newProducts);

      // 6. Seasonal tips (once a week)
      const seasonal = await this.gatherSeasonalTipCandidates();
      candidates.push(...seasonal);

      console.log(`[AI-Notifications] 📋 ${candidates.length} notification candidates gathered`);

      // Sort by priority (highest first)
      candidates.sort((a, b) => b.priority - a.priority);

      // Process each candidate with frequency capping
      for (const candidate of candidates) {
        try {
          // Check frequency cap
          const canSend = await this.checkFrequencyCap(candidate.userId);
          if (!canSend) {
            results.skippedFrequencyCap++;
            continue;
          }

          // Log the notification first so we get an ID
          const logId = await this.logNotification(candidate.userId, candidate.payload, "push");
          
          if (!logId) continue;

          // Send via push with the log ID
          const pushSent = await this.sendPushToUser(candidate.userId, candidate.payload, logId);
          if (pushSent) {
            results.pushSent++;
          } else {
            // Update log to failed if not sent
            const db = getDb();
            if (db) {
                await db.update(notificationLog)
                    .set({ failedAt: new Date(), failReason: "Push sending failed or no subscription" })
                    .where(eq(notificationLog.id, logId));
            }
          }

          results.totalProcessed++;
          results.byType[candidate.payload.type] = (results.byType[candidate.payload.type] || 0) + 1;
        } catch (error) {
          console.error(`[AI-Notifications] Error processing ${candidate.payload.type} for ${candidate.userId}:`, error);
        }
      }

      console.log(`[AI-Notifications] ✅ Done: ${results.totalProcessed} processed, ${results.pushSent} push, ${results.skippedFrequencyCap} skipped (freq cap)`);
      console.log(`[AI-Notifications] 📊 By type:`, results.byType);

    } catch (error) {
      console.error("[AI-Notifications] ❌ Engine error:", error);
    }

    return results;
  }

  // ==================== NOTIFICATION GATHERERS ====================

  /**
   * 1. Replenishment reminders — products predicted to run out
   */
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
        .where(
          and(
            eq(predictedNeeds.converted, false),
            eq(predictedNeeds.notified, false),
          )
        )
        .orderBy(desc(predictedNeeds.probability))
        .limit(50);

      const highProb = predictions.filter(p => Number(p.probability) >= 60);

      // Group by user, take top prediction per user
      const byUser = new Map<string, typeof highProb[0]>();
      for (const pred of highProb) {
        if (pred.userId && !byUser.has(pred.userId)) {
          byUser.set(pred.userId, pred);
        }
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

        // Mark as notified
        await db.update(predictedNeeds)
          .set({ notified: true })
          .where(and(
            eq(predictedNeeds.userId, userId),
            eq(predictedNeeds.productId, pred.productId),
          ));
      }
    } catch (error) {
      console.error("[AI-Notifications] Replenishment gather error:", error);
    }

    return candidates;
  }

  /**
   * 2. Churn prevention — users at risk of leaving
   */
  private async gatherChurnCandidates(): Promise<Array<{
    userId: string;
    payload: NotificationPayload;
    priority: number;
  }>> {
    const candidates: Array<{ userId: string; payload: NotificationPayload; priority: number }> = [];

    try {
      const db = getDb();
      if (!db) return candidates;

      // Get high/critical churn users
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

        // Check if we already sent a churn notification in the last 7 days
        const recentChurn = await db
          .select({ count: count() })
          .from(notificationLog)
          .where(and(
            eq(notificationLog.userId, user.userId),
            eq(notificationLog.type, "churn_prevention"),
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
            url: "/products",
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

  /**
   * 3. Welcome notifications — new users < 24h
   */
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

        // Check if already welcomed
        const alreadyWelcomed = await db
          .select({ count: count() })
          .from(notificationLog)
          .where(and(
            eq(notificationLog.userId, user.id),
            eq(notificationLog.type, "welcome"),
          ));

        if (Number(alreadyWelcomed[0]?.count) > 0) continue;

        const name = user.fullName || "صديقنا الجديد";

        candidates.push({
          userId: user.id,
          payload: {
            title: `مرحباً بك في AQUAVO! 🐠`,
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

  /**
   * 4. Cart abandonment — items in cart for > 2 hours
   */
  private async gatherCartAbandonmentCandidates(): Promise<Array<{
    userId: string;
    payload: NotificationPayload;
    priority: number;
  }>> {
    const candidates: Array<{ userId: string; payload: NotificationPayload; priority: number }> = [];

    try {
      const db = getDb();
      if (!db) return candidates;

      // Cart data is stored in session/localStorage on client, so check from product interactions
      // Users who added to cart but didn't purchase in last 24h
      const { productInteractions } = await import("../../shared/schema.js");

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      // Find users who added to cart > 2h ago but didn't purchase
      const cartAdders = await db
        .select({
          userId: productInteractions.userId,
          productId: productInteractions.productId,
        })
        .from(productInteractions)
        .where(and(
          eq(productInteractions.interactionType, "cart_add"),
          gte(productInteractions.createdAt, oneDayAgo),
        ))
        .limit(50);

      // Group by user
      const userCarts = new Map<string, string[]>();
      for (const item of cartAdders) {
        if (!item.userId) continue;
        const existing = userCarts.get(item.userId) || [];
        if (item.productId) existing.push(item.productId);
        userCarts.set(item.userId, existing);
      }

      for (const [userId, productIds] of userCarts) {
        // Check if user purchased recently
        const recentPurchase = await db
          .select({ count: count() })
          .from(productInteractions)
          .where(and(
            eq(productInteractions.userId, userId),
            eq(productInteractions.interactionType, "purchase"),
            gte(productInteractions.createdAt, oneDayAgo),
          ));

        if (Number(recentPurchase[0]?.count) > 0) continue;

        // Check if already notified about cart today
        const alreadyNotified = await db
          .select({ count: count() })
          .from(notificationLog)
          .where(and(
            eq(notificationLog.userId, userId),
            eq(notificationLog.type, "cart_abandonment"),
            gte(notificationLog.sentAt, oneDayAgo),
          ));

        if (Number(alreadyNotified[0]?.count) > 0) continue;

        const content = await this.generateAIContent("cart_abandonment", {
          itemCount: productIds.length,
        });

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

  /**
   * 5. New product alerts — products added in last 24h matching user interests
   */
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

      // Get products added in last 24h
      const newProducts = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          category: products.category,
        })
        .from(products)
        .where(gte(products.createdAt, oneDayAgo))
        .limit(10);

      if (newProducts.length === 0) return candidates;

      // For each new product, find users who bought from same category
      for (const product of newProducts) {
        if (!product.category) continue;

        // Find users who purchased products in this category
        const interestedUsers = await db
          .selectDistinct({ userId: orders.userId })
          .from(orders)
          .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(eq(products.category, product.category))
          .limit(30);

        for (const user of interestedUsers) {
          if (!user.userId) continue;

          // Check if already notified today
          const alreadyNotified = await db
            .select({ count: count() })
            .from(notificationLog)
            .where(and(
              eq(notificationLog.userId, user.userId),
              eq(notificationLog.type, "new_product"),
              gte(notificationLog.sentAt, oneDayAgo),
            ));

          if (Number(alreadyNotified[0]?.count) > 0) continue;

          candidates.push({
            userId: user.userId,
            payload: {
              title: `منتج جديد يناسبك! 🆕`,
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

  /**
   * 6. Seasonal tips — AI-generated aquarium advice (weekly)
   */
  private async gatherSeasonalTipCandidates(): Promise<Array<{
    userId: string;
    payload: NotificationPayload;
    priority: number;
  }>> {
    const candidates: Array<{ userId: string; payload: NotificationPayload; priority: number }> = [];

    try {
      const db = getDb();
      if (!db) return candidates;

      // Only send on specific days (Saturday = weekend in Iraq)
      const today = new Date();
      if (today.getDay() !== 6) return candidates; // Saturday only

      // Get month context for seasonal tips
      const month = today.getMonth(); // 0-11
      const seasons: Record<number, string> = {
        0: "شتاء", 1: "شتاء", 2: "ربيع",
        3: "ربيع", 4: "صيف", 5: "صيف",
        6: "صيف", 7: "صيف", 8: "خريف",
        9: "خريف", 10: "شتاء", 11: "شتاء",
      };
      const season = seasons[month] || "صيف";

      const content = await this.generateAIContent("seasonal_tip", { season, month });

      // Get subscribed users
      const subscribedUsers = await db
        .selectDistinct({ userId: pushSubscriptions.userId })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.isActive, true))
        .limit(100);

      for (const sub of subscribedUsers) {
        if (!sub.userId) continue;

        // Check if already received seasonal tip this week
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const alreadySent = await db
          .select({ count: count() })
          .from(notificationLog)
          .where(and(
            eq(notificationLog.userId, sub.userId),
            eq(notificationLog.type, "seasonal_tip"),
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

  // ==================== AI CONTENT GENERATION ====================

  /**
   * Generate notification content using Groq AI
   */
  private async generateAIContent(
    type: NotificationType,
    context: Record<string, unknown>,
  ): Promise<{ title: string; body: string }> {
    // Fallback content (always have a backup)
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

    // Try AI generation via Groq
    if (groqClient.hasKeys()) {
      try {
        const prompts: Record<NotificationType, string> = {
          replenishment: `أنت خبير أحواض أسماك في متجر AQUAVO العراقي.
اكتب إشعار تذكير بشراء منتج سينفذ قريباً.
المنتج: ${context.productName}
السبب: ${context.reason || "وقت التجديد"}

القواعد الصارمة:
1. لهجة بغدادية خالصة (مثال: هسه، تكدر، حوضك، الغراض).
2. ممنوع استخدام أي إيموجي (صفر إيموجي).
3. نبرة خبير واثق وهادئ، لا تبدو بائعاً يائساً.
4. لا تستخدم الفصحى الثقيلة.

اكتب JSON فقط: {"title": "عنوان قصير بدون إيموجي يجذب الانتباه", "body": "نص قصير وواضح بالعامية العراقية"}`,

          churn_prevention: `أنت خبير أحواض أسماك في متجر AQUAVO العراقي.
اكتب إشعار لاستعادة عميل غائب منذ فترة عن المتجر.
مستوى غياب العميل: ${context.riskLevel}

القواعد الصارمة:
1. لهجة بغدادية خالصة وراقية (افتقدناك، مكانك خالي، جهزنالك شي).
2. ممنوع استخدام أي إيموجي قطعاً.
3. نبرة هادئة وواثقة، تجنب مصطلحات مثل (خطر، إنذار، اشتري فوراً).
4. قدم له عرضاً أو رحب بعودته بأسلوب محترم.

اكتب JSON فقط: {"title": "عنوان هادئ بدون إيموجي", "body": "رسالة ترحيب جذابة بالعامية العراقية وبدون إلحاح"}`,

          welcome: `أنت خبير أحواض أسماك في متجر AQUAVO العراقي.
اكتب إشعار ترحيب بعميل جديد سجل في الموقع للتو.

القواعد الصارمة:
1. لهجة بغدادية خالصة.
2. ممنوع استخدام أي إيموجي قطعاً.
3. نبرة احترافية ترحب بإنضمامه لعالم AQUAVO.

اكتب JSON فقط: {"title": "عنوان ترحيبي عراقي بدون إيموجي", "body": "نص ترحيبي دافئ ومحترف"}`,

          cart_abandonment: `أنت خبير أحواض أسماك في متجر AQUAVO العراقي.
اكتب إشعار تذكير بوجود منتجات متروكة في سلة المشتريات.
عدد المنتجات: ${context.itemCount}

القواعد الصارمة:
1. لهجة بغدادية خالصة.
2. ممنوع استخدام أي إيموجي قطعاً.
3. نبرة تذكير لطيفة بدون ضغط أو إلحاح.

اكتب JSON فقط: {"title": "عنوان تذكيري بدون إيموجي", "body": "نص بالعامية العراقية يذكره بالسلة بهدوء"}`,

          new_product: `أنت خبير أحواض أسماك في متجر AQUAVO العراقي.
اكتب إشعار بوصول منتج جديد يناسب اهتمام العميل.

القواعد الصارمة:
1. لهجة بغدادية خالصة.
2. ممنوع استخدام أي إيموجي قطعاً.
3. نبرة مبشرة وتدل على التطور والجودة.

اكتب JSON فقط: {"title": "عنوان مشوق بدون إيموجي", "body": "نص يشجع على اكتشاف المنتج الجديد بالعامية العراقية"}`,

          seasonal_tip: `أنت خبير أحواض أسماك في متجر AQUAVO العراقي.
اكتب إشعار كنصيحة موسمية لحوض الأسماك لفصل ${context.season}.
الشهر: ${context.month}

القواعد الصارمة:
1. لهجة بغدادية خالصة.
2. ممنوع استخدام أي إيموجي قطعاً.
3. النصيحة يجب أن تكون عملية ومفيدة لأصحاب الأحواض في العراق.

اكتب JSON فقط: {"title": "عنوان للنصيحة بدون إيموجي", "body": "نصيحة سريعة ومهمة بالعامية العراقية لحوضه"}`,
        };

        const prompt = prompts[type];
        if (prompt) {
          const response = await groqClient.chatText(
            [{ role: "user", content: prompt }],
            { temperature: 0.7, maxTokens: 200, model: "llama-3.1-8b-instant" }
          );

          if (response) {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*"title"[\s\S]*"body"[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.title && parsed.body) {
                return { title: parsed.title, body: parsed.body };
              }
            }
          }
        }
      } catch (error) {
        console.error("[AI-Notifications] AI content generation failed, using fallback:", error);
      }
    }

    return fallbacks[type] || fallbacks.replenishment;
  }

  // ==================== DELIVERY ====================

  /**
   * Send push notification to a specific user
   */
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
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload,
          );
          sent = true;
        } catch (pushError: any) {
          // Remove invalid subscriptions (410 Gone)
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

  // ==================== FREQUENCY CAPPING ====================

  /**
   * Check if we can send a notification to this user (frequency caps)
   */
  private async checkFrequencyCap(userId: string): Promise<boolean> {
    try {
      const db = getDb();
      if (!db) return true;

      const now = new Date();

      // Check daily cap
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = await db
        .select({ count: count() })
        .from(notificationLog)
        .where(and(
          eq(notificationLog.userId, userId),
          gte(notificationLog.sentAt, todayStart),
        ));

      if (Number(todayCount[0]?.count) >= FREQUENCY_CAPS.maxPerDay) return false;

      // Check weekly cap
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekCount = await db
        .select({ count: count() })
        .from(notificationLog)
        .where(and(
          eq(notificationLog.userId, userId),
          gte(notificationLog.sentAt, weekAgo),
        ));

      if (Number(weekCount[0]?.count) >= FREQUENCY_CAPS.maxPerWeek) return false;

      return true;
    } catch {
      return true; // On error, allow sending
    }
  }

  // ==================== LOGGING ====================

  /**
   * Log a sent notification
   */
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

  // ==================== LEGACY COMPATIBILITY ====================

  /**
   * Legacy method — still used by old cron job / routes
   */
  async sendReplenishmentReminders(): Promise<{
    emailsSent: number;
    pushSent: number;
    usersNotified: number;
  }> {
    // Delegate to the full engine now
    const result = await this.runAINotificationEngine();
    return {
      emailsSent: result.emailsSent,
      pushSent: result.pushSent,
      usersNotified: result.totalProcessed,
    };
  }

  /**
   * Get notification history/status for a user
   */
  async getUserNotificationStatus(userId: string): Promise<{
    pendingReminders: number;
    lastNotified: Date | null;
  }> {
    try {
      const db = getDb();
      if (!db) return { pendingReminders: 0, lastNotified: null };

      // Count un-notified high-probability predictions
      const pending = await db
        .select()
        .from(predictedNeeds)
        .where(
          and(
            eq(predictedNeeds.userId, userId),
            eq(predictedNeeds.converted, false),
            eq(predictedNeeds.notified, false)
          )
        );

      const highProb = pending.filter(p => Number(p.probability) >= 60);

      // Last notification
      const lastNotif = await db
        .select({ sentAt: notificationLog.sentAt })
        .from(notificationLog)
        .where(eq(notificationLog.userId, userId))
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
