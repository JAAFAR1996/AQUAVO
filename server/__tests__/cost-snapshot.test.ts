import { describe, it, expect } from "vitest";
import { lineCostSnapshot } from "../routes/accounting.js";

describe("immutable cost snapshot preference (NULL-not-zero)", () => {
  it("returns null when the line has no snapshot at all (older orders → fall back to history)", () => {
    expect(lineCostSnapshot({ productId: "p1", priceAtPurchase: 10000 })).toBeNull();
  });

  it("builds a KNOWN ProductCost from a frozen snapshot when cost is present", () => {
    const c = lineCostSnapshot({
      productId: "p1",
      productName: "Filter",
      priceAtPurchase: "10000",
      costPrice: "6000",
      packagingCost: "300",
      insertCost: "200",
      costStatus: "exact",
      costSource: "product_current",
    });
    expect(c).not.toBeNull();
    expect(c!.costPrice).toBe(6000);
    expect(c!.packagingCost).toBe(300);
    expect(c!.insertCost).toBe(200);
    expect(c!.costKnown).toBe(true);
    expect(c!.costsComplete).toBe(true);
    expect(c!.costStatus).toBe("exact");
    expect(c!.name).toBe("Filter");
  });

  it("returns an explicitly UNKNOWN cost (not 0) when the snapshot recorded unknown", () => {
    // A frozen 'unknown' must NOT be silently replaced by current cost, and must
    // never be treated as a real 0 → costKnown false, order flagged incomplete.
    const c = lineCostSnapshot({ productId: "p1", priceAtPurchase: 5000, costPrice: null, costStatus: "unknown", costSource: "none" });
    expect(c).not.toBeNull();
    expect(c!.costKnown).toBe(false);
    expect(c!.costsComplete).toBe(false);
    expect(c!.costStatus).toBe("unknown");
  });

  it("treats a snapshot with a verified 0 cost as KNOWN but not 'complete-with-positive-cost'", () => {
    const c = lineCostSnapshot({ productId: "p1", priceAtPurchase: 5000, costPrice: 0, costStatus: "exact" });
    expect(c!.costKnown).toBe(true);
    expect(c!.costPrice).toBe(0);
    expect(c!.costsComplete).toBe(false); // positive-cost gate, but cost IS known
  });
});
