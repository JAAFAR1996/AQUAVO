/**
 * Internal-link guard for editorial content.
 *
 * WHY THIS EXISTS
 * ---------------
 * The auto-blog generator shipped 11 internal links that resolve to no route in
 * the app, across three published articles: `/filtration`, `/temperature-control`,
 * `/water-treatment`, `/substrate`, `/decor`, `/ventilation`, `/monitoring`, and
 * two Arabic category paths. A fourth article (auto-1789869961312) carried seven
 * more and was unpublished on 2026-09-20.
 *
 * The model invents plausible-looking paths because plausible-looking paths are
 * what the surrounding prose calls for. The existing editorial, script-purity and
 * business-truth gates all pass such an article: a dead link is not a false claim,
 * a foreign script or a competitor referral. This is the missing gate.
 *
 * Every dead link was also faithfully reproduced into English and Sorani, so one
 * generator defect becomes three broken pages.
 *
 * KEEPING THE ROUTE LIST HONEST
 * -----------------------------
 * ROUTES is a hand-maintained mirror of the <Route path=...> table in
 * client/src/App.tsx. `test/i18n/internal-links.test.ts` parses App.tsx and fails
 * if the two drift, so adding a route to the app without adding it here is caught
 * by the suite rather than by a reader hitting a 404.
 */

/** Static paths served by the SPA router. Mirrors client/src/App.tsx. */
export const ROUTES: readonly string[] = [
  "/", "/about", "/about-aquavo", "/ai-tools", "/aquarium-wizard", "/ar", "/auth",
  "/beginner-guide", "/blog", "/calculators", "/cart", "/checkout", "/community-gallery",
  "/compare", "/contact", "/cultural-twin", "/deals", "/encyclopedia", "/faq",
  "/fish-breeding-calculator", "/fish-compatibility", "/fish-doctor", "/fish-encyclopedia", "/guides",
  "/fish-finder", "/fish-health", "/fish-health-diagnosis", "/fish-patients",
  "/forgot-password", "/invest", "/journey", "/links", "/login", "/order-tracking",
  "/alexa-privacy", "/partners", "/privacy-policy", "/products", "/profile", "/register", "/return-policy",
  "/returns", "/search", "/shipping", "/sustainability", "/tank-builder",
  "/temperature-guide", "/terms", "/verify-certificate", "/why-aquavo", "/wishlist",
  "/guides/5-mistakes", "/guides/algae-control", "/guides/aquarium-decor-stones-guide",
  "/guides/aquarium-salt", "/guides/aquarium-water-test-guide", "/guides/eco-friendly",
  "/guides/essential-tools", "/guides/feeding-table", "/guides/filter-choice",
  "/guides/filter-media", "/guides/fish-hiding", "/guides/happy-fish-signs",
  "/guides/heater-choice", "/guides/new-aquarium-setup-iraq", "/guides/quarantine",
  "/guides/tank-rescue-plan", "/guides/temperature-guide", "/guides/treatment-basics",
  "/guides/water-change-schedule", "/guides/water-myths", "/guides/white-scale",
];

/** Prefixes whose remainder is a dynamic segment (`/blog/:id` → `/blog/`). */
export const DYNAMIC_PREFIXES: readonly string[] = [
  "/blog/", "/products/", "/order-confirmation/", "/invoice/", "/verify-certificate/",
];

export type InternalLinkViolation = {
  rule: "DEAD_INTERNAL_ROUTE" | "LOCALE_PREFIXED_LINK";
  /** The href that tripped the rule. */
  evidence: string;
};

/**
 * True when `href` is something this guard has no authority over: an absolute
 * URL, a mail/phone link, or a bare fragment.
 */
function isExternal(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
}

/** Resolve an internal path against the route table. */
export function routeExists(href: string): boolean {
  if (isExternal(href)) return true;
  const clean = (href.split(/[?#]/)[0] || "/").replace(/\/+$/, "") || "/";
  if (ROUTES.includes(clean)) return true;
  return DYNAMIC_PREFIXES.some((p) => clean.startsWith(p) && clean.length > p.length);
}

/**
 * Find internal links in `html` that do not resolve.
 *
 * Editorial content is authored in Arabic, the unprefixed source locale, so a
 * hand-written `/en/...` or `/ckb/...` href is also a defect: the locale prefix
 * is applied by the router at render time, and baking one into the source pins
 * every translation of that article to a single locale.
 */
export function findInternalLinkViolations(html: string): InternalLinkViolation[] {
  const out: InternalLinkViolation[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/href\s*=\s*"([^"]*)"/gi)) {
    const href = m[1].trim();
    if (!href || seen.has(href) || isExternal(href)) continue;
    seen.add(href);
    if (/^\/(en|ckb)(\/|$)/.test(href)) out.push({ rule: "LOCALE_PREFIXED_LINK", evidence: href });
    else if (!routeExists(href)) out.push({ rule: "DEAD_INTERNAL_ROUTE", evidence: href });
  }
  return out;
}
