import { categoryContent } from "../shared/category-content.js";
import { categorySearch } from "../shared/category-search.js";
import { DEFAULT_LOCALE, type Locale } from "../shared/i18n/locales.js";
import { AQUAVO_BASE_URL, PUBLIC_INDEXABLE_PATHS, canonicalProductCategory } from "../shared/seo-contract.js";
import type { LocalizedStaticMeta } from "./_static-meta-i18n.js";
import { getGenericStaticSearchMeta } from "./_static-search-copy.js";


/**
 * Category-aware SSR search metadata. Browser pages use the smaller generic
 * getter and supply their category metadata from the actual Products page.
 * This adapter has no authority over robots, canonical URLs or route release.
 */
export function getStaticSearchMeta(
  locale: Locale = DEFAULT_LOCALE,
  path: string,
  rawCategory?: string | null,
): LocalizedStaticMeta | undefined {
  const url = new URL(path, AQUAVO_BASE_URL);
  const logicalPath = url.pathname.replace(/\/+$/, "") || "/";
  if (!(PUBLIC_INDEXABLE_PATHS as readonly string[]).includes(logicalPath)) return undefined;

  const category = logicalPath === "/products"
    ? canonicalProductCategory(rawCategory ?? url.searchParams.get("category"))
    : undefined;
  if (category) {
    const search = categorySearch(category, locale);
    const description = search?.description ?? categoryContent(category)?.metaDescription;
    return search && description ? { title: search.title, description } : undefined;
  }

  return getGenericStaticSearchMeta(locale, logicalPath);
}
