// Physical stacking and load-distribution tests.
//
// These drive `validatePlanSafety` with hand-built placements rather than going
// through the engine. That is intentional: the point is to pin the SAFETY rules
// at exact coordinates, and letting a packer choose the coordinates would make
// the assertions depend on its heuristics instead of on our physics.
//
// All coordinates are millimetres, all weights grams — the same integer units
// the production path uses.
import { describe, expect, it } from "vitest";
import {
  BP,
  DEFAULT_PACKING_POLICY,
  type PackedCarton,
  type PlacedItem,
} from "../../shared/packing-types.js";
import { validatePlanSafety } from "../services/carton-safety-validator.js";
import { distributeLoad } from "../services/carton-load-distributor.js";
import {
  analyseCartonSupport,
  contactRect,
  rectArea,
  type SupportEdge,
} from "../services/carton-support-analyzer.js";
import { box, carton, item, placed } from "./helpers/packing-factories.js";

const P = DEFAULT_PACKING_POLICY;
const codes = (r: ReturnType<typeof validatePlanSafety>) => r.rejections.map((x) => x.code);

// ── contact geometry ─────────────────────────────────────────────────────────

describe("contact rectangle", () => {
  it("computes the shared footprint of two placements", () => {
    const a = placed("a", item("a", 0, 0, 0, 1), 0, 0, 0, 1000, 500, 1000);
    const b = placed("b", item("b", 0, 0, 0, 1), 400, 500, 300, 1000, 500, 1000);
    const r = contactRect(a, b)!;
    expect(r).toEqual({ x0: 400, z0: 300, x1: 1000, z1: 1000 });
    expect(rectArea(r)).toBe(600 * 700);
  });

  it("treats edge-to-edge touching as no contact", () => {
    const a = placed("a", item("a", 0, 0, 0, 1), 0, 0, 0, 500, 500, 500);
    const b = placed("b", item("b", 0, 0, 0, 1), 500, 500, 0, 500, 500, 500);
    expect(contactRect(a, b)).toBeNull();
  });
});

// ── support ──────────────────────────────────────────────────────────────────

