/**
 * The Guides publishing system (server-rendered HTML for SEO / no-JS crawlers)
 * must render inside the unified AQUAVO Production shell — real logo, shared
 * header/footer, Light+Dark support, brand tokens — while preserving all SEO
 * (canonical, JSON-LD, breadcrumb, OG, robots) and the existing guide content.
 */
import { describe, it, expect } from "vitest";
import {
  renderGuidesIndexHtml,
  renderGuideHtml,
  GUIDE_CONTENT_PAGES,
} from "../../api/_guides-content";

const BASE = "https://aquavoiq.com";
const IMG = `${BASE}/brand/aquavo-v2-icon.svg`;

describe("Guides publishing shell — AQUAVO identity", () => {
  const idx = renderGuidesIndexHtml(BASE, IMG);

  it("uses the real AQUAVO logo asset, not a text-only brand", () => {
    expect(idx).toContain("/brand/aquavo-v2-horizontal.svg");
    // The old isolated shell rendered a bare text link — it must be gone.
    expect(idx).not.toContain('class="brand" href="/">AQUAVO</a>');
  });

  it("shares the production header nav and footer", () => {
    expect(idx).toContain('<header class="site">');
    expect(idx).toContain('href="/products"');
    expect(idx).toContain('href="/about"');
    expect(idx).toContain('class="fnav"'); // production footer nav
    expect(idx).toContain('id="aqv-theme-toggle"'); // theme control
  });

  it("supports Light and Dark via the shared theme bootstrap + tokens", () => {
    expect(idx).toContain("localStorage.getItem('theme')");
    expect(idx).toContain("#F6F4EF"); // light background token
    expect(idx).toContain("html.dark{"); // dark overrides
    expect(idx).toContain("#0B1E28"); // dark background token
  });

  it("uses approved brand fonts and colors, no coral/gold", () => {
    expect(idx).toContain("Changa"); // display headings
    expect(idx).toContain("Cairo");
    expect(idx).toContain("#0B93A6"); // primary teal
    // No coral (#ff7b5a / ff7b) or gold (#ffd700) in the shell.
    expect(idx.toLowerCase()).not.toContain("ff7b5a");
    expect(idx.toLowerCase()).not.toContain("ffd700");
  });

  it("renders AQUAVO guide cards (editorial, not a product grid)", () => {
    expect(idx).toContain('class="card"');
    expect(idx).toContain('class="t"');
    expect(idx).toContain('ul class="guide-index"');
  });

  it("preserves index SEO: canonical, OG, robots, breadcrumb + FAQ JSON-LD", () => {
    expect(idx).toContain('rel="canonical" href="https://aquavoiq.com/guides"');
    expect(idx).toContain('property="og:title"');
    expect(idx).toContain('name="robots"');
    expect(idx).toContain('"@type":"BreadcrumbList"');
    expect(idx).toContain('"@type":"FAQPage"');
    expect(idx).toContain("application/ld+json");
    expect(idx).toContain("dir=\"rtl\"");
  });
});

describe("Guides publishing shell — article pages", () => {
  const path = Object.keys(GUIDE_CONTENT_PAGES)[0];
  const page = GUIDE_CONTENT_PAGES[path];
  const art = renderGuideHtml(path, page, BASE, IMG);

  it("renders every published article inside the same unified shell", () => {
    for (const slug of Object.keys(GUIDE_CONTENT_PAGES)) {
      const html = renderGuideHtml(slug, GUIDE_CONTENT_PAGES[slug], BASE, IMG);
      expect(html).toContain("/brand/aquavo-v2-horizontal.svg");
      expect(html).toContain("localStorage.getItem('theme')");
      expect(html).toContain('<header class="site">');
      expect(html).toContain("#F6F4EF");
      expect(html).not.toContain('class="brand" href="/">AQUAVO</a>');
    }
  });

  it("preserves the article content, H1 and canonical", () => {
    expect(art).toContain(page.h1);
    expect(art).toContain(`rel="canonical" href="${BASE}${path}"`);
    expect(art).toContain('property="og:type" content="article"');
    expect(art).toContain("application/ld+json");
    expect(art).toContain('<html lang="ar" dir="rtl">');
  });
});
