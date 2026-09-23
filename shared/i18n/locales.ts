/**
 * The single authoritative locale configuration for AQUAVO.
 *
 * Every other module (client router, Express middleware, ssr-meta, sitemaps,
 * admin tooling, tests) derives its language knowledge from this file. There
 * must be no other list of languages anywhere in the repository.
 *
 * URL architecture: Arabic (the historical and default language) keeps the
 * unprefixed URLs that are already indexed and linked. English and Central
 * Kurdish live under a path prefix. Slugs are shared across locales.
 */

export type Locale = "ar" | "en" | "ckb";
export type TextDirection = "rtl" | "ltr";

export interface LocaleDefinition {
  /** URL / `lang` attribute / API code. Always a plain BCP 47 primary tag. */
  readonly code: Locale;
  /** Name of the language in its own script, for the language selector. */
  readonly nativeName: string;
  /** English name, used only in admin tooling and logs. */
  readonly englishName: string;
  readonly dir: TextDirection;
  /**
   * Value for `<link rel="alternate" hreflang>`. Google accepts only ISO 639-1
   * language codes here (plus an ISO 3166-1 region), so Sorani is advertised
   * as `ku-IQ`; `ckb-IQ` was silently ignored.
   */
  readonly hreflang: string;
  /** Precise BCP 47 tag for `Content-Language` and schema.org `inLanguage`, where ISO 639-3 is valid. */
  readonly languageTag: string;
  /** Locale string handed to `Intl.*`. Latin digits are forced everywhere so prices keep one appearance. */
  readonly intl: string;
  /** Open Graph locale. Facebook publishes no Sorani locale, so ckb has none. */
  readonly ogLocale: string | null;
  /** URL prefix. Empty for the default locale. */
  readonly urlPrefix: "" | `/${string}`;
}

export const LOCALES: Readonly<Record<Locale, LocaleDefinition>> = Object.freeze({
  ar: Object.freeze({
    code: "ar",
    nativeName: "العربية",
    englishName: "Arabic",
    dir: "rtl",
    hreflang: "ar-IQ",
    languageTag: "ar-IQ",
    intl: "ar-IQ-u-nu-latn",
    ogLocale: "ar_AR",
    urlPrefix: "",
  }),
  en: Object.freeze({
    code: "en",
    nativeName: "English",
    englishName: "English",
    dir: "ltr",
    hreflang: "en",
    languageTag: "en",
    intl: "en-US",
    ogLocale: "en_US",
    urlPrefix: "/en",
  }),
  ckb: Object.freeze({
    code: "ckb",
    nativeName: "کوردی سۆرانی",
    englishName: "Central Kurdish (Sorani)",
    dir: "rtl",
    // Google reads only ISO 639-1 language codes in hreflang; "ckb" is ISO 639-3 and
    // was silently ignored. "ku" is the ISO 639-1 code for Kurdish. The URL prefix
    // and <html lang> keep "ckb", which is the precise script/dialect tag.
    hreflang: "ku-IQ",
    languageTag: "ckb-IQ",
    intl: "ckb-IQ-u-nu-latn",
    ogLocale: null,
    urlPrefix: "/ckb",
  }),
} as const);

export const SUPPORTED_LOCALES: readonly Locale[] = Object.freeze(["ar", "en", "ckb"]);
export const DEFAULT_LOCALE = "ar" as const satisfies Locale;
/** Locales that require translated content (the default locale is the source). */
export const TRANSLATION_TARGET_LOCALES: readonly Locale[] = Object.freeze(["en", "ckb"]);

/** Name of the cookie that remembers an explicit language choice. */
export const LOCALE_COOKIE_NAME = "aq_locale";
/** Header the client sends on every API request. */
export const LOCALE_HEADER_NAME = "x-locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Coerce any user-supplied value (cookie, header, query, Accept-Language) to a supported locale or null. */
export function parseLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(primary) ? primary : null;
}

export function localeDir(locale: Locale): TextDirection {
  return LOCALES[locale].dir;
}

export interface SplitPath {
  locale: Locale;
  /** The logical, locale-free path. Always starts with "/". */
  path: string;
  /** True when the URL carried an explicit prefix. */
  explicit: boolean;
}

/**
 * Split a pathname into its locale and the logical path.
 *   "/en/products/x" -> { locale: "en", path: "/products/x" }
 *   "/ckb"           -> { locale: "ckb", path: "/" }
 *   "/products/x"    -> { locale: "ar", path: "/products/x" }
 */
export function splitLocaleFromPath(pathname: string): SplitPath {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  for (const locale of SUPPORTED_LOCALES) {
    const prefix = LOCALES[locale].urlPrefix;
    if (!prefix) continue;
    if (clean === prefix) return { locale, path: "/", explicit: true };
    if (clean.startsWith(`${prefix}/`)) {
      return { locale, path: clean.slice(prefix.length) || "/", explicit: true };
    }
  }
  return { locale: DEFAULT_LOCALE, path: clean, explicit: false };
}

/** The prefix for a locale, as wouter's `<Router base>` expects it ("" for the default). */
export function localePrefix(locale: Locale): string {
  return LOCALES[locale].urlPrefix;
}

/**
 * Build the URL for a logical path in a locale. The input may already carry a
 * locale prefix (it is stripped first) and may carry a query string / hash,
 * which are preserved.
 */
export function localizePath(pathOrUrl: string, locale: Locale): string {
  const match = /^([^?#]*)(.*)$/.exec(pathOrUrl) as RegExpExecArray;
  const pathname = match[1] || "/";
  const suffix = match[2] || "";
  const { path } = splitLocaleFromPath(pathname);
  const prefix = LOCALES[locale].urlPrefix;
  if (path === "/") return `${prefix || "/"}${suffix}`;
  return `${prefix}${path}${suffix}`;
}

export interface LocaleAlternate {
  locale: Locale;
  hreflang: string;
  path: string;
}

/** Every locale's URL for one logical path, plus the x-default (Arabic root URLs). */
export function alternatesFor(logicalPath: string): { alternates: LocaleAlternate[]; xDefault: string } {
  const { path } = splitLocaleFromPath(logicalPath);
  const alternates = SUPPORTED_LOCALES.map((locale) => ({
    locale,
    hreflang: LOCALES[locale].hreflang,
    path: localizePath(path, locale),
  }));
  return { alternates, xDefault: localizePath(path, DEFAULT_LOCALE) };
}

/** A regex fragment that matches any non-default locale prefix, for route tables and rewrites. */
export const LOCALE_PREFIX_PATTERN = SUPPORTED_LOCALES.filter((l) => LOCALES[l].urlPrefix)
  .map((l) => LOCALES[l].urlPrefix.slice(1))
  .join("|");