describe("stack support", () => {
  it("accepts a clean two-layer stack", () => {
    const base = placed("base", item("base", 0, 0, 0, 2), 0, 0, 0, 500, 300, 500);
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 500, 200, 500);
    const r = validatePlanSafety(box([base, top]), P);
    expect(r.ok).toBe(true);
    expect(r.supportRatioBp["top"]).toBe(BP);
  });

  it("accepts three vertical layers inside the carton height", () => {
    const a = placed("a", item("a", 0, 0, 0, 1), 0, 0, 0, 400, 200, 400);
    const b = placed("b", item("b", 0, 0, 0, 1), 0, 200, 0, 400, 200, 400);
    const c = placed("c", item("c", 0, 0, 0, 1), 0, 400, 0, 400, 200, 400);
    const r = validatePlanSafety(box([a, b, c]), P);
    expect(r.ok).toBe(true);
  });

  it("rejects a floating item", () => {
    const base = placed("base", item("base", 0, 0, 0, 1), 0, 0, 0, 400, 200, 400);
    const floater = placed("floater", item("floater", 0, 0, 0, 1), 0, 500, 0, 400, 200, 400);
    expect(codes(validatePlanSafety(box([base, floater]), P))).toContain("FLOATING_ITEM");
  });

  it("rejects support below the minimum ratio", () => {
    // 100 mm of a 500 mm-wide base = 20 %, well under the 80 % floor.
    const base = placed("base", item("base", 0, 0, 0, 2), 0, 0, 0, 100, 300, 500);
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 500, 200, 500);
    const r = validatePlanSafety(box([base, top]), P);
    expect(codes(r)).toContain("SUPPORT_RATIO_TOO_LOW");
    expect(r.supportRatioBp["top"]).toBe(2_000);
  });

  it("does not count a contact smaller than 1 cm² as support", () => {
    // 5 mm x 5 mm = 25 mm², below the 100 mm² floor -> the item is floating.
    const base = placed("base", item("base", 0, 0, 0, 2), 0, 0, 0, 5, 300, 5);
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 500, 200, 500);
    expect(codes(validatePlanSafety(box([base, top]), P))).toContain("FLOATING_ITEM");
  });

  it("rejects an unsupported cantilever beyond the overhang limit", () => {
    // Base covers x 0..400 of a 500-wide top: 80 % ratio passes, but the
    // 100 mm overhang on one edge is 20 %+ and must be caught.
    const base = placed("base", item("base", 0, 0, 0, 2), 0, 0, 0, 400, 300, 500);
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 500, 200, 500);
    const over = { ...top, item: { ...top.item, maxOverhangRatioBp: 1_000 } };
    expect(codes(validatePlanSafety(box([base, over]), P))).toContain("OVERHANG_TOO_LARGE");
  });

  it("rejects when the centre of mass falls outside the support polygon", () => {
    // Support only on the far left; the top's centre sits over thin air.
    const base = placed("base", item("base", 0, 0, 0, 2), 0, 0, 0, 200, 300, 1000);
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 1000, 200, 1000);
    const lenient = {
      ...top,
      item: { ...top.item, minSupportRatioBp: 1, maxOverhangRatioBp: BP - 1 },
    };
    expect(codes(validatePlanSafety(box([base, lenient]), P))).toContain(
      "CENTRE_OF_MASS_UNSUPPORTED",
    );
  });

  it("accepts an item bridging two supports with a gap between them", () => {
    // Classic table-legs case: the hull spans the gap, so it is stable.
    const l = placed("l", item("l", 0, 0, 0, 2), 0, 0, 0, 450, 300, 1000);
    const r = placed("r", item("r", 0, 0, 0, 2), 550, 0, 0, 450, 300, 1000);
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 1000, 200, 1000);
    const res = validatePlanSafety(box([l, r, top]), P);
    expect(res.ok).toBe(true);
    expect(res.supportRatioBp["top"]).toBe(9_000);
  });

  it("never puts anything on a fragile product", () => {
    const fragile = placed("fragile", item("fragile", 0, 0, 0, 2, { fragile: true }), 0, 0, 0, 500, 300, 500);
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 500, 200, 500);
    expect(codes(validatePlanSafety(box([fragile, top]), P))).toContain("SUPPORTER_IS_FRAGILE");
  });

  it("never puts anything on a product that forbids stacking", () => {
    const base = placed(
      "base",
      item("base", 0, 0, 0, 2, { canSupportItemsAbove: false }),
      0, 0, 0, 500, 300, 500,
    );
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 500, 200, 500);
    expect(codes(validatePlanSafety(box([base, top]), P))).toContain("SUPPORTER_FORBIDS_STACKING");
  });

  it("never puts anything on a compressible product", () => {
    const base = placed("base", item("base", 0, 0, 0, 2, { compressible: true }), 0, 0, 0, 500, 300, 500);
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 500, 200, 500);
    expect(codes(validatePlanSafety(box([base, top]), P))).toContain("SUPPORTER_IS_COMPRESSIBLE");
  });

  it("applies the stricter fragile floor to a fragile item on top", () => {
    // 90 % support: fine for a normal item, short of the 95 % fragile floor.
    const base = placed("base", item("base", 0, 0, 0, 2), 0, 0, 0, 900, 300, 1000);
    const mk = (fragile: boolean) =>
      placed("top", item("top", 0, 0, 0, 1, { fragile }), 0, 300, 0, 1000, 200, 1000);
    expect(validatePlanSafety(box([base, mk(false)]), P).ok).toBe(true);
    expect(codes(validatePlanSafety(box([base, mk(true)]), P))).toContain("SUPPORT_RATIO_TOO_LOW");
  });

  it("honours requires_full_base_support at 99 %", () => {
    const base = placed("base", item("base", 0, 0, 0, 2), 0, 0, 0, 990, 300, 1000);
    const top = placed(
      "top",
      item("top", 0, 0, 0, 1, { requiresFullBaseSupport: true }),
      0, 300, 0, 1000, 200, 1000,
    );
    expect(codes(validatePlanSafety(box([base, top]), P))).toContain("SUPPORT_RATIO_TOO_LOW");
  });
});

