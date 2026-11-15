import { describe, expect, it } from "vitest";

import {
  getProductDisplayBrand,
  getProductDisplayIdentity,
  getProductDisplayName,
  isSoldByKilogram,
} from "../product-display";

describe("product display identity", () => {
  it("moves YEE out of an Arabic product name without changing the rest", () => {
    expect(
      getProductDisplayName("مضخة هواء YEE صغيرة — 3 واط", "YEE"),
    ).toBe("مضخة هواء صغيرة — 3 واط");
  });

  it("removes a brand before a dash cleanly", () => {
    expect(
      getProductDisplayName("مضخة هواء SUNSUN — منفذان", "SUNSUN"),
    ).toBe("مضخة هواء — منفذان");
  });

  it("handles mixed-case brand matches", () => {
    expect(
      getProductDisplayName("سكيمر سطح DoPhin لإزالة الطبقة الزيتية", "dophin"),
    ).toBe("سكيمر سطح لإزالة الطبقة الزيتية");
  });

  it("does not remove a brand substring from a larger token", () => {
    expect(getProductDisplayName("YEECO Pump", "YEE")).toBe("YEECO Pump");
  });

  it("hides placeholder brands", () => {
    expect(getProductDisplayBrand("General")).toBe("");
  });

  it("keeps canonical-looking names unchanged when the brand is already separate", () => {
    expect(
      getProductDisplayIdentity({ name: "حجر هواء أسطواني", brand: "Houyi" }),
    ).toEqual({ name: "حجر هواء أسطواني", brand: "Houyi" });
  });
});

describe("kilogram sale units", () => {
  it("keeps a package priced per package even when its title or weight is in kilograms", () => {
    const pack = { slug: "ylc-410", name: "ميديا فلترة | 2.5 كغم", specifications: { الوزن: "2.5 كغم" } };
    expect(isSoldByKilogram(pack)).toBe(false);
    expect(isSoldByKilogram({ slug: "houyi-snowflake-white-sand-2-5kg", specifications: { "وزن العبوة": "2.5 كغم" } })).toBe(false);
  });

  it("uses explicit sale units and preserves older loose-stock items across locales", () => {
    expect(isSoldByKilogram({ slug: "houyi-river-sand" })).toBe(true);
    expect(isSoldByKilogram({ slug: "example", specifications: { "وحدة البيع": "بالكيلوغرام" } })).toBe(true);
    expect(isSoldByKilogram({ slug: "houyi-river-sand", specifications: { "وحدة البيع": "قطعة" } })).toBe(false);
  });
});
