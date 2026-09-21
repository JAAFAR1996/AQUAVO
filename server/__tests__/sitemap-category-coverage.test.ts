import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";
import { SUPPORTED_LOCALES as _SUPPORTED_LOCALES } from "../../shared/i18n/locales.js";
import { RELEASED_LOCALES, isLocaleReleased } from "../../shared/i18n/release.js";

import pagesHandler, { categoryPathsFromRows, renderPagesSitemap } from "../../api/sitemap-pages";
import indexHandler from "../../api/sitemap-index";
import {
  AQUAVO_BASE_URL,
  AQUAVO_PRODUCT_CATEGORIES,
  PUBLIC_INDEXABLE_PATHS,
  categoryProductsPath,
} from "../../shared/seo-contract";

// The eleven category listings are the only commercial browse pages AQUAVO has
// between the storefront root and a single product, and every one of them was
// missing from every sitemap: /sitemap-pages.xml carried the 23 static paths
// and nothing else, so Google was told the catalogue has one listing page
// (/products) instead of eleven category-scoped ones. These tests fail against
// that state and pass once the categories are advertised.

const here = dirname(fileURLToPath(import.meta.url));
const staticIndexXml = readFileSync(resolve(here, "../../client/public/sitemap.xml"), "utf8");

async function render(handler: (req: VercelRequest, res: VercelResponse) => unknown): Promise<string> {
  let body = "";
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(() => res),
    send: vi.fn((value: unknown) => {
      body = String(value);
      return res;
    }),
  };
  await handler({} as VercelRequest, res as unknown as VercelResponse);
  return body;
}

const locsOf = (xml: string): string[] =>
  [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].trim());

const urlBlocks = (xml: string): string[] =>
  [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);

describe("sitemap-pages: only live category listings are advertised", () => {
  const liveCategories = AQUAVO_PRODUCT_CATEGORIES.slice(0, 3);
  const emptyCategory = AQUAVO_PRODUCT_CATEGORIES[3];
  const categoryPaths = categoryPathsFromRows([
    ...liveCategories.map((category) => ({ category })),
    { category: liveCategories[0] }, // DB/grouping or future query changes must not duplicate.
    { category: "not-a-real-category" },
    { category: null },
  ]);
  const xml = renderPagesSitemap(categoryPaths);

  it("normalizes DB rows to canonical, unique category paths", () => {
    expect(categoryPaths).toEqual(liveCategories.map(categoryProductsPath));
    expect(categoryPaths).not.toContain(categoryProductsPath(emptyCategory));
  });

  it("lists live categories and omits an empty category", () => {
    const locs = locsOf(xml);
    for (const category of liveCategories) {
      expect(locs).toContain(`${AQUAVO_BASE_URL}${categoryProductsPath(category)}`);
    }
    expect(locs).not.toContain(`${AQUAVO_BASE_URL}${categoryProductsPath(emptyCategory)}`);
  });

  it("advertises exactly the static paths plus live categories, once per released locale", () => {
    const locs = locsOf(xml);
    const expectedPerLocale = PUBLIC_INDEXABLE_PATHS.length + liveCategories.length;
    expect(locs).toHaveLength(expectedPerLocale * RELEASED_LOCALES.length);
    const enCount = locs.filter((l) => l.startsWith(`${AQUAVO_BASE_URL}/en/`) || l === `${AQUAVO_BASE_URL}/en`).length;
    expect(enCount).toBe(isLocaleReleased("en") ? expectedPerLocale : 0);
    expect(xml).toContain('hreflang="x-default"');
    expect(xml.includes('hreflang="ckb-IQ"')).toBe(isLocaleReleased("ckb"));
  });

  it("emits no duplicate URL, in any encoding", () => {
    const locs = locsOf(xml);
    expect(new Set(locs).size, "a URL is listed twice").toBe(locs.length);
    const decoded = locs.map((loc) => decodeURIComponent(loc.replace(/\+/g, "%20")));
    expect(new Set(decoded).size, "two encodings of one URL are listed").toBe(decoded.length);
  });

  it("uses one encoding form: percent-encoded UTF-8, %20 for spaces", () => {
    const categoryLocs = locsOf(xml).filter((loc) => loc.includes("?category="));
    expect(categoryLocs).toHaveLength(liveCategories.length * RELEASED_LOCALES.length);
    for (const loc of categoryLocs) {
      expect(loc, `${loc} carries raw non-ASCII`).toMatch(/^[\x21-\x7e]+$/);
      expect(loc, `${loc} uses + for a space`).not.toContain("+");
      const value = loc.split("?category=")[1];
      expect(encodeURIComponent(decodeURIComponent(value))).toBe(value);
    }
  });

  it("advertises the canonical Arabic value, never an English alias", () => {
    const locs = locsOf(xml);
    for (const alias of ["filters", "heaters", "lighting", "food", "decor", "tanks"]) {
      expect(locs).not.toContain(`${AQUAVO_BASE_URL}/products?category=${alias}`);
    }
  });

  it("gives every URL a lastmod in ISO form", () => {
    const blocks = urlBlocks(xml);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const lastmod = block.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1] ?? "";
      expect(lastmod, `${block} has no ISO lastmod`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("falls back to static pages only when DATABASE_URL is unavailable", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const locs = locsOf(await render(pagesHandler));
      expect(locs).toHaveLength(PUBLIC_INDEXABLE_PATHS.length * RELEASED_LOCALES.length);
      expect(locs.some((loc) => loc.includes("?category="))).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});

describe("sitemap index: the pages stamp moves when pages gains the categories", () => {
  it("does not advertise sitemap-pages as older than the category release", async () => {
    for (const xml of [staticIndexXml, await render(indexHandler)]) {
      const block = [...xml.matchAll(/<sitemap>[\s\S]*?<\/sitemap>/g)]
        .map((m) => m[0])
        .find((b) => b.includes("/sitemap-pages.xml"));
      expect(block, "sitemap-pages.xml is not listed").toBeDefined();
      const lastmod = block!.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1] ?? "";
      expect(lastmod >= "2026-08-29", `pages lastmod ${lastmod} predates the category release`).toBe(true);
    }
  });

  it("leaves the products and guides stamps alone", async () => {
    const routeXml = await render(indexHandler);
    for (const name of ["/sitemap-products.xml", "/sitemap-guides.xml"]) {
      const block = [...routeXml.matchAll(/<sitemap>[\s\S]*?<\/sitemap>/g)]
        .map((m) => m[0])
        .find((b) => b.includes(name));
      const lastmod = block!.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1] ?? "";
      expect(lastmod, `${name} was restamped by a pages-only change`).toBe("2026-08-25");
    }
  });
});
