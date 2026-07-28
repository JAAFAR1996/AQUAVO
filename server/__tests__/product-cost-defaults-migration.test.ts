import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * F-10 — migrations/drop_product_cost_zero_defaults.sql on a real Postgres
 * engine, forward AND rollback, against the VERIFIED production shape
 * (read-only audit 2026-07-24, project shiny-tree-43710630,
 * branch br-patient-mouse-a4d4cgr4):
 *
 *   114 active products · 0 soft-deleted
 *   113 active with cost_price > 0
 *     1 active with cost_price = 0 (houyi-mountain-wood, stock = 0)
 *     0 active IN-STOCK products with cost_price = 0
 *   114/114 active with packaging_cost = 0 AND insert_cost = 0
 *
 * The defect this migration closes is FORWARD-LOOKING: `cost_price numeric
 * DEFAULT '0'` means the NEXT product created without a cost is born holding a
 * zero that is indistinguishable from a deliberate one. Nothing in the current
 * live data is rewritten, and no historical cost is fabricated.
 */

const ROOT = process.cwd();
const resolutionSql = readFileSync(join(ROOT, "migrations/add_product_cost_resolution.sql"), "utf8");
const forwardSql = readFileSync(join(ROOT, "migrations/drop_product_cost_zero_defaults.sql"), "utf8");
const rollbackSql = readFileSync(join(ROOT, "migrations/drop_product_cost_zero_defaults_rollback.sql"), "utf8");

const BASE = `
CREATE TABLE products (
  id text PRIMARY KEY, name text NOT NULL, price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  cost_price numeric DEFAULT '0',
  packaging_cost numeric DEFAULT '0',
  insert_cost numeric DEFAULT '0'
);
INSERT INTO products (id, name, price, stock, cost_price, packaging_cost, insert_cost)
SELECT 'k'||g, 'known '||g, 1000, 5, 500+g, 0, 0 FROM generate_series(1,113) g;
INSERT INTO products (id, name, price, stock, cost_price, packaging_cost, insert_cost)
VALUES ('houyi-mountain-wood','خشب الجبل الطبيعي',5000,0,0,0,0);
`;

async function count(db: PGlite, where: string): Promise<number> {
  const r = await db.query<{ c: string }>(`SELECT count(*)::text AS c FROM products WHERE ${where}`);
  return Number(r.rows[0].c);
}
async function defaultOf(db: PGlite, column: string): Promise<string | null> {
  const r = await db.query<{ column_default: string | null }>(
    `SELECT column_default FROM information_schema.columns
      WHERE table_name='products' AND column_name=$1`, [column]);
  return r.rows[0]?.column_default ?? null;
}
async function errorOf(fn: () => Promise<unknown>): Promise<string> {
  try { await fn(); return ""; } catch (e) { return String((e as Error).message ?? e); }
}

