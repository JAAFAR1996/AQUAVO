import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

// A fake Neon Pool so PDP SSR tests can exercise the real `getProductMeta()` DB
// path without a live database. Must be mocked before `../../api/ssr-meta` is
// imported (vi.mock calls are hoisted by vitest, so this is safe even though
// it appears above the import below).
const FAKE_PRODUCT_ROW = {
  id: "1",
  name: "فلتر اختبار YEE",
  description: "فلتر تجريبي للاختبار فقط.",
  price: "15000",
  currency: "IQD",
  brand: "YEE",
  category: "filters",
  images: ["/images/products/test-filter.webp"],
  thumbnail: null,
  slug: "test-filter",
  specifications: {},
  stock: 5,
  variants: [],
  hasVariants: false,
};

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("FROM products")) return { rows: [FAKE_PRODUCT_ROW] };
        return { rows: [] };
      }),
    };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

import handler, {
  buildProductMetaDescription,
  buildProductMetaTitle,
  injectMeta,
} from "../../api/ssr-meta";

function request(url: string): VercelRequest {
  return { url, headers: { accept: "text/html" } } as unknown as VercelRequest;
}

async function render(url: string): Promise<string> {
  let body = "";
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(() => response),
    send: vi.fn((value: unknown) => {
      body = String(value);
      return response;
    }),
    end: vi.fn(() => response),
  };
  await handler(request(url), response as unknown as VercelResponse);
  return body;
}

const PRELOAD_TEMPLATE = `
<head>
  <title>__META_TITLE__</title>
  <meta name="description" content="__META_DESCRIPTION__">
  <meta name="keywords" content="__META_KEYWORDS__">
  <link rel="canonical" href="__META_URL__">
  <link rel="preload" fetchpriority="high" as="image" href="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp">
  <!-- Open Graph / Facebook -->
  <meta property="og:title" content="__META_TITLE__">
  <meta property="og:description" content="__META_DESCRIPTION__">
  <meta property="og:type" content="__META_OG_TYPE__">
  <meta property="og:url" content="__META_URL__">
  <meta property="og:image" content="__META_IMAGE__">
  <meta name="twitter:title" content="__META_TITLE__">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <!--__JSON_LD__-->
</head>`;

describe("product metadata descriptions", () => {
  const product = { name: "فلتر YEE 600", brand: "YEE" };

  it("uses complete sentences from a long Arabic description without ellipsis", () => {
    const description = buildProductMetaDescription({
      ...product,
      description: "فلتر عملي يساعد على تدوير ماء الحوض بكفاءة. يأتي بتصميم مناسب للاستخدام اليومي داخل الحوض. هذا شرح إضافي طويل جداً لا يحتاج أن يدخل كله في مقتطف نتيجة البحث لأنه يتجاوز المساحة المناسبة للمقتطف.",
    });
    expect(description).toBe("فلتر عملي يساعد على تدوير ماء الحوض بكفاءة. يأتي بتصميم مناسب للاستخدام اليومي داخل الحوض.");
    expect(description).not.toMatch(/\.{2,}|…/);
  });

  it("normalizes multiline descriptions", () => {
    expect(buildProductMetaDescription({
      ...product,
      description: "فلتر عملي للحوض.\n\nيساعد على تدوير المي بصورة منتظمة.",
    })).toBe("فلتر عملي للحوض. يساعد على تدوير المي بصورة منتظمة.");
  });

  it("uses a factual complete fallback for missing or ellipsis-ended descriptions", () => {
    const missing = buildProductMetaDescription({ ...product, description: null, specifications: { model: "600" } });
    const truncated = buildProductMetaDescription({ ...product, description: "وصف قديم غير مكتمل..." });
    expect(missing).toContain("فلتر YEE 600");
    expect(missing).toMatch(/[.؟!]$/);
    expect(truncated).toContain("فلتر YEE 600");
    expect(truncated).not.toMatch(/\.{2,}|…/);
  });
});

