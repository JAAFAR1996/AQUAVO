import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { injectHomeHero } from "../../api/ssr-meta";
import { HOME_CRITICAL_CSS, HOME_STYLESHEET_HREF } from "../../api/_home-critical-css";

const template = readFileSync("dist/ssr-template/index.html", "utf8");

describe("home critical styles", () => {
  it("paints the complete home shell while retaining the original full stylesheet", () => {
    const html = injectHomeHero(template, "/");
    expect(html).toContain(`<style data-aq-home-critical>${HOME_CRITICAL_CSS}</style>`);
    expect(html).toContain('media="print" data-aq-deferred-style');
    expect(html).toContain(`href="${HOME_STYLESHEET_HREF}"`);
    expect(html).toMatch(/<noscript><link[^>]*rel="stylesheet"[^>]*><\/noscript>/);
    expect(readFileSync(`dist/public${HOME_STYLESHEET_HREF}`, "utf8")).toContain("@font-face");
    expect(html).toContain('data-aq-ssr="home"');
  });

  it("keeps ordinary stylesheet loading for other locales and routes", () => {
    for (const [path, locale] of [["/", "en"], ["/", "ckb"], ["/ar", "ar"], ["/products", "ar"]] as const) {
      const html = injectHomeHero(template, path, locale);
      expect(html).not.toContain("data-aq-home-critical");
      expect(html).not.toContain("data-aq-deferred-style");
    }
  });

  it("does not defer styles when it cannot install the matching empty-root shell", () => {
    const occupied = template.replace(/(<div id="root"[^>]*>)/, "$1<p>Existing page</p>");
    expect(injectHomeHero(occupied, "/")).toBe(occupied);
  });
});
