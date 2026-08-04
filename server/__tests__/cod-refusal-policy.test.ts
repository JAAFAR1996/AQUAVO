import { describe, expect, it } from "vitest";
import {
  AQUAVO_ORDER_PREPARATION_POLICY,
  allocateDiscountProportionally,
  debitStoreCredit,
  isCodRefusalStatus,
  normalizeFullCodRefusalFinancials,
} from "../../shared/cod-refusal-policy.js";

describe("AQUAVO COD refusal policy", () => {
  it("treats every pre-delivery rejection status as a COD refusal", () => {
    expect(isCodRefusalStatus("rejected")).toBe(true);
    expect(isCodRefusalStatus("rejected_carrier")).toBe(true);
    expect(isCodRefusalStatus("rejected_returned")).toBe(true);
    expect(isCodRefusalStatus("returned")).toBe(false);
    expect(isCodRefusalStatus("delivered")).toBe(false);
  });

  it("forces full refusal financial impact to zero and restores sellable quantity", () => {
    expect(normalizeFullCodRefusalFinancials({
      refundAmount: 20_000,
      deliveryCostLoss: 5_000,
      returnShippingCost: 5_000,
      packagingLoss: 1_000,
      productWriteOffAmount: 30_000,
      cogsLoss: 18_000,
      restocked: false,
    })).toEqual({
      refundAmount: 0,
      deliveryCostLoss: 0,
      returnShippingCost: 0,
      packagingLoss: 0,
      productWriteOffAmount: 0,
      cogsLoss: 0,
      restocked: true,
    });
  });

  it("records one gift sticker and one thank-you card per order", () => {
    expect(AQUAVO_ORDER_PREPARATION_POLICY).toEqual({
      giftSticker: { quantityPerOrder: 1, unitCostIqd: 50 },
      thankYouCard: { quantityPerOrder: 1, unitCostIqd: 100 },
    });
  });

  it("allocates discounts proportionally and preserves every dinar", () => {
    const result = allocateDiscountProportionally([
      { id: "a", grossIqd: 10_000 },
      { id: "b", grossIqd: 20_000 },
      { id: "c", grossIqd: 30_000 },
    ], 7_001);

    expect(result.reduce((sum, line) => sum + line.discountIqd, 0)).toBe(7_001);
    expect(result.reduce((sum, line) => sum + line.netIqd, 0)).toBe(52_999);
    expect(result).toEqual([
      { id: "a", grossIqd: 10_000, discountIqd: 1_167, netIqd: 8_833 },
      { id: "b", grossIqd: 20_000, discountIqd: 2_334, netIqd: 17_666 },
      { id: "c", grossIqd: 30_000, discountIqd: 3_500, netIqd: 26_500 },
    ]);
  });

  it("supports partial store-credit use without expiry or negative balance", () => {
    expect(debitStoreCredit(10_000, 3_500)).toBe(6_500);
    expect(() => debitStoreCredit(1_000, 1_001)).toThrow("insufficient");
  });
});
