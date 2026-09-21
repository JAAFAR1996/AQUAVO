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
  // Released 2026-09-21 after the Sorani corpus was synchronized to Production.
  // Release gates at this commit: validator 0 errors / 0 warnings, internal links
  // 0 defects, HTML structure 0 defects, commerce integrity 0 findings,
  // TypeScript pass, i18n Vitest pass, and production build pass.
  // All 232 Production ckb rows match the repository source_hash + data exactly.
  // Rows remain status "machine"; this is not a claim of native-human review.
  ckb: { ready: true, note: "Released 2026-09-21; Production synced 232/232, validator 0 errors/0 warnings, links/HTML/commerce/TypeScript/tests/build passed; machine-translated and not native-human reviewed." },
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
