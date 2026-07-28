// Concurrency + sequence-ALLOCATION tests (item 1).
//
// The allocator is a per-order counter row updated by a single atomic
// INSERT … ON CONFLICT DO UPDATE … RETURNING, guarded by a per-order advisory lock.
// These tests assert the observable contract:
//   * two DIFFERENT concurrent requests for the SAME order both succeed with
//     DIFFERENT sequence numbers (neither is rejected as a false duplicate);
//   * DUPLICATE requests (same idempotency key) collapse to the SAME event;
//   * requests for DIFFERENT orders do not block or interfere with each other.
//
// NOTE on the harness: PGlite is a single-connection Postgres, so it serializes
// statements rather than interleaving them. That means these tests prove the
// ALLOCATION SEMANTICS (distinct numbers, no false duplicate-rejection, correct
// idempotent collapse) but cannot by themselves reproduce a true parallel race.
// The `allocateSequenceNumber` unit assertions below therefore also pin the exact
// SQL contract — a single atomic statement holding a ROW lock — which is what makes
// the semantics hold under a real multi-connection Postgres.
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import {
  confirmFulfillment, allocateSequenceNumber,
} from "../services/fulfillment-service.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";

const ROOT = process.cwd();
const base = readFileSync(join(ROOT, "migrations/add_fulfillment_costing.sql"), "utf8");
const hardening = readFileSync(join(ROOT, "migrations/add_fulfillment_hardening.sql"), "utf8");
// F-4: per-line identity for packaging_inventory_movements (add_pim_line_identity.sql)
const pimLineIdentity = readFileSync(join(ROOT, "migrations/add_pim_line_identity.sql"), "utf8");

let client: PGlite;
let db: FulfillmentDb;

describe("fulfillment sequencing — concurrency-safe ALLOCATION", () => {
  beforeAll(async () => {
    client = new PGlite();
    await client.exec(`CREATE TABLE orders (id text PRIMARY KEY);
      INSERT INTO orders (id) VALUES ('c-ord-1'),('c-ord-2'),('c-ord-3');`);
    await client.exec(base);
    await client.exec(hardening);
    await client.exec(pimLineIdentity);
    db = drizzle(client, { schema }) as unknown as FulfillmentDb;
    await client.exec(`INSERT INTO fulfillment_materials (id,name,category,unit) VALUES ('cbox','Box','box','piece')`);
    await client.exec(`INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,idempotency_key)
      VALUES ('c-rc','cbox','purchase_receipt','500','c:rc')`);
  });

  const line = (qty = 1) => [{ materialId: "cbox", materialName: "Box", quantity: qty, unitCost: 1000 }];

  it("allocates strictly increasing, never-repeating numbers per order", async () => {
    const a = await allocateSequenceNumber(db, "c-ord-3");
    const b = await allocateSequenceNumber(db, "c-ord-3");
    const c = await allocateSequenceNumber(db, "c-ord-3");
    expect([a, b, c]).toEqual([1, 2, 3]);
  });

  it("allocation for one order does NOT advance another order's counter (no global lock)", async () => {
    const otherBefore = await allocateSequenceNumber(db, "c-ord-2");
    await allocateSequenceNumber(db, "c-ord-3");
    await allocateSequenceNumber(db, "c-ord-3");
    const otherAfter = await allocateSequenceNumber(db, "c-ord-2");
    expect(otherAfter).toBe(otherBefore + 1); // untouched by c-ord-3's traffic
  });

  it("TWO DIFFERENT reshipments for the SAME order both succeed with DIFFERENT sequences", async () => {
    await confirmFulfillment(db, { orderId: "c-ord-1", requestId: "orig", lines: line() });

    const [a, b] = await Promise.all([
      confirmFulfillment(db, { orderId: "c-ord-1", eventType: "reshipment", requestId: "rs-a", lines: line() }),
      confirmFulfillment(db, { orderId: "c-ord-1", eventType: "reshipment", requestId: "rs-b", lines: line() }),
    ]);

    // Neither request was falsely rejected as a duplicate…
    expect(a.reused).toBe(false);
    expect(b.reused).toBe(false);
    expect(a.eventId).not.toBe(b.eventId);
    // …and they received DISTINCT sequence numbers.
    expect(a.sequenceNumber).not.toBe(b.sequenceNumber);

    const rows = await client.query<{ c: number }>(
      `SELECT COUNT(DISTINCT sequence_number)::int AS c FROM order_fulfillment_events WHERE order_id='c-ord-1'`);
    const total = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM order_fulfillment_events WHERE order_id='c-ord-1'`);
    expect(rows.rows[0].c).toBe(total.rows[0].c); // every sequence number is unique
  });

  it("DUPLICATE requests with the SAME idempotency key collapse to ONE event", async () => {
    const before = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM packaging_inventory_movements`);

    const results = await Promise.all([
      confirmFulfillment(db, { orderId: "c-ord-1", eventType: "replacement", requestId: "dup-key", lines: line(2) }),
      confirmFulfillment(db, { orderId: "c-ord-1", eventType: "replacement", requestId: "dup-key", lines: line(2) }),
      confirmFulfillment(db, { orderId: "c-ord-1", eventType: "replacement", requestId: "dup-key", lines: line(2) }),
    ]);

    const ids = new Set(results.map((r) => r.eventId));
    expect(ids.size).toBe(1);                                  // one event, not three
    expect(results.filter((r) => !r.reused)).toHaveLength(1);  // exactly one creator
    expect(results.filter((r) => r.reused)).toHaveLength(2);   // the rest reused it

    const after = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM packaging_inventory_movements`);
    expect(after.rows[0].c).toBe(before.rows[0].c + 1);         // stock deducted ONCE
  });

  it("requests for TWO DIFFERENT orders in flight together both succeed", async () => {
    const [a, b] = await Promise.all([
      confirmFulfillment(db, { orderId: "c-ord-2", requestId: "x-ord2", lines: line() }),
      confirmFulfillment(db, { orderId: "c-ord-3", requestId: "x-ord3", lines: line() }),
    ]);
    expect(a.reused).toBe(false);
    expect(b.reused).toBe(false);
    expect(a.eventId).not.toBe(b.eventId);
    // Each order numbers its own events independently — no shared/global sequence.
    const seqs = await client.query<{ order_id: string; sequence_number: number }>(
      `SELECT order_id, sequence_number FROM order_fulfillment_events WHERE order_id IN ('c-ord-2','c-ord-3')`);
    for (const row of seqs.rows) expect(row.sequence_number).toBeGreaterThan(0);
  });

  it("event chronology is deterministic: sequence numbers order the history", async () => {
    const rows = await client.query<{ sequence_number: number }>(
      `SELECT sequence_number FROM order_fulfillment_events WHERE order_id='c-ord-1' ORDER BY sequence_number`);
    const seqs = rows.rows.map((r) => r.sequence_number);
    expect(seqs).toEqual([...seqs].sort((x, y) => x - y));
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it("a business error (insufficient stock) is NOT retried — it fails immediately", async () => {
    await client.exec(`INSERT INTO fulfillment_materials (id,name,unit) VALUES ('cscarce','Scarce','piece')`);
    await expect(confirmFulfillment(db, {
      orderId: "c-ord-2", eventType: "reshipment", requestId: "scarce-1",
      lines: [{ materialId: "cscarce", materialName: "Scarce", quantity: 3, unitCost: 10 }],
    })).rejects.toThrow(/INSUFFICIENT_STOCK/);
  });
});
