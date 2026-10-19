import type { Pool } from "@neondatabase/serverless";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { contentTranslations } from "../shared/schema.js";
import type { TranslationRecord } from "../shared/i18n/content.js";
import { DEFAULT_LOCALE, isLocale } from "../shared/i18n/locales.js";
import type { TranslatedPageEntity } from "../shared/i18n/indexability.js";

/**
 * Read the same translation evidence for HTML and sitemap eligibility. Loading
 * all locales together also lets the Arabic document advertise only versions
 * that the localized renderer can actually index. No editor identity or other
 * administrative translation fields leave this projection.
 */
export async function loadEntityTranslationRecords<T = Record<string, unknown>>(
  pool: Pool | null,
  entityType: TranslatedPageEntity,
  entityIds: readonly string[],
): Promise<TranslationRecord<T>[]> {
  if (!pool || entityIds.length === 0) return [];
  try {
    const rows = await drizzle(pool).select({
      entityId: contentTranslations.entityId,
      locale: contentTranslations.locale,
      data: contentTranslations.data,
      status: contentTranslations.status,
      sourceHash: contentTranslations.sourceHash,
    }).from(contentTranslations).where(and(
      eq(contentTranslations.entityType, entityType),
      inArray(contentTranslations.entityId, [...new Set(entityIds)]),
    ));

    return rows.flatMap((row): TranslationRecord<T>[] => {
      if (!isLocale(row.locale) || row.locale === DEFAULT_LOCALE) return [];
      return [{
        entityType,
        entityId: row.entityId,
        locale: row.locale,
        data: row.data as T,
        status: row.status === "reviewed" ? "reviewed" : "machine",
        sourceHash: row.sourceHash,
      }];
    });
  } catch {
    // A missing migration or temporary DB error must never publish an
    // unverified translated URL. The Arabic page remains available.
    console.error("SEO translation lookup unavailable; keeping Arabic-only eligibility");
    return [];
  }
}
