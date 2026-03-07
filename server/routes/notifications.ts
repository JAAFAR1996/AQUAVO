import type { Router as RouterType, Request, Response, NextFunction } from "express";
import { Router } from "express";
import webPush from "web-push";
import { requireAuth, getSession, requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { pushSubscriptions } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { smartNotifications } from "../services/smart-notifications.js";

const router = Router();

// Configure web-push if VAPID keys are available
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:info@aquavoiq.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushSubscriptionBody {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

// Get VAPID public key (client needs this to subscribe)
router.get("/vapid-key", (_req: Request, res: Response): void => {
    if (!VAPID_PUBLIC_KEY) {
        res.status(500).json({ error: "VAPID keys not configured" });
        return;
    }
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post("/subscribe", requireAuth, async (req: Request<object, object, PushSubscriptionBody>, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.status(500).json({ message: "Database not connected" });
            return;
        }

        const sess = getSession(req);
        const subscription = req.body;

        if (!subscription.endpoint || !subscription.keys) {
            res.status(400).json({ message: "Invalid subscription data" });
            return;
        }

        // Check if subscription already exists
        const existing = await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
            .limit(1);

        if (existing.length > 0) {
            // Update existing subscription
            await db
                .update(pushSubscriptions)
                .set({
                    userId: sess?.userId,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    isActive: true,
                    updatedAt: new Date(),
                })
                .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        } else {
            // Insert new subscription
            await db.insert(pushSubscriptions).values({
                userId: sess?.userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userAgent: req.headers["user-agent"],
                isActive: true,
            });
        }

        res.json({ success: true, message: "تم تفعيل الإشعارات" });
    } catch (error) {
        console.error("Subscribe error:", error);
        next(error);
    }
});

// Unsubscribe from push notifications
router.post("/unsubscribe", async (req: Request<object, object, { endpoint: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.status(500).json({ message: "Database not connected" });
            return;
        }

        const { endpoint } = req.body;

        if (!endpoint) {
            res.status(400).json({ message: "Endpoint required" });
            return;
        }

        await db
            .update(pushSubscriptions)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(pushSubscriptions.endpoint, endpoint));

        res.json({ success: true, message: "تم إلغاء الإشعارات" });
    } catch (error) {
        console.error("Unsubscribe error:", error);
        next(error);
    }
});

// Send push notification to specific user (admin only)
router.post("/send", requireAdmin, async (req: Request<object, object, { userId?: string; title: string; body: string; url?: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.status(500).json({ message: "Database not connected" });
            return;
        }

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            res.status(503).json({ message: "Push notifications not configured" });
            return;
        }

        const { userId, title, body, url } = req.body;

        // Get subscriptions
        let query = db.select().from(pushSubscriptions).where(eq(pushSubscriptions.isActive, true));

        if (userId) {
            query = db.select().from(pushSubscriptions).where(
                and(eq(pushSubscriptions.isActive, true), eq(pushSubscriptions.userId, userId))
            );
        }

        const subscriptions = await query;

        const payload = JSON.stringify({
            title,
            body,
            url: url || "/",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/badge-72x72.png",
        });

        let successCount = 0;
        let failCount = 0;

        for (const sub of subscriptions) {
            try {
                await webPush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    },
                    payload
                );
                successCount++;
            } catch (error: unknown) {
                failCount++;
                // If subscription is expired/invalid, mark as inactive
                if (error && typeof error === 'object' && 'statusCode' in error) {
                    const statusCode = (error as { statusCode: number }).statusCode;
                    if (statusCode === 404 || statusCode === 410) {
                        await db
                            .update(pushSubscriptions)
                            .set({ isActive: false })
                            .where(eq(pushSubscriptions.endpoint, sub.endpoint));
                    }
                }
            }
        }

        res.json({
            success: true,
            message: `تم إرسال ${successCount} إشعار`,
            sent: successCount,
            failed: failCount,
        });
    } catch (error) {
        console.error("Send notification error:", error);
        next(error);
    }
});

// Send notification to all subscribers (admin only)
router.post("/broadcast", requireAdmin, async (req: Request<object, object, { title: string; body: string; url?: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.status(500).json({ message: "Database not connected" });
            return;
        }

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            res.status(503).json({ message: "Push notifications not configured" });
            return;
        }

        const { title, body, url } = req.body;

        const subscriptions = await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.isActive, true));

        const payload = JSON.stringify({
            title,
            body,
            url: url || "/",
            icon: "/icons/icon-192x192.png",
        });

        let successCount = 0;

        for (const sub of subscriptions) {
            try {
                await webPush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    payload
                );
                successCount++;
            } catch {
                // Ignore errors for broadcast
            }
        }

        res.json({
            success: true,
            message: `تم بث الإشعار لـ ${successCount} مستخدم`,
            sent: successCount,
        });
    } catch (error) {
        console.error("Broadcast error:", error);
        next(error);
    }
});

// AI Smart Reminders - trigger replenishment notifications (admin only)
router.post("/smart-reminders", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await smartNotifications.sendReplenishmentReminders();
        res.json({
            success: true,
            message: `تم إرسال ${result.emailsSent} إيميل و ${result.pushSent} إشعار لـ ${result.usersNotified} مستخدم`,
            ...result,
        });
    } catch (error) {
        console.error("Smart reminders error:", error);
        next(error);
    }
});

// Get notification status for current user
router.get("/my-status", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sess = getSession(req);
        const userId = sess!.userId!;
        const status = await smartNotifications.getUserNotificationStatus(userId);
        res.json(status);
    } catch (error) {
        next(error);
    }
});

export function createNotificationsRouter(): RouterType {
    return router;
}

export default router;
