// Accounting rules for packaging: which cost source wins, and what a return
// does (and does not) do to profit.
//
// The scenario the owner specified — carton 1,000 + sticker 50 + card 100 — is
// exercised end to end, because the failure this guards against is not a crash
// but a plausible wrong number.
import { describe, expect, it } from "vitest";
import {
  computeOrderProfit,
  isLegacyBoxCostEditable,
  resolvePackagingCost,
} from "../services/packaging-cost-resolver.js";
import {
  ReturnClassificationError,
  buildClassifiedQuantities,
  classifyAdminRecordedDamage,
  classifyFullReturn,
  isAdditiveReturnLoss,
  isFullReturnStatus,
  selectAutoClassifiableLines,
  totalReturnPackagingLoss,
  type ConsumedLine,
} from "../services/return-packaging-loss-service.js";

// The shipment the owner described: one carton plus the two per-order costs.
const CARTON: ConsumedLine = {
  lineId: "line-carton",
  eventId: "evt-1",
  materialId: "mat-carton",
  materialName: "كارتونة 27×20×14 سم",
  materialKind: "carton",
  quantity: 1,
  unitCostSnapshot: 1000,
  totalCost: 1000,
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
const SHIPMENT = [CARTON, STICKER, CARD];

// ── source of truth ──────────────────────────────────────────────────────────

describe("packaging cost source of truth", () => {
  it("uses the fulfillment snapshot when confirmed evidence exists", () => {
    const r = resolvePackagingCost(
      { boxCost: "500" },
      { eventCount: 1, totalFulfillmentCost: 850, status: "exact" },
    );
    expect(r.value).toBe(850);
    expect(r.source).toBe("fulfillment");
    expect(r.legacyBoxCost).toBe(500); // retained for audit, not used
  });

  it("falls back to legacy box_cost when there is no fulfillment evidence", () => {
    const r = resolvePackagingCost({ boxCost: "880" }, { eventCount: 0, totalFulfillmentCost: null, status: "unknown" });
    expect(r.value).toBe(880);
    expect(r.source).toBe("legacy_box_cost");
  });

  it("never adds the two sources together", () => {
    const r = resolvePackagingCost(
      { boxCost: "500" },
      { eventCount: 1, totalFulfillmentCost: 850, status: "exact" },
    );
    expect(r.value).not.toBe(1350);
    expect(r.value).toBe(850);
  });

  it("reports unknown rather than the legacy figure when a shipped carton has no cost", () => {
    // A confirmed shipment whose carton price was never recorded is UNKNOWN.
    // Silently reverting to the legacy number would hide a missing cost.
    const r = resolvePackagingCost(
      { boxCost: "700" },
      { eventCount: 1, totalFulfillmentCost: null, status: "incomplete" },
    );
    expect(r.value).toBeNull();
    expect(r.source).toBe("fulfillment");
  });

  it("leaves every legacy order's figure exactly as it is", () => {
    // Mirrors the 43 production orders with no fulfillment events: whatever
    // box_cost says today is what resolves, unchanged.
    for (const v of [0, 500, 880, null]) {
      const r = resolvePackagingCost({ boxCost: v }, { eventCount: 0, totalFulfillmentCost: null, status: "unknown" });
      expect(r.value).toBe(v === null ? null : v);
    }
  });

  it("locks manual box_cost edits once fulfillment evidence exists", () => {
    expect(isLegacyBoxCostEditable({ eventCount: 0, totalFulfillmentCost: null, status: "unknown" })).toBe(true);
    expect(isLegacyBoxCostEditable(null)).toBe(true);
    expect(isLegacyBoxCostEditable({ eventCount: 1, totalFulfillmentCost: 850, status: "exact" })).toBe(false);
  });
});

// ── profit ───────────────────────────────────────────────────────────────────

describe("order profit", () => {
  it("subtracts carton, sticker and card once each", () => {
    const packaging = resolvePackagingCost(
      { boxCost: 0 },
      { eventCount: 1, totalFulfillmentCost: 1150, status: "exact" },
    );
    const p = computeOrderProfit({ revenue: 20_000, cogs: 8_000, packaging });
    expect(p.packagingCost).toBe(1150);
    expect(p.netProfit).toBe(20_000 - 8_000 - 1_150);
    expect(p.complete).toBe(true);
  });

  it("does not subtract the delivery fee twice", () => {
    // revenue already arrives net of shipping, matching accounting-engine.ts.
    const collected = 25_000;
    const shipping = 5_000;
    const packaging = resolvePackagingCost({ boxCost: 0 }, { eventCount: 1, totalFulfillmentCost: 1150, status: "exact" });
    const p = computeOrderProfit({ revenue: collected - shipping, cogs: 8_000, packaging });
    expect(p.revenue).toBe(20_000);
    expect(p.netProfit).toBe(20_000 - 8_000 - 1_150);
    expect(p.netProfit).not.toBe(collected - shipping - shipping - 8_000 - 1_150);
  });

  it("reports null profit rather than a confident wrong number when cost is unknown", () => {
    const packaging = resolvePackagingCost({ boxCost: 0 }, { eventCount: 1, totalFulfillmentCost: null, status: "incomplete" });
    const p = computeOrderProfit({ revenue: 20_000, cogs: 8_000, packaging });
    expect(p.netProfit).toBeNull();
    expect(p.complete).toBe(false);
  });

  it("reports null profit when COGS is unknown", () => {
    const packaging = resolvePackagingCost({ boxCost: 0 }, { eventCount: 1, totalFulfillmentCost: 1150, status: "exact" });
    expect(computeOrderProfit({ revenue: 20_000, cogs: null, packaging }).netProfit).toBeNull();
  });
});

// ── returns ──────────────────────────────────────────────────────────────────

describe("returned order — carton only", () => {
  it("recognises the full-return statuses", () => {
    expect(isFullReturnStatus("returned")).toBe(true);
    expect(isFullReturnStatus("rejected_returned")).toBe(true);
    expect(isFullReturnStatus("rejected_carrier")).toBe(true);
    expect(isFullReturnStatus("delivered")).toBe(false);
  });

  it("classifies only the carton, never the sticker or the card", () => {
    const selected = selectAutoClassifiableLines(SHIPMENT);
    expect(selected).toHaveLength(1);
    expect(selected[0]!.lineId).toBe("line-carton");
  });

  it("full return of carton + 50 sticker + 100 card shows a 1,000 loss and nothing else", () => {
    const cls = classifyFullReturn(SHIPMENT, "ret-1");
    expect(cls).toHaveLength(1);
    expect(cls[0]!.materialNameSnapshot).toBe("كارتونة 27×20×14 سم");
    expect(cls[0]!.lossCategory).toBe("damaged_carton");
    expect(cls[0]!.classificationMode).toBe("automatic");
    expect(cls[0]!.isReclassificationOnly).toBe(true);
    expect(cls[0]!.reason).toBe("كارتونة تالفة بسبب طلب راجع");
    expect(totalReturnPackagingLoss(cls)).toBe(1000);

    const names = cls.map((c) => c.materialNameSnapshot);
    expect(names).not.toContain("ملصق السعر");
    expect(names).not.toContain("كارت الشكر والتواصل");
  });

  it("keeps the sticker and card inside the original 1,150 preparation snapshot", () => {
    const originalPreparation = SHIPMENT.reduce((s, l) => s + (l.totalCost ?? 0), 0);
    expect(originalPreparation).toBe(1150);
    // The return classifies 1,000 of that as a loss; it does not remove the 150.
    expect(totalReturnPackagingLoss(classifyFullReturn(SHIPMENT, "ret-1"))).toBe(1000);
  });

  it("does not deduct the carton cost a second time", () => {
    const packaging = resolvePackagingCost({ boxCost: 0 }, { eventCount: 1, totalFulfillmentCost: 1150, status: "exact" });
    const beforeReturn = computeOrderProfit({ revenue: 20_000, cogs: 8_000, packaging });

    const cls = classifyFullReturn(SHIPMENT, "ret-1");
    // Classification is display-only: profit is computed from the SAME resolved
    // packaging cost, before and after.
    const afterReturn = computeOrderProfit({ revenue: 20_000, cogs: 8_000, packaging });

    expect(cls.every((c) => c.isReclassificationOnly)).toBe(true);
    expect(afterReturn.netProfit).toBe(beforeReturn.netProfit);
    expect(afterReturn.netProfit).toBe(20_000 - 8_000 - 1_150);
    expect(afterReturn.netProfit).not.toBe(20_000 - 8_000 - 1_150 - 1_000);
  });

  it("excludes snapshot-sourced losses from additive expense totals", () => {
    expect(isAdditiveReturnLoss("manual")).toBe(true);
    expect(isAdditiveReturnLoss(null)).toBe(true); // legacy rows default to manual
    expect(isAdditiveReturnLoss("fulfillment_snapshot")).toBe(false);
  });

  it("handles a full return with several cartons", () => {
    const second: ConsumedLine = { ...CARTON, lineId: "line-carton-2", unitCostSnapshot: 1200, totalCost: 1200 };
    const cls = classifyFullReturn([CARTON, second, STICKER, CARD], "ret-1");
    expect(cls).toHaveLength(2);
    expect(totalReturnPackagingLoss(cls)).toBe(2200);
  });

  it("creates no duplicate classification when the return is processed again", () => {
    const first = classifyFullReturn(SHIPMENT, "ret-1");
    const classified = buildClassifiedQuantities(
      first.map((c) => ({ fulfillmentLineId: c.fulfillmentLineId, quantity: c.quantity })),
    );
    expect(classifyFullReturn(SHIPMENT, "ret-1", classified)).toHaveLength(0);
    expect(classifyFullReturn(SHIPMENT, "ret-1", classified)).toHaveLength(0); // and again
  });

  it("reports an unknown loss as null rather than under-reporting it", () => {
    const noCost: ConsumedLine = { ...CARTON, unitCostSnapshot: null, totalCost: null, costStatus: "unknown" };
    expect(totalReturnPackagingLoss(classifyFullReturn([noCost], "ret-1"))).toBeNull();
  });
});

describe("partial return", () => {
  it("classifies nothing automatically", () => {
    // The auto path is gated on the return STATUS. 'partial_return' is not a
    // full-return status, so the lifecycle never reaches classifyFullReturn and
    // no carton is written off without someone confirming it came back damaged.
    expect(isFullReturnStatus("partial_return")).toBe(false);
    expect(isFullReturnStatus("partial")).toBe(false);
  });

  it("accepts an explicitly confirmed damaged carton with a reason", () => {
    const c = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "رجع الكارتون متمزق" },
      SHIPMENT,
      "ret-1",
    );
    expect(c.classificationMode).toBe("admin_recorded");
    expect(c.quantity).toBe(1);
    expect(c.originalTotalCostSnapshot).toBe(1000);
    expect(c.reason).toBe("رجع الكارتون متمزق");
  });

  it("requires a reason", () => {
    expect(() =>
      classifyAdminRecordedDamage(
        { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "" },
        SHIPMENT,
        "ret-1",
      ),
    ).toThrow(ReturnClassificationError);
  });

  it("refuses to classify more cartons than the shipment actually consumed", () => {
    const err = (() => {
      try {
        classifyAdminRecordedDamage(
          { fulfillmentLineId: "line-carton", quantity: 3, lossCategory: "damaged_carton", reason: "محاولة تجاوز" },
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

  it("refuses a line that does not belong to this shipment", () => {
    const err = (() => {
      try {
        classifyAdminRecordedDamage(
          { fulfillmentLineId: "line-elsewhere", quantity: 1, lossCategory: "damaged_carton", reason: "سطر غريب" },
          SHIPMENT,
          "ret-1",
        );
      } catch (e) {
        return e as ReturnClassificationError;
      }
      return null;
    })();
    expect(err?.code).toBe("LINE_NOT_CONSUMED");
  });

  it("classifies one carton unit only once", () => {
    const classified = buildClassifiedQuantities([{ fulfillmentLineId: "line-carton", quantity: 1 }]);
    const err = (() => {
      try {
        classifyAdminRecordedDamage(
          { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "تكرار" },
          SHIPMENT,
          "ret-2",
          classified,
        );
      } catch (e) {
        return e as ReturnClassificationError;
      }
      return null;
    })();
    expect(err?.code).toBe("ALREADY_CLASSIFIED");
  });

  it("prices a partial quantity per unit rather than charging the whole line", () => {
    const multi: ConsumedLine = { ...CARTON, quantity: 3, unitCostSnapshot: 1000, totalCost: 3000 };
    const c = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "وحدة وحدة تلفت" },
      [multi],
      "ret-1",
    );
    expect(c.originalTotalCostSnapshot).toBe(1000);
  });

  it("does not restore carton stock — classification carries no movement", () => {
    const c = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "تالفة" },
      SHIPMENT,
      "ret-1",
    );
    // The shape itself has no inventory field: a classification cannot express a
    // stock change, which is the structural guarantee behind "never restored".
    expect(Object.keys(c)).not.toContain("movementType");
    expect(Object.keys(c)).not.toContain("quantityDelta");
    expect(c.isReclassificationOnly).toBe(true);
  });
});

describe("full return after an earlier partial carton classification", () => {
  it("tops up only the cartons not already classified", () => {
    const second: ConsumedLine = { ...CARTON, lineId: "line-carton-2", unitCostSnapshot: 1200, totalCost: 1200 };
    const shipment = [CARTON, second, STICKER, CARD];

    // Partial return earlier classified the first carton.
    const partial = classifyAdminRecordedDamage(
      { fulfillmentLineId: "line-carton", quantity: 1, lossCategory: "damaged_carton", reason: "تلفت بالإرجاع الجزئي" },
      shipment,
      "ret-1",
    );
    const classified = buildClassifiedQuantities([
      { fulfillmentLineId: partial.fulfillmentLineId, quantity: partial.quantity },
    ]);

    const full = classifyFullReturn(shipment, "ret-2", classified);
    expect(full).toHaveLength(1);
    expect(full[0]!.fulfillmentLineId).toBe("line-carton-2");

    // Total across both passes counts each carton exactly once.
    expect(totalReturnPackagingLoss([partial, ...full])).toBe(2200);
  });
});
