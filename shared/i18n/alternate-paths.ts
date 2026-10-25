/** Browser-safe alternate URL helpers; entity validation stays on the server. */
import { DEFAULT_LOCALE, splitLocaleFromPath, type Locale } from "./locales.js";
import { releasedAlternatesFor } from "./release.js";

/** Product/article detail pages require entity-level translation evidence. */
export function isTranslatedEntityPath(logicalPath: string): boolean {
  const { path } = splitLocaleFromPath(logicalPath.split(/[?#]/, 1)[0]);
  return /^\/(?:products|blog)\/[^/]+\/?$/.test(path);
}

/** Keep the same fail-closed rules for incomplete or unreviewed translations. */
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
