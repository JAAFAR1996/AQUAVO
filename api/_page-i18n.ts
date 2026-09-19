/**
 * Which SPA pages have a complete UI translation for a locale.
 *
 * Static pages (guides, legal pages, tools) render from the i18n bundles, so
 * a page is "translated" when every key of its Arabic bundle section exists in
 * the locale's bundle. ssr-meta uses this to decide whether an English /
 * Kurdish page URL is indexable or must stay noindex until its copy exists.
 */
import { DEFAULT_LOCALE, type Locale } from "../shared/i18n/locales.js";
import arGuides from "../client/src/locales/ar/guides.json" with { type: "json" };
import arPages from "../client/src/locales/ar/pages.json" with { type: "json" };
import arTools from "../client/src/locales/ar/tools.json" with { type: "json" };
import arAccount from "../client/src/locales/ar/account.json" with { type: "json" };
import enGuides from "../client/src/locales/en/guides.json" with { type: "json" };
import enPages from "../client/src/locales/en/pages.json" with { type: "json" };
import enTools from "../client/src/locales/en/tools.json" with { type: "json" };
import enAccount from "../client/src/locales/en/account.json" with { type: "json" };
import ckbGuides from "../client/src/locales/ckb/guides.json" with { type: "json" };
import ckbPages from "../client/src/locales/ckb/pages.json" with { type: "json" };
import ckbTools from "../client/src/locales/ckb/tools.json" with { type: "json" };
import ckbAccount from "../client/src/locales/ckb/account.json" with { type: "json" };

type Bundle = Record<string, Record<string, string> | string>;
const BUNDLES: Record<Locale, Bundle[]> = {
  ar: [arGuides, arPages, arTools, arAccount] as Bundle[],
  en: [enGuides, enPages, enTools, enAccount] as Bundle[],
  ckb: [ckbGuides, ckbPages, ckbTools, ckbAccount] as Bundle[],
};

/** Guide routes whose page file name differs from the URL slug. */
const ROUTE_TO_FILE: Record<string, string> = {
  "/guides/new-aquarium-setup-iraq": "guides-new-aquarium-setup",
  "/guides/aquarium-water-test-guide": "guides-water-test-guide",
  "/guides/aquarium-decor-stones-guide": "guides-decor-stones",
  "/fish-health": "fish-health-diagnosis",
  "/encyclopedia": "fish-encyclopedia",
  "/tank-builder": "aquarium-wizard",
  "/about-aquavo": "about",
};

export function pageFileSlug(logicalPath: string): string {
  const clean = logicalPath.replace(/\/+$/, "") || "/";
  if (ROUTE_TO_FILE[clean]) return ROUTE_TO_FILE[clean];
  if (clean.startsWith("/guides/")) return `guides-${clean.slice("/guides/".length)}`;
  return clean.slice(1);
}

function sectionKeys(locale: Locale, slug: string): Set<string> {
  const keys = new Set<string>();
  for (const bundle of BUNDLES[locale]) {
    const section = bundle[slug];
    if (section && typeof section === "object") for (const k of Object.keys(section)) keys.add(k);
  }
  return keys;
}

/**
 * True when the page's bundle section is fully present in the locale. Pages
 * with no Arabic section (localized by hand under other namespaces, or pure
 * dynamic pages) are considered translated.
 */
export function isPageTranslated(locale: Locale, logicalPath: string): boolean {
  if (locale === DEFAULT_LOCALE) return true;
  const slug = pageFileSlug(logicalPath);
  const ar = sectionKeys(DEFAULT_LOCALE, slug);
  if (ar.size === 0) return true;
  const target = sectionKeys(locale, slug);
  for (const k of ar) if (!target.has(k)) return false;
  return true;
}
