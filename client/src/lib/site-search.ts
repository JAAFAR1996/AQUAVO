import type { Product } from "@/types";
import { SHOP_CATEGORY_LINKS } from "@/lib/product-category-links";

export type SiteSearchResultType = "product" | "page";

export interface SiteSearchResult {
  id: string;
  type: SiteSearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  price?: number;
  rating?: number;
  stock?: number;
  url: string;
  category?: string;
  score: number;
  product?: Product;
}

export interface SiteSearchPage {
  id: string;
  title: string;
  description: string;
  url: string;
  keywords: string[];
}

export const SITE_SEARCH_PAGES: SiteSearchPage[] = [
  {
    id: "store",
    title: "كل المنتجات",
    description: "تصفح معدات ومستلزمات أحواض الزينة المتوفرة في AQUAVO.",
    url: "/products",
    keywords: ["متجر", "منتجات", "معدات", "مستلزمات", "shop", "products"],
  },
  {
    id: "journey",
    title: "اختار حسب حوضك",
    description: "ابدأ من حجم الحوض واحتياجه حتى توصل للقطع الأنسب.",
    url: "/journey",
    keywords: ["حوض", "اختيار", "رحلة", "مساعدة", "wizard", "journey"],
  },
  {
    id: "guides",
    title: "أدلة AQUAVO",
    description: "أدلة عملية عن الفلاتر والماء والحرارة وتجهيز الحوض.",
    url: "/guides",
    keywords: ["دليل", "ادلة", "تعليم", "مقالات", "guide", "learn"],
  },
  {
    id: "tracking",
    title: "تتبع طلبك",
    description: "راجع حالة الطلب باستخدام رقم الطلب ورقم الهاتف.",
    url: "/order-tracking",
    keywords: ["طلب", "تتبع", "شحنة", "tracking", "order"],
  },
  {
    id: "wishlist",
    title: "المفضلة",
    description: "المنتجات التي حفظتها حتى ترجع إلها لاحقاً.",
    url: "/wishlist",
    keywords: ["مفضلة", "محفوظ", "wishlist", "saved"],
  },
  {
    id: "fish-encyclopedia",
    title: "موسوعة الأسماك",
    description: "معلومات عن أنواع أسماك الزينة ومتطلبات العناية بها.",
    url: "/fish-encyclopedia",
    keywords: ["سمك", "اسماك", "موسوعة", "انواع", "fish", "species"],
  },
  {
    id: "faq",
    title: "الأسئلة الشائعة",
    description: "إجابات سريعة عن الطلب والدفع والتوصيل والخدمة.",
    url: "/faq",
    keywords: ["سؤال", "اسئلة", "مساعدة", "faq", "help"],
  },
  {
    id: "shipping",
    title: "التوصيل والدفع",
    description: "تفاصيل أجور التوصيل والدفع عند الاستلام لكل العراق.",
    url: "/shipping",
    keywords: ["توصيل", "شحن", "دفع", "shipping", "delivery", "cod"],
  },
  {
    id: "returns",
    title: "الإرجاع والاستبدال",
    description: "راجع شروط الإرجاع والاستبدال إذا وصل المنتج معيباً.",
    url: "/return-policy",
    keywords: ["ارجاع", "استبدال", "تالف", "معيب", "return", "refund"],
  },
  {
    id: "about",
    title: "منو AQUAVO",
    description: "تعرف على البراند العراقي المتخصص بمستلزمات الأحواض.",
    url: "/about",
    keywords: ["عن", "اكوافو", "براند", "about", "aquavo"],
  },
  {
    id: "contact",
    title: "تواصل ويانا",
    description: "تواصل ويانا إذا تحتاج مساعدة قبل أو بعد الطلب.",
    url: "/contact",
    keywords: ["تواصل", "واتساب", "هاتف", "دعم", "contact", "support"],
  },
];

export const POPULAR_SEARCH_LINKS = [
  { title: "فلاتر المياه", url: SHOP_CATEGORY_LINKS.filters, category: "فلاتر", keywords: ["فلتر", "فلاتر", "تصفية", "filter"] },
  { title: "سخانات الحوض", url: SHOP_CATEGORY_LINKS.heaters, category: "سخانات", keywords: ["سخان", "حرارة", "heater"] },
  { title: "الإضاءة", url: SHOP_CATEGORY_LINKS.lighting, category: "إضاءة", keywords: ["ضوء", "اضاءة", "ليد", "lighting", "led"] },
  { title: "الديكور والأحجار", url: SHOP_CATEGORY_LINKS.decor, category: "ديكور", keywords: ["ديكور", "حجر", "صخور", "زينة", "decor"] },
  { title: "مضخات الهواء", url: SHOP_CATEGORY_LINKS.airPumps, category: "مضخات", keywords: ["مضخة", "هواء", "اكسجين", "air", "pump"] },
  { title: "أغذية الأسماك", url: SHOP_CATEGORY_LINKS.food, category: "أغذية", keywords: ["طعام", "غذاء", "اكل", "food"] },
  { title: "معالجات المياه", url: SHOP_CATEGORY_LINKS.waterTreatment, category: "معالجات", keywords: ["معالج", "ماء", "كلور", "treatment", "conditioner"] },
] as const;

