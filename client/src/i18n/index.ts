/**
 * i18next runtime for the storefront.
 *
 * Only the active locale's bundles are downloaded: every namespace is a
 * separate JSON module behind a dynamic `import()`, which Vite turns into its
 * own chunk. Arabic is the source language and the fallback.
 */
import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES, type Locale } from "@shared/i18n/locales";

export const NAMESPACES = [
  "common",
  "nav",
  "home",
  "products",
  "product",
  "cart",
  "checkout",
  "account",
  "orders",
  "search",
  "errors",
  "pages",
  "seo",
  "tools",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

type Loader = () => Promise<{ default: Record<string, unknown> }>;

/**
 * Static glob so Vite can code-split each locale/namespace pair. Files live at
 * client/src/locales/<locale>/<namespace>.json.
 */
const bundles = import.meta.glob<{ default: Record<string, unknown> }>("../locales/*/*.json");

function loaderFor(locale: Locale, ns: Namespace): Loader | undefined {
  return bundles[`../locales/${locale}/${ns}.json`];
}

const loaded = new Set<string>();

export async function loadNamespaces(locale: Locale, namespaces: readonly Namespace[] = NAMESPACES): Promise<void> {
  await Promise.all(
    namespaces.map(async (ns) => {
      const key = `${locale}:${ns}`;
      if (loaded.has(key)) return;
      const loader = loaderFor(locale, ns);
      if (!loader) {
        loaded.add(key);
        return;
      }
      const mod = await loader();
      i18next.addResourceBundle(locale, ns, mod.default, true, true);
      loaded.add(key);
    }),
  );
}

let initPromise: Promise<I18nInstance> | null = null;

/** Initialise once. Safe to call repeatedly. */
export function initI18n(initialLocale: Locale): Promise<I18nInstance> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await i18next.use(initReactI18next).init({
      lng: initialLocale,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: [...SUPPORTED_LOCALES],
      ns: [...NAMESPACES],
      defaultNS: "common",
      resources: {},
      interpolation: { escapeValue: false },
      returnNull: false,
      // Plural categories come from Intl.PluralRules, which Node/Chromium
      // resolve for ar, en and ckb. No ICU compiler step is required.
      compatibilityJSON: "v4",
      react: { useSuspense: false },
    });
    // Arabic is always present so any missing key still renders source copy.
    await loadNamespaces(DEFAULT_LOCALE);
    if (initialLocale !== DEFAULT_LOCALE) await loadNamespaces(initialLocale);
    return i18next;
  })();
  return initPromise;
}

export async function changeI18nLocale(locale: Locale): Promise<void> {
  await initI18n(locale);
  await loadNamespaces(locale);
  await i18next.changeLanguage(locale);
}

export function localeIntl(locale: Locale): string {
  return LOCALES[locale].intl;
}

export { i18next };
