import { getDb } from "../db.js";
import { predictiveAnalytics } from "./predictive-analytics.js";
import { sendEmail } from "../utils/email.js";
import { pushSubscriptions, users, products, predictedNeeds } from "../../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import webPush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

/**
 * Smart Notifications Service
 * Sends proactive notifications based on AI predictions
 */
export class SmartNotifications {
    private db = getDb();

    /**
     * Check and send replenishment reminders for all users
     * Should run daily via cron or admin trigger
     */
    async sendReplenishmentReminders(): Promise<{
        emailsSent: number;
        pushSent: number;
        usersNotified: number;
    }> {
        console.log("[SmartNotifications] Starting replenishment check...");

        let emailsSent = 0;
        let pushSent = 0;
        let usersNotified = 0;

        try {
            const db = getDb();
            if (!db) return { emailsSent, pushSent, usersNotified };

            // Get predictions with high probability that haven't been notified
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7); // Predictions due in next 7 days

            const predictions = await db
                .select({
                    predictionId: predictedNeeds.id,
                    userId: predictedNeeds.userId,
                    productId: predictedNeeds.productId,
                    probability: predictedNeeds.probability,
                    reason: predictedNeeds.reason,
                    predictedDate: predictedNeeds.predictedDate,
                })
                .from(predictedNeeds)
                .where(
                    and(
                        eq(predictedNeeds.converted, false),
                        eq(predictedNeeds.notified, false),
                    )
                )
                .orderBy(desc(predictedNeeds.probability));

            // Filter: only high probability (>= 60%) predictions
            const highProbPredictions = predictions.filter(
                p => Number(p.probability) >= 60
            );

            // Group by user
            const userPredictions = new Map<string, typeof highProbPredictions>();
            for (const pred of highProbPredictions) {
                if (!pred.userId) continue;
                const existing = userPredictions.get(pred.userId) || [];
                existing.push(pred);
                userPredictions.set(pred.userId, existing);
            }

            console.log(`[SmartNotifications] Found ${userPredictions.size} users with due predictions`);

            for (const [userId, preds] of userPredictions) {
                try {
                    // Get user info
                    const user = await db
                        .select()
                        .from(users)
                        .where(eq(users.id, userId))
                        .limit(1);

                    if (!user[0]) continue;

                    // Get product details for top 3 predictions
                    const topPreds = preds.slice(0, 3);
                    const productDetails = await Promise.all(
                        topPreds.map(async (pred) => {
                            const product = await db
                                .select()
                                .from(products)
                                .where(eq(products.id, pred.productId))
                                .limit(1);
                            return product[0] ? { ...pred, product: product[0] } : null;
                        })
                    );

                    const validPreds = productDetails.filter(Boolean) as Array<
                        (typeof topPreds)[0] & { product: typeof products.$inferSelect }
                    >;

                    if (validPreds.length === 0) continue;

                    // Send email notification
                    if (user[0].email) {
                        const sent = await this.sendReplenishmentEmail(
                            user[0].email,
                            user[0].fullName || "عزيزي العميل",
                            validPreds
                        );
                        if (sent) emailsSent++;
                    }

                    // Send push notification
                    const pushResult = await this.sendReplenishmentPush(
                        userId,
                        validPreds[0]
                    );
                    if (pushResult) pushSent++;

                    usersNotified++;

                    // Mark predictions as notified
                    for (const pred of topPreds) {
                        await db
                            .update(predictedNeeds)
                            .set({ notified: true })
                            .where(eq(predictedNeeds.id, pred.predictionId));
                    }
                } catch (error) {
                    console.error(`[SmartNotifications] Error notifying user ${userId}:`, error);
                }
            }

            console.log(`[SmartNotifications] Done: ${usersNotified} users, ${emailsSent} emails, ${pushSent} push`);
        } catch (error) {
            console.error("[SmartNotifications] Error:", error);
        }

        return { emailsSent, pushSent, usersNotified };
    }

    /**
     * Send replenishment email to a user
     */
    private async sendReplenishmentEmail(
        email: string,
        name: string,
        predictions: Array<{
            product: typeof products.$inferSelect;
            probability: string;
            reason: string | null;
        }>
    ): Promise<boolean> {
        const productListHtml = predictions
            .map(
                (p) => `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">
                        <strong style="color: #1a1a2e;">${p.product.name}</strong>
                        <br/>
                        <span style="color: #666; font-size: 13px;">${p.reason || "بناءً على نمط الشراء"}</span>
                    </td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                        <span style="color: #ccff00; font-weight: bold;">${Number(p.product.price).toLocaleString("en-US")} د.ع</span>
                    </td>
                </tr>`
            )
            .join("");

        const html = `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: #ccff00; margin: 0; font-size: 24px;">AQUAVO</h1>
                <p style="color: #ccc; margin: 8px 0 0;">تذكير ذكي</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #eee;">
                <h2 style="color: #1a1a2e; margin-top: 0;">مرحباً ${name} 👋</h2>
                <p style="color: #444; line-height: 1.8;">
                    بناءً على سجل مشترياتك، نعتقد أنك قد تحتاج هذه المنتجات قريباً:
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; text-align: right; color: #666;">المنتج</th>
                            <th style="padding: 10px; text-align: center; color: #666;">السعر</th>
                        </tr>
                    </thead>
                    <tbody>${productListHtml}</tbody>
                </table>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.VITE_PUBLIC_BASE_URL || 'https://aquavo.iq'}/products"
                       style="background: #ccff00; color: #1a1a2e; padding: 14px 40px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                        تسوق الآن
                    </a>
                </div>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: 0;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    هذا التذكير مبني على تحليل ذكي لسجل مشترياتك
                </p>
            </div>
        </div>`;

        return await sendEmail({
            to: email,
            subject: `🐠 ${name}، منتجاتك قد تنفذ قريباً!`,
            html,
        });
    }

    /**
     * Send push notification for replenishment
     */
    private async sendReplenishmentPush(
        userId: string,
        prediction: {
            product: typeof products.$inferSelect;
            reason: string | null;
        }
    ): Promise<boolean> {
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

        try {
            const db = getDb();
            if (!db) return false;

            const subscriptions = await db
                .select()
                .from(pushSubscriptions)
                .where(
                    and(
                        eq(pushSubscriptions.userId, userId),
                        eq(pushSubscriptions.isActive, true)
                    )
                );

            if (subscriptions.length === 0) return false;

            const payload = JSON.stringify({
                title: "تذكير ذكي من AQUAVO 🐠",
                body: `قد تحتاج "${prediction.product.name}" قريباً - ${prediction.reason || "بناءً على مشترياتك السابقة"}`,
                url: `/products/${prediction.product.slug}`,
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
                        payload
                    );
                    sent = true;
                } catch {
                    // Skip failed subscriptions
                }
            }
            return sent;
        } catch {
            return false;
        }
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

            // Last notified prediction
            const lastNotified = await db
                .select({ updatedAt: predictedNeeds.updatedAt })
                .from(predictedNeeds)
                .where(
                    and(
                        eq(predictedNeeds.userId, userId),
                        eq(predictedNeeds.notified, true)
                    )
                )
                .orderBy(desc(predictedNeeds.updatedAt))
                .limit(1);

            return {
                pendingReminders: highProb.length,
                lastNotified: lastNotified[0]?.updatedAt ?? null,
            };
        } catch {
            return { pendingReminders: 0, lastNotified: null };
        }
    }
}

export const smartNotifications = new SmartNotifications();
