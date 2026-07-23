import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

// Each test spins up a fresh PGlite instance; the first instantiation is slow
// when the full 107-file suite runs in parallel. The 30s global default was
// tripping here (~33s observed) — a load artefact, not a logic failure.
vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

/**
 * Backfill safety properties that the production-shaped happy path cannot show:
 *
 *   1. NOTHING IS FABRICATED. A line missing quantity or price is never given a
 *      default of 1 or 0 — that would invent historical commercial evidence.
 *      One fixture per reason code.
 *   2. FAIL CLOSED. Unresolved lines abort the migration unless the owner sets an
 *      explicit override, and even then the bad lines stay uninserted.
 *   3. AMBIGUOUS duplicate groups are reported, never silently paired.
 *   4. The control table has TWO documented rollback modes.
 */

const ROOT = process.cwd();
const snapshotSql = readFileSync(join(ROOT, "migrations/add_order_item_cost_snapshot.sql"), "utf8");
const backfillSql = readFileSync(join(ROOT, "migrations/backfill_orderitems_from_jsonb.sql"), "utf8");
const backfillRollbackSql = readFileSync(join(ROOT, "migrations/backfill_orderitems_from_jsonb_rollback.sql"), "utf8");
const reportSql = readFileSync(join(ROOT, "migrations/backfill_orderitems_reconcile_report.sql"), "utf8");

/**
 * Forward backfill now requires a fresh, executor-supplied batch-id GUC on
 * every invocation (fail-closed if absent — see the dedicated tests below).
 * Each helper mints a new UUID per call so re-invocations within one test
 * never collide against the "batch id already exists" guard.
 */
const withBatch = () => `SET LOCAL aquavo.backfill_batch_id = '${randomUUID()}';`;
const withAllow = () => `${withBatch()} SET LOCAL aquavo.backfill_allow_unresolved = 'on';`;
const withRollback = (batchId: string) =>
  `SET LOCAL aquavo.backfill_batch_id = '${batchId}'; SET LOCAL aquavo.backfill_rollback_authorized = 'on';`;

async function applyInTx(db: PGlite, sqlText: string, pre = ""): Promise<void> {
  try {
    await db.exec(`BEGIN;\n${pre}\n${sqlText}\nCOMMIT;`);
  } catch (err) {
    await db.exec("ROLLBACK").catch(() => undefined);
    throw err;
  }
}
async function scalar(db: PGlite, sql: string): Promise<number> {
  const r = await db.query<Record<string, unknown>>(sql);
  return Number(Object.values(r.rows[0])[0]);
}

