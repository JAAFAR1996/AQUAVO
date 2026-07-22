import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = process.cwd();
const forwardSql = readFileSync(join(ROOT, "migrations/add_order_item_cost_snapshot.sql"), "utf8");
const rollbackSql = readFileSync(join(ROOT, "migrations/add_order_item_cost_snapshot_rollback.sql"), "utf8");

// Minimal pre-migration shape of the target table.
const BASE_TABLE = `
  CREATE TABLE order_items_relational (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id text NOT NULL,
    product_id text NOT NULL,
    quantity integer NOT NULL,
    price_at_purchase numeric NOT NULL,
    total_price numeric NOT NULL,
    metadata jsonb
  );
`;

async function columns(db: PGlite): Promise<Set<string>> {
  const r = await db.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'order_items_relational'`
  );
  return new Set(r.rows.map((x) => x.column_name));
}
async function constraints(db: PGlite): Promise<Set<string>> {
  const r = await db.query<{ conname: string }>(`SELECT conname FROM pg_constraint`);
  return new Set(r.rows.map((x) => x.conname));
}

const SNAPSHOT_COLS = [
  "unit_cost_price", "unit_packaging_cost", "unit_insert_cost",
  "cost_snapshot_status", "cost_snapshot_source", "cost_snapshot_confidence",
  "cost_snapshot_version", "cost_snapshot_at",
];
const SNAPSHOT_CONSTRAINTS = [
  "order_items_cost_nonneg", "order_items_cost_status_chk", "order_items_cost_source_chk",
  "order_items_cost_confidence_chk", "order_items_cost_version_chk",
];

describe("cost-snapshot migration idempotency (real Postgres via PGlite)", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE_TABLE);
  });

  it("first apply adds all columns + constraints", async () => {
    await db.exec(forwardSql);
    const cols = await columns(db);
    const cons = await constraints(db);
    for (const c of SNAPSHOT_COLS) expect(cols.has(c)).toBe(true);
    for (const c of SNAPSHOT_CONSTRAINTS) expect(cons.has(c)).toBe(true);
  });

  it("second apply is a no-op (does NOT throw — genuinely idempotent)", async () => {
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
    const cons = await constraints(db);
    // still exactly one of each named constraint
    for (const c of SNAPSHOT_CONSTRAINTS) expect(cons.has(c)).toBe(true);
  });

  it("enforces allowed values and non-negative money on NEW rows", async () => {
    // valid row with UNKNOWN cost (NULL) is accepted
    await expect(db.exec(
      `INSERT INTO order_items_relational (order_id, product_id, quantity, price_at_purchase, total_price, cost_snapshot_status, cost_snapshot_source)
       VALUES ('o1','p1',1,'1000','1000','unknown','none')`
    )).resolves.toBeDefined();
    // invalid status rejected
    await expect(db.exec(
      `INSERT INTO order_items_relational (order_id, product_id, quantity, price_at_purchase, total_price, cost_snapshot_status)
       VALUES ('o2','p2',1,'1000','1000','bogus')`
    )).rejects.toBeTruthy();
    // negative cost rejected
    await expect(db.exec(
      `INSERT INTO order_items_relational (order_id, product_id, quantity, price_at_purchase, total_price, unit_cost_price)
       VALUES ('o3','p3',1,'1000','1000','-5')`
    )).rejects.toBeTruthy();
  });

  it("rollback removes all columns + constraints", async () => {
    await db.exec(rollbackSql);
    const cols = await columns(db);
    const cons = await constraints(db);
    for (const c of SNAPSHOT_COLS) expect(cols.has(c)).toBe(false);
    for (const c of SNAPSHOT_CONSTRAINTS) expect(cons.has(c)).toBe(false);
  });

  it("apply again after rollback restores everything (clean re-apply)", async () => {
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
    const cols = await columns(db);
    const cons = await constraints(db);
    for (const c of SNAPSHOT_COLS) expect(cols.has(c)).toBe(true);
    for (const c of SNAPSHOT_CONSTRAINTS) expect(cons.has(c)).toBe(true);
  });
});
