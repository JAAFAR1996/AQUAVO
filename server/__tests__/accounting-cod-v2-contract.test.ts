import { describe, expect, it } from "vitest";
import { COD_POLICY_VERSION, computeCodBreakdown } from "../../shared/cod-accounting.js";

describe("AQUAVO COD accounting policy v2", () => {
  it("treats 30,000 as gross including 5,000 delivery", () => {
    expect(computeCodBreakdown({
      grossCollected: 30_000,
      customerDeliveryFee: 5_000,
      carrierFee: 5_000,
    })).toEqual({
      grossCollected: 30_000,
      customerDeliveryFee: 5_000,
      carrierFee: 5_000,
      productRevenue: 25_000,
      merchantNet: 25_000,
      deliverySubsidy: 0,
      deliverySurplus: 0,
    });
  });

  it("records free delivery as a merchant subsidy", () => {
    expect(computeCodBreakdown({
      grossCollected: 25_000,
      customerDeliveryFee: 0,
      carrierFee: 5_000,
    })).toMatchObject({
      productRevenue: 25_000,
      merchantNet: 20_000,
      deliverySubsidy: 5_000,
      deliverySurplus: 0,
    });
  });

  it("does not silently classify excess delivery as product sales", () => {
    expect(computeCodBreakdown({
      grossCollected: 30_000,
      customerDeliveryFee: 7_000,
      carrierFee: 5_000,
    })).toMatchObject({
      productRevenue: 23_000,
      merchantNet: 25_000,
      deliverySubsidy: 0,
      deliverySurplus: 2_000,
    });
  });

  it("fails closed on impossible amounts", () => {
    expect(() => computeCodBreakdown({ grossCollected: 4_000, customerDeliveryFee: 5_000, carrierFee: 5_000 }))
      .toThrow(/customerDeliveryFee/);
    expect(() => computeCodBreakdown({ grossCollected: 4_000, customerDeliveryFee: 0, carrierFee: 5_000 }))
      .toThrow(/carrierFee/);
  });

  it("pins the policy version used by database facts", () => {
    expect(COD_POLICY_VERSION).toBe("v2_gross_includes_delivery_carrier_keeps_fee");
  });
});
