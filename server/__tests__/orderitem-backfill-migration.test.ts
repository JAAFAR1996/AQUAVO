import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

// Each test spins up a fresh PGlite instance; the first instantiation is slow
// when the full 107-file suite runs in parallel. The 30s global default was
// tripping here (~33s observed) — a load artefact, not a logic failure.
vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

/**
 * Production-shaped verification of:
 *   1. migrations/add_order_item_cost_snapshot.sql   (+ rollback)
 *   2. migrations/backfill_orderitems_from_jsonb.sql (+ batch-specific rollback)
 *
 * The fixture reproduces the EXACT live topology measured read-only against Neon
 * production branch br-patient-mouse-a4d4cgr4 on 2026-07-23:
 *   37 orders · 173 JSONB lines · 100 existing relational rows
 *   25 covered orders · 12 JSONB-only orders · legitimate repeated product lines
 *   order_items_relational in its CURRENT SEVEN-COLUMN shape (pre-snapshot)
 */

const ROOT = process.cwd();
const snapshotSql = readFileSync(join(ROOT, "migrations/add_order_item_cost_snapshot.sql"), "utf8");
const snapshotRollbackSql = readFileSync(join(ROOT, "migrations/add_order_item_cost_snapshot_rollback.sql"), "utf8");
const backfillSql = readFileSync(join(ROOT, "migrations/backfill_orderitems_from_jsonb.sql"), "utf8");
const backfillRollbackSql = readFileSync(join(ROOT, "migrations/backfill_orderitems_from_jsonb_rollback.sql"), "utf8");
const reportSql = readFileSync(join(ROOT, "migrations/backfill_orderitems_reconcile_report.sql"), "utf8");

/**
 * EXECUTOR-OWNED TRANSACTION. Migration files carry no BEGIN/COMMIT of their own,
 * so the executor wraps each complete file in exactly one transaction — mirroring
 * how these will be submitted to Neon via run_sql_transaction.
 */
async function applyInTx(db: PGlite, sqlText: string, pre = ""): Promise<void> {
  try {
    await db.exec(`BEGIN;
${pre}
${sqlText}
COMMIT;`);
  } catch (err) {
    await db.exec("ROLLBACK").catch(() => undefined);
    throw err;
  }
}
/** Forward backfill now REQUIRES an executor-supplied, fresh batch UUID GUC. */
const runBackfill = (db: PGlite, batchId: string = randomUUID()) =>
  applyInTx(db, backfillSql, `SET LOCAL aquavo.backfill_batch_id = '${batchId}';`);

const rollbackBatch = (db: PGlite, batchId: string, drop = false) =>
  applyInTx(db, backfillRollbackSql,
    `SET LOCAL aquavo.backfill_batch_id = '${batchId}';` +
    ` SET LOCAL aquavo.backfill_rollback_authorized = 'on';` +
    (drop ? ` SET LOCAL aquavo.backfill_drop_control_table = 'on';` : ""));

async function latestBatchId(db: PGlite): Promise<string> {
  const r = await db.query<{ batch_id: string }>(
    `SELECT batch_id FROM orderitem_backfill_batches
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
     ORDER BY started_at DESC LIMIT 1`);
  return r.rows[0].batch_id;
}

// Real per-order JSONB line counts from production (sum = 100 and 73).
const COVERED_LINES = [1, 4, 2, 1, 8, 1, 3, 3, 5, 9, 3, 1, 5, 2, 2, 5, 2, 10, 3, 7, 2, 3, 3, 5, 10];
const UNCOVERED_LINES = [2, 7, 4, 6, 1, 6, 4, 8, 12, 3, 13, 7];

const SNAPSHOT_COLS = [
  "unit_cost_price", "unit_packaging_cost", "unit_insert_cost",
  "cost_snapshot_status", "cost_snapshot_source", "cost_snapshot_confidence",
  "cost_snapshot_version", "cost_snapshot_at",
];
const SNAPSHOT_CONSTRAINTS = [
  "order_items_cost_nonneg", "order_items_cost_status_chk", "order_items_cost_source_chk",
  "order_items_cost_confidence_chk", "order_items_cost_version_chk",
];

