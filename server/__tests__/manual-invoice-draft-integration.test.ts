import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { insertManualInvoiceSchema } from "../../shared/schema.js";
import { getDb } from "../db.js";
import { InvoiceStorage } from "../storage/invoice-storage.js";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));

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
  storage = new InvoiceStorage();
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
