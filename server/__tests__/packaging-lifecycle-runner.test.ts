// Phase 4: carton stock actually moves when an order moves.
//
// decideLifecycleAction() was correct and pure, and was called by nothing but its
// own test. No status transition anywhere reserved, consumed or released a
// carton, so reservations only ever happened if an admin manually POSTed one.
// These tests run the executor against a real PostgreSQL.
//
// The invariants that matter most here are the boring ones: a repeated
// transition must not take stock twice, and a shortfall must fail rather than
// quietly proceed.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";
import { cartonCatalogDdl } from "./helpers/packing-migrations.js";
import { applyPackagingLifecycle } from "../services/packaging-lifecycle-runner.js";

const ROOT = process.cwd();
const sqlOf = (f: string) => readFileSync(join(ROOT, "migrations", f), "utf8");

let client: PGlite;
let db: FulfillmentDb;

// Fresh order ids per test. order_fulfillment_events is immutable by trigger, so
// it cannot be truncated between tests, and orders it references cannot be
// deleted either. Unique ids give isolation without fighting that guard.
let run = 0;
let A = "";
let B = "";

async function one<T>(q: string): Promise<T | undefined> {
  return (await client.query<T>(q)).rows[0];
}
async function scalar(q: string): Promise<number> {
  const r = await one<Record<string, unknown>>(q);
  return Number(Object.values(r ?? {})[0] ?? 0);
}

// Per-run so each test gets its own shelf. packaging_inventory_movements and
// order_fulfillment_events are immutable by trigger and cannot be truncated
// between tests, so isolation comes from fresh ids rather than cleanup.
let CARTON = "";

/** available = receipts - consumed usage; reserved is a separate claim. */
async function available(): Promise<number> {
  return scalar(
    `SELECT COALESCE(SUM(quantity),0)::float8 AS b FROM packaging_inventory_movements WHERE material_id='${CARTON}'`,
  );
}
async function activeReservations(orderId: string): Promise<number> {
  return scalar(
    `SELECT COALESCE(SUM(quantity),0)::float8 AS n FROM carton_reservations
      WHERE order_id='${orderId}' AND state='active'`,
  );
}

/**
 * A validated plan for `orderId` needing `cartons` boxes.
 *
 * Satisfies opp_validated_evidence_chk (a validated plan must carry its
 * plan_hash AND validation_report) and oppi_geometry_chk (real positive
 * geometry). Both are genuine guards; a fixture that dodged them would be
 * testing a plan the database would never accept.
 */
async function seedValidatedPlan(orderId: string, cartons: number): Promise<void> {
  const planId = `plan-${orderId}`;
  await client.exec(
    `INSERT INTO order_packing_plans (id, order_id, state, engine_version, plan_hash, validation_report)
     VALUES ('${planId}','${orderId}','validated','test','h-${orderId}','{"ok":true,"rejections":[]}'::jsonb)`,
  );
  for (let i = 0; i < cartons; i++) {
    await client.exec(
      `INSERT INTO order_packing_plan_items
         (id, plan_id, carton_index, material_id, product_id, product_name_snapshot,
          pos_x_mm, pos_y_mm, pos_z_mm, dim_x_mm, dim_y_mm, dim_z_mm, rotation_type, weight_g)
       VALUES ('${planId}-i${i}','${planId}',${i},'${CARTON}','prod-1','منتج',
               0,0,0,100,100,100,0,500)`,
    );
  }
}

