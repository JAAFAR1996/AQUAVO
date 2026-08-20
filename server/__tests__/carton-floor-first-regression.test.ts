import { describe, expect, it } from "vitest";
import { planOrder } from "../services/carton-planner.js";
import { runEngine } from "../services/carton-geometry-adapter.js";
import { carton, item } from "./helpers/packing-factories.js";

// Regression from the real AQUAVO order shown in admin on 2026-08-21:
// one acrylic filter chamber measured 12×24×12 cm plus four 2.6×5.2×2.6 cm
// plant rings. The old one-pass 3-D heuristic chose the 40×40×30 carton because
// its first small-carton layout stacked rings on the acrylic piece; the safety
// layer correctly rejected that stack because the acrylic item cannot support
// items above it. A side-by-side floor layout does fit the 25×25×20 carton.
describe("floor-first cartonization regression", () => {
  const small = carton("BOX-S", 25, 25, 20, 10, { unitCost: 800, availableQty: 24 });
  const medium = carton("BOX-M", 40, 40, 30, 13.6, { unitCost: 920, availableQty: 24 });

  const acrylic = item("acrylic-filter-chamber", 12, 24, 12, 0.001, {
    name: "حجرة فلتر أكريليك شفافة",
    canSupportItemsAbove: false,
    maxSupportedWeightAboveG: null,
  });

  const rings = [1, 2, 3, 4].map((n) =>
    item(`plant-ring-${n}`, 2.6, 5.2, 2.6, 0.001, {
      name: "حلقة تثبيت نباتات — سيراميك بركاني",
      canSupportItemsAbove: false,
      maxSupportedWeightAboveG: null,
    }),
  );

  it("finds a floor-only layout in the 25×25×20 carton", () => {
    const packed = runEngine([small], [acrylic, ...rings]);
    expect(packed).not.toBeNull();
    expect(packed).toHaveLength(1);
    expect(packed![0]!.items).toHaveLength(5);
    expect(packed![0]!.items.every((p) => p.yMm === 0)).toBe(true);
    expect(packed![0]!.items.find((p) => p.key === acrylic.key)!.dyMm).toBeLessThanOrEqual(200);
  });

  it("chooses BOX-S instead of unnecessarily moving to BOX-M", () => {
    const result = planOrder({ items: [acrylic, ...rings], cartons: [medium, small] });
    expect(result.outcome).toBe("plan");
    if (result.outcome !== "plan") return;

    expect(result.cartons).toHaveLength(1);
    expect(result.cartons[0]!.carton.sku).toBe("BOX-S");
    expect(result.cartons[0]!.items.every((p) => p.yMm === 0)).toBe(true);
    expect(result.safety.ok).toBe(true);
  });
});
