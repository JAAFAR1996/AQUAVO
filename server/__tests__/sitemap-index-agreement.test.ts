import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

// /sitemap.xml exists twice on purpose. Vercel serves a static asset ahead of a
// rewrite, so client/public/sitemap.xml is the copy Google actually reads, and
// api/sitemap-index.ts is the route behind it. The static file's own comment
// says the two "must be kept in step" — but nothing enforced it, so they were
// free to drift, and they did: the release that added 81 <image:image> entries
// to sitemap-blog.xml left both copies advertising the previous lastmod, which
// tells Google the child sitemap has not changed and need not be refetched.
//
// These tests are that missing enforcement.

import handler from "../../api/sitemap-index";

const here = dirname(fileURLToPath(import.meta.url));
const staticXml = readFileSync(resolve(here, "../../client/public/sitemap.xml"), "utf8");

async function renderRoute(): Promise<string> {
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

const pairs = (xml: string): Array<[string, string]> => {
  const blocks = [...xml.matchAll(/<sitemap>[\s\S]*?<\/sitemap>/g)].map((m) => m[0]);
  return blocks.map((block) => {
    const loc = block.match(/<loc>([^<]*)<\/loc>/)?.[1]?.trim() ?? "";
    const lastmod = block.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1]?.trim() ?? "";
    return [loc, lastmod] as [string, string];
  });
};

describe("sitemap index: static file and route agree", () => {
  it("lists the same sitemaps in the same order", async () => {
    const fromFile = pairs(staticXml).map(([loc]) => loc);
    const fromRoute = pairs(await renderRoute()).map(([loc]) => loc);
    expect(fromFile).toEqual(fromRoute);
  });

  // The assertion that would have failed on the release that added the blog
  // images: the two copies must carry the same lastmod for each child sitemap.
  it("advertises the same lastmod for every sitemap", async () => {
    expect(pairs(staticXml)).toEqual(pairs(await renderRoute()));
  });

  it("gives every listed sitemap a lastmod, in ISO form", () => {
    const listed = pairs(staticXml);
    expect(listed.length).toBeGreaterThan(0);
    for (const [loc, lastmod] of listed) {
      expect(lastmod, `${loc} has no lastmod`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  // sitemap-blog.xml gained 81 <image:image> entries on 2026-08-27. A stamp
  // older than that says "not modified" about a release that rewrote the file.
  it("does not advertise the blog sitemap as older than its image release", () => {
    const blog = pairs(staticXml).find(([loc]) => loc.endsWith("/sitemap-blog.xml"));
    expect(blog, "blog sitemap is not listed").toBeDefined();
    expect(blog![1] >= "2026-08-27").toBe(true);
  });
});
