import { DEFAULT_LOCALE, parseLocale, splitLocaleFromPath, type Locale } from "@shared/i18n/locales";

/**
 * Locale for code that runs outside React (formatters, fetch helpers,
 * analytics). The URL prefix is authoritative; `<html lang>` is the cached
 * copy the LocaleProvider keeps in sync. Components should prefer useLocale().
 */
export function currentDocumentLocale(): Locale {
  if (typeof window !== "undefined") {
    const fromUrl = splitLocaleFromPath(window.location.pathname);
    if (fromUrl.explicit) return fromUrl.locale;
  }
  if (typeof document !== "undefined") {
    const fromLang = parseLocale(document.documentElement.getAttribute("lang"));
    if (fromLang) return fromLang;
  }
  return DEFAULT_LOCALE;
}
