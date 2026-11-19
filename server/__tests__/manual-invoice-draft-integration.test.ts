import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { insertManualInvoiceSchema } from "../../shared/schema.js";
import { getDb } from "../db.js";
import { withManualInvoiceAvailability } from "../services/manual-invoice-stock.js";
import type { Product } from "../../shared/schema.js";
import type { InvoiceStorage } from "../storage/invoice-storage.js";
import express from "express";
import request from "supertest";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));
const search = vi.hoisted(() => ({
  getUser: async () => ({ id: "admin", role: "admin" }), getProducts: vi.fn(), getProductsByIds: vi.fn(),
}));
vi.mock("../storage/index.js", () => ({ storage: search }));
vi.mock("../services/embedding-generator.js", () => ({
  embeddingGenerator: { semanticSearch: async () => [{ productId: "semantic-p", similarity: 0.95 }] },
}));

let pg: PGlite;
let storage: InvoiceStorage;
const read = (file: string) => readFileSync(`migrations/${file}.sql`, "utf8");

beforeAll(async () => {
  pg = new PGlite();
  const initialTable = read("0004_slim_red_shift").split("--> statement-breakpoint")
    .find(statement => statement.includes('CREATE TABLE "manual_invoices"'));
  if (!initialTable) throw new Error("Missing manual invoice schema fixture");
  await pg.exec(initialTable);
  await pg.exec(`
    ALTER TABLE manual_invoices ADD COLUMN financially_counted boolean;
    CREATE TABLE schema_migrations (version text PRIMARY KEY, checksum text, notes text);
    CREATE TABLE products (
      id text PRIMARY KEY, name text, variants jsonb, price numeric, stock integer,
      has_variants boolean DEFAULT false, cost_price numeric, packaging_cost numeric,
      insert_cost numeric, deleted_at timestamptz
    );
    CREATE TABLE inventory_locations (id text PRIMARY KEY, code text, is_active boolean);
    CREATE TABLE inventory_movements (product_id text, variant_id text, location_id text, quantity_delta integer);
    CREATE VIEW inventory_canonical_balances AS
      SELECT product_id,variant_id,location_id,SUM(quantity_delta) AS canonical_stock
      FROM inventory_movements GROUP BY product_id,variant_id,location_id;
    CREATE TABLE payment_stock_reservations (product_id text, variant_id text, quantity integer, status text, expires_at timestamptz);
    INSERT INTO inventory_locations VALUES ('w','MAIN',true), ('elsewhere','OTHER',true);
    INSERT INTO inventory_movements VALUES ('p', NULL, 'w', 12);
    CREATE TABLE content_translations (entity_id text, entity_type text, locale text, data jsonb);
    INSERT INTO products (id, name, price, stock) VALUES ('p', 'فلتر', 850, 12);
    INSERT INTO content_translations VALUES ('p', 'product', 'ckb', '{"name":"پاڵێوەر"}');
    INSERT INTO manual_invoices(id, invoice_no, token, customer_name, customer_phone, items)
    VALUES ('old', 'old', 'old', 'test', 'test', '[]');
  `);
  const migration = read("0105_manual_invoice_locale");
  const hash = createHash("sha256").update(migration).digest("hex");
  await pg.query("SELECT set_config('aquavo.migration_checksum', $1, false)", [hash]);
  await pg.exec(migration);
  await pg.exec(migration);
  vi.mocked(getDb).mockReturnValue(drizzle(pg) as unknown as ReturnType<typeof getDb>);
  storage = (await import("../storage/invoice-storage.js")).invoiceStorage;
});
afterAll(async () => { await pg.close(); });

it("preserves historical links, recovers concurrent saves and updates the draft language without changing amounts", async () => {
  expect((await storage.getByToken("old"))?.invoiceLocale).toBe("ar");
  const data = insertManualInvoiceSchema.parse({
    invoiceLocale: "ckb", items: [{ productId: "p", name: "test", unitPrice: 850, total: 1700, quantity: 2 }],
    customerName: "test", customerPhone: "07700000000", subtotal: 1700, total: 1750,
  });
  const id = "e6f07831-2230-4b3c-a22e-fcbabafe0b01";
  const [first, retry] = await Promise.all([storage.create(data, "admin", id), storage.create(data, "admin", id)]);
  expect(retry).toEqual(first);
  expect(first.items[0]).toMatchObject({ name: "پاڵێوەر", total: 1700 });
  expect((await storage.listInvoices()).length).toBe(2);
  await expect(storage.create(data, "other-admin", id)).rejects.toMatchObject({ status: 409 });
  const edited = await storage.update(id, { invoiceLocale: "ar" });
  expect(edited?.items[0]).toMatchObject({ name: "فلتر", total: 1700, quantity: 2 });
  expect(edited?.total).toBe(first.total);
  expect(edited?.token).toBe(first.token);
});


it("reshares the original Sorani receipt, expiry and frozen product names, then refuses an expired link", async () => {
  const input = insertManualInvoiceSchema.parse({
    invoiceLocale: "ckb", customerName: "test", customerPhone: "07700000000",
    items: [{ productId: "p", name: "browser text", unitPrice: 850, total: 850, quantity: 1 }],
    subtotal: 850, total: 850,
  });
  const draft = await storage.create(input, "admin");
  const sent = await storage.send(draft.id);
  expect(sent).toMatchObject({
    status: "sent", token: draft.token, invoiceLocale: "ckb", items: [{ name: "پاڵێوەر" }],
  });
  expect(sent?.expiresAt).toBeInstanceOf(Date);
  await pg.query("UPDATE content_translations SET data = $1::jsonb WHERE entity_id = 'p'", [
    JSON.stringify({ name: "updated after sharing" }),
  ]);
  expect(await storage.send(draft.id)).toEqual(sent);
  await pg.query("UPDATE manual_invoices SET expires_at = now() - interval '5 minutes' WHERE id = $1", [draft.id]);
  const expired = await storage.getById(draft.id);
  await expect(storage.send(draft.id)).rejects.toMatchObject({ status: 410 });
  expect(await storage.getById(draft.id)).toEqual(expired);
});

