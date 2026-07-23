// Admin API tests (item 7). The router runs against a REAL Postgres (PGlite) with
// the real canonical services behind it — nothing is stubbed except authentication,
// which is toggled so we can prove the routes are actually gated.
import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";

const ROOT = process.cwd();
const base = readFileSync(join(ROOT, "migrations/add_fulfillment_costing.sql"), "utf8");
const hardening = readFileSync(join(ROOT, "migrations/add_fulfillment_hardening.sql"), "utf8");
// F-4: per-line identity for packaging_inventory_movements (add_pim_line_identity.sql)
const pimLineIdentity = readFileSync(join(ROOT, "migrations/add_pim_line_identity.sql"), "utf8");
const auditTable = `
  CREATE TABLE IF NOT EXISTS accounting_audit_trail (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type text NOT NULL, entity_id text NOT NULL, action text NOT NULL,
    field_name text, old_value_json jsonb, new_value_json jsonb, reason text,
    performed_by text, performed_by_name text,
    performed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now());`;

let client: PGlite;
// Toggle used to prove admin gating is real.
const authState = { allow: true, actorId: "owner-1", actorName: "المالك" };

vi.mock("../db.js", async () => {
  const actual = await vi.importActual<typeof import("../db.js")>("../db.js");
  return { ...actual, getDb: () => testDb };
});

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!authState.allow) { res.status(403).json({ error: "Admin access required" }); return; }
    (req as unknown as { session: Record<string, string> }).session = {
      userId: authState.actorId, userName: authState.actorName,
    };
    next();
  },
  requireAuth: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  getSession: () => undefined,
}));

let testDb: ReturnType<typeof drizzle>;
let app: express.Express;

beforeAll(async () => {
  client = new PGlite();
  await client.exec(`CREATE TABLE orders (
      id text PRIMARY KEY, order_number text, user_id text, status text DEFAULT 'delivered',
      payment_status text DEFAULT 'paid', total numeric DEFAULT '0', rounded_total numeric,
      shipping_cost numeric DEFAULT '0', coupon_id text, discount_total numeric DEFAULT '0',
      points_used integer DEFAULT 0, cashback_used numeric DEFAULT '0',
      points_discount numeric DEFAULT '0', points_earned integer DEFAULT 0,
      rounding_cashback numeric DEFAULT '0', items jsonb, shipping_address jsonb,
      customer_name text, customer_email text, customer_phone text,
      bonus_prize text, bonus_claimed_at timestamptz, carrier text,
      cod_received boolean DEFAULT false, box_cost numeric DEFAULT '0',
      source text DEFAULT 'website', financially_counted boolean DEFAULT true,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());`);
  await client.exec(`CREATE TABLE products (
      id text PRIMARY KEY, slug text, name text NOT NULL, brand text, category text,
      category_id text, subcategory text, description text, price numeric DEFAULT '0',
      original_price numeric, currency text DEFAULT 'IQD', images jsonb, thumbnail text,
      rating numeric DEFAULT '0', review_count integer DEFAULT 0, stock integer DEFAULT 0,
      low_stock_threshold integer, is_new boolean DEFAULT false, is_best_seller boolean DEFAULT false,
      is_product_of_week boolean DEFAULT false, specifications jsonb, variants jsonb,
      has_variants boolean DEFAULT false, cost_price numeric, packaging_cost numeric,
      insert_cost numeric,
      cost_price_resolution text, packaging_cost_resolution text, insert_cost_resolution text,
      cost_resolution_note text, cost_resolution_by text, cost_resolution_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(), deleted_at timestamptz);`);
  // F-3: the relational cost-snapshot store the engine now reads as source of truth
  await client.exec(`CREATE TABLE order_items_relational (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, order_id text NOT NULL,
      product_id text NOT NULL, quantity integer NOT NULL,
      price_at_purchase numeric NOT NULL, total_price numeric NOT NULL,
      unit_cost_price numeric, unit_packaging_cost numeric, unit_insert_cost numeric,
      cost_snapshot_status text, cost_snapshot_source text, cost_snapshot_confidence text,
      cost_snapshot_version integer, cost_snapshot_at timestamptz, metadata jsonb);`);
  await client.exec(`CREATE TABLE product_cost_history (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, product_id text,
      cost_price numeric, packaging_cost numeric, insert_cost numeric,
      effective_from timestamptz DEFAULT now(), note text, changed_by text, created_at timestamptz DEFAULT now());`);
  await client.exec(`CREATE TABLE accounting_manual_adjustments (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, entity_type text, entity_id text,
      field_name text, old_value_json jsonb, new_value_json jsonb, reason text,
      status text DEFAULT 'approved', created_by text, approved_by text,
      created_at timestamptz DEFAULT now(), approved_at timestamptz,
      applied_at timestamptz, note text);`);
  await client.exec(auditTable);
  await client.exec(base);
  await client.exec(hardening);
  await client.exec(pimLineIdentity);

  await client.exec(`INSERT INTO products (id,name,price,cost_price,packaging_cost,insert_cost)
    VALUES ('p1','فلتر داخلي','25000','15000','500','0')`);
  await client.exec(`INSERT INTO orders (id,order_number,total,rounded_total,shipping_cost,items,customer_name,customer_phone)
    VALUES ('api-ord-1','A-1001','30000','30000','5000',
      '[{"productId":"p1","quantity":1,"priceAtPurchase":"25000","costPrice":"15000","packagingCost":"500","insertCost":"0","costStatus":"exact","costSource":"product_current"}]'::jsonb,
      'زبون تجريبي','07700000000')`);

  testDb = drizzle(client, { schema });

  const routerModule = await import("../routes/fulfillment-admin.js");
  app = express();
  app.use(express.json());
  app.use("/api/admin/fulfillment", routerModule.default);
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message });
  });
});