describe("F-10 — product cost DEFAULT '0' removal", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE);
  });

  it("BASELINE: the default silently manufactures an ambiguous zero", async () => {
    await db.exec(`INSERT INTO products (id, name, price) VALUES ('legacy-new','no cost given',9000)`);
    expect(await count(db, "id='legacy-new' AND cost_price::numeric = 0")).toBe(1);
    expect(await count(db, "id='legacy-new' AND cost_price IS NULL")).toBe(0);
    await db.exec(`DELETE FROM products WHERE id='legacy-new'`);
  });

  it("requires add_product_cost_resolution.sql first — fails CLOSED otherwise", async () => {
    const bare = new PGlite();
    await bare.exec(BASE);
    const msg = await errorOf(() => bare.exec(forwardSql));
    expect(msg).toMatch(/add_product_cost_resolution\.sql must be applied first/i);
    // and the defaults are untouched by the failed attempt
    expect(await defaultOf(bare, "cost_price")).toMatch(/0/);
  });

  it("applies on top of the F-5 migration, and is idempotent", async () => {
    await db.exec(resolutionSql);
    await db.exec(forwardSql);
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
  });

  it("FORWARD: an omitted cost is now UNKNOWN (NULL), never a zero", async () => {
    await db.exec(`INSERT INTO products (id, name, price) VALUES ('new-1','no cost given',9000)`);
    expect(await count(db, "id='new-1' AND cost_price IS NULL")).toBe(1);
    expect(await count(db, "id='new-1' AND packaging_cost IS NULL")).toBe(1);
    expect(await count(db, "id='new-1' AND insert_cost IS NULL")).toBe(1);
    // and its resolution is EXPLICITLY unresolved, not silently NULL
    expect(await count(db, "id='new-1' AND cost_price_resolution = 'unresolved'")).toBe(1);
  });

  it("FORWARD: a bare zero cannot be written without saying what it means", async () => {
    const msg = await errorOf(() => db.exec(
      `INSERT INTO products (id, name, price, cost_price, cost_price_resolution)
       VALUES ('bad-zero','ambiguous',1000,0,NULL)`));
    expect(msg).toMatch(/products_zero_cost_needs_resolution_chk|violates check/i);
  });

  it("FORWARD: an explicit zero IS writable once its meaning is stated", async () => {
    await expect(db.exec(
      `INSERT INTO products (id, name, price, cost_price, cost_price_resolution)
       VALUES ('ok-zero','declared unresolved',1000,0,'unresolved')`)).resolves.toBeDefined();
    await expect(db.exec(
      `INSERT INTO products (id, name, price, cost_price, cost_price_resolution, cost_resolution_note)
       VALUES ('ok-vzero','free sample',1000,0,'verified_zero','supplier freebie, invoice INV-9')`
    )).resolves.toBeDefined();
    // a verified_zero still requires evidence (F-5 constraint holds)
    const msg = await errorOf(() => db.exec(
      `INSERT INTO products (id, name, price, cost_price, cost_price_resolution)
       VALUES ('bad-vzero','no evidence',1000,0,'verified_zero')`));
    expect(msg).toMatch(/products_verified_zero_evidence_chk|violates check/i);
    await db.exec(`DELETE FROM products WHERE id IN ('ok-zero','ok-vzero')`);
  });

  it("FORWARD: NO existing value was rewritten and NO cost was fabricated", async () => {
    expect(await count(db, "deleted_at IS NULL AND cost_price::numeric > 0")).toBe(113);
    expect(await count(db, "id='houyi-mountain-wood' AND cost_price::numeric = 0")).toBe(1);
    expect(await count(db, "id='houyi-mountain-wood' AND stock = 0")).toBe(1);
    // the one live ambiguous zero stays UNRESOLVED — no owner evidence exists
    expect(await count(db, "id='houyi-mountain-wood' AND cost_price_resolution = 'unresolved'")).toBe(1);
    expect(await count(db, "cost_price_resolution = 'verified_zero' AND id <> 'ok-vzero'")).toBe(0);
    // the 114 zero packaging/insert costs are NOT reinterpreted either
    expect(await count(db, "deleted_at IS NULL AND packaging_cost::numeric = 0")).toBe(114);
    expect(await count(db, "deleted_at IS NULL AND insert_cost::numeric = 0")).toBe(114);
  });

  it("ROLLBACK restores the exact pre-migration DDL, and is idempotent", async () => {
    await db.exec(rollbackSql);
    await expect(db.exec(rollbackSql)).resolves.toBeDefined();

    for (const col of ["cost_price", "packaging_cost", "insert_cost"]) {
      expect(await defaultOf(db, col), col).toMatch(/0/);
    }
    for (const col of ["cost_price_resolution", "packaging_cost_resolution", "insert_cost_resolution"]) {
      expect(await defaultOf(db, col), col).toBeNull();
    }
    const chk = await db.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname='products_zero_cost_needs_resolution_chk'`);
    expect(chk.rows.length).toBe(0);
  });

  it("ROLLBACK does NOT retroactively fabricate a 0 for rows created while it was in force", async () => {
    // Restoring the DEFAULT must not rewrite the honest NULL that 'new-1' holds.
    expect(await count(db, "id='new-1' AND cost_price IS NULL")).toBe(1);
    // …and the default is live again for the NEXT insert.
    await db.exec(`INSERT INTO products (id, name, price) VALUES ('post-rollback','',1000)`);
    expect(await count(db, "id='post-rollback' AND cost_price::numeric = 0")).toBe(1);
  });

  it("ROLLBACK preserves every product — nothing was deleted by either direction", async () => {
    expect(await count(db, "deleted_at IS NULL AND cost_price::numeric > 0")).toBe(113);
    expect(await count(db, "id='houyi-mountain-wood'")).toBe(1);
  });

  it("neither migration file contains a top-level BEGIN/COMMIT", () => {
    for (const sql of [forwardSql, rollbackSql]) {
      const stripped = sql.replace(/^\s*--.*$/gm, "");
      expect(/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(stripped)).toBe(false);
    }
  });
});
