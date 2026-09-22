import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalGuidePaths, guideProductsFromRows, renderCanonicalGuideHtml, renderCanonicalGuideMarkdown, resolveGuidePage } from "../../api/_canonical-guides";
import { GUIDE_PRIMARY_CATEGORY, GUIDE_PRODUCTS_HEADING, productCategoryForGuide } from "../../shared/guide-links";
import { AQUAVO_PRODUCT_CATEGORIES } from "../../shared/seo-contract";

/**
 * Guides earn most of the site's impressions and used to end at a category
 * link. Each guide now shows up to three in-stock products of one category,
 * on the server-rendered document (crawler and reader) and on the React
 * guides (reader). These tests pin the map, the renderer and the mount.
 */
describe("guide → product category map", () => {
  it("names only real guides and real categories", () => {
    const guides = new Set(canonicalGuidePaths());
    for (const [path, category] of Object.entries(GUIDE_PRIMARY_CATEGORY)) {
      expect(guides.has(path), `${path} is not a canonical guide`).toBe(true);
      expect((AQUAVO_PRODUCT_CATEGORIES as readonly string[]).includes(category), `${path} → ${category}`).toBe(true);
    }
  });

  it("covers the guides that carry the site's search impressions", () => {
    for (const path of ["/guides/filter-choice", "/guides/feeding-table", "/guides/aquarium-water-test-guide", "/guides/water-conditioner-guide", "/guides/heater-choice"]) {
      expect(productCategoryForGuide(path), path).toBeDefined();
    }
    expect(productCategoryForGuide("/guides/water-myths")).toBeUndefined();
  });
});

describe("guide product rows", () => {
  it("keeps in-stock priced rows only, three at most, with a formatted dinar price", () => {
    const rows = [
      { slug: "a", name: "أ", price: "0", stock: 5 },
      { slug: "b", name: "ب", price: "17999", stock: 0 },
      { slug: "c", name: "ج", price: "17999", stock: 2 },
      { slug: "d", name: "د", price: 3500, stock: 1 },
      { slug: "e", name: "هـ", price: 500, stock: 1 },
      { slug: "f", name: "و", price: 500, stock: 1 },
    ];
    const out = guideProductsFromRows(rows);
    expect(out.map((p) => p.slug)).toEqual(["c", "d", "e"]);
    expect(out[0].priceLabel).toMatch(/د\.ع$/);
    expect(out[0].priceLabel).toContain("17");
  });
});

describe("server-rendered guide", () => {
  const guide = resolveGuidePage("/guides/heater-choice")!;
  const products = [{ slug: "heater-100", name: "سخان 100 واط", priceLabel: "17,999 د.ع" }];

  it("shows the product block with the product's own name when products are passed", () => {
    const html = renderCanonicalGuideHtml(guide.canonicalPath, guide.page, "https://www.aquavoiq.com", "https://www.aquavoiq.com/logo.png", products);
    expect(html).toContain(GUIDE_PRODUCTS_HEADING);
    expect(html).toContain('href="/products/heater-100"');
    expect(html).toContain("سخان 100 واط");
    const md = renderCanonicalGuideMarkdown(guide.canonicalPath, guide.page, "https://www.aquavoiq.com", products);
    expect(md).toContain(`## ${GUIDE_PRODUCTS_HEADING}`);
    expect(md).toContain("/products/heater-100");
  });

  it("shows no block when there are no products", () => {
    const html = renderCanonicalGuideHtml(guide.canonicalPath, guide.page, "https://www.aquavoiq.com", "https://www.aquavoiq.com/logo.png", []);
    expect(html).not.toContain(GUIDE_PRODUCTS_HEADING);
  });
});

describe("React guide routes", () => {
  it("mount GuideRelatedProducts on every /guides/* route", () => {
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const routes = [...app.matchAll(/<Route path="(\/guides\/[a-z0-9-]+)">[\s\S]*?<\/Route>/g)];
    expect(routes.length).toBeGreaterThanOrEqual(20);
    const missing = routes.filter((m) => !m[0].includes("<GuideRelatedProducts />")).map((m) => m[1]);
    expect(missing).toEqual([]);
  });
});
