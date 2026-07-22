import { describe, it, expect } from "vitest";
import { calcOrderProfit, type CostResolver, type OrderFulfillmentCost } from "../services/accounting-engine.js";

const noResolver: CostResolver = { getCurrent: () => undefined, getEffective: () => undefined };

// Known product cost 6000; collected 10000, shipping 0 → revenue 10000, cogs 6000.
function order(line: Record<string, unknown> = { costPrice: 6000, packagingCost: 0, insertCost: 0, costStatus: "exact" }) {
  return {
    id: "o1", orderNumber: "FH-1", customerName: null, customerPhone: null, status: "delivered",
    createdAt: new Date("2026-01-01T00:00:00Z"), roundedTotal: "10000", total: "10000",
    shippingCost: "0", boxCost: "0", discountTotal: "0", pointsDiscount: "0",
    items: [{ productId: "p1", productName: "Filter", quantity: 1, priceAtPurchase: 10000, ...line }],
  } as any;
}
const exactFulfil: OrderFulfillmentCost = {
  orderId: "o1", originalFulfillmentCost: 2000, reshipmentCost: null, returnHandlingCost: null,
  replacementCost: null, adjustmentCost: null, reversedCost: 0, totalFulfillmentCost: 2000,
  status: "exact", expectedCost: 2000, actualCost: 2000, variance: 0, eventCount: 1, unknownLines: 0,
};
const incompleteFulfil: OrderFulfillmentCost = {
  orderId: "o1", originalFulfillmentCost: null, reshipmentCost: null, returnHandlingCost: null,
  replacementCost: null, adjustmentCost: null, reversedCost: 0, totalFulfillmentCost: null,
  status: "incomplete", expectedCost: 2000, actualCost: null, variance: null, eventCount: 1, unknownLines: 1,
};

describe("fulfillment cost as a SEPARATE contribution component", () => {
  it("known cost + exact fulfillment → contribution profit is exact and separate from COGS", () => {
    const p = calcOrderProfit(order(), noResolver, exactFulfil);
    expect(p.cogs).toBe(6000);              // product COGS unchanged
    expect(p.fulfillmentCost).toBe(2000);   // fulfillment is its OWN number
    expect(p.grossMerchandiseProfit).toBe(4000);   // 10000 − 6000
    expect(p.contributionProfit).toBe(2000);       // 10000 − 6000 − 2000
    expect(p.contributionMargin).toBe(20);
    expect(p.fulfillmentStatus).toBe("exact");
  });

  it("no fulfillment snapshot yet → fulfillment null and contribution NULL (never assumed 0)", () => {
    const p = calcOrderProfit(order(), noResolver); // no fulfillment arg
    expect(p.fulfillmentCost).toBeNull();
    expect(p.fulfillmentStatus).toBe("unknown");
    expect(p.grossMerchandiseProfit).toBe(4000);   // product side is exact
    expect(p.contributionProfit).toBeNull();       // cannot claim contribution without fulfillment
    expect(p.contributionMargin).toBeNull();
  });

  it("incomplete fulfillment → contribution NULL, fulfillment cost NULL", () => {
    const p = calcOrderProfit(order(), noResolver, incompleteFulfil);
    expect(p.fulfillmentCost).toBeNull();
    expect(p.contributionProfit).toBeNull();
  });

  it("unknown PRODUCT cost + exact fulfillment → contribution still NULL (product side incomplete)", () => {
    const p = calcOrderProfit(order({ costStatus: "unknown", costSource: "none" }), noResolver, exactFulfil);
    expect(p.costStatus).toBe("incomplete");
    expect(p.grossMerchandiseProfit).toBeNull();
    expect(p.contributionProfit).toBeNull();
  });

  it("(item 1) product supplier-packaging and AQUAVO fulfillment never double-count", () => {
    // product line carries supplier packaging (500) inside product COGS;
    // AQUAVO fulfillment (box+sticker = 2000) is a SEPARATE component.
    const o = order({ costPrice: 6000, packagingCost: 500, insertCost: 0, costStatus: "exact" });
    const p = calcOrderProfit(o, noResolver, exactFulfil);
    expect(p.cogs).toBe(6500);              // 6000 acquisition + 500 supplier packaging
    expect(p.fulfillmentCost).toBe(2000);   // AQUAVO box+sticker — NOT in cogs
    // contribution deducts each exactly once: 10000 − 6500 − 2000
    expect(p.contributionProfit).toBe(1500);
    // the fulfillment 2000 is absent from cogs; the supplier 500 is absent from fulfillment
    expect(p.cogs).not.toBe(6500 + 2000);
  });

  it("(item 3) breakdown sums original + reshipment; reversed excluded", () => {
    const multi: OrderFulfillmentCost = {
      orderId: "o1", originalFulfillmentCost: 2000, reshipmentCost: 800, returnHandlingCost: null,
      replacementCost: null, adjustmentCost: null, reversedCost: 500, totalFulfillmentCost: 2800,
      status: "exact", expectedCost: null, actualCost: 2800, variance: null, eventCount: 2, unknownLines: 0,
    };
    const p = calcOrderProfit(order(), noResolver, multi);
    expect(p.fulfillmentCost).toBe(2800);   // 2000 + 800, reversed 500 excluded
    expect(p.contributionProfit).toBe(10000 - 6000 - 2800);
  });

  it("JSON preserves null contribution vs numeric contribution", () => {
    const known = JSON.parse(JSON.stringify(calcOrderProfit(order(), noResolver, exactFulfil)));
    const missing = JSON.parse(JSON.stringify(calcOrderProfit(order(), noResolver)));
    expect(known.contributionProfit).toBe(2000);
    expect(missing.contributionProfit).toBeNull();
  });
});
