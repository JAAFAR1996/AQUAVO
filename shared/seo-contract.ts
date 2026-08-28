export const AQUAVO_BASE_URL = "https://www.aquavoiq.com";
export const AQUAVO_SEO_RELEASE_LASTMOD = "2026-08-25";

export const AQUAVO_ENTITY = Object.freeze({
  brandName: "AQUAVO",
  arabicName: "أكوافو",
  legalName: "محل المنبع — AL NABEA SHOP",
  email: "info@aquavoiq.com",
  telephone: "+964-774-788-0673",
  countryCode: "IQ",
  countryName: "Iraq",
  currency: "IQD",
  deliveryFee: 5000,
  deliveryMaxDays: 1,
  paymentMethod: "Cash on Delivery, Online Payment",
  supportAvailability: "24/7",
  onlineOnly: true,
  logoUrl: `${AQUAVO_BASE_URL}/brand/aquavo-v2-horizontal.png`,
  socialProfiles: [
    "https://www.facebook.com/profile.php?id=61587249730248",
    "https://instagram.com/aquavo_iq",
    "https://www.tiktok.com/@aquavo.iq",
  ] as const,
});

const CATEGORY_ALIASES: Record<string, string> = {
  tanks: "أحواض",
  tank: "أحواض",
  filters: "الفلترة والتنقية",
  filter: "الفلترة والتنقية",
  heaters: "التحكم بالحرارة",
  heater: "التحكم بالحرارة",
  lighting: "الإضاءة",
  lights: "الإضاءة",
  food: "طعام الأسماك",
  foods: "طعام الأسماك",
  treatments: "معالجة المياه",
  treatment: "معالجة المياه",
  "water-care": "معالجة المياه",
  decorations: "تربة وديكور",
  decoration: "تربة وديكور",
  decor: "تربة وديكور",
  substrates: "تربة وديكور",
  substrate: "تربة وديكور",
  "air-pumps": "التهوية والأكسجين",
  aeration: "التهوية والأكسجين",
  maintenance: "الصيانة والتنظيف",
  cleaning: "الصيانة والتنظيف",
  breeding: "العزل والتفريخ",
  isolation: "العزل والتفريخ",
  testing: "الفحص والمراقبة",
  monitoring: "الفحص والمراقبة",
};

export const AQUAVO_PRODUCT_CATEGORIES = Object.freeze([
  "تربة وديكور",
  "الفلترة والتنقية",
  "التهوية والأكسجين",
  "طعام الأسماك",
  "معالجة المياه",
  "الصيانة والتنظيف",
  "العزل والتفريخ",
  "الفحص والمراقبة",
  "التحكم بالحرارة",
  "أحواض",
  "الإضاءة",
] as const);

export function canonicalProductCategory(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if ((AQUAVO_PRODUCT_CATEGORIES as readonly string[]).includes(trimmed)) return trimmed;
  return CATEGORY_ALIASES[trimmed.toLowerCase()] || trimmed;
}

export function categoryProductsPath(value: string): string {
  return `/products?category=${encodeURIComponent(canonicalProductCategory(value) || value)}`;
}

export const PUBLIC_INDEXABLE_PATHS = Object.freeze([
  "/",
  "/products",
  "/guides",
  "/deals",
  "/blog",
  "/faq",
  "/beginner-guide",
  "/about",
  "/why-aquavo",
  "/shipping",
  "/return-policy",
  "/terms",
  "/privacy-policy",
  "/contact",
  "/calculators",
  "/journey",
  "/fish-encyclopedia",
  "/fish-finder",
  "/fish-compatibility",
  "/community-gallery",
  "/fish-health",
  "/fish-health-diagnosis",
  "/fish-breeding-calculator",
  "/sustainability",
] as const);

export const NOINDEX_PUBLIC_PATHS = Object.freeze([
  "/search",
  "/wishlist",
  "/compare",
  "/cart",
  "/checkout",
  "/profile",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/order-tracking",
  "/returns",
  "/fish-patients",
] as const);

/**
 * The single canonical form of a path, shared by the SSR handlers, the React
 * app and the sitemap builders. Query strings and fragments never belong in a
 * canonical, trailing slashes are stripped, and the home page keeps exactly one
 * slash so that every producer agrees with what the sitemap publishes.
 */
export function canonicalPathFor(pathname: string): string {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "");
  return path === "" ? "/" : path;
}

/** Absolute canonical URL for a path. Always agrees with the sitemap entry. */
export function canonicalUrlFor(pathname: string): string {
  const path = canonicalPathFor(pathname);
  return path === "/" ? `${AQUAVO_BASE_URL}/` : `${AQUAVO_BASE_URL}${path}`;
}

/**
 * Canonical identity of the product listing.
 *
 * `category` is the one query parameter that identifies a distinct page, so it
 * survives canonicalization while tracking, sort and paging parameters do not.
 * SSR and the React app must agree here: if the client published a bare
 * /products canonical after hydration, every category listing would collapse
 * into the same URL and lose its own identity in the index.
 */
export function productListingSeo(rawCategory?: string | null): {
  category?: string;
  canonicalPath: string;
  canonicalUrl: string;
  title: string;
} {
  const category = canonicalProductCategory(rawCategory);
  const canonicalPath = category
    ? `/products?category=${encodeURIComponent(category)}`
    : "/products";
  const name = category ? `منتجات ${category}` : "مستلزمات أحواض الزينة في العراق";
  return {
    category,
    canonicalPath,
    canonicalUrl: `${AQUAVO_BASE_URL}${canonicalPath}`,
    title: `${name} | AQUAVO`,
  };
}

export function isNoindexPath(pathname: string): boolean {
  const clean = canonicalPathFor(pathname);
  return (
    (NOINDEX_PUBLIC_PATHS as readonly string[]).includes(clean) ||
    clean.startsWith("/admin") ||
    clean.startsWith("/api/") ||
    clean.startsWith("/order-confirmation/") ||
    clean.startsWith("/invoice/")
  );
}
