import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

/**
 * Every `@id` a page references must be defined on that page.
 *
 * Pages across the site emit nodes that point at two site-level entities: an
 * Offer's `seller` and an Article's `publisher` point at `#organization`, and
 * every WebPage's `isPartOf` points at `#website`. Those two nodes were
 * defined only on the home page — and, after the product-schema unification,
 * on product pages — so on `/about`, `/faq`, `/blog`, `/blog/*` and
 * `/products` both references resolved to nothing at all.
 *
 * This drives both real handlers across every route and checks the graph
 * closes: no dangling reference, and no duplicated entity either.
 */

const PRODUCT_ROW = {
  id: "houyi-thermostat",
  slug: "houyi-thermostat",
  name: "ميزان حرارة رقمي",
  brand: "Houyi",
  category: "الفحص والمراقبة",
  categoryId: "c1",
  subcategory: "موازين",
  description: "مقياس حرارة رقمي بمستشعر سلكي.",
  price: "6985",
  originalPrice: null,
  currency: "IQD",
  images: ["https://res.cloudinary.com/x/image/upload/v1/a.webp"],
  thumbnail: "https://res.cloudinary.com/x/image/upload/v1/a.webp",
  rating: "0",
  reviewCount: 0,
  stock: 12,
  lowStockThreshold: 3,
  isNew: false,
  isBestSeller: false,
  isProductOfWeek: false,
  specifications: {},
  hasVariants: false,
  variants: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const BLOG_ROW = {
  slug: "best-aquarium-filters-iraq",
  title: "أفضل أنواع فلاتر أحواض الأسماك",
  excerpt: "مقارنة عملية.",
  content: "<h3>الخلاصة</h3><p>اختر الفلتر حسب حجم الحوض.</p>",
  category: "معدات",
  author: "AQUAVO Team",
  readTime: "7 دقائق",
  imageUrl: "/images/blog/filters.png",
  publishedAt: new Date("2026-03-08T00:00:00.000Z"),
  updatedAt: new Date("2026-04-01T00:00:00.000Z"),
};

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return {
      query: vi.fn(async (sql: string, values?: unknown[]) => {
        if (sql.includes("FROM products")) {
          const slug = typeof values?.[0] === "string" ? values[0] : null;
          if (slug) return { rows: slug === PRODUCT_ROW.slug ? [PRODUCT_ROW] : [] };
          return { rows: [PRODUCT_ROW] };
        }
        if (sql.includes("FROM blog_posts")) {
          const slug = typeof values?.[0] === "string" ? values[0] : null;
          if (slug) return { rows: slug === BLOG_ROW.slug ? [BLOG_ROW] : [] };
          return { rows: [BLOG_ROW] };
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

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36";

async function render(handler: Handler, url: string, ua: string): Promise<string> {
  let body = "";
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(() => response),
    send: vi.fn((v: unknown) => {
      body = String(v);
      return response;
    }),
    end: vi.fn((v?: unknown) => {
      if (v !== undefined) body = String(v);
      return response;
    }),
  };
  await handler(
    { url, headers: { accept: "text/html", host: "www.aquavoiq.com", "user-agent": ua } } as unknown as VercelRequest,
    response as unknown as VercelResponse,
  );
  return body;
}

function nodes(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (v: unknown): void => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const rec = v as Record<string, unknown>;
    if (typeof rec["@type"] === "string") out.push(rec);
    Object.values(rec).forEach(walk);
  };
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    walk(JSON.parse(m[1]));
  }
  return out;
}

/** Every `@id` used as a *reference* — an object whose only meaningful key is @id. */
function referencedIds(html: string): string[] {
  const refs = new Set<string>();
  const walk = (v: unknown): void => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const rec = v as Record<string, unknown>;
    const keys = Object.keys(rec);
    if (keys.length === 1 && keys[0] === "@id" && typeof rec["@id"] === "string") {
      refs.add(rec["@id"] as string);
    }
    Object.values(rec).forEach(walk);
  };
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    walk(JSON.parse(m[1]));
  }
  return [...refs];
}

/** Only the nodes that are their own JSON-LD entry, not ones nested in a property. */
function topLevelNodes(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    const parsed = JSON.parse(m[1]);
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      if (node && typeof node === "object") out.push(node as Record<string, unknown>);
    }
  }
  return out;
}

function definedIds(html: string): string[] {
  return nodes(html)
    .map((n) => n["@id"])
    .filter((id): id is string => typeof id === "string");
}

