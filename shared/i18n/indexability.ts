/**
 * Search alternates must describe indexable versions of one document. A locale
 * being released to customers does not make its machine-translated or stale
 * product/article pages indexable.
 */
import { coverageOf, isIndexableCoverage, sourceHash, type TranslationRecord } from "./content.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./locales.js";
import { isLocaleReleased } from "./release.js";
export { isTranslatedEntityPath, indexableAlternatesFor } from "./alternate-paths.js";

export type TranslatedPageEntity = "product" | "blog_post";

/**
 * The same reviewed, current and field-complete rule used by the page renderer.
 * Callers supply records for one entity and its unmodified Arabic source fields.
 * Missing/unavailable translation rows therefore fail closed to Arabic only.
 */
export function indexableLocalesForEntity(
  entityType: TranslatedPageEntity,
  sourceFields: Record<string, unknown>,
  records: readonly TranslationRecord[],
): Locale[] {
  const currentHash = sourceHash(sourceFields);
  return SUPPORTED_LOCALES.filter((locale) => {
    if (locale === DEFAULT_LOCALE) return true;
    if (!isLocaleReleased(locale)) return false;
    return records.some((record) =>
      record.entityType === entityType &&
      record.locale === locale &&
      isIndexableCoverage(coverageOf(record, currentHash, sourceFields)),
    );
  });
}
