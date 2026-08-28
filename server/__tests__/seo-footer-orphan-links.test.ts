import { describe, expect, it, vi } from "vitest";

// A crawl of the bot-rendered link graph outward from the homepage reached 11
// of the 26 entries in sitemap-pages.xml. The other 15 answered 200 and were
// served `index, follow`, but nothing on the site linked to them — they were
// discoverable only through the sitemap, which carries no internal link equity.
//
// These tests pin two things that silently rotted before: that the anchors
// exist at all, and that their text still matches the heading of the page each
// one points at.

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: vi.fn().mockImplementation(function FakePool() {
    return { query: vi.fn(async () => ({ rows: [] })) };
  }),
}));

process.env.DATABASE_URL ||= "postgres://test-user:test-pass@localhost:5432/test-db";

import { FOOTER_EXPLORE_LINKS, renderSeoPreviewShell } from "../../api/_seo-preview-shell";
import { STATIC_COPY } from "../../api/_ssr-preview-source";

// Every sitemap-pages.xml entry that had no inbound link on the crawler path.
// /aquarium-wizard and /tank-builder were on this list until they turned out to
// be redirects to /journey rather than pages; they are now server-side
// redirects and out of the sitemap, so there is nothing to orphan. See
// server/__tests__/alias-routes.test.ts.
const PREVIOUSLY_ORPHANED = [
  "/deals",
  "/journey",
  "/beginner-guide",
  "/why-aquavo",
  "/calculators",
  "/fish-encyclopedia",
  "/fish-finder",
  "/fish-compatibility",
  "/fish-health",
  "/fish-health-diagnosis",
  "/fish-breeding-calculator",
  "/sustainability",
  "/community-gallery",
];

describe("SSR footer orphan links", () => {
  it("links every page that the crawler could not otherwise reach", () => {
    const linked = FOOTER_EXPLORE_LINKS.map((entry) => entry.href);
    for (const href of PREVIOUSLY_ORPHANED) {
      expect(linked).toContain(href);
    }
  });

  // The anchor text is copied from STATIC_COPY rather than written twice.
  // _ssr-preview-source imports the shell, so the shell cannot import the
  // headings back without closing a runtime cycle; this assertion is what keeps
  // the copy in step instead.
  it("labels each link with the heading of the page it points at", () => {
    for (const { href, label } of FOOTER_EXPLORE_LINKS) {
      const copy = STATIC_COPY[href];
      expect(copy, `${href} has no STATIC_COPY entry`).toBeDefined();
      expect(label, `${href} label drifted from its heading`).toBe(copy.heading);
    }
  });

  it("points every link at a route the renderer actually serves", () => {
    for (const { href } of FOOTER_EXPLORE_LINKS) {
      expect(STATIC_COPY[href], `${href} is not a served route`).toBeDefined();
    }
  });

  it("names each destination once, so no page is linked twice", () => {
    const hrefs = FOOTER_EXPLORE_LINKS.map((entry) => entry.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  // The constant being right is not the thing that matters — the anchors
  // reaching the crawled markup is. This renders the shell the way the SSR
  // path does and reads the links back out of the HTML.
  it("emits the anchors into rendered markup, on a page that is not the homepage", () => {
    const html = renderSeoPreviewShell({
      kind: "static",
      path: "/terms",
      heading: "الشروط والأحكام",
      summary: "الشروط المنظمة لاستخدام الموقع.",
    });
    for (const { href, label } of FOOTER_EXPLORE_LINKS) {
      expect(html, `${href} missing from rendered footer`).toContain(`href="${href}"`);
      expect(html, `${label} missing from rendered footer`).toContain(label);
    }
  });
});
