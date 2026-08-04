// Packaging side effects of an order status change.
//
// Mapped onto AQUAVO's REAL statuses, taken from shared/order-financials.ts —
// no new order states are invented here:
//
//   pending                -> suggestion only. No hold, no cost.
//   confirmed | processing -> reserve cartons, freeze the preparation costs.
//   shipped                -> reservation becomes physical consumption.
//   cancelled pre-shipment -> release the hold. Nothing was consumed.
//   COD refusal after ship -> classify the carton as damaged immediately.
//   true post-delivery return -> classify the carton as damaged. No movement.
//
// Every transition is idempotent. Statuses get re-submitted — by a retried
// request, a double click, a webhook replay — and none of those may consume a
// carton twice or hold stock twice.
import { isCodRefusalStatus } from "../../shared/cod-refusal-policy.js";
import { isFullReturnStatus } from "./return-packaging-loss-service.js";

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

/**
 * What should happen to packaging when an order moves to `newStatus`?
 *
 * Pure, so the mapping can be tested exhaustively without a database.
 *
 * For AQUAVO, a shipped carton is considered damaged/lost as soon as the
 * delivery agent confirms the customer refused the parcel. We do not wait for
 * the later "استلمت من الشركة" click, and we never deduct the carton twice.
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

  if (wasShipped && (isCodRefusalStatus(s) || isFullReturnStatus(s))) {
    return {
      action: "classify_return_loss",
      reasonAr: isCodRefusalStatus(s)
        ? "الزبون رفض الطلب قبل الاستلام — تصنيف الكارتونة تالفة بدون مصروف إضافي"
        : "طلب راجع بعد الشحن — تصنيف الكارتونة تالفة بدون حركة مخزون",
    };
  }

  if (!wasShipped && (s === "cancelled" || isCodRefusalStatus(s))) {
    return { action: "release", reasonAr: "إلغاء/رفض قبل الشحن — تحرير حجز الكراتين" };
  }

  return { action: "none", reasonAr: "لا أثر على التغليف بهذه الحالة" };
}

/**
 * Did this order ever ship? Drives the return/cancel split above.
 *
 * Derived from fulfillment evidence rather than the status string, because an
 * order can be moved straight to a refusal/return status by an admin, and what
 * matters is whether a carton was physically consumed — not what the status
 * column says.
 */
export function wasOrderShipped(confirmedOriginalEventCount: number): boolean {
  return confirmedOriginalEventCount > 0;
}
