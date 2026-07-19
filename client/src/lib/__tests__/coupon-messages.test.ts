import { describe, expect, it } from "vitest";
import {
  COUPON_MESSAGES,
  mapCouponError,
  appliedDiscountMessage,
  minOrderMessage,
} from "@/lib/coupon-messages";

describe("coupon-messages — Arabic status mapping", () => {
  it("never returns the raw backend message; maps by stable code", () => {
    // A backend body with an English leak must NOT be surfaced.
    const msg = mapCouponError(404, { code: "NOT_FOUND", message: "Invalid coupon" });
    expect(msg).toBe("كود الخصم غير صحيح");
    expect(msg).not.toMatch(/invalid/i);
  });

  it.each([
    ["NOT_FOUND", COUPON_MESSAGES.invalid],
    ["EXPIRED", COUPON_MESSAGES.expired],
    ["INACTIVE", COUPON_MESSAGES.unavailable],
    ["NOT_STARTED", COUPON_MESSAGES.unavailable],
    ["USAGE_LIMIT", COUPON_MESSAGES.usageLimit],
    ["ALREADY_USED", COUPON_MESSAGES.alreadyUsed],
    ["NOT_ELIGIBLE", COUPON_MESSAGES.notEligible],
  ])("maps code %s to the correct Arabic message", (code, expected) => {
    expect(mapCouponError(400, { code })).toBe(expected);
  });

  it("maps MIN_ORDER with the required amount", () => {
    expect(mapCouponError(400, { code: "MIN_ORDER", minOrderAmount: 25000 })).toBe(
      "هذا الكود يتطلب طلباً بقيمة لا تقل عن 25,000 د.ع"
    );
  });

  it("falls back to a safe generic Arabic message for unknown codes/bodies", () => {
    expect(mapCouponError(400, { code: "SOMETHING_NEW" })).toBe(COUPON_MESSAGES.generic);
    expect(mapCouponError(500, null)).toBe(COUPON_MESSAGES.generic);
    expect(mapCouponError(404, null)).toBe(COUPON_MESSAGES.invalid);
  });

  it("builds the applied-discount and empty/removed messages", () => {
    expect(appliedDiscountMessage(5000)).toBe("تم تطبيق الخصم: 5,000 د.ع");
    expect(minOrderMessage(10000)).toBe("هذا الكود يتطلب طلباً بقيمة لا تقل عن 10,000 د.ع");
    expect(COUPON_MESSAGES.empty).toBe("أدخل كود الخصم أولاً");
    expect(COUPON_MESSAGES.removed).toBe("تمت إزالة كود الخصم");
    expect(COUPON_MESSAGES.checking).toBe("جارٍ التحقق من كود الخصم...");
  });
});
