import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { SQL, eq } from "drizzle-orm";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import * as schema from "../../shared/schema.js";
import * as packing from "../../shared/packing-schema.js";
import { getDb } from "../db.js";
import router from "../routes/packaging-admin.js";
import { errorHandler } from "../middleware/error-handler.js";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));
vi.mock("../storage/index.js", () => ({ storage: {
  getUser: async (id: string) => ({ id, role: id === "customer" ? "user" : "admin", name: "Synthetic operator", deletedAt: null }),
} }));

let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  Object.assign(req, { session: req.get("x-user") ? { userId: req.get("x-user") } : {} }); next();
});
app.use("/packaging", router); app.use(errorHandler);
const tables: PgTable[] = [schema.fulfillmentMaterials, schema.packagingInventoryMovements, schema.accountingAuditTrail,
  schema.mutationReceipts, schema.orders, schema.products, packing.cartonReservations, packing.orderPackingPlans,
  packing.adminStockAlerts, packing.packingImportDrafts, packing.packingImportDraftLines];

function tableDdl(table: PgTable): string {
  const config = getTableConfig(table), dialect = new PgDialect();
  const columns = config.columns.map(column => {
    let value = `"${column.name}" ${column.getSQLType()}`;
    if (column.primary) value += " PRIMARY KEY";
    if (column.notNull) value += " NOT NULL";
    if (column.default !== undefined) {
      const fallback = column.default;
      const literal = fallback instanceof SQL ? dialect.sqlToQuery(fallback).sql
        : fallback === null ? "NULL" : typeof fallback === "number" || typeof fallback === "boolean" ? String(fallback)
        : `'${(typeof fallback === "string" ? fallback : JSON.stringify(fallback)).replace(/'/g, "''")}'`;
      value += ` DEFAULT ${literal}`;
    }
    return value;
  });
  return `CREATE TABLE "${config.name}" (${columns.join(",")})`;
}

