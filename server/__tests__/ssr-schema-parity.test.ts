import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

/**
 * Structured-data parity between the two producers.
 *
 * A product page is rendered by one of two handlers depending on who asks:
 * `api/ssr-meta.ts` for browsers, and the prerendered semantic route
 * (`api/_ssr-preview-source.ts` -> `_seo-structured-data.ts`) for crawlers.
 * Both used to build Product schema independently, and they had drifted: the
 * browser path published no sku, no category, no itemCondition, no shipping
 * details, no eligibleRegion, one image instead of the gallery, a flat Product
 * where a product with options should be a ProductGroup, and the ~155-char
 * *meta* description in place of the real one.
 *
 * They now share `buildProductStructuredData`. This test renders the same
 * product through both real handlers against the same fake pool and compares
 * the Product schema they emit, so the two cannot drift again.
 *
 * api/tsconfig.json sets "noCheck": true, so tsc catches none of this.
 */

const CLOUDINARY = "https://res.cloudinary.com/dyczh8ogv/image/upload/v178/aquavo/p/main.webp";

// The description is deliberately longer than a meta description, and the
// truncation point falls mid-number — this is the real catalogue text that got
// cut to "لا نعامل رقم 0." and inverted its own meaning.
const LONG_DESCRIPTION =
  "مقياس حرارة رقمي بمستشعر سلكي يوضع داخل ماء الحوض وشاشة تبقى خارجه. " +
  "يعرض درجة الحرارة بصورة مباشرة ويساعد على متابعة تغيرها خلال اليوم. " +
  "لا نعامل رقم 0.1°C كدقة قياس مؤكدة إلا إذا نصت العبوة على ذلك؛ قد يكون دقة عرض الشاشة. " +
  "استخدمه للمراقبة اليومية وقارن القراءة بمقياس آخر إذا ظهرت نتيجة غير منطقية.";

const PRODUCT_ROW = {
  id: "houyi-thermostat",
  slug: "houyi-thermostat",
  name: "ميزان حرارة رقمي للأحواض — شاشة LED",
  description: LONG_DESCRIPTION,
  price: "6985",
  originalPrice: null,
  currency: "IQD",
  brand: "Houyi",
  category: "الفحص والمراقبة",
  stock: 12,
  thumbnail: CLOUDINARY,
  images: [CLOUDINARY, "/images/products/houyi/second.webp"],
  hasVariants: false,
  variants: null,
  rating: "4.5",
  reviewCount: 8,
  specifications: {},
};

// A product with two priced options, to prove both paths publish a
// ProductGroup with hasVariant rather than flattening it to one Product.
const VARIANT_ROW = {
  ...PRODUCT_ROW,
  id: "houyi-heater",
  slug: "houyi-heater",
  name: "سخان حوض",
  hasVariants: true,
  variants: [
    { id: "v50", label: "50 واط", price: "12000", stock: 4, isDefault: true },
    { id: "v100", label: "100 واط", price: "15000", stock: 2 },
  ],
};

// A product with no canonical category, to prove the breadcrumb omits that
// step rather than inventing one or leaving a gap in the position numbering.
const UNCATEGORIZED_ROW = {
  ...PRODUCT_ROW,
  id: "mystery-item",
  slug: "mystery-item",
  name: "منتج بدون فئة",
  category: null,
};

const ROWS_BY_SLUG: Record<string, unknown> = {
  [PRODUCT_ROW.slug]: PRODUCT_ROW,
  [VARIANT_ROW.slug]: VARIANT_ROW,
  [UNCATEGORIZED_ROW.slug]: UNCATEGORIZED_ROW,
};

// Both handlers cache their Pool in a module-level singleton, so the fake has
// to serve every row this file needs from the start — re-mocking Pool later
// would be silently ignored.
vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return {
      query: vi.fn(async (sql: string, values?: unknown[]) => {
        if (sql.includes("FROM products")) {
          const slug = typeof values?.[0] === "string" ? values[0] : null;
          if (slug) return { rows: ROWS_BY_SLUG[slug] ? [ROWS_BY_SLUG[slug]] : [] };
          return { rows: [PRODUCT_ROW] };
        }
        return { rows: [] };
      }),
    };
  }),
}));

process.env.DATABASE_URL ||= "postgres://u:p@localhost:5432/db";

import browserHandler from "../../api/ssr-meta";
import crawlerHandler from "../../api/_ssr-preview-source";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

async function render(
  handler: Handler,
  userAgent: string,
  slug: string = PRODUCT_ROW.slug,
): Promise<string> {
  let body = "";
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(() => response),
    send: vi.fn((value: unknown) => {
      body = String(value);
      return response;
    }),
    end: vi.fn((value?: unknown) => {
      if (value !== undefined) body = String(value);
      return response;
    }),
  };
  const req = {
    url: `/products/${slug}`,
    headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": userAgent },
  } as unknown as VercelRequest;
  await handler(req, response as unknown as VercelResponse);
  return body;
}

function schemaNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const walk = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(walk);
    const record = value as Record<string, unknown>;
    if (typeof record["@type"] === "string") nodes.push(record);
    Object.values(record).forEach(walk);
  };
  for (const match of html.matchAll(
    /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    try {
      walk(JSON.parse(match[1]));
    } catch {
      throw new Error(`unparseable JSON-LD: ${match[1].slice(0, 120)}`);
    }
  }
  return nodes;
}

const nodeOfType = (html: string, type: string) =>
  schemaNodes(html).find((node) => node["@type"] === type);

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36";

const browserHtml = () => render(browserHandler as Handler, BROWSER_UA);
const crawlerHtml = () => render(crawlerHandler as Handler, "Googlebot/2.1");

describe("both producers describe the product identically", () => {
  it("emits the same Product node from the browser path and the crawler path", async () => {
    const browser = nodeOfType(await browserHtml(), "Product");
    const crawler = nodeOfType(await crawlerHtml(), "Product");
    expect(browser).toBeDefined();
    expect(crawler).toBeDefined();
    expect(browser).toEqual(crawler);
  });

  it("carries the identity fields the browser path used to drop", async () => {
    const product = nodeOfType(await browserHtml(), "Product")!;
    expect(product.sku).toBe(PRODUCT_ROW.id);
    expect(product.category).toBeTruthy();
    expect(product.url).toBe("https://www.aquavoiq.com/products/houyi-thermostat");
    expect(product["@id"]).toContain("#product");
    expect(Array.isArray(product.image)).toBe(true);
    expect((product.image as string[]).length).toBeGreaterThan(1);
  });

  it("carries the full description, not the truncated meta snippet", async () => {
    const product = nodeOfType(await browserHtml(), "Product")!;
    // The exact phrase the ~155-char cut used to invert.
    expect(product.description).toContain("لا نعامل رقم 0.1°C");
    expect(product.description).not.toMatch(/لا نعامل رقم 0\.$/);
  });

  it("keeps the meta description tag itself truncated, which is its job", async () => {
    const html = await browserHtml();
    const meta = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
    expect(meta.length).toBeLessThan(200);
    expect(meta.length).toBeGreaterThan(0);
    expect(meta).not.toBe(nodeOfType(html, "Product")!.description);
  });
});

describe("the Offer is complete and truthful on both paths", () => {
  it("publishes the real price, currency and availability", async () => {
    const offer = nodeOfType(await browserHtml(), "Offer")!;
    expect(offer.price).toBe("6985");
    expect(offer.priceCurrency).toBe("IQD");
    expect(offer.availability).toBe("https://schema.org/InStock");
  });

  it("publishes the shipping terms the browser path used to omit", async () => {
    const offer = nodeOfType(await browserHtml(), "Offer")!;
    expect(offer.itemCondition).toBe("https://schema.org/NewCondition");
    expect(offer.shippingDetails).toBeDefined();
    expect(offer.eligibleRegion).toBeDefined();

    const shipping = nodeOfType(await browserHtml(), "OfferShippingDetails")!;
    // 5,000 IQD flat across Iraq — the real published rate.
    expect((shipping.shippingRate as Record<string, unknown>).value).toBe(5000);
    expect((shipping.shippingRate as Record<string, unknown>).currency).toBe("IQD");
  });

  it("invents no gtin, mpn, return policy or member price", async () => {
    for (const html of [await browserHtml(), await crawlerHtml()]) {
      const product = nodeOfType(html, "Product")!;
      const offer = nodeOfType(html, "Offer")!;
      expect(product.gtin).toBeUndefined();
      expect(product.mpn).toBeUndefined();
      expect(offer.hasMerchantReturnPolicy).toBeUndefined();
      expect(offer.priceSpecification).toBeUndefined();
    }
  });

  it("publishes the real rating on both paths, and never a fabricated one", async () => {
    for (const html of [await browserHtml(), await crawlerHtml()]) {
      const rating = nodeOfType(html, "AggregateRating");
      expect(rating).toBeDefined();
      expect(rating!.ratingValue).toBe(4.5);
      expect(rating!.reviewCount).toBe(8);
    }
  });
});

