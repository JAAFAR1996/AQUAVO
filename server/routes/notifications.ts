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

// ==================== User In-App Notifications ====================

// Get notifications for logged-in user
router.get("/my-notifications", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sess = getSession(req);
        const userId = sess!.userId!;
        const db = getDb();
        if (!db) { res.json([]); return; }

        const { notificationLog } = await import("../../shared/schema.js");
        const { eq, desc } = await import("drizzle-orm");

        const notifications = await db
            .select({
                id: notificationLog.id,
                type: notificationLog.type,
                channel: notificationLog.channel,
                title: notificationLog.title,
                body: notificationLog.body,
                url: notificationLog.url,
                metadata: notificationLog.metadata,
                sentAt: notificationLog.sentAt,
                readAt: notificationLog.readAt,
            })
            .from(notificationLog)
            .where(eq(notificationLog.userId, userId))
            .orderBy(desc(notificationLog.sentAt))
            .limit(50);

        res.json(notifications);
    } catch (error) {
        next(error);
    }
});

// Mark notification(s) as read
router.post("/mark-read", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sess = getSession(req);
        const userId = sess!.userId!;
        const { ids } = req.body as { ids: string[] };
        const db = getDb();
        if (!db || !ids?.length) { res.json({ success: true }); return; }

        const { notificationLog } = await import("../../shared/schema.js");
        const { eq, and, inArray } = await import("drizzle-orm");

        await db
            .update(notificationLog)
            .set({ readAt: new Date() })
            .where(and(eq(notificationLog.userId, userId), inArray(notificationLog.id, ids)));

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Mark all notifications as read
router.post("/mark-all-read", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sess = getSession(req);
        const userId = sess!.userId!;
        const db = getDb();
        if (!db) { res.json({ success: true }); return; }

        const { notificationLog } = await import("../../shared/schema.js");
        const { eq, isNull, and } = await import("drizzle-orm");

        await db
            .update(notificationLog)
            .set({ readAt: new Date() })
            .where(and(eq(notificationLog.userId, userId), isNull(notificationLog.readAt)));

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// ==================== Admin: Notification Log ====================

// Track when a notification is clicked
router.post("/track-click/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        const notificationId = req.params.id;
        if (!db || !notificationId) { res.json({ success: true }); return; }

        const { notificationLog } = await import("../../shared/schema.js");
        const { eq, isNull, and } = await import("drizzle-orm");

        await db
            .update(notificationLog)
            .set({ clickedAt: new Date(), readAt: new Date() })
            .where(and(eq(notificationLog.id, notificationId), isNull(notificationLog.clickedAt)));

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Get all notification logs (admin only)
router.get("/admin-log", requireAdmin, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.json([]);
            return;
        }

        const { notificationLog, users } = await import("../../shared/schema.js");
        const { desc, sql } = await import("drizzle-orm");

        const logs = await db
            .select({
                id: notificationLog.id,
                userId: notificationLog.userId,
                userName: users.fullName,
                userEmail: users.email,
                type: notificationLog.type,
                channel: notificationLog.channel,
                title: notificationLog.title,
                body: notificationLog.body,
                url: notificationLog.url,
                metadata: notificationLog.metadata,
                sentAt: notificationLog.sentAt,
                clickedAt: notificationLog.clickedAt,
                failedAt: notificationLog.failedAt,
                failReason: notificationLog.failReason,
            })
            .from(notificationLog)
            .leftJoin(users, sql`${notificationLog.userId} = ${users.id}`)
            .orderBy(desc(notificationLog.sentAt))
            .limit(200);

        res.json(logs);
    } catch (error) {
        next(error);
    }
});

// Get notification stats (admin only)
router.get("/admin-stats", requireAdmin, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            res.json({ total: 0, byType: {}, byChannel: {} });
            return;
        }

        const { notificationLog } = await import("../../shared/schema.js");
        const { sql, count, gte } = await import("drizzle-orm");

        // Total count
        const totalResult = await db.select({ count: count() }).from(notificationLog);
        const total = Number(totalResult[0]?.count || 0);

        // Last 7 days count
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weekResult = await db
            .select({ count: count() })
            .from(notificationLog)
            .where(gte(notificationLog.sentAt, weekAgo));
        const lastWeek = Number(weekResult[0]?.count || 0);

        // By type
        const byTypeResult = await db
            .select({
                type: notificationLog.type,
                count: count(),
            })
            .from(notificationLog)
            .groupBy(notificationLog.type);

        const byType: Record<string, number> = {};
        for (const row of byTypeResult) {
            byType[row.type] = Number(row.count);
        }

        // Clicked count
        const clickedResult = await db
            .select({ count: count() })
            .from(notificationLog)
            .where(sql`${notificationLog.clickedAt} IS NOT NULL`);
        const clicked = Number(clickedResult[0]?.count || 0);

        res.json({
            total,
            lastWeek,
            clicked,
            clickRate: total > 0 ? Math.round((clicked / total) * 100) : 0,
            byType,
        });
    } catch (error) {
        next(error);
    }
});

export function createNotificationsRouter(): RouterType {
    return router;
}

export default router;
