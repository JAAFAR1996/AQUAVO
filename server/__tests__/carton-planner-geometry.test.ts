// Geometry, fit and engine-contract tests for the carton planner.
//
// The "engine contract" block is deliberately testing a third-party library.
// binpackingjs is pinned to an exact version and its behaviour is load-bearing
// for upright handling and reproducibility, so a version bump that changes any
// of it must fail here rather than quietly ship a wrong plan.
import { describe, expect, it } from "vitest";
import { pack3D, RotationType, ALL_ROTATIONS } from "binpackingjs/3d";
import {
  DEFAULT_PACKING_POLICY,
  ROTATION,
  UPRIGHT_ROTATIONS,
} from "../../shared/packing-types.js";
import { planOrder } from "../services/carton-planner.js";
import { allowedRotationsFor, itemFitsCarton, runEngine } from "../services/carton-geometry-adapter.js";
import { carton, item } from "./helpers/packing-factories.js";

// ── engine contract ──────────────────────────────────────────────────────────

describe("binpackingjs 4.1.0 contract", () => {
  it("exposes all six rotation ordinals in the documented order", () => {
    expect(ALL_ROTATIONS).toEqual([0, 1, 2, 3, 4, 5]);
    expect(RotationType.WHD).toBe(ROTATION.WHD);
    expect(RotationType.DHW).toBe(ROTATION.DHW);
  });

  it("WHD and DHW are exactly the rotations that keep height on the vertical axis", () => {
    // A deliberately asymmetric box so each axis is distinguishable.
    const w = 30;
    const h = 70;
    const d = 50;
    const preserving: number[] = [];
    for (const r of ALL_ROTATIONS) {
      const res = pack3D({
        bins: [{ name: "b", width: 1000, height: 1000, depth: 1000, maxWeight: 1_000_000 }],
        items: [{ name: "i", width: w, height: h, depth: d, weight: 1, allowedRotations: [r] }],
      });
      const placed = res.packedBins[0]!.items[0]!;
      if (placed.dimension[1] === h) preserving.push(r);
    }
    expect(preserving.sort()).toEqual([...UPRIGHT_ROTATIONS].sort());
  });

  it("returns placement coordinates and unfit items", () => {
    const res = pack3D({
      bins: [{ name: "b", width: 100, height: 100, depth: 100, maxWeight: 1000 }],
      items: [
        { name: "fits", width: 50, height: 50, depth: 50, weight: 10 },
        { name: "huge", width: 500, height: 500, depth: 500, weight: 10 },
      ],
    });
    expect(res.packedBins[0]!.items[0]!.position).toHaveLength(3);
    expect(res.unfitItems.map((i) => i.name)).toEqual(["huge"]);
  });

  it("is deterministic across 100 identical runs", () => {
    const build = () =>
      pack3D({
        bins: [{ name: "b", width: 400, height: 300, depth: 200, maxWeight: 100_000 }],
        items: [
          { name: "a", width: 150, height: 90, depth: 80, weight: 500 },
          { name: "b", width: 150, height: 90, depth: 80, weight: 500 },
          { name: "c", width: 120, height: 60, depth: 60, weight: 300 },
        ],
      });
    const first = JSON.stringify(build());
    for (let i = 0; i < 99; i++) expect(JSON.stringify(build())).toBe(first);
  });

  it("handles the decimal measurements present in the owner spreadsheet", () => {
    // 19.5 / 8.6 / 2.4 cm as tenths of a mm-free integer scale: we feed mm.
    const res = pack3D({
      bins: [{ name: "b", width: 400, height: 300, depth: 200, maxWeight: 100_000 }],
      items: [{ name: "a", width: 195, height: 86, depth: 24, weight: 500 }],
    });
    const p = res.packedBins[0]!.items[0]!;
    expect(p.dimension.reduce((x, y) => x + y, 0)).toBe(195 + 86 + 24);
  });
});

// ── rotation policy ──────────────────────────────────────────────────────────

