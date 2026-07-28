import { describe, it, expect } from "vitest";
import { lineCostSnapshot, calcOrderProfit, type CostResolver } from "../services/accounting-engine.js";
import { toMoneyOrNull } from "../../shared/order-financials.js";

// Empty resolver: forces the engine to rely on the line snapshot only.
const noResolver: CostResolver = { getCurrent: () => undefined, getEffective: () => undefined };

function makeOrder(line: Record<string, unknown>) {
  return {
    id: "o1", orderNumber: "FH-260101-TEST", customerName: null, customerPhone: null,
    status: "delivered", createdAt: new Date("2026-01-01T00:00:00Z"),
    roundedTotal: "10000", total: "10000", shippingCost: "0", boxCost: "0",
    discountTotal: "0", pointsDiscount: "0",
    items: [{ productId: "p1", productName: "Filter", quantity: 1, priceAtPurchase: 10000, ...line }],
  } as any;
}

describe("Item 1 — unknown cost stays null, verified zero stays 0", () => {
  it("(1) unknown cost remains null (never coerced to 0)", () => {
    // A non-exact snapshot now defers to the resolver (null === "ask the
    // database"). The invariant under test is unchanged: nothing anywhere is
    // allowed to turn a missing cost into a zero.
    const c = lineCostSnapshot({ productId: "p1", priceAtPurchase: 10000, costStatus: "unknown", costSource: "none" });
    expect(c).toBeNull();
    expect(c?.costPrice).not.toBe(0);
    // toMoneyOrNull itself: null-ish/garbage → null, but a real 0 → 0
    expect(toMoneyOrNull(null)).toBeNull();
    expect(toMoneyOrNull(undefined)).toBeNull();
    expect(toMoneyOrNull("")).toBeNull();
    expect(toMoneyOrNull("abc")).toBeNull();
  });

  it("(2) a verified zero remains numeric 0, not null", () => {
    // F-10: a verified zero declares itself via `verified_zero`; a bare 0 under
    // any other status is the ambiguous `DEFAULT '0'` and is NOT a cost of 0.
    const c = lineCostSnapshot({ productId: "p1", priceAtPurchase: 5000, costPrice: 0, packagingCost: 0, insertCost: 0, costStatus: "verified_zero" });
    expect(c!.costPrice).toBe(0);
    expect(c!.packagingCost).toBe(0);
    expect(c!.insertCost).toBe(0);
    expect(c!.costKnown).toBe(true);
    expect(toMoneyOrNull(0)).toBe(0);
    expect(toMoneyOrNull("0")).toBe(0);
  });

  it("(3) an unknown cost cannot produce an EXACT gross/net profit", () => {
    // noResolver supplies no database cost either, so the line stays genuinely
    // unknown and the order must refuse to claim an exact profit.
    const p = calcOrderProfit(makeOrder({ costStatus: "unknown", costSource: "none" }), noResolver);
    expect(p.costStatus).toBe("incomplete");
    expect(p.exactNetProfit).toBeNull();
    expect(p.exactCogs).toBeNull();
    // the estimate is still exposed but clearly NOT labelled exact
    expect(typeof p.netProfit).toBe("number");
    expect(p.costsComplete).toBe(false);
    expect(p.missingCostLines).toBe(1);
  });

  it("known costs DO produce an exact profit", () => {
    const p = calcOrderProfit(makeOrder({ costPrice: 6000, packagingCost: 0, insertCost: 0, costStatus: "exact" }), noResolver);
    expect(p.costStatus).toBe("exact");
    expect(p.exactCogs).toBe(6000);
    expect(p.exactNetProfit).toBe(4000); // 10000 collected − 0 shipping − 6000 cogs − 0 box
  });

  it("(4) a consumer cannot receive an apparently-complete zero-cost line", () => {
    const p = calcOrderProfit(makeOrder({ costStatus: "unknown", costSource: "none" }), noResolver);
    const line = p.items[0];
    // The line's cost is literally null — impossible to misread as a genuine 0.
    expect(line.unitCostPrice).toBeNull();
    expect(line.unitPackagingCost).toBeNull();
    expect(line.unitInsertCost).toBeNull();
    expect(line.costStatus).toBe("unknown");
  });

  it("(5) JSON serialization preserves null-vs-0 distinction", () => {
    const unknown = calcOrderProfit(makeOrder({ costStatus: "unknown", costSource: "none" }), noResolver);
    const zero = calcOrderProfit(makeOrder({ costPrice: 0, packagingCost: 0, insertCost: 0, costStatus: "verified_zero" }), noResolver);
    const u = JSON.parse(JSON.stringify(unknown));
    const z = JSON.parse(JSON.stringify(zero));
    expect(u.items[0].unitCostPrice).toBeNull();
    expect(u.exactNetProfit).toBeNull();
    expect(z.items[0].unitCostPrice).toBe(0);
    expect(z.exactNetProfit).toBe(10000); // 10000 − 0 − 0 − 0
  });
});