beforeAll(async () => {
  client = new PGlite();
  await client.exec(`
    CREATE TABLE schema_migrations (version text PRIMARY KEY, checksum text,
      applied_at timestamptz NOT NULL DEFAULT now(), applied_by text,
      rolled_back_at timestamptz, notes text);
    CREATE TABLE settings (key text PRIMARY KEY, value text NOT NULL, updated_at timestamp DEFAULT now());
    CREATE TABLE orders (id text PRIMARY KEY, status text NOT NULL DEFAULT 'pending');
    CREATE TABLE products (id text PRIMARY KEY, name text NOT NULL, deleted_at timestamp);
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $BODY$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $BODY$ LANGUAGE plpgsql;
  `);
  await client.exec(sqlOf("add_fulfillment_costing.sql"));
  await client.exec(sqlOf("add_fulfillment_hardening.sql"));
  await client.exec(sqlOf("add_pim_line_identity.sql"));
  await client.exec(cartonCatalogDdl());
  await client.exec(sqlOf("0041_product_packing_data.sql"));
  await client.exec(sqlOf("0042_carton_reservations.sql"));
  await client.exec(sqlOf("0043_order_packing_plans.sql"));

  db = drizzle(client, { schema }) as unknown as FulfillmentDb;
});

beforeEach(async () => {
  run += 1;
  A = `o1-${run}`;
  B = `o2-${run}`;
  CARTON = `life-box-${run}`;
  await client.exec(`
    INSERT INTO products (id,name) VALUES ('prod-1','منتج') ON CONFLICT DO NOTHING;
    INSERT INTO orders (id) VALUES ('${A}'),('${B}');
    INSERT INTO fulfillment_materials (id,name,material_kind,stock_tracked,unit)
      VALUES ('${CARTON}','كارتونة وسط','carton',true,'piece');
    INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,idempotency_key)
      VALUES ('rc-${run}','${CARTON}','purchase_receipt','5','rc:life:${run}');
  `);
});

describe("confirmation reserves, and does so only once", () => {
  it("reserves the planned cartons when the order is confirmed", async () => {
    await seedValidatedPlan(A, 2);
    const out = await applyPackagingLifecycle(db, {
      orderId: A, newStatus: "confirmed", previousStatus: "pending",
    });
    expect(out.action).toBe("reserve");
    expect(out.detail).toBe("reserved");
    expect(await activeReservations(A)).toBe(2);
    // A hold is not a consumption: the shelf balance has not moved.
    expect(await available()).toBe(5);
  });

  it("repeating the same transition does not reserve twice", async () => {
    await seedValidatedPlan(A, 2);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" });
    const second = await applyPackagingLifecycle(db, {
      orderId: A, newStatus: "confirmed", previousStatus: "pending",
    });
    expect(second.detail).toBe("reservation_reused");
    expect(await activeReservations(A)).toBe(2);
  });

  it("processing after confirmed does not stack a second hold", async () => {
    await seedValidatedPlan(A, 2);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" });
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "processing", previousStatus: "confirmed" });
    expect(await activeReservations(A)).toBe(2);
  });

  it("fails loudly rather than reserving cartons that do not exist", async () => {
    await seedValidatedPlan(A, 9); // only 5 on the shelf
    // The message is Arabic for the admin; the machine-readable code is on the
    // error object, and that is what callers branch on.
    await expect(
      applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_CARTON_STOCK" });

    // Nothing partial was left behind, and stock never went negative.
    expect(await activeReservations(A)).toBe(0);
    expect(await available()).toBe(5);
  });

  it("does not reserve when there is no validated plan — manual packing is legitimate", async () => {
    const out = await applyPackagingLifecycle(db, {
      orderId: A, newStatus: "confirmed", previousStatus: "pending",
    });
    expect(out.detail).toBe("no_validated_plan");
    expect(await activeReservations(A)).toBe(0);
  });
});

