/**
 * Runtime-safe page translation coverage for server-side metadata.
 *
 * Do not import the client locale JSON bundles here. api/ssr-meta.ts is a
 * low-memory Vercel Function and those bundles are already validated at CI
 * time by the strict i18n validator. Loading them again at function startup
 * makes the SSR function needlessly large and can make cold-start invocation
 * fail before the handler runs.
 *
 * Release invariant:
 * - Arabic is always complete.
 * - A non-Arabic locale may be marked released only after CI proves 100% UI
 *   key coverage and the release gate is flipped manually.
 * Therefore runtime page coverage can safely derive from the release gate.
 */
import { DEFAULT_LOCALE, type Locale } from "../shared/i18n/locales.js";
import { isLocaleReleased } from "../shared/i18n/release.js";

/** Guide routes whose page file name differs from the URL slug. Kept for tooling/tests. */
const ROUTE_TO_FILE: Record<string, string> = {
  "/guides/new-aquarium-setup-iraq": "guides-new-aquarium-setup",
  "/guides/aquarium-water-test-guide": "guides-water-test-guide",
  "/guides/aquarium-decor-stones-guide": "guides-decor-stones",
  "/fish-health": "fish-health-diagnosis",
  "/encyclopedia": "fish-encyclopedia",
  "/tank-builder": "aquarium-wizard",
  "/about-aquavo": "about",
};

export function pageFileSlug(logicalPath: string): string {
  const clean = logicalPath.replace(/\/+$/, "") || "/";
  if (ROUTE_TO_FILE[clean]) return ROUTE_TO_FILE[clean];
  if (clean.startsWith("/guides/")) return `guides-${clean.slice("/guides/".length)}`;
  return clean.slice(1);
}

/**
 * Runtime check used by ssr-meta.
 *
 * Detailed key-by-key completeness is enforced in CI, not inside the
 * production function. This keeps the function small and removes client JSON
 * parsing from the cold-start path.
 */
export function isPageTranslated(locale: Locale, _logicalPath: string): boolean {
  if (locale === DEFAULT_LOCALE) return true;
  return isLocaleReleased(locale);
}
