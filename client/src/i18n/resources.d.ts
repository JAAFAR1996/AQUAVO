/**
 * Type-safe translation keys. The Arabic bundles are the source of truth; a key
 * that does not exist in Arabic is a compile error everywhere.
 */
import type common from "../locales/ar/common.json";
import type nav from "../locales/ar/nav.json";
import type home from "../locales/ar/home.json";
import type products from "../locales/ar/products.json";
import type product from "../locales/ar/product.json";
import type cart from "../locales/ar/cart.json";
import type checkout from "../locales/ar/checkout.json";
import type account from "../locales/ar/account.json";
import type orders from "../locales/ar/orders.json";
import type search from "../locales/ar/search.json";
import type errors from "../locales/ar/errors.json";
import type pages from "../locales/ar/pages.json";
import type seo from "../locales/ar/seo.json";
import type tools from "../locales/ar/tools.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      nav: typeof nav;
      home: typeof home;
      products: typeof products;
      product: typeof product;
      cart: typeof cart;
      checkout: typeof checkout;
      account: typeof account;
      orders: typeof orders;
      search: typeof search;
      errors: typeof errors;
      pages: typeof pages;
      seo: typeof seo;
      tools: typeof tools;
    };
    returnNull: false;
  }
}