const ARABIC_MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const SEARCH_SEPARATORS = /[^0-9a-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/gi;

export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(ARABIC_MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(SEARCH_SEPARATORS, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function fuzzySearchMatch(value: unknown, query: string): boolean {
  const text = normalizeSearchText(value);
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  if (text.includes(needle)) return true;

  const tokens = needle.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => text.includes(token))) return true;

  let cursor = 0;
  for (const char of text) {
    if (char === needle[cursor]) cursor += 1;
    if (cursor === needle.length) return true;
  }
  return false;
}

function searchableProductText(product: Product): string {
  return [
    product.name,
    product.brand,
    product.category,
    product.description,
    product.specs,
    product.slug,
  ].join(" ");
}

function productScore(product: Product, query: string, semanticRank?: number): number {
  const normalizedQuery = normalizeSearchText(query);
  const name = normalizeSearchText(product.name);
  const brand = normalizeSearchText(product.brand);
  const category = normalizeSearchText(product.category);
  const description = normalizeSearchText(product.description);

  let score = semanticRank == null ? 0 : Math.max(25, 60 - semanticRank * 3);
  if (!normalizedQuery) return score;
  if (name === normalizedQuery) score += 80;
  if (name.startsWith(normalizedQuery)) score += 45;
  if (name.includes(normalizedQuery)) score += 35;
  if (brand.includes(normalizedQuery)) score += 18;
  if (category.includes(normalizedQuery)) score += 16;
  if (description.includes(normalizedQuery)) score += 6;
  if (fuzzySearchMatch(searchableProductText(product), normalizedQuery)) score += 4;
  if ((product.stock ?? 0) > 0) score += 7;
  return score;
}

function productResult(product: Product, query: string, semanticRank?: number): SiteSearchResult {
  const slug = product.slug || product.id;
  return {
    id: product.id,
    type: "product",
    title: product.name,
    subtitle: [product.brand, product.category].filter(Boolean).join(" · "),
    description: product.description,
    image: product.image || product.thumbnail || product.images?.[0],
    price: Number(product.price ?? 0),
    rating: Number(product.rating ?? 0),
    stock: Number(product.stock ?? 0),
    url: `/products/${slug}`,
    category: product.category,
    score: productScore(product, query, semanticRank),
    product,
  };
}

function pageScore(page: SiteSearchPage, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  const title = normalizeSearchText(page.title);
  let score = 0;
  if (title === normalizedQuery) score += 70;
  if (title.startsWith(normalizedQuery)) score += 38;
  if (title.includes(normalizedQuery)) score += 28;
  if (page.keywords.some((keyword) => fuzzySearchMatch(keyword, normalizedQuery))) score += 18;
  if (fuzzySearchMatch(page.description, normalizedQuery)) score += 5;
  return score;
}

export function buildUnifiedSiteSearchResults({
  query,
  semanticProducts = [],
  catalogProducts = [],
  limit = 24,
}: {
  query: string;
  semanticProducts?: Product[];
  catalogProducts?: Product[];
  limit?: number;
}): SiteSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const productMap = new Map<string, SiteSearchResult>();

  semanticProducts.forEach((product, index) => {
    productMap.set(product.id, productResult(product, normalizedQuery, index));
  });

  catalogProducts.forEach((product) => {
    if (!fuzzySearchMatch(searchableProductText(product), normalizedQuery)) return;
    const candidate = productResult(product, normalizedQuery);
    const existing = productMap.get(product.id);
    if (!existing || candidate.score > existing.score) productMap.set(product.id, candidate);
  });

  const pageResults: SiteSearchResult[] = SITE_SEARCH_PAGES
    .map((page) => ({
      id: page.id,
      type: "page" as const,
      title: page.title,
      description: page.description,
      url: page.url,
      score: pageScore(page, normalizedQuery),
    }))
    .filter((result) => result.score > 0);

  POPULAR_SEARCH_LINKS.forEach((link, index) => {
    const haystack = `${link.title} ${link.category} ${link.keywords.join(" ")}`;
    if (!fuzzySearchMatch(haystack, normalizedQuery)) return;
    if (pageResults.some((result) => result.url === link.url)) return;
    pageResults.push({
      id: `category-${index}`,
      type: "page",
      title: link.title,
      subtitle: link.category,
      description: `افتح قسم ${link.title} وشوف الخيارات المتوفرة.`,
      url: link.url,
      category: link.category,
      score: 24,
    });
  });

  const productResults: SiteSearchResult[] = [];
  productMap.forEach((result) => productResults.push(result));

  return productResults
    .concat(pageResults)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.type !== b.type) return a.type === "product" ? -1 : 1;
      if (a.type === "product" && b.type === "product") {
        const stockDifference = Number((b.stock ?? 0) > 0) - Number((a.stock ?? 0) > 0);
        if (stockDifference !== 0) return stockDifference;
      }
      return a.title.localeCompare(b.title, "ar");
    })
    .slice(0, limit);
}