describe("rotation policy", () => {
  it("locks an unrotatable item to a single orientation", () => {
    expect(allowedRotationsFor(item("x", 10, 10, 10, 1, { rotationAllowed: false }))).toEqual([
      ROTATION.WHD,
    ]);
  });

  it("gives an upright item exactly the two vertical-preserving rotations", () => {
    expect(allowedRotationsFor(item("x", 10, 10, 10, 1, { mustStayUpright: true }))).toEqual(
      UPRIGHT_ROTATIONS,
    );
  });

  it("gives a free item all six", () => {
    expect(allowedRotationsFor(item("x", 10, 10, 10, 1))).toHaveLength(6);
  });
});

// ── dimensional fit ──────────────────────────────────────────────────────────

describe("dimensional fit", () => {
  const box = carton("C1", 30, 20, 15, 10);

  it("accepts an exact fit", () => {
    expect(itemFitsCarton(item("exact", 30, 15, 20, 1, { rotationAllowed: true }), box)).toBe(true);
  });

  it("rejects when volume fits but a single dimension does not", () => {
    // 40x2x2 cm = 160 cm³, far below the carton's 9000 cm³ — but 40 cm exceeds
    // every carton dimension, so no orientation can hold it.
    const skewer = item("skewer", 40, 2, 2, 0.2);
    expect(itemFitsCarton(skewer, box)).toBe(false);
    const res = planOrder({ items: [skewer], cartons: [box] });
    expect(res.outcome).toBe("manual_review");
    if (res.outcome === "manual_review") expect(res.code).toBe("NO_CARTON_FITS");
  });

  it("fits lying down but not standing when upright is required", () => {
    // 40 cm tall vs a 15 cm carton: only a rotation may save it.
    const tall = item("tall", 10, 40, 10, 1);
    expect(itemFitsCarton(tall, carton("C2", 45, 20, 15, 10))).toBe(true);

    const uprightOnly = item("tall-upright", 10, 40, 10, 1, { mustStayUpright: true });
    expect(itemFitsCarton(uprightOnly, carton("C2", 45, 20, 15, 10))).toBe(false);
  });

  it("rejects an item heavier than the carton maximum", () => {
    expect(itemFitsCarton(item("heavy", 10, 10, 10, 25), box)).toBe(false);
  });

  it("ignores cartons with no available stock", () => {
    const res = planOrder({
      items: [item("a", 10, 5, 10, 1)],
      cartons: [carton("EMPTY", 30, 20, 15, 10, { availableQty: 0 })],
    });
    expect(res.outcome).toBe("manual_review");
    if (res.outcome === "manual_review") expect(res.code).toBe("NO_ACTIVE_CARTON");
  });
});

// ── planning outcomes ────────────────────────────────────────────────────────

