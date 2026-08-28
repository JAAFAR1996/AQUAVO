import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { PUBLIC_INDEXABLE_PATHS } from "../../shared/seo-contract";
import { FOOTER_EXPLORE_LINKS } from "../../api/_seo-preview-shell";

/**
 * /aquarium-wizard and /tank-builder are not pages. Both route to
 * client/src/pages/aquarium-wizard.tsx, which renders null and calls
 * setLocation("/journey") from an effect — flow-gate-routes.ts even labels
 * /tank-builder a "backwards-compatible alias that redirects to /journey".
 *
 * Measured on production before this change, both answered 200 to Googlebot
 * with a self-referencing canonical, sat in sitemap-pages.xml as indexable, and
 * were linked from the crawler footer on every page. A crawler was therefore
 * invited to index two URLs whose only content is a redirect it may never run.
 *
 * They are now server-side redirects, the way vercel.json already handles the
 * guide aliases, and are no longer advertised as destinations.
 */

const VERCEL_CONFIG = JSON.parse(
  readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
) as { redirects?: Array<{ source: string; destination: string; permanent?: boolean }> };

const ALIASES = ["/aquarium-wizard", "/tank-builder"];

describe("wizard aliases are redirects, not indexable pages", () => {
  it("redirects each alias to /journey permanently", () => {
    for (const alias of ALIASES) {
      const rule = (VERCEL_CONFIG.redirects ?? []).find((entry) => entry.source === alias);
      expect(rule, `${alias} needs a redirect in vercel.json`).toBeDefined();
      expect(rule?.destination, `${alias} destination`).toBe("/journey");
      expect(rule?.permanent, `${alias} should be permanent`).toBe(true);
    }
  });

  it("keeps them out of the sitemap", () => {
    for (const alias of ALIASES) {
      expect(PUBLIC_INDEXABLE_PATHS, `${alias} must not be advertised as indexable`).not.toContain(
        alias,
      );
    }
  });

  it("stops linking to them from the crawler footer", () => {
    const linked = FOOTER_EXPLORE_LINKS.map((entry) => entry.href);
    for (const alias of ALIASES) {
      expect(linked, `${alias} should not be a footer destination`).not.toContain(alias);
    }
    // The page they redirect to is still reachable, so nothing is orphaned.
    expect(linked).toContain("/journey");
  });

  it("still routes them in the client so an in-app link keeps working", () => {
    // A server redirect only fires on a hard navigation. The homepage hero
    // links to /tank-builder through wouter, which never touches the network,
    // so the client route has to stay.
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    for (const alias of ALIASES) {
      expect(app, `${alias} client route must remain`).toContain(`path="${alias}"`);
    }
  });
});
