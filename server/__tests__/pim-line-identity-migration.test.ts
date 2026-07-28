import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * F-4 — EMPIRICAL PROOF, on a real Postgres engine (PGlite), that
 * `pim_idempotency_uidx` collides on legitimate multi-line events, and that
 * migrations/add_pim_line_identity.sql fixes it WITHOUT weakening duplicate
 * protection.
 *
 * The schema below is the VERBATIM packaging_inventory_movements definition from
 * migrations/add_fulfillment_costing.sql (§6) plus its unique index, reduced to
 * the columns the defect involves.
 */

const ROOT = process.cwd();
const forwardSql = readFileSync(join(ROOT, "migrations/add_pim_line_identity.sql"), "utf8");
const rollbackSql = readFileSync(join(ROOT, "migrations/add_pim_line_identity_rollback.sql"), "utf8");

const BASE_SCHEMA = `
CREATE TABLE orders (id text PRIMARY KEY);
CREATE TABLE fulfillment_materials (id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE order_fulfillment_events (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id),
  event_type text NOT NULL, idempotency_key text NOT NULL
);
CREATE UNIQUE INDEX ofe_idempotency_uidx ON order_fulfillment_events(idempotency_key);
CREATE TABLE order_fulfillment_lines (
  id text PRIMARY KEY, event_id text NOT NULL REFERENCES order_fulfillment_events(id),
  order_id text NOT NULL REFERENCES orders(id),
  material_id text REFERENCES fulfillment_materials(id),
  quantity numeric NOT NULL
);
CREATE TABLE packaging_inventory_movements (
  id text PRIMARY KEY,
  material_id text NOT NULL REFERENCES fulfillment_materials(id),
  movement_type text NOT NULL,
  quantity numeric NOT NULL,
  order_id text REFERENCES orders(id),
  event_id text REFERENCES order_fulfillment_events(id),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pim_idempotency_uidx ON packaging_inventory_movements(idempotency_key);
INSERT INTO orders (id) VALUES ('ord-1');
INSERT INTO fulfillment_materials (id, name) VALUES ('mat-box','Small box');
INSERT INTO order_fulfillment_events (id, order_id, event_type, idempotency_key)
  VALUES ('ev-1','ord-1','original','ord-1:original:1');
-- ONE event, TWO legitimate lines carrying the SAME material.
INSERT INTO order_fulfillment_lines (id, event_id, order_id, material_id, quantity) VALUES
  ('line-a','ev-1','ord-1','mat-box',2),
  ('line-b','ev-1','ord-1','mat-box',3);
`;

/** The OLD key: no per-line component. */
const oldKey = (eventId: string, materialId: string) => `use:${eventId}:${materialId}`;
/** The NEW key: per-line component (matches server/services/fulfillment-service.ts). */
const newKey = (eventId: string, lineId: string) => `use:${eventId}:${lineId}`;

async function errorOf(fn: () => Promise<unknown>): Promise<string> {
  try { await fn(); return ""; } catch (e) { return String((e as Error).message ?? e); }
}