// ── load distribution ────────────────────────────────────────────────────────

describe("load distribution", () => {
  /** Two supporters side by side, splitting the top item's footprint. */
  function twoSupporters(leftWidth: number, topWeightKg: number) {
    const left = placed("left", item("left", 0, 0, 0, 1), 0, 0, 0, leftWidth, 300, 1000);
    const right = placed(
      "right",
      item("right", 0, 0, 0, 1),
      leftWidth, 0, 0, 1000 - leftWidth, 300, 1000,
    );
    const top = placed("top", item("top", 0, 0, 0, topWeightKg), 0, 300, 0, 1000, 200, 1000);
    return { left, right, top, items: [left, right, top] };
  }

  it("splits an upper item's weight between two supporters instead of doubling it", () => {
    const { items } = twoSupporters(500, 2);
    const r = validatePlanSafety(box(items), P);
    expect(r.ok).toBe(true);
    expect(r.loadOnG["left"]).toBe(1000);
    expect(r.loadOnG["right"]).toBe(1000);
    expect(r.loadOnG["left"]! + r.loadOnG["right"]!).toBe(2000); // not 4000
  });

  it("splits by contact area when the areas are unequal", () => {
    const { items } = twoSupporters(700, 1); // 70 % / 30 %
    const r = validatePlanSafety(box(items), P);
    expect(r.loadOnG["left"]).toBe(700);
    expect(r.loadOnG["right"]).toBe(300);
  });

  it("propagates inherited load down three layers", () => {
    const a = placed("a", item("a", 0, 0, 0, 3), 0, 0, 0, 400, 200, 400);
    const b = placed("b", item("b", 0, 0, 0, 2), 0, 200, 0, 400, 200, 400);
    const c = placed("c", item("c", 0, 0, 0, 1), 0, 400, 0, 400, 200, 400);
    const r = validatePlanSafety(box([a, b, c]), P);
    expect(r.loadOnG["c"]).toBe(0);
    expect(r.loadOnG["b"]).toBe(1000); // just c
    expect(r.loadOnG["a"]).toBe(3000); // b + c
  });

  it("rejects when one supporter is over its limit even though the other is not", () => {
    const left = placed(
      "left",
      item("left", 0, 0, 0, 1, { maxSupportedWeightAboveG: 500 }),
      0, 0, 0, 700, 300, 1000,
    );
    const right = placed(
      "right",
      item("right", 0, 0, 0, 1, { maxSupportedWeightAboveG: 5000 }),
      700, 0, 0, 300, 300, 1000,
    );
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 1000, 200, 1000);
    const r = validatePlanSafety(box([left, right, top]), P);
    expect(r.ok).toBe(false);
    const over = r.rejections.filter((x) => x.code === "LOAD_EXCEEDS_LIMIT");
    expect(over).toHaveLength(1);
    expect(over[0]!.itemKey).toBe("left");
    expect(over[0]!.observed).toBe(700);
    expect(over[0]!.limit).toBe(500);
  });

  it("rejects a supporter whose capacity is unknown rather than assuming it is unlimited", () => {
    const base = placed(
      "base",
      item("base", 0, 0, 0, 2, { maxSupportedWeightAboveG: null }),
      0, 0, 0, 500, 300, 500,
    );
    const top = placed("top", item("top", 0, 0, 0, 1), 0, 300, 0, 500, 200, 500);
    expect(codes(validatePlanSafety(box([base, top]), P))).toContain("SUPPORT_LIMIT_UNKNOWN");
  });

  it("conserves mass exactly — no gram invented, none lost", () => {
    // Three uneven contacts force a floor() remainder to be redistributed.
    const s1 = placed("s1", item("s1", 0, 0, 0, 1), 0, 0, 0, 333, 300, 1000);
    const s2 = placed("s2", item("s2", 0, 0, 0, 1), 333, 0, 0, 333, 300, 1000);
    const s3 = placed("s3", item("s3", 0, 0, 0, 1), 666, 0, 0, 334, 300, 1000);
    const top = placed("top", item("top", 0, 0, 0, 1.001), 0, 300, 0, 1000, 200, 1000);
    const r = validatePlanSafety(box([s1, s2, s3, top]), P);
    const total = r.loadOnG["s1"]! + r.loadOnG["s2"]! + r.loadOnG["s3"]!;
    expect(total).toBe(1001);
  });

  it("rejects a cyclic support graph instead of looping forever", () => {
    const a = placed("a", item("a", 0, 0, 0, 1), 0, 0, 0, 400, 200, 400);
    const b = placed("b", item("b", 0, 0, 0, 1), 0, 200, 0, 400, 200, 400);
    // Fabricated edges: a supports b AND b supports a. Geometry cannot produce
    // this, but the distributor must refuse rather than trust its input.
    const edges = new Map<string, SupportEdge[]>([
      ["a", [{ supporter: b, rect: { x0: 0, z0: 0, x1: 400, z1: 400 }, areaMm2: 160_000 }]],
      ["b", [{ supporter: a, rect: { x0: 0, z0: 0, x1: 400, z1: 400 }, areaMm2: 160_000 }]],
    ]);
    const r = distributeLoad(0, [a, b], edges, P);
    expect(r.rejections.map((x) => x.code)).toContain("SUPPORT_CYCLE");
  });

  it("charges nothing to an item resting on the carton floor with nothing above", () => {
    const only = placed("only", item("only", 0, 0, 0, 5), 0, 0, 0, 400, 200, 400);
    const analysis = analyseCartonSupport(0, [only], P);
    const r = distributeLoad(0, [only], analysis.edgesByItem, P);
    expect(r.loadG["only"]).toBe(0);
    expect(r.rejections).toHaveLength(0);
  });
});

