// FILE: client/src/lib/__tests__/ad-currency.test.ts
// Meta rejects IQD outright, so every fbq() event must carry a supported
// currency and a USD value. These tests pin that contract.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IQD_PER_USD, META_AD_CURRENCY, iqdToAdValue } from "../ad-currency";

vi.mock("../tracking-environment", () => ({ isTrackingAllowed: () => true }));
vi.stubEnv("VITE_META_PIXEL_ID", "123456");

describe("iqdToAdValue", () => {
  it("converts at the fixed CBI rate, rounded to cents", () => {
    expect(iqdToAdValue(IQD_PER_USD)).toBe(1);
    expect(iqdToAdValue(17999)).toBe(13.74);
    expect(iqdToAdValue(23000)).toBe(17.56);
  });

  it("never emits NaN or a negative value", () => {
    expect(iqdToAdValue(Number.NaN)).toBe(0);
    expect(iqdToAdValue(-5000)).toBe(0);
    expect(iqdToAdValue(0)).toBe(0);
  });

  it("uses a Meta-supported ISO 4217 code, never IQD", () => {
    expect(META_AD_CURRENCY).toMatch(/^[A-Z]{3}$/);
    expect(META_AD_CURRENCY).not.toBe("IQD");
  });
});

describe("meta-pixel events", () => {
  const calls: unknown[][] = [];

  beforeEach(async () => {
    calls.length = 0;
    vi.resetModules();
    window.fbq = (...args: unknown[]) => { calls.push(args); };
    Object.defineProperty(navigator, "sendBeacon", { value: () => true, configurable: true });
  });

  it("sends USD values on the browser pixel for every commerce event", async () => {
    const m = await import("../meta-pixel");
    m.metaTrackViewContent({ productId: "p1", productName: "x", priceIQD: 17999 });
    m.metaTrackAddToCart({ productId: "p1", productName: "x", priceIQD: 17999, quantity: 2 });
    m.metaTrackInitiateCheckout({ totalIQD: 23000, numItems: 1, productIds: ["p1"] });
    m.metaTrackPurchase({ orderId: "AQV-1", totalIQD: 23000, numItems: 1, productIds: ["p1"] });

    const tracked = calls.filter((c) => c[0] === "track" && typeof c[2] === "object");
    expect(tracked.map((c) => c[1])).toEqual(["ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]);
    for (const c of tracked) {
      const data = c[2] as { value: number; currency: string };
      expect(data.currency).toBe(META_AD_CURRENCY);
      expect(Number.isFinite(data.value)).toBe(true);
      expect(data.value).toBeGreaterThan(0);
      expect(data.value).toBeLessThan(100); // a dinar figure leaking through would be in the thousands
    }
    expect((tracked[1][2] as { value: number }).value).toBe(iqdToAdValue(17999 * 2));
  });
});
