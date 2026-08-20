import { describe, expect, it } from "vitest";
import {
  extractExplicitDimensions,
  extractExplicitNetWeightKg,
  resolveSmartPacking,
} from "../services/smart-packing-resolver.js";

describe("smart packing resolver", () => {
  it("parses Arabic millimetre dimensions from product specs", () => {
    expect(
      extractExplicitDimensions({ القياس: "52×26 ملم بحسب بيانات المنتج" })?.valuesCm,
    ).toEqual([5.2, 2.6]);
  });

  it("parses Arabic product weight", () => {
    expect(extractExplicitNetWeightKg({ الوزن: "300 جم" })).toBe(0.3);
  });

  it("reuses owner stocktake package measurements and estimates only the missing depth", () => {
    const result = resolveSmartPacking({
      productName: "حجرة فلتر أكريليك شفافة",
      specifications: { المادة: "أكريليك شفاف" },
      legacyPackageLengthCm: 24,
      legacyPackageWidthCm: 12,
    });

    expect(result.heightCm).toBe(24);
    expect(result.widthCm).toBe(12);
    expect(result.depthCm).toBe(12);
    expect(result.recommendationReady).toBe(true);
    expect(result.weightUnknown).toBe(true);
    expect(result.canonicalComplete).toBe(false);
    expect(result.sources).toContain("owner_stocktake");
    expect(result.sources).toContain("estimated_depth");
  });

  it("can make a geometry recommendation from the planting-ring catalogue measurement", () => {
    const result = resolveSmartPacking({
      productName: "حلقة تثبيت نباتات — سيراميك بركاني",
      specifications: { القياس: "52×26 ملم بحسب بيانات المنتج" },
    });

    expect(result.heightCm).toBe(5.2);
    expect(result.widthCm).toBe(2.6);
    expect(result.depthCm).toBe(2.6);
    expect(result.recommendationReady).toBe(true);
    expect(result.weightUnknown).toBe(true);
  });

  it("never downgrades a complete canonical measurement to an estimate", () => {
    const result = resolveSmartPacking({
      productName: "منتج مقاس",
      specifications: { الأبعاد: "99×99×99 سم" },
      canonical: {
        packedHeightCm: 10,
        packedWidthCm: 8,
        packedDepthCm: 4,
        packedWeightKg: 0.5,
      },
    });

    expect(result.canonicalComplete).toBe(true);
    expect(result.estimated).toBe(false);
    expect([result.heightCm, result.widthCm, result.depthCm, result.weightKg]).toEqual([10, 8, 4, 0.5]);
  });
});
