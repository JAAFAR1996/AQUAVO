/**
 * The internal-link guard is only as good as its route table.
 *
 * shared/internal-links.ts hand-mirrors the <Route path=...> list in
 * client/src/App.tsx. If someone adds a route to the app and not to the mirror,
 * the guard starts rejecting valid links; if someone deletes a route from the
 * app and not the mirror, the guard starts accepting dead ones — which is the
 * exact failure that shipped 11 broken links. This test fails on either drift.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DYNAMIC_PREFIXES,
  ROUTES,
  findInternalLinkViolations,
  routeExists,
} from "../../shared/internal-links.js";

const app = readFileSync(resolve("client/src/App.tsx"), "utf8");
const declared = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

/**
 * Admin and experimental paths are never link targets in editorial content.
 * Matches `/admin`, `/admin/...` and `/admin-login` alike.
 */
const EDITORIAL_IRRELEVANT = /^\/(admin|experiments)/;

describe("internal-link route table", () => {
  it("covers every static route declared in App.tsx", () => {
    const missing = declared
      .filter((p) => !p.includes(":"))
      .filter((p) => !EDITORIAL_IRRELEVANT.test(p))
      .filter((p) => !ROUTES.includes(p));
    expect(missing, `routes in App.tsx but not in shared/internal-links.ts: ${missing.join(", ")}`).toEqual([]);
  });

  it("lists no route that App.tsx no longer declares", () => {
    const declaredSet = new Set(declared.map((p) => p.replace(/\/:[^/]+/g, "")));
    const stale = ROUTES.filter((p) => !declaredSet.has(p));
    expect(stale, `routes in shared/internal-links.ts but not in App.tsx: ${stale.join(", ")}`).toEqual([]);
  });

  it("covers every dynamic route prefix", () => {
    const prefixes = [...app.matchAll(/path="([^"]*?)\/:[^"]*"/g)].map((m) => `${m[1]}/`);
    const missing = prefixes
      .filter((p) => !EDITORIAL_IRRELEVANT.test(p))
      .filter((p) => !DYNAMIC_PREFIXES.includes(p));
    expect(missing, `dynamic prefixes missing from the guard: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("routeExists", () => {
  it("accepts real static and dynamic routes", () => {
    expect(routeExists("/products")).toBe(true);
    expect(routeExists("/guides/filter-choice")).toBe(true);
    expect(routeExists("/blog/some-article-slug")).toBe(true);
    expect(routeExists("/products/houyi-thermostat")).toBe(true);
  });

  it("accepts query strings, fragments and trailing slashes", () => {
    expect(routeExists("/products?category=الفلترة والتنقية")).toBe(true);
    expect(routeExists("/products/")).toBe(true);
    expect(routeExists("/blog#top")).toBe(true);
  });

  it("leaves external and non-http links alone", () => {
    expect(routeExists("https://example.com")).toBe(true);
    expect(routeExists("mailto:a@b.c")).toBe(true);
    expect(routeExists("#section")).toBe(true);
  });

  it("rejects the paths the generator actually invented", () => {
    for (const dead of [
      "/filtration", "/temperature-control", "/water-treatment", "/substrate",
      "/decor", "/ventilation", "/monitoring", "/oxygenation", "/aeration", "/food",
    ]) {
      expect(routeExists(dead), `${dead} should not resolve`).toBe(false);
    }
  });

  it("rejects a dynamic prefix with no segment, unless it is also static", () => {
    // Both /blog and /products exist as static routes, so a trailing slash
    // normalises onto them rather than being read as an empty dynamic segment.
    expect(routeExists("/blog/")).toBe(true);
    expect(routeExists("/products/")).toBe(true);
    // /invoice has no static form, so a bare prefix is genuinely dead.
    expect(routeExists("/invoice/")).toBe(false);
    expect(routeExists("/invoice/abc123")).toBe(true);
  });
});

describe("findInternalLinkViolations", () => {
  it("reports dead routes once each, with evidence", () => {
    const html = '<p><a href="/filtration">a</a> <a href="/filtration">b</a> <a href="/blog">ok</a></p>';
    const v = findInternalLinkViolations(html);
    expect(v).toHaveLength(1);
    expect(v[0]).toEqual({ rule: "DEAD_INTERNAL_ROUTE", evidence: "/filtration" });
  });

  it("rejects locale-prefixed hrefs baked into the Arabic source", () => {
    const v = findInternalLinkViolations('<a href="/en/products">x</a>');
    expect(v).toEqual([{ rule: "LOCALE_PREFIXED_LINK", evidence: "/en/products" }]);
  });

  it("passes clean editorial content", () => {
    const html = '<a href="/guides/quarantine">q</a> <a href="/products?category=أحواض">p</a>';
    expect(findInternalLinkViolations(html)).toEqual([]);
  });
});
