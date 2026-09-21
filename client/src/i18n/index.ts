/**
 * i18next runtime for the storefront.
 *
 * Arabic (the source language) is registered synchronously at import time so
 * `i18next.t(...)` works even for module-level constants. The URL locale's
 * bundles are loaded by `bootstrapI18n()` in main.tsx BEFORE the application
 * modules are imported, so every module — page, component, plain helper —
 * evaluates with the right language already in place. Each locale/namespace
 * pair is its own JSON chunk; a visitor downloads only their locale (plus the
 * small Arabic fallback).
 */
import i18next, { type InitOptions, type PostProcessorModule } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES, type Locale } from "@shared/i18n/locales";
import { isolateNumericRanges } from "@shared/i18n/bidi";
import arCommon from "../locales/ar/common.json";
import arNav from "../locales/ar/nav.json";
import arHome from "../locales/ar/home.json";
import arProducts from "../locales/ar/products.json";
import arProduct from "../locales/ar/product.json";
import arCart from "../locales/ar/cart.json";
import arCheckout from "../locales/ar/checkout.json";
import arAccount from "../locales/ar/account.json";
import arOrders from "../locales/ar/orders.json";
import arSearch from "../locales/ar/search.json";
import arErrors from "../locales/ar/errors.json";
import arPages from "../locales/ar/pages.json";
import arSeo from "../locales/ar/seo.json";
import arTools from "../locales/ar/tools.json";
import arGuides from "../locales/ar/guides.json";

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
  "guides",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

const AR_RESOURCES: Record<Namespace, Record<string, unknown>> = {
  common: arCommon,
  nav: arNav,
  home: arHome,
  products: arProducts,
  product: arProduct,
  cart: arCart,
  checkout: arCheckout,
  account: arAccount,
  orders: arOrders,
  search: arSearch,
  errors: arErrors,
  pages: arPages,
  seo: arSeo,
  tools: arTools,
  guides: arGuides,
};

/**
 * Static glob so Vite code-splits each locale/namespace pair.
 *
 * Guarded because this module is also pulled into `generated/static-pages-entry.mjs`,
 * which the prerender step bundles with esbuild rather than Vite. esbuild leaves
 * `import.meta.glob` untransformed, so the call reaches Node as a real property
 * access on `import.meta`, where it is undefined — `npm run build` then died with
 * "(intermediate value).glob is not a function" during prerendering. That broke
 * the production build on this branch only: `client/src/i18n/index.ts` does not
 * exist on main, while `script/prerender-static-pages.ts` does and builds fine there.
 *
 * Vite still statically analyses the call inside the try, so code-splitting is
 * unchanged in the app bundle. Arabic is explicitly excluded from the glob
 * because every Arabic namespace is already statically imported above; matching
 * it here as well creates ineffective dynamic-import warnings and duplicate
 * import edges. Outside Vite the map is empty, which is harmless because
 * prerendering renders Arabic from those static imports.
 */
let bundles: Record<string, () => Promise<{ default: Record<string, unknown> }>>;
try {
  bundles = import.meta.glob<{ default: Record<string, unknown> }>([
    "../locales/*/*.json",
    "!../locales/ar/*.json",
  ]);
} catch {
  bundles = {};
}

/**
 * Numeric ranges reverse when the Unicode bidi algorithm resolves them next to
 * Arabic letters: `تغذية 4-6 مرات` is read as `6-4`. See shared/i18n/bidi.ts for
 * why, and e2e/i18n-bidi.spec.ts for the browser measurement.
 *
 * A post-processor is the only place that reaches every one of the ~3,000 `t()`
 * call sites — guides, calculators, loyalty, order tracking — without touching
 * any of them, and it runs on the value on its way out of i18next, so no stored
 * translation changes. It adds the *isolate* pair (U+2066…U+2069), never an
 * override, and only to a string that contains both a range and an RTL letter;
 * every other string is returned by identity.
 *
 * Text destined for machines rather than readers strips the controls again at its
 * own boundary — see `stripBidiControls` in components/seo/meta-tags.tsx.
 */
export const BIDI_ISOLATE_PROCESSOR = "bidi-isolate";

const bidiIsolate: PostProcessorModule = {
  type: "postProcessor",
  name: BIDI_ISOLATE_PROCESSOR,
  process(value) {
    // Interpolated HTML blobs are isolated as markup instead (isolateNumericRangesInHtml),
    // so that a `<bdi>` lands in the text rather than a control inside a tag.
    if (typeof value !== "string" || value.includes("<")) return value;
    return isolateNumericRanges(value);
  },
};

if (!i18next.isInitialized) {
  i18next.use(bidiIsolate).use(initReactI18next).init({
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: [...NAMESPACES],
    defaultNS: "common",
    resources: { [DEFAULT_LOCALE]: AR_RESOURCES },
    interpolation: { escapeValue: false },
    postProcess: [BIDI_ISOLATE_PROCESSOR],
    returnNull: false,
    initImmediate: false,
    react: { useSuspense: false },
  } as InitOptions);
}

const loaded = new Set<string>([DEFAULT_LOCALE]);

/** Load every namespace of a locale (no-op for Arabic and for locales already loaded). */
export async function loadLocale(locale: Locale): Promise<void> {
  if (loaded.has(locale)) return;
  await Promise.all(
    NAMESPACES.map(async (ns) => {
      const loader = bundles[`../locales/${locale}/${ns}.json`];
      if (!loader) return;
      const mod = await loader();
      i18next.addResourceBundle(locale, ns, mod.default, true, true);
    }),
  );
  loaded.add(locale);
}

/** Load the locale's bundles and make it active. Called before the app modules are imported. */
export async function bootstrapI18n(locale: Locale): Promise<void> {
  await loadLocale(locale);
  if (i18next.language !== locale) await i18next.changeLanguage(locale);
}

/** @deprecated kept for callers written against the async-init API. */
export async function initI18n(locale: Locale) {
  await bootstrapI18n(locale);
  return i18next;
}
export async function changeI18nLocale(locale: Locale): Promise<void> {
  await bootstrapI18n(locale);
}
/** @deprecated use loadLocale */
export async function loadNamespaces(locale: Locale): Promise<void> {
  await loadLocale(locale);
}

export function localeIntl(locale: Locale): string {
  return LOCALES[locale].intl;
}

export { i18next };
