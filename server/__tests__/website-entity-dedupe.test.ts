import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Two defects found against live production a4d61e82, both on the browser path.
//
// 1. /products described the site twice. Its CollectionPage carried
//    `isPartOf: { "@type": "WebSite", name, url }` — an anonymous second
//    WebSite — while injectMeta separately published the canonical one at
//    @id .../#website. Measured live: the browser path served two WebSite
//    nodes, the crawler path one, because the crawler builder already used the
//    @id reference. Two nodes competing for one identity is the whole reason
//    withSiteEntities and the #website @id exist.
//
// 2. /guides published no site entities to browsers at all. #155 threaded them
//    through renderGuideHtml and the canonical index — what a crawler is served
//    — but ssr-meta hands a browser renderGuidesIndexHtml for that URL, and
//    that renderer was left out.

import { renderGuidesIndexHtml } from "../../api/_guides-content";
import { withSiteEntities } from "../../api/_seo-structured-data";

const here = dirname(fileURLToPath(import.meta.url));
const ssrMetaSource = readFileSync(resolve(here, "../../api/ssr-meta.ts"), "utf8");

const BASE = "https://www.aquavoiq.com";

const typesIn = (html: string): string[] => {
  const out: string[] = [];
  for (const [, raw] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const parsed = JSON.parse(raw.replace(/\u003c/g, "<").replace(/\u003e/g, ">").replace(/\u0026/g, "&"));
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      out.push(String((node as Record<string, unknown>)["@type"]));
    }
  }
  return out;
};

const SITE_ENTITIES = ["OnlineStore", "Organization", "WebSite"];

describe("browser guide index publishes the site entities", () => {
  it("publishes at least one site entity", () => {
    const types = typesIn(renderGuidesIndexHtml(BASE, `${BASE}/brand/logo.png`, withSiteEntities));
    expect(types.some((t) => SITE_ENTITIES.includes(t)), `published only ${types.join(", ")}`).toBe(true);
  });

  it("publishes each site entity at most once", () => {
    const types = typesIn(renderGuidesIndexHtml(BASE, `${BASE}/brand/logo.png`, withSiteEntities));
    for (const entity of SITE_ENTITIES) {
      expect(types.filter((t) => t === entity).length, `${entity} duplicated`).toBeLessThanOrEqual(1);
    }
  });

  it("still renders without a decorator, for any caller that passes none", () => {
    expect(() => renderGuidesIndexHtml(BASE, `${BASE}/brand/logo.png`)).not.toThrow();
  });

  // The renderer accepting a decorator is not the thing that was broken — the
  // caller not passing one was. Calling it directly with withSiteEntities
  // passes against the defect too, so this reads the call site instead.
  it("is handed the decorator by the ssr-meta route that serves /guides", () => {
    const call = ssrMetaSource.match(/renderGuidesIndexHtml\(([^)]*)\)/);
    expect(call, "ssr-meta no longer calls renderGuidesIndexHtml").not.toBeNull();
    expect(call![1], `/guides is rendered without the site entities: ${call![1]}`).toContain(
      "withSiteEntities",
    );
  });
});

describe("no builder inlines a second WebSite", () => {
  // Read as source, the way seo-audit-crawler-parity.test.ts checks the sitemap:
  // the defect is in what the builders declare, not in what injectMeta does with
  // it, so this is the level the invariant lives at.
  it("uses an @id reference rather than an inline WebSite in isPartOf", () => {
    const inline = ssrMetaSource.match(/isPartOf:\s*\{\s*"@type":\s*"WebSite"/g) ?? [];
    expect(inline.length, `${inline.length} builder(s) still inline a WebSite`).toBe(0);
  });

  it("still declares isPartOf, pointing at the canonical website node", () => {
    const byRef = ssrMetaSource.match(/isPartOf:\s*\{\s*"@id":/g) ?? [];
    expect(byRef.length).toBeGreaterThan(0);
  });
});
