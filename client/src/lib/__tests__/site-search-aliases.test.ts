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

describe("search relevance regression", () => {
  it("rejects incidental description mentions and irrelevant semantic results", () => {
    const heater = product("yee-3006", "سخان YEE");
    const food = {...product("food", "أكل أسماك"), description: "لا تضع الطعام قرب الهيتر"};
    const results = buildUnifiedSiteSearchResults({query:"هيتر",catalogProducts:[heater,food],semanticProducts:[food,heater]});
    expect(results.filter(r=>r.type==="product").map(r=>r.id)).toEqual(["yee-3006"]);
  });
  it("does not use scattered letters as a product match", () => {
    const results=buildUnifiedSiteSearchResults({query:"هيتر",catalogProducts:[product("random","هواء يتوفر تركيب")]});
    expect(results.filter(r=>r.type==="product")).toHaveLength(0);
  });
  it("ranks stocked equivalent kinds before unavailable ones", () => {
    const sold={...product("sold","سخان Hygger"),stock:0};
    const available=product("available","سخان YEE");
    const results=buildUnifiedSiteSearchResults({query:"هيتر",catalogProducts:[sold,available],semanticProducts:[sold]});
    expect(results.filter(r=>r.type==="product")[0].id).toBe("available");
  });
  it("preserves an exact SKU match even when out of stock", () => {
    const exact={...product("yee-3006","سخان"),stock:0};
    const results=buildUnifiedSiteSearchResults({query:"yee-3006",catalogProducts:[exact,product("other","YEE 3006 accessory")]});
    expect(results.filter(r=>r.type==="product")[0].id).toBe("yee-3006");
  });
});
