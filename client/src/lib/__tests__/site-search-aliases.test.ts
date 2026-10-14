import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import { buildUnifiedSiteSearchResults } from "../site-search";

function product(id: string, name: string): Product {
  return {
    id,
    name,
    slug: id,
    category: "ملحقات",
    brand: "AQUAVO",
    price: 3000,
    stock: 3,
  } as Product;
}

describe("store search aliases", () => {
  const catalogProducts = [
    product("sponge", "فلتر إسفنجي"),
    product("pump", "مضخة هواء"),
    product("hose", "خرطوم هواء"),
    product("food", "أكل أسماك"),
  ];

  it("finds an exact product kind by common Iraqi synonyms", () => {
    const result = buildUnifiedSiteSearchResults({ query: "سفنجة فلتر", catalogProducts });
    expect(result.some((item) => item.id === "sponge")).toBe(true);
    expect(result.some((item) => item.id === "pump")).toBe(false);
  });

  it("maps air hose to airline but does not conflate an air pump", () => {
    const result = buildUnifiedSiteSearchResults({ query: "لي هواء", catalogProducts });
    expect(result.some((item) => item.id === "hose")).toBe(true);
    expect(result.some((item) => item.id === "pump")).toBe(false);
  });

  it("does not turn a fish-food item into a filter", () => {
    const result = buildUnifiedSiteSearchResults({ query: "sponge filter", catalogProducts });
    expect(result.some((item) => item.id === "food")).toBe(false);
  });
});