describe("SEO metadata contracts", () => {
  it("does not duplicate a product brand or the AQUAVO site suffix", () => {
    expect(buildProductMetaTitle("فلتر YEE 600", "YEE")).toBe("فلتر YEE 600 | AQUAVO");
    expect(buildProductMetaTitle("فلتر YEE 600 | AQUAVO", "YEE")).toBe("فلتر YEE 600 | AQUAVO");
  });

  it("states the AQUAVO name once for own-brand products", () => {
    // The five driftwood products in the catalogue carry brand "AQUAVO", which
    // used to be appended as a brand on top of the site suffix.
    expect(buildProductMetaTitle("خشب طبيعي للأحواض والأكواسكيب — DW-01", "AQUAVO"))
      .toBe("خشب طبيعي للأحواض والأكواسكيب — DW-01 | AQUAVO");
    expect(buildProductMetaTitle("قطع خشب طبيعية للأكواسكيب", "aquavo"))
      .not.toMatch(/AQUAVO[\s\S]*AQUAVO/i);
  });

  it("derives ItemList numberOfItems from the final list", async () => {
    const html = await render("/products");
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
      .map((match) => JSON.parse(match[1]) as { "@type"?: string; numberOfItems?: number; itemListElement?: unknown[] });
    const itemList = scripts.find((schema) => schema["@type"] === "ItemList");
    expect(itemList).toBeDefined();
    expect(itemList?.numberOfItems).toBe(itemList?.itemListElement?.length);
  });

  it("rewrites the robots tag for private routes, and keeps 404s at noindex,follow", () => {
    // Behavioural on purpose. An earlier version of this rule asserted only that
    // the source contained the replacement string, and passed while the regex
    // silently matched nothing, so production kept serving "index, follow" on
    // /cart. Exercise injectMeta against a real template instead.
    const template =
      '<html><head><meta name="robots" content="index, follow, max-image-preview:large">' +
      "<title>__META_TITLE__</title></head><body></body></html>";
    const base = {
      title: "عنوان",
      description: "وصف.",
      url: "https://www.aquavoiq.com/cart",
      image: "https://www.aquavoiq.com/brand/aquavo-v2-horizontal.png",
    };

    const robotsOf = (html: string) =>
      html.match(/<meta\b[^>]*\bname=["']robots["'][^>]*>/i)?.[0] ?? "";

    expect(robotsOf(injectMeta(template, { ...base, noIndex: true }))).toContain(
      'content="noindex, nofollow, noarchive"',
    );
    // A missing page is still worth following out of, so notFound wins.
    expect(
      robotsOf(injectMeta(template, { ...base, noIndex: true, notFound: true })),
    ).toContain('content="noindex, follow"');
    // Public routes are untouched.
    expect(robotsOf(injectMeta(template, base))).toContain('content="index, follow');
  });

  it("preloads only the route's relevant LCP image", () => {
    const base = {
      title: "عنوان",
      description: "وصف.",
      url: "https://www.aquavoiq.com/",
      image: "https://www.aquavoiq.com/brand/aquavo-v2-horizontal.png",
    };
    const home = injectMeta(PRELOAD_TEMPLATE, base);
    const product = injectMeta(PRELOAD_TEMPLATE, {
      ...base,
      url: "https://www.aquavoiq.com/products/yee-filter",
      image: "https://res.cloudinary.com/aquavo/image/upload/v1/product.webp",
      ogType: "product",
    });
    const other = injectMeta(PRELOAD_TEMPLATE, { ...base, url: "https://www.aquavoiq.com/shipping" });

    expect(home.match(/rel="preload"[^>]*as="image"/g)).toHaveLength(1);
    expect(home).toContain("iwagumi_aquascape");
    expect(product.match(/rel="preload"[^>]*as="image"/g)).toHaveLength(1);
    // The preload must target the SAME transformed asset the PDP <img> renders
    // (client/src/lib/cloudinary.ts `detailImage`), not the raw original.
    expect(product).toContain(
      'href="https://res.cloudinary.com/aquavo/image/upload/f_auto,q_auto:good,w_800,h_800,c_limit/v1/product.webp"'
    );
    expect(product).not.toContain('href="https://res.cloudinary.com/aquavo/image/upload/v1/product.webp"');
    expect(product).not.toContain("iwagumi_aquascape");
    expect(other).not.toMatch(/rel="preload"[^>]*as="image"/);
    expect(other).not.toContain("iwagumi_aquascape");
  });
});

// ─── Structured-data deduplication contract ────────────────────────────────
// SSR (this file) is the canonical owner of Organization/WebSite (home) and
// Product/BreadcrumbList (PDP) JSON-LD. Client components must not render a
// second copy of these — see client/src/__tests__/seo-contract.test.ts for the
// assertion that home.tsx no longer imports OrganizationSchema/WebsiteSchema.
function jsonLdEntities(html: string): Array<{ "@type"?: string; [key: string]: unknown }> {
  return [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map(
    (match) => JSON.parse(match[1]) as { "@type"?: string; [key: string]: unknown }
  );
}

describe("structured data deduplication contract", () => {
  it("emits exactly one Organization and one WebSite entity for the home page", async () => {
    const html = await render("/");
    const entities = jsonLdEntities(html);
    expect(entities.filter((e) => e["@type"] === "Organization")).toHaveLength(1);
    expect(entities.filter((e) => e["@type"] === "WebSite")).toHaveLength(1);
  });

  it("emits exactly one Product and one BreadcrumbList entity for a product detail page", async () => {
    const html = await render("/products/test-filter");
    const entities = jsonLdEntities(html);
    const products = entities.filter((e) => e["@type"] === "Product");
    const breadcrumbs = entities.filter((e) => e["@type"] === "BreadcrumbList");
    expect(products).toHaveLength(1);
    expect(breadcrumbs).toHaveLength(1);
    // Sanity: the Product entity actually carries the DB-sourced price/availability/image
    // (SSR must be a complete owner before the client copy can be safely removed).
    expect(products[0]).toMatchObject({
      name: FAKE_PRODUCT_ROW.name,
      // `image` is now the whole gallery rather than one string, because this
      // handler shares buildProductStructuredData with the crawler route. The
      // primary image must still lead it.
      image: expect.arrayContaining([expect.stringContaining(FAKE_PRODUCT_ROW.images[0])]),
      offers: expect.objectContaining({
        price: FAKE_PRODUCT_ROW.price,
        priceCurrency: FAKE_PRODUCT_ROW.currency,
        availability: "https://schema.org/InStock",
      }),
    });
    expect((products[0].image as string[])[0]).toContain(FAKE_PRODUCT_ROW.images[0]);
  });

  it("does not emit a Product entity for non-product routes", async () => {
    const home = jsonLdEntities(await render("/"));
    const shipping = jsonLdEntities(await render("/shipping"));
    const products = jsonLdEntities(await render("/products"));
    expect(home.some((e) => e["@type"] === "Product")).toBe(false);
    expect(shipping.some((e) => e["@type"] === "Product")).toBe(false);
    expect(products.some((e) => e["@type"] === "Product")).toBe(false);
  });
});
