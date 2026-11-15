import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { getTableColumns, getTableName } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { orders, orderItems } from "../../shared/schema.js";
import router from "../routes/ai-advanced.js";

const fixture = vi.hoisted(() => ({ db: null as PgliteDatabase | null }));
vi.mock("../db.js", () => ({ get db() { return fixture.db; }, getDb: () => fixture.db }));
vi.mock("../storage/index.js", () => ({
  storage: { getUser: async (id: string) => ({ id, role: "user" }) },
}));
vi.mock("../cron/scheduled-jobs.js", () => ({ triggerJob: vi.fn(), getJobStatus: vi.fn() }));

const client = new PGlite();
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  Object.assign(req, { session: { userId: "owner" } });
  next();
});
app.use("/api/ai-advanced", router);

beforeAll(async () => {
  fixture.db = drizzle(client);
  for (const table of [orders, orderItems]) {
    const columns = Object.values(getTableColumns(table)).map(column => `"${column.name}" ${column.getSQLType()}`);
    await client.exec(`CREATE TABLE "${getTableName(table)}" (${columns.join(", ")})`);
  }
  const migration = readFileSync("migrations/0003_tidy_swarm.sql", "utf8");
  const returnTable = migration.split("--> statement-breakpoint").find(sql => sql.includes('CREATE TABLE "return_requests"'));
  if (!returnTable) throw new Error("Missing return_requests migration");
  await client.exec(returnTable);
  await client.exec(`
    INSERT INTO orders (id, user_id) VALUES ('order', 'owner');
    INSERT INTO order_items_relational (id, order_id, product_id) VALUES ('line', 'order', 'filter');
  `);
});

afterAll(() => client.close());

const form = {
  orderId: "order", productId: "filter", reason: "damaged",
  description: "غطاء الفلتر وصل مكسور", photos: ["/fixtures/lid.webp", "/fixtures/box.webp"],
};
const endpoint = "/api/ai-advanced/returns";

describe("customer return evidence", () => {
  it("persists the description and photo references with the owner's pending request", async () => {
    const response = await request(app).post(endpoint).send(form).expect(200);
    expect(response.body.data.status).toBe("pending");
    const row = await client.query(
      "SELECT detailed_description, images, user_id, status FROM return_requests WHERE id = $1",
      [response.body.data.requestId],
    );
    expect(row.rows).toEqual([{
      detailed_description: form.description, images: form.photos, user_id: "owner", status: "pending",
    }]);
  });

  it("keeps photos optional and rejects a request submitted as another customer", async () => {
    const response = await request(app).post(endpoint).send({ ...form, photos: undefined }).expect(200);
    const row = await client.query("SELECT images FROM return_requests WHERE id = $1", [response.body.data.requestId]);
    expect(row.rows).toEqual([{ images: [] }]);

    await request(app).post(endpoint).send({ ...form, userId: "another-user" }).expect(403);
    const other = await client.query("SELECT id FROM return_requests WHERE user_id = 'another-user'");
    expect(other.rows).toEqual([]);
  });
});
