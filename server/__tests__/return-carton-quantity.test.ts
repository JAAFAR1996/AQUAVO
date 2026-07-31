// Carton write-off across MULTIPLE return events on one shipment line.
//
// The case that broke the first design: a single fulfillment line can carry more
// than one carton, and those cartons can come back across separate returns. The
// original UNIQUE(fulfillment_line_id) allowed exactly one classification per
// line and would have rejected the second, legitimate return.
//
// The replacement is two rules working together:
//   * UNIQUE(return_event_id, fulfillment_line_id) — re-processing one return
//     event writes nothing the second time;
//   * a cumulative ceiling — the sum of every classification against a line can
//     never exceed the quantity that line actually consumed.
//
// Together they allow "two cartons, two returns" while still making
// "three write-offs of a two-carton line" impossible.
import { describe, expect, it } from "vitest";
import {
  ReturnClassificationError,
  buildClassifiedQuantities,
  classifyAdminRecordedDamage,
  classifyFullReturn,
  lossForReturnEvent,
  orderLevelReturnPackagingLoss,
  remainingQuantity,
  totalReturnPackagingLoss,
  type ConsumedLine,
  type ReturnLossClassification,
} from "../services/return-packaging-loss-service.js";

/** One shipment line carrying TWO cartons at 1,000 each. */
const TWO_CARTONS: ConsumedLine = {
  lineId: "line-carton",
  eventId: "evt-1",
  materialId: "mat-carton",
  materialName: "كارتونة 27×20×14 سم",
  materialKind: "carton",
  quantity: 2,
  unitCostSnapshot: 1000,
  totalCost: 2000,
  costStatus: "exact",
};
const STICKER: ConsumedLine = {
  lineId: "line-sticker",
  eventId: "evt-1",
  materialId: "mat-label",
  materialName: "ملصق السعر",
  materialKind: "consumable",
  quantity: 1,
  unitCostSnapshot: 50,
  totalCost: 50,
  costStatus: "exact",
};
const CARD: ConsumedLine = {
  lineId: "line-card",
  eventId: "evt-1",
  materialId: "mat-card",
  materialName: "كارت الشكر والتواصل",
  materialKind: "consumable",
  quantity: 1,
  unitCostSnapshot: 100,
  totalCost: 100,
  costStatus: "exact",
};
const SHIPMENT = [TWO_CARTONS, STICKER, CARD];

const asRows = (cs: readonly ReturnLossClassification[]) =>
  cs.map((c) => ({ fulfillmentLineId: c.fulfillmentLineId, quantity: c.quantity }));

describe("two cartons on one line, returned across two events", () => {
  it("first partial return classifies 1 of 2", () => {
    const c = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "وحدة رجعت متمزقة" },
      SHIPMENT,
      "ret-1",
    );
    expect(c.quantity).toBe(1);
    expect(c.returnEventId).toBe("ret-1");
    expect(c.originalTotalCostSnapshot).toBe(1000); // priced per unit, not 2000
  });

  it("second partial return classifies the remaining 1", () => {
    const first = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "الأولى" },
      SHIPMENT,
      "ret-1",
    );
    const classified = buildClassifiedQuantities(asRows([first]));
    expect(remainingQuantity(TWO_CARTONS, classified)).toBe(1);

    const second = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "الثانية" },
      SHIPMENT,
      "ret-2",
      classified,
    );
    expect(second.quantity).toBe(1);
    expect(second.returnEventId).toBe("ret-2");
  });

  it("third attempt is rejected — nothing is left to classify", () => {
    const classified = buildClassifiedQuantities([
      { fulfillmentLineId: "line-carton", quantity: 1 },
      { fulfillmentLineId: "line-carton", quantity: 1 },
    ]);
    expect(remainingQuantity(TWO_CARTONS, classified)).toBe(0);

    const err = (() => {
      try {
        classifyAdminRecordedDamage(
          { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "محاولة ثالثة" },
          SHIPMENT,
          "ret-3",
          classified,
        );
      } catch (e) {
        return e as ReturnClassificationError;
      }
      return null;
    })();
    expect(err?.code).toBe("ALREADY_CLASSIFIED");
  });

  it("rejects a request larger than what remains", () => {
    const classified = buildClassifiedQuantities([{ fulfillmentLineId: "line-carton", quantity: 1 }]);
    const err = (() => {
      try {
        classifyAdminRecordedDamage(
          { fulfillmentLineId: "line-carton", quantity: 2, lossCategory: "damaged_carton", reason: "طلب زائد" },
          SHIPMENT,
          "ret-2",
          classified,
        );
      } catch (e) {
        return e as ReturnClassificationError;
      }
      return null;
    })();
    expect(err?.code).toBe("EXCEEDS_REMAINING");
  });

  it("rejects a request larger than the line ever consumed", () => {
    const err = (() => {
      try {
        classifyAdminRecordedDamage(
          { fulfillmentLineId: "line-carton", quantity: 5, lossCategory: "damaged_carton", reason: "أكبر من المستهلك" },
          SHIPMENT,
          "ret-1",
        );
      } catch (e) {
        return e as ReturnClassificationError;
      }
      return null;
    })();
    expect(err?.code).toBe("QUANTITY_EXCEEDS_CONSUMED");
  });
});

