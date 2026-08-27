import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

// sitemap-products.xml declared 342 photographs; sitemap-blog.xml declared none,
// even though every one of the 81 published posts stores a hero image the site
// already serves. The whole blog corpus was therefore invisible to Google
// Images. Every image asserted here is a real, already-served asset — this
// widens what is declared, it does not invent anything.

const CLOUDINARY_ROW = {
  slug: "aquarium-planted-led-lighting-guide",
  title: "دليل إضاءة LED للأحواض المزروعة",
  imageUrl: "https://res.cloudinary.com/dyczh8ogv/image/upload/v1/aquavo/blog/planted.png",
  publishedAt: "2026-08-10T10:00:00.000Z",
  updatedAt: "2026-08-18T10:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
};

// 80 of the 81 posts store an absolute Cloudinary URL; one stores a
// site-relative path. <image:loc> must be absolute, so this one is anchored to
// the canonical host rather than dropped.
const RELATIVE_IMAGE_ROW = {
  slug: "planted-tank-substrate-guide",
  title: "دليل شامل لتربة وديكور الأحواض",
  imageUrl: "/images/blog/blog_planted_tank.png",
  publishedAt: "2026-08-05T10:00:00.000Z",
  updatedAt: null,
  createdAt: "2026-08-05T10:00:00.000Z",
};

const IMAGELESS_ROW = {
  slug: "aquarium-water-change-basics",
  title: "أساسيات تغيير ماء الحوض",
  imageUrl: null,
  publishedAt: "2026-08-12T10:00:00.000Z",
  updatedAt: null,
  createdAt: "2026-08-12T10:00:00.000Z",
};

// A stored value that is present but blank must behave like no image at all,
// not emit an <image:image> pointing at the site root.
const BLANK_IMAGE_ROW = {
  slug: "choosing-an-aquarium-heater",
  title: "اختيار سخان الحوض",
  imageUrl: "   ",
  publishedAt: "2026-08-14T10:00:00.000Z",
  updatedAt: null,
  createdAt: "2026-08-14T10:00:00.000Z",
};

const ROWS = [CLOUDINARY_ROW, RELATIVE_IMAGE_ROW, IMAGELESS_ROW, BLANK_IMAGE_ROW];

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return { query: vi.fn(async () => ({ rows: ROWS })) };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

import handler from "../../api/sitemap-blog";

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
  const match = xml.match(new RegExp(String.raw`<url><loc>[^<]*/blog/${slug}</loc>[\s\S]*?</url>`));
  if (!match) throw new Error(`no <url> block for ${slug}`);
  return match[0];
}

const imageLocs = (block: string): string[] =>
  [...block.matchAll(/<image:loc>([^<]*)<\/image:loc>/g)].map((m) => m[1]);

describe("blog sitemap image coverage", () => {
  it("declares the image namespace so <image:image> is not ignored", async () => {
    const xml = await renderSitemap();
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
  });

  it("declares the hero image a post already serves", async () => {
    const xml = await renderSitemap();
    expect(imageLocs(urlBlock(xml, CLOUDINARY_ROW.slug))).toEqual([CLOUDINARY_ROW.imageUrl]);
  });

  it("absolutises a site-relative image rather than dropping it", async () => {
    const xml = await renderSitemap();
    expect(imageLocs(urlBlock(xml, RELATIVE_IMAGE_ROW.slug))).toEqual([
      "https://www.aquavoiq.com/images/blog/blog_planted_tank.png",
    ]);
  });

  it("declares no image for a post that has none", async () => {
    const xml = await renderSitemap();
    expect(imageLocs(urlBlock(xml, IMAGELESS_ROW.slug))).toEqual([]);
  });

  it("treats a blank stored image as no image, never as the site root", async () => {
    const xml = await renderSitemap();
    expect(imageLocs(urlBlock(xml, BLANK_IMAGE_ROW.slug))).toEqual([]);
  });

  it("titles the declared image with the post it belongs to", async () => {
    const xml = await renderSitemap();
    const block = urlBlock(xml, CLOUDINARY_ROW.slug);
    const titles = [...block.matchAll(/<image:title>([^<]*)<\/image:title>/g)].map((m) => m[1]);
    expect(titles).toEqual([CLOUDINARY_ROW.title]);
  });

  it("still emits one <url> per post and keeps its real lastmod", async () => {
    const xml = await renderSitemap();
    expect(xml.match(/<loc>/g) ?? []).toHaveLength(ROWS.length);
    expect(urlBlock(xml, CLOUDINARY_ROW.slug)).toContain("<lastmod>2026-08-18</lastmod>");
    expect(urlBlock(xml, IMAGELESS_ROW.slug)).toContain("<lastmod>2026-08-12</lastmod>");
  });
});
