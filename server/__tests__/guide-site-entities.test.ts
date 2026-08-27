import { describe, expect, it } from "vitest";

// /guides and /guides/* return straight from the canonical renderers, so they
// never reach the injectMeta / injectDocument call that publishes the
// #organization and #website nodes on every other route. Against live
// production a product page carried OnlineStore + WebSite and a blog post
// carried Organization + WebSite, while the guide index and all 12 guides
// carried neither — their Article and CollectionPage nodes were attached to no
// site entity at all.
//
// Nothing on those pages referenced #organization or #website, so no reference
// was dangling; the nodes were simply absent. These tests pin that they are
// now published, and that adding them did not duplicate anything.

import {
  renderCanonicalGuideHtml,
  renderCanonicalGuidesIndexHtml,
} from "../../api/_canonical-guides";
import { GUIDE_CONTENT_PAGES } from "../../api/_guides-content";

const BASE = "https://www.aquavoiq.com";
const IMAGE = `${BASE}/brand/aquavo-v2-horizontal.png`;

const topLevelTypes = (html: string): string[] => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const types: string[] = [];
  for (const [, raw] of blocks) {
    const parsed = JSON.parse(raw.replace(/\u003c/g, "<").replace(/\u003e/g, ">").replace(/\u0026/g, "&"));
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      types.push(String((node as Record<string, unknown>)["@type"]));
    }
  }
  return types;
};

const SITE_ENTITY_TYPES = ["OnlineStore", "Organization", "WebSite"];
const hasSiteEntity = (types: string[]): boolean => types.some((t) => SITE_ENTITY_TYPES.includes(t));

describe("guide pages publish the site entities", () => {
  it("gives the guide index a site entity next to its CollectionPage", () => {
    const types = topLevelTypes(renderCanonicalGuidesIndexHtml(BASE, IMAGE));
    expect(types).toContain("CollectionPage");
    expect(hasSiteEntity(types), `index published only ${types.join(", ")}`).toBe(true);
  });

  it("gives every guide a site entity next to its Article", () => {
    const paths = Object.keys(GUIDE_CONTENT_PAGES);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      const page = GUIDE_CONTENT_PAGES[path];
      const types = topLevelTypes(renderCanonicalGuideHtml(path, page, BASE, IMAGE));
      expect(hasSiteEntity(types), `${path} published only ${types.join(", ")}`).toBe(true);
    }
  });

  // withSiteEntities is idempotent, but it keys off top-level @type only — an
  // Article's nested `publisher` Organization must not be mistaken for the site
  // entity, and must not cause a second copy either.
  it("publishes each site entity exactly once per page", () => {
    const paths = Object.keys(GUIDE_CONTENT_PAGES);
    for (const path of paths) {
      const types = topLevelTypes(renderCanonicalGuideHtml(path, GUIDE_CONTENT_PAGES[path], BASE, IMAGE));
      for (const entity of SITE_ENTITY_TYPES) {
        const count = types.filter((t) => t === entity).length;
        expect(count, `${path} published ${count} ${entity} nodes`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("still emits valid, parseable JSON-LD for every guide", () => {
    for (const path of Object.keys(GUIDE_CONTENT_PAGES)) {
      expect(() => topLevelTypes(renderCanonicalGuideHtml(path, GUIDE_CONTENT_PAGES[path], BASE, IMAGE))).not.toThrow();
    }
  });
});
