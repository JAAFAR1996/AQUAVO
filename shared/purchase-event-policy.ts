export const PURCHASE_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface PurchaseLifecycle {
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentRecordStatus?: string | null;
  createdAt?: Date | string | null;
  isTest?: boolean;
  source?: string | null;
}

/** Purchase records a real submitted COD order or a server-verified online payment. */
export function isPurchaseLifecycleEligible(order: PurchaseLifecycle, now = Date.now()): boolean {
  if (order.isTest || !["website", undefined, null].includes(order.source)) return false;
  if (!["pending", "confirmed", "processing", "shipped", "delivered"].includes(order.status || "")) return false;
  if (["failed", "refunded", "cancelled"].includes(order.paymentStatus || "")) return false;
  if (["failed", "refunded", "cancelled"].includes(order.paymentRecordStatus || "")) return false;
  const created = order.createdAt ? new Date(order.createdAt).getTime() : NaN;
  if (!Number.isFinite(created) || created > now + 60_000 || now - created > PURCHASE_EVENT_WINDOW_MS) return false;
  // A missing method is not proof of cash on delivery.
  if (["cod", "cash_on_delivery"].includes(order.paymentMethod || "")) return true;
  return ["wayl", "alqaseh"].includes(order.paymentMethod || "")
    && order.paymentStatus === "paid" && order.paymentRecordStatus === "completed";
}
