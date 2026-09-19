/**
 * Production verification for content_translations, before and after a seed.
 * Reads the Arabic source rows straight from the database and compares every
 * translation row against them: completeness, source-hash currency, orphans,
 * status, plus Arabic counts and fingerprints. Also reports, for a locale,
 * which repository entries would be inserts vs updates.
 *
 * Usage: node --env-file=.env --import tsx TOOLS/i18n/verify-seed.ts [--locale=en] [--json]
 * Read-only.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import {
  blogCategorySourceFields,
  blogPostSourceFields,
  productSourceFields,
  sourceHash,
  translationCompleteness,
  type TranslatableEntityType,
} from "../../shared/i18n/content.js";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "true"]));
const LOCALE = String(args.locale || "en");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required (node --env-file=.env)");
const sql = neon(process.env.DATABASE_URL);

type Row = Record<string, unknown>;
const products = (await sql`SELECT id, name, description, subcategory, specifications, variants, deleted_at AS "deletedAt" FROM products`) as Row[];
const posts = (await sql`SELECT id::text AS id, title, excerpt, content, category, is_published AS "isPublished" FROM blog_posts`) as Row[];
const blogCats = (await sql`SELECT id::text AS id, name, description FROM blog_categories`) as Row[];
const rows = (await sql`SELECT entity_type, entity_id, locale, status, source_hash, data FROM content_translations`) as Array<{ entity_type: TranslatableEntityType; entity_id: string; locale: string; status: string; source_hash: string | null; data: Record<string, unknown> }>;
const [fp] = (await sql`SELECT (SELECT count(*) FROM products) AS products, (SELECT count(*) FROM blog_posts) AS blog_posts, (SELECT count(*) FROM orders) AS orders, (SELECT count(*) FROM users) AS users, (SELECT md5(string_agg(id || '|' || name || '|' || coalesce(description,''), ',' ORDER BY id)) FROM products) AS products_fp, (SELECT md5(string_agg(id::text || '|' || title || '|' || coalesce(content,''), ',' ORDER BY id)) FROM blog_posts) AS blog_fp`) as Row[];

const sources: Record<TranslatableEntityType, Map<string, { fields: Record<string, unknown>; published: boolean }>> = {
  product: new Map(products.map((p) => [String(p.id), { fields: productSourceFields(p as never), published: !p.deletedAt }])),
  blog_post: new Map(posts.map((p) => [String(p.id), { fields: blogPostSourceFields(p as never), published: !!p.isPublished }])),
  blog_category: new Map(blogCats.map((c) => [String(c.id), { fields: blogCategorySourceFields(c as never), published: true }])),
  category: new Map(),
  guide: new Map(),
};

const byType: Record<string, { rows: number; machine: number; reviewed: number; orphan: number; incomplete: number; hashMismatch: number; unpublished: number }> = {};
for (const r of rows) {
  const k = `${r.locale}/${r.entity_type}`;
  byType[k] ??= { rows: 0, machine: 0, reviewed: 0, orphan: 0, incomplete: 0, hashMismatch: 0, unpublished: 0 };
  const b = byType[k];
  b.rows++;
  if (r.status === "reviewed") b.reviewed++; else b.machine++;
  const src = sources[r.entity_type]?.get(r.entity_id);
  if (!src) { b.orphan++; continue; }
  if (!src.published) b.unpublished++;
  if (!translationCompleteness(r.entity_type, r.data, src.fields).complete) b.incomplete++;
  if (r.source_hash && r.source_hash !== sourceHash(src.fields)) b.hashMismatch++;
}

// Repository entries for LOCALE: inserts vs updates vs stale
const FILES: Record<string, TranslatableEntityType> = { products: "product", blog_posts: "blog_post", blog_categories: "blog_category" };
const plan: Record<string, { entries: number; inserts: number; updates: number; wouldSkipReviewed: number; staleHash: number; notPublic: number; incomplete: number }> = {};
for (const [file, type] of Object.entries(FILES)) {
  const p = resolve("data/i18n/translations", LOCALE, `${file}.json`);
  if (!existsSync(p)) continue;
  const store = JSON.parse(readFileSync(p, "utf8")) as Record<string, { entityId: string; sourceHash: string; data: Record<string, unknown> }>;
  const existing = new Map(rows.filter((r) => r.locale === LOCALE && r.entity_type === type).map((r) => [r.entity_id, r]));
  const s = { entries: 0, inserts: 0, updates: 0, wouldSkipReviewed: 0, staleHash: 0, notPublic: 0, incomplete: 0 };
  for (const e of Object.values(store)) {
    s.entries++;
    const src = sources[type].get(e.entityId);
    if (!src || !src.published) s.notPublic++;
    if (src && e.sourceHash !== sourceHash(src.fields)) s.staleHash++;
    if (src && !translationCompleteness(type, e.data, src.fields).complete) s.incomplete++;
    const ex = existing.get(e.entityId);
    if (!ex) s.inserts++; else if (ex.status === "reviewed") s.wouldSkipReviewed++; else s.updates++;
  }
  plan[`${LOCALE}/${file}`] = s;
}

const out = { at: new Date().toISOString(), totalRows: rows.length, byType, plan, arabic: fp };
if (args.json === "true") console.log(JSON.stringify(out, null, 2));
else {
  console.log(`content_translations rows: ${rows.length}`);
  console.table(byType);
  console.log(`seed plan for ${LOCALE}:`);
  console.table(plan);
  console.log("arabic counts/fingerprints:", fp);
}
