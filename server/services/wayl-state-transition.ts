import { sql } from "drizzle-orm";
import { rowsOf, type SecurityDatabase } from "./security-db.js";
interface Observation {
  orderId: string; referenceId: string; amount: number; currency: string;
  providerStatus: string; mappedStatus: "pending" | "failed" | "cancelled" | "expired";
}
interface LockedOrder extends Record<string, unknown> { id: string; status: string; payment_status: string }
interface LockedPayment extends Record<string, unknown> {
  id: string; status: string; transaction_id: string; amount: string; currency: string;
  provider_response: Record<string, unknown> | null;
}
export interface ObservedPaymentState { orderStatus: string; paymentStatus: string; paymentId: string; applied: boolean }
/** Re-read state after provider HTTP. All local mutations share one locked transaction. */
export async function applyUnpaidWaylObservation(db: SecurityDatabase, observation: Observation): Promise<ObservedPaymentState> {
  return db.transaction(async (tx) => {
    const order = rowsOf<LockedOrder>(await tx.execute(sql`SELECT id,status,payment_status FROM orders WHERE id=${observation.orderId} FOR UPDATE`))[0];
    const payment = rowsOf<LockedPayment>(await tx.execute(sql`SELECT id,status,transaction_id,amount,currency,provider_response FROM payments
      WHERE order_id=${observation.orderId} AND method='wayl' FOR UPDATE`))[0];
    if (!order || !payment) throw Object.assign(new Error("Order payment unavailable"), { status: 404 });
    const current = { orderStatus: order.status, paymentStatus: order.payment_status, paymentId: payment.transaction_id, applied: false };
    const evidence = rowsOf<{ captured: boolean }>(await tx.execute(sql`SELECT EXISTS(SELECT 1 FROM payment_events
      WHERE order_id=${order.id} AND method='wayl' AND event_type='capture' AND status='completed') AS captured`))[0];
    if (payment.status === "completed" || payment.status === "refunded" || ["paid", "refunded"].includes(order.payment_status)
        || evidence?.captured || order.status === "cancelled" || payment.transaction_id !== observation.referenceId) return current;
    if (Number(payment.amount) !== observation.amount || payment.currency.toUpperCase() !== observation.currency.toUpperCase()) {
      throw Object.assign(new Error("Payment verification mismatch"), { status: 409 });
    }
    const previous = payment.provider_response ?? {};
    const attempts = Array.isArray(previous.attempts) ? previous.attempts as Record<string, unknown>[] : [];
    const nextMeta = { ...previous, attempts: attempts.map((attempt) => attempt.referenceId === observation.referenceId
      ? { ...attempt, status: observation.providerStatus, verifiedAt: new Date().toISOString() } : attempt),
      providerStatus: observation.providerStatus, verifiedAt: new Date().toISOString() };
    await tx.execute(sql`UPDATE payments SET status=${observation.mappedStatus === 'pending' ? 'pending' : 'failed'},
      provider_response=${JSON.stringify(nextMeta)}::jsonb,updated_at=clock_timestamp() WHERE id=${payment.id}`);
    await tx.execute(sql`UPDATE orders SET payment_status=${observation.mappedStatus},updated_at=clock_timestamp() WHERE id=${order.id}`);
    if (observation.mappedStatus !== "pending") {
      await tx.execute(sql`UPDATE payment_stock_reservations SET status='released',release_reason=${`payment_${observation.mappedStatus}`},updated_at=clock_timestamp()
        WHERE order_id=${order.id} AND status='active'`);
    }
    return { ...current, paymentStatus: observation.mappedStatus, applied: true };
  });
}