describe("F-4 — packaging_inventory_movements per-line identity", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE_SCHEMA);
  });

  it("PROOF OF DEFECT: two legitimate lines of one event COLLIDE under the old key", async () => {
    await db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, order_id, event_id, idempotency_key)
      VALUES ('mv-a','mat-box','fulfillment_usage',-2,'ord-1','ev-1','${oldKey("ev-1", "mat-box")}')`);

    const msg = await errorOf(() => db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, order_id, event_id, idempotency_key)
      VALUES ('mv-b','mat-box','fulfillment_usage',-3,'ord-1','ev-1','${oldKey("ev-1", "mat-box")}')`));

    // Legitimate second line rejected — the whole confirmation transaction dies.
    expect(msg).toMatch(/duplicate key|pim_idempotency_uidx|unique/i);
    const n = await db.query<{ c: string }>(`SELECT count(*)::text AS c FROM packaging_inventory_movements`);
    expect(n.rows[0].c).toBe("1"); // second line's stock was NEVER deducted
    await db.exec(`DELETE FROM packaging_inventory_movements`);
  });

  it("the migration applies, and is idempotent on a second apply", async () => {
    await db.exec(forwardSql);
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
    const cols = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name='packaging_inventory_movements' AND column_name='line_id'`);
    expect(cols.rows.length).toBe(1);
  });

  it("FIXED: MULTIPLE LEGITIMATE LINES DO NOT COLLIDE", async () => {
    await db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, order_id, event_id, line_id, idempotency_key)
      VALUES ('mv-a','mat-box','fulfillment_usage',-2,'ord-1','ev-1','line-a','${newKey("ev-1", "line-a")}')`);
    await expect(db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, order_id, event_id, line_id, idempotency_key)
      VALUES ('mv-b','mat-box','fulfillment_usage',-3,'ord-1','ev-1','line-b','${newKey("ev-1", "line-b")}')`))
      .resolves.toBeDefined();

    const r = await db.query<{ c: string; total: string }>(
      `SELECT count(*)::text AS c, sum(quantity)::text AS total FROM packaging_inventory_movements`);
    expect(r.rows[0].c).toBe("2");
    expect(Number(r.rows[0].total)).toBe(-5); // BOTH lines deducted, exactly once
  });

  it("DUPLICATE REQUESTS REMAIN BLOCKED — same key still rejected", async () => {
    const msg = await errorOf(() => db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, order_id, event_id, line_id, idempotency_key)
      VALUES ('mv-dup','mat-box','fulfillment_usage',-2,'ord-1','ev-1',NULL,'${newKey("ev-1", "line-a")}')`));
    expect(msg).toMatch(/duplicate key|pim_idempotency_uidx|unique/i);
  });

  it("STRICTLY STRONGER: a second movement for the SAME LINE is now impossible", async () => {
    // different idempotency key — under the old schema this would have been accepted
    const msg = await errorOf(() => db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, order_id, event_id, line_id, idempotency_key)
      VALUES ('mv-double','mat-box','fulfillment_usage',-2,'ord-1','ev-1','line-a','some:other:key')`));
    expect(msg).toMatch(/duplicate key|pim_line_uidx|unique/i);
  });

  it("non-line movements (purchases, reversals) are unaffected: many NULL line_ids allowed", async () => {
    await db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, idempotency_key)
      VALUES ('mv-p1','mat-box','purchase_receipt',100,'purchase:po-1')`);
    await expect(db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, idempotency_key)
      VALUES ('mv-p2','mat-box','purchase_receipt',50,'purchase:po-2')`)).resolves.toBeDefined();
  });

  it("line_id must reference a real fulfillment line", async () => {
    const msg = await errorOf(() => db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, event_id, line_id, idempotency_key)
      VALUES ('mv-bad','mat-box','fulfillment_usage',-1,'ev-1','line-does-not-exist','k:bad')`));
    expect(msg).toMatch(/foreign key|pim_line_fk/i);
  });

  it("rollback restores the exact pre-migration shape and keeps duplicate protection", async () => {
    await db.exec(rollbackSql);
    await expect(db.exec(rollbackSql)).resolves.toBeDefined(); // idempotent

    const cols = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name='packaging_inventory_movements' AND column_name='line_id'`);
    expect(cols.rows.length).toBe(0);

    const idx = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename='packaging_inventory_movements'`);
    const names = idx.rows.map((r) => r.indexname);
    expect(names).toContain("pim_idempotency_uidx"); // never touched by either direction
    expect(names).not.toContain("pim_line_uidx");

    // duplicate protection survives the rollback
    const msg = await errorOf(() => db.exec(`INSERT INTO packaging_inventory_movements
      (id, material_id, movement_type, quantity, idempotency_key)
      VALUES ('mv-dup2','mat-box','purchase_receipt',1,'purchase:po-1')`));
    expect(msg).toMatch(/duplicate key|pim_idempotency_uidx|unique/i);
  });

  it("the migration fails CLOSED when the base tables are absent", async () => {
    const bare = new PGlite();
    const msg = await errorOf(() => bare.exec(forwardSql));
    expect(msg).toMatch(/packaging_inventory_movements is missing/);
  });

  it("neither migration file contains a top-level BEGIN/COMMIT (executor owns the tx)", () => {
    for (const sql of [forwardSql, rollbackSql]) {
      const stripped = sql.replace(/^\s*--.*$/gm, "");
      expect(/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(stripped)).toBe(false);
    }
  });
});
