// Reversal integrity (item 3). A reversal must be the EXACT opposite of the
// financial and stock event it references — not "movement_type='reversal' with any
// signed quantity". These tests exercise both the service guards and the database
// constraints/triggers (raw SQL is used to prove the DB itself refuses bad rows,
// so the invariants hold even if a future caller bypasses the service).
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import { confirmFulfillment, reverseFulfillmentEvent } from "../services/fulfillment-service.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";

const ROOT = process.cwd();
const base = readFileSync(join(ROOT, "migrations/add_fulfillment_costing.sql"), "utf8");
const hardening = readFileSync(join(ROOT, "migrations/add_fulfillment_hardening.sql"), "utf8");

let client: PGlite;
let db: FulfillmentDb;

async function balance(materialId: string): Promise<number> {
  const r = await client.query<{ bal: number }>(
    `SELECT COALESCE(SUM(quantity),0)::float8 AS bal FROM packaging_inventory_movements WHERE material_id=$1`,
    [materialId]);
  return Number(r.rows[0].bal);
}

describe("reversal integrity", () => {
  beforeAll(async () => {
    client = new PGlite();
    await client.exec(`CREATE TABLE orders (id text PRIMARY KEY);
      INSERT INTO orders (id) VALUES ('r-ord-1'),('r-ord-2');`);
    await client.exec(base);
    await client.exec(hardening);
    db = drizzle(client, { schema }) as unknown as FulfillmentDb;
    await client.exec(`INSERT INTO fulfillment_materials (id,name,unit) VALUES ('rbox','Box','piece'),('rother','Other','piece')`);
    await client.exec(`INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,idempotency_key)
      VALUES ('r-rc','rbox','purchase_receipt','200','r:rc'),('r-rc2','rother','purchase_receipt','200','r:rc2')`);
  });

  async function makeEvent(orderId: string, requestId: string, qty = 3) {
    return confirmFulfillment(db, {
      orderId, eventType: requestId === "orig" ? "original" : "reshipment", requestId,
      lines: [{ materialId: "rbox", materialName: "Box", quantity: qty, unitCost: 500 }],
    });
  }

  it("a reversal posts EXACTLY the negated quantity and restores the balance", async () => {
    await makeEvent("r-ord-1", "orig", 3);
    const ev = await makeEvent("r-ord-1", "rs-1", 4);
    const balAfterUse = await balance("rbox");

    const rev = await reverseFulfillmentEvent(db, ev.eventId, "customer refused");
    expect(rev.reused).toBe(false);
    expect(rev.reversedMovements).toBe(1);
    expect(await balance("rbox")).toBe(balAfterUse + 4); // exactly +4 against the −4 usage

    const rows = await client.query<{ quantity: string; reversal_of_movement_id: string }>(
      `SELECT quantity, reversal_of_movement_id FROM packaging_inventory_movements WHERE event_id=$1`,
      [rev.reversalEventId]);
    expect(rows.rows).toHaveLength(1);
    expect(Number(rows.rows[0].quantity)).toBe(4);
    expect(rows.rows[0].reversal_of_movement_id).toBeTruthy();
  });

  it("the reversal is IDEMPOTENT — repeating it returns the same reversal event", async () => {
    const ev = await makeEvent("r-ord-1", "rs-idem", 2);
    const first = await reverseFulfillmentEvent(db, ev.eventId, "duplicate test");
    const balAfter = await balance("rbox");

    const second = await reverseFulfillmentEvent(db, ev.eventId, "duplicate test");
    expect(second.reversalEventId).toBe(first.reversalEventId);
    expect(second.reused).toBe(true);
    expect(await balance("rbox")).toBe(balAfter); // no second credit
  });

  it("only ONE ACTIVE reversal may exist per target event", async () => {
    const ev = await makeEvent("r-ord-1", "rs-one", 1);
    await reverseFulfillmentEvent(db, ev.eventId, "first");

    // A second, DIFFERENT reversal row for the same target is refused by the DB.
    await expect(client.query(
      `INSERT INTO order_fulfillment_events (id,order_id,event_type,sequence_number,reversal_of_event_id,idempotency_key,workflow_state,cost_status)
       VALUES ('rev-dup','r-ord-1','adjustment',900,$1,'rev:dup','confirmed','exact')`,
      [ev.eventId])).rejects.toBeTruthy();
  });

  it("an event cannot reverse ITSELF", async () => {
    await expect(client.exec(
      `INSERT INTO order_fulfillment_events (id,order_id,event_type,sequence_number,reversal_of_event_id,idempotency_key,workflow_state,cost_status)
       VALUES ('self-1','r-ord-2','adjustment',901,'self-1','rev:self','confirmed','exact')`
    )).rejects.toBeTruthy();
  });

  it("reversal references cannot form a CYCLE", async () => {
    const a = await makeEvent("r-ord-2", "cyc-a", 1);
    const rev = await reverseFulfillmentEvent(db, a.eventId, "cycle setup");
    // Try to make the ORIGINAL point back at its own reversal → closes a cycle.
    await expect(client.query(
      `UPDATE order_fulfillment_events SET reversal_of_event_id=$1 WHERE id=$2`,
      [rev.reversalEventId, a.eventId])).rejects.toBeTruthy();
  });

  it("a reversal movement with an ARBITRARY signed quantity is REFUSED", async () => {
    const ev = await makeEvent("r-ord-2", "arb-1", 5);
    const usage = await client.query<{ id: string; quantity: string }>(
      `SELECT id, quantity FROM packaging_inventory_movements WHERE event_id=$1 AND movement_type='fulfillment_usage'`,
      [ev.eventId]);
    const target = usage.rows[0];
    expect(Number(target.quantity)).toBe(-5);

    // Not the exact negative (+1 instead of +5) → rejected.
    await expect(client.query(
      `INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,order_id,idempotency_key,reversal_of_movement_id)
       VALUES ('bad-qty','rbox','reversal','1','r-ord-2','bad:qty',$1)`,
      [target.id])).rejects.toBeTruthy();

    // Same sign as the original (−5) → rejected.
    await expect(client.query(
      `INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,order_id,idempotency_key,reversal_of_movement_id)
       VALUES ('bad-sign','rbox','reversal','-5','r-ord-2','bad:sign',$1)`,
      [target.id])).rejects.toBeTruthy();
  });

  it("a reversal cannot link an UNRELATED material or order", async () => {
    const ev = await makeEvent("r-ord-2", "unrel-1", 2);
    const usage = await client.query<{ id: string }>(
      `SELECT id FROM packaging_inventory_movements WHERE event_id=$1 AND movement_type='fulfillment_usage'`,
      [ev.eventId]);
    const target = usage.rows[0];

    // Different MATERIAL → rejected.
    await expect(client.query(
      `INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,order_id,idempotency_key,reversal_of_movement_id)
       VALUES ('x-mat','rother','reversal','2','r-ord-2','x:mat',$1)`,
      [target.id])).rejects.toBeTruthy();

    // Different ORDER → rejected.
    await expect(client.query(
      `INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,order_id,idempotency_key,reversal_of_movement_id)
       VALUES ('x-ord','rbox','reversal','2','r-ord-1','x:ord',$1)`,
      [target.id])).rejects.toBeTruthy();
  });

  it("a 'reversal' movement MUST cite the movement it negates", async () => {
    await expect(client.exec(
      `INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,idempotency_key)
       VALUES ('naked-rev','rbox','reversal','7','naked:rev')`)).rejects.toBeTruthy();
  });

  it("a reversal cannot reverse another REVERSAL (chains are refused)", async () => {
    const ev = await makeEvent("r-ord-2", "chain-1", 1);
    const rev = await reverseFulfillmentEvent(db, ev.eventId, "chain setup");
    const revMove = await client.query<{ id: string }>(
      `SELECT id FROM packaging_inventory_movements WHERE event_id=$1`, [rev.reversalEventId]);
    await expect(client.query(
      `INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,order_id,idempotency_key,reversal_of_movement_id)
       VALUES ('rev-of-rev','rbox','reversal','-1','r-ord-2','rev:of:rev',$1)`,
      [revMove.rows[0].id])).rejects.toBeTruthy();
  });

  it("the ORIGINAL event and its movements stay IMMUTABLE through a reversal", async () => {
    const ev = await makeEvent("r-ord-2", "imm-1", 3);
    const before = await client.query<{ actual_cost: string; cost_status: string }>(
      `SELECT actual_cost, cost_status FROM order_fulfillment_events WHERE id=$1`, [ev.eventId]);
    await reverseFulfillmentEvent(db, ev.eventId, "immutability check");
    const after = await client.query<{ actual_cost: string; cost_status: string; workflow_state: string }>(
      `SELECT actual_cost, cost_status, workflow_state FROM order_fulfillment_events WHERE id=$1`, [ev.eventId]);

    expect(after.rows[0].actual_cost).toBe(before.rows[0].actual_cost); // financials untouched
    expect(after.rows[0].cost_status).toBe(before.rows[0].cost_status);
    expect(after.rows[0].workflow_state).toBe("reversed");              // only the state moved

    // Direct edits are still refused by the DB.
    await expect(client.query(
      `UPDATE order_fulfillment_events SET actual_cost='1' WHERE id=$1`, [ev.eventId])).rejects.toBeTruthy();
    await expect(client.query(
      `UPDATE packaging_inventory_movements SET quantity='0' WHERE event_id=$1`, [ev.eventId])).rejects.toBeTruthy();
  });

  it("an already-reversed event cannot be reversed again by the service", async () => {
    const ev = await makeEvent("r-ord-2", "twice-1", 1);
    await reverseFulfillmentEvent(db, ev.eventId, "first");
    // Same eventId → idempotent reuse (not an error). A DIFFERENT reason is still the
    // same logical operation on the same target, so it also reuses.
    const again = await reverseFulfillmentEvent(db, ev.eventId, "second attempt");
    expect(again.reused).toBe(true);
  });

  it("a reversal must state a reason", async () => {
    const ev = await makeEvent("r-ord-2", "noreason-1", 1);
    await expect(reverseFulfillmentEvent(db, ev.eventId, "   "))
      .rejects.toThrow(/REVERSAL_REASON_REQUIRED/);
  });

  it("reversing a non-existent event fails cleanly", async () => {
    await expect(reverseFulfillmentEvent(db, "does-not-exist", "x"))
      .rejects.toThrow(/EVENT_NOT_FOUND/);
  });
});
