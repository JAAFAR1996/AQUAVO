import { describe, expect, it } from "vitest";
import { renderSeoPreviewShell, type SeoPreviewProduct } from "../../api/_seo-preview-shell";
import {
  CATEGORY_GUIDE_LINKS,
  GUIDE_LINK_LABELS,
  guidesForCategory,
} from "../../shared/guide-links";
import { AQUAVO_PRODUCT_CATEGORIES } from "../../shared/seo-contract";
import { canonicalGuidePaths } from "../../api/_canonical-guides";

// The catalogue and the guide library were two islands. A crawler that reached
// a product page found no link onward except back to /products and the
// storefront root; all 27 guides were reachable only from /guides, the footer
// and each other. These tests fail against that state: they assert the product
// page and the category listing carry real <a href="/guides/..."> links chosen
// for that product's category.

const product = (overrides: Partial<SeoPreviewProduct> = {}): SeoPreviewProduct =>
  ({
    id: "1",
    slug: "test-filter",
    name: "فلتر اختبار",
    category: "الفلترة والتنقية",
    price: "25000",
    stock: 5,
    ...overrides,
  }) as SeoPreviewProduct;

const hrefs = (html: string): string[] =>
  [...html.matchAll(/href="(\/guides\/[^"]*)"/g)].map((m) => m[1]);

describe("guide mapping: every link points at a guide that exists", () => {
  it("references only canonical guide paths", () => {
    const canonical = canonicalGuidePaths();
    expect(canonical.length).toBeGreaterThan(0);
    for (const path of Object.keys(GUIDE_LINK_LABELS)) {
      expect(canonical, `${path} is not a canonical guide`).toContain(path);
    }
  });

  it("covers the whole guide library, so no guide is left unlinked", () => {
    const linked = new Set(Object.values(CATEGORY_GUIDE_LINKS).flatMap((paths) => [...paths]));
    expect([...linked].sort()).toEqual(Object.keys(GUIDE_LINK_LABELS).sort());
  });

  it("gives every one of the eleven categories its own guides", () => {
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      const links = guidesForCategory(category);
      expect(links.length, `${category} has no guides`).toBeGreaterThanOrEqual(3);
      for (const link of links) {
        expect(GUIDE_LINK_LABELS[link.href], `${link.href} has no label`).toBeTruthy();
        expect(link.label).not.toBe(link.href);
      }
    }
  });

  it("never repeats a guide within one category", () => {
    for (const [category, paths] of Object.entries(CATEGORY_GUIDE_LINKS)) {
      expect(new Set(paths).size, `${category} lists a guide twice`).toBe(paths.length);
    }
  });

  it("maps categories only, and only the eleven real ones", () => {
    expect(Object.keys(CATEGORY_GUIDE_LINKS).sort()).toEqual([...AQUAVO_PRODUCT_CATEGORIES].sort());
  });

  it("resolves an English alias the same way the category URL does", () => {
    expect(guidesForCategory("filters")).toEqual(guidesForCategory("الفلترة والتنقية"));
  });

  it("returns nothing for an unknown category rather than a default list", () => {
    expect(guidesForCategory("not-a-category")).toEqual([]);
    expect(guidesForCategory(undefined)).toEqual([]);
    expect(guidesForCategory("")).toEqual([]);
  });
});

describe("product page: links into the guides", () => {
  it("renders the guides for the product category as crawlable links", () => {
    const html = renderSeoPreviewShell({ kind: "product", product: product(), related: [] });
    const found = hrefs(html);
    const expected = guidesForCategory("الفلترة والتنقية").map((l) => l.href);
    expect(expected.length).toBeGreaterThan(0);
    for (const href of expected) {
      expect(found, `product page does not link ${href}`).toContain(href);
    }
  });

  it("shows the guide title as the link text, not a bare URL", () => {
    const html = renderSeoPreviewShell({ kind: "product", product: product(), related: [] });
    for (const link of guidesForCategory("الفلترة والتنقية")) {
      expect(html, `${link.href} is linked without its title`).toContain(link.label);
    }
  });

  it("links the guides of the product own category, not another one", () => {
    const html = renderSeoPreviewShell({
      kind: "product",
      product: product({ category: "طعام الأسماك", slug: "food", name: "طعام اختبار" }),
      related: [],
    });
    const found = hrefs(html);
    expect(found).toContain("/guides/feeding-table");
    expect(found).not.toContain("/guides/filter-media");
  });

  it("renders no guide block for a product with no recognised category", () => {
    const html = renderSeoPreviewShell({
      kind: "product",
      product: product({ category: "شيء غير معروف" }),
      related: [],
    });
    expect(hrefs(html)).toEqual([]);
  });
});

describe("category listing: links into the guides", () => {
  it("renders the guides for that category", () => {
    const html = renderSeoPreviewShell({
      kind: "products",
      products: [product()],
      category: "الصيانة والتنظيف",
    });
    const found = hrefs(html);
    for (const link of guidesForCategory("الصيانة والتنظيف")) {
      expect(found, `category listing does not link ${link.href}`).toContain(link.href);
      expect(html).toContain(link.label);
    }
  });

  it("leaves the unfiltered /products listing alone", () => {
    const html = renderSeoPreviewShell({ kind: "products", products: [product()] });
    expect(hrefs(html)).toEqual([]);
  });
});
