/**
 * Guarded re-seed of corrected translations into content_translations.
 *
 * For every repository entry it decides, against production:
 *   insert    no row exists yet
 *   change    a machine row exists and its data differs
 *   identical a machine row exists with byte-identical data (no write)
 *   reviewed  a person has reviewed that row: never touched
 *   outdated  the Arabic source moved since the translation was made: never written
 *   skip      the entity is missing, deleted or unpublished
 *
 * Only "insert" and "change" are written, always with status "machine", one
 * transaction per locale and entity type. Arabic source rows are only read.
 *
 * Usage: node --env-file=.env --import tsx TOOLS/i18n/reseed.ts [--commit] [--locale=en,ckb]
 * Without --commit it is a dry run and writes nothing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const COMMIT = args.commit === "true";
const LOCALES = String(args.locale ?? "en,ckb").split(",").map((s) => s.trim()).filter(Boolean);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required (node --env-file=.env)");
const sql = neon(process.env.DATABASE_URL);

type Row = Record<string, unknown>;
const products = (await sql`SELECT id, name, description, subcategory, specifications, variants, deleted_at AS "deletedAt" FROM products`) as Row[];
const posts = (await sql`SELECT id::text AS id, title, excerpt, content, category, is_published AS "isPublished" FROM blog_posts`) as Row[];
const blogCats = (await sql`SELECT id::text AS id, name, description FROM blog_categories`) as Row[];

interface Source { fields: Record<string, unknown>; hash: string; published: boolean }
const sources: Record<string, Map<string, Source>> = {
  product: new Map(products.map((p) => { const f = productSourceFields(p as never); return [String(p.id), { fields: f, hash: sourceHash(f), published: !p.deletedAt }]; })),
  blog_post: new Map(posts.map((p) => { const f = blogPostSourceFields(p as never); return [String(p.id), { fields: f, hash: sourceHash(f), published: !!p.isPublished }]; })),
  blog_category: new Map(blogCats.map((c) => { const f = blogCategorySourceFields(c as never); return [String(c.id), { fields: f, hash: sourceHash(f), published: true }]; })),
};

const existing = new Map<string, { status: string; sourceHash: string | null; data: Record<string, unknown> }>();
for (const r of (await sql`SELECT entity_type, entity_id, locale, status, source_hash, data FROM content_translations`) as Array<Row>) {
  existing.set(`${r.locale}|${r.entity_type}|${r.entity_id}`, { status: String(r.status), sourceHash: (r.source_hash as string) ?? null, data: r.data as Record<string, unknown> });
}

/** Key-order-independent JSON, so a row is "changed" only when its content changed. */
function canonical(value: unknown): string {
  const walk = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(walk)
    : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, walk((v as Record<string, unknown>)[k])]))
    : v;
  return JSON.stringify(walk(value));
}

const FILES: Record<string, TranslatableEntityType> = { products: "product", blog_posts: "blog_post", blog_categories: "blog_category" };
interface Planned { locale: string; type: TranslatableEntityType; id: string; slug: string; data: Record<string, unknown>; hash: string; by: string }
const plan: Record<string, { insert: Planned[]; change: Planned[]; identical: number; reviewed: string[]; outdated: string[]; skipped: string[] }> = {};

for (const locale of LOCALES) {
  for (const [file, type] of Object.entries(FILES)) {
    const p = resolve("data/i18n/translations", locale, `${file}.json`);
    if (!existsSync(p)) continue;
    const store = JSON.parse(readFileSync(p, "utf8")) as Record<string, { entityId: string; slug?: string; sourceHash: string; translatedBy: string; data: Record<string, unknown> }>;
    const key = `${locale}/${file}`;
    plan[key] = { insert: [], change: [], identical: 0, reviewed: [], outdated: [], skipped: [] };
    const bucket = plan[key];
    for (const e of Object.values(store)) {
      const src = sources[type].get(e.entityId);
      const label = e.slug ?? e.entityId;
      if (!src || !src.published) { bucket.skipped.push(label); continue; }
      // The Arabic moved after this translation was produced: it is outdated, not a correction.
      if (e.sourceHash !== src.hash) { bucket.outdated.push(label); continue; }
      if (!translationCompleteness(type, e.data, src.fields).complete) { bucket.skipped.push(`${label} (incomplete)`); continue; }
      const ex = existing.get(`${locale}|${type}|${e.entityId}`);
      const planned: Planned = { locale, type, id: e.entityId, slug: label, data: e.data, hash: e.sourceHash, by: e.translatedBy };
      if (!ex) { bucket.insert.push(planned); continue; }
      if (ex.status === "reviewed") { bucket.reviewed.push(label); continue; }
      // Postgres stores jsonb with its own key order, so compare canonically.
      if (canonical(ex.data) === canonical(e.data) && ex.sourceHash === e.sourceHash) { bucket.identical++; continue; }
      bucket.change.push(planned);
    }
  }
}

console.log(COMMIT ? "RE-SEED (writing)" : "RE-SEED (dry run, nothing is written)");
const table: Record<string, Record<string, number>> = {};
for (const [k, b] of Object.entries(plan)) {
  table[k] = { insert: b.insert.length, change: b.change.length, identical: b.identical, "reviewed (protected)": b.reviewed.length, outdated: b.outdated.length, skipped: b.skipped.length };
}
console.table(table);
for (const [k, b] of Object.entries(plan)) {
  if (b.outdated.length) console.log(`  ${k} outdated, not written: ${b.outdated.slice(0, 10).join(", ")}${b.outdated.length > 10 ? " …" : ""}`);
  if (b.reviewed.length) console.log(`  ${k} reviewed, protected: ${b.reviewed.slice(0, 10).join(", ")}`);
  if (b.skipped.length) console.log(`  ${k} skipped: ${b.skipped.slice(0, 10).join(", ")}`);
  if (b.change.length) console.log(`  ${k} will change: ${b.change.slice(0, 8).map((c) => c.slug).join(", ")}${b.change.length > 8 ? ` … (+${b.change.length - 8})` : ""}`);
}

if (COMMIT) {
  let written = 0;
  for (const [k, b] of Object.entries(plan)) {
    const rows = [...b.insert, ...b.change];
    if (!rows.length) continue;
    const queries = rows.map((r) => sql`
      INSERT INTO content_translations (entity_type, entity_id, locale, data, status, source_hash, translated_by, updated_at)
      VALUES (${r.type}, ${r.id}, ${r.locale}, ${JSON.stringify(r.data)}::jsonb, 'machine', ${r.hash}, ${r.by}, now())
      ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
        data = EXCLUDED.data,
        source_hash = EXCLUDED.source_hash,
        translated_by = EXCLUDED.translated_by,
        updated_at = now()
      WHERE content_translations.status <> 'reviewed'
      RETURNING id`);
    const results = await sql.transaction(queries);
    const n = results.filter((r) => (r as unknown[]).length).length;
    written += n;
    console.log(`  ${k}: ${n} rows written in one transaction`);
  }
  console.log(`total rows written: ${written}`);
}

mkdirSync(resolve("reports/i18n"), { recursive: true });
writeFileSync(
  resolve("reports/i18n/reseed-plan.json"),
  JSON.stringify({ at: new Date().toISOString(), committed: COMMIT, summary: table, detail: Object.fromEntries(Object.entries(plan).map(([k, b]) => [k, { insert: b.insert.map((x) => x.slug), change: b.change.map((x) => x.slug), identical: b.identical, reviewed: b.reviewed, outdated: b.outdated, skipped: b.skipped }])) }, null, 2),
);
