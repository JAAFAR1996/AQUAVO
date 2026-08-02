import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import { cartonCatalogDdl } from "./helpers/packing-migrations.js";
import { setupCartonAtomically, type CartonOnboardingInput } from "../services/carton-onboarding-service.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";

const ROOT = process.cwd();
const base = readFileSync(join(ROOT, "migrations/add_fulfillment_costing.sql"), "utf8");
const hardening = readFileSync(join(ROOT, "migrations/add_fulfillment_hardening.sql"), "utf8");
const lineIdentity = readFileSync(join(ROOT, "migrations/add_pim_line_identity.sql"), "utf8");

const auditTable = `
CREATE TABLE IF NOT EXISTS accounting_audit_trail (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  field_name text,
  old_value_json jsonb,
  new_value_json jsonb,
  reason text,
  performed_by text,
  performed_by_name text,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);`;

let client: PGlite;
let db: FulfillmentDb;

const actor = { id: "owner-1", name: "المالك" };

function input(overrides: Partial<CartonOnboardingInput> = {}): CartonOnboardingInput {
  return {
    name: "كارتونة وسط",
    sku: "BOX-M",
    notes: "أول دفعة",
    internalLengthCm: 27,
    internalWidthCm: 20,
    internalHeightCm: 14,
    maxWeightKg: 8,
    lowStockThreshold: 5,
    openingQuantity: 20,
    unitCostIqd: 1000,
    costEffectiveDate: "2026-08-02",
    costSource: "فاتورة المورد",
    idempotencyKey: "carton-service-test-key-0001",
    ...overrides,
  };
}

