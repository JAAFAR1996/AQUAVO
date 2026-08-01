// GENUINE multi-connection PostgreSQL test for carton consumption.
//
// WHY THIS FILE EXISTS SEPARATELY FROM fulfillment-concurrency.test.ts.
// That suite runs on PGlite, which is a SINGLE-CONNECTION Postgres: it serialises
// statements instead of interleaving them, and says so in its own header. It can
// prove allocation semantics, but it structurally CANNOT reproduce two sessions
// racing for one carton -- which is exactly the defect this file covers. Proving
// that needs two real, independent backends contending for the same advisory lock.
//
// So this opens TWO separate Neon pools. Each `Pool` is its own connection to its
// own Postgres backend, so `pg_advisory_xact_lock` genuinely blocks one while the
// other holds it.
//
// HOW TO RUN. Opt-in, because it needs a real database:
//
//   CARTON_CONCURRENCY_TEST_URL='<neon test-branch connection string>' npx vitest run \
//     server/__tests__/carton-consumption-concurrency.pg.test.ts
//
// or put that one line in `.env.carton-test` (gitignored by `.env.*`). Without it
// the suite SKIPS rather than fails, so `npm test` stays runnable for everyone.
//
// PRODUCTION SAFETY -- read this before changing the guard below.
// The test refuses to run unless migrations 0049 AND 0050 are applied and not
// rolled back. Those two exist ONLY on the test branch; Production is pinned at
// 0048. So pointing this file at Production cannot execute a single write -- it
// aborts in beforeAll. That is a structural interlock, not a naming convention.
//
// CLEANUP. `pim_immutable` (add_fulfillment_costing.sql:219) makes
// packaging_inventory_movements reject UPDATE and DELETE, and confirmed events and
// their lines are immutable too. Ledger rows therefore CANNOT be deleted -- by
// design, and this test does not try. Isolation comes from per-run unique ids, the
// same convention the rest of the fulfillment suite uses. What IS mutable
// (reservations) is deleted, and the fixture materials are archived so they never
// appear in an admin list. Residue lands only on a disposable test branch.
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../../shared/schema.js";
import { confirmFulfillment } from "../services/fulfillment-service.js";
import { reserveCartons } from "../services/carton-reservation-service.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";

