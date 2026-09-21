import { i18next } from "@/i18n";
const categoryHref = (category: string) => `/products?category=${encodeURIComponent(category)}`;

/** Exact category values returned by the public AQUAVO product-attributes API. */
export const SHOP_CATEGORY_LINKS = {
  filters: categoryHref(i18next.t("pages:product-category-links.s1")),
  heaters: categoryHref(i18next.t("pages:product-category-links.s2")),
  lighting: categoryHref(i18next.t("pages:product-category-links.s3")),
  waterTreatment: categoryHref(i18next.t("pages:product-category-links.s4")),
  food: categoryHref(i18next.t("pages:product-category-links.s5")),
  decor: categoryHref(i18next.t("pages:product-category-links.s6")),
  airPumps: categoryHref(i18next.t("pages:product-category-links.s7")),
} as const;
