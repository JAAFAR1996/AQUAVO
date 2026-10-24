/**
 * i18next runtime for the storefront.
 *
 * Shared Arabic copy is registered synchronously at import time. The large
 * tools/guides dictionaries load before their lazy feature modules evaluate,
 * so `i18next.t(...)` also works for their module-level constants. The URL locale's
 * bundles are loaded by `bootstrapI18n()` in main.tsx BEFORE the application
 * modules are imported, so every module — page, component, plain helper —
 * evaluates with the right language already in place. Each locale/namespace
 * pair is its own JSON chunk; a visitor downloads only their locale and the
 * Arabic fallback needed by the active feature.
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

const AR_RESOURCES: Partial<Record<Namespace, Record<string, unknown>>> = {
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
};

// These two large dictionaries belong to lazy features, not the home shell.
// Load them before evaluating the feature module: some copy is translated at
// module scope, so registering it only after render would cache missing keys.
const deferredArabic = {
  tools: () => import("../locales/ar/tools.json"),
  guides: () => import("../locales/ar/guides.json"),
};
export type DeferredArabicNamespace = keyof typeof deferredArabic;
const pendingArabic = new Map<DeferredArabicNamespace, Promise<void>>();

export async function loadArabicNamespaces(namespaces: readonly DeferredArabicNamespace[]): Promise<void> {
  await Promise.all(namespaces.map((namespace) => {
    if (i18next.hasResourceBundle(DEFAULT_LOCALE, namespace)) return;
    const pending = pendingArabic.get(namespace);
    if (pending) return pending;
    const request = deferredArabic[namespace]()
      .then(({ default: resources }) => {
        i18next.addResourceBundle(DEFAULT_LOCALE, namespace, resources, true, true);
      })
      .finally(() => { pendingArabic.delete(namespace); });
    pendingArabic.set(namespace, request);
    return request;
  }));
}

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
 * because Arabic uses the explicit shared imports and deferredArabic loaders;
 * matching it here as well creates duplicate import edges. Outside Vite the
 * map is empty; static page generation registers all Arabic resources before
 * importing page components.
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
