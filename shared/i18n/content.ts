/**
 * Localized business content: the shape stored in `content_translations.data`
 * for each entity type, the fields that are language-bearing on the Arabic
 * source rows, and pure helpers to merge a translation over a source row.
 *
 * Used by the API (server/services/content-localizer.ts), the crawler HTML
 * (api/ssr-meta.ts), the translation pipeline (scripts/i18n) and the admin.
 */
import { DEFAULT_LOCALE, TRANSLATION_TARGET_LOCALES, type Locale } from "./locales.js";

export type TranslatableEntityType = "product" | "blog_post" | "category" | "blog_category" | "guide";

export type TranslationStatus = "machine" | "reviewed";
/** Derived state shown to editors. */
export type TranslationCoverage = "complete" | "machine" | "outdated" | "missing";

export interface ProductTranslationData {
  name: string;
  description: string;
  subcategory?: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Only the linguistic parts of `specifications`. Technical values are shared. */
  specifications?: {
    benefits?: string[];
    usageInstructions?: string[];
    safetyWarnings?: string[];
    __cardBenefit?: string;
    /** Labelled human-language specs, keyed by the ARABIC key of the source. */
    labelled?: Record<string, { label: string; value: string }>;
  };
  /** Localized option labels keyed by variant id. */
  variantLabels?: Record<string, string>;
}

export interface BlogPostTranslationData {
  title: string;
  excerpt: string;
  content: string;
  category?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface CategoryTranslationData {
  displayName: string;
  description?: string;
}

export interface BlogCategoryTranslationData {
  name: string;
  description?: string;
}

export interface TranslationRecord<T = Record<string, unknown>> {
  entityType: TranslatableEntityType;
  entityId: string;
  locale: Locale;
  data: T;
  status: TranslationStatus;
  sourceHash: string | null;
}

/** Keys of a product's `specifications` that are structural, never language. */
const NON_LINGUISTIC_SPEC_KEYS = new Set([
  "__model3d",
  "__gallery",
  "__video",
  "difficulty",
  "ecoFriendly",
  "power",
  "voltage",
  "wattage",
  "sku",
  "model",
  "modelNumber",
  "barcode",
  "gtin",
]);

/**
 * The language-bearing fields of a product row, in a stable order, for
 * hashing and for the translation pipeline. Values that look like pure
 * measurements ("18W", "45-60") are kept: they are still shown to the
 * customer and may need a localized unit word.
 */
export function productSourceFields(row: {
  name: string;
  description: string;
  subcategory?: string | null;
  specifications?: Record<string, unknown> | null;
  variants?: Array<{ id: string; label: string }> | null;
}): Record<string, unknown> {
  const specs = (row.specifications ?? {}) as Record<string, unknown>;
  const labelled: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(specs)) {
    if (NON_LINGUISTIC_SPEC_KEYS.has(key)) continue;
    if (["benefits", "usageInstructions", "safetyWarnings", "__cardBenefit"].includes(key)) continue;
    if (typeof value === "string" || typeof value === "number") labelled[key] = value;
  }
  return {
    name: row.name,
    description: row.description,
    subcategory: row.subcategory ?? "",
    benefits: Array.isArray(specs.benefits) ? specs.benefits : [],
    usageInstructions: Array.isArray(specs.usageInstructions) ? specs.usageInstructions : [],
    safetyWarnings: Array.isArray(specs.safetyWarnings) ? specs.safetyWarnings : [],
    cardBenefit: typeof specs.__cardBenefit === "string" ? specs.__cardBenefit : "",
    labelled,
    variantLabels: Object.fromEntries((row.variants ?? []).map((v) => [v.id, v.label])),
  };
}

export function blogPostSourceFields(row: { title: string; excerpt: string; content: string; category?: string | null }): Record<string, unknown> {
  return { title: row.title, excerpt: row.excerpt, content: row.content, category: row.category ?? "" };
}

export function categorySourceFields(row: { displayName: string; description?: string | null }): Record<string, unknown> {
  return { displayName: row.displayName, description: row.description ?? "" };
}