describe("every @id a product page references is defined on that page", () => {
  it("defines the organization its Offer names as seller", async () => {
    for (const html of [await browserHtml(), await crawlerHtml()]) {
      const offer = nodeOfType(html, "Offer")!;
      const sellerId = (offer.seller as Record<string, unknown>)["@id"];
      expect(sellerId).toBe("https://www.aquavoiq.com/#organization");

      const store = nodeOfType(html, "OnlineStore");
      expect(store, "seller @id must resolve on this page").toBeDefined();
      expect(store!["@id"]).toBe(sellerId);
    }
  });

  it("defines the website its WebPage is part of", async () => {
    for (const html of [await browserHtml(), await crawlerHtml()]) {
      const page = nodeOfType(html, "WebPage")!;
      const siteId = (page.isPartOf as Record<string, unknown>)["@id"];
      const site = nodeOfType(html, "WebSite");
      expect(site, "isPartOf @id must resolve on this page").toBeDefined();
      expect(site!["@id"]).toBe(siteId);
    }
  });

  it("keeps the organization truthful: no physical storefront hours invented", async () => {
    const store = nodeOfType(await browserHtml(), "OnlineStore")!;
    // AQUAVO is online-only with 24/7 support; a restrictive opening-hours
    // block here would contradict the site copy.
    const contact = store.contactPoint as Record<string, unknown>;
    const hours = contact.hoursAvailable as Record<string, unknown>;
    expect(hours.opens).toBe("00:00");
    expect(hours.closes).toBe("23:59");
    expect(store.address).toBeUndefined();
  });

  it("defines each entity exactly once, so adding them created no duplicates", async () => {
    for (const html of [await browserHtml(), await crawlerHtml()]) {
      const count = (type: string) =>
        schemaNodes(html).filter((node) => node["@type"] === type).length;
      expect(count("OnlineStore")).toBe(1);
      expect(count("WebSite")).toBe(1);
      expect(count("Product")).toBe(1);
      expect(count("BreadcrumbList")).toBe(1);
      expect(count("WebPage")).toBe(1);
    }
  });

  it("normalizes the canonical URL to the www host on both paths", async () => {
    for (const html of [await browserHtml(), await crawlerHtml()]) {
      const product = nodeOfType(html, "Product")!;
      expect(product.url).toMatch(/^https:\/\/www\.aquavoiq\.com\//);
    }
  });
});

describe("a product with options publishes a ProductGroup on both paths", () => {
  const renderVariant = (handler: Handler, ua: string) =>
    render(handler, ua, VARIANT_ROW.slug);

  it("publishes a ProductGroup, not a flattened Product, on both paths", async () => {
    for (const html of [
      await renderVariant(browserHandler as Handler, BROWSER_UA),
      await renderVariant(crawlerHandler as Handler, "Googlebot/2.1"),
    ]) {
      const group = nodeOfType(html, "ProductGroup");
      expect(group, "a product with two priced options must be a ProductGroup").toBeDefined();
      expect(group!.productGroupID).toBe(VARIANT_ROW.id);
    }
  });

  it("gives every option its own real price, and never invents one", async () => {
    const html = await renderVariant(crawlerHandler as Handler, "Googlebot/2.1");
    const variants = nodeOfType(html, "ProductGroup")!.hasVariant as Record<string, unknown>[];
    expect(variants).toHaveLength(2);
    expect(variants.map((v) => (v.offers as Record<string, unknown>).price)).toEqual([
      "12000",
      "15000",
    ]);
  });

  it("agrees between the two paths on the whole ProductGroup", async () => {
    const browser = nodeOfType(await renderVariant(browserHandler as Handler, BROWSER_UA), "ProductGroup");
    const crawler = nodeOfType(await renderVariant(crawlerHandler as Handler, "Googlebot/2.1"), "ProductGroup");
    expect(browser).toEqual(crawler);
  });
});

/**
 * Breadcrumbs follow the product's real category relationship.
 *
 * The trail used to be Home > Products > Product on every product page, which
 * told Google nothing about where the product actually sits. The category step
 * is the product's own canonical category and links to the listing filtered by
 * it — a page that exists — so it is a real relationship, not a decorative one.
 */
describe("product breadcrumbs use the real category relationship", () => {
  function crumbs(html: string): Array<{ position: number; name: string; item: string }> {
    const list = schemaNodes(html).find((n) => n["@type"] === "BreadcrumbList");
    expect(list, "every product page needs a BreadcrumbList").toBeDefined();
    return list!.itemListElement as Array<{ position: number; name: string; item: string }>;
  }

  it("puts the product's own category between the listing and the product", async () => {
    for (const html of [await browserHtml(), await crawlerHtml()]) {
      const trail = crumbs(html);
      expect(trail).toHaveLength(4);
      expect(trail.map((c) => c.position)).toEqual([1, 2, 3, 4]);
      expect(trail[1].item).toBe("https://www.aquavoiq.com/products");
      expect(trail[2].item).toContain("/products?category=");
      expect(trail[3].name).toBe(PRODUCT_ROW.name);
      expect(trail[3].item).toBe("https://www.aquavoiq.com/products/houyi-thermostat");
    }
  });

  it("agrees between the two paths", async () => {
    expect(crumbs(await browserHtml())).toEqual(crumbs(await crawlerHtml()));
  });

  it("renders the same trail in the crawler-visible markup, not only in the schema", async () => {
    const html = await crawlerHtml();
    const nav = html.match(/<nav[^>]*aq-ssr-breadcrumb[\s\S]*?<\/nav>/)?.[0] ?? "";
    expect(nav).toContain("/products?category=");
    expect(nav).toContain(PRODUCT_ROW.name);
  });

  it("keeps positions contiguous when a product has no canonical category", async () => {
    const html = await render(crawlerHandler as Handler, "Googlebot/2.1", UNCATEGORIZED_ROW.slug);
    const trail = crumbs(html);
    // No invented category step, and no gap in the numbering.
    expect(trail).toHaveLength(3);
    expect(trail.map((c) => c.position)).toEqual([1, 2, 3]);
    expect(trail[2].name).toBe(UNCATEGORIZED_ROW.name);
    expect(html).not.toContain("/products?category=undefined");
  });
});