it("caps each exact SKU at MAIN quantity less active holds and rechecks duplicate lines on draft changes and first share", async () => {
  const opts = [{ id: "s", label: "صغير", price: 850, stock: 7 }, { id: "l", label: "كبير", price: 950, stock: 8 }];
  await pg.query("INSERT INTO products (id,name,price,stock,has_variants,variants) VALUES ('size','فلتر',850,15,true,$1::jsonb)", [JSON.stringify(opts)]);
  await pg.exec(`
    INSERT INTO inventory_movements VALUES ('size','s','w',4), ('size','l','w',8), ('size','s','elsewhere',50);
    INSERT INTO payment_stock_reservations VALUES ('size','s',2,'active',now()+interval '1 day'),
      ('size','s',4,'released',now()+interval '1 day'), ('size','s',3,'active',now()-interval '1 day');
  `);
  const [choice] = await withManualInvoiceAvailability(drizzle(pg), [
    { id: "size", name: "فلتر", price: "850", stock: 15, hasVariants: true, variants: opts } as Product,
  ]);
  expect(choice.variants?.map(v => v.stock)).toEqual([2, 8]);

  const line = { productId: "size", variantId: "s", name: "فلتر", unitPrice: 850, total: 850, quantity: 1 };
  const data = insertManualInvoiceSchema.parse({ customerName: "test", customerPhone: "07700000000",
    items: [line, line], subtotal: 1700, total: 1700 });
  const key = "5546aa2c-b6b2-4cd2-bce3-aceb3def0b9a";
  const draft = await storage.create(data, "admin", key);
  const unavailable = { status: 409, code: "INVOICE_STOCK_UNAVAILABLE", productId: "size", variantId: "s", available: 2 };
  const extra = [...data.items, line];
  await expect(storage.create({ ...data, items: extra }, "admin")).rejects.toMatchObject(unavailable);
  await expect(storage.update(draft.id, { items: extra })).rejects.toMatchObject(unavailable);
  expect((await storage.getById(draft.id))?.items).toHaveLength(2);
  await pg.exec("INSERT INTO inventory_movements VALUES ('size','s','w',-2)");
  await expect(storage.send(draft.id)).rejects.toMatchObject({ ...unavailable, available: 0 });
  expect((await storage.getById(draft.id))?.status).toBe("draft");
  expect(await storage.create(data, "admin", key)).toEqual(draft);
});

it("rejects a deleted or unbacked SKU even when the catalog still reports stock", async () => {
  await pg.exec("INSERT INTO products (id,name,price,stock) VALUES ('unbacked','صوندة',850,20)");
  const data = insertManualInvoiceSchema.parse({ customerName: "test", customerPhone: "07700000000",
    items: [{ productId: "unbacked", name: "صوندة", unitPrice: 850, total: 850, quantity: 1 }],
    subtotal: 850, total: 850 });
  await expect(storage.create(data, "admin")).rejects.toMatchObject({ code: "INVOICE_STOCK_UNAVAILABLE", available: 0 });
  await pg.exec("INSERT INTO inventory_movements VALUES ('unbacked',NULL,'w',5); UPDATE products SET deleted_at=now() WHERE id='unbacked'");
  await expect(storage.create(data, "admin")).rejects.toMatchObject({ code: "INVOICE_STOCK_UNAVAILABLE", available: 0 });
});

it("serves warehouse-aware lexical and semantic search results and a recoverable 409 through the admin router", async () => {
  const { createAdminInvoicesRouter } = await import("../routes/admin-invoices.js");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { Object.assign(req, { session: { userId: "admin" } }); next(); });
  app.use("/invoices", createAdminInvoicesRouter());
  // The search projection is lower than the ledger for this SKU. Reserve from the
  // lower figure; a discontinued public listing can still be sold offline.
  await pg.exec(`
    ALTER TABLE products ADD COLUMN is_storefront_visible boolean;
    INSERT INTO products (id,name,price,stock,is_storefront_visible) VALUES ('semantic-p','صوندة',900,5,false);
    INSERT INTO inventory_movements VALUES ('semantic-p',NULL,'w',9);
    INSERT INTO payment_stock_reservations VALUES ('semantic-p',NULL,2,'active',now()+interval '1 day');
  `);
  search.getProducts.mockResolvedValue([{ id: "p", name: "فلتر", price: 850, stock: 12 }]);
  search.getProductsByIds.mockResolvedValue([{ id: "semantic-p", name: "صوندة", price: 900, stock: 5 }]);
  const found = await request(app).get("/invoices/product-search?q=test").expect(200);
  expect(found.body.products.map((p: Product) => [p.id, p.stock])).toEqual([["p", 12], ["semantic-p", 3]]);
  const result = await request(app).post("/invoices").send({
    customerName: "test", customerPhone: "07700000000", subtotal: 3600, total: 3600,
    items: [{ productId: "semantic-p", name: "صوندة", quantity: 4, unitPrice: 900, total: 3600 }],
  }).expect(409);
  expect(result.body).toMatchObject({
    success: false, code: "INVOICE_STOCK_UNAVAILABLE", productId: "semantic-p", variantId: null, available: 3,
  });
  expect(result.body.message).toContain("صوندة");
});
