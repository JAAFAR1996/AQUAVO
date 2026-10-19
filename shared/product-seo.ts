import { stripBidiControls } from "./i18n/bidi.js";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locales.js";

export interface ProductSeoInput {
  name: string;
  brand?: string | null;
  description?: string | null;
  specifications?: Record<string, unknown> | null;
}

export interface ProductSeoOptions {
  locale?: Locale;
  /** Explicitly reviewed metadata; callers must not infer it from product specs. */
  titleOverride?: string | null;
  descriptionOverride?: string | null;
}

const TITLE_SUFFIX = " | AQUAVO";
// These are editorial budgets, not promises about a search engine's display.
const TITLE_TARGET = 60;
const DESCRIPTION_LIMIT = 160;
const SHORT_DESCRIPTION = 110;
const GENERIC_BRANDS = new Set([
  "general", "generic", "unknown", "n/a", "na", "none", "-", "بدون علامة", "غير محدد",
]);

// The same delivery and payment terms are published in the checkout and footer.
// Do not add stock, discount, performance or delivery-time claims to this copy.
const SERVICE_DESCRIPTION: Record<Locale, string> = {
  ar: "توصيل لكل العراق، والدفع عند الاستلام أو إلكترونياً.",
  en: "Delivery across Iraq, with cash on delivery or online payment.",
  ckb: "گەیاندن بۆ هەموو عێراق؛ پارەدان لە کاتی وەرگرتن یان ئەلیکترۆنی.",
};

function plainText(value: string): string {
  return stripBidiControls(value).replace(/<\/?[a-z][^>]*>/gi, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(value: string, term: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}(?=$|[^\\p{L}\\p{N}])`, "iu").test(value);
}

function productBrand(brand: string | null | undefined): string {
  const clean = plainText(brand ?? "");
  return GENERIC_BRANDS.has(clean.toLowerCase()) || /^aquavo$/i.test(clean) ? "" : clean;
}

function withoutSiteSuffix(value: string): string {
  let clean = plainText(value);
  const suffix = /\s*[|–—-]\s*AQUAVO(?:\s+(?:Iraq|IQ|العراق|عێراق))?\s*$/i;
  while (suffix.test(clean)) clean = clean.replace(suffix, "").trim();
  return clean;
}

// Keep quantities and their units together, including spaced ranges and sizes.
// This is shared by title shortening and excerpts so neither can emit "1.9"
// when the actual source says "1.9 متر", or keep only one end of "50 - 150 لتر".
const NUMBER = /\p{N}/u;
const UNIT = /^(?:°?[cf]|cm|mm|m|kg|g|l|ml|w|v|hz|ppm|gph|lph|l\/h|metres?|meters?|litres?|liters?|watts?|volts?|inches?|in|سم|ملم|مم|متر|أمتار|امتار|كغم|كغ|كيلو|كيلوغرام|غم|غرام|لتر|مل|واط|فولت|درجة|درجات|ساعة|الساعة|مكعب|دينار|IQD)(?:\/[^\s]+)?[.,،;؛:!?؟)]*$/i;
const CONNECTOR = /^(?:[-–—−×x/]|إلى|الى|to|في|in|لكل)$/i;

function atomicWords(text: string): string[] {
  const words = text.split(" ");
  const groups: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    let group = words[index];
    if (NUMBER.test(group) || /[A-Z]{2,}/.test(group)) {
      while (index + 1 < words.length) {
        const next = words[index + 1];
        const after = words[index + 2];
        if (CONNECTOR.test(next) && after && (NUMBER.test(after) || UNIT.test(after))) {
          group += ` ${next} ${after}`;
          index += 2;
        } else if (NUMBER.test(group) && UNIT.test(next)) {
          group += ` ${next}`;
          index += 1;
        } else {
          break;
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

function wordExcerpt(text: string, limit: number): string {
  if (text.length <= limit) return text;
  let prefix = "";
  for (const word of atomicWords(text)) {
    const next = prefix ? `${prefix} ${word}` : word;
    if (next.length > limit - 3) break;
    prefix = next;
  }
  return prefix ? `${prefix.replace(/[\s،,;؛:]+$/, "")}...` : "";
}

function productTitle(product: ProductSeoInput, override?: string | null): string {
  let name = withoutSiteSuffix(override?.trim() || product.name);
  const withoutSiteBrand = name.replace(/(^|\s)AQUAVO(?=\s|$)/gi, "$1").replace(/\s+/g, " ").trim();
  if (withoutSiteBrand) name = withoutSiteBrand;
  const brand = productBrand(product.brand);
  // Remove only a redundant trailing brand, never a brand embedded in a model.
  if (brand) {
    const trailingBrand = new RegExp(`(?:\\s*[-–—|]\\s*|\\s+)${escapeRegExp(brand)}$`, "i");
    let earlierName = name.replace(trailingBrand, "").trim();
    while (earlierName !== name && containsTerm(earlierName, brand)) {
      name = earlierName;
      earlierName = name.replace(trailingBrand, "").trim();
    }
  }
  const brandSuffix = brand && !containsTerm(name, brand) ? ` - ${brand}` : "";
  const budget = TITLE_TARGET - TITLE_SUFFIX.length - brandSuffix.length;
  if (name.length > budget) {
    const words = atomicWords(name);
    const identifiers = [brand, ...["model", "Model", "الموديل", "size", "Size", "الحجم"]
      .map((key) => product.specifications?.[key])
      .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
      .map(String)].filter(Boolean);
    let requiredEnd = 0;
    let end = 0;
    for (const word of words) {
      end += (end ? 1 : 0) + word.length;
      if (NUMBER.test(word) || /[A-Z]{2,}/.test(word)) {
        requiredEnd = end;
      }
    }
    for (const term of identifiers) {
      const matches = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}(?=$|[^\\p{L}\\p{N}])`, "giu");
      for (const match of name.matchAll(matches)) {
        requiredEnd = Math.max(requiredEnd, match.index + match[0].length);
      }
    }
    // Shorten only the tail. Extending the soft budget to the last identifier
    // keeps the preceding qualifiers and original order, even for a long title.
    const excerpt = wordExcerpt(name, Math.max(budget, requiredEnd + 3));
    if (excerpt) name = excerpt;
  }
  return `${name}${brandSuffix}${TITLE_SUFFIX}`;
}

