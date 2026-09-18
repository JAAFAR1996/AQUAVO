/**
 * Synchronous i18next bootstrap for unit tests. Components call t() during
 * render, so the Arabic (source) bundles must already be registered before
 * the first render. Tests keep asserting on Arabic copy exactly as before.
 */
import i18next, { type InitOptions } from "i18next";
import { initReactI18next } from "react-i18next";
import common from "../locales/ar/common.json";
import nav from "../locales/ar/nav.json";
import home from "../locales/ar/home.json";
import products from "../locales/ar/products.json";
import product from "../locales/ar/product.json";
import cart from "../locales/ar/cart.json";
import checkout from "../locales/ar/checkout.json";
import account from "../locales/ar/account.json";
import orders from "../locales/ar/orders.json";
import search from "../locales/ar/search.json";
import errors from "../locales/ar/errors.json";
import pages from "../locales/ar/pages.json";
import seo from "../locales/ar/seo.json";
import tools from "../locales/ar/tools.json";

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    lng: "ar",
    fallbackLng: "ar",
    ns: ["common", "nav", "home", "products", "product", "cart", "checkout", "account", "orders", "search", "errors", "pages", "seo", "tools"],
    defaultNS: "common",
    resources: { ar: { common, nav, home, products, product, cart, checkout, account, orders, search, errors, pages, seo, tools } },
    interpolation: { escapeValue: false },
    initImmediate: false,
    react: { useSuspense: false },
  } as InitOptions);
}
