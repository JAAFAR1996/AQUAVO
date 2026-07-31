// Packaging side effects of an order status change.
//
// Mapped onto AQUAVO's REAL statuses, taken from shared/order-financials.ts —
// no new order states are invented here:
//
//   pending                -> suggestion only. No hold, no cost.
//   confirmed | processing -> reserve cartons, freeze the preparation costs.
//   shipped                -> reservation becomes physical consumption.
//   cancelled              -> release the hold. Nothing was consumed.
//   returned | rejected_*  -> classify the carton as damaged. No movement.
//
// Every transition is idempotent. Statuses get re-submitted — by a retried
// request, a double click, a webhook replay — and none of those may consume a
// carton twice or hold stock twice.
import {
  isFullReturnStatus,
} from "./return-packaging-loss-service.js";

export type PackagingAction =
  | "suggest_only"
  | "reserve"
  | "consume"
  | "release"
  | "classify_return_loss"
  | "none";

export interface LifecycleDecision {
  action: PackagingAction;
  /** Why, in Arabic, for the audit trail and the admin timeline. */
  reasonAr: string;
}

const RESERVE_STATUSES = new Set(["confirmed", "processing"]);
const SUGGEST_STATUSES = new Set(["pending"]);
const RELEASE_STATUSES = new Set(["cancelled", "rejected", "rejected_carrier"]);

/**
 * What should happen to packaging when an order moves to `newStatus`?
 *
 * Pure, so the mapping can be tested exhaustively without a database.
 *
 * `rejected_carrier` appears in two sets by design: it releases a hold when the
 * order never shipped, and damages the carton when it did. `wasShipped` is the
 * discriminator, because only a shipped carton can come back damaged.
 */
export function decideLifecycleAction(
  newStatus: string,
  previousStatus: string | null,
  wasShipped: boolean,
): LifecycleDecision {
  const s = (newStatus ?? "").trim().toLowerCase();
  const prev = (previousStatus ?? "").trim().toLowerCase();

  if (s === prev) return { action: "none", reasonAr: "لا تغيير بحالة الطلب" };

  if (SUGGEST_STATUSES.has(s)) {
    return { action: "suggest_only", reasonAr: "طلب جديد — اقتراح تغليف فقط بدون حجز" };
  }

  if (RESERVE_STATUSES.has(s)) {
    return { action: "reserve", reasonAr: "تأكيد الطلب — حجز الكراتين وتجميد تكاليف التجهيز" };
  }

  if (s === "shipped") {
    return { action: "consume", reasonAr: "شحن الطلب — تحويل الحجز إلى استهلاك فعلي" };
  }

  if (isFullReturnStatus(s) && wasShipped) {
    return {
      action: "classify_return_loss",
      reasonAr: "طلب راجع بعد الشحن — تصنيف الكارتونة تالفة بدون حركة مخزون",
    };
  }

  if (RELEASE_STATUSES.has(s) && !wasShipped) {
    return { action: "release", reasonAr: "إلغاء قبل الشحن — تحرير حجز الكراتين" };
  }

  // Delivered, or a status with no packaging meaning. Notably `delivered`
  // changes nothing: consumption already happened at `shipped`, and doing it
  // again here is precisely the double-consumption this design avoids.
  return { action: "none", reasonAr: "لا أثر على التغليف بهذه الحالة" };
}

/**
 * Did this order ever ship? Drives the return/cancel split above.
 *
 * Derived from fulfillment evidence rather than the status string, because an
 * order can be moved straight to `returned` by an admin, and what matters is
 * whether a carton was physically consumed — not what the status column says.
 */
export function wasOrderShipped(confirmedOriginalEventCount: number): boolean {
  return confirmedOriginalEventCount > 0;
}
