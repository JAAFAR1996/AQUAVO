import { describe, expect, it } from "vitest";
import { summarisePackingCompleteness } from "../services/packing-data-summary.js";

describe("packing completeness summary", () => {
  it("counts each missing required field and the unique affected products", () => {
    const result = summarisePackingCompleteness([
      {
        productId: "p1",
        productName: "منتج ناقص أكثر من حقل",
        variantId: null,
        packedHeightCm: null,
        packedWidthCm: 10,
        packedDepthCm: null,
        packedWeightKg: null,
        manualReview: false,
      },
      {
        productId: "p2",
        productName: "منتج مكتمل",
        variantId: null,
        packedHeightCm: 20,
        packedWidthCm: 10,
        packedDepthCm: 5,
        packedWeightKg: 1,
        manualReview: false,
      },
      {
        productId: "p3",
        productName: "منتج يحتاج مراجعة",
        variantId: null,
        packedHeightCm: 20,
        packedWidthCm: null,
        packedDepthCm: 5,
        packedWeightKg: 1,
        manualReview: true,
      },
    ]);

    expect(result.summary).toEqual({
      withoutHeight: 1,
      withoutWidth: 1,
      withoutDepth: 1,
      withoutWeight: 1,
      complete: 1,
      manualReview: 1,
      affectedUnique: 2,
      total: 3,
    });
    expect(result.items.find((item) => item.productId === "p1")?.missing).toEqual([
      "packed_height_cm",
      "packed_depth_cm",
      "packed_weight_kg",
    ]);
  });

  it("ignores optional packing fields because the planner does not require them", () => {
    const source = {
      productId: "p1",
      productName: "منتج مكتمل",
      variantId: null,
      packedHeightCm: 1,
      packedWidthCm: 2,
      packedDepthCm: 3,
      packedWeightKg: 4,
      manualReview: false,
      foldable: null,
      fragile: null,
      safetyAllowanceCm: null,
    };
    const result = summarisePackingCompleteness([source]);
    expect(result.summary.complete).toBe(1);
    expect(result.summary.affectedUnique).toBe(0);
    expect(result.items[0]?.missing).toEqual([]);
  });
});
