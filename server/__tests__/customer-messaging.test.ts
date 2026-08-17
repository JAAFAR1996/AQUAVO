import { describe, expect, it } from "vitest";
import {
  buildCustomerHonorific,
  normalizeIraqiWhatsAppPhone,
  retryDelayMs,
} from "../services/customer-messaging.js";

describe("customer messaging helpers", () => {
  describe("normalizeIraqiWhatsAppPhone", () => {
    it.each([
      ["07721310937", "9647721310937"],
      ["+9647721310937", "9647721310937"],
      ["009647721310937", "9647721310937"],
      ["96407721310937", "9647721310937"],
      ["7721310937", "9647721310937"],
      ["٠٧٧٢١٣١٠٩٣٧", "9647721310937"],
      ["۰۷۷۲۱۳۱۰۹۳۷", "9647721310937"],
    ])("normalizes %s", (input, expected) => {
      expect(normalizeIraqiWhatsAppPhone(input)).toBe(expected);
    });

    it.each(["", "123", "078123", "+12025550123", null, undefined])(
      "rejects invalid/non-Iraqi mobile %s",
      (input) => {
        expect(normalizeIraqiWhatsAppPhone(input)).toBeNull();
      },
    );
  });

  describe("buildCustomerHonorific", () => {
    it("uses only a conservative first name", () => {
      expect(buildCustomerHonorific("محمد علي")).toBe("أستاذ محمد");
      expect(buildCustomerHonorific("Mohammed Al Safi")).toBe("أستاذ Mohammed");
    });

    it("falls back safely for malformed names", () => {
      expect(buildCustomerHonorific("")).toBe("أستاذ");
      expect(buildCustomerHonorific("7")).toBe("أستاذ");
      expect(buildCustomerHonorific("07721310937")).toBe("أستاذ");
    });
  });

  describe("retryDelayMs", () => {
    it("uses bounded exponential-style retry windows", () => {
      expect(retryDelayMs(1)).toBe(60_000);
      expect(retryDelayMs(2)).toBe(5 * 60_000);
      expect(retryDelayMs(3)).toBe(30 * 60_000);
      expect(retryDelayMs(4)).toBe(2 * 60 * 60_000);
      expect(retryDelayMs(5)).toBeNull();
      expect(retryDelayMs(10)).toBeNull();
    });
  });
});