describe("planning outcomes", () => {
  it("packs several identical products into one carton", () => {
    const items = [1, 2, 3, 4].map((n) => item(`p-${n}`, 8, 4, 8, 0.4));
    const res = planOrder({ items, cartons: [carton("C", 20, 20, 10, 20)] });
    expect(res.outcome).toBe("plan");
    if (res.outcome !== "plan") return;
    expect(res.cartons).toHaveLength(1);
    expect(res.cartons[0]!.items).toHaveLength(4);
  });

  it("packs mixed products", () => {
    const res = planOrder({
      items: [item("big", 15, 5, 10, 1), item("small", 6, 4, 6, 0.3)],
      cartons: [carton("C", 25, 20, 12, 20)],
    });
    expect(res.outcome).toBe("plan");
  });

  it("opens a second carton when one is not enough", () => {
    // Each item is 18x9x18 cm; the carton holds one per layer and is 10 cm tall.
    const items = [1, 2].map((n) =>
      item(`bulk-${n}`, 18, 9, 18, 2, { canSupportItemsAbove: false }),
    );
    const res = planOrder({ items, cartons: [carton("C", 20, 20, 10, 20)] });
    expect(res.outcome).toBe("plan");
    if (res.outcome !== "plan") return;
    expect(res.cartons.length).toBeGreaterThanOrEqual(2);
  });

  it("reports manual review with the exact Arabic message when data is missing", () => {
    const res = planOrder({
      items: [],
      cartons: [carton("C", 20, 20, 10, 20)],
      missing: [
        { productId: "p1", variantId: null, productName: "هيتر ستيل 100 واط", missing: ["packed_depth_cm", "packed_weight_kg"] },
      ],
    });
    expect(res.outcome).toBe("manual_review");
    if (res.outcome !== "manual_review") return;
    expect(res.code).toBe("MISSING_PACKING_DATA");
    expect(res.messageAr).toBe("يحتاج اختيار كارتونة يدوياً — سماكة أو وزن أحد المنتجات ناقص");
    expect(res.missing[0]!.productName).toBe("هيتر ستيل 100 واط");
    expect(res.missing[0]!.missing).toContain("packed_depth_cm");
  });

  it("keeps a plan whose carton cost is unknown, but marks it incomplete", () => {
    const res = planOrder({
      items: [item("a", 8, 4, 8, 0.4)],
      cartons: [carton("NOCOST", 20, 20, 10, 20, { unitCost: null })],
    });
    expect(res.outcome).toBe("plan");
    if (res.outcome !== "plan") return;
    expect(res.costStatus).toBe("incomplete");
    expect(res.totalKnownCost).toBeNull();
  });

  it("prefers a fully-costed plan over an equal-size plan with unknown cost", () => {
    const known = carton("KNOWN", 20, 20, 10, 20, { unitCost: 900 });
    const unknown = carton("UNKNOWN", 20, 20, 10, 20, { unitCost: null });
    const res = planOrder({ items: [item("a", 8, 4, 8, 0.4)], cartons: [unknown, known] });
    expect(res.outcome).toBe("plan");
    if (res.outcome !== "plan") return;
    expect(res.cartons[0]!.carton.sku).toBe("KNOWN");
  });

  it("gives a requires_separate_carton item its own carton", () => {
    const res = planOrder({
      items: [
        item("solo", 8, 4, 8, 0.4, { requiresSeparateCarton: true }),
        item("other", 8, 4, 8, 0.4),
      ],
      cartons: [carton("C", 20, 20, 10, 20)],
    });
    expect(res.outcome).toBe("plan");
    if (res.outcome !== "plan") return;
    expect(res.cartons).toHaveLength(2);
    for (const c of res.cartons) expect(c.items).toHaveLength(1);
  });

  it("chooses the smallest carton that works", () => {
    const res = planOrder({
      items: [item("a", 8, 4, 8, 0.4)],
      cartons: [carton("BIG", 60, 60, 60, 50), carton("SMALL", 20, 20, 10, 20)],
    });
    expect(res.outcome).toBe("plan");
    if (res.outcome !== "plan") return;
    expect(res.cartons[0]!.carton.sku).toBe("SMALL");
  });

  it("produces an identical plan hash across 100 runs", () => {
    const build = () =>
      planOrder({
        items: [
          item("a", 8, 4, 8, 0.4),
          item("b", 8, 4, 8, 0.4),
          item("c", 6, 3, 6, 0.2),
        ],
        cartons: [carton("C1", 20, 20, 10, 20), carton("C2", 30, 30, 15, 30)],
        policy: DEFAULT_PACKING_POLICY,
      });
    const first = build();
    expect(first.outcome).toBe("plan");
    if (first.outcome !== "plan") return;
    for (let i = 0; i < 99; i++) {
      const again = build();
      expect(again.outcome).toBe("plan");
      if (again.outcome !== "plan") return;
      expect(again.planHash).toBe(first.planHash);
      expect(again.explanationAr).toBe(first.explanationAr);
    }
  });

  it("explains the plan in Arabic with positions and carton dimensions", () => {
    const res = planOrder({
      items: [item("منتج تجريبي", 8, 4, 8, 0.4)],
      cartons: [carton("C", 20, 20, 10, 20)],
    });
    expect(res.outcome).toBe("plan");
    if (res.outcome !== "plan") return;
    expect(res.explanationAr).toContain("كارتونة 1 من 1");
    expect(res.explanationAr).toContain("استغلال الارتفاع");
    expect(res.explanationAr).toContain("مسنود على أرضية الكارتونة");
  });

  it("returns null placements never — every item is placed or the plan is rejected", () => {
    const packed = runEngine(
      [carton("TINY", 5, 5, 5, 10)],
      [item("toobig", 40, 40, 40, 1)],
    );
    expect(packed).toBeNull();
  });
});