describe("idempotency", () => {
  it("re-processing the same return event produces no second row", () => {
    // First pass writes the classification.
    const first = classifyFullReturn(SHIPMENT, "ret-1");
    expect(first).toHaveLength(1);
    expect(first[0]!.quantity).toBe(2);

    // Second pass sees it already recorded and emits nothing. The database
    // enforces the same thing via UNIQUE(return_event_id, fulfillment_line_id).
    const classified = buildClassifiedQuantities(asRows(first));
    expect(classifyFullReturn(SHIPMENT, "ret-1", classified)).toHaveLength(0);
    expect(classifyFullReturn(SHIPMENT, "ret-1", classified)).toHaveLength(0);
  });

  it("full return after an earlier partial classifies only the remaining carton", () => {
    const partial = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "جزئي أولاً" },
      SHIPMENT,
      "ret-1",
    );
    const classified = buildClassifiedQuantities(asRows([partial]));

    const full = classifyFullReturn(SHIPMENT, "ret-2", classified);
    expect(full).toHaveLength(1);
    expect(full[0]!.quantity).toBe(1);              // not 2
    expect(full[0]!.originalTotalCostSnapshot).toBe(1000);

    // Both passes together write off exactly the two cartons that shipped.
    const all = [partial, ...full];
    expect(all.reduce((s, c) => s + c.quantity, 0)).toBe(2);
    expect(orderLevelReturnPackagingLoss(all)).toBe(2000);
  });

  it("no carton unit is ever classified twice", () => {
    const a = classifyFullReturn(SHIPMENT, "ret-1");
    const classified = buildClassifiedQuantities(asRows(a));
    const b = classifyFullReturn(SHIPMENT, "ret-2", classified);
    expect(b).toHaveLength(0);
    expect(orderLevelReturnPackagingLoss([...a, ...b])).toBe(2000); // not 4000
  });
});

describe("concurrency ceiling", () => {
  it("two simultaneous classifications cannot both take the last carton", () => {
    // Both callers read the same pre-state: 1 of 2 already classified.
    const shared = buildClassifiedQuantities([{ fulfillmentLineId: "line-carton", quantity: 1 }]);

    const winner = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "الأول" },
      SHIPMENT,
      "ret-2",
      shared,
    );
    expect(winner.quantity).toBe(1);

    // The loser's transaction re-reads under the advisory lock and now sees the
    // winner's row. In production that re-read happens inside the lock; here it
    // is the updated map, and the database trigger is the final backstop.
    const afterWinner = buildClassifiedQuantities([
      { fulfillmentLineId: "line-carton", quantity: 1 },
      { fulfillmentLineId: "line-carton", quantity: 1 },
    ]);
    const err = (() => {
      try {
        classifyAdminRecordedDamage(
          { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "الثاني" },
          SHIPMENT,
          "ret-3",
          afterWinner,
        );
      } catch (e) {
        return e as ReturnClassificationError;
      }
      return null;
    })();
    expect(err?.code).toBe("ALREADY_CLASSIFIED");
  });
});

describe("per-event versus order-level reporting", () => {
  it("each return event reports only its own loss", () => {
    const first = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "أول" },
      SHIPMENT,
      "ret-1",
    );
    const second = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "ثاني" },
      SHIPMENT,
      "ret-2",
      buildClassifiedQuantities(asRows([first])),
    );
    const all = [first, second];

    expect(lossForReturnEvent(all, "ret-1")).toBe(1000);
    expect(lossForReturnEvent(all, "ret-2")).toBe(1000);
    // NOT 2000 each — storing the cumulative total on every event would make an
    // order-level sum double count.
    expect(lossForReturnEvent(all, "ret-1")).not.toBe(2000);
  });

  it("order level equals the sum of the distinct events", () => {
    const first = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "أول" },
      SHIPMENT,
      "ret-1",
    );
    const second = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "ثاني" },
      SHIPMENT,
      "ret-2",
      buildClassifiedQuantities(asRows([first])),
    );
    const all = [first, second];
    const summed = (lossForReturnEvent(all, "ret-1") ?? 0) + (lossForReturnEvent(all, "ret-2") ?? 0);
    expect(orderLevelReturnPackagingLoss(all)).toBe(summed);
    expect(orderLevelReturnPackagingLoss(all)).toBe(2000);
  });

  it("still excludes the sticker and the card at every quantity", () => {
    const full = classifyFullReturn(SHIPMENT, "ret-1");
    const names = full.map((c) => c.materialNameSnapshot);
    expect(names).not.toContain("ملصق السعر");
    expect(names).not.toContain("كارت الشكر والتواصل");
    expect(totalReturnPackagingLoss(full)).toBe(2000); // cartons only, not 2150
  });
});
