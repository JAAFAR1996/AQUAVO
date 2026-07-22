// Migration safety for add_fulfillment_hardening.sql.
//
// The migration must be applicable to a database that ALREADY holds live data
// (Neon does), must be re-runnable, and must be cleanly reversible. All three are
// exercised here against a real Postgres.
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = process.cwd();
const baseSql = readFileSync(join(ROOT, "migrations/add_fulfillment_costing.sql"), "utf8");
const forwardSql = readFileSync(join(ROOT, "migrations/add_fulfillment_hardening.sql"), "utf8");
const rollbackSql = readFileSync(join(ROOT, "migrations/add_fulfillment_hardening_rollback.sql"), "utf8");

const NEW_TABLES = [
  "order_fulfillment_sequences",
  "packaging_profile_families",
  "material_cost_records",
  "fulfillment_preparation_drafts",
  "fulfillment_preparation_draft_lines",
];

async function tableSet(db: PGlite): Promise<Set<string>> {
  const r = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  return new Set(r.rows.map((x) => x.table_name));
}
async function columnExists(db: PGlite, table: string, column: string): Promise<boolean> {
  const r = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND column_name=$2`, [table, column]);
  return Number(r.rows[0].n) > 0;
}

describe("fulfillment hardening migration (real Postgres via PGlite)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE TABLE orders (id text PRIMARY KEY);
      INSERT INTO orders (id) VALUES ('h-ord-1'),('h-ord-2');`);
    await db.exec(baseSql);

    // PRE-EXISTING data, as on a live database: a legacy profile with no family,
    // and events already carrying sequence numbers.
    await db.exec(`INSERT INTO packaging_profiles (id,name,version) VALUES ('legacy-p','بروفايل قديم',1)`);
    await db.exec(`INSERT INTO fulfillment_materials (id,name,unit) VALUES ('h-mat','صندوق','piece')`);
    await db.exec(`INSERT INTO order_fulfillment_events
        (id,order_id,event_type,sequence_number,idempotency_key,workflow_state,cost_status)
      VALUES ('h-ev-1','h-ord-1','original',1,'h:1','confirmed','exact'),
             ('h-ev-2','h-ord-1','reshipment',5,'h:2','confirmed','exact')`);
  });

  it("applies onto a database that already holds data", async () => {
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
    const t = await tableSet(db);
    for (const name of NEW_TABLES) expect(t.has(name)).toBe(true);
  });

  it("adds every new column to the existing tables", async () => {
    expect(await columnExists(db, "packaging_profiles", "profile_family_id")).toBe(true);
    expect(await columnExists(db, "packaging_profiles", "locked")).toBe(true);
    expect(await columnExists(db, "packaging_profiles", "previous_version_id")).toBe(true);
    expect(await columnExists(db, "order_fulfillment_events", "draft_id")).toBe(true);
    expect(await columnExists(db, "order_fulfillment_events", "profile_family_id")).toBe(true);
    expect(await columnExists(db, "order_fulfillment_lines", "category")).toBe(true);
    expect(await columnExists(db, "order_fulfillment_lines", "note")).toBe(true);
    expect(await columnExists(db, "fulfillment_materials", "current_cost_record_id")).toBe(true);
  });

  it("BACKFILLS the sequence counter past the highest existing number", async () => {
    // The pre-existing events reached 5; the counter must start at 6 so the very
    // first allocation after the migration cannot collide with history.
    const r = await db.query<{ next_sequence: number }>(
      `SELECT next_sequence FROM order_fulfillment_sequences WHERE order_id='h-ord-1'`);
    expect(Number(r.rows[0].next_sequence)).toBe(6);
  });

  it("ADOPTS orphan legacy profiles into single-version families", async () => {
    const r = await db.query<{ profile_family_id: string | null; family_key: string }>(
      `SELECT p.profile_family_id, f.family_key
         FROM packaging_profiles p JOIN packaging_profile_families f ON f.id = p.profile_family_id
        WHERE p.id='legacy-p'`);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].profile_family_id).toBeTruthy();
    expect(r.rows[0].family_key).toBe("legacy-legacy-p");
  });

  it("is idempotent — a second apply neither throws nor duplicates", async () => {
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
    const families = await db.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM packaging_profile_families`);
    expect(Number(families.rows[0].n)).toBe(1);              // no second legacy family
    const seq = await db.query<{ next_sequence: number }>(
      `SELECT next_sequence FROM order_fulfillment_sequences WHERE order_id='h-ord-1'`);
    expect(Number(seq.rows[0].next_sequence)).toBe(6);       // counter did not move
  });

  it("a third apply after real allocation does not REWIND the counter", async () => {
    await db.exec(`UPDATE order_fulfillment_sequences SET next_sequence=42 WHERE order_id='h-ord-1'`);
    await db.exec(forwardSql);
    const r = await db.query<{ next_sequence: number }>(
      `SELECT next_sequence FROM order_fulfillment_sequences WHERE order_id='h-ord-1'`);
    expect(Number(r.rows[0].next_sequence)).toBe(42);        // GREATEST(), never backwards
  });

  it("the new constraints are live after the migration", async () => {
    // self-reversal
    await expect(db.exec(`INSERT INTO order_fulfillment_events
        (id,order_id,event_type,sequence_number,reversal_of_event_id,idempotency_key,workflow_state,cost_status)
      VALUES ('h-self','h-ord-2','adjustment',1,'h-self','h:self','confirmed','exact')`)).rejects.toBeTruthy();
    // a reversal movement with no referent
    await expect(db.exec(`INSERT INTO packaging_inventory_movements
        (id,material_id,movement_type,quantity,idempotency_key)
      VALUES ('h-naked','h-mat','reversal','5','h:naked')`)).rejects.toBeTruthy();
    // a catalog cost with no approved record
    await expect(db.exec(`UPDATE fulfillment_materials SET current_unit_cost='100' WHERE id='h-mat'`))
      .rejects.toBeTruthy();
  });

  it("rollback removes everything it added and leaves the base schema intact", async () => {
    await expect(db.exec(rollbackSql)).resolves.toBeDefined();
    const t = await tableSet(db);
    for (const name of NEW_TABLES) expect(t.has(name)).toBe(false);
    expect(await columnExists(db, "packaging_profiles", "profile_family_id")).toBe(false);
    expect(await columnExists(db, "order_fulfillment_events", "draft_id")).toBe(false);
    expect(await columnExists(db, "fulfillment_materials", "current_cost_record_id")).toBe(false);

    // The BASE tables and their data survive the rollback untouched.
    expect(t.has("order_fulfillment_events")).toBe(true);
    expect(t.has("fulfillment_materials")).toBe(true);
    const events = await db.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM order_fulfillment_events`);
    expect(Number(events.rows[0].n)).toBe(2);

    // The guard removed by the rollback is genuinely gone.
    await expect(db.exec(`UPDATE fulfillment_materials SET current_unit_cost='100' WHERE id='h-mat'`))
      .resolves.toBeDefined();
  });

  it("re-apply after rollback restores everything", async () => {
    await db.exec(`UPDATE fulfillment_materials SET current_unit_cost=NULL WHERE id='h-mat'`);
    await expect(db.exec(forwardSql)).resolves.toBeDefined();
    const t = await tableSet(db);
    for (const name of NEW_TABLES) expect(t.has(name)).toBe(true);
    const r = await db.query<{ next_sequence: number }>(
      `SELECT next_sequence FROM order_fulfillment_sequences WHERE order_id='h-ord-1'`);
    expect(Number(r.rows[0].next_sequence)).toBe(6);         // rebuilt from the live data
  });
});
