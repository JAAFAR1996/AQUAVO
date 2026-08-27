import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

// The product sitemap advertised one image per product. The catalogue holds 342
// real photographs across 112 products, so 230 of them were never offered to
// Google Images even though Product.image had been listing them all along.
// Every image here is a real asset already served by the site — this widens
// what is declared, it does not invent anything.

const MULTI_IMAGE_ROW = {
  slug: "houyi-5-in-1-cleaning-tool",
  name: "طقم تنظيف 5 في 1 لحوض السمك",
  thumbnail: "/images/products/houyi/cleaning-1.webp",
  images: [
    "/images/products/houyi/cleaning-1.webp",
    "/images/products/houyi/cleaning-2.webp",
    "/images/products/houyi/cleaning-3.webp",
  ],
  updatedAt: "2026-08-22T10:00:00.000Z",
};

// A thumbnail that is not part of the images array: both are real pictures of
// the product, so both belong in the sitemap, thumbnail first and no duplicate.
const THUMB_OUTSIDE_ARRAY_ROW = {
  slug: "aquavo-driftwood-dw-02",
  name: "قطعة خشب طبيعية DW-02",
  thumbnail: "https://res.cloudinary.com/dyczh8ogv/image/upload/v1/aquavo/dw02-hero.jpg",
  images: ["/images/products/driftwood/dw-02-a.webp"],
  updatedAt: "2026-08-23T10:00:00.000Z",
};

const IMAGELESS_ROW = {
  slug: "houyi-check-valve",
  name: "صمام عدم رجوع",
  thumbnail: null,
  images: [],
  updatedAt: "2026-08-24T10:00:00.000Z",
};

const ROWS = [MULTI_IMAGE_ROW, THUMB_OUTSIDE_ARRAY_ROW, IMAGELESS_ROW];

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return { query: vi.fn(async () => ({ rows: ROWS })) };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

import handler from "../../api/sitemap-products";

async function renderSitemap(): Promise<string> {
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

// String.raw, not a plain template literal: `[\s\S]` in a plain literal
// collapses to `[sS]` and silently matches nothing — the same trap documented
// in api/_blog-article.ts.
function urlBlock(xml: string, slug: string): string {
  const match = xml.match(new RegExp(String.raw`<url><loc>[^<]*/products/${slug}</loc>[\s\S]*?</url>`));
  if (!match) throw new Error(`no <url> block for ${slug}`);
  return match[0];
}

const imageLocs = (block: string): string[] =>
  [...block.matchAll(/<image:loc>([^<]*)<\/image:loc>/g)].map((m) => m[1]);

describe("product sitemap image coverage", () => {
  it("declares every real image a product has, not just the first", async () => {
    const xml = await renderSitemap();
    expect(imageLocs(urlBlock(xml, MULTI_IMAGE_ROW.slug))).toEqual([
      "https://www.aquavoiq.com/images/products/houyi/cleaning-1.webp",
      "https://www.aquavoiq.com/images/products/houyi/cleaning-2.webp",
      "https://www.aquavoiq.com/images/products/houyi/cleaning-3.webp",
    ]);
  });

  it("leads with the thumbnail and keeps gallery images that are not in it", async () => {
    const xml = await renderSitemap();
    expect(imageLocs(urlBlock(xml, THUMB_OUTSIDE_ARRAY_ROW.slug))).toEqual([
      THUMB_OUTSIDE_ARRAY_ROW.thumbnail,
      "https://www.aquavoiq.com/images/products/driftwood/dw-02-a.webp",
    ]);
  });

  it("never declares the same image twice for one product", async () => {
    const xml = await renderSitemap();
    const locs = imageLocs(urlBlock(xml, MULTI_IMAGE_ROW.slug));
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("declares no image for a product that has none", async () => {
    const xml = await renderSitemap();
    expect(imageLocs(urlBlock(xml, IMAGELESS_ROW.slug))).toEqual([]);
  });

  it("titles every declared image with the product it belongs to", async () => {
    const xml = await renderSitemap();
    const block = urlBlock(xml, MULTI_IMAGE_ROW.slug);
    const titles = [...block.matchAll(/<image:title>([^<]*)<\/image:title>/g)].map((m) => m[1]);
    expect(titles).toHaveLength(3);
    expect(new Set(titles)).toEqual(new Set([MULTI_IMAGE_ROW.name]));
  });

  it("still emits one <url> per product and keeps its real lastmod", async () => {
    const xml = await renderSitemap();
    expect(xml.match(/<loc>/g) ?? []).toHaveLength(ROWS.length);
    expect(urlBlock(xml, MULTI_IMAGE_ROW.slug)).toContain("<lastmod>2026-08-22</lastmod>");
    expect(urlBlock(xml, IMAGELESS_ROW.slug)).toContain("<lastmod>2026-08-24</lastmod>");
  });
});
