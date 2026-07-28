/**
 * FINANCIAL REALIZATION IMMUTABILITY — real Postgres, no mocks.
 *
 * Replaces a design that froze a line only when its cost snapshot was
 * 'exact'/'verified_zero'. Production has 0 of 114 active products able to
 * produce either status (29 have a known purchase cost, but packaging and
 * insert costs are 'unresolved' catalogue-wide), so that guard protected
 * nothing: price_at_purchase, quantity and total_price were editable on every
 * order in the database.
 *
 * The freeze now depends on the ORDER'S financial state. Every test below is
 * deliberately run with cost statuses that are NOT exact — 'unknown' and
 * 'incomplete' — because that is the real production shape.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { isFinanciallyRealizedOrder } from "../../shared/order-financials";

const migrationSql = readFileSync(
  join(process.cwd(), "migrations/add_order_item_snapshot_immutability.sql"), "utf8");
const rollbackSql = readFileSync(
  join(process.cwd(), "migrations/add_order_item_snapshot_immutability_rollback.sql"), "utf8");
const salePriceSql = readFileSync(
  join(process.cwd(), "migrations/add_order_item_sale_price_snapshot.sql"), "utf8");

const BASE = `
  CREATE TABLE products (
    id text PRIMARY KEY, price numeric, cost_price numeric
  );
  CREATE TABLE orders (
    id text PRIMARY KEY,
    status text NOT NULL DEFAULT 'pending',
    financially_counted boolean,
    total numeric, rounded_total numeric, shipping_cost numeric DEFAULT '0',
    box_cost numeric DEFAULT '0', discount_total numeric DEFAULT '0',
    coupon_id text, points_used integer, cashback_used numeric,
    points_discount numeric, rounding_cashback numeric,
    items jsonb, customer_name text, carrier text, cod_received boolean
  );
  CREATE TABLE order_items_relational (
    id text PRIMARY KEY, order_id text NOT NULL, product_id text NOT NULL,
    quantity integer NOT NULL, price_at_purchase numeric NOT NULL, total_price numeric NOT NULL,
    unit_cost_price numeric, unit_packaging_cost numeric, unit_insert_cost numeric,
    cost_snapshot_status text, cost_snapshot_source text, cost_snapshot_confidence text,
    cost_snapshot_version integer, cost_snapshot_at timestamp, metadata jsonb
  );
`;

/** Seeds one OPEN order and one REALIZED order, both with NON-exact costs. */
const SEED = `
  INSERT INTO products (id, price, cost_price) VALUES ('p1', 20000, 5000);

  INSERT INTO orders (id, status, total, rounded_total, shipping_cost, box_cost,
                      discount_total, items, customer_name)
  VALUES
    ('o-open', 'pending', 25000, 25000, 5000, 0, 0,
      '[{"productId":"p1","quantity":1,"priceAtPurchase":20000}]'::jsonb, 'OPEN'),
    ('o-done', 'delivered', 25000, 25000, 5000, 0, 0,
      '[{"productId":"p1","quantity":1,"priceAtPurchase":20000}]'::jsonb, 'DONE');

  -- UNKNOWN cost on the realized order, INCOMPLETE on the open one:
  -- neither is 'exact', which is the whole point.
  INSERT INTO order_items_relational
    (id, order_id, product_id, quantity, price_at_purchase, total_price,
     unit_cost_price, unit_packaging_cost, unit_insert_cost,
     cost_snapshot_status, cost_snapshot_source)
  VALUES
    ('l-open', 'o-open', 'p1', 1, 20000, 20000, 5000, NULL, NULL, 'incomplete', 'product_current'),
    ('l-done', 'o-done', 'p1', 1, 20000, 20000, NULL, NULL, NULL, 'unknown', 'none');
`;

async function db(): Promise<PGlite> {
  const pg = new PGlite();
  await pg.exec(BASE);
  await pg.exec(salePriceSql);
  await pg.exec(migrationSql);
  await pg.exec(SEED);
  return pg;
}

