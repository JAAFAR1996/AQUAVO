import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "../../shared/schema.js";
import { confirmFulfillment, reverseFulfillmentEvent } from "../services/fulfillment-service.js";

const ROOT = process.cwd();
const migration = readFileSync(join(ROOT, "migrations/add_fulfillment_costing.sql"), "utf8");

// Real Drizzle over a real (WASM) Postgres — the actual service transactions run here.
let client: PGlite;
let db: any;

async function balance(materialId: string): Promise<number> {
  const r = await client.query<{ bal: number }>(
    `SELECT COALESCE(SUM(quantity),0)::float8 AS bal FROM packaging_inventory_movements WHERE material_id=$1`, [materialId]);
  return Number(r.rows[0].bal);
}
async function count(table: string, where = ""): Promise<number> {
  const r = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM ${table} ${where}`);
  return Number(r.rows[0].c);
}

describe("fulfillment service — real transactional integration (Drizzle + PGlite)", () => {
  beforeAll(async () => {
    client = new PGlite();
    await client.exec(`CREATE TABLE orders (id text PRIMARY KEY); INSERT INTO orders (id) VALUES ('ord-1'),('ord-2');`);
    await client.exec(migration);
    db = drizzle(client, { schema });
    // catalog material + starting stock (a purchase receipt of +100)
    await client.exec(`INSERT INTO fulfillment_materials (id,name,category,unit,current_unit_cost) VALUES ('box','Small box','box','piece','1500'),('sticker','AQUAVO sticker','sticker','piece','200'),('lowstock','Rare label','label','piece','50')`);
    await client.exec(`INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,idempotency_key) VALUES ('rc-box','box','purchase_receipt','100','rc:box'),('rc-st','sticker','purchase_receipt','100','rc:sticker'),('rc-low','lowstock','purchase_receipt','1','rc:low')`);
  });

  it("confirms an original event: creates event + lines + usage movements; computes actual cost", async () => {
    const r = await confirmFulfillment(db, {
      orderId: "ord-1", requestId: "req-1",
      lines: [
        { materialId: "box", materialName: "Small box", quantity: 1, unitCost: 1500 },
        { materialId: "sticker", materialName: "AQUAVO sticker", quantity: 2, unitCost: 200 },
      ],
    });
    expect(r.reused).toBe(false);
    expect(r.actualCost).toBe(1900);          // 1500 + 2*200
    expect(r.costStatus).toBe("exact");
    expect(await count("order_fulfillment_lines")).toBe(2);
    expect(await balance("box")).toBe(99);    // 100 − 1
    expect(await balance("sticker")).toBe(98); // 100 − 2
  });

  it("retry with the SAME idempotency key returns the existing event — no double cost/stock", async () => {
    const before = await count("packaging_inventory_movements");
    const r = await confirmFulfillment(db, {
      orderId: "ord-1", requestId: "req-1",
      lines: [{ materialId: "box", materialName: "Small box", quantity: 1, unitCost: 1500 }],
    });
    expect(r.reused).toBe(true);
    expect(await count("packaging_inventory_movements")).toBe(before); // no new movements
    expect(await balance("box")).toBe(99);                              // NOT deducted twice
  });

  it("(item 2) a SECOND original with a different key is rejected", async () => {
    await expect(confirmFulfillment(db, {
      orderId: "ord-1", requestId: "req-2-different",
      lines: [{ materialId: "box", materialName: "Small box", quantity: 1, unitCost: 1500 }],
    })).rejects.toThrow(/ORIGINAL_ALREADY_EXISTS/);
  });

  it("allows two reshipments (multi-event)", async () => {
    const a = await confirmFulfillment(db, { orderId: "ord-1", eventType: "reshipment", requestId: "rs-1",
      lines: [{ materialId: "box", materialName: "Small box", quantity: 1, unitCost: 1500 }] });
    const b = await confirmFulfillment(db, { orderId: "ord-1", eventType: "reshipment", requestId: "rs-2",
      lines: [{ materialId: "box", materialName: "Small box", quantity: 1, unitCost: 1500 }] });
    expect(a.reused).toBe(false);
    expect(b.reused).toBe(false);
    expect(await count("order_fulfillment_events", "WHERE order_id='ord-1' AND event_type='reshipment'")).toBe(2);
  });

  it("(item 8) insufficient stock aborts the whole transaction — NO partial rows", async () => {
    const evBefore = await count("order_fulfillment_events");
    const mvBefore = await count("packaging_inventory_movements");
    await expect(confirmFulfillment(db, {
      orderId: "ord-2", requestId: "low-1",
      lines: [{ materialId: "lowstock", materialName: "Rare label", quantity: 5, unitCost: 50 }], // only 1 in stock
    })).rejects.toThrow(/INSUFFICIENT_STOCK/);
    expect(await count("order_fulfillment_events")).toBe(evBefore); // rolled back cleanly
    expect(await count("packaging_inventory_movements")).toBe(mvBefore);
  });

  it("reverses an event: reversing movements added, original marked reversed, original rows immutable", async () => {
    // reshipment rs-1's event id
    const ev = await client.query<{ id: string }>(`SELECT id FROM order_fulfillment_events WHERE idempotency_key='ord-1:reshipment:rs-1'`);
    const eventId = ev.rows[0].id;
    const balBefore = await balance("box");
    const rev = await reverseFulfillmentEvent(db, eventId, "customer refused");
    expect(rev.reversalEventId).toBeTruthy();
    expect(await balance("box")).toBe(balBefore + 1); // usage of -1 reversed with +1
    const state = await client.query<{ workflow_state: string }>(`SELECT workflow_state FROM order_fulfillment_events WHERE id=$1`, [eventId]);
    expect(state.rows[0].workflow_state).toBe("reversed");
  });

  it("(item 4) confirmed lines are immutable — direct UPDATE/DELETE is blocked by the DB", async () => {
    await expect(client.exec(`UPDATE order_fulfillment_lines SET total_cost='1' WHERE order_id='ord-1'`)).rejects.toBeTruthy();
    await expect(client.exec(`DELETE FROM order_fulfillment_lines WHERE order_id='ord-1'`)).rejects.toBeTruthy();
    await expect(client.exec(`UPDATE packaging_inventory_movements SET quantity='0' WHERE material_id='box'`)).rejects.toBeTruthy();
  });
});
