import { describe, it, expect } from "vitest";
import { customerShippingFee, DEFAULT_CUSTOMER_SHIPPING_FEE_IQD } from "../store-policy";

describe("merchant shipping fallback", () => {
  it("reads dynamic database values without forcing the historical default", () => {
    expect(customerShippingFee("7500")).toBe(7500);
    expect(customerShippingFee(6000)).toBe(6000);
  });
  it("shares one safe fallback only when a setting is invalid", () => {
    for (const value of [null, undefined, "", "bad", 0, -1, Infinity]) {
      expect(customerShippingFee(value)).toBe(DEFAULT_CUSTOMER_SHIPPING_FEE_IQD);
    }
  });
});
