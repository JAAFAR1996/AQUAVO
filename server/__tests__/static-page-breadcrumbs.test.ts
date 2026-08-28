import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describe, expect, it, vi } from "vitest";

// The crawler path builds a WebPage and a BreadcrumbList for every static page
// through webPageSchema in _ssr-preview-source, but most STATIC_PAGES entries
// in ssr-meta carry no `jsonLd` at all, so browsers were served neither.
//
// Measured on live production 618c9ad8, counting "BreadcrumbList": 17 URLs
// published one to a crawler and none to a browser — including every entry in
// BARE_PAGES below.

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return { query: vi.fn(async () => ({ rows: [] })) };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

import handler from "../../api/ssr-meta";

// Rendered the way ssr-meta serves a browser: no crawler UA, HTML accepted.
async function render(path: string): Promise<string> {
  let body = "";
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(() => res),
    send: vi.fn((value: unknown) => {
      body = String(value);
      return res;
    }),
    end: vi.fn(() => res),
  };
  await handler(
    { url: path, headers: { host: "www.aquavoiq.com", accept: "text/html" } } as unknown as VercelRequest,
    res as unknown as VercelResponse,
  );
  return body;
}

const nodes = (html: string): Record<string, unknown>[] => {
  const out: Record<string, unknown>[] = [];
  for (const [, raw] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const parsed = JSON.parse(raw);
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) out.push(node as Record<string, unknown>);
  }
  return out;
};

const typed = (html: string, type: string) => nodes(html).filter((n) => n["@type"] === type);

const BARE_PAGES = ["/shipping", "/terms", "/deals", "/journey", "/return-policy", "/privacy-policy"];

// These publish a graph of their own and were missing only the trail, so a
// fallback keyed on "has no jsonLd" would have skipped them entirely.
const PAGES_WITH_OWN_GRAPH: Array<[string, string]> = [
  ["/calculators", "WebApplication"],
  ["/faq", "FAQPage"],
];

describe("static pages publish a breadcrumb to browsers too", () => {
  it.each(BARE_PAGES)("publishes a WebPage and a BreadcrumbList for %s", async (path) => {
    const html = await render(path);
    expect(typed(html, "WebPage").length, `${path} has no WebPage`).toBe(1);
    expect(typed(html, "BreadcrumbList").length, `${path} has no BreadcrumbList`).toBe(1);
  });

  it.each(BARE_PAGES)("roots %s's trail at the homepage and names it after itself", async (path) => {
    const html = await render(path);
    const crumb = typed(html, "BreadcrumbList")[0] as { itemListElement: Array<Record<string, unknown>> };
    const items = crumb.itemListElement;
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("الرئيسية");
    expect(items[1].item).toBe(`https://www.aquavoiq.com${path}`);
    // Named, and never left empty by the brand-suffix stripper.
    expect(String(items[1].name).length).toBeGreaterThan(0);
    expect(String(items[1].name)).not.toMatch(/\|\s*AQUAVO\s*$/);
  });

  it("still publishes exactly one WebSite, not a second copy", async () => {
    for (const path of BARE_PAGES) {
      const html = await render(path);
      expect(typed(html, "WebSite").length, `${path} duplicated WebSite`).toBe(1);
    }
  });

  it.each(PAGES_WITH_OWN_GRAPH)("keeps %s's own %s and still adds the trail", async (path, type) => {
    const html = await render(path);
    expect(typed(html, type).length, `${path} lost its own ${type}`).toBe(1);
    expect(typed(html, "BreadcrumbList").length, `${path} has no BreadcrumbList`).toBe(1);
  });

  // These two are in sitemap-pages.xml and served `index, follow`, but have no
  // STATIC_PAGES entry — their copy comes from getSeoMetaOverride — so the
  // STATIC_PAGES fix could not reach them. Verified live on 10258ea4: 15 of the
  // 17 gap pages were closed and exactly these two still published none.
  it.each(["/sustainability", "/aquarium-wizard"])(
    "gives %s a trail even though it has no STATIC_PAGES entry",
    async (path) => {
      const html = await render(path);
      const crumbs = typed(html, "BreadcrumbList");
      expect(crumbs.length, `${path} has no BreadcrumbList`).toBe(1);
      const items = (crumbs[0] as { itemListElement: Array<Record<string, unknown>> }).itemListElement;
      expect(items[0].name).toBe("الرئيسية");
      expect(items[1].item).toBe(`https://www.aquavoiq.com${path}`);
      expect(String(items[1].name)).not.toMatch(/\|\s*AQUAVO\s*$/);
      // Named from the override, not from the homepage default title.
      expect(String(items[1].name)).not.toBe("AQUAVO");
    },
  );

  it("adds no breadcrumb to a 404, which describes no page", async () => {
    const html = await render("/this-route-does-not-exist-xyz");
    expect(typed(html, "BreadcrumbList")).toHaveLength(0);
  });
});