function resolveUrl(): string | undefined {
  if (process.env.CARTON_CONCURRENCY_TEST_URL) return process.env.CARTON_CONCURRENCY_TEST_URL;
  // Fallback so the credential can live in a gitignored file instead of a shell
  // history entry.
  const file = ".env.carton-test";
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*CARTON_CONCURRENCY_TEST_URL\s*=\s*(.+?)\s*$/.exec(line);
    if (m) return m[1].replace(/^['"]|['"]$/g, "");
  }
  return undefined;
}

const URL = resolveUrl();
const RUN = Boolean(URL);

// Two INDEPENDENT pools => two independent Postgres backends.
let poolA: Pool;
let poolB: Pool;
let dbA: FulfillmentDb;
let dbB: FulfillmentDb;

const RUN_ID = randomUUID().slice(0, 8);
const tag = (s: string) => `ctest-${RUN_ID}-${s}`;
const createdOrders: string[] = [];
const createdMaterials: string[] = [];

async function makeOrder(): Promise<string> {
  const id = tag(`ord-${createdOrders.length + 1}`);
  await poolA.query(
    `INSERT INTO orders (id, total, items, status) VALUES ($1, '0', '[]'::jsonb, 'pending')`,
    [id],
  );
  createdOrders.push(id);
  return id;
}

/** A stock-tracked carton seeded with an exact opening balance. */
async function makeCarton(onHand: number): Promise<string> {
  const id = tag(`mat-${createdMaterials.length + 1}`);
  await poolA.query(
    `INSERT INTO fulfillment_materials (id, name, category, unit, stock_tracked)
     VALUES ($1, $2, 'box', 'piece', true)`,
    [id, `اختبار كارتونة ${RUN_ID}`],
  );
  createdMaterials.push(id);
  if (onHand !== 0) {
    await poolA.query(
      `INSERT INTO packaging_inventory_movements (id, material_id, movement_type, quantity, idempotency_key)
       VALUES ($1, $2, 'purchase_receipt', $3, $4)`,
      [randomUUID(), id, String(onHand), `ctest:${RUN_ID}:open:${id}`],
    );
  }
  return id;
}

/** An accounting-only material: never stock-guarded, never locked. */
async function makeAccountingMaterial(): Promise<string> {
  const id = tag(`acct-${createdMaterials.length + 1}`);
  await poolA.query(
    `INSERT INTO fulfillment_materials (id, name, category, unit, stock_tracked)
     VALUES ($1, $2, 'label', 'piece', false)`,
    [id, `اختبار ملصق ${RUN_ID}`],
  );
  createdMaterials.push(id);
  return id;
}

async function onHandOf(materialId: string): Promise<number> {
  const r = await poolA.query(
    `SELECT COALESCE(SUM(quantity),0) AS q FROM packaging_inventory_movements WHERE material_id=$1`,
    [materialId],
  );
  return Number(r.rows[0].q);
}

async function movementCount(materialId: string): Promise<number> {
  const r = await poolA.query(
    `SELECT count(*) AS n FROM packaging_inventory_movements
      WHERE material_id=$1 AND movement_type='fulfillment_usage'`,
    [materialId],
  );
  return Number(r.rows[0].n);
}

async function reservationStates(orderId: string): Promise<string[]> {
  const r = await poolA.query(
    `SELECT state FROM carton_reservations WHERE order_id=$1 ORDER BY state`,
    [orderId],
  );
  return r.rows.map((x: { state: string }) => x.state);
}

function cartonLine(materialId: string, qty: number) {
  return { materialId, materialName: "carton", quantity: qty, unitCost: 1000 };
}

describe.skipIf(!RUN)("carton consumption — real PostgreSQL, two connections", () => {
  beforeAll(async () => {
    neonConfig.webSocketConstructor = ws;
    poolA = new Pool({ connectionString: URL });
    poolB = new Pool({ connectionString: URL });
    dbA = drizzle(poolA, { schema }) as unknown as FulfillmentDb;
    dbB = drizzle(poolB, { schema }) as unknown as FulfillmentDb;

    // STRUCTURAL PRODUCTION INTERLOCK -- see the header.
    const guard = await poolA.query(
      `SELECT count(*) AS n FROM schema_migrations
        WHERE version IN ('0049_default_preparation_profile','0050_backfill_stock_tracked')
          AND rolled_back_at IS NULL`,
    );
    if (Number(guard.rows[0].n) !== 2) {
      throw new Error(
        "REFUSING TO RUN: 0049/0050 are not both applied here. They exist only on the " +
          "carton-planner test branch; Production is pinned at 0048. Point this at the test branch.",
      );
    }
  }, 60_000);

  afterAll(async () => {
    // Only the mutable rows. See the header on why the ledger is not deleted.
    if (poolA) {
      for (const o of createdOrders) {
        await poolA.query(`DELETE FROM carton_reservations WHERE order_id=$1`, [o]).catch(() => {});
      }
      for (const m of createdMaterials) {
        await poolA
          .query(`UPDATE fulfillment_materials SET archived_at=now() WHERE id=$1`, [m])
          .catch(() => {});
      }
    }
    await poolA?.end();
    await poolB?.end();
  }, 60_000);

  // A ─────────────────────────────────────────────────────────────────────────
  it("A: a reservation held by another order blocks confirmation and keeps the stock", async () => {
    const carton = await makeCarton(1);
    const orderA = await makeOrder();
    const orderB = await makeOrder();

    await reserveCartons(dbA, {
      orderId: orderA,
      quantities: new Map([[carton, 1]]),
      requestId: `ctest:${RUN_ID}:A:reserve`,
    });

    // B has no reservation. The single carton is spoken for.
    await expect(
      confirmFulfillment(dbB, {
        orderId: orderB,
        requestId: `ctest:${RUN_ID}:A:confirmB`,
        lines: [cartonLine(carton, 1)],
      }),
    ).rejects.toThrow(/INSUFFICIENT_STOCK/);

    expect(await onHandOf(carton)).toBe(1);        // nothing deducted
    expect(await movementCount(carton)).toBe(0);
    expect(await reservationStates(orderA)).toEqual(["active"]); // A still holds it
  }, 120_000);

  // B ─────────────────────────────────────────────────────────────────────────
  it("B: the owning order consumes its own reservation exactly once", async () => {
    const carton = await makeCarton(1);
    const orderA = await makeOrder();

    await reserveCartons(dbA, {
      orderId: orderA,
      quantities: new Map([[carton, 1]]),
      requestId: `ctest:${RUN_ID}:B:reserve`,
    });

    const res = await confirmFulfillment(dbA, {
      orderId: orderA,
      requestId: `ctest:${RUN_ID}:B:confirm`,
      lines: [cartonLine(carton, 1)],
    });
    expect(res.reused).toBe(false);

    expect(await onHandOf(carton)).toBe(0);
    expect(await movementCount(carton)).toBe(1);              // ONE deduction only
    expect(await reservationStates(orderA)).toEqual(["consumed"]);
  }, 120_000);

  // C ─────────────────────────────────────────────────────────────────────────
  it("C: two orders racing for the last carton on two connections — exactly one wins", async () => {
    const carton = await makeCarton(1);
    const o1 = await makeOrder();
    const o2 = await makeOrder();

    // Fired together on two SEPARATE backends. This is the case PGlite cannot express.
    const results = await Promise.allSettled([
      confirmFulfillment(dbA, {
        orderId: o1,
        requestId: `ctest:${RUN_ID}:C:1`,
        lines: [cartonLine(carton, 1)],
      }),
      confirmFulfillment(dbB, {
        orderId: o2,
        requestId: `ctest:${RUN_ID}:C:2`,
        lines: [cartonLine(carton, 1)],
      }),
    ]);

    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(String((failed[0] as PromiseRejectedResult).reason)).toMatch(/INSUFFICIENT_STOCK/);

    expect(await onHandOf(carton)).toBe(0);       // never -1
    expect(await movementCount(carton)).toBe(1);  // exactly one deduction
  }, 120_000);

  // D ─────────────────────────────────────────────────────────────────────────
  it("D: retrying a confirmation changes nothing", async () => {
    const carton = await makeCarton(1);
    const order = await makeOrder();

    await reserveCartons(dbA, {
      orderId: order,
      quantities: new Map([[carton, 1]]),
      requestId: `ctest:${RUN_ID}:D:reserve`,
    });

    const first = await confirmFulfillment(dbA, {
      orderId: order,
      requestId: `ctest:${RUN_ID}:D:confirm`,
      lines: [cartonLine(carton, 1)],
    });

    // Same requestId, and deliberately the OTHER connection.
    const retry = await confirmFulfillment(dbB, {
      orderId: order,
      requestId: `ctest:${RUN_ID}:D:confirm`,
      lines: [cartonLine(carton, 1)],
    });

    expect(retry.reused).toBe(true);
    expect(retry.eventId).toBe(first.eventId);
    expect(await onHandOf(carton)).toBe(0);
    expect(await movementCount(carton)).toBe(1);
    expect(await reservationStates(order)).toEqual(["consumed"]); // not consumed twice
  }, 120_000);

  // E ─────────────────────────────────────────────────────────────────────────
  it("E: another order's reservations reduce what is freely available", async () => {
    const carton = await makeCarton(3);
    const holder = await makeOrder();
    const applicant = await makeOrder();

    await reserveCartons(dbA, {
      orderId: holder,
      quantities: new Map([[carton, 2]]),
      requestId: `ctest:${RUN_ID}:E:reserve`,
    });

    // 3 on hand, 2 reserved elsewhere => only 1 free. Asking for 2 must fail.
    await expect(
      confirmFulfillment(dbB, {
        orderId: applicant,
        requestId: `ctest:${RUN_ID}:E:confirm2`,
        lines: [cartonLine(carton, 2)],
      }),
    ).rejects.toThrow(/INSUFFICIENT_STOCK/);
    expect(await onHandOf(carton)).toBe(3);

    // Asking for the 1 that genuinely is free must succeed.
    const ok = await confirmFulfillment(dbB, {
      orderId: applicant,
      requestId: `ctest:${RUN_ID}:E:confirm1`,
      lines: [cartonLine(carton, 1)],
    });
    expect(ok.reused).toBe(false);
    expect(await onHandOf(carton)).toBe(2);
    expect(await reservationStates(holder)).toEqual(["active", "active"]); // untouched
  }, 120_000);

  // F ─────────────────────────────────────────────────────────────────────────
  it("F: an accounting-only material is never stock-guarded but is still costed", async () => {
    const label = await makeAccountingMaterial();
    const order = await makeOrder();

    // stock_tracked = false, zero movements. Under the old per-line guard this
    // summed to 0 and rejected the order outright.
    const res = await confirmFulfillment(dbA, {
      orderId: order,
      requestId: `ctest:${RUN_ID}:F:confirm`,
      lines: [{ materialId: label, materialName: "ملصق السعر", quantity: 1, unitCost: 50 }],
    });

    expect(res.reused).toBe(false);
    expect(res.actualCost).toBe(50);   // costed exactly once
    expect(await onHandOf(label)).toBe(-1); // a movement is still recorded, unguarded
  }, 120_000);

  // G ─────────────────────────────────────────────────────────────────────────
  it("G: two lines of one event carrying the same carton are summed, not checked twice", async () => {
    const carton = await makeCarton(1);
    const order = await makeOrder();

    // 1 on hand, two lines of 1 each. Checked per-line, both saw 1 and passed,
    // and the event posted -2 against a stock of 1.
    await expect(
      confirmFulfillment(dbA, {
        orderId: order,
        requestId: `ctest:${RUN_ID}:G:confirm`,
        lines: [cartonLine(carton, 1), cartonLine(carton, 1)],
      }),
    ).rejects.toThrow(/INSUFFICIENT_STOCK/);

    expect(await onHandOf(carton)).toBe(1);
    expect(await movementCount(carton)).toBe(0);
  }, 120_000);
});
