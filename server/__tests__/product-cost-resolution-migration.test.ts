import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * F-5 — migrations/add_product_cost_resolution.sql on a real Postgres engine.
 *
 * FIXTURE = VERIFIED PRODUCTION SHAPE (read-only audit 2026-07-24, project
 * shiny-tree-43710630, branch br-patient-mouse-a4d4cgr4):
 *   114 total products · 114 active (deleted_at IS NULL) · 0 soft-deleted
 *   113 active with cost_price > 0
 *     1 active with cost_price = 0  (houyi-mountain-wood, stock = 0)
 *     0 active IN-STOCK products with cost_price = 0
 *   114/114 active with packaging_cost = 0 AND insert_cost = 0
 *
 * An earlier revision of this fixture encoded "30 zero-cost products / 143
 * products", copied from the CONTAMINATED verification branch — a branch that
 * still held 29 soft-deleted zero-cost rows and was counted WITHOUT a
 * `deleted_at IS NULL` filter. 29 deleted + 1 active = the false 30, and the 27
 * "orderable" figure came from re-filtering that same unfiltered set on the
 * STALE `products.stock` left behind on the deleted rows. Those 29 rows were
 * permanently removed from production on 2026-07-24 (backup branch
 * br-summer-dawn-a45g2zi5) after they were proved to have zero order-line,
 * inventory-movement, goods-receipt, purchase-order and supplier references.
 *
 * The fixture below therefore keeps a soft-deleted zero-cost row WITH positive
 * stale stock, purely so the tests can prove the two counting mistakes are
 * caught rather than silently repeated.
 */

const ROOT = process.cwd();
const forwardSql = readFileSync(join(ROOT, "migrations/add_product_cost_resolution.sql"), "utf8");
const rollbackSql = readFileSync(join(ROOT, "migrations/add_product_cost_resolution_rollback.sql"), "utf8");

const BASE = `
CREATE TABLE products (
  id text PRIMARY KEY, name text NOT NULL, price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  cost_price numeric DEFAULT '0',
  packaging_cost numeric DEFAULT '0',
  insert_cost numeric DEFAULT '0'
);
-- 113 ACTIVE products with a positive (known) cost, all with zero packaging/insert
INSERT INTO products (id, name, price, stock, cost_price, packaging_cost, insert_cost)
SELECT 'k'||g, 'known '||g, 1000, 5, 500+g, 0, 0 FROM generate_series(1,113) g;
-- the ONE active zero-cost product — out of stock, so not orderable
INSERT INTO products (id, name, price, stock, cost_price, packaging_cost, insert_cost)
VALUES ('houyi-mountain-wood','خشب الجبل الطبيعي',5000,0,0,0,0);
-- a SOFT-DELETED zero-cost row carrying STALE positive stock. This is the exact
-- shape that produced the false "27 orderable zero-cost products" claim.
INSERT INTO products (id, name, price, stock, deleted_at, cost_price, packaging_cost, insert_cost)
VALUES ('deleted-zero-1','deleted zero',1000,7,now(),0,0,0);
`;