// ── carton-level checks ──────────────────────────────────────────────────────

describe("carton-level validation", () => {
  it("rejects contents heavier than the carton maximum", () => {
    const heavy = placed("heavy", item("heavy", 0, 0, 0, 50), 0, 0, 0, 400, 200, 400);
    const c: PackedCarton[] = [
      { cartonIndex: 0, carton: carton("W", 100, 100, 100, 10), items: [heavy] },
    ];
    expect(codes(validatePlanSafety(c, P))).toContain("CARTON_WEIGHT_EXCEEDED");
  });

  it("rejects items that intersect", () => {
    const a = placed("a", item("a", 0, 0, 0, 1), 0, 0, 0, 400, 200, 400);
    const b = placed("b", item("b", 0, 0, 0, 1), 200, 0, 200, 400, 200, 400);
    expect(codes(validatePlanSafety(box([a, b]), P))).toContain("COLLISION");
  });

  it("rejects items outside the carton interior", () => {
    const a = placed("a", item("a", 0, 0, 0, 1), 900, 0, 0, 400, 200, 400);
    const c: PackedCarton[] = [
      { cartonIndex: 0, carton: carton("S", 100, 100, 100, 1000), items: [a] },
    ];
    expect(codes(validatePlanSafety(c, P))).toContain("OUT_OF_BOUNDS");
  });

  it("rejects an upright-only item lying on its side", () => {
    const spec = item("upright", 40, 90, 40, 1, { mustStayUpright: true });
    // Height 900 mm was measured, but only 400 mm is occupied vertically.
    const lying = placed("upright", spec, 0, 0, 0, 900, 400, 400);
    expect(codes(validatePlanSafety(box([lying]), P))).toContain("ORIENTATION_VIOLATION");
  });

  it("accepts an upright-only item standing correctly", () => {
    const spec = item("upright", 40, 90, 40, 1, { mustStayUpright: true });
    const standing = placed("upright", spec, 0, 0, 0, 400, 900, 400);
    expect(validatePlanSafety(box([standing]), P).ok).toBe(true);
  });
});
