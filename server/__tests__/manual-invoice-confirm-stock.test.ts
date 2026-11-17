import { PGlite } from "@electric-sql/pglite";
import { getTableColumns, getTableName } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { manualInvoices, orderItems, orders, products } from "../../shared/schema.js";
import { getDb } from "../db.js";
import { createInvoiceV2Router } from "../routes/invoice-v2.js";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));
vi.mock("../services/schema-readiness.js", () => ({
  getSchemaReadiness: async () => ({}), assertOrderCreationReady: () => {},
}));

const pg = new PGlite();
const app = express().use(express.json()).use("/api/invoice", createInvoiceV2Router());
const line = { productId: "p", name: "فلتر", unitPrice: 1000, quantity: 1, total: 1000 };

beforeAll(async () => {
  vi.mocked(getDb).mockReturnValue(drizzle(pg) as unknown as ReturnType<typeof getDb>);
  for (const table of [manualInvoices, orders, orderItems, products]) {
    const columns = Object.values(getTableColumns(table)).map(column => `"${column.name}" ${column.getSQLType()}`);
    await pg.exec(`CREATE TABLE "${getTableName(table)}" (${columns.join(", ")})`);
  }
  await pg.exec(`
    CREATE TABLE inventory_locations(id text, code text, is_active boolean);
    CREATE TABLE inventory_movements(product_id text, variant_id text, location_id text, quantity_delta integer);
    CREATE VIEW inventory_canonical_balances AS
      SELECT product_id, variant_id, location_id, SUM(quantity_delta) AS canonical_stock
      FROM inventory_movements GROUP BY product_id, variant_id, location_id;
    CREATE TABLE payment_stock_reservations(product_id text, variant_id text, status text, expires_at timestamptz, quantity integer);
    INSERT INTO products(id,name,price,stock,has_variants) VALUES ('p','فلتر',1000,4,false);
    INSERT INTO inventory_locations VALUES ('warehouse','MAIN',true);
    INSERT INTO inventory_movements VALUES ('p',null,'warehouse',1);
  `);
});

afterAll(() => pg.close());

async function sentInvoice(token: string, quantity: number) {
  await pg.query(`INSERT INTO manual_invoices(id, token, invoice_no, status, items, subtotal, total)
    VALUES ($1, $1, $1, 'sent', $2::jsonb, $3, $3)`,
    [token, JSON.stringify(Array(quantity).fill(line)), 1000 * quantity]);
}

it("returns a stock conflict when repeated lines exceed the remaining warehouse balance", async () => {
  await sentInvoice("duplicate", 2);
  const res = await request(app).post("/api/invoice/duplicate/confirm").send({}).expect(409);
  expect(res.body.success).toBe(false);
  expect((await pg.query("SELECT status, order_id FROM manual_invoices WHERE id='duplicate'")).rows)
    .toEqual([{ status: "sent", order_id: null }]);
  expect((await pg.query("SELECT id FROM orders")).rows).toHaveLength(0);
});

it("rolls back the order and returns 409 if the database refuses the last unit during confirmation", async () => {
  await sentInvoice("last-unit", 1);
  await pg.exec(`
    CREATE FUNCTION refuse_raced_sale() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'insufficient inventory after active payment reservations for product p, variant null' USING ERRCODE='23514'; END $$;
    CREATE TRIGGER refuse_raced_sale BEFORE INSERT ON order_items_relational FOR EACH ROW EXECUTE FUNCTION refuse_raced_sale();
  `);
  try {
    const res = await request(app).post("/api/invoice/last-unit/confirm").send({}).expect(409);
    expect(res.body.message).toContain("تغيّر المخزون");
    expect((await pg.query("SELECT id FROM orders")).rows).toHaveLength(0);
    expect((await pg.query("SELECT status FROM manual_invoices WHERE id='last-unit'")).rows)
      .toEqual([{ status: "sent" }]);
  } finally {
    await pg.exec("DROP TRIGGER refuse_raced_sale ON order_items_relational");
  }
  const confirmed = await request(app).post("/api/invoice/last-unit/confirm").send({}).expect(200);
  await pg.exec("UPDATE inventory_movements SET quantity_delta=0");
  const replay = await request(app).post("/api/invoice/last-unit/confirm").send({}).expect(200);
  expect(replay.body.orderId).toBe(confirmed.body.orderId);
  expect((await pg.query("SELECT id FROM orders")).rows).toHaveLength(1);
});
