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
export type TranslationCoverage = "complete" | "machine" | "outdated" | "partial" | "missing";

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

/**
 * Field-level completeness: a translation record counts only when every
 * REQUIRED localized field is present and non-empty, and list-shaped fields
 * have the same number of items as the Arabic source. `source` is the object
 * returned by the matching *SourceFields() helper.
 */
export function translationCompleteness(
  entityType: TranslatableEntityType,
  data: Record<string, unknown> | null | undefined,
  source?: Record<string, unknown>,
): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  const d = (data ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  if (entityType === "product") {
    if (!str(d.name)) missing.push("name");
    if (!str(d.description)) missing.push("description");
    if (source) {
      if (str(source.subcategory) && !str(d.subcategory)) missing.push("subcategory");
      const specs = (d.specifications ?? {}) as Record<string, unknown>;
      for (const key of ["benefits", "usageInstructions", "safetyWarnings"]) {
        if (len(source[key]) !== len(specs[key])) missing.push(`specifications.${key}`);
        else if ((specs[key] as unknown[] | undefined)?.some((x) => !str(x))) missing.push(`specifications.${key}[]`);
      }
      if (str(source.cardBenefit) && !str(specs.__cardBenefit)) missing.push("specifications.__cardBenefit");
      const labelled = (specs.labelled ?? {}) as Record<string, { label?: unknown; value?: unknown }>;
      for (const k of Object.keys((source.labelled ?? {}) as Record<string, unknown>)) {
        if (!str(labelled[k]?.label) || !str(labelled[k]?.value)) missing.push(`specifications.labelled.${k}`);
      }
      const vl = (d.variantLabels ?? {}) as Record<string, unknown>;
      for (const id of Object.keys((source.variantLabels ?? {}) as Record<string, unknown>)) if (!str(vl[id])) missing.push(`variantLabels.${id}`);
    }
  } else if (entityType === "blog_post") {
    if (!str(d.title)) missing.push("title");
    if (!str(d.excerpt)) missing.push("excerpt");
    if (!str(d.content)) missing.push("content");
    else if (source && str(source.content)) {
      const count = (html: string, re: RegExp) => (html.match(re) || []).length;
      const src = String(source.content);
      const out = String(d.content);
      for (const [label, re] of [["headings", /<h[1-6]\b/gi], ["listItems", /<li\b/gi], ["tables", /<table\b/gi], ["images", /<img\b/gi]] as const) {
        if (count(src, re) !== count(out, re)) missing.push(`content.${label}`);
      }
      const words = (html: string) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      if (words(src) > 40 && words(out) < words(src) * 0.5) missing.push("content.length");
    }
  } else if (entityType === "category") {
    if (!str(d.displayName)) missing.push("displayName");
  } else if (entityType === "blog_category") {
    if (!str(d.name)) missing.push("name");
  } else if (entityType === "guide") {
    if (!str(d.title)) missing.push("title");
  }
  return { complete: missing.length === 0, missing };
}

/**
 * Coverage of one record against the current Arabic source. Order of
 * precedence: missing -> partial (required fields absent) -> outdated ->
 * machine -> complete. Only "complete" (reviewed by a person, current, and
 * field-complete) makes a page indexable.
 */
export function coverageOf(
  record: TranslationRecord | null | undefined,
  currentSourceHash: string,
  source?: Record<string, unknown>,
): TranslationCoverage {
  if (!record) return "missing";
  if (!translationCompleteness(record.entityType, record.data, source).complete) return "partial";
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
