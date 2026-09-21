#!/usr/bin/env node
/**
 * Loads data/i18n/translations/<locale>/<entity>.json into content_translations.
 *
 * Upsert on (entity_type, entity_id, locale). Rows an editor has marked
 * `reviewed` are never overwritten by machine output unless --overwrite-reviewed
 * is passed. Arabic source tables are never touched.
 *
 * Usage:
 *   node --env-file=.env TOOLS/i18n/seed-translations.mjs [--dry-run] [--locale=en] [--entity=products]
 *
 * Requires migrations/add_content_translations.sql to have been applied.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const DRY = args["dry-run"] === "true";
const OVERWRITE_REVIEWED = args["overwrite-reviewed"] === "true";
const LOCALES = args.locale ? [args.locale] : ["en", "ckb"];
const FILES = {
  products: "product",
  blog_posts: "blog_post",
  blog_categories: "blog_category",
  categories: "category",
  guides: "guide",
};
const ENTITIES = args.entity ? [args.entity] : Object.keys(FILES);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required (run with node --env-file=.env)");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

let upserts = 0;
let skippedReviewed = 0;
for (const locale of LOCALES) {
  for (const file of ENTITIES) {
    const entityType = FILES[file];
    const path = resolve("data/i18n/translations", locale, `${file}.json`);
    if (!existsSync(path)) continue;
    const store = JSON.parse(readFileSync(path, "utf8"));
    const entries = Object.values(store);
    console.log(`${locale}/${file}: ${entries.length} entries`);
    if (DRY) { upserts += entries.length; continue; }
    // One atomic transaction per locale/entity file: either every row lands or none does.
    const queries = entries.map((entry) => sql`
        INSERT INTO content_translations (entity_type, entity_id, locale, data, status, source_hash, translated_by, updated_at)
        VALUES (${entityType}, ${entry.entityId}, ${locale}, ${JSON.stringify(entry.data)}::jsonb, 'machine', ${entry.sourceHash}, ${entry.translatedBy}, now())
        ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
          data = EXCLUDED.data,
          source_hash = EXCLUDED.source_hash,
          translated_by = EXCLUDED.translated_by,
          status = 'machine',
          updated_at = now()
        WHERE ${OVERWRITE_REVIEWED} OR content_translations.status <> 'reviewed'
        RETURNING id`);
    const results = await sql.transaction(queries);
    for (const rows of results) {
      if (rows.length) upserts++;
      else skippedReviewed++;
    }
    console.log(`  ${locale}/${file}: ${results.filter((r) => r.length).length} written in one transaction`);
  }
}
console.log(`${DRY ? "[dry-run] would upsert" : "upserted"} ${upserts} rows; ${skippedReviewed} reviewed rows left untouched`);
