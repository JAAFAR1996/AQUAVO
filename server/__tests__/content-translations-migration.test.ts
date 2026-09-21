/**
 * Validates migrations/add_content_translations.sql and its rollback against a
 * real Postgres (PGlite): schema, constraints, indexes, upsert semantics, and
 * that Arabic source tables are untouched. This is the pre-production gate;
 * the production run itself is a separate, approved step.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = process.cwd();
const forward = readFileSync(join(ROOT, "migrations/add_content_translations.sql"), "utf8");
const rollback = readFileSync(join(ROOT, "migrations/add_content_translations_rollback.sql"), "utf8");

// Minimal stand-ins for the two tables the migration alters.
const BASE = `
  CREATE TABLE users (id text PRIMARY KEY, email text NOT NULL, preferences jsonb);
  CREATE TABLE orders (id text PRIMARY KEY, status text NOT NULL DEFAULT 'pending', source text);
  CREATE TABLE products (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL);
  INSERT INTO users (id, email) VALUES ('u1', 'a@b.c');
  INSERT INTO orders (id) VALUES ('o1');
  INSERT INTO products (id, name, description) VALUES ('p1', 'فلتر YEE HOB 400', 'وصف عربي');
`;

describe("add_content_translations migration", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE);
    await db.exec(forward);
  });
  afterAll(async () => {
    await db.close();
  });

  it("creates the table with the expected columns, constraints and indexes", async () => {
    const cols = await db.query<{ column_name: string; is_nullable: string }>(
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'content_translations' ORDER BY ordinal_position`,
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual(["id", "entity_type", "entity_id", "locale", "data", "status", "source_hash", "translated_by", "created_at", "updated_at"]);
    const idx = await db.query<{ indexname: string }>(`SELECT indexname FROM pg_indexes WHERE tablename = 'content_translations'`);
    const names = idx.rows.map((r) => r.indexname);
    expect(names).toEqual(expect.arrayContaining(["content_translations_entity_locale_key", "content_translations_type_locale_idx", "content_translations_name_idx", "content_translations_title_idx"]));
    const cons = await db.query<{ conname: string }>(`SELECT conname FROM pg_constraint WHERE conrelid = 'content_translations'::regclass`);
    expect(cons.rows.map((r) => r.conname)).toEqual(expect.arrayContaining(["content_translations_locale_chk", "content_translations_status_chk", "content_translations_entity_chk"]));
  });

  it("adds nullable locale columns to users and orders without touching existing rows", async () => {
    const u = await db.query<{ locale: string | null; email: string }>(`SELECT locale, email FROM users WHERE id = 'u1'`);
    expect(u.rows[0]).toEqual({ locale: null, email: "a@b.c" });
    const o = await db.query<{ locale: string | null; status: string }>(`SELECT locale, status FROM orders WHERE id = 'o1'`);
    expect(o.rows[0]).toEqual({ locale: null, status: "pending" });
  });

  it("upserts one record per (entity, locale) and rejects unsupported locales/statuses/types", async () => {
    await db.query(`INSERT INTO content_translations (entity_type, entity_id, locale, data, source_hash) VALUES ('product', 'p1', 'en', '{"name":"YEE HOB 400 Hang-On-Back Filter"}', 'h1')`);
    await db.query(
      `INSERT INTO content_translations (entity_type, entity_id, locale, data, source_hash, status)
       VALUES ('product', 'p1', 'en', '{"name":"Edited"}', 'h2', 'reviewed')
       ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET data = EXCLUDED.data, source_hash = EXCLUDED.source_hash, status = EXCLUDED.status`,
    );
    const rows = await db.query<{ data: { name: string }; status: string; source_hash: string }>(`SELECT data, status, source_hash FROM content_translations WHERE entity_id = 'p1'`);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({ data: { name: "Edited" }, status: "reviewed", source_hash: "h2" });
    await expect(db.query(`INSERT INTO content_translations (entity_type, entity_id, locale, data) VALUES ('product', 'p1', 'ar', '{}')`)).rejects.toThrow();
    await expect(db.query(`INSERT INTO content_translations (entity_type, entity_id, locale, data) VALUES ('product', 'p1', 'ku', '{}')`)).rejects.toThrow();
    await expect(db.query(`INSERT INTO content_translations (entity_type, entity_id, locale, data, status) VALUES ('product', 'p2', 'en', '{}', 'draft')`)).rejects.toThrow();
    await expect(db.query(`INSERT INTO content_translations (entity_type, entity_id, locale, data) VALUES ('page', 'x', 'en', '{}')`)).rejects.toThrow();
    // The Arabic source row is exactly as it was.
    const p = await db.query<{ name: string; description: string }>(`SELECT name, description FROM products WHERE id = 'p1'`);
    expect(p.rows[0]).toEqual({ name: "فلتر YEE HOB 400", description: "وصف عربي" });
  });

  it("rolls back cleanly and leaves source tables intact", async () => {
    await db.exec(rollback);
    const t = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = 'content_translations'`);
    expect(t.rows[0].n).toBe(0);
    const c = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name IN ('users','orders') AND column_name = 'locale'`);
    expect(c.rows[0].n).toBe(0);
    const p = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM products`);
    expect(p.rows[0].n).toBe(1);
    // Forward migration is re-applicable after rollback (idempotent IF NOT EXISTS guards).
    await db.exec(forward);
    await db.exec(forward);
  });
});
