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
import { isFinanciallyRealizedOrder, POST_DELIVERY_STATUSES } from "../../shared/order-financials";
import { COD_REFUSAL_STATUSES } from "../../shared/cod-refusal-policy";

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

/**
 * Seeds one OPEN order and one REALIZED order, both with NON-exact costs.
 *
 * Follows the real lifecycle: both orders are created 'pending', their lines
 * are written, and only then is one delivered. Seeding a delivered order and
 * THEN inserting its lines is now (correctly) refused by the INSERT guard —
 * which is exactly the hole this revision closes.
 */
const SEED = `
  INSERT INTO products (id, price, cost_price) VALUES ('p1', 20000, 5000);

  INSERT INTO orders (id, status, total, rounded_total, shipping_cost, box_cost,
                      discount_total, items, customer_name)
  VALUES
    ('o-open', 'pending', 25000, 25000, 5000, 0, 0,
      '[{"productId":"p1","quantity":1,"priceAtPurchase":20000}]'::jsonb, 'OPEN'),
    ('o-done', 'pending', 25000, 25000, 5000, 0, 0,
      '[{"productId":"p1","quantity":1,"priceAtPurchase":20000}]'::jsonb, 'DONE');

  -- UNKNOWN cost on the order that will be realized, INCOMPLETE on the open
  -- one: neither is 'exact', which is the whole point.
  INSERT INTO order_items_relational
    (id, order_id, product_id, quantity, price_at_purchase, total_price,
     unit_cost_price, unit_packaging_cost, unit_insert_cost,
     cost_snapshot_status, cost_snapshot_source)
  VALUES
    ('l-open', 'o-open', 'p1', 1, 20000, 20000, 5000, NULL, NULL, 'incomplete', 'product_current'),
    ('l-done', 'o-done', 'p1', 1, 20000, 20000, NULL, NULL, NULL, 'unknown', 'none');

  -- pending -> delivered is a legitimate forward transition and freezes the order.
  UPDATE orders SET status = 'delivered' WHERE id = 'o-done';
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
  });

  // Owner-approved policy, 2026-08-04 (docs/accounting/COD-REFUSAL-AND-EXCHANGE-POLICY-20260804.md,
  // shipped in #43): a COD refusal happens BEFORE the customer accepts the parcel, so it never
  // realises a sale. `rejected_returned` is a refusal, not a post-delivery return, and must stay
  // correctable — freezing it would fabricate realised revenue out of a sale that never happened.
  it("never freezes a COD refusal — a refusal is not a post-delivery return", () => {
    for (const s of COD_REFUSAL_STATUSES) {
      expect(isFinanciallyRealizedOrder({ status: s }), s).toBe(false);
    }
    expect(POST_DELIVERY_STATUSES).not.toContain("rejected_returned");
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
      ).rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
    });
  }

  it("refuses DELETE of a realized line", async () => {
    await expect(pg.exec(`DELETE FROM order_items_relational WHERE id='l-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
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
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("freezes via financially_counted even while status is pending", async () => {
    const pg = await db();
    await pg.exec(`UPDATE orders SET financially_counted = true WHERE id='o-open'`);
    await expect(pg.exec(`UPDATE order_items_relational SET quantity=9 WHERE id='l-open'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
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
        .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
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
    ).rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("(9) a return does not reopen the original sale", () => {
  it("stays frozen after transitioning delivered → returned", async () => {
    const pg = await db();
    await pg.exec(`UPDATE orders SET status='returned' WHERE id='o-done'`);
    await expect(pg.exec(`UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
    await expect(pg.exec(`UPDATE orders SET rounded_total=1 WHERE id='o-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("(10) PHASE 1A HAS NO BYPASS — nothing unlocks a realized order", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  it("a session GUC unlocks nothing", async () => {
    await expect(pg.exec(`
      SET LOCAL aquavo.correction_id = 'CR-1';
      UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done';
    `)).rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("an APPROVED correction row still unlocks nothing", async () => {
    // The previous design accepted this. Withdrawn because the workflow never
    // stamped applied_at, never checked field/old/new against the actual
    // change, and could be replayed — so one approved request authorized any
    // field, to any value, any number of times.
    await pg.exec(`INSERT INTO financial_correction_requests
      (correction_id, order_id, order_item_id, table_name, field_name, old_value, new_value,
       reason, requested_by, approved_by, approved_at)
      VALUES ('CR-2','o-done','l-done','order_items_relational','price_at_purchase','20000','19000',
              'supplier invoice','data-reviewer','accountant',now())`);
    await expect(pg.exec(`
      SET LOCAL aquavo.correction_id = 'CR-2';
      UPDATE order_items_relational SET price_at_purchase=19000 WHERE id='l-done';
    `)).rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("the guard functions read no session setting at all", async () => {
    const r = await pg.query<{ n: number }>(`
      SELECT count(*)::int AS n FROM pg_proc
      WHERE proname IN ('guard_order_item_financial_history','guard_order_financial_history')
        AND prosrc ILIKE '%current_setting%'`);
    expect(r.rows[0].n).toBe(0);
  });

  it("a request cannot be self-approved", async () => {
    await expect(pg.exec(`INSERT INTO financial_correction_requests
      (correction_id, order_id, table_name, field_name, reason, requested_by, approved_by, approved_at)
      VALUES ('CR-3','o-done','orders','total','x','same','same',now())`)).rejects.toThrow();
  });

  it("correction audit rows cannot be updated or deleted", async () => {
    await pg.exec(`INSERT INTO financial_correction_audit
      (correction_id, table_name, row_id, operation, before_row)
      VALUES ('CR-4','orders','o-done','update','{}'::jsonb)`);
    await expect(pg.exec(`UPDATE financial_correction_audit SET row_id='x'`))
      .rejects.toThrow(/append-only/i);
    await expect(pg.exec(`DELETE FROM financial_correction_audit`))
      .rejects.toThrow(/append-only/i);
  });

  it("correction requests cannot be deleted", async () => {
    await pg.exec(`INSERT INTO financial_correction_requests
      (correction_id, order_id, table_name, field_name, reason, requested_by)
      VALUES ('CR-5','o-done','orders','total','x','me')`);
    await expect(pg.exec(`DELETE FROM financial_correction_requests`))
      .rejects.toThrow(/append-only/i);
  });
});

describe("ATTACK 1 — unfreeze then edit", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  for (const [label, stmt] of [
    ["delivered -> pending",   `UPDATE orders SET status='pending' WHERE id='o-done'`],
    ["delivered -> confirmed", `UPDATE orders SET status='confirmed' WHERE id='o-done'`],
    ["delivered -> cancelled", `UPDATE orders SET status='cancelled' WHERE id='o-done'`],
  ] as Array<[string, string]>) {
    it(`refuses ${label}`, async () => {
      await expect(pg.exec(stmt)).rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
    });
  }

  it("refuses returned -> processing", async () => {
    await pg.exec(`UPDATE orders SET status='returned' WHERE id='o-done'`);
    await expect(pg.exec(`UPDATE orders SET status='processing' WHERE id='o-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("refuses rejected_returned -> pending", async () => {
    await pg.exec(`UPDATE orders SET status='rejected_returned' WHERE id='o-done'`);
    await expect(pg.exec(`UPDATE orders SET status='pending' WHERE id='o-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("refuses financially_counted true -> false when it was the reason", async () => {
    await pg.exec(`UPDATE orders SET financially_counted=true WHERE id='o-open'`);
    await expect(pg.exec(`UPDATE orders SET financially_counted=false WHERE id='o-open'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("ALLOWS delivered -> returned (both states remain realized)", async () => {
    await pg.exec(`UPDATE orders SET status='returned' WHERE id='o-done'`);
    const r = await pg.query<{ status: string }>(`SELECT status FROM orders WHERE id='o-done'`);
    expect(r.rows[0].status).toBe("returned");
  });

  it("carrier / cod_received do not unfreeze anything", async () => {
    await pg.exec(`UPDATE orders SET carrier='x', cod_received=true WHERE id='o-done'`);
    await expect(pg.exec(`UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("the two-step attack fails atomically and changes nothing", async () => {
    await expect(pg.exec(`
      UPDATE orders SET status='pending' WHERE id='o-done';
      UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done';
    `)).rejects.toThrow();
    const r = await pg.query<{ status: string; price_at_purchase: string }>(
      `SELECT o.status, oi.price_at_purchase FROM orders o
       JOIN order_items_relational oi ON oi.order_id=o.id WHERE o.id='o-done'`);
    expect(r.rows[0].status).toBe("delivered");
    expect(Number(r.rows[0].price_at_purchase)).toBe(20000);
  });
});

describe("ATTACK 2 — INSERT a line into a realized order", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  const insertLine = (orderId: string, id: string) => `
    INSERT INTO order_items_relational
      (id, order_id, product_id, quantity, price_at_purchase, total_price, cost_snapshot_status)
    VALUES ('${id}', '${orderId}', 'p1', 5, 99999, 499995, 'unknown')`;

  it("ALLOWS a line on a pending order", async () => {
    await pg.exec(insertLine("o-open", "new-open"));
    const r = await pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM order_items_relational WHERE id='new-open'`);
    expect(r.rows[0].n).toBe(1);
  });

  it("REFUSES a line on a delivered order", async () => {
    await expect(pg.exec(insertLine("o-done", "new-done")))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("REFUSES a line on a returned order", async () => {
    await pg.exec(`UPDATE orders SET status='returned' WHERE id='o-done'`);
    await expect(pg.exec(insertLine("o-done", "new-ret")))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("REFUSES a line on a financially_counted order", async () => {
    await pg.exec(`UPDATE orders SET financially_counted=true WHERE id='o-open'`);
    await expect(pg.exec(insertLine("o-open", "new-fc")))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("a refused INSERT leaves no partial row and no totals change", async () => {
    const before = await pg.query<{ n: number; total: string }>(
      `SELECT (SELECT count(*)::int FROM order_items_relational) AS n,
              (SELECT rounded_total FROM orders WHERE id='o-done') AS total`);
    await expect(pg.exec(insertLine("o-done", "ghost"))).rejects.toThrow();
    const after = await pg.query<{ n: number; total: string }>(
      `SELECT (SELECT count(*)::int FROM order_items_relational) AS n,
              (SELECT rounded_total FROM orders WHERE id='o-done') AS total`);
    expect(after.rows[0].n).toBe(before.rows[0].n);
    expect(after.rows[0].total).toBe(before.rows[0].total);
  });

  it("re-parenting an open line onto a realized order is refused", async () => {
    await expect(pg.exec(`UPDATE order_items_relational SET order_id='o-done' WHERE id='l-open'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });
});

describe("ATTACK 3 — delete realized data", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  it("REFUSES DELETE of a delivered order", async () => {
    await expect(pg.exec(`DELETE FROM orders WHERE id='o-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("REFUSES DELETE of a returned order", async () => {
    await pg.exec(`UPDATE orders SET status='returned' WHERE id='o-done'`);
    await expect(pg.exec(`DELETE FROM orders WHERE id='o-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("REFUSES DELETE of a realized order LINE", async () => {
    await expect(pg.exec(`DELETE FROM order_items_relational WHERE id='l-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("no delete path erases the financial evidence", async () => {
    await expect(pg.exec(`DELETE FROM orders`)).rejects.toThrow();
    const r = await pg.query<{ orders: number; lines: number }>(
      `SELECT (SELECT count(*)::int FROM orders) AS orders,
              (SELECT count(*)::int FROM order_items_relational) AS lines`);
    expect(r.rows[0].orders).toBe(2);
    expect(r.rows[0].lines).toBe(2);
  });

  it("ALLOWS deleting an open order (normal behaviour preserved)", async () => {
    await pg.exec(`DELETE FROM order_items_relational WHERE id='l-open'`);
    await pg.exec(`DELETE FROM orders WHERE id='o-open'`);
    const r = await pg.query<{ n: number }>(`SELECT count(*)::int AS n FROM orders`);
    expect(r.rows[0].n).toBe(1);
  });
});

describe("ATTACK 4 — edit with non-exact cost", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  it("price_at_purchase frozen with cost_snapshot_status='unknown'", async () => {
    await expect(pg.exec(`UPDATE order_items_relational SET price_at_purchase=1 WHERE id='l-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("total_price frozen with cost_snapshot_status='incomplete'", async () => {
    await pg.exec(`UPDATE orders SET status='delivered' WHERE id='o-open'`);
    await expect(pg.exec(`UPDATE order_items_relational SET total_price=1 WHERE id='l-open'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("orders.items cannot be rewritten after a failed unfreeze", async () => {
    await expect(pg.exec(`UPDATE orders SET status='pending' WHERE id='o-done'`)).rejects.toThrow();
    await expect(pg.exec(`UPDATE orders SET items='[]'::jsonb WHERE id='o-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LIFECYCLE — separate from the money.
//
// financially_counted=true keeps an order "realized" whatever status it is
// given, and 39 of 43 production orders carry that flag. So the money rule
// alone would have permitted delivered -> pending: amounts frozen, but the
// order back in the open pipeline, eligible for a second shipment, a second
// stock deduction, or a duplicate notification.
// ═══════════════════════════════════════════════════════════════════════════

describe("LIFECYCLE — delivery is terminal, even with financially_counted=true", () => {
  let pg: PGlite;
  beforeEach(async () => {
    pg = await db();
    // The exact production shape: delivered AND explicitly counted.
    await pg.exec(`UPDATE orders SET financially_counted=true WHERE id='o-done'`);
  });

  for (const target of ["pending", "confirmed", "processing", "shipped",
                        "cancelled", "rejected", "rejected_carrier"]) {
    it(`refuses delivered + financially_counted=true -> ${target}`, async () => {
      await expect(pg.exec(`UPDATE orders SET status='${target}' WHERE id='o-done'`))
        .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
    });
  }

  it("ALLOWS delivered -> returned", async () => {
    await pg.exec(`UPDATE orders SET status='returned' WHERE id='o-done'`);
    const r = await pg.query<{ status: string }>(`SELECT status FROM orders WHERE id='o-done'`);
    expect(r.rows[0].status).toBe("returned");
  });

  it("ALLOWS delivered -> rejected_returned", async () => {
    await pg.exec(`UPDATE orders SET status='rejected_returned' WHERE id='o-done'`);
    const r = await pg.query<{ status: string }>(`SELECT status FROM orders WHERE id='o-done'`);
    expect(r.rows[0].status).toBe("rejected_returned");
  });

  it("refuses returned -> pending", async () => {
    await pg.exec(`UPDATE orders SET status='returned' WHERE id='o-done'`);
    await expect(pg.exec(`UPDATE orders SET status='pending' WHERE id='o-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("refuses returned -> delivered (a return is not reversible)", async () => {
    await pg.exec(`UPDATE orders SET status='returned' WHERE id='o-done'`);
    await expect(pg.exec(`UPDATE orders SET status='delivered' WHERE id='o-done'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("ALLOWS carrier alone", async () => {
    await pg.exec(`UPDATE orders SET carrier='alsaqr' WHERE id='o-done'`);
    const r = await pg.query<{ carrier: string }>(`SELECT carrier FROM orders WHERE id='o-done'`);
    expect(r.rows[0].carrier).toBe("alsaqr");
  });

  it("ALLOWS cod_received alone", async () => {
    await pg.exec(`UPDATE orders SET cod_received=true WHERE id='o-done'`);
    const r = await pg.query<{ cod_received: boolean }>(
      `SELECT cod_received FROM orders WHERE id='o-done'`);
    expect(r.rows[0].cod_received).toBe(true);
  });

  it("after a refused transition, status, money and lines are unchanged", async () => {
    const before = await pg.query<Record<string, unknown>>(
      `SELECT o.status, o.rounded_total, oi.price_at_purchase, oi.quantity
       FROM orders o JOIN order_items_relational oi ON oi.order_id=o.id WHERE o.id='o-done'`);
    await expect(pg.exec(`UPDATE orders SET status='processing' WHERE id='o-done'`)).rejects.toThrow();
    const after = await pg.query<Record<string, unknown>>(
      `SELECT o.status, o.rounded_total, oi.price_at_purchase, oi.quantity
       FROM orders o JOIN order_items_relational oi ON oi.order_id=o.id WHERE o.id='o-done'`);
    expect(after.rows[0]).toEqual(before.rows[0]);
  });
});

describe("LIFECYCLE — an order cannot be CREATED already realized", () => {
  let pg: PGlite;
  beforeEach(async () => { pg = await db(); });

  const mkOrder = (id: string, status: string, fc: string) => `
    INSERT INTO orders (id, status, financially_counted, total, rounded_total,
                        shipping_cost, box_cost, discount_total, items, customer_name)
    VALUES ('${id}', '${status}', ${fc}, 25000, 25000, 5000, 0, 0,
            '[{"productId":"p1","quantity":1,"priceAtPurchase":20000}]'::jsonb, 'X')`;

  it("ALLOWS creating a pending order", async () => {
    await pg.exec(mkOrder("n-open", "pending", "NULL"));
    const r = await pg.query<{ n: number }>(`SELECT count(*)::int AS n FROM orders WHERE id='n-open'`);
    expect(r.rows[0].n).toBe(1);
  });

  it("REFUSES creating a delivered order", async () => {
    await expect(pg.exec(mkOrder("n-del", "delivered", "NULL")))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("REFUSES creating a returned order", async () => {
    await expect(pg.exec(mkOrder("n-ret", "returned", "NULL")))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("REFUSES creating a pending order with financially_counted=true", async () => {
    await expect(pg.exec(mkOrder("n-fc", "pending", "true")))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });

  it("a refused order INSERT leaves no order and no lines", async () => {
    const before = await pg.query<{ o: number; l: number }>(
      `SELECT (SELECT count(*)::int FROM orders) o, (SELECT count(*)::int FROM order_items_relational) l`);
    await expect(pg.exec(mkOrder("ghost", "delivered", "true"))).rejects.toThrow();
    const after = await pg.query<{ o: number; l: number }>(
      `SELECT (SELECT count(*)::int FROM orders) o, (SELECT count(*)::int FROM order_items_relational) l`);
    expect(after.rows[0]).toEqual(before.rows[0]);
  });

  it("the create-open-then-deliver sequence works — the real order lifecycle", async () => {
    // This is what the website and manual-invoice paths do, so they are
    // unaffected by the INSERT guard.
    await pg.exec(mkOrder("n-flow", "pending", "NULL"));
    await pg.exec(`INSERT INTO order_items_relational
      (id, order_id, product_id, quantity, price_at_purchase, total_price, cost_snapshot_status)
      VALUES ('n-flow-l', 'n-flow', 'p1', 1, 20000, 20000, 'unknown')`);
    await pg.exec(`UPDATE orders SET status='delivered' WHERE id='n-flow'`);
    // ...and it is frozen from that point on.
    await expect(pg.exec(`UPDATE order_items_relational SET price_at_purchase=1 WHERE id='n-flow-l'`))
      .rejects.toThrow(/FINANCIAL_CORRECTION_WORKFLOW_NOT_IMPLEMENTED/);
  });
});

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
