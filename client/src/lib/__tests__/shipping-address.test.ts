import { describe, expect, it } from "vitest";
import {
  formatShippingAddress,
  normalizeCustomerOrderResponse,
} from "../shipping-address";

describe("formatShippingAddress", () => {
  it("keeps ordinary stored text readable", () => {
    expect(formatShippingAddress("  بغداد - الكرادة داخل  ")).toBe("بغداد - الكرادة داخل");
  });

  it("formats the canonical JSONB object used by orders", () => {
    expect(formatShippingAddress({
      addressLine1: "الكرادة داخل قرب ساحة كهرمانة",
      city: "بغداد",
      country: "IQ",
    })).toBe("بغداد - الكرادة داخل قرب ساحة كهرمانة");
  });

  it("formats legacy JSON serialized inside a string", () => {
    expect(formatShippingAddress(JSON.stringify({
      addressLine1: "شارع فلسطين",
      city: "بغداد",
      country: "IQ",
    }))).toBe("بغداد - شارع فلسطين");
  });

  it("accepts legacy field names and incomplete objects", () => {
    expect(formatShippingAddress({ governorate: "البصرة", address: "العشار" }))
      .toBe("البصرة - العشار");
    expect(formatShippingAddress({ country: "IQ" })).toBe("IQ");
  });

  it("fails safely for null, arrays, and unsupported values", () => {
    expect(formatShippingAddress(null)).toBe("");
    expect(formatShippingAddress(undefined)).toBe("");
    expect(formatShippingAddress([])).toBe("");
    expect(formatShippingAddress(1234)).toBe("");
  });
});

describe("normalizeCustomerOrderResponse", () => {
  it("normalizes authenticated order details", () => {
    const result = normalizeCustomerOrderResponse("/api/orders/order-1", {
      id: "order-1",
      shippingAddress: { city: "بغداد", addressLine1: "المنصور" },
    }) as { id: string; shippingAddress: string };

    expect(result).toEqual({
      id: "order-1",
      shippingAddress: "بغداد - المنصور",
    });
  });

  it("normalizes the authenticated order list used by the profile page", () => {
    const result = normalizeCustomerOrderResponse("/api/orders", [
      { id: "a", shippingAddress: { city: "بغداد", addressLine1: "الكرادة" } },
      { id: "b", shippingAddress: "البصرة - العشار" },
    ]) as Array<{ id: string; shippingAddress: string }>;

    expect(result.map((order) => order.shippingAddress)).toEqual([
      "بغداد - الكرادة",
      "البصرة - العشار",
    ]);
  });

  it("does not change public tracking or admin response contracts", () => {
    const payload = {
      shippingAddress: { city: "بغداد", addressLine1: "خاص" },
    };

    expect(normalizeCustomerOrderResponse("/api/orders/track/FH-TEST", payload)).toBe(payload);
    expect(normalizeCustomerOrderResponse("/api/admin/orders", payload)).toBe(payload);
  });
});
