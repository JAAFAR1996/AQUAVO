/**
 * Multilingual sitemap helpers.
 *
 * Google wants every language version listed as its own <url>, each carrying
 * the full set of <xhtml:link rel="alternate" hreflang> annotations. Only
 * versions that really exist are listed: English/Kurdish product and article
 * URLs appear once a translation row exists, because an untranslated page is
 * served in Arabic with noindex and must not be advertised.
 */
import type { Pool } from "@neondatabase/serverless";
import { AQUAVO_BASE_URL } from "../shared/seo-contract.js";
import { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES, localizePath, type Locale } from "../shared/i18n/locales.js";

export const XHTML_NS = 'xmlns:xhtml="http://www.w3.org/1999/xhtml"';

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function absoluteLocalizedUrl(logicalPath: string, locale: Locale): string {
  const path = localizePath(logicalPath, locale);
  return path === "/" ? `${AQUAVO_BASE_URL}/` : `${AQUAVO_BASE_URL}${path}`;
}

/** `<xhtml:link>` lines for the locales a page exists in, plus x-default. */
export function alternateLinks(logicalPath: string, locales: readonly Locale[]): string {
  const lines = locales.map(
    (l) => `<xhtml:link rel="alternate" hreflang="${LOCALES[l].hreflang}" href="${escapeXml(absoluteLocalizedUrl(logicalPath, l))}"/>`,
  );
  lines.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteLocalizedUrl(logicalPath, DEFAULT_LOCALE))}"/>`);
  return lines.join("");
}

/**
 * One <url> block per available locale for a logical path. `extra` (images,
 * lastmod) is repeated on every version because it describes the same page.
 */
export function localizedUrlEntries(logicalPath: string, locales: readonly Locale[], extra = ""): string {
  const alts = alternateLinks(logicalPath, locales);
  return locales
    .map((l) => `  <url><loc>${escapeXml(absoluteLocalizedUrl(logicalPath, l))}</loc>${extra}${alts}</url>`)
    .join("\n");
}

/** Locales in which every listed page exists (static pages have copy for all three). */
export const ALL_LOCALES: readonly Locale[] = SUPPORTED_LOCALES;

/**
 * For each entity id, the locales whose translation is reviewed and still
 * matches the Arabic source (Arabic always). Machine or outdated rows are
 * served on the page but the URL stays noindex, so it is not listed here.
 * Fails soft: if the table is missing or the query errors, everything is Arabic-only.
 */
export async function translatedLocalesByEntity(
  pool: Pool,
  entityType: "product" | "blog_post",
  ids: string[],
  /** id -> current Arabic source hash; rows whose stored hash differs are outdated and skipped. */
  currentHashes?: Record<string, string>,
): Promise<Map<string, Locale[]>> {
  const map = new Map<string, Locale[]>();
  for (const id of ids) map.set(id, [DEFAULT_LOCALE]);
  if (ids.length === 0) return map;
  try {
    const { rows } = await pool.query<{ entity_id: string; locale: Locale }>(
      currentHashes
        ? `SELECT entity_id, locale FROM content_translations
             WHERE entity_type = $1 AND entity_id = ANY($2::text[]) AND status = 'reviewed'
               AND (source_hash IS NULL OR source_hash = ($3::jsonb ->> entity_id))`
        : `SELECT entity_id, locale FROM content_translations
             WHERE entity_type = $1 AND entity_id = ANY($2::text[]) AND status = 'reviewed'`,
      currentHashes ? [entityType, ids, JSON.stringify(currentHashes)] : [entityType, ids],
    );
    for (const row of rows) {
      const list = map.get(row.entity_id);
      if (list && !list.includes(row.locale)) list.push(row.locale);
    }
  } catch (err) {
    console.error("sitemap: content_translations unavailable, listing Arabic only", err);
  }
  return map;
}
