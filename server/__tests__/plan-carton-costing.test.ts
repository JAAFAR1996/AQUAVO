// Phase 7: the carton the planner chose is actually paid for.
//
// Reserving and consuming move INVENTORY. Nothing moved COST: the packing plan
// knew the carton, the fulfillment draft that becomes the immutable cost
// snapshot did not, and nothing connected them. A carton could be planned,
// reserved, consumed and physically deducted from stock while its price never
// appeared in the order's internal profit.
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";
import { cartonCatalogDdl } from "./helpers/packing-migrations.js";
import { syncPlanCartonsToDraft } from "../services/plan-carton-costing.js";
import { getOrCreateDraft, confirmDraft, getDraft } from "../services/fulfillment-draft-service.js";
import { proposeMaterialCost, approveMaterialCost } from "../services/material-cost-service.js";

const ROOT = process.cwd();
const sqlOf = (f: string) => readFileSync(join(ROOT, "migrations", f), "utf8");

let client: PGlite;
let db: FulfillmentDb;
let run = 0;
let ORDER = "";
let CARTON = "";

async function seedPlan(orderId: string, materialId: string, cartons: number): Promise<void> {
  const planId = `plan-${orderId}`;
  await client.exec(
    `INSERT INTO order_packing_plans (id, order_id, state, engine_version, plan_hash, validation_report)
     VALUES ('${planId}','${orderId}','validated','test','h-${orderId}','{"ok":true}'::jsonb)`,
  );
  for (let i = 0; i < cartons; i++) {
    await client.exec(
      `INSERT INTO order_packing_plan_items
         (id, plan_id, carton_index, material_id, product_id, product_name_snapshot,
          pos_x_mm,pos_y_mm,pos_z_mm,dim_x_mm,dim_y_mm,dim_z_mm,rotation_type,weight_g)
       VALUES ('${planId}-i${i}','${planId}',${i},'${materialId}','prod-1','منتج',
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
    INSERT INTO products (id,name) VALUES ('prod-1','منتج');
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
  ORDER = `c-ord-${run}`;
  CARTON = `c-box-${run}`;
  await client.exec(`
    INSERT INTO orders (id) VALUES ('${ORDER}');
    INSERT INTO fulfillment_materials (id,name,material_kind,stock_tracked,unit,active)
      VALUES ('${CARTON}','كارتونة وسط','carton',true,'piece',true);
    INSERT INTO packaging_inventory_movements (id,material_id,movement_type,quantity,idempotency_key)
      VALUES ('rc-${run}','${CARTON}','purchase_receipt','20','rc:cost:${run}');
  `);
});

/** Give the carton an approved cost, the only way a price becomes effective. */
async function priceCarton(amount: number): Promise<void> {
  const rec = await proposeMaterialCost(db, {
    materialId: CARTON, costBasis: "verified_manual_standard",
    unitCost: amount, reason: "سعر شراء الكارتونة", createdBy: "owner",
  });
  await approveMaterialCost(db, { costRecordId: rec.id, approvedBy: "owner" });
}

describe("the planned carton reaches the cost snapshot", () => {
  it("adds the carton as a draft line priced from its approved cost", async () => {
    await priceCarton(250);
    await seedPlan(ORDER, CARTON, 1);

    const out = await syncPlanCartonsToDraft(db, ORDER);
    expect(out.detail).toBe("synced");

    const draft = await getOrCreateDraft(db, { orderId: ORDER });
    const line = draft.lines.find((l) => l.materialId === CARTON);
    expect(line).toBeDefined();
    expect(Number(line!.quantity)).toBe(1);
    expect(draft.expectedCost).toBe(250);
  });

  it("charges one carton per carton, not per item packed inside it", async () => {
    await priceCarton(250);
    await seedPlan(ORDER, CARTON, 3);
    await syncPlanCartonsToDraft(db, ORDER);

    const draft = await getOrCreateDraft(db, { orderId: ORDER });
    expect(Number(draft.lines.find((l) => l.materialId === CARTON)!.quantity)).toBe(3);
    expect(draft.expectedCost).toBe(750);
  });

  it("is idempotent — syncing twice does not add a second carton line", async () => {
    await priceCarton(250);
    await seedPlan(ORDER, CARTON, 2);
    await syncPlanCartonsToDraft(db, ORDER);
    const second = await syncPlanCartonsToDraft(db, ORDER);

    expect(second.detail).toBe("already_current");
    const draft = await getOrCreateDraft(db, { orderId: ORDER });
    expect(draft.lines.filter((l) => l.materialId === CARTON)).toHaveLength(1);
    expect(draft.expectedCost).toBe(500);
  });

  it("corrects the quantity in place when the plan changes", async () => {
    await priceCarton(250);
    await seedPlan(ORDER, CARTON, 3);
    await syncPlanCartonsToDraft(db, ORDER);

    // Re-planned down to one carton.
    await client.exec(
      `DELETE FROM order_packing_plan_items WHERE plan_id='plan-${ORDER}' AND carton_index > 0`,
    );
    const out = await syncPlanCartonsToDraft(db, ORDER);
    expect(out.detail).toBe("synced");

    const draft = await getOrCreateDraft(db, { orderId: ORDER });
    // Corrected, not appended: the order is not charged for both plans.
    expect(draft.lines.filter((l) => l.materialId === CARTON)).toHaveLength(1);
    expect(draft.expectedCost).toBe(250);
  });

  it("leaves an unpriced carton unknown rather than free", async () => {
    await seedPlan(ORDER, CARTON, 1); // no approved cost
    await syncPlanCartonsToDraft(db, ORDER);

    const draft = await getOrCreateDraft(db, { orderId: ORDER });
    const line = draft.lines.find((l) => l.materialId === CARTON)!;
    expect(line.unitCost).toBeNull();
    // A missing price and a free carton are different facts.
    expect(draft.expectedCost).toBeNull();
    expect(draft.missingCostLines.length).toBeGreaterThan(0);
  });

  it("does nothing when the order has no validated plan", async () => {
    const out = await syncPlanCartonsToDraft(db, ORDER);
    expect(out.detail).toBe("no_validated_plan");
  });
});

describe("a confirmed snapshot is not rewritten", () => {
  it("refuses to change the carton after the draft is consumed", async () => {
    await priceCarton(250);
    await seedPlan(ORDER, CARTON, 1);
    await syncPlanCartonsToDraft(db, ORDER);

    const draft = await getOrCreateDraft(db, { orderId: ORDER });
    const res = await confirmDraft(db, { draftId: draft.id });
    expect(res.actualCost).toBe(250);

    // Re-plan after shipping, then try to sync again.
    await client.exec(
      `INSERT INTO order_packing_plan_items
         (id, plan_id, carton_index, material_id, product_id, product_name_snapshot,
          pos_x_mm,pos_y_mm,pos_z_mm,dim_x_mm,dim_y_mm,dim_z_mm,rotation_type,weight_g)
       VALUES ('extra-${run}','plan-${ORDER}',9,'${CARTON}','prod-1','منتج',
               0,0,0,100,100,100,0,500)`,
    );
    const out = await syncPlanCartonsToDraft(db, ORDER);
    expect(out.detail).toBe("draft_not_editable");

    // The frozen snapshot still says 250. History is not rewritten.
    const after = await getDraft(db, draft.id);
    expect(after.state).toBe("consumed");
  });
});
