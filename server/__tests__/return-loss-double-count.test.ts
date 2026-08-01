// Phase 6: a damaged carton is reclassified, not expensed twice.
//
// The pieces were all present and the guard was still open:
//
//   * migration 0046 added order_return_events.packaging_loss_source, live in
//     Production, distinguishing an additive hand-typed loss from one that
//     merely restates a fulfillment snapshot;
//   * isAdditiveReturnLoss() implemented exactly that rule;
//   * shared/schema.ts never modelled the column, so every select() dropped it;
//   * eventActualReturnLoss() added packagingLoss unconditionally.
//
// Net effect: the moment a carton's shipment cost was restated onto a return
// event, it was deducted from profit twice -- once at shipment, once again as a
// return loss. These tests pin the arithmetic.
import { describe, expect, it } from "vitest";
import { eventActualReturnLoss } from "../services/accounting-engine.js";
import {
  isAdditiveReturnLoss,
  lossForReturnEvent,
  orderLevelReturnPackagingLoss,
  totalReturnPackagingLoss,
  type ReturnLossClassification,
} from "../services/return-packaging-loss-service.js";

const BASE = {
  refundAmount: 0,
  deliveryCostLoss: 0,
  returnShippingCost: 0,
  productWriteOffAmount: 0,
  cogsLoss: 0,
  restocked: true,
};

describe("packaging loss is counted once, and only when it is real", () => {
  it("counts a hand-typed historical loss", () => {
    expect(
      eventActualReturnLoss({ ...BASE, packagingLoss: 1000, packagingLossSource: "manual" }),
    ).toBe(1000);
  });

  it("does NOT count a loss that merely restates a shipment cost", () => {
    // The carton was already expensed when the order shipped. Counting it again
    // here is the double deduction.
    expect(
      eventActualReturnLoss({ ...BASE, packagingLoss: 1000, packagingLossSource: "fulfillment_snapshot" }),
    ).toBe(0);
  });

  it("treats a missing source as additive, matching 0046's column default", () => {
    // Every historical row predates the column and must keep being counted.
    expect(eventActualReturnLoss({ ...BASE, packagingLoss: 1000 })).toBe(1000);
    expect(eventActualReturnLoss({ ...BASE, packagingLoss: 1000, packagingLossSource: null })).toBe(1000);
  });

  it("leaves every other loss component untouched by the distinction", () => {
    const e = {
      refundAmount: 5000,
      deliveryCostLoss: 3000,
      returnShippingCost: 2000,
      packagingLoss: 1000,
      packagingLossSource: "fulfillment_snapshot",
      productWriteOffAmount: 4000,
      cogsLoss: 6000,
      restocked: false,
    };
    // 3000 + 2000 + 0 (packaging suppressed) + 4000 + 6000. refundAmount is a
    // revenue reversal and is deliberately not part of this figure.
    expect(eventActualReturnLoss(e)).toBe(15000);
  });

  it("agrees with the predicate the rest of the system uses", () => {
    expect(isAdditiveReturnLoss("manual")).toBe(true);
    expect(isAdditiveReturnLoss(undefined)).toBe(true);
    expect(isAdditiveReturnLoss("fulfillment_snapshot")).toBe(false);
  });
});

describe("the damaged-carton report totals without double counting", () => {
  const rows: ReturnLossClassification[] = [
    {
      returnEventId: "r1", fulfillmentLineId: "l1", materialNameSnapshot: "كارتونة",
      quantity: 1, originalTotalCostSnapshot: 250, lossCategory: "damaged_carton",
      classificationMode: "automatic", reason: "طلب راجع",
    } as ReturnLossClassification,
    {
      returnEventId: "r2", fulfillmentLineId: "l2", materialNameSnapshot: "كارتونة",
      quantity: 1, originalTotalCostSnapshot: 250, lossCategory: "damaged_carton",
      classificationMode: "admin_recorded", reason: "إرجاع جزئي",
    } as ReturnLossClassification,
  ];

  it("reports each return event's own loss, not the order-wide total", () => {
    // Storing the cumulative total on every event would make any report that
    // sums events count the same carton once per event.
    expect(lossForReturnEvent(rows, "r1")).toBe(250);
    expect(lossForReturnEvent(rows, "r2")).toBe(250);
  });

  it("sums across distinct return events for the order-level figure", () => {
    expect(orderLevelReturnPackagingLoss(rows)).toBe(500);
  });

  it("returns unknown rather than zero when any snapshot cost is missing", () => {
    const withUnknown = [
      rows[0]!,
      { ...rows[1]!, originalTotalCostSnapshot: null } as ReturnLossClassification,
    ];
    // An unpriced carton makes the total unknowable. Reporting 250 would
    // understate it and reporting 0 would invent a fact.
    expect(totalReturnPackagingLoss(withUnknown)).toBeNull();
  });

  it("is 0 for an order with no damaged cartons, which is a known fact", () => {
    expect(totalReturnPackagingLoss([])).toBe(0);
  });
});
