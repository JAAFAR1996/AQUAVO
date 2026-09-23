import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

import ssrMetaHandler from "../../api/ssr-meta";
import { renderSeoPreviewShell, type SeoPreviewProduct } from "../../api/_seo-preview-shell";
import {
  CATEGORY_SEARCH,
  CATEGORY_SEARCH_CKB,
  CATEGORY_SEARCH_EN,
  categoryFaqHeading,
  categorySearch,
} from "../../shared/category-search";
import { AQUAVO_PRODUCT_CATEGORIES } from "../../shared/seo-contract";
import { LOCALES, SUPPORTED_LOCALES, type Locale } from "../../shared/i18n/locales";
import { RELEASED_LOCALES } from "../../shared/i18n/release";

/**
 * 2026-09-23. Search Console showed no English or Kurdish query reaching the
 * store in 90 days. Three causes, each pinned here:
 *
 *  1. The Kurdish hreflang code was "ckb-IQ". Google reads only ISO 639-1
 *     language codes in hreflang, and "ckb" is ISO 639-3, so every Kurdish
 *     alternate was ignored since the locale launched. "ku" is the ISO 639-1
 *     code for Kurdish.
 *  2. Googlebot is routed to the crawler handler, which passed only the
 *     localized static pages through the hreflang injector. Every Arabic page
 *     (home, product, listing) reached Google with no alternates at all, so
 *     the annotations were never reciprocal.
 *  3. The /en and /ckb listings carried a templated catalogue title over an
 *     empty static shell, while the Arabic listing had buyer vocabulary,
 *     three questions and product links.
 *
 * Plus the sitemap: /sitemap-pages.xml was routed to the Express server, whose
 * copy listed the static Arabic paths only, so api/sitemap-pages.ts (categories,
 * every released locale, xhtml alternates) was dead code that its tests kept
 * passing against.
 */

// One live product per category, so a listing renders as a listing (an empty
// category is a semantic 404 by design) and the product list is visible.
const PRODUCT_ROWS = ["الفلترة والتنقية", "التحكم بالحرارة"].map((category, i) => ({
  id: `${i + 1}`,
  slug: `p-${i + 1}`,
  name: `منتج ${i + 1}`,
  description: "",
  price: "1000",
  originalPrice: null,
  currency: "IQD",
  brand: null,
  category,
  stock: 3,
  thumbnail: null,
  images: [],
  hasVariants: false,
  variants: [],
  rating: null,
  reviewCount: 0,
}));

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return {
      query: vi.fn(async (sql: string, values?: unknown[]) => {
        if (!/FROM\s+products/i.test(sql)) return { rows: [] };
        const category = values?.[0];
        return { rows: category ? PRODUCT_ROWS.filter((r) => r.category === category) : PRODUCT_ROWS };
      }),
    };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

const here = dirname(fileURLToPath(import.meta.url));
const repoFile = (path: string): string => readFileSync(resolve(here, "../..", path), "utf8");

const FILTERS = "الفلترة والتنقية";
const HEATERS = "التحكم بالحرارة";
const listingPath = (category: string) => `/products?category=${encodeURIComponent(category)}`;

function createResponse() {
  let statusCode: number | undefined;
  let body = "";
  const headers: Record<string, string> = {};
  const response = {
    setHeader: vi.fn((k: string, v: string) => { headers[k] = v; return response; }),
    status: vi.fn((code: number) => { statusCode = code; return response; }),
    send: vi.fn((value: unknown) => { body = String(value); return response; }),
    end: vi.fn((value?: unknown) => { if (value !== undefined) body = String(value); return response; }),
  };
  return { response: response as unknown as VercelResponse, status: () => statusCode, body: () => body, headers };
}

async function crawl(path: string): Promise<{ html: string; status: number | undefined }> {
  const handler = (await import("../../api/_ssr-preview-source")).default;
  const r = createResponse();
  const req = {
    url: path,
    headers: {
      accept: "text/html",
      host: "www.aquavoiq.com",
      "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    },
  } as unknown as VercelRequest;
  await handler(req, r.response);
  return { html: r.body(), status: r.status() };
}

async function browse(path: string): Promise<{ html: string; status: number | undefined }> {
  const r = createResponse();
  await ssrMetaHandler({ url: path, headers: { accept: "text/html" } } as unknown as VercelRequest, r.response);
  return { html: r.body(), status: r.status() };
}

const escapeHtml = (value: string): string => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const hreflangs = (html: string): string[] =>
  [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]);

describe("Kurdish hreflang uses the ISO 639-1 code Google reads", () => {
  it("advertises Sorani as ku-IQ, never ckb-IQ", () => {
    expect(LOCALES.ckb.hreflang).toBe("ku-IQ");
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALES[locale].hreflang, locale).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    }
  });
});

