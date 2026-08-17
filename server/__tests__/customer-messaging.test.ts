import { describe, expect, it } from "vitest";
import {
  buildCustomerFirstName,
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

  describe("buildCustomerFirstName", () => {
    it("uses the customer's first name only without inventing an honorific", () => {
      expect(buildCustomerFirstName("محمد علي")).toBe("محمد");
      expect(buildCustomerFirstName("Mohammed Al Safi")).toBe("Mohammed");
    });

    it("fails closed for malformed or missing names instead of changing approved copy", () => {
      expect(buildCustomerFirstName("")).toBeNull();
      expect(buildCustomerFirstName("7")).toBeNull();
      expect(buildCustomerFirstName("07721310937")).toBeNull();
      expect(buildCustomerFirstName(null)).toBeNull();
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