const api = () => request(app);
const BASE = "/api/admin/fulfillment";

describe("fulfillment admin API", () => {
  let materialId = "";
  let costRecordId = "";
  let familyId = "";
  let draftId = "";
  let eventId = "";

  it("every route requires admin authentication", async () => {
    authState.allow = false;
    for (const path of ["/materials", "/profile-families", "/reference"]) {
      const res = await api().get(BASE + path);
      expect(res.status).toBe(403);
    }
    const post = await api().post(`${BASE}/materials`).send({ name: "x" });
    expect(post.status).toBe(403);
    authState.allow = true;
  });

  it("validates input with Zod and rejects malformed bodies", async () => {
    const res = await api().post(`${BASE}/materials`).send({ name: "" });
    expect(res.status).toBe(500); // ZodError surfaces through the error handler
    const bad = await api().post(`${BASE}/drafts/nope/lines/manual`)
      .send({ materialName: "x", category: "not-a-category", quantity: 1, unitCost: 1 });
    expect(bad.status).toBeGreaterThanOrEqual(400);
  });

  it("creates a material with an UNKNOWN cost (never 0)", async () => {
    const res = await api().post(`${BASE}/materials`)
      .send({ name: "صندوق وسط", category: "box", unit: "piece" });
    expect(res.status).toBe(201);
    materialId = res.body.id;

    const list = await api().get(`${BASE}/materials`);
    expect(list.status).toBe(200);
    const m = list.body.materials.find((x: { id: string }) => x.id === materialId);
    expect(m.approvedCost.unitCost).toBeNull();
    expect(m.approvedCost.status).toBe("unknown");
    expect(m.stockBalance).toBe(0);
  });

  it("records a purchase idempotently and derives the unit cost", async () => {
    const body = {
      materialId, quantity: 100, totalCost: 150000,
      supplier: "مورد بغداد", idempotencyKey: "pur-key-1",
    };
    const first = await api().post(`${BASE}/purchases`).send(body);
    expect(first.status).toBe(201);
    expect(first.body.unitCost).toBe(1500);

    const retry = await api().post(`${BASE}/purchases`).send(body);
    expect(retry.body.reused).toBe(true);           // idempotent

    const stock = await api().get(`${BASE}/materials/${materialId}/stock`);
    expect(stock.body.balance).toBe(100);            // received ONCE
    expect(stock.body.movements).toHaveLength(1);
  });

  it("proposes and approves a cost; history and audit trail are written", async () => {
    const purchases = await api().get(`${BASE}/materials/${materialId}/purchases`);
    const purchaseId = purchases.body.purchases[0].id;

    const proposed = await api().post(`${BASE}/materials/${materialId}/costs`).send({
      costBasis: "purchase_batch", purchaseId, unitCost: null, reason: "فاتورة المورد",
    });
    expect(proposed.status).toBe(201);
    costRecordId = proposed.body.record.id;
    expect(proposed.body.record.approvalStatus).toBe("pending");

    const approved = await api().post(`${BASE}/cost-records/${costRecordId}/approve`).send({});
    expect(approved.status).toBe(200);
    expect(approved.body.record.approvalStatus).toBe("approved");
    expect(approved.body.record.approvedBy).toBe("owner-1");

    const costs = await api().get(`${BASE}/materials/${materialId}/costs`);
    expect(costs.body.current.unitCost).toBe(1500);
    expect(costs.body.history.length).toBeGreaterThanOrEqual(1);

    const audit = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM accounting_audit_trail WHERE entity_type='fulfillment_cost_record'`);
    expect(audit.rows[0].c).toBeGreaterThanOrEqual(2); // propose + approve
  });

  it("cost fields are unreachable through the descriptive update route", async () => {
    const res = await api().patch(`${BASE}/materials/${materialId}`)
      .send({ notes: "ملاحظة", currentUnitCost: 999999 });
    expect(res.status).toBe(200);
    const costs = await api().get(`${BASE}/materials/${materialId}/costs`);
    expect(costs.body.current.unitCost).toBe(1500);   // unchanged — cost is not editable here
  });

  it("creates a profile family and a new version; the old one is superseded", async () => {
    const created = await api().post(`${BASE}/profile-families`).send({
      familyKey: "api-standard", name: "بروفايل قياسي",
      appliesTo: { default: true },
      items: [{ materialId, quantity: 1 }],
    });
    expect(created.status).toBe(201);
    familyId = created.body.family.id;
    expect(created.body.version.version).toBe(1);

    const expected = await api().post(`${BASE}/profile-versions/expected-cost`)
      .send({ items: [{ materialId, quantity: 2 }] });
    expect(expected.body.total).toBe(3000);           // computed by the canonical service

    const v2 = await api().post(`${BASE}/profile-families/${familyId}/versions`).send({
      items: [{ materialId, quantity: 2 }], creationReason: "زيادة الكمية",
    });
    expect(v2.status).toBe(201);
    expect(v2.body.version.version).toBe(2);

    const family = await api().get(`${BASE}/profile-families/${familyId}`);
    const v1 = family.body.versions.find((v: { version: number }) => v.version === 1);
    expect(v1.supersededById).toBe(v2.body.version.id);
  });

  it("opens a draft seeded from the suggestion, with the reason surfaced", async () => {
    const res = await api().post(`${BASE}/orders/api-ord-1/draft`)
      .send({ context: { itemCount: 1 } });
    expect(res.status).toBe(200);
    draftId = res.body.draft.id;
    expect(res.body.draft.suggestionReason).toBeTruthy();
    expect(res.body.draft.profileVersion).toBe(2);
    expect(res.body.draft.lines).toHaveLength(1);
    expect(res.body.draft.expectedCost).toBe(3000);
  });

  it("a draft has NO effect on the canonical profitability breakdown", async () => {
    const res = await api().get(`${BASE}/orders/api-ord-1/profitability`);
    expect(res.status).toBe(200);
    expect(res.body.breakdown.aquavoFulfillmentCost).toBeNull();
    expect(res.body.breakdown.originalShipmentCost).toBeNull();
  });

  it("accepts named manual quick-entry lines and totals them server-side", async () => {
    const added = await api().post(`${BASE}/drafts/${draftId}/lines/manual`).send({
      materialName: "ستكرات", category: "sticker", description: "ستكر شعار",
      quantity: 3, unit: "piece", unitCost: 200, note: "دفعة جديدة",
    });
    expect(added.status).toBe(200);
    const line = added.body.draft.lines.find((l: { materialName: string }) => l.materialName === "ستكرات");
    expect(line.totalCost).toBe(600);                 // the SERVER computed this
    expect(added.body.draft.expectedCost).toBe(3600);

    const card = await api().post(`${BASE}/drafts/${draftId}/lines/manual`).send({
      materialName: "كارت", category: "card", quantity: 1, unitCost: null,
    });
    expect(card.body.draft.expectedCost).toBeNull();  // unknown ⇒ total unknown
    expect(card.body.draft.costStatus).toBe("incomplete");
    expect(card.body.draft.missingCostLines).toContain("كارت");

    const cardLine = card.body.draft.lines.find((l: { materialName: string }) => l.materialName === "كارت");
    const fixed = await api().patch(`${BASE}/drafts/${draftId}/lines/${cardLine.id}`).send({ unitCost: 100 });
    expect(fixed.body.draft.expectedCost).toBe(3700);
    expect(fixed.body.draft.costStatus).toBe("exact");
  });

  it("confirms the draft into ONE immutable event and is idempotent", async () => {
    const first = await api().post(`${BASE}/drafts/${draftId}/confirm`).send({});
    expect(first.status).toBe(201);
    eventId = first.body.eventId;
    expect(first.body.actualCost).toBe(3700);
    expect(first.body.variance).toBe(0);

    const again = await api().post(`${BASE}/drafts/${draftId}/confirm`).send({});
    expect(again.status).toBe(200);
    expect(again.body.eventId).toBe(eventId);
    expect(again.body.alreadyConfirmed).toBe(true);

    const stock = await api().get(`${BASE}/materials/${materialId}/stock`);
    expect(stock.body.balance).toBe(98);              // 100 − 2, deducted once
  });

  it("the profitability breakdown now reports the canonical components", async () => {
    const res = await api().get(`${BASE}/orders/api-ord-1/profitability`);
    const b = res.body.breakdown;
    expect(b.collectedAmount).toBe(30000);
    expect(b.revenue).toBe(25000);                    // collected − shipping
    expect(b.productCogs).toBe(15000);
    expect(b.supplierPackaging).toBe(500);
    expect(b.aquavoFulfillmentCost).toBe(3700);
    expect(b.originalShipmentCost).toBe(3700);
    expect(b.courierCost).toBe(5000);
    expect(b.totalKnownDirectCost).toBe(15000 + 500 + 3700 + 5000);
    expect(b.contributionProfit).toBe(25000 - (15000 + 500 + 3700 + 5000));
    expect(b.dataStatus).toBe("exact");
    expect(b.unallocated.unknownFulfillmentLines).toBe(0);
  });

  it("supports explicit commissions / payment fees / other direct costs", async () => {
    const res = await api().post(`${BASE}/orders/api-ord-1/profitability`)
      .send({ directCosts: { commissions: 1000, paymentFees: 250 } });
    const b = res.body.breakdown;
    expect(b.commissions).toBe(1000);
    expect(b.paymentFees).toBe(250);
    expect(b.totalKnownDirectCost).toBe(15000 + 500 + 3700 + 5000 + 1000 + 250);
  });

  it("a second ORIGINAL for the same order is rejected with 409", async () => {
    const res = await api().post(`${BASE}/orders/api-ord-1/events`).send({
      eventType: "original", requestId: "second-original",
      lines: [{ materialId, materialName: "صندوق وسط", quantity: 1, unitCost: 1500 }],
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ORIGINAL_ALREADY_EXISTS/);
  });

  it("confirms a reshipment directly and returns the event history", async () => {
    const res = await api().post(`${BASE}/orders/api-ord-1/events`).send({
      eventType: "reshipment", requestId: "rs-api-1", expectedCost: 1500,
      lines: [{ materialId, materialName: "صندوق وسط", quantity: 1, unitCost: 1500 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.actualCost).toBe(1500);

    const retry = await api().post(`${BASE}/orders/api-ord-1/events`).send({
      eventType: "reshipment", requestId: "rs-api-1", expectedCost: 1500,
      lines: [{ materialId, materialName: "صندوق وسط", quantity: 1, unitCost: 1500 }],
    });
    expect(retry.status).toBe(200);
    expect(retry.body.reused).toBe(true);

    const history = await api().get(`${BASE}/orders/api-ord-1/events`);
    expect(history.body.events).toHaveLength(2);
    expect(history.body.events[0].sequenceNumber).toBeLessThan(history.body.events[1].sequenceNumber);
    expect(history.body.events[1].lines[0].materialName).toBe("صندوق وسط");
  });

  it("reverses an event idempotently and records the audit trail", async () => {
    const reshipment = (await api().get(`${BASE}/orders/api-ord-1/events`))
      .body.events.find((e: { eventType: string }) => e.eventType === "reshipment");

    const rev = await api().post(`${BASE}/events/${reshipment.id}/reverse`)
      .send({ reason: "الزبون رفض الاستلام" });
    expect(rev.status).toBe(200);
    expect(rev.body.reused).toBe(false);
    expect(rev.body.reversedMovements).toBe(1);

    const again = await api().post(`${BASE}/events/${reshipment.id}/reverse`)
      .send({ reason: "الزبون رفض الاستلام" });
    expect(again.body.reversalEventId).toBe(rev.body.reversalEventId);
    expect(again.body.reused).toBe(true);

    // The reversed event is excluded from the canonical total again.
    const b = (await api().get(`${BASE}/orders/api-ord-1/profitability`)).body.breakdown;
    expect(b.aquavoFulfillmentCost).toBe(3700);      // only the original counts
    expect(b.unallocated.reversedFulfillmentCost).toBe(1500);

    const audit = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM accounting_audit_trail WHERE entity_type='fulfillment_event'`);
    expect(audit.rows[0].c).toBeGreaterThanOrEqual(3);
  });

  it("a reversal without a reason is rejected", async () => {
    const res = await api().post(`${BASE}/events/${eventId}/reverse`).send({ reason: "x" });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects edits to a consumed draft with 409", async () => {
    const res = await api().post(`${BASE}/drafts/${draftId}/lines/manual`)
      .send({ materialName: "متأخر", category: "extra", quantity: 1, unitCost: 100 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/DRAFT_CONSUMED/);
  });

  it("exposes reference data for the quick-entry form", async () => {
    const res = await api().get(`${BASE}/reference`);
    expect(res.status).toBe(200);
    const labels = res.body.manualCategories.map((c: { label: string }) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["صندوق", "ستكرات", "كارت", "تيب", "تغليف", "تكلفة إضافية"]));
    expect(res.body.eventTypes).toContain("reshipment");
  });

  it("returns 404 for an unknown order's profitability", async () => {
    const res = await api().get(`${BASE}/orders/no-such-order/profitability`);
    expect(res.status).toBe(404);
  });

  it("exposes an independent, read-only integrity verification", async () => {
    const res = await api().get(`${BASE}/verify`);
    expect(res.status).toBe(200);                     // 409 when an invariant is violated
    expect(res.body.report.ok).toBe(true);
    expect(res.body.report.findings.filter((f: { severity: string }) => f.severity === "critical")).toEqual([]);
    expect(res.body.report.totals.events).toBeGreaterThan(0);
  });
});
