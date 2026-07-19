// Customer-facing discount-code (coupon) status messages — Arabic only.
//
// Single source of truth so no raw backend/API text ever reaches the customer.
// The server returns a stable additive `code` (server/routes/coupons.ts); we map
// that code — never the backend `message` — to a precise Arabic string. Business
// rules and HTTP statuses are unchanged; this is presentation only.

import { formatIQD } from "@/lib/utils";

export const COUPON_MESSAGES = {
  empty: "أدخل كود الخصم أولاً",
  checking: "جارٍ التحقق من كود الخصم...",
  applied: "تم تطبيق كود الخصم بنجاح",
  removed: "تمت إزالة كود الخصم",
  invalid: "كود الخصم غير صحيح",
  expired: "انتهت صلاحية كود الخصم",
  unavailable: "كود الخصم غير متاح حالياً",
  notEligible: "كود الخصم لا يشمل المنتجات الموجودة في السلة",
  usageLimit: "تم استخدام هذا الكود بالحد الأقصى المسموح",
  alreadyUsed: "سبق أن استخدمت هذا الكود",
  // Never leak a raw error; unknown failures get a safe generic Arabic message.
  generic: "تعذّر التحقق من كود الخصم، حاول مرة أخرى",
} as const;

/** «تم تطبيق الخصم: 5,000 د.ع» */
export function appliedDiscountMessage(discountAmount: number): string {
  return `تم تطبيق الخصم: ${formatIQD(discountAmount)}`;
}

/** «هذا الكود يتطلب طلباً بقيمة لا تقل عن 25,000 د.ع» */
export function minOrderMessage(minAmount: number): string {
  return `هذا الكود يتطلب طلباً بقيمة لا تقل عن ${formatIQD(minAmount)}`;
}

interface CouponErrorBody {
  code?: string;
  minOrderAmount?: number;
  /** Present on responses but intentionally IGNORED for display — never shown to the customer. */
  message?: string;
}

/**
 * Map a failed /api/coupons/validate (or order-time coupon) response to an
 * accurate Arabic message. Only the stable `code` (and `minOrderAmount`) is used.
 */
export function mapCouponError(status: number, body: CouponErrorBody | null | undefined): string {
  const code = body?.code;
  switch (code) {
    case "MISSING_CODE":
      return COUPON_MESSAGES.empty;
    case "NOT_FOUND":
    case "INVALID":
      return COUPON_MESSAGES.invalid;
    case "EXPIRED":
      return COUPON_MESSAGES.expired;
    case "INACTIVE":
    case "NOT_STARTED":
      return COUPON_MESSAGES.unavailable;
    case "MIN_ORDER":
      return typeof body?.minOrderAmount === "number"
        ? minOrderMessage(body.minOrderAmount)
        : COUPON_MESSAGES.unavailable;
    case "USAGE_LIMIT":
      return COUPON_MESSAGES.usageLimit;
    case "ALREADY_USED":
      return COUPON_MESSAGES.alreadyUsed;
    case "NOT_ELIGIBLE":
      return COUPON_MESSAGES.notEligible;
    default:
      // No recognizable code → map by status without leaking backend text.
      if (status === 404) return COUPON_MESSAGES.invalid;
      return COUPON_MESSAGES.generic;
  }
}
