const categoryHref = (category: string) => `/products?category=${encodeURIComponent(category)}`;

/** Exact category values returned by the public AQUAVO product-attributes API. */
export const SHOP_CATEGORY_LINKS = {
  filters: categoryHref("الفلترة والتنقية"),
  heaters: categoryHref("التحكم بالحرارة"),
  lighting: categoryHref("الإضاءة"),
  waterTreatment: categoryHref("معالجة المياه"),
  food: categoryHref("طعام الأسماك"),
  decor: categoryHref("التربة والديكور"),
  airPumps: categoryHref("التهوية والأكسجين"),
} as const;
