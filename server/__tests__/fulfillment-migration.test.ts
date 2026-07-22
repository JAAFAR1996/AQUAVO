import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = process.cwd();
const forwardSql = readFileSync(join(ROOT, "migrations/add_fulfillment_costing.sql"), "utf8");
const rollbackSql = readFileSync(join(ROOT, "migrations/add_fulfillment_costing_rollback.sql"), "utf8");

const TABLES = [
  "fulfillment_materials", "packaging_purchases", "packaging_profiles", "packaging_profile_items",
  "order_fulfillment_events", "order_fulfillment_lines", "packaging_inventory_movements",
  "fulfillment_adjustments",
];

async function tableSet(db: PGlite): Promise<Set<string>> {
  const r = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  return new Set(r.rows.map((x) => x.table_name));
}

describe("fulfillment-costing migration (real Postgres via PGlite)", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE TABLE orders (id text PRIMARY KEY); INSERT INTO orders (id) VALUES ('ord-1');`);
  });

  it("first apply creates every fulfillment table", async () => {
    await db.exec(forwardSql);
    const t = await tableSet(db);
    for (const name of TABLES) expect(t.has(name)).toBe(true);
  });

  it("second apply is idempotent (no throw)", async () => {
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
  });

  it("catalog accepts a material with UNKNOWN (NULL) current cost — never 0", async () => {
    await db.exec(`INSERT INTO fulfillment_materials (id, name, category, unit) VALUES ('mat-1','Small box','box','piece')`);
    const r = await db.query<{ current_unit_cost: number | null }>(`SELECT current_unit_cost FROM fulfillment_materials WHERE id='mat-1'`);
    expect(r.rows[0].current_unit_cost).toBeNull();
  });

  it("ALLOWS multiple events per (order,type) but blocks duplicate idempotency key", async () => {
    await db.exec(`INSERT INTO order_fulfillment_events (id, order_id, event_type, sequence_number, idempotency_key, workflow_state, cost_status)
                   VALUES ('ev-1','ord-1','original',1,'ord-1:original:1','confirmed','incomplete')`);
    // same idempotency key → rejected (duplicate request)
    await expect(db.exec(`INSERT INTO order_fulfillment_events (id, order_id, event_type, sequence_number, idempotency_key, workflow_state, cost_status)
                   VALUES ('ev-dup','ord-1','original',2,'ord-1:original:1','confirmed','incomplete')`)).rejects.toBeTruthy();
    // reshipments with distinct sequence numbers → ALLOWED (multi-event)
    await expect(db.exec(`INSERT INTO order_fulfillment_events (id, order_id, event_type, sequence_number, idempotency_key, workflow_state, cost_status)
                   VALUES ('ev-2','ord-1','reshipment',2,'ord-1:reshipment:1','confirmed','incomplete')`)).resolves.toBeDefined();
    await expect(db.exec(`INSERT INTO order_fulfillment_events (id, order_id, event_type, sequence_number, idempotency_key, workflow_state, cost_status)
                   VALUES ('ev-3','ord-1','reshipment',3,'ord-1:reshipment:2','confirmed','incomplete')`)).resolves.toBeDefined();
    // (item 2) a SECOND active original is rejected by the partial unique index
    await expect(db.exec(`INSERT INTO order_fulfillment_events (id, order_id, event_type, sequence_number, idempotency_key, workflow_state, cost_status)
                   VALUES ('ev-2orig','ord-1','original',4,'ord-1:original:2','confirmed','incomplete')`)).rejects.toBeTruthy();
  });

  it("inventory movements block a duplicate deduction (same idempotency key)", async () => {
    await db.exec(`INSERT INTO packaging_inventory_movements (id, material_id, movement_type, quantity, idempotency_key)
                   VALUES ('mv-1','mat-1','fulfillment_usage','-1','use:ev-1:mat-1')`);
    await expect(db.exec(`INSERT INTO packaging_inventory_movements (id, material_id, movement_type, quantity, idempotency_key)
                   VALUES ('mv-dup','mat-1','fulfillment_usage','-1','use:ev-1:mat-1')`)).rejects.toBeTruthy();
  });

  it("enforces allowed status/state/component values and non-negative money", async () => {
    await expect(db.exec(`INSERT INTO order_fulfillment_events (id, order_id, event_type, idempotency_key, workflow_state, cost_status)
                   VALUES ('ev-x','ord-1','original','k-x','bogus','incomplete')`)).rejects.toBeTruthy();
    await expect(db.exec(`INSERT INTO order_fulfillment_lines (id, event_id, order_id, material_name_snapshot, quantity, unit_cost_snapshot, cost_status)
                   VALUES ('l-x','ev-1','ord-1','X',1,'-5','unknown')`)).rejects.toBeTruthy();
    // valid immutable line with NULL (unknown) cost is accepted
    await expect(db.exec(`INSERT INTO order_fulfillment_lines (id, event_id, order_id, material_id, material_name_snapshot, quantity, unit_cost_snapshot, cost_status, source)
                   VALUES ('l-1','ev-1','ord-1','mat-1','Small box',1,NULL,'unknown','none')`)).resolves.toBeDefined();
  });

  it("rollback drops all tables; re-apply restores them", async () => {
    await db.exec(rollbackSql);
    let t = await tableSet(db);
    for (const name of TABLES) expect(t.has(name)).toBe(false);
    await db.exec(forwardSql);
    t = await tableSet(db);
    for (const name of TABLES) expect(t.has(name)).toBe(true);
  });
});