describe("Arabic pages carry the hreflang set on the crawler path", () => {
  const expected = ["ar-IQ", ...RELEASED_LOCALES.filter((l) => l !== "ar").map((l) => LOCALES[l].hreflang), "x-default"];

  it("home", async () => {
    const { html, status } = await crawl("/");
    expect(status).toBe(200);
    expect(hreflangs(html).sort()).toEqual([...expected].sort());
  });

  it("category listing, keeping the category query on every alternate", async () => {
    const { html, status } = await crawl(listingPath(HEATERS));
    expect(status).toBe(200);
    expect(hreflangs(html).sort()).toEqual([...expected].sort());
    expect(html).toContain(`hreflang="x-default" href="https://www.aquavoiq.com${listingPath(HEATERS)}"`);
    if (RELEASED_LOCALES.includes("en")) {
      expect(html).toContain(`hreflang="en" href="https://www.aquavoiq.com/en${listingPath(HEATERS)}"`);
    }
  });

  it("names the alternates by the canonical query, not by a tracking parameter on the request", async () => {
    const { html, status } = await crawl(`${listingPath(HEATERS)}&utm_source=newsletter`);
    expect(status).toBe(200);
    expect(hreflangs(html).length).toBeGreaterThan(0);
    expect(html).not.toMatch(/hreflang="[^"]+" href="[^"]*utm_source/);
    expect(html).toContain(`hreflang="x-default" href="https://www.aquavoiq.com${listingPath(HEATERS)}"`);
  });

  it("stays absent from a noindex page", async () => {
    const { html } = await crawl("/cart");
    expect(hreflangs(html)).toEqual([]);
  });
});

describe("English and Kurdish listings are the same document as the Arabic one", () => {
  const product = (category: string): SeoPreviewProduct =>
    ({ id: "1", slug: "p", name: "منتج", category, price: "1000", stock: 3 }) as SeoPreviewProduct;

  it.each(["en", "ckb"] as const)("crawler shell in %s: buyer heading, three questions, FAQ heading", (locale) => {
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      const html = renderSeoPreviewShell({ kind: "products", products: [product(category)], category }, locale);
      const search = categorySearch(category, locale)!;
      expect(html, `${locale} ${category}`).toContain(`<h1>${escapeHtml(search.heading)}</h1>`);
      expect(html, `${locale} ${category}`).toContain(categoryFaqHeading(locale));
      for (const q of search.faq) expect(html, `${locale} ${category}`).toContain(`<h3>${escapeHtml(q.question)}</h3>`);
      // The Arabic-only intro and guide rail must not leak into another language.
      expect(html, `${locale} ${category}`).not.toContain("aq-ssr-category-intro");
      expect(html, `${locale} ${category}`).not.toContain("aq-ssr-guide-links");
    }
  });

  it.each(["en", "ckb"] as const)("crawler path in %s: English/Kurdish title, own canonical, FAQPage, product list", async (locale) => {
    const { html, status } = await crawl(`/${locale}${listingPath(FILTERS)}`);
    expect(status).toBe(200);
    const search = categorySearch(FILTERS, locale)!;
    expect(html).toContain(`<title>${escapeHtml(search.title)}</title>`);
    expect(html).toContain(`<h1>${escapeHtml(search.heading)}</h1>`);
    expect(html).toContain(`rel="canonical" href="https://www.aquavoiq.com/${locale}${listingPath(FILTERS)}"`);
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain(`<html lang="${locale}"`);
    expect(html).not.toContain("Aquarium Products in Iraq |");
    expect(html).not.toContain("بەرهەمەکانی فلتەرکردن و پاککردنەوە بۆ حەوزی ماسی لە عێراق |");
  });

  it.each(["en", "ckb"] as const)("browser path in %s: same title and FAQPage as the crawler", async (locale) => {
    const { html, status } = await browse(`/${locale}${listingPath(FILTERS)}`);
    expect(status).toBe(200);
    const search = categorySearch(FILTERS, locale)!;
    expect(html).toContain(`<title>${escapeHtml(search.title)}</title>`);
    expect(html).toContain(`rel="canonical" href="https://www.aquavoiq.com/${locale}${listingPath(FILTERS)}"`);
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain(search.faq[0].question.replace(/"/g, '\\"'));
  });
});

describe("category search copy in English and Kurdish", () => {
  const tables: Array<[Locale, Readonly<Record<string, { heading: string; title: string; description?: string; faq: readonly { question: string; answer: string }[] }>>]> = [
    ["en", CATEGORY_SEARCH_EN],
    ["ckb", CATEGORY_SEARCH_CKB],
  ];

  it.each(tables)("%s covers exactly the eleven canonical categories", (_locale, table) => {
    expect(Object.keys(table).sort()).toEqual([...AQUAVO_PRODUCT_CATEGORIES].sort());
  });

  it.each(tables)("%s gives every category a heading, a branded title under 70 chars, a description and three answered questions", (locale, table) => {
    for (const [category, c] of Object.entries(table)) {
      expect(c.heading.length, `${locale} ${category} heading`).toBeGreaterThan(8);
      expect(c.title, `${locale} ${category} title`).toMatch(/ \| AQUAVO$/);
      expect(c.title.replace(/ \| AQUAVO$/, "").length, `${locale} ${category} title length`).toBeLessThanOrEqual(70);
      expect(c.description, `${locale} ${category} description`).toBeDefined();
      expect(c.description!.length, `${locale} ${category} description length`).toBeLessThanOrEqual(160);
      expect(c.faq.length, `${locale} ${category} faq`).toBe(3);
      for (const q of c.faq) {
        expect(q.question, `${locale} ${category} question`).toMatch(/[؟?]$/);
        expect(q.answer.split(/\s+/).length, `${locale} ${category} answer length`).toBeGreaterThanOrEqual(25);
        expect(q.answer.split(/\s+/).length, `${locale} ${category} answer length`).toBeLessThanOrEqual(90);
      }
    }
  });

  it.each(tables)("%s repeats no title, heading, description or question across categories", (_locale, table) => {
    const seen = new Map<string, string>();
    for (const [category, c] of Object.entries(table)) {
      for (const line of [c.title, c.heading, c.description!, ...c.faq.map((q) => q.question), ...c.faq.map((q) => q.answer)]) {
        expect(seen.get(line), `"${line.slice(0, 40)}" appears twice`).toBeUndefined();
        seen.set(line, category);
      }
    }
  });

  it.each(tables)("%s never quotes a price, a wattage or a product name", (_locale, table) => {
    for (const [category, c] of Object.entries(table)) {
      const text = [c.heading, c.title, c.description, ...c.faq.flatMap((q) => [q.question, q.answer])].join(" ");
      expect(text, `${category} price`).not.toMatch(/IQD|dinar\s*\d|د\.ع|\d{3,}/);
      expect(text, `${category} wattage`).not.toMatch(/\d+\s*(W\b|watt|واط|وات)/);
      expect(text, `${category} brand`).not.toMatch(/HOUYI|SOBO|Hygger/i);
    }
  });

  it("English titles are phrased the way Iraq's autocomplete phrases the demand", () => {
    // Google autocomplete for gl=iq: "aquarium filter", "aquarium heater",
    // "fish tank(s) for sale", "aquarium light", "aquarium substrate".
    expect(CATEGORY_SEARCH_EN[FILTERS].title).toMatch(/^Aquarium Filters?/);
    expect(CATEGORY_SEARCH_EN[HEATERS].title).toMatch(/^Aquarium Heaters?/);
    expect(CATEGORY_SEARCH_EN["أحواض"].title).toMatch(/^Fish Tanks? for Sale/);
    for (const c of Object.values(CATEGORY_SEARCH_EN)) expect(c.title).toContain("in Iraq");
  });

  it("Kurdish titles say ئاکواریۆم, because حەوزی ماسی alone reads as a fish farm pond in search", () => {
    for (const [category, c] of Object.entries(CATEGORY_SEARCH_CKB)) {
      expect(c.title, category).toContain("ئاکواریۆم");
      expect(c.title, category).toContain("عێراق");
    }
  });

  it("the three languages answer the same questions, in the same order", () => {
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      expect(CATEGORY_SEARCH_EN[category].faq.length).toBe(CATEGORY_SEARCH[category].faq.length);
      expect(CATEGORY_SEARCH_CKB[category].faq.length).toBe(CATEGORY_SEARCH[category].faq.length);
    }
  });

  it("falls back to Arabic for an unknown locale value and resolves aliases in every locale", () => {
    expect(categorySearch("heaters", "en")).toBe(CATEGORY_SEARCH_EN[HEATERS]);
    expect(categorySearch("heaters", "ckb")).toBe(CATEGORY_SEARCH_CKB[HEATERS]);
    expect(categorySearch(HEATERS, "xx" as Locale)).toBe(CATEGORY_SEARCH[HEATERS]);
    expect(categorySearch("لا شيء", "en")).toBeUndefined();
  });
});

describe("/sitemap-pages.xml reaches the handler that lists categories and locales", () => {
  it("vercel.json routes it to api/sitemap-pages, not the Express catch-all", () => {
    const config = JSON.parse(repoFile("vercel.json")) as {
      rewrites?: Array<{ source: string; destination: string }>;
      routes?: Array<{ src?: string; source?: string; dest?: string; destination?: string }>;
      functions?: Record<string, unknown>;
    };
    const rules = [...(config.rewrites ?? []), ...(config.routes ?? [])].map((r) => ({
      source: (r as { source?: string; src?: string }).source ?? (r as { src?: string }).src ?? "",
      destination: (r as { destination?: string; dest?: string }).destination ?? (r as { dest?: string }).dest ?? "",
    }));
    const rule = rules.find((r) => r.source === "/sitemap-pages.xml");
    expect(rule, "no rule for /sitemap-pages.xml").toBeDefined();
    expect(rule!.destination).toBe("/api/sitemap-pages");
    expect(config.functions?.["api/sitemap-pages.ts"], "function config").toBeDefined();
  });

  it("the Express server no longer registers a shadowing copy", () => {
    const source = repoFile("server/routes/system.ts");
    expect(source).not.toMatch(/router\.get\("\/sitemap-pages\.xml"/);
    expect(source).not.toContain("publicSitemapPages");
  });
});
