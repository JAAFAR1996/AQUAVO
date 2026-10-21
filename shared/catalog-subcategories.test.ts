import { describe, expect, it } from "vitest";
import { catalogSubcategories, activeCatalogSubcategory } from "./catalog-subcategories";

describe("catalog type navigation", () => {
  const products = [
    { category: "فلترة", subcategory: "فلاتر كاملة" },
    { category: "فلترة", subcategory: "قطع غيار" },
    { category: "فلترة", subcategory: "قطع غيار" },
    { category: "ديكور", subcategory: "أحجار" },
    { category: "فلترة", subcategory: "" },
  ];
  it("keeps equipment and replacement parts distinct and counts only the selected category", () => {
    const types = catalogSubcategories(products, "فلترة");
    expect(types).toHaveLength(2);
    expect(types.find(type => type.value === "قطع غيار")?.count).toBe(2);
    expect(types.some(type => type.value === "أحجار")).toBe(false);
  });
  it("restores a valid type from its category URL", () => {
    expect(activeCatalogSubcategory("قطع غيار", "فلترة", ["فلترة"], catalogSubcategories(products, "فلترة"))).toBe("قطع غيار");
  });
  it("ignores stale types on a different category or multiple selected categories", () => {
    const options = catalogSubcategories(products, "فلترة");
    expect(activeCatalogSubcategory("قطع غيار", "ديكور", ["فلترة"], options)).toBeNull();
    expect(activeCatalogSubcategory("قطع غيار", "فلترة", ["فلترة", "ديكور"], options)).toBeNull();
    expect(activeCatalogSubcategory("قديم", "فلترة", ["فلترة"], options)).toBeNull();
  });
});