describe("shipment consumes, cancellation releases", () => {
  /**
   * A confirmed original fulfillment carrying canonical carton evidence.
   *
   * The line is not decoration. Since 618c1c2f the runner consumes a hold only
   * when a confirmed event actually names a stock-tracked carton, so that the
   * reservation closes against the same event that already moved the stock and
   * never posts a second movement. An event with no line is, correctly, reported
   * as carton_snapshot_missing.
   */
  async function confirmedEvent(orderId: string): Promise<void> {
    await client.exec(
      `INSERT INTO order_fulfillment_events
         (id, order_id, event_type, sequence_number, idempotency_key, workflow_state, cost_status)
       VALUES ('ev-${orderId}','${orderId}','original',1,'idem-${orderId}','confirmed','exact');
       INSERT INTO order_fulfillment_lines
         (id, event_id, order_id, material_id, material_name_snapshot, quantity, cost_status)
       VALUES ('evl-${orderId}','ev-${orderId}','${orderId}','${CARTON}','كارتونة وسط',1,'exact')`,
    );
  }

  it("turns the hold into a consumption at shipment", async () => {
    await seedValidatedPlan(A, 2);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" });
    await confirmedEvent(A);

    const out = await applyPackagingLifecycle(db, {
      orderId: A, newStatus: "shipped", previousStatus: "processing",
    });
    expect(out.detail).toBe("consumed");
    expect(await activeReservations(A)).toBe(0);
    expect(await scalar(`SELECT count(*) n FROM carton_reservations WHERE order_id='${A}' AND state='consumed'`)).toBe(1);
  });

  it("re-shipping does not consume a second time", async () => {
    await seedValidatedPlan(A, 2);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" });
    await confirmedEvent(A);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "shipped", previousStatus: "processing" });
    const again = await applyPackagingLifecycle(db, {
      orderId: A, newStatus: "shipped", previousStatus: "delivered",
    });
    expect(again.detail).toBe("noop");
    expect(await scalar(`SELECT count(*) n FROM carton_reservations WHERE order_id='${A}' AND state='consumed'`)).toBe(1);
  });

  it("does not consume without a confirmed fulfillment event to consume against", async () => {
    await seedValidatedPlan(A, 2);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" });
    const out = await applyPackagingLifecycle(db, {
      orderId: A, newStatus: "shipped", previousStatus: "processing",
    });
    // confirmFulfillment is what deducts stock; closing the claim without it
    // would let a later real event deduct a second time.
    expect(out.detail).toBe("no_fulfillment_event");
    expect(await activeReservations(A)).toBe(2);
  });

  it("releases the hold when a pre-shipment order is cancelled, with no loss", async () => {
    await seedValidatedPlan(A, 2);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" });
    const out = await applyPackagingLifecycle(db, {
      orderId: A, newStatus: "cancelled", previousStatus: "confirmed",
    });
    expect(out.action).toBe("release");
    expect(await activeReservations(A)).toBe(0);
    expect(await available()).toBe(5); // nothing was ever consumed
  });

  it("cancelling twice releases nothing further", async () => {
    await seedValidatedPlan(A, 2);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" });
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "cancelled", previousStatus: "confirmed" });
    const again = await applyPackagingLifecycle(db, {
      orderId: A, newStatus: "cancelled", previousStatus: "pending",
    });
    expect(again.detail).toBe("nothing_to_release");
  });

  it("a shipped order that comes back is classified, never restocked", async () => {
    await seedValidatedPlan(A, 2);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" });
    await confirmedEvent(A);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "shipped", previousStatus: "processing" });

    const out = await applyPackagingLifecycle(db, {
      orderId: A, newStatus: "returned", previousStatus: "delivered",
    });
    expect(out.action).toBe("classify_return_loss");
    // A physically destroyed carton must not reappear on the shelf.
    expect(out.detail).toBe("noop");
    expect(await scalar(`SELECT count(*) n FROM carton_reservations WHERE order_id='${A}' AND state='consumed'`)).toBe(1);
  });
});

describe("orders do not interfere with each other", () => {
  it("cancelling one order leaves another order's hold untouched", async () => {
    await seedValidatedPlan(A, 2);
    await seedValidatedPlan(B, 1);
    await applyPackagingLifecycle(db, { orderId: A, newStatus: "confirmed", previousStatus: "pending" });
    await applyPackagingLifecycle(db, { orderId: B, newStatus: "confirmed", previousStatus: "pending" });

    await applyPackagingLifecycle(db, { orderId: A, newStatus: "cancelled", previousStatus: "confirmed" });
    expect(await activeReservations(A)).toBe(0);
    expect(await activeReservations(B)).toBe(1);
  });
});