/** Count restricted to LIVE rows — the only correct grain for an availability question. */
async function countActive(db: PGlite, where: string): Promise<number> {
  return count(db, `deleted_at IS NULL AND (${where})`);
}

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

  it("baseline reproduces the VERIFIED production shape", async () => {
    expect(await countActive(db, "true")).toBe(114);                      // active
    expect(await count(db, "deleted_at IS NOT NULL")).toBe(1);            // soft-deleted
    expect(await countActive(db, "cost_price::numeric > 0")).toBe(113);   // positive cost
    expect(await countActive(db, "cost_price::numeric = 0")).toBe(1);     // the ONE ambiguous zero
    expect(await countActive(db, "cost_price IS NULL")).toBe(0);
    expect(await countActive(db, "packaging_cost::numeric = 0")).toBe(114);
    expect(await countActive(db, "insert_cost::numeric = 0")).toBe(114);
  });

  it("NO active in-stock product has a zero cost — there is no live COGS exposure", async () => {
    expect(await countActive(db, "cost_price::numeric = 0 AND stock > 0")).toBe(0);
  });

  it("REPRODUCES THE FALSE COUNT: dropping `deleted_at IS NULL` inflates it", async () => {
    // The correct, live-grain answer.
    expect(await countActive(db, "cost_price::numeric = 0")).toBe(1);
    // The bug: the same question asked WITHOUT the soft-delete filter counts
    // rows that no longer exist as products at all.
    expect(await count(db, "cost_price::numeric = 0")).toBe(2);
    // And "orderable" measured on the STALE stock of a deleted row invents
    // availability for something that can never be sold.
    expect(await count(db, "cost_price::numeric = 0 AND stock > 0")).toBe(1);
    expect(await countActive(db, "cost_price::numeric = 0 AND stock > 0")).toBe(0);
  });

  it("applies, and is idempotent on a second apply", async () => {
    await db.exec(forwardSql);
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
  });

  it("DOES NOT SILENTLY REINTERPRET EXISTING ZEROS — every ambiguous zero stays unresolved", async () => {
    expect(await count(db, "cost_price_resolution = 'verified_zero'")).toBe(0);
    expect(await count(db, "packaging_cost_resolution = 'verified_zero'")).toBe(0);
    expect(await count(db, "insert_cost_resolution = 'verified_zero'")).toBe(0);
    // the ONE active ambiguous zero + the soft-deleted one are unresolved
    expect(await countActive(db, "cost_price_resolution = 'unresolved'")).toBe(1);
    expect(await count(db, "cost_price_resolution = 'unresolved'")).toBe(2);
    // every packaging/insert zero is unresolved too — all 114 active products
    expect(await countActive(db, "packaging_cost_resolution = 'unresolved'")).toBe(114);
    expect(await countActive(db, "insert_cost_resolution = 'unresolved'")).toBe(114);
  });

  it("classifies ONLY where evidence exists: a positive cost is 'known'", async () => {
    expect(await countActive(db, "cost_price_resolution = 'known'")).toBe(113);
    expect(await count(db, "cost_price_resolution = 'known' AND cost_price::numeric <= 0")).toBe(0);
  });

  it("leaves the stored NUMBERS untouched — nothing was rewritten", async () => {
    expect(await countActive(db, "cost_price IS NULL")).toBe(0);
    expect(await countActive(db, "cost_price::numeric = 0")).toBe(1);
    expect(await countActive(db, "cost_price::numeric > 0")).toBe(113);
    expect(await countActive(db, "packaging_cost::numeric = 0")).toBe(114);
  });

  it("rejects an unknown resolution word", async () => {
    const msg = await errorOf(() => db.exec(
      `UPDATE products SET cost_price_resolution='probably_zero' WHERE id='houyi-mountain-wood'`));
    expect(msg).toMatch(/products_cost_resolution_chk|violates check/i);
  });

  it("a verified_zero claim REQUIRES recorded evidence", async () => {
    const msg = await errorOf(() => db.exec(
      `UPDATE products SET cost_price_resolution='verified_zero' WHERE id='houyi-mountain-wood'`));
    expect(msg).toMatch(/products_verified_zero_evidence_chk|violates check/i);

    await expect(db.exec(
      `UPDATE products SET cost_price_resolution='verified_zero',
        cost_resolution_note='supplier freebie, invoice INV-9', cost_resolution_by='admin',
        cost_resolution_at=now() WHERE id='houyi-mountain-wood'`)).resolves.toBeDefined();
    expect(await count(db, "cost_price_resolution = 'verified_zero'")).toBe(1);
  });

  it("rollback removes every added object and restores the numbers exactly", async () => {
    await db.exec(rollbackSql);
    await expect(db.exec(rollbackSql)).resolves.toBeDefined(); // idempotent
    const cols = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name='products' AND column_name LIKE '%resolution%'`);
    expect(cols.rows.length).toBe(0);
    expect(await countActive(db, "cost_price::numeric = 0")).toBe(1);
    expect(await countActive(db, "cost_price IS NULL")).toBe(0);
    expect(await countActive(db, "cost_price::numeric > 0")).toBe(113);
    expect(await count(db, "true")).toBe(115); // 114 active + 1 soft-deleted, none lost
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