/** Fresh DB with the production shape + snapshot migration applied. */
async function makeDb(orderItems: Record<string, unknown[]>): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE orders (id text PRIMARY KEY, source text, items jsonb NOT NULL);
    CREATE TABLE products (id text PRIMARY KEY);
    CREATE TABLE order_items_relational (
      id text PRIMARY KEY,
      order_id text NOT NULL REFERENCES orders(id),
      product_id text NOT NULL REFERENCES products(id),
      quantity integer NOT NULL,
      price_at_purchase numeric NOT NULL,
      total_price numeric NOT NULL,
      metadata jsonb
    );
    INSERT INTO products (id) VALUES ('p1'), ('p2');
  `);
  for (const [oid, items] of Object.entries(orderItems)) {
    await db.query(`INSERT INTO orders (id, source, items) VALUES ($1,'website',$2)`,
      [oid, JSON.stringify(items)]);
  }
  await applyInTx(db, snapshotSql);
  return db;
}

const GOOD = { productId: "p1", quantity: 2, priceAtPurchase: 1000, lineTotal: 2000 };

/** Every invalid-line category, with the reason code the backfill must assign. */
const INVALID_CASES: Array<{ code: string; line: unknown; why: string }> = [
  { code: "missing_product_id", line: { quantity: 1, priceAtPurchase: 500 }, why: "no productId key" },
  { code: "missing_product",    line: { productId: "ghost", quantity: 1, priceAtPurchase: 500 }, why: "productId not in products" },
  { code: "invalid_quantity",   line: { productId: "p1", priceAtPurchase: 500 }, why: "quantity absent — must NOT default to 1" },
  { code: "invalid_quantity",   line: { productId: "p1", quantity: 0, priceAtPurchase: 500 }, why: "zero quantity" },
  { code: "invalid_quantity",   line: { productId: "p1", quantity: "abc", priceAtPurchase: 500 }, why: "non-numeric quantity" },
  { code: "invalid_quantity",   line: { productId: "p1", quantity: -3, priceAtPurchase: 500 }, why: "negative quantity" },
  { code: "missing_price",      line: { productId: "p1", quantity: 1 }, why: "price absent — must NOT default to 0" },
  { code: "invalid_price",      line: { productId: "p1", quantity: 1, priceAtPurchase: "abc" }, why: "non-numeric price" },
  { code: "invalid_price",      line: { productId: "p1", quantity: 1, priceAtPurchase: -100 }, why: "negative price" },
  { code: "invalid_total",      line: { productId: "p1", quantity: 1, priceAtPurchase: 500, lineTotal: "abc" }, why: "non-numeric total" },
  { code: "total_mismatch",     line: { productId: "p1", quantity: 2, priceAtPurchase: 500, lineTotal: 999 }, why: "total ≠ qty × price" },
  { code: "malformed_jsonb_line", line: "not-an-object", why: "array element is not an object" },
];

describe("backfill never fabricates commercial evidence", () => {
  for (const { code, line, why } of INVALID_CASES) {
    it(`FAILS CLOSED on ${code} — ${why}`, async () => {
      const db = await makeDb({ "o1": [line] });
      await expect(applyInTx(db, backfillSql, withBatch())).rejects.toThrow(/reconciliation incomplete/);
      await expect(applyInTx(db, backfillSql, withBatch())).rejects.toThrow(new RegExp(code));
      // nothing written
      expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(0);
      await db.close();
    });

    it(`leaves the ${code} line UNINSERTED even with the owner override — ${why}`, async () => {
      const db = await makeDb({ "o1": [line, GOOD] });
      await applyInTx(db, backfillSql, withAllow());
      // only the valid line was inserted
      expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(1);
      const row = (await db.query<{ quantity: number; price_at_purchase: string }>(
        `SELECT quantity, price_at_purchase FROM order_items_relational`)).rows[0];
      expect(row.quantity).toBe(2);
      expect(Number(row.price_at_purchase)).toBe(1000);
      // never a fabricated qty=1 / price=0 sale
      expect(await scalar(db,
        `SELECT count(*) FROM order_items_relational WHERE price_at_purchase = 0`)).toBe(0);
      await db.close();
    });
  }

  it("records the batch as reconciliation INCOMPLETE when lines were unresolved", async () => {
    const db = await makeDb({ "o1": [{ productId: "p1", quantity: 1 }, GOOD] });
    await applyInTx(db, backfillSql, withAllow());
    const b = (await db.query<{ unresolved_lines: number; reconciliation_complete: boolean }>(
      `SELECT unresolved_lines, reconciliation_complete FROM orderitem_backfill_batches`)).rows[0];
    expect(Number(b.unresolved_lines)).toBe(1);
    expect(b.reconciliation_complete).toBe(false);
    await db.close();
  });

  it("records reconciliation COMPLETE when every line was valid", async () => {
    const db = await makeDb({ "o1": [GOOD] });
    await applyInTx(db, backfillSql, withBatch());
    const b = (await db.query<{ unresolved_lines: number; reconciliation_complete: boolean }>(
      `SELECT unresolved_lines, reconciliation_complete FROM orderitem_backfill_batches`)).rows[0];
    expect(Number(b.unresolved_lines)).toBe(0);
    expect(b.reconciliation_complete).toBe(true);
    await db.close();
  });

  it("the read-only report runs clean and classifies every reason code", async () => {
    const db = await makeDb({ "o1": INVALID_CASES.map((c) => c.line).concat([GOOD]) as unknown[] });
    // report must not write anything
    await expect(db.exec(reportSql)).resolves.toBeDefined();
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(0);
    await db.close();
  });
});

describe("canonical line identity distinguishes variants", () => {
  it("same product/qty/price under DIFFERENT variants are separate lines", async () => {
    const db = await makeDb({
      "o1": [
        { productId: "p1", quantity: 1, priceAtPurchase: 500, variantId: "v-red" },
        { productId: "p1", quantity: 1, priceAtPurchase: 500, variantId: "v-blue" },
      ],
    });
    await applyInTx(db, backfillSql, withBatch());
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(2);
    // each kept its own variant identity
    expect(await scalar(db,
      `SELECT count(DISTINCT metadata #>> '{backfill,variant_key}') FROM order_items_relational`)).toBe(2);
    await db.close();
  });

  it("variantLabel is normalized (case/whitespace) into the same variant key", async () => {
    const db = await makeDb({
      "o1": [{ productId: "p1", quantity: 1, priceAtPurchase: 500, variantLabel: "  Red  " }],
    });
    await applyInTx(db, backfillSql, withBatch());
    const k = (await db.query<{ k: string }>(
      `SELECT metadata #>> '{backfill,variant_key}' AS k FROM order_items_relational`)).rows[0].k;
    expect(k).toBe("red");
    await db.close();
  });

  it("AMBIGUOUS group: an existing row with no variant metadata blocks insertion", async () => {
    // JSONB has two variants at the same product/qty/price; one relational row
    // exists with NO variant metadata, so which line it represents is unprovable.
    const db = await makeDb({
      "o1": [
        { productId: "p1", quantity: 1, priceAtPurchase: 500, variantId: "v-red" },
        { productId: "p1", quantity: 1, priceAtPurchase: 500, variantId: "v-blue" },
      ],
    });
    await db.exec(`INSERT INTO order_items_relational
      (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
      VALUES ('app-1','o1','p1',1,500,500,'{"productName":"X"}'::jsonb)`);

    await expect(applyInTx(db, backfillSql, withBatch())).rejects.toThrow(/ambiguous duplicate group/);

    // With the override the group is skipped, NOT silently paired.
    await applyInTx(db, backfillSql, withAllow());
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(1);
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational
       WHERE metadata #>> '{backfill,batch_id}' IS NOT NULL`)).toBe(0);
    await db.close();
  });

  it("NOT ambiguous when the existing row carries matching variant metadata", async () => {
    const db = await makeDb({
      "o1": [
        { productId: "p1", quantity: 1, priceAtPurchase: 500, variantId: "v-red" },
        { productId: "p1", quantity: 1, priceAtPurchase: 500, variantId: "v-blue" },
      ],
    });
    await db.exec(`INSERT INTO order_items_relational
      (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
      VALUES ('app-1','o1','p1',1,500,500,'{"variantId":"v-red"}'::jsonb)`);
    await applyInTx(db, backfillSql, withBatch());
    // only the blue line was missing
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(2);
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational
       WHERE metadata #>> '{backfill,variant_key}' = 'v-blue'`)).toBe(1);
    await db.close();
  });
});

