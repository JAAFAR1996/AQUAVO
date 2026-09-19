/**
 * Reads content_translations and merges them over Arabic source rows for the
 * locale of the current request. Arabic requests never touch this table.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

/**
 * Local/preview only: read the committed translation files instead of the
 * database. Never enabled in production (AQUAVO_TRANSLATIONS_FILE_FALLBACK=1).
 */
const FILE_FALLBACK = process.env.AQUAVO_TRANSLATIONS_FILE_FALLBACK === "1";
const FILE_ENTITY: Record<string, string> = { product: "products", blog_post: "blog_posts", blog_category: "blog_categories", category: "categories", guide: "guides" };
const fileCache = new Map<string, Record<string, { data: unknown }>>();
function fileFallback<T>(entityType: TranslatableEntityType, ids: string[], locale: Locale, map: Map<string, T>): Map<string, T> {
  if (!FILE_FALLBACK) return map;
  const key = `${locale}/${FILE_ENTITY[entityType]}`;
  let store = fileCache.get(key);
  if (!store) {
    try {
      store = JSON.parse(readFileSync(resolve("data/i18n/translations", locale, `${FILE_ENTITY[entityType]}.json`), "utf8")) as Record<string, { data: unknown }>;
    } catch {
      store = {};
    }
    fileCache.set(key, store);
  }
  for (const id of ids) if (!map.has(id) && store[id]) map.set(id, store[id].data as T);
  return map;
}

async function loadTranslations<T>(entityType: TranslatableEntityType, ids: string[], locale: Locale): Promise<Map<string, T>> {
  const map = new Map<string, T>();
  if (locale === DEFAULT_LOCALE || ids.length === 0) return map;
  const db = getDb();
  if (!db) return fileFallback(entityType, ids, locale, map);
  try {
    const rows = await db
      .select({ entityId: contentTranslations.entityId, data: contentTranslations.data })
      .from(contentTranslations)
      .where(and(eq(contentTranslations.entityType, entityType), eq(contentTranslations.locale, locale), inArray(contentTranslations.entityId, ids)));
    for (const row of rows) map.set(row.entityId, row.data as T);
    if (map.size > 0 || !FILE_FALLBACK) return map;
  } catch (err) {
    // Table not migrated yet (or transient DB error): serve Arabic, or the
    // file store when explicitly enabled for local/preview environments.
    if (!FILE_FALLBACK) console.error("[i18n] content_translations unavailable, serving Arabic", (err as Error).message);
  }
  return fileFallback(entityType, ids, locale, map);
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