function descriptionExcerpt(text: string): string {
  if (text.length <= DESCRIPTION_LIMIT) {
    return /[.!?؟]$/.test(text) || text.length === DESCRIPTION_LIMIT ? text : `${text}.`;
  }
  let end = 0;
  // A dot is a sentence end only before whitespace/end, so 0.1°C, 13.5 and
  // multi-part model numbers never need a temporary mask or get split apart.
  for (const match of text.matchAll(/[.!?؟]+(?=\s|$)/g)) {
    const sentenceEnd = match.index + match[0].length;
    if (sentenceEnd > DESCRIPTION_LIMIT) break;
    end = sentenceEnd;
  }
  return end ? text.slice(0, end) : wordExcerpt(text, DESCRIPTION_LIMIT);
}

function fallbackDescription(product: ProductSeoInput, locale: Locale): string {
  const label = withoutSiteSuffix(productTitle(product));
  switch (locale) {
    case "en": return `See ${label} at AQUAVO, including its price and product specifications.`;
    case "ckb": return `${label} لە AQUAVO ببینە، لەگەڵ نرخ و تایبەتمەندی و وردەکارییەکانی بەرهەم.`;
    default: return `شوف ${label} من AQUAVO، ويا السعر والمواصفات وتفاصيل المنتج حتى تختار المناسب لحوضك.`;
  }
}

export function buildProductMetaDescription(
  product: ProductSeoInput,
  options: Pick<ProductSeoOptions, "locale"> = {},
): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const source = plainText(product.description ?? "");
  const completeSource = source && !/(?:\.{2,}|…)$/.test(source);
  let description = descriptionExcerpt(completeSource ? source : fallbackDescription(product, locale));
  // An unusually long unbroken token is not useful as a search snippet.
  if (!description) description = descriptionExcerpt(fallbackDescription({ ...product, name: "AQUAVO", brand: null }, locale));
  const service = SERVICE_DESCRIPTION[locale];
  const enriched = `${description} ${service}`;
  if (description.length < SHORT_DESCRIPTION && !/(?:\.{2,}|…)$/.test(description)
    && !description.includes(service) && enriched.length <= DESCRIPTION_LIMIT) {
    description = enriched;
  }
  return description;
}

/** Legacy API retained for callers and regression tests while all renderers share the contract. */
export function buildProductMetaTitle(name: string, brand?: string | null): string {
  return productTitle({ name, brand });
}

/** Metadata only: never use these excerpts as the on-page or JSON-LD product identity. */
export function buildProductSeoMeta(product: ProductSeoInput, options: ProductSeoOptions = {}): {
  title: string;
  description: string;
} {
  return {
    title: productTitle(product, options.titleOverride),
    description: buildProductMetaDescription({
      ...product,
      description: options.descriptionOverride?.trim() || product.description,
    }, options),
  };
}
