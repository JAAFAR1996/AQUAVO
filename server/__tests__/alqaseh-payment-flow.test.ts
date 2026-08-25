import { describe, expect, it } from "vitest";
import { isVerifiedPaymentContext, mapAlqasehPaymentStatus } from "../services/alqaseh-order-payment.js";

describe("Al-Qaseh order payment flow", () => {
  it("maps provider states without treating unknown or retried payments as paid", () => {
    expect(mapAlqasehPaymentStatus("succeeded")).toBe("paid");
    expect(mapAlqasehPaymentStatus("prepared")).toBe("pending");
    expect(mapAlqasehPaymentStatus("retried")).toBe("pending");
    expect(mapAlqasehPaymentStatus("unknown")).toBe("pending");
    expect(mapAlqasehPaymentStatus("failed")).toBe("failed");
    expect(mapAlqasehPaymentStatus("declined")).toBe("failed");
    expect(mapAlqasehPaymentStatus("duplicated")).toBe("failed");
    expect(mapAlqasehPaymentStatus("revoked")).toBe("cancelled");
    expect(mapAlqasehPaymentStatus("expired")).toBe("expired");
  });

  it("requires order, amount and currency to match before accepting provider state", () => {
    const expected = { orderId: "order-123", amount: 12_500, currency: "IQD" };

    expect(isVerifiedPaymentContext({ order_id: "order-123", amount: 12_500, currency: "IQD" }, expected)).toBe(true);
    expect(isVerifiedPaymentContext({ order_id: "other", amount: 12_500, currency: "IQD" }, expected)).toBe(false);
    expect(isVerifiedPaymentContext({ order_id: "order-123", amount: 12_000, currency: "IQD" }, expected)).toBe(false);
    expect(isVerifiedPaymentContext({ order_id: "order-123", amount: 12_500, currency: "USD" }, expected)).toBe(false);
  });
});
