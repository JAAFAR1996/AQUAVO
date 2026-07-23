import { describe, expect, it } from "vitest";
import {
  allocateCarrierCorrections,
  carrierFeeCorrection,
  carrierFeeForOrder,
  patchOrderProfitRow,
  patchSummaryData,
  type AccountingOrderFact,
} from "../server/middleware/accounting-carrier-fee.js";

function order(overrides: Partial<AccountingOrderFact> = {}): AccountingOrderFact {
  return {
    id: "order-1",
    orderNumber: "FH-TEST",
    createdAt: new Date("2026-07-01T12:00:00Z"),
    status: "delivered",
    financiallyCounted: null,
    codReceived: true,
    total: 15000,
    roundedTotal: 15000,
    shippingCost: 4000,
    carrierFee: 5000,
    items: [
      { productId: "p1", quantity: 1, priceAtPurchase: 7000 },
      { productId: "p2", quantity: 1, priceAtPurchase: 4000 },
    ],
    source: "website",
    ...overrides,
  };
}

describe("actual carrier fee accounting", () => {
  it("uses carrier_fee instead of the customer shipping charge", () => {
    const fact = order();
    expect(carrierFeeForOrder(fact)).toBe(5000);
    expect(carrierFeeCorrection(fact)).toBe(1000);
  });

  it("falls back to shippingCost for old rows without carrier_fee", () => {
    const fact = order({ carrierFee: null, shippingCost: 5000 });
    expect(carrierFeeForOrder(fact)).toBe(5000);
    expect(carrierFeeCorrection(fact)).toBe(0);
  });

  it("reduces order revenue and profit by the missing carrier cost", () => {
    const patched = patchOrderProfitRow(
      {
        orderId: "order-1",
        revenue: 11000,
        shipping: 4000,
        cogs: 5000,
        packaging: 500,
        netProfit: 5500,
        margin: 50,
      },
      order(),
    );

    expect(patched.shipping).toBe(5000);
    expect(patched.revenue).toBe(10000);
    expect(patched.netProfit).toBe(4500);
    expect(patched.margin).toBe(45);
  });

  it("corrects summary revenue, profit, AOV, and margins", () => {
    const patched = patchSummaryData(
      {
        totalRevenue: 200000,
        netProfit: 80000,
        netProfitBeforeReturns: 80000,
        netProfitAfterReturns: 70000,
        deliveredCount: 4,
        aov: 50000,
        margin: 40,
        marginBeforeReturns: 40,
        marginAfterReturns: 35,
      },
      21000,
    );

    expect(patched.totalRevenue).toBe(179000);
    expect(patched.netProfit).toBe(59000);
    expect(patched.netProfitBeforeReturns).toBe(59000);
    expect(patched.netProfitAfterReturns).toBe(49000);
    expect(patched.aov).toBe(44750);
    expect(patched.margin).toBe(33);
    expect(patched.marginAfterReturns).toBe(27);
  });

  it("allocates the carrier correction across products by line revenue", () => {
    const allocations = allocateCarrierCorrections([order()]);
    expect(allocations.get("p1")).toBeCloseTo(1000 * (7000 / 11000), 5);
    expect(allocations.get("p2")).toBeCloseTo(1000 * (4000 / 11000), 5);
    expect(
      (allocations.get("p1") ?? 0) + (allocations.get("p2") ?? 0),
    ).toBeCloseTo(1000, 5);
  });
});
