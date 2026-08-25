import { eq, sql } from "drizzle-orm";
import { orders } from "../../shared/schema.js";
import { getDb } from "../db.js";
import { analyticsTracker } from "./analytics-tracker.js";
import { loyaltyNotifications } from "./loyalty-notifications.js";
import { ReferralStorage } from "../storage/referral-storage.js";
import { loyaltyStorage, type TransactionalOrderLoyaltyResult } from "../storage/loyalty-storage.js";
import { sendOrderNotification } from "./order-notifications.js";

const referralStorage = new ReferralStorage();
const OUTBOX_STALE_LOCK_MINUTES = 5;

function dbOrThrow() {
  const db = getDb();
  if (!db) throw new Error("Database not connected");
  return db;
}

function rowsFromExecute(result: unknown): any[] {
  if (Array.isArray(result)) return result;
  return (result as { rows?: any[] } | undefined)?.rows ?? [];
}

export async function enqueuePaidOrderOutbox(
  tx: any,
  input: {
    orderId: string;
    sessionId?: string;
    loyaltyResult: TransactionalOrderLoyaltyResult | null;
  },
): Promise<void> {
  const payload = JSON.stringify({
    sessionId: input.sessionId || null,
    loyaltyResult: input.loyaltyResult || null,
  });
  const eventTypes = ["analytics", "loyalty", "logistics", "merchant_notification"] as const;
  for (const eventType of eventTypes) {
    await tx.execute(sql`
      INSERT INTO payment_outbox(event_key, order_id, event_type, payload, status, next_attempt_at)
      VALUES (${`${input.orderId}:${eventType}`}, ${input.orderId}, ${eventType}, ${payload}::jsonb, 'pending', now())
      ON CONFLICT(event_key) DO NOTHING
    `);
  }
}

export async function releaseExpiredPaymentReservations(limit = 500): Promise<number> {
  const db = dbOrThrow();
  const safeLimit = Math.max(1, Math.min(2000, Math.trunc(limit)));
  const result = await db.execute(sql`
    WITH expired AS (
      SELECT id
      FROM payment_stock_reservations
      WHERE status='active' AND expires_at <= now()
      ORDER BY expires_at
      LIMIT ${safeLimit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE payment_stock_reservations r
       SET status='released', release_reason='expired', updated_at=now()
      FROM expired e
     WHERE r.id=e.id
    RETURNING r.id
  `);
  return rowsFromExecute(result).length;
}

type ClaimedOutbox = {
  id: string;
  orderId: string;
  eventType: "analytics" | "loyalty" | "logistics" | "merchant_notification";
  payload: Record<string, any> | null;
  attempts: number;
};

