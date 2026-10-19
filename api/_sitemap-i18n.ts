/**
 * Multilingual sitemap helpers.
 *
 * Google wants every language version listed as its own <url>, each carrying
 * the full set of <xhtml:link rel="alternate" hreflang> annotations. Only
 * versions that can be indexed are listed: English/Kurdish product and article
 * URLs require reviewed, current, complete translations. Unreviewed or partial
 * translations may be served to visitors but must not be advertised to search.
 */
import type { Pool } from "@neondatabase/serverless";
import { AQUAVO_BASE_URL } from "../shared/seo-contract.js";
import { DEFAULT_LOCALE, LOCALES, localizePath, type Locale } from "../shared/i18n/locales.js";
import { RELEASED_LOCALES } from "../shared/i18n/release.js";
import { indexableLocalesForEntity, type TranslatedPageEntity } from "../shared/i18n/indexability.js";
import type { TranslationRecord } from "../shared/i18n/content.js";
import { loadEntityTranslationRecords } from "./_translation-records.js";

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

/** Locales listed for static pages: Arabic plus released locales only (shared/i18n/release.ts). */
export const ALL_LOCALES: readonly Locale[] = RELEASED_LOCALES;

/**
 * For each entity id, apply exactly the renderer's translation coverage rule.
 * A source map is required: testing only status='reviewed' would advertise
 * translations invalidated by later source edits or missing required fields.
 * Missing source/translation rows and lookup failures remain Arabic-only.
 */
export async function translatedLocalesByEntity(
  pool: Pool | null,
  entityType: TranslatedPageEntity,
  ids: readonly string[],
  sourceFieldsById: Readonly<Record<string, Record<string, unknown>>>,
): Promise<Map<string, Locale[]>> {
  const map = new Map<string, Locale[]>();
  for (const id of ids) map.set(id, [DEFAULT_LOCALE]);
  const sourceIds = [...map.keys()].filter((id) => Object.prototype.hasOwnProperty.call(sourceFieldsById, id));
  if (sourceIds.length === 0) return map;
  try {
    const records = await loadEntityTranslationRecords(pool, entityType, sourceIds);
    const recordsById = new Map<string, TranslationRecord[]>();
    for (const record of records) {
      const group = recordsById.get(record.entityId) ?? [];
      group.push(record);
      recordsById.set(record.entityId, group);
    }
    for (const id of sourceIds) {
      map.set(id, indexableLocalesForEntity(entityType, sourceFieldsById[id], recordsById.get(id) ?? []));
    }
  } catch (err) {
    console.error("sitemap: content_translations unavailable, listing Arabic only", err);
  }
  return map;
}
