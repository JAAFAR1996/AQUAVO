import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalGuidePaths, resolveGuidePage } from "../api/_canonical-guides.js";

/**
 * Every /guides/* route the SPA serves to a browser must also resolve on the
 * crawler path (api/ssr-preview -> resolveGuidePage). When it does not, the
 * browser gets a full indexable page and Googlebot gets a hard 404 — the exact
 * regression this pins. The route list is derived from App.tsx rather than
 * hardcoded so adding a browser-only guide fails this test instead of silently
 * shipping a page no crawler can see.
 */
const APP_TSX = resolve(process.cwd(), "client/src/App.tsx");

function spaGuideRoutes(): string[] {
  const source = readFileSync(APP_TSX, "utf8");
  const matches = source.matchAll(/<Route\s+path="(\/guides\/[a-z0-9-]+)"/g);
  return [...new Set([...matches].map((m) => m[1]))].sort();
}

describe("guides crawler parity", () => {
  it("finds the SPA guide routes it is meant to guard", () => {
    expect(spaGuideRoutes().length).toBeGreaterThanOrEqual(20);
  });

  it("resolves every SPA guide route on the crawler path", () => {
    const missing = spaGuideRoutes().filter((path) => !resolveGuidePage(path));
    expect(missing).toEqual([]);
  });

  it("lists every SPA guide route as a canonical guide path", () => {
    const canonical = new Set(canonicalGuidePaths());
    const orphaned = spaGuideRoutes().filter((path) => !canonical.has(path));
    expect(orphaned).toEqual([]);
  });

  it("gives every resolved guide real content, not a thin stub", () => {
    for (const path of spaGuideRoutes()) {
      const resolved = resolveGuidePage(path);
      if (!resolved) continue;
      const { page } = resolved;
      const bodyLength = page.sections.reduce(
        (total, section) => total + section.h2.length + section.paras.join("").length,
        0,
      );
      // Floors are calibrated to the thinnest guide already shipped
      // (aquarium-weekly-maintenance: 3 sections, 3 FAQs, 236-char answer,
      // 461-char body) so a newly ported guide cannot pass as a thin stub.
      expect(page.sections.length, `${path} sections`).toBeGreaterThanOrEqual(3);
      expect(page.faq.length, `${path} faq`).toBeGreaterThanOrEqual(3);
      expect(page.answer.length, `${path} answer`).toBeGreaterThanOrEqual(200);
      expect(bodyLength, `${path} body`).toBeGreaterThanOrEqual(450);
    }
  });
});
