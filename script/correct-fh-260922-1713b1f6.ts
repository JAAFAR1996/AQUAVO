import { eq, sql } from "drizzle-orm";
import { orders } from "../shared/schema.js";
import { orderCollectedAmount } from "../shared/order-financials.js";
import { getDb } from "../server/db.js";
import { recordFinancialChange } from "../server/services/accountingAuditTrail.js";
import { syncAutomaticReturnLifecycle } from "../server/services/order-return-automation-v2.js";
import { loyaltyStorage } from "../server/storage/loyalty-storage.js";
import { badgeEngine } from "../server/storage/badge-engine.js";
import { challengeStorage } from "../server/storage/challenge-storage.js";

const ORDER_NUMBER = "FH-260922-1713B1F6";
const ACTOR_ID = "system:owner-delivery-correction";
const ACTOR_NAME = "Owner confirmed customer received order";

const db = getDb();
if (!db) throw new Error("DATABASE_URL is not configured");

const result = await db.transaction(async (tx) => {
  const lockedResult = await tx.execute(sql`
    SELECT id, order_number, status, user_id
    FROM public.orders
    WHERE order_number=${ORDER_NUMBER}
    FOR UPDATE
  `);
  const rows = Array.isArray(lockedResult)
    ? lockedResult as Array<Record<string, unknown>>
    : ((lockedResult as { rows?: Array<Record<string, unknown>> }).rows ?? []);
  const locked = rows[0];

  if (!locked) throw new Error(`Order not found: ${ORDER_NUMBER}`);

  const oldStatus = String(locked.status ?? "");
  if (oldStatus === "delivered") {
    const [already] = await tx.select().from(orders).where(eq(orders.id, String(locked.id))).limit(1);
    return { order: already, oldStatus, corrected: false };
  }

  if (!["rejected", "rejected_carrier"].includes(oldStatus)) {
    throw new Error(`Refusing correction because current status is "${oldStatus}", expected rejected/rejected_carrier`);
  }

  const lifecycle = await syncAutomaticReturnLifecycle(tx as never, {
    orderId: String(locked.id),
    orderNumber: String(locked.order_number ?? ORDER_NUMBER),
    oldStatus,
    newStatus: "delivered",
    actorId: ACTOR_ID,
    actorName: ACTOR_NAME,
  });

  const [updated] = await tx.update(orders).set({
    status: "delivered",
    updatedAt: new Date(),
  } as any).where(eq(orders.id, String(locked.id))).returning();

  if (!updated) throw new Error("Order update returned no row");

  await recordFinancialChange(tx as never, {
    entityType: "order",
    entityId: String(locked.id),
    action: "status_change",
    fieldName: "status",
    oldValue: oldStatus,
    newValue: "delivered",
    reason: "تصحيح حالة الطلب بعد تأكيد أن الزبون استلمه فعلياً",
    performedBy: ACTOR_ID,
    performedByName: ACTOR_NAME,
  });

  return { order: updated, oldStatus, corrected: true, lifecycle };
});

if (result.corrected && result.order?.userId) {
  const amount = orderCollectedAmount(result.order);
  await loyaltyStorage.approveOrderPoints(result.order.userId, result.order.id, amount);
  await loyaltyStorage.generateOrderBonus(result.order.userId, result.order.id).catch(() => null);
  await loyaltyStorage.checkMilestones(result.order.userId).catch(() => null);
  await badgeEngine.checkAndAwardBadges(result.order.userId).catch(() => []);
  await challengeStorage.updateProgress(result.order.userId, "cross_category", 1).catch(() => undefined);
}

const verifyResult = await db.execute(sql`
  SELECT o.id, o.order_number, o.status, o.delivered_at,
         r.id AS return_event_id, r.status AS return_event_status, r.restocked
  FROM public.orders o
  LEFT JOIN LATERAL (
    SELECT id,status,restocked
    FROM public.order_return_events
    WHERE order_id=o.id
      AND type='rejected_delivery'
      AND reason='AUTO_ORDER_STATUS_REJECTED'
    ORDER BY created_at DESC
    LIMIT 1
  ) r ON true
  WHERE o.order_number=${ORDER_NUMBER}
`);

const verifyRows = Array.isArray(verifyResult)
  ? verifyResult
  : ((verifyResult as { rows?: unknown[] }).rows ?? []);

console.log(JSON.stringify({
  orderNumber: ORDER_NUMBER,
  previousStatus: result.oldStatus,
  corrected: result.corrected,
  verification: verifyRows[0] ?? null,
}, null, 2));
