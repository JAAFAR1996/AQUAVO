/**
 * Release gate for non-Arabic locales (deployment safety, option A).
 *
 * A locale is offered to customers (language selector, hreflang alternates,
 * sitemap listings) only when `ready` is true. Until then its URLs still work
 * for QA and previews, stay noindex, and are reachable only by direct URL or
 * with the preview switch (VITE_I18N_PREVIEW_LOCALES=1 or cookie
 * aq_locale_preview=1).
 *
 * `ready` is flipped by hand, in a reviewed commit, once
 * TOOLS/i18n/audit.ts reports the locale as eligible:
 *   UI keys missing = 0 AND validator errors = 0 AND
 *   public products / published posts / blog categories field-complete = 100%.
 * The audit never flips it automatically.
 */
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, alternatesFor, type Locale } from "./locales.js";

export const LOCALE_RELEASE: Record<Exclude<Locale, typeof DEFAULT_LOCALE>, { ready: boolean; note: string }> = {
  // Released 2026-09-21. Production content_translations synced (46 rows, all
  // status "machine"); a re-run of TOOLS/i18n/reseed.ts --locale=en then reported
  // 107 products / 117 posts / 8 categories identical and nothing pending.
  // Gates at that commit: validator 0 errors, client+api tsc 0, 61/61 vitest,
  // 94/94 Playwright on real Neon data, build exit 0, 0 dead internal links in
  // any locale, 0 structural HTML defects, 0 commerce-integrity findings.
  //
  // "ready" means offered to customers, not human-reviewed: every row is still
  // status "machine", so per-page indexability continues to be decided by
  // translationUnreviewed in api/ssr-meta.ts. Releasing the locale does not
  // make an unreviewed page indexable, and nothing here claims otherwise.
  en: { ready: true, note: "Released 2026-09-21; production synced, all rows machine-translated and unreviewed, so pages stay noindex until reviewed" },
  // CKB stays closed. The corpus has P0 defects of a kind a model cannot settle
  // — a reversed heater instruction, quarantine rendered "the upper cage",
  // yoghurt shipped as "fish" — and 18 terminology decisions have no
  // authoritative Sorani source. See reports/i18n/ckb-native-final-review.md;
  // the answers apply through TOOLS/i18n/apply-ckb-native-final.mjs.
  ckb: { ready: false, note: "Blocked on native Sorani review: 18 open decisions (7 safety-critical) in reports/i18n/ckb-native-final-review.md" },
};

export function isLocaleReleased(locale: Locale): boolean {
  if (locale === DEFAULT_LOCALE) return true;
  return LOCALE_RELEASE[locale as Exclude<Locale, typeof DEFAULT_LOCALE>]?.ready === true;
}

/** Arabic plus every released locale, in canonical order. */
export const RELEASED_LOCALES: readonly Locale[] = Object.freeze(SUPPORTED_LOCALES.filter(isLocaleReleased));

export const LOCALE_PREVIEW_COOKIE = "aq_locale_preview";

/** hreflang alternates restricted to released locales (Arabic always present). */
export function releasedAlternatesFor(logicalPath: string): ReturnType<typeof alternatesFor> {
  const { alternates, xDefault } = alternatesFor(logicalPath);
  return { alternates: alternates.filter((a) => isLocaleReleased(a.locale)), xDefault };
}
