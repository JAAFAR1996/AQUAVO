import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

import pagesHandler from "../../api/sitemap-pages";
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

describe("sitemap-pages: the eleven category listings are advertised", () => {
  it("lists every canonical category URL", async () => {
    const locs = locsOf(await render(pagesHandler));
    for (const category of AQUAVO_PRODUCT_CATEGORIES) {
      const expected = `${AQUAVO_BASE_URL}${categoryProductsPath(category)}`;
      expect(locs, `${category} is not in sitemap-pages.xml`).toContain(expected);
    }
  });

  it("advertises exactly the static paths plus the eleven categories", async () => {
    const locs = locsOf(await render(pagesHandler));
    expect(locs).toHaveLength(PUBLIC_INDEXABLE_PATHS.length + AQUAVO_PRODUCT_CATEGORIES.length);
  });

  it("emits no duplicate URL, in any encoding", async () => {
    const locs = locsOf(await render(pagesHandler));
    expect(new Set(locs).size, "a URL is listed twice").toBe(locs.length);
    // Two spellings of the same resource (%20 vs +, encoded vs raw UTF-8) are
    // distinct strings but one page. Compare on the decoded form too.
    const decoded = locs.map((loc) => decodeURIComponent(loc.replace(/\+/g, "%20")));
    expect(new Set(decoded).size, "two encodings of one URL are listed").toBe(decoded.length);
  });

  it("uses one encoding form: percent-encoded UTF-8, %20 for spaces", async () => {
    const categoryLocs = locsOf(await render(pagesHandler)).filter((loc) => loc.includes("?category="));
    expect(categoryLocs).toHaveLength(AQUAVO_PRODUCT_CATEGORIES.length);
    for (const loc of categoryLocs) {
      expect(loc, `${loc} carries raw non-ASCII`).toMatch(/^[\x21-\x7e]+$/);
      expect(loc, `${loc} uses + for a space`).not.toContain("+");
      const value = loc.split("?category=")[1];
      // Re-encoding the decoded value must reproduce it byte for byte, which is
      // what makes the sitemap URL string-identical to the emitted canonical.
      expect(encodeURIComponent(decodeURIComponent(value))).toBe(value);
    }
  });

  it("advertises the canonical Arabic value, never an English alias", async () => {
    const locs = locsOf(await render(pagesHandler));
    for (const alias of ["filters", "heaters", "lighting", "food", "decor", "tanks"]) {
      expect(locs).not.toContain(`${AQUAVO_BASE_URL}/products?category=${alias}`);
    }
  });

  it("gives every URL a lastmod in ISO form", async () => {
    const blocks = urlBlocks(await render(pagesHandler));
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const lastmod = block.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1] ?? "";
      expect(lastmod, `${block} has no ISO lastmod`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