beforeAll(async () => {
  pg = new PGlite(); await pg.waitReady;
  for (const table of tables) await pg.exec(tableDdl(table));
  await pg.exec(`CREATE UNIQUE INDEX pim_idempotency_uidx ON packaging_inventory_movements(idempotency_key);
    CREATE UNIQUE INDEX cres_idempotency_uidx ON carton_reservations(idempotency_key);`);
  db = drizzle(pg, { schema });
  vi.mocked(getDb).mockReturnValue(db as unknown as NonNullable<ReturnType<typeof getDb>>);
});
beforeEach(async () => {
  await pg.exec(`TRUNCATE ${tables.map(table => `"${getTableConfig(table).name}"`).join(",")}`);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => { await pg?.close(); });

const preparation = { name: "Synthetic preparation", calculationBasis: "per_order", notes: "fixture", idempotencyKey: "stable-preparation-action" };
const carton = { name: "Synthetic carton", sku: "FIXTURE-10", internalLengthCm: 25.5, internalWidthCm: 20,
  internalHeightCm: 15, maxWeightKg: 5.25, lowStockThreshold: 4.5, idempotencyKey: "stable-carton-action" };
const createCases = [{ path: "/preparation-costs", body: preparation, kind: "consumable", tracked: false },
  { path: "/cartons", body: carton, kind: "carton", tracked: true }];
const post = (path: string, body: unknown, actor = "admin") => request(app).post(`/packaging${path}`).set("x-user", actor).send(body);
const audits = () => db.select().from(schema.accountingAuditTrail);
const materials = () => db.select().from(schema.fulfillmentMaterials);

async function failAudit(run: () => Promise<void>): Promise<void> {
  await pg.exec(`CREATE FUNCTION reject_packaging_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$;
    CREATE TRIGGER reject_packaging_audit BEFORE INSERT ON accounting_audit_trail FOR EACH ROW EXECUTE FUNCTION reject_packaging_audit();`);
  try { await run(); } finally {
    await pg.exec("DROP TRIGGER reject_packaging_audit ON accounting_audit_trail; DROP FUNCTION reject_packaging_audit();");
  }
}

async function seedMaterial() {
  await db.insert(schema.fulfillmentMaterials).values({ id: "material", name: "Original", sku: "ORIGINAL",
    materialKind: "carton", stockTracked: true, calculationBasis: "per_carton", currentUnitCost: null,
    internalLengthCm: "20.75", internalWidthCm: "20", internalHeightCm: "20", maxWeightKg: "5.25", lowStockThreshold: "2.5" });
}

describe("packaging admin creation receipts and audit atomicity", () => {
  it.each(createCases)("replays $path after a lost response without a second material or audit", async ({ path, body, kind, tracked }) => {
    const first = await post(path, body);
    expect(first.status).toBe(201);
    // Treat the first successful response as lost to the caller, then retry the
    // identical request concurrently. No network/provider is involved.
    const retried = await Promise.all([post(path, body), post(path, body)]);
    expect(retried.map(result => result.status)).toEqual([200, 200]);
    expect(retried.every(result => result.body.id === first.body.id)).toBe(true);
    expect(await materials()).toHaveLength(1); expect(await audits()).toHaveLength(1);
    expect((await materials())[0]).toMatchObject({ materialKind: kind, stockTracked: tracked, currentUnitCost: null });
    expect((await audits())[0]).toMatchObject({ action: "create", performedBy: "admin", performedByName: "Synthetic operator" });
    expect(await db.select().from(schema.mutationReceipts)).toHaveLength(1);
    if (kind === "carton") expect((await materials())[0]).toMatchObject({ internalLengthCm: "25.5", maxWeightKg: "5.25", lowStockThreshold: "4.5" });
  });

  it.each(createCases)("rolls back $path and its receipt when the real audit insert fails, then accepts the same key", async ({ path, body }) => {
    await failAudit(async () => {
      const failed = await post(path, body); expect(failed.status).toBe(500);
      expect(failed.text).not.toContain("synthetic audit failure");
      expect(await materials()).toHaveLength(0); expect(await audits()).toHaveLength(0);
      expect(await db.select().from(schema.mutationReceipts)).toHaveLength(0);
    });
    const retry = await post(path, body); expect(retry.status).toBe(201);
    expect(await materials()).toHaveLength(1); expect(await audits()).toHaveLength(1);
  });

  it("rejects a reused key with different data and isolates actors and operation namespaces", async () => {
    const body = { ...preparation, idempotencyKey: "same-action-key" };
    expect((await post("/preparation-costs", body)).status).toBe(201);
    expect((await post("/preparation-costs", { ...body, calculationBasis: "per_carton" })).status).toBe(409);
    expect((await post("/preparation-costs", body, "another-admin")).status).toBe(201);
    expect((await post("/cartons", { ...carton, idempotencyKey: body.idempotencyKey })).status).toBe(201);
    expect((await post("/preparation-costs", { ...body, idempotencyKey: "new-action-key" })).status).toBe(201);
    expect(await materials()).toHaveLength(4); expect(await audits()).toHaveLength(4);
  });

  it("rejects invalid or unauthorized writes before a receipt or financial row exists", async () => {
    expect((await post("/preparation-costs", { ...preparation, name: "" })).status).toBe(400);
    expect((await post("/preparation-costs", preparation, "customer")).status).toBe(403);
    expect((await request(app).post("/packaging/preparation-costs").send(preparation)).status).toBe(401);
    expect(await materials()).toHaveLength(0); expect(await db.select().from(schema.mutationReceipts)).toHaveLength(0);
  });
});

describe("packaging edits, stock corrections and reservation audit rollback", () => {
  it.each([
    { method: "patch", path: "/preparation-costs/material", body: { name: "Updated", calculationBasis: "per_product_unit", reason: "Synthetic edit" } },
    { method: "post", path: "/preparation-costs/material/archive", body: { reason: "Synthetic archive" } },
    { method: "patch", path: "/cartons/material", body: { name: "Updated carton", lowStockThreshold: 7.25, reason: "Synthetic dimensions" } },
  ] as const)("keeps $path unchanged if its audit fails", async ({ method, path, body }) => {
    await seedMaterial();
    const original = (await materials())[0];
    const change = () => request(app)[method](`/packaging${path}`).set("x-user", "admin").send(body);
    await failAudit(async () => {
      expect((await change()).status).toBe(500);
      expect((await materials())[0]).toEqual(original); expect(await audits()).toHaveLength(0);
    });
    expect((await change()).status).toBe(200);
    const changed = (await materials())[0];
    expect(changed.currentUnitCost).toBeNull(); expect(changed.internalLengthCm).toBe("20.75");
    if (path.includes("archive")) expect(changed).toMatchObject({ active: false, archivedAt: expect.any(Date) });
    else if (path.startsWith("/cartons")) expect(changed).toMatchObject({ name: "Updated carton", lowStockThreshold: "7.25" });
    else expect(changed).toMatchObject({ name: "Updated", calculationBasis: "per_product_unit" });
    expect((await audits())[0]).toMatchObject({ performedBy: "admin", performedByName: "Synthetic operator" });
  });

  it("rolls back the physical correction and allows the same request key after audit failure", async () => {
    await seedMaterial();
    const body = { quantity: -1.25, reason: "Synthetic signed correction", idempotencyKey: "correct-action" };
    await failAudit(async () => {
      expect((await post("/cartons/material/correct", body)).status).toBe(500);
      expect(await db.select().from(schema.packagingInventoryMovements)).toHaveLength(0);
      expect(await audits()).toHaveLength(0);
    });
    expect((await post("/cartons/material/correct", body)).status).toBe(201);
    expect((await db.select().from(schema.packagingInventoryMovements))[0]).toMatchObject({ quantity: "-1.25", recordedBy: "admin" });
    expect((await audits())[0]).toMatchObject({ fieldName: "manual_correction", newValueJson: { quantity: "-1.25" }, performedBy: "admin" });
  });

  async function seedReservedOrder() {
    await seedMaterial();
    await db.insert(schema.orders).values({ id: "order", total: "12345", items: [] });
    await db.insert(schema.packagingInventoryMovements).values({ materialId: "material", movementType: "purchase_receipt", quantity: "10", idempotencyKey: "opening" });
    await db.insert(packing.orderPackingPlans).values({ id: "plan", orderId: "order", state: "reserved", totalKnownCost: null });
    await db.insert(packing.cartonReservations).values({ id: "original-hold", orderId: "order", materialId: "material", quantity: "2", state: "active", planId: "plan", idempotencyKey: "original-key" });
  }

  it("rolls back the canonical carton swap savepoint when its outer audit fails", async () => {
    await seedReservedOrder();
    const body = { quantities: { material: 3 }, idempotencyKey: "change-action", reason: "Synthetic swap" };
    await failAudit(async () => {
      expect((await post("/orders/order/change-carton", body)).status).toBe(500);
      const holds = await db.select().from(packing.cartonReservations);
      expect(holds).toHaveLength(1); expect(holds[0]).toMatchObject({ id: "original-hold", state: "active", quantity: "2" });
    });
    expect((await post("/orders/order/change-carton", body)).status).toBe(200);
    const holds = await db.select().from(packing.cartonReservations);
    expect(holds.filter(hold => hold.state === "active")).toHaveLength(1);
    expect(holds.find(hold => hold.state === "active")).toMatchObject({ quantity: "3", reservedBy: "admin" });
    expect(await audits()).toHaveLength(1);
    expect((await db.select().from(schema.orders))[0].total).toBe("12345");
  });

  it("rolls back reservation releases and manual-plan writes together when audit fails", async () => {
    await seedReservedOrder();
    const body = { reason: "Synthetic manual packing" };
    await failAudit(async () => {
      expect((await post("/orders/order/manual-pack-required", body)).status).toBe(500);
      expect(await db.select().from(packing.orderPackingPlans)).toMatchObject([{ id: "plan", state: "reserved", totalKnownCost: null }]);
      expect(await db.select().from(packing.cartonReservations)).toMatchObject([{ id: "original-hold", state: "active" }]);
      expect(await audits()).toHaveLength(0);
    });
    expect((await post("/orders/order/manual-pack-required", body)).status).toBe(201);
    const plans = await db.select().from(packing.orderPackingPlans);
    expect(plans.find(plan => plan.state === "manual_pack_required")).toMatchObject({ createdBy: "admin", totalKnownCost: null });
    expect(plans.find(plan => plan.id === "plan")?.state).toBe("superseded");
    expect((await db.select().from(packing.cartonReservations))[0].state).toBe("released");
    expect(await audits()).toHaveLength(1);
    expect((await db.select().from(schema.packagingInventoryMovements))).toHaveLength(1);
  });

  it("stores scalar admin identity on receipt, import and alert acknowledgement", async () => {
    await seedMaterial();
    expect((await post("/cartons/material/receive", { quantity: 3.5, reason: "Synthetic receipt", idempotencyKey: "receipt-action" })).status).toBe(201);
    expect((await db.select().from(schema.packagingInventoryMovements))[0]).toMatchObject({ quantity: "3.5", recordedBy: "admin" });
    const upload = await post("/packing-import", { fileName: "fixture.csv", rows: [{ rowNumber: 1, productName: "Synthetic product" }] });
    expect(upload.status).toBe(201);
    expect((await db.select().from(packing.packingImportDrafts))[0].importedBy).toBe("admin");
    await db.insert(packing.adminStockAlerts).values({ id: "alert", materialId: "material", alertLevel: "low", state: "open" });
    expect((await post("/alerts/alert/acknowledge", {})).status).toBe(200);
    expect((await db.select().from(packing.adminStockAlerts).where(eq(packing.adminStockAlerts.id, "alert")))[0].acknowledgedBy).toBe("admin");
  });
});