export function blogCategorySourceFields(row: { name: string; description?: string | null }): Record<string, unknown> {
  return { name: row.name, description: row.description ?? "" };
}

/**
 * Stable FNV-1a hash of the source fields. Not cryptographic; it only needs to
 * change whenever the Arabic text changes so a translation can be flagged
 * "outdated". Works identically in Node and the browser (no crypto import).
 */
export function sourceHash(fields: Record<string, unknown>): string {
  const text = JSON.stringify(fields, Object.keys(fields).sort());
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

export function coverageOf(record: TranslationRecord | null | undefined, currentSourceHash: string): TranslationCoverage {
  if (!record) return "missing";
  if (record.sourceHash && record.sourceHash !== currentSourceHash) return "outdated";
  return record.status === "reviewed" ? "complete" : "machine";
}

export interface LocalizedResult<T> {
  value: T;
  /** The locale actually served. Equals the requested locale unless we fell back. */
  contentLocale: Locale;
  translationMissing: boolean;
  /**
   * Coverage of the record that was applied. Only "complete" (reviewed by a
   * person and still matching the Arabic source) makes a page indexable in
   * that locale; machine output is served but stays noindex.
   */
  coverage?: TranslationCoverage;
}

/** The one rule for "may this locale of this entity be indexed / listed in sitemaps". */
export function isIndexableCoverage(coverage: TranslationCoverage | undefined): boolean {
  return coverage === "complete";
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Merge a product translation over the Arabic source, field by field. */
export function applyProductTranslation<T extends Record<string, unknown>>(
  product: T,
  translation: ProductTranslationData | null | undefined,
  locale: Locale,
): LocalizedResult<T> {
  if (locale === DEFAULT_LOCALE || !translation || !nonEmpty(translation.name)) {
    return { value: product, contentLocale: DEFAULT_LOCALE, translationMissing: locale !== DEFAULT_LOCALE };
  }
  const specs = { ...((product.specifications as Record<string, unknown> | undefined) ?? {}) };
  const ts = translation.specifications ?? {};
  if (ts.benefits?.length) specs.benefits = ts.benefits;
  if (ts.usageInstructions?.length) specs.usageInstructions = ts.usageInstructions;
  if (ts.safetyWarnings?.length) specs.safetyWarnings = ts.safetyWarnings;
  if (nonEmpty(ts.__cardBenefit)) specs.__cardBenefit = ts.__cardBenefit;
  if (ts.labelled) {
    for (const [arabicKey, entry] of Object.entries(ts.labelled)) {
      if (!(arabicKey in specs)) continue;
      delete specs[arabicKey];
      specs[entry.label] = entry.value;
    }
  }
  const variants = Array.isArray(product.variants)
    ? (product.variants as Array<Record<string, unknown>>).map((v) => {
        const label = translation.variantLabels?.[String(v.id)];
        return nonEmpty(label) ? { ...v, label } : v;
      })
    : product.variants;
  return {
    value: {
      ...product,
      name: translation.name,
      description: nonEmpty(translation.description) ? translation.description : product.description,
      subcategory: nonEmpty(translation.subcategory) ? translation.subcategory : product.subcategory,
      specifications: specs,
      variants,
    },
    contentLocale: locale,
    translationMissing: false,
  };
}

export function applyBlogPostTranslation<T extends Record<string, unknown>>(
  post: T,
  translation: BlogPostTranslationData | null | undefined,
  locale: Locale,
): LocalizedResult<T> {
  if (locale === DEFAULT_LOCALE || !translation || !nonEmpty(translation.title)) {
    return { value: post, contentLocale: DEFAULT_LOCALE, translationMissing: locale !== DEFAULT_LOCALE };
  }
  return {
    value: {
      ...post,
      title: translation.title,
      excerpt: nonEmpty(translation.excerpt) ? translation.excerpt : post.excerpt,
      content: nonEmpty(translation.content) ? translation.content : post.content,
    },
    contentLocale: locale,
    translationMissing: false,
  };
}

export const TRANSLATION_LOCALES = TRANSLATION_TARGET_LOCALES;