async function count(table: string, where = ""): Promise<number> {
  const result = await client.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM ${table} ${where}`);
  return Number(result.rows[0]?.count ?? 0);
}

beforeEach(async () => {
  client = new PGlite();
  await client.exec(`CREATE TABLE orders (id text PRIMARY KEY);`);
  await client.exec(auditTable);
  await client.exec(base);
  await client.exec(hardening);
  await client.exec(lineIdentity);
  await client.exec(cartonCatalogDdl());
  db = drizzle(client, { schema }) as unknown as FulfillmentDb;
});

describe("atomic carton onboarding", () => {
  it("creates the carton, opening ledger movement, approved cost and audit records together", async () => {
    const result = await setupCartonAtomically(db, input(), actor);
    expect(result.replayed).toBe(false);
    expect(await count("fulfillment_materials", "WHERE material_kind='carton' AND sku='BOX-M'")).toBe(1);
    expect(await count("packaging_inventory_movements", "WHERE material_id='" + result.cartonId + "'")).toBe(1);
    expect(await count("material_cost_records", "WHERE material_id='" + result.cartonId + "' AND approval_status='approved'")).toBe(1);
    expect(await count("accounting_audit_trail", "WHERE entity_id='" + result.cartonId + "'")).toBeGreaterThanOrEqual(2);

    const stock = await client.query<{ balance: number }>(
      `SELECT COALESCE(SUM(quantity),0)::int AS balance FROM packaging_inventory_movements WHERE material_id=$1`,
      [result.cartonId],
    );
    expect(Number(stock.rows[0]?.balance)).toBe(20);

    const material = await client.query<{ current_unit_cost: string; current_cost_record_id: string }>(
      `SELECT current_unit_cost, current_cost_record_id FROM fulfillment_materials WHERE id=$1`,
      [result.cartonId],
    );
    expect(Number(material.rows[0]?.current_unit_cost)).toBe(1000);
    expect(material.rows[0]?.current_cost_record_id).toBe(result.costRecordId);
  });

  it("rolls back the carton when opening stock fails", async () => {
    await expect(setupCartonAtomically(db, input(), actor, {
      afterMaterialCreated: () => { throw new Error("forced stock failure"); },
    })).rejects.toThrow(/forced stock failure/);
    expect(await count("fulfillment_materials")).toBe(0);
    expect(await count("packaging_inventory_movements")).toBe(0);
    expect(await count("material_cost_records")).toBe(0);
  });

  it("rolls back carton and stock when the cost step fails", async () => {
    await expect(setupCartonAtomically(db, input(), actor, {
      afterOpeningStockCreated: () => { throw new Error("forced cost failure"); },
    })).rejects.toThrow(/forced cost failure/);
    expect(await count("fulfillment_materials")).toBe(0);
    expect(await count("packaging_inventory_movements")).toBe(0);
    expect(await count("material_cost_records")).toBe(0);
  });

  it("replays the same idempotency key without duplicating any record", async () => {
    const first = await setupCartonAtomically(db, input(), actor);
    const second = await setupCartonAtomically(db, input(), actor);
    expect(second).toEqual({ ...first, replayed: true });
    expect(await count("fulfillment_materials")).toBe(1);
    expect(await count("packaging_inventory_movements")).toBe(1);
    expect(await count("material_cost_records")).toBe(1);
  });

  it("rejects reuse of an idempotency key when notes or cost source differ", async () => {
    await setupCartonAtomically(db, input(), actor);
    await expect(setupCartonAtomically(db, input({ notes: "ملاحظة مختلفة" }), actor))
      .rejects.toThrow(/IDEMPOTENCY_KEY_REUSED/);
    await expect(setupCartonAtomically(db, input({ costSource: "مصدر مختلف" }), actor))
      .rejects.toThrow(/IDEMPOTENCY_KEY_REUSED/);
    expect(await count("fulfillment_materials")).toBe(1);
    expect(await count("packaging_inventory_movements")).toBe(1);
    expect(await count("material_cost_records")).toBe(1);
  });

  it("rejects a duplicate SKU and leaves the first carton untouched", async () => {
    const first = await setupCartonAtomically(db, input(), actor);
    await expect(setupCartonAtomically(db, input({
      name: "كارتونة ثانية",
      idempotencyKey: "carton-service-test-key-0002",
    }), actor)).rejects.toThrow(/DUPLICATE_CARTON_SKU/);
    expect(await count("fulfillment_materials")).toBe(1);
    expect(await count("material_cost_records", "WHERE material_id='" + first.cartonId + "'")).toBe(1);
  });

  it("does not affect accounting-only non-stock materials", async () => {
    await client.exec(`INSERT INTO fulfillment_materials
      (id,name,category,unit,stock_tracked,material_kind,current_unit_cost)
      VALUES ('price-label','ملصق السعر','label','piece',false,'consumable',NULL)`);
    await setupCartonAtomically(db, input(), actor);
    const label = await client.query<{ stock_tracked: boolean; current_unit_cost: string | null }>(
      `SELECT stock_tracked,current_unit_cost FROM fulfillment_materials WHERE id='price-label'`,
    );
    expect(label.rows[0]?.stock_tracked).toBe(false);
    expect(label.rows[0]?.current_unit_cost).toBeNull();
    expect(await count("packaging_inventory_movements", "WHERE material_id='price-label'")).toBe(0);
  });

  it("does not rewrite the first carton's historical cost record", async () => {
    const first = await setupCartonAtomically(db, input(), actor);
    const before = await client.query<{ unit_cost: string; effective_date: Date; approval_status: string }>(
      `SELECT unit_cost,effective_date,approval_status FROM material_cost_records WHERE id=$1`,
      [first.costRecordId],
    );

    await setupCartonAtomically(db, input({
      name: "كارتونة كبيرة",
      sku: "BOX-L",
      idempotencyKey: "carton-service-test-key-0003",
      unitCostIqd: 1500,
      costEffectiveDate: "2026-08-03",
    }), actor);

    const after = await client.query<{ unit_cost: string; effective_date: Date; approval_status: string }>(
      `SELECT unit_cost,effective_date,approval_status FROM material_cost_records WHERE id=$1`,
      [first.costRecordId],
    );
    expect(after.rows[0]).toEqual(before.rows[0]);
  });
});