const ROUTES = ["/", "/products", "/faq", "/about", "/blog", "/blog/best-aquarium-filters-iraq", "/products/houyi-thermostat"];

describe.each(ROUTES)("structured-data graph closes on %s", (route) => {
  it("defines every @id it references (crawler path)", async () => {
    const html = await render(crawlerHandler as Handler, route, "Googlebot/2.1");
    const defined = definedIds(html);
    for (const ref of referencedIds(html)) {
      expect(defined, `${route}: dangling @id ${ref}`).toContain(ref);
    }
  });

  it("defines every @id it references (browser path)", async () => {
    const html = await render(browserHandler as Handler, route, BROWSER_UA);
    const defined = definedIds(html);
    for (const ref of referencedIds(html)) {
      expect(defined, `${route}: dangling @id ${ref}`).toContain(ref);
    }
  });

  it("defines the store and the site exactly once on each path", async () => {
    for (const html of [
      await render(crawlerHandler as Handler, route, "Googlebot/2.1"),
      await render(browserHandler as Handler, route, BROWSER_UA),
    ]) {
      // Top-level nodes only. An Article's inline `publisher` is also an
      // Organization, but it is a property of the article rather than a second
      // definition of the store, so counting nested nodes here would flag a
      // duplicate that does not exist.
      const top = topLevelNodes(html);
      const stores = top.filter((n) => n["@type"] === "OnlineStore" || n["@type"] === "Organization");
      const sites = top.filter((n) => n["@type"] === "WebSite");
      expect(stores.length, `${route}: expected one store node, got ${stores.length}`).toBe(1);
      expect(sites.length, `${route}: expected one website node, got ${sites.length}`).toBe(1);
    }
  });
});

describe("the shared site node stays free of retired markup", () => {
  it("emits no SearchAction on the routes it was just added to", async () => {
    // Google retired the sitelinks searchbox, so this markup buys nothing.
    // test/seo-no-obsolete-searchaction.test.ts guards the source; this guards
    // the rendered output of the routes that only just started emitting a
    // WebSite node at all, which is where it would reappear unnoticed.
    for (const route of ["/about", "/faq", "/blog", "/products"]) {
      const html = await render(crawlerHandler as Handler, route, "Googlebot/2.1");
      expect(nodes(html).some((n) => n["@type"] === "SearchAction"), route).toBe(false);
      expect(html).not.toContain("search_term_string");
    }
  });

  it("reaches routes that previously had no site node at all", async () => {
    // These are the four that used to reference #website without defining it.
    for (const route of ["/about", "/faq", "/blog", "/blog/best-aquarium-filters-iraq"]) {
      const html = await render(crawlerHandler as Handler, route, "Googlebot/2.1");
      const ids = definedIds(html);
      expect(ids, `${route} must define the website node`).toContain(
        "https://www.aquavoiq.com/#website",
      );
      expect(ids, `${route} must define the organization node`).toContain(
        "https://www.aquavoiq.com/#organization",
      );
    }
  });
});

describe("adding the entities did not disturb existing schema", () => {
  it("keeps the product page's Product node and adds no second store", async () => {
    const html = await render(crawlerHandler as Handler, "/products/houyi-thermostat", "Googlebot/2.1");
    const all = nodes(html);
    expect(all.filter((n) => n["@type"] === "Product")).toHaveLength(1);
    expect(all.filter((n) => n["@type"] === "OnlineStore")).toHaveLength(1);
  });

  it("keeps the home page's product ItemList", async () => {
    const html = await render(crawlerHandler as Handler, "/", "Googlebot/2.1");
    expect(nodes(html).some((n) => n["@type"] === "ItemList")).toBe(true);
  });

  it("keeps the FAQ page's questions", async () => {
    const html = await render(crawlerHandler as Handler, "/faq", "Googlebot/2.1");
    const questions = nodes(html).filter((n) => n["@type"] === "Question");
    expect(questions.length).toBeGreaterThan(0);
  });

  it("invents no business claims on the entity nodes", async () => {
    const html = await render(crawlerHandler as Handler, "/about", "Googlebot/2.1");
    const store = nodes(html).find((n) => n["@type"] === "OnlineStore")!;
    // AQUAVO is online-only: no storefront address, and support really is 24/7.
    expect(store.address).toBeUndefined();
    expect(store.openingHours).toBeUndefined();
    const hours = (store.contactPoint as Record<string, unknown>).hoursAvailable as Record<string, unknown>;
    expect(hours.opens).toBe("00:00");
    expect(hours.closes).toBe("23:59");
  });
});
