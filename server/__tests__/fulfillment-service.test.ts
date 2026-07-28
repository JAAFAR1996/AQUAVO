import { describe, it, expect } from "vitest";
import {
  fulfillmentIdempotencyKey, freezeLine, summarizeLines, computeVariance,
} from "../services/fulfillment-service.js";

describe("fulfillment service — pure cost logic", () => {
  it("idempotency key is stable per (order,type,request) → retries map to one event", () => {
    const k1 = fulfillmentIdempotencyKey("ord-1", "original", "req-abc");
    const k2 = fulfillmentIdempotencyKey("ord-1", "original", "req-abc");
    const k3 = fulfillmentIdempotencyKey("ord-1", "reshipment", "req-abc");
    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
  });

  it("(scenario 3) a verified-zero material stays a real 0 and is EXACT", () => {
    const l = freezeLine({ materialId: "m1", materialName: "Free sticker", quantity: 2, unitCost: 0 });
    expect(l.unitCost).toBe(0);
    expect(l.totalCost).toBe(0);
    expect(l.costStatus).toBe("exact");
  });

  it("(scenario 4) an unknown material cost stays NULL and makes the line unknown", () => {
    const l = freezeLine({ materialId: "m1", materialName: "Box", quantity: 1, unitCost: null });
    expect(l.unitCost).toBeNull();
    expect(l.totalCost).toBeNull();
    expect(l.costStatus).toBe("unknown");
  });

  it("freezes total = qty * unitCost for a known line", () => {
    const l = freezeLine({ materialId: "m1", materialName: "Box", quantity: 3, unitCost: 1500 });
    expect(l.totalCost).toBe(4500);
    expect(l.costStatus).toBe("exact");
  });

  it("summarizeLines: all known → exact actual cost", () => {
    const s = summarizeLines([
      freezeLine({ materialId: "m1", materialName: "Box", quantity: 1, unitCost: 1500 }),
      freezeLine({ materialId: "m2", materialName: "Sticker", quantity: 2, unitCost: 200 }),
    ]);
    expect(s.actualCost).toBe(1900);
    expect(s.status).toBe("exact");
    expect(s.unknownLines).toBe(0);
  });

  it("summarizeLines: any unknown line → actual cost NULL, incomplete (never 0)", () => {
    const s = summarizeLines([
      freezeLine({ materialId: "m1", materialName: "Box", quantity: 1, unitCost: 1500 }),
      freezeLine({ materialId: "m2", materialName: "Tape", quantity: 1, unitCost: null }),
    ]);
    expect(s.actualCost).toBeNull();
    expect(s.status).toBe("incomplete");
    expect(s.unknownLines).toBe(1);
  });

  it("(scenario 10) variance = actual − expected; NULL when either unknown", () => {
    expect(computeVariance(2000, 2300)).toBe(300);
    expect(computeVariance(2000, null)).toBeNull();
    expect(computeVariance(null, 2300)).toBeNull();
  });

  it("empty lines → unknown, not a fabricated 0", () => {
    const s = summarizeLines([]);
    expect(s.actualCost).toBeNull();
    expect(s.status).toBe("unknown");
  });
});
