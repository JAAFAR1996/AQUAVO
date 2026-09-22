import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import handler from "../../api/ssr-meta";
import { renderSeoPreviewShell, type SeoPreviewProduct } from "../../api/_seo-preview-shell";
import { resolveGuidePage } from "../../api/_canonical-guides";
import { CATEGORY_FAQ_HEADING, categorySearch } from "../../shared/category-search";
import { AQUAVO_PRODUCT_CATEGORIES } from "../../shared/seo-contract";

/**
 * URL Inspection on 2026-09-22 showed three of the eleven category listings
 * folded into /products as duplicates and one never indexed. The browser path
 * published canonical=/products for every /products?category=… request while
 * the crawler path published the category's own canonical; the guides linked
 * a "+"-encoded spelling; the home page's ItemList used English aliases.
 * These tests pin the single-canonical contract on every path.
 */
function createRequest(url: string): VercelRequest {
  return { url, headers: { accept: "text/html" } } as unknown as VercelRequest;
}

function createResponse() {
  let statusCode: number | undefined;
  let body: unknown;
  const headers: Record<string, string> = {};
  const response = {
    setHeader: vi.fn((k: string, v: string) => { headers[k] = v; return response; }),
    status: vi.fn((code: number) => { statusCode = code; return response; }),
    send: vi.fn((value: unknown) => { body = value; return response; }),
    end: vi.fn(() => response),
  };
  return { response: response as unknown as VercelResponse, status: () => statusCode, body: () => String(body ?? ""), headers };
}

const HEATERS = "التحكم بالحرارة";
const canonical = `/products?category=${encodeURIComponent(HEATERS)}`;

describe("category listing on the browser path (ssr-meta)", () => {
  it("publishes the category's own title and canonical, not /products", async () => {
    const r = createResponse();
    await handler(createRequest(canonical), r.response);
    expect(r.status()).toBe(200);
    const html = r.body();
    expect(html).toContain(`<title>${categorySearch(HEATERS)!.title}</title>`);
    expect(html).toContain(`rel="canonical" href="https://www.aquavoiq.com${canonical}"`);
    expect(html).not.toContain('rel="canonical" href="https://www.aquavoiq.com/products"');
    expect(html).toContain('"@type":"FAQPage"');
  });

  it("redirects an English alias to the canonical spelling", async () => {
    const r = createResponse();
    await handler(createRequest("/products?category=heaters"), r.response);
    expect(r.status()).toBe(308);
    expect(r.headers.Location).toBe(canonical);
  });

  it("redirects the '+'-encoded spelling to the canonical one", async () => {
    const r = createResponse();
    await handler(createRequest(canonical.replace(/%20/g, "+")), r.response);
    expect(r.status()).toBe(308);
    expect(r.headers.Location).toBe(canonical);
  });

  it("leaves the bare listing and an unknown category alone", async () => {
    const bare = createResponse();
    await handler(createRequest("/products"), bare.response);
    expect(bare.status()).toBe(200);
    expect(bare.body()).toContain('rel="canonical" href="https://www.aquavoiq.com/products"');
  });
});

describe("category listing on the crawler path (shell)", () => {
  const product = (category: string): SeoPreviewProduct =>
    ({ id: "1", slug: "p", name: "منتج", category, price: "1000", stock: 3 }) as SeoPreviewProduct;

  it("heads every category with buyer vocabulary and shows its three questions", () => {
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      const html = renderSeoPreviewShell({ kind: "products", products: [product(category)], category });
      const search = categorySearch(category)!;
      expect(html, category).toContain(`<h1>${search.heading}</h1>`);
      expect(html, category).toContain(CATEGORY_FAQ_HEADING);
      for (const q of search.faq) expect(html, category).toContain(`<h3>${q.question}</h3>`);
    }
  });
});

describe("guide links to listings", () => {
  it("use the canonical %20 spelling, never '+'", () => {
    const guide = resolveGuidePage("/guides/filter-choice")!;
    const hrefs = [guide.page.cta.href, ...guide.page.links.map((l) => l.href)].filter((h) => h.includes("category="));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href, href).not.toContain("+");
      expect(href, href).toMatch(/^\/products\?category=%D8/);
    }
  });
});

describe("/products category ItemList (browser path)", () => {
  it("lists the eleven real listings at their canonical URLs", async () => {
    const r = createResponse();
    await handler(createRequest("/products"), r.response);
    const html = r.body();
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      expect(html, category).toContain(`/products?category=${encodeURIComponent(category)}`);
    }
    expect(html).not.toContain("category=starter-kits");
    expect(html).not.toContain("category=heaters");
  });
});
