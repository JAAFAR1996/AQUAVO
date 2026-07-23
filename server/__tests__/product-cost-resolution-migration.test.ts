import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * F-5 — migrations/add_product_cost_resolution.sql on a real Postgres engine.
 *
 * The fixture reproduces the LIVE shape measured read-only on the verification
 * branch (docs/audit/accounting-semantics-remediation.md §F-5):
 *   0 NULL cost_price · 30 products with cost_price = 0 · every product with
 *   packaging_cost = 0 AND insert_cost = 0.
 */

const ROOT = process.cwd();
const forwardSql = readFileSync(join(ROOT, "migrations/add_product_cost_resolution.sql"), "utf8");
const rollbackSql = readFileSync(join(ROOT, "migrations/add_product_cost_resolution_rollback.sql"), "utf8");

const BASE = `
CREATE TABLE products (
  id text PRIMARY KEY, name text NOT NULL, price numeric NOT NULL,
  cost_price numeric DEFAULT '0',
  packaging_cost numeric DEFAULT '0',
  insert_cost numeric DEFAULT '0'
);
-- 30 ambiguous zeros, 113 positive costs, all with zero packaging/insert
INSERT INTO products (id, name, price, cost_price, packaging_cost, insert_cost)
SELECT 'z'||g, 'zero '||g, 1000, 0, 0, 0 FROM generate_series(1,30) g;
INSERT INTO products (id, name, price, cost_price, packaging_cost, insert_cost)
SELECT 'k'||g, 'known '||g, 1000, 500+g, 0, 0 FROM generate_series(1,113) g;
-- one genuinely NULL cost, to prove NULL is treated as unresolved too
INSERT INTO products (id, name, price, cost_price, packaging_cost, insert_cost)
VALUES ('n1','null cost',1000,NULL,NULL,NULL);
`;

async function count(db: PGlite, where: string): Promise<number> {
  const r = await db.query<{ c: string }>(`SELECT count(*)::text AS c FROM products WHERE ${where}`);
  return Number(r.rows[0].c);
}
async function errorOf(fn: () => Promise<unknown>): Promise<string> {
  try { await fn(); return ""; } catch (e) { return String((e as Error).message ?? e); }
}

describe("F-5 — products cost-resolution migration", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE);
  });

  it("baseline reproduces the live ambiguity: zero is overloaded", async () => {
    expect(await count(db, "cost_price IS NULL")).toBe(1);
    expect(await count(db, "cost_price::numeric = 0")).toBe(30);
    expect(await count(db, "packaging_cost::numeric = 0")).toBe(143);
    expect(await count(db, "insert_cost::numeric = 0")).toBe(143);
  });

  it("applies, and is idempotent on a second apply", async () => {
    await db.exec(forwardSql);
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
  });

  it("DOES NOT SILENTLY REINTERPRET EXISTING ZEROS — every ambiguous zero stays unresolved", async () => {
    expect(await count(db, "cost_price_resolution = 'verified_zero'")).toBe(0);
    expect(await count(db, "packaging_cost_resolution = 'verified_zero'")).toBe(0);
    expect(await count(db, "insert_cost_resolution = 'verified_zero'")).toBe(0);
    // the 30 ambiguous zeros + the 1 NULL are explicitly unresolved
    expect(await count(db, "cost_price_resolution = 'unresolved'")).toBe(31);
    // and every packaging/insert zero is unresolved too
    expect(await count(db, "packaging_cost_resolution = 'unresolved'")).toBe(144);
  });

  it("classifies ONLY where evidence exists: a positive cost is 'known'", async () => {
    expect(await count(db, "cost_price_resolution = 'known'")).toBe(113);
    expect(await count(db, "cost_price_resolution = 'known' AND cost_price::numeric <= 0")).toBe(0);
  });

  it("leaves the stored NUMBERS untouched — nothing was rewritten", async () => {
    expect(await count(db, "cost_price IS NULL")).toBe(1);
    expect(await count(db, "cost_price::numeric = 0")).toBe(30);
    expect(await count(db, "packaging_cost::numeric = 0")).toBe(143);
  });

  it("rejects an unknown resolution word", async () => {
    const msg = await errorOf(() => db.exec(
      `UPDATE products SET cost_price_resolution='probably_zero' WHERE id='z1'`));
    expect(msg).toMatch(/products_cost_resolution_chk|violates check/i);
  });

  it("a verified_zero claim REQUIRES recorded evidence", async () => {
    const msg = await errorOf(() => db.exec(
      `UPDATE products SET cost_price_resolution='verified_zero' WHERE id='z1'`));
    expect(msg).toMatch(/products_verified_zero_evidence_chk|violates check/i);

    await expect(db.exec(
      `UPDATE products SET cost_price_resolution='verified_zero',
        cost_resolution_note='supplier freebie, invoice INV-9', cost_resolution_by='admin',
        cost_resolution_at=now() WHERE id='z1'`)).resolves.toBeDefined();
    expect(await count(db, "cost_price_resolution = 'verified_zero'")).toBe(1);
  });

  it("rollback removes every added object and restores the numbers exactly", async () => {
    await db.exec(rollbackSql);
    await expect(db.exec(rollbackSql)).resolves.toBeDefined(); // idempotent
    const cols = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name='products' AND column_name LIKE '%resolution%'`);
    expect(cols.rows.length).toBe(0);
    expect(await count(db, "cost_price::numeric = 0")).toBe(30);
    expect(await count(db, "cost_price IS NULL")).toBe(1);
    expect(await count(db, "cost_price::numeric > 0")).toBe(113);
  });

  it("fails CLOSED when products is absent", async () => {
    const bare = new PGlite();
    const msg = await errorOf(() => bare.exec(forwardSql));
    expect(msg).toMatch(/products table is missing|does not exist/i);
  });

  it("neither migration file contains a top-level BEGIN/COMMIT", () => {
    for (const sql of [forwardSql, rollbackSql]) {
      const stripped = sql.replace(/^\s*--.*$/gm, "");
      expect(/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(stripped)).toBe(false);
    }
  });
});
