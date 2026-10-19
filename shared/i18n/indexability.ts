/**
 * Search alternates must describe indexable versions of one document. A locale
 * being released to customers does not make its machine-translated or stale
 * product/article pages indexable.
 */
import { coverageOf, isIndexableCoverage, sourceHash, type TranslationRecord } from "./content.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, splitLocaleFromPath, type Locale } from "./locales.js";
import { isLocaleReleased, releasedAlternatesFor } from "./release.js";

export type TranslatedPageEntity = "product" | "blog_post";

/** Product/article detail pages require entity-level translation evidence. */
export function isTranslatedEntityPath(logicalPath: string): boolean {
  const { path } = splitLocaleFromPath(logicalPath.split(/[?#]/, 1)[0]);
  return /^\/(?:products|blog)\/[^/]+\/?$/.test(path);
}

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

/**
 * Static UI pages use the locale release gate. Entity pages additionally need
 * the eligible locale set from their translation records; unknown eligibility
 * must never advertise all released languages. Arabic remains the x-default.
 */
export function indexableAlternatesFor(
  logicalPath: string,
  indexableLocales?: readonly Locale[],
): ReturnType<typeof releasedAlternatesFor> {
  const released = releasedAlternatesFor(logicalPath);
  const eligible = indexableLocales ?? (isTranslatedEntityPath(logicalPath) ? [DEFAULT_LOCALE] : undefined);
  if (!eligible) return released;
  return {
    ...released,
    alternates: released.alternates.filter((alternate) =>
      alternate.locale === DEFAULT_LOCALE || eligible.includes(alternate.locale),
    ),
  };
}
