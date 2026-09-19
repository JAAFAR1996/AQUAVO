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
  en: { ready: false, note: "UI complete 2026-09-19; products/blog machine-translated, awaiting validation and review" },
  ckb: { ready: false, note: "UI in progress 2026-09-19; content not started" },
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
