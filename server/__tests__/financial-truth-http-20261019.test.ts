import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import express from "express";
import request from "supertest";
const state = vi.hoisted(() => ({ db: null as any, close: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: () => state.db }));
vi.mock("../middleware/accounting-auth-v2.js", () => ({ requireAccountingAdmin: (req: any, res: any, next: any) => req.get("x-synthetic-admin") === "yes" ? next() : res.sendStatus(401) }));
vi.mock("../services/accounting-auto-close-v2.js", () => ({ getAutomaticPeriodCloseStatus: vi.fn(async () => []), runAutomaticPeriodClose: (...args: any[]) => state.close(...args) }));
import { createAccountingV2Router } from "../routes/accounting-v2.js";
import { loadFinancialTruth } from "../services/financial-truth.js";
let pg: PGlite, app: express.Express;
beforeAll(async () => {
  pg = new PGlite(); await pg.waitReady; state.db = drizzle(pg);
  await pg.exec(`CREATE TABLE accounting_readiness_status AS SELECT
    '2026-10-19T09:00:00Z'::text AS checked_at, '2026-07-31T21:00:00Z'::text AS cutover_at,
    'enforce'::text AS inventory_ledger_mode, 'true'::text AS payment_ledger_enabled, 'true'::text AS snapshot_writer_enabled,
    0 AS open_review_flags, 0::numeric AS journal_difference, 192 AS legacy_realized_lines_without_exact_cost;
    CREATE TABLE v_accounting_inventory_asset_reconciliation AS SELECT
    300::numeric AS on_hand_inventory_iqd,0::numeric AS unrealized_order_inventory_iqd,310::numeric AS gl_inventory_iqd,
    -10::numeric AS difference_iqd,0 AS missing_unrealized_costs;
    CREATE TABLE products(id text PRIMARY KEY, stock integer, price numeric, cost_price numeric, cost_price_resolution text,
      has_variants boolean DEFAULT false, variants jsonb DEFAULT '[]', deleted_at timestamptz);
    INSERT INTO products(id,stock,price,cost_price,cost_price_resolution) VALUES('stocked',3,200,100,'known');
    INSERT INTO products(id,stock,price,cost_price,cost_price_resolution)
      SELECT 'draft-'||n,0,0,NULL,'unresolved' FROM generate_series(1,3) n;
    CREATE TABLE orders(id text PRIMARY KEY,is_test boolean DEFAULT false);
    CREATE TABLE order_financial_reconciliation_queue(order_id text,order_number text,cod_received boolean,reconciliation_reason text);
    CREATE TABLE order_accounting_facts(order_id text PRIMARY KEY,period_key text,merchant_net numeric,recognized_at timestamptz);
    INSERT INTO orders VALUES('order-1',false),('order-2',false),('test-order',true);
    INSERT INTO order_financial_reconciliation_queue VALUES
      ('order-1','SYNTHETIC-1',true,'cod_not_reconciled_to_settlement'),
      ('order-2','SYNTHETIC-2',true,'cod_not_reconciled_to_settlement'),
      ('test-order','TEST',false,'cod_not_reconciled_to_settlement');
    INSERT INTO order_accounting_facts VALUES('order-1','2026-09',10000,'2026-09-01Z'),('order-2','2026-10',20000,'2026-10-01Z');`);
  const zeros = ["incomplete_cost_orders", "missing_fulfillment_orders", "incomplete_fulfillment_orders", "payment_evidence_errors",
    "unsettled_carrier_orders", "unverified_returns", "undocumented_expenses", "inventory_mismatches", "open_review_flags",
    "journal_difference", "procurement_integrity_failures", "settlement_integrity_failures", "delivery_surplus_exceptions",
    "rounding_adjustment", "sales_returns", "actual_return_loss", "fx_net_expense"];
  await pg.exec(`CREATE TABLE v_accounting_period_readiness AS SELECT '2026-10'::text AS period_key,
    10000::numeric AS product_revenue,4000::numeric AS cogs,1000::numeric AS fulfillment_cost,
    0::numeric AS delivery_subsidy,2000::numeric AS verified_expenses,${zeros.map(key => `0::numeric AS ${key}`).join(',')}`);
  app = express(); app.use(createAccountingV2Router());
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.statusCode ?? 503).json({ message: "Financial source unavailable" }));
});
afterAll(async () => { await pg?.close(); });
describe("Read-only financial truth API executes actual SQL", () => {
  it("requires administrative access", async () => {
    expect((await request(app).get('/v2/truth?periodKey=2026-10')).status).toBe(401);
  });
  it("reads a coherent report, excludes test orders and counts empty drafts separately", async () => {
    const response = await request(app).get('/v2/truth?periodKey=2026-10').set('x-synthetic-admin','yes');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toMatchObject({ periodKey: '2026-10', independentlyAudited: false,
      profit: { displayIqd: 3000 }, inventory: { missingStockedCosts: 0, emptyCatalogDrafts: 3, differenceIqd: -10 },
      settlements: { count: 2, recordedNetIqd: 30000 } });
    expect(state.close).not.toHaveBeenCalled();
    expect((await pg.query('SELECT count(*)::int AS n FROM orders')).rows).toEqual([{ n: 3 }]);
  });
  it("does not assert that paid markers prove completed cash matching", async () => {
    const truth = await loadFinancialTruth('2026-10');
    expect(truth.settlements.orders.every(order => order.recordedReceived)).toBe(true);
    expect(truth.issues.some(issue => issue.key === 'settlements_global')).toBe(true);
  });
  it("fails closed if a required source disappears, instead of returning zeroes", async () => {
    await pg.exec('ALTER TABLE v_accounting_inventory_asset_reconciliation RENAME TO saved_inventory_source');
    const response = await request(app).get('/v2/truth?periodKey=2026-10').set('x-synthetic-admin','yes');
    expect(response.status).toBe(503); expect(response.body.profit).toBeUndefined();
    await pg.exec('ALTER TABLE saved_inventory_source RENAME TO v_accounting_inventory_asset_reconciliation');
  });
  it("rejects invalid month input and missing non-historical periods", async () => {
    expect((await request(app).get('/v2/truth?periodKey=2026-13').set('x-synthetic-admin','yes')).status).not.toBe(200);
    await expect(loadFinancialTruth('2026-09')).rejects.toMatchObject({ statusCode: 409 });
  });
});