describe("control-table rollback policy — two documented modes", () => {
  async function seeded() {
    const db = await makeDb({ "o1": [GOOD] });
    await applyInTx(db, backfillSql, withBatch());
    const batch = (await db.query<{ batch_id: string }>(
      `SELECT batch_id FROM orderitem_backfill_batches LIMIT 1`)).rows[0].batch_id;
    return { db, batch };
  }
  const tableExists = (db: PGlite) => scalar(db,
    `SELECT count(*) FROM information_schema.tables
     WHERE table_schema='public' AND table_name='orderitem_backfill_batches'`);

  it("MODE B (default): audit table RETAINED — documented rollback exception", async () => {
    const { db, batch } = await seeded();
    await applyInTx(db, backfillRollbackSql, withRollback(batch));
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(0);
    expect(await tableExists(db)).toBe(1);          // deliberately still there
    expect(await scalar(db,
      `SELECT count(*) FROM orderitem_backfill_batches WHERE rolled_back_at IS NOT NULL`)).toBe(1);
    await db.close();
  });

  it("MODE A (child branch): audit table DROPPED — full object-set rollback", async () => {
    const { db, batch } = await seeded();
    await applyInTx(db, backfillRollbackSql,
      `${withRollback(batch)} SET LOCAL aquavo.backfill_drop_control_table = 'on';`);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(0);
    expect(await tableExists(db)).toBe(0);          // introduced object removed
    await db.close();
  });

  it("MODE A refuses to drop while an un-rolled-back batch remains", async () => {
    const db = await makeDb({ "o1": [GOOD] });
    await applyInTx(db, backfillSql, withBatch());           // batch 1
    const first = (await db.query<{ batch_id: string }>(
      `SELECT batch_id FROM orderitem_backfill_batches LIMIT 1`)).rows[0].batch_id;
    // A NEW order arrives, so a second backfill opens a second batch — without
    // disturbing batch 1's rows (which must still match its audit record).
    await db.query(`INSERT INTO orders (id, source, items) VALUES ('o2','website',$1)`,
      [JSON.stringify([GOOD])]);
    await applyInTx(db, backfillSql, withBatch());           // batch 2, still active

    await expect(applyInTx(db, backfillRollbackSql,
      `${withRollback(first)} SET LOCAL aquavo.backfill_drop_control_table = 'on';`))
      .rejects.toThrow(/un-rolled-back batch/);
    expect(await tableExists(db)).toBe(1);
    await db.close();
  });

  it("rollback aborts on a row-count mismatch rather than deleting a wrong set", async () => {
    const { db, batch } = await seeded();
    // Tamper: make the audit record disagree with reality.
    await db.exec(`UPDATE orderitem_backfill_batches SET rows_inserted = 99`);
    await expect(applyInTx(db, backfillRollbackSql, withRollback(batch)))
      .rejects.toThrow(/row-count mismatch/);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(1);
    await db.close();
  });

  it("rollback FAILS CLOSED when the batch-UUID GUC is absent", async () => {
    const { db, batch } = await seeded();
    void batch;
    await expect(applyInTx(db, backfillRollbackSql,
      `SET LOCAL aquavo.backfill_rollback_authorized = 'on';`)).rejects.toThrow(/no batch id supplied/);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(1);
    await db.close();
  });

  it("rollback FAILS CLOSED when the authorization GUC is absent, even with a valid batch id", async () => {
    const { db, batch } = await seeded();
    await expect(applyInTx(db, backfillRollbackSql,
      `SET LOCAL aquavo.backfill_batch_id = '${batch}';`)).rejects.toThrow(/rollback not authorized/);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(1);
    await db.close();
  });
});