async function one<T>(db: PGlite, sql: string): Promise<T> {
  const r = await db.query<T>(sql);
  return r.rows[0];
}
async function scalar(db: PGlite, sql: string): Promise<number> {
  const r = await one<Record<string, unknown>>(db, sql);
  return Number(Object.values(r)[0]);
}
async function columnSet(db: PGlite): Promise<Set<string>> {
  const r = await db.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='order_items_relational'`);
  return new Set(r.rows.map((x) => x.column_name));
}

/** A line is uniquely identified by (order, product, qty, price, occurrence). */
const lineKey = (r: { order_id: string; product_id: string; quantity: number; price_at_purchase: string }) =>
  `${r.order_id}|${r.product_id}|${r.quantity}|${Number(r.price_at_purchase)}`;

/**
 * INDEPENDENT verifier — deliberately does NOT reuse the migration's SQL. It
 * recomputes expected coverage in TypeScript straight from orders.items and
 * compares against whatever is actually in the relational table.
 */
async function independentReconcile(db: PGlite) {
  const orders = (await db.query<{ id: string; items: unknown }>(`SELECT id, items FROM orders`)).rows;
  const rel = (await db.query<{ order_id: string; product_id: string; quantity: number; price_at_purchase: string }>(
    `SELECT order_id, product_id, quantity, price_at_purchase FROM order_items_relational`)).rows;

  const expected = new Map<string, number>();
  let jsonbLines = 0;
  for (const o of orders) {
    for (const it of (o.items as Array<Record<string, unknown>>)) {
      jsonbLines++;
      const k = `${o.id}|${it.productId}|${Number(it.quantity)}|${Number(it.priceAtPurchase)}`;
      expected.set(k, (expected.get(k) ?? 0) + 1);
    }
  }
  const actual = new Map<string, number>();
  for (const r of rel) {
    const k = lineKey(r);
    actual.set(k, (actual.get(k) ?? 0) + 1);
  }

  let missing = 0, surplus = 0;
  for (const [k, n] of expected) missing += Math.max(0, n - (actual.get(k) ?? 0));
  for (const [k, n] of actual) surplus += Math.max(0, n - (expected.get(k) ?? 0));

  return {
    jsonbLines,
    relationalRows: rel.length,
    ordersCovered: new Set(rel.map((r) => r.order_id)).size,
    missing,
    surplus,
  };
}

describe("order-item cost-snapshot migration + JSONB backfill (production-shaped, PGlite)", () => {
  let db: PGlite;
  /** Immutable record of the 100 app-created rows, for byte-for-byte comparison. */
  let originalRows: string;

  beforeAll(async () => {
    db = new PGlite();

    // ── Production shape: orders, products, and the SEVEN-column relational table
    await db.exec(`
      CREATE TABLE orders (
        id text PRIMARY KEY,
        source text,
        items jsonb NOT NULL
      );
      CREATE TABLE products (id text PRIMARY KEY);
      CREATE TABLE order_items_relational (
        id                text PRIMARY KEY,
        order_id          text NOT NULL REFERENCES orders(id),
        product_id        text NOT NULL REFERENCES products(id),
        quantity          integer NOT NULL,
        price_at_purchase numeric NOT NULL,
        total_price       numeric NOT NULL,
        metadata          jsonb
      );
    `);

    for (let p = 1; p <= 143; p++) {
      await db.exec(`INSERT INTO products (id) VALUES ('prod-${p}')`);
    }

    // Build orders. Deterministic, no randomness.
    const mkItems = (orderIdx: number, n: number) => {
      const items: Array<Record<string, unknown>> = [];
      for (let i = 0; i < n; i++) {
        // Covered order 4 and gap order 26 each carry a LEGITIMATE repeated line:
        // an EXACT duplicate of line 0 (same product, qty and price) as a second
        // separate JSONB entry. Both have enough lines for index 1 to exist.
        const dup = (orderIdx === 4 || orderIdx === 26) && i === 1;
        const src = dup ? 0 : i;
        const pid = `prod-${((orderIdx * 7 + src) % 143) + 1}`;
        const qty = (src % 3) + 1;
        const price = 1000 * ((src % 4) + 1);
        items.push({
          productId: pid,
          productName: `P${pid}`,
          quantity: qty,
          priceAtPurchase: price,
          lineTotal: qty * price,
        });
      }
      return items;
    };

    let idx = 0;
    // 25 covered orders (source=whatsapp — the path that always wrote relational rows)
    for (const n of COVERED_LINES) {
      const oid = `ord-cov-${idx}`;
      const items = mkItems(idx, n);
      await db.query(`INSERT INTO orders (id, source, items) VALUES ($1,'whatsapp',$2)`, [oid, JSON.stringify(items)]);
      let li = 0;
      for (const it of items) {
        await db.query(
          `INSERT INTO order_items_relational
             (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [`rel-${oid}-${li}`, oid, it.productId, it.quantity, String(it.priceAtPurchase),
           String(it.lineTotal), JSON.stringify({ productName: it.productName })]);
        li++;
      }
      idx++;
    }
    // 12 JSONB-only orders (source=website — the storefront gap window)
    for (const n of UNCOVERED_LINES) {
      const oid = `ord-gap-${idx}`;
      await db.query(`INSERT INTO orders (id, source, items) VALUES ($1,'website',$2)`,
        [oid, JSON.stringify(mkItems(idx, n))]);
      idx++;
    }

    originalRows = JSON.stringify((await db.query(
      `SELECT id, order_id, product_id, quantity, price_at_purchase, total_price, metadata
       FROM order_items_relational ORDER BY id`)).rows);
  });

  // ── Fixture fidelity ──────────────────────────────────────────────────────
  it("fixture reproduces the exact live topology (37/173/100/25/12)", async () => {
    expect(await scalar(db, `SELECT count(*) FROM orders`)).toBe(37);
    expect(await scalar(db,
      `SELECT count(*) FROM orders o, LATERAL jsonb_array_elements(o.items)`)).toBe(173);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(100);
    expect(await scalar(db, `SELECT count(DISTINCT order_id) FROM order_items_relational`)).toBe(25);
    expect(await scalar(db,
      `SELECT count(*) FROM orders o WHERE NOT EXISTS
         (SELECT 1 FROM order_items_relational r WHERE r.order_id=o.id)`)).toBe(12);
    // Seven columns — the real pre-migration shape.
    expect((await columnSet(db)).size).toBe(7);
    // Legitimate repeated product lines are present.
    expect(await scalar(db, `SELECT count(*) FROM (
      SELECT order_id, product_id, quantity, price_at_purchase FROM order_items_relational
      GROUP BY 1,2,3,4 HAVING count(*)>1) d`)).toBeGreaterThan(0);
  });

  // ── §3: snapshot migration ────────────────────────────────────────────────
  it("backfill REFUSES to run before the snapshot migration (hard guard)", async () => {
    await expect(applyInTx(db, backfillSql)).rejects.toThrow(/add_order_item_cost_snapshot\.sql has not been applied/);
    // and it inserted nothing
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(100);
  });

  it("snapshot migration applies, adding 8 additive NULL columns + 5 constraints", async () => {
    await applyInTx(db, snapshotSql);
    const cols = await columnSet(db);
    for (const c of SNAPSHOT_COLS) expect(cols.has(c)).toBe(true);
    expect(cols.size).toBe(15);
    for (const c of SNAPSHOT_CONSTRAINTS) {
      expect(await scalar(db, `SELECT count(*) FROM pg_constraint WHERE conname='${c}'`)).toBe(1);
    }
  });

  it("snapshot migration is idempotent — reapply adds no duplicate columns or constraints", async () => {
    await expect(applyInTx(db, snapshotSql)).resolves.toBeUndefined();
    expect((await columnSet(db)).size).toBe(15);
    for (const c of SNAPSHOT_CONSTRAINTS) {
      expect(await scalar(db, `SELECT count(*) FROM pg_constraint WHERE conname='${c}'`)).toBe(1);
    }
  });

  it("no historical row is assigned today's product cost — all snapshots stay NULL", async () => {
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational
       WHERE unit_cost_price IS NOT NULL OR unit_packaging_cost IS NOT NULL
          OR unit_insert_cost IS NOT NULL OR cost_snapshot_status IS NOT NULL`)).toBe(0);
  });

  it("existing rows are otherwise unchanged by the snapshot migration", async () => {
    const now = JSON.stringify((await db.query(
      `SELECT id, order_id, product_id, quantity, price_at_purchase, total_price, metadata
       FROM order_items_relational ORDER BY id`)).rows);
    expect(now).toBe(originalRows);
  });

  it("snapshot rollback removes all 8 columns and all 5 constraints, then reapplies", async () => {
    await applyInTx(db, snapshotRollbackSql);
    const cols = await columnSet(db);
    for (const c of SNAPSHOT_COLS) expect(cols.has(c)).toBe(false);
    expect(cols.size).toBe(7);
    for (const c of SNAPSHOT_CONSTRAINTS) {
      expect(await scalar(db, `SELECT count(*) FROM pg_constraint WHERE conname='${c}'`)).toBe(0);
    }
    // rows survived the drop
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(100);
    const now = JSON.stringify((await db.query(
      `SELECT id, order_id, product_id, quantity, price_at_purchase, total_price, metadata
       FROM order_items_relational ORDER BY id`)).rows);
    expect(now).toBe(originalRows);

    await applyInTx(db, snapshotSql);            // reapply for the backfill tests
    expect((await columnSet(db)).size).toBe(15);
  });

  it("verified ZERO stays 0 while unknown stays NULL (the distinction survives)", async () => {
    await db.exec(`UPDATE order_items_relational
                   SET unit_cost_price=0, cost_snapshot_status='exact', cost_snapshot_source='manual'
                   WHERE id='rel-ord-cov-0-0'`);
    const r = await one<{ c: number | null; s: string | null }>(db,
      `SELECT unit_cost_price AS c, cost_snapshot_status AS s
       FROM order_items_relational WHERE id='rel-ord-cov-0-0'`);
    expect(Number(r.c)).toBe(0);
    expect(r.s).toBe("exact");
    // everything else remains NULL, not 0
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational WHERE unit_cost_price IS NULL`)).toBe(99);
    // restore
    await db.exec(`UPDATE order_items_relational
                   SET unit_cost_price=NULL, cost_snapshot_status=NULL, cost_snapshot_source=NULL
                   WHERE id='rel-ord-cov-0-0'`);
  });

  // ── §5: the 12-step backfill sequence ─────────────────────────────────────
  it("2. report-only reconciliation sees the gap before any write", async () => {
    const pre = await independentReconcile(db);
    expect(pre).toMatchObject({ jsonbLines: 173, relationalRows: 100, ordersCovered: 25, missing: 73, surplus: 0 });
  });

  it("backfill FAILS CLOSED when the batch-UUID GUC is absent (checked before any parsing)", async () => {
    // The whole file — including STEP 1's CREATE TABLE — runs in one executor
    // transaction, so the fail-closed RAISE at the top of STEP 3 rolls back
    // everything: the control table is left exactly as it was beforehand.
    await expect(applyInTx(db, backfillSql)).rejects.toThrow(/no batch id supplied/);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(100);
  });

  it("backfill FAILS CLOSED on a malformed batch-UUID GUC", async () => {
    await expect(applyInTx(db, backfillSql, `SET LOCAL aquavo.backfill_batch_id = 'not-a-uuid';`))
      .rejects.toThrow(/not a valid uuid/);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(100);
  });

  it("3-5. backfill inserts exactly 73 rows → coverage 37/37, all 173 lines represented", async () => {
    await runBackfill(db);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(173);
    expect(await scalar(db, `SELECT count(DISTINCT order_id) FROM order_items_relational`)).toBe(37);
    expect(await scalar(db,
      `SELECT count(*) FROM orders o WHERE NOT EXISTS
         (SELECT 1 FROM order_items_relational r WHERE r.order_id=o.id)`)).toBe(0);

    const post = await independentReconcile(db);
    expect(post).toMatchObject({ jsonbLines: 173, relationalRows: 173, ordersCovered: 37, missing: 0, surplus: 0 });
  });

  it("6. the original 100 app-created rows are byte-for-byte unchanged", async () => {
    const now = JSON.stringify((await db.query(
      `SELECT id, order_id, product_id, quantity, price_at_purchase, total_price, metadata
       FROM order_items_relational
       WHERE metadata #>> '{backfill,batch_id}' IS NULL ORDER BY id`)).rows);
    expect(now).toBe(originalRows);
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational
       WHERE metadata #>> '{backfill,batch_id}' IS NULL`)).toBe(100);
  });

  it("backfilled rows carry UNKNOWN cost (NULL, never 0, never today's product cost)", async () => {
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational
       WHERE metadata #>> '{backfill,batch_id}' IS NOT NULL
         AND (unit_cost_price IS NOT NULL OR unit_packaging_cost IS NOT NULL
              OR unit_insert_cost IS NOT NULL)`)).toBe(0);
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational
       WHERE metadata #>> '{backfill,batch_id}' IS NOT NULL
         AND cost_snapshot_status='unknown' AND cost_snapshot_source='none'`)).toBe(73);
  });

  it("records batch id, source, timestamp and a deterministic fingerprint on every row", async () => {
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational
       WHERE metadata #>> '{backfill,batch_id}' IS NOT NULL
         AND metadata #>> '{backfill,fingerprint}' IS NOT NULL
         AND metadata #>> '{backfill,source}' = 'orders.items'
         AND metadata #>> '{backfill,at}' IS NOT NULL`)).toBe(73);
    // fingerprints are unique — no two backfilled rows claim the same JSONB line
    expect(await scalar(db,
      `SELECT count(DISTINCT metadata #>> '{backfill,fingerprint}')
       FROM order_items_relational WHERE metadata #>> '{backfill,batch_id}' IS NOT NULL`)).toBe(73);
  });

  it("7. legitimate repeated product lines are preserved, not collapsed", async () => {
    // Gap order 26 carries an exact duplicate of its line 0; the backfill must
    // produce TWO relational rows for it, not collapse them into one.
    const dupGap = await scalar(db,
      `SELECT count(*) FROM order_items_relational WHERE order_id='ord-gap-26'
         AND product_id='prod-${((26 * 7) % 143) + 1}' AND quantity=1 AND price_at_purchase=1000`);
    expect(dupGap).toBe(2);
    // and no line is duplicated BEYOND what JSONB says
    expect((await independentReconcile(db)).surplus).toBe(0);
  });

  it("8. re-running the backfill inserts zero additional rows (idempotent)", async () => {
    const batchesBefore = await scalar(db, `SELECT count(*) FROM orderitem_backfill_batches`);
    // Idempotent no-op still requires a fresh batch-id GUC (the guard is
    // unconditional and runs before the "anything missing?" check), but since
    // nothing is missing no batch row is opened with it.
    await runBackfill(db);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(173);
    // no empty batch was opened, so the real batch stays the rollback target
    expect(await scalar(db, `SELECT count(*) FROM orderitem_backfill_batches`)).toBe(batchesBefore);
    expect((await independentReconcile(db))).toMatchObject({ missing: 0, surplus: 0 });
  });

  it("rollback FAILS CLOSED when the authorization GUC is absent, even with a valid batch id", async () => {
    const batch = await latestBatchId(db);
    await expect(applyInTx(db, backfillRollbackSql, `SET LOCAL aquavo.backfill_batch_id = '${batch}';`))
      .rejects.toThrow(/rollback not authorized/);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(173);
    expect(await scalar(db,
      `SELECT count(*) FROM orderitem_backfill_batches WHERE batch_id='${batch}' AND rolled_back_at IS NOT NULL`)).toBe(0);
  });

  it("9-11. batch rollback removes exactly the 73 inserted rows, leaving the 100 intact", async () => {
    const batch = await latestBatchId(db);
    await rollbackBatch(db, batch);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(100);
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational
       WHERE metadata #>> '{backfill,batch_id}' IS NOT NULL`)).toBe(0);
    const now = JSON.stringify((await db.query(
      `SELECT id, order_id, product_id, quantity, price_at_purchase, total_price, metadata
       FROM order_items_relational ORDER BY id`)).rows);
    expect(now).toBe(originalRows);
    expect(await scalar(db,
      `SELECT count(*) FROM orderitem_backfill_batches WHERE rolled_back_at IS NOT NULL`)).toBe(1);
  });

  it("rollback REFUSES without an explicit batch id (no implicit 'latest')", async () => {
    await expect(applyInTx(db, backfillRollbackSql))
      .rejects.toThrow(/no batch id supplied/);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(100);
  });

  it("rollback refuses a malformed, unknown, or already-rolled-back batch id", async () => {
    await expect(rollbackBatch(db, "not-a-uuid")).rejects.toThrow(/not a valid uuid/);
    await expect(rollbackBatch(db, "00000000-0000-0000-0000-000000000000"))
      .rejects.toThrow(/does not exist/);
    const done = await one<{ batch_id: string }>(db,
      `SELECT batch_id FROM orderitem_backfill_batches WHERE rolled_back_at IS NOT NULL LIMIT 1`);
    await expect(rollbackBatch(db, done.batch_id)).rejects.toThrow(/already rolled back/);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(100);
  });

  it("12. reapplying the backfill restores 37/37 and reconciles clean", async () => {
    await runBackfill(db);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational`)).toBe(173);
    expect(await scalar(db, `SELECT count(DISTINCT order_id) FROM order_items_relational`)).toBe(37);
    expect(await independentReconcile(db)).toMatchObject({
      jsonbLines: 173, relationalRows: 173, ordersCovered: 37, missing: 0, surplus: 0,
    });
    // a second, distinct batch — the audit trail keeps both
    expect(await scalar(db, `SELECT count(*) FROM orderitem_backfill_batches`)).toBe(2);
  });

  it("line-by-line: a PARTIALLY covered order is topped up, not skipped", async () => {
    // Delete 2 of the 8 lines of a covered order, then re-run the backfill.
    await db.exec(`DELETE FROM order_items_relational
                   WHERE id IN ('rel-ord-cov-4-0','rel-ord-cov-4-1')`);
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational WHERE order_id='ord-cov-4'`)).toBe(6);
    await runBackfill(db);
    // The old order-level skip would have left this at 6 forever.
    expect(await scalar(db, `SELECT count(*) FROM order_items_relational WHERE order_id='ord-cov-4'`)).toBe(8);
    expect(await independentReconcile(db)).toMatchObject({ missing: 0, surplus: 0 });
  });

  it("never deletes app-created rows: rollback of the top-up batch spares the originals", async () => {
    const appRows = await scalar(db,
      `SELECT count(*) FROM order_items_relational WHERE metadata #>> '{backfill,batch_id}' IS NULL`);
    await rollbackBatch(db, await latestBatchId(db));   // reverses only that batch
    expect(await scalar(db,
      `SELECT count(*) FROM order_items_relational WHERE metadata #>> '{backfill,batch_id}' IS NULL`))
      .toBe(appRows);
  });
});
