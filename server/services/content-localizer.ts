/**
 * Reads content_translations and merges them over Arabic source rows for the
 * locale of the current request. Arabic requests never touch this table.
 */
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db.js";
import { contentTranslations } from "../../shared/schema.js";
import { DEFAULT_LOCALE, type Locale } from "../../shared/i18n/locales.js";
import {
  applyBlogPostTranslation,
  applyProductTranslation,
  type BlogPostTranslationData,
  type CategoryTranslationData,
  type BlogCategoryTranslationData,
  type ProductTranslationData,
  type TranslatableEntityType,
} from "../../shared/i18n/content.js";

async function loadTranslations<T>(entityType: TranslatableEntityType, ids: string[], locale: Locale): Promise<Map<string, T>> {
  const map = new Map<string, T>();
  if (locale === DEFAULT_LOCALE || ids.length === 0) return map;
  const db = getDb();
  if (!db) return map;
  const rows = await db
    .select({ entityId: contentTranslations.entityId, data: contentTranslations.data })
    .from(contentTranslations)
    .where(and(eq(contentTranslations.entityType, entityType), eq(contentTranslations.locale, locale), inArray(contentTranslations.entityId, ids)));
  for (const row of rows) map.set(row.entityId, row.data as T);
  return map;
}

export interface LocalizedList<T> {
  items: T[];
  contentLocale: Locale;
  /** Ids of items that fell back to Arabic. Empty for Arabic requests. */
  missing: string[];
}

export async function localizeProducts<T extends Record<string, unknown> & { id: string }>(products: T[], locale: Locale): Promise<LocalizedList<T>> {
  if (locale === DEFAULT_LOCALE) return { items: products, contentLocale: DEFAULT_LOCALE, missing: [] };
  const translations = await loadTranslations<ProductTranslationData>("product", products.map((p) => p.id), locale);
  const missing: string[] = [];
  const items = products.map((p) => {
    const r = applyProductTranslation(p, translations.get(p.id), locale);
    if (r.translationMissing) missing.push(p.id);
    return r.value;
  });
  return { items, contentLocale: locale, missing };
}

export async function localizeProduct<T extends Record<string, unknown> & { id: string }>(product: T, locale: Locale) {
  const { items, missing } = await localizeProducts([product], locale);
  return { product: items[0], contentLocale: missing.length ? DEFAULT_LOCALE : locale, translationMissing: missing.length > 0 };
}

export async function localizeBlogPosts<T extends Record<string, unknown> & { id: string }>(posts: T[], locale: Locale): Promise<LocalizedList<T>> {
  if (locale === DEFAULT_LOCALE) return { items: posts, contentLocale: DEFAULT_LOCALE, missing: [] };
  const translations = await loadTranslations<BlogPostTranslationData>("blog_post", posts.map((p) => p.id), locale);
  const missing: string[] = [];
  const items = posts.map((p) => {
    const r = applyBlogPostTranslation(p, translations.get(p.id), locale);
    if (r.translationMissing) missing.push(p.id);
    return r.value;
  });
  return { items, contentLocale: locale, missing };
}

/** Category display names keyed by the Arabic canonical name (which is also the URL identity). */
export async function localizeCategoryNames(
  categories: Array<{ id: string; name: string; displayName: string; description?: string | null }>,
  locale: Locale,
) {
  if (locale === DEFAULT_LOCALE) return categories;
  const translations = await loadTranslations<CategoryTranslationData>("category", categories.map((c) => c.id), locale);
  return categories.map((c) => {
    const t = translations.get(c.id);
    return t?.displayName ? { ...c, displayName: t.displayName, description: t.description ?? c.description } : c;
  });
}

export async function localizeBlogCategories(
  categories: Array<{ id: string; name: string; description?: string | null }>,
  locale: Locale,
) {
  if (locale === DEFAULT_LOCALE) return categories;
  const translations = await loadTranslations<BlogCategoryTranslationData>("blog_category", categories.map((c) => c.id), locale);
  return categories.map((c) => {
    const t = translations.get(c.id);
    return t?.name ? { ...c, name: t.name, description: t.description ?? c.description } : c;
  });
}