async function claimDueOutbox(limit: number, orderId?: string): Promise<ClaimedOutbox[]> {
  const db = dbOrThrow();
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      WITH candidates AS (
        SELECT id
          FROM payment_outbox
         WHERE (
           (status='pending' AND next_attempt_at <= now())
           OR (status='processing' AND locked_at < now() - (${OUTBOX_STALE_LOCK_MINUTES} * interval '1 minute'))
         )
         ${orderId ? sql`AND order_id=${orderId}` : sql``}
         ORDER BY created_at
         LIMIT ${safeLimit}
         FOR UPDATE SKIP LOCKED
      )
      UPDATE payment_outbox o
         SET status='processing',
             locked_at=now(),
             attempts=o.attempts+1,
             updated_at=now()
        FROM candidates c
       WHERE o.id=c.id
      RETURNING o.id,
                o.order_id AS "orderId",
                o.event_type AS "eventType",
                o.payload,
                o.attempts
    `);
    return rowsFromExecute(result) as ClaimedOutbox[];
  });
}

async function loadOrder(orderId: string): Promise<any> {
  const db = dbOrThrow();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error(`Outbox order ${orderId} not found`);
  return order;
}

async function deliverOutboxEvent(event: ClaimedOutbox): Promise<void> {
  const db = dbOrThrow();
  const order = await loadOrder(event.orderId);
  const lines = Array.isArray(order.items) ? order.items : [];
  const payload = event.payload || {};

  if (event.eventType === "analytics") {
    const sessionId = typeof payload.sessionId === "string" && payload.sessionId
      ? payload.sessionId
      : `payment:${order.id}`;
    if (typeof payload.sessionId === "string" && payload.sessionId) {
      await analyticsTracker.trackSessionStatus(payload.sessionId, "converted");
    }
    for (const line of lines) {
      await analyticsTracker.trackPurchase({
        userId: order.userId || undefined,
        sessionId,
        productId: line.productId,
        orderId: order.id,
        quantity: Number(line.quantity) || 0,
        price: Number.isFinite(Number(line.priceAtPurchase)) ? Number(line.priceAtPurchase) : 0,
      });
    }
    return;
  }

  if (event.eventType === "loyalty") {
    const loyaltyResult = payload.loyaltyResult as TransactionalOrderLoyaltyResult | null | undefined;
    if (order.userId && loyaltyResult) {
      await loyaltyNotifications.sendPostPurchaseNotifications(order.userId, order.id, loyaltyResult);
      const referralResult = await referralStorage.markFirstPurchase(order.userId, order.id);
      if (referralResult.referral) {
        await loyaltyStorage.awardReferralPurchaseBonus(referralResult.referral.referrerUserId, order.id);
      }
    }
    return;
  }

  if (event.eventType === "logistics") {
    await db.execute(sql`
      INSERT INTO event_bus (source_agent, target_agent, event_type, payload, status, priority, created_at)
      SELECT 'sales', 'logistics', 'new_order_received',
             ${JSON.stringify({ orderId: order.id, customerAddress: order.shippingAddress })}::jsonb,
             'pending', 1, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM event_bus
        WHERE event_type='new_order_received'
          AND payload->>'orderId'=${order.id}
      )
    `);
    return;
  }

  await sendOrderNotification({
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    customerName: order.customerName || "عميل AQUAVO",
    customerPhone: order.customerPhone || "",
    customerAddress: typeof order.shippingAddress === "string"
      ? order.shippingAddress
      : JSON.stringify(order.shippingAddress ?? ""),
    total: order.roundedTotal ?? order.total,
    subtotal: Number(order.total) - Number(order.shippingCost ?? 0) + Number(order.discountTotal ?? 0),
    shippingCost: order.shippingCost,
    discountTotal: order.discountTotal,
    paymentMethod: "الدفع الإلكتروني — Al-Qaseh ✅",
    items: lines.map((line: any) => ({
      productId: line.productId,
      productName: line.productName,
      variantLabel: line.variantLabel,
      quantity: Number(line.quantity) || 1,
      priceAtPurchase: line.priceAtPurchase,
      lineTotal: line.lineTotal,
    })),
  });
}

async function markDelivered(id: string): Promise<void> {
  const db = dbOrThrow();
  await db.execute(sql`
    UPDATE payment_outbox
       SET status='delivered', processed_at=now(), locked_at=NULL, last_error=NULL, updated_at=now()
     WHERE id=${id}
  `);
}

async function markRetry(event: ClaimedOutbox, error: unknown): Promise<void> {
  const db = dbOrThrow();
  const delaySeconds = Math.min(3600, 30 * (2 ** Math.min(Math.max(event.attempts - 1, 0), 7)));
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
  await db.execute(sql`
    UPDATE payment_outbox
       SET status='pending',
           next_attempt_at=now() + (${delaySeconds} * interval '1 second'),
           locked_at=NULL,
           last_error=${message},
           updated_at=now()
     WHERE id=${event.id}
  `);
}

export async function processPaymentOutbox(limit = 20, orderId?: string): Promise<{ processed: number; failed: number }> {
  const claimed = await claimDueOutbox(limit, orderId);
  let processed = 0;
  let failed = 0;
  for (const event of claimed) {
    try {
      await deliverOutboxEvent(event);
      await markDelivered(event.id);
      processed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[PaymentOutbox] ${event.eventType} failed for ${event.orderId}:`, error);
      await markRetry(event, error).catch((retryError) => {
        console.error(`[PaymentOutbox] failed to reschedule ${event.id}:`, retryError);
      });
    }
  }
  return { processed, failed };
}

export async function processPaymentOutboxForOrder(orderId: string): Promise<{ processed: number; failed: number }> {
  return processPaymentOutbox(10, orderId);
}

export async function runPaymentMaintenance(): Promise<{ releasedReservations: number; processed: number; failed: number }> {
  const releasedReservations = await releaseExpiredPaymentReservations();
  const outbox = await processPaymentOutbox(30);
  return { releasedReservations, ...outbox };
}