// ───────────────────────────────────────────────────────────────────────────
describe("the realization rule itself (shared/order-financials.ts)", () => {
  it("freezes delivered orders", () => {
    expect(isFinanciallyRealizedOrder({ status: "delivered" })).toBe(true);
    expect(isFinanciallyRealizedOrder({ status: " Delivered " })).toBe(true);
  });

  it("stays frozen after a return — a return does not un-deliver a sale", () => {
    expect(isFinanciallyRealizedOrder({ status: "returned" })).toBe(true);
    expect(isFinanciallyRealizedOrder({ status: "rejected_returned" })).toBe(true);
  });

  it("leaves open and never-delivered orders editable", () => {
    for (const s of ["pending", "confirmed", "processing", "shipped",
                     "cancelled", "rejected", "rejected_carrier"]) {
      expect(isFinanciallyRealizedOrder({ status: s }), s).toBe(false);
    }
  });

  it("honours an explicit financiallyCounted=true, and ignores false as an unfreeze", () => {
    expect(isFinanciallyRealizedOrder({ status: "pending", financiallyCounted: true })).toBe(true);
    // Excluding an order from revenue is a reporting decision; it does not
    // un-happen the sale, and it is reversible.
    expect(isFinanciallyRealizedOrder({ status: "delivered", financiallyCounted: false })).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("(1) an OPEN order remains fully editable", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  it("allows quantity, price and total to change", async () => {
    await pg.exec(`UPDATE order_items_relational
      SET quantity = 3, price_at_purchase = 21000, total_price = 63000 WHERE id = 'l-open'`);
    const r = await pg.query<{ quantity: number; price_at_purchase: string }>(
      `SELECT quantity, price_at_purchase FROM order_items_relational WHERE id='l-open'`);
    expect(r.rows[0].quantity).toBe(3);
    expect(Number(r.rows[0].price_at_purchase)).toBe(21000);
  });

  it("allows order-level totals to change", async () => {
    await pg.exec(`UPDATE orders SET rounded_total = 30000, shipping_cost = 6000 WHERE id='o-open'`);
    const r = await pg.query<{ rounded_total: string }>(
      `SELECT rounded_total FROM orders WHERE id='o-open'`);
    expect(Number(r.rows[0].rounded_total)).toBe(30000);
  });

  it("(8) a CANCELLED order is still editable", async () => {
    await pg.exec(`UPDATE orders SET status='cancelled' WHERE id='o-open'`);
    await pg.exec(`UPDATE order_items_relational SET price_at_purchase = 1 WHERE id='l-open'`);
    const r = await pg.query<{ price_at_purchase: string }>(
      `SELECT price_at_purchase FROM order_items_relational WHERE id='l-open'`);
    expect(Number(r.rows[0].price_at_purchase)).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("(2,3) a REALIZED order is frozen — with an UNKNOWN cost", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  // l-done has cost_snapshot_status='unknown'. Under the old design this line
  // was completely unprotected.
  const cases: Array<[string, string]> = [
    ["price_at_purchase", `SET price_at_purchase = 999`],
    ["total_price",       `SET total_price = 999`],
    ["quantity",          `SET quantity = 99`],
    ["product_id",        `SET product_id = 'other'`],
    ["unit_cost_price",   `SET unit_cost_price = 6500`],
    ["unit_packaging_cost", `SET unit_packaging_cost = 500`],
    ["unit_insert_cost",  `SET unit_insert_cost = 250`],
    ["cost_snapshot_status", `SET cost_snapshot_status = 'exact'`],
    ["cost_snapshot_source", `SET cost_snapshot_source = 'manual'`],
    ["unit_sale_price_snapshot", `SET unit_sale_price_snapshot = 20000`],
    ["final_unit_sale_price_snapshot", `SET final_unit_sale_price_snapshot = 20000`],
    ["sale_price_source", `SET sale_price_source = 'manual'`],
  ];

  for (const [field, setClause] of cases) {
    it(`refuses to change ${field}`, async () => {
      await expect(
        pg.exec(`UPDATE order_items_relational ${setClause} WHERE id='l-done'`)
      ).rejects.toThrow(/immutable/i);
    });
  }

  it("refuses DELETE of a realized line", async () => {
    await expect(pg.exec(`DELETE FROM order_items_relational WHERE id='l-done'`))
      .rejects.toThrow(/immutable/i);
  });

  it("still allows a NON-financial edit (metadata)", async () => {
    await pg.exec(`UPDATE order_items_relational SET metadata='{"n":1}'::jsonb WHERE id='l-done'`);
    const r = await pg.query(`SELECT metadata FROM order_items_relational WHERE id='l-done'`);
    expect(r.rows[0]).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("(4) protection holds for an INCOMPLETE cost too", () => {
  it("freezes an incomplete-cost line once its order is delivered", async () => {
    const pg = await db();
    await pg.exec(`UPDATE orders SET status='delivered' WHERE id='o-open'`);
    // l-open is 'incomplete' — the most common real production shape.
    await expect(pg.exec(`UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-open'`))
      .rejects.toThrow(/immutable/i);
  });

  it("freezes via financially_counted even while status is pending", async () => {
    const pg = await db();
    await pg.exec(`UPDATE orders SET financially_counted = true WHERE id='o-open'`);
    await expect(pg.exec(`UPDATE order_items_relational SET quantity=9 WHERE id='l-open'`))
      .rejects.toThrow(/immutable/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("(5) catalogue edits never reach a past order", () => {
  it("changing products.price and cost_price leaves the line untouched", async () => {
    const pg = await db();
    await pg.exec(`UPDATE products SET price = 26000, cost_price = 6500 WHERE id='p1'`);
    const r = await pg.query<{ price_at_purchase: string; unit_cost_price: string | null }>(
      `SELECT price_at_purchase, unit_cost_price FROM order_items_relational WHERE id='l-done'`);
    expect(Number(r.rows[0].price_at_purchase)).toBe(20000);
    expect(r.rows[0].unit_cost_price).toBeNull(); // unknown stays unknown
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("(6,7) order-level financial fields are protected", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  const orderFields: Array<[string, string]> = [
    ["items JSONB", `SET items = '[]'::jsonb`],
    ["rounded_total", `SET rounded_total = 1`],
    ["total", `SET total = 1`],
    ["shipping_cost", `SET shipping_cost = 99999`],
    ["box_cost", `SET box_cost = 99999`],
    ["discount_total", `SET discount_total = 99999`],
    ["coupon_id", `SET coupon_id = 'c9'`],
    ["points_discount", `SET points_discount = 500`],
    ["rounding_cashback", `SET rounding_cashback = 500`],
  ];

  for (const [field, setClause] of orderFields) {
    it(`refuses to change orders.${field}`, async () => {
      await expect(pg.exec(`UPDATE orders ${setClause} WHERE id='o-done'`))
        .rejects.toThrow(/immutable/i);
    });
  }

  it("still allows fulfilment facts to change after delivery", async () => {
    // Carrier, COD receipt and status genuinely change post-delivery.
    await pg.exec(`UPDATE orders SET carrier='alsaqr', cod_received=true WHERE id='o-done'`);
    const r = await pg.query<{ carrier: string }>(`SELECT carrier FROM orders WHERE id='o-done'`);
    expect(r.rows[0].carrier).toBe("alsaqr");
  });

  it("cannot be unfrozen by flipping status in the same statement", async () => {
    // Judged on the OLD row, so this cannot launder an edit.
    await expect(
      pg.exec(`UPDATE orders SET status='pending', rounded_total=1 WHERE id='o-done'`)
    ).rejects.toThrow(/immutable/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("(9) a return does not reopen the original sale", () => {
  it("stays frozen after transitioning delivered → returned", async () => {
    const pg = await db();
    await pg.exec(`UPDATE orders SET status='returned' WHERE id='o-done'`);
    await expect(pg.exec(`UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done'`))
      .rejects.toThrow(/immutable/i);
    await expect(pg.exec(`UPDATE orders SET rounded_total=1 WHERE id='o-done'`))
      .rejects.toThrow(/immutable/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("(10) the correction path is the ONLY way through", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  it("a bare session GUC authorizes nothing", async () => {
    // The GUC only names a correction id. Authority comes from an approved row.
    await expect(pg.exec(`
      SET LOCAL aquavo.correction_id = 'CR-1';
      UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done';
    `)).rejects.toThrow(/immutable/i);
  });

  it("an UNAPPROVED correction request is refused", async () => {
    await pg.exec(`INSERT INTO financial_correction_requests
      (correction_id, order_id, order_item_id, table_name, field_name, reason, requested_by)
      VALUES ('CR-2','o-done','l-done','order_items_relational','price_at_purchase','typo','me')`);
    await expect(pg.exec(`
      SET LOCAL aquavo.correction_id = 'CR-2';
      UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done';
    `)).rejects.toThrow(/immutable/i);
  });

  it("an approved request for a DIFFERENT order does not authorize this one", async () => {
    await pg.exec(`INSERT INTO financial_correction_requests
      (correction_id, order_id, table_name, field_name, reason, requested_by, approved_by, approved_at)
      VALUES ('CR-3','o-open','order_items_relational','price_at_purchase','x','me','boss',now())`);
    await expect(pg.exec(`
      SET LOCAL aquavo.correction_id = 'CR-3';
      UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done';
    `)).rejects.toThrow(/immutable/i);
  });

  it("an APPROVED, matching request succeeds and records before/after evidence", async () => {
    await pg.exec(`INSERT INTO financial_correction_requests
      (correction_id, order_id, order_item_id, table_name, field_name, reason,
       requested_by, approved_by, approved_at, evidence_document_id)
      VALUES ('CR-4','o-done','l-done','order_items_relational','price_at_purchase',
              'supplier invoice proves 19000','data-reviewer','accountant',now(),'DOC-1')`);
    await pg.exec(`
      SET LOCAL aquavo.correction_id = 'CR-4';
      UPDATE order_items_relational SET price_at_purchase=19000 WHERE id='l-done';
    `);
    const ev = await pg.query<{ correction_id: string; before_row: { price_at_purchase: string } }>(
      `SELECT correction_id, before_row FROM financial_correction_audit`);
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0].correction_id).toBe("CR-4");
    // The ORIGINAL value survives — §11 "احتفظ بالرقم السابق".
    expect(Number(ev.rows[0].before_row.price_at_purchase)).toBe(20000);
  });

  it("authorization does not leak into a later transaction", async () => {
    await pg.exec(`INSERT INTO financial_correction_requests
      (correction_id, order_id, table_name, field_name, reason, requested_by, approved_by, approved_at)
      VALUES ('CR-5','o-done','order_items_relational','price_at_purchase','x','me','boss',now())`);
    await pg.exec(`
      SET LOCAL aquavo.correction_id = 'CR-5';
      UPDATE order_items_relational SET price_at_purchase=18000 WHERE id='l-done';
    `);
    await expect(pg.exec(`UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done'`))
      .rejects.toThrow(/immutable/i);
  });

  it("a correction request cannot be recorded without a reason", async () => {
    await expect(pg.exec(`INSERT INTO financial_correction_requests
      (correction_id, order_id, table_name, field_name, reason, requested_by)
      VALUES ('CR-6','o-done','orders','total','   ','me')`)).rejects.toThrow();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("migration hygiene", () => {
  it("is idempotent and rolls back cleanly", async () => {
    const pg = await db();
    await pg.exec(migrationSql);           // second apply
    await pg.exec(rollbackSql);
    const t = await pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_trigger WHERE NOT tgisinternal
       AND tgname IN ('order_item_financial_history_immutable','order_financial_history_immutable')`);
    expect(t.rows[0].n).toBe(0);
    // Evidence tables survive a rollback.
    const e = await pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM information_schema.tables
       WHERE table_name='financial_correction_requests'`);
    expect(e.rows[0].n).toBe(1);
  });

  it("freezing does NOT branch on cost status", () => {
    // Guard against regressing to the original design, which early-returned via
    //   IF COALESCE(OLD.cost_snapshot_status,'') NOT IN ('exact','verified_zero')
    // and therefore protected nothing on real production data.
    //
    // Narrow on purpose: the migration legitimately mentions
    // cost_snapshot_status in the CHECK vocabulary (the M-5 fix) and in the
    // frozen-columns list. What must never come back is a GUARD BRANCH keyed on
    // the OLD row's cost status.
    expect(migrationSql).not.toMatch(/OLD\.cost_snapshot_status\s*,?\s*''\s*\)?\s*NOT\s+IN/i);
    expect(migrationSql).not.toMatch(/COALESCE\(\s*OLD\.cost_snapshot_status/i);
    // ...and the realization predicate must be what decides.
    expect(migrationSql).toContain("is_financially_realized_order");
  });
});
