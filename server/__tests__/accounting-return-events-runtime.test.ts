import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

let client: PGlite;
let testDb: ReturnType<typeof drizzle>;
let app: express.Express;

vi.mock("../db.js", async () => {
  const actual = await vi.importActual<typeof import("../db.js")>("../db.js");
  return { ...actual, getDb: () => testDb };
});

vi.mock("../middleware/accounting-auth-v2.js", () => ({
  requireAccountingAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

beforeAll(async () => {
  client = new PGlite();
  await client.exec(`
    CREATE TABLE public.orders (
      id text PRIMARY KEY,
      order_number text,
      status text
    );

    CREATE TABLE public.order_return_events (
      id text PRIMARY KEY,
      order_id text NOT NULL,
      type text NOT NULL,
      reason text,
      refund_amount numeric DEFAULT 0,
      delivery_cost_loss numeric DEFAULT 0,
      return_shipping_cost numeric DEFAULT 0,
      packaging_loss numeric DEFAULT 0,
      product_write_off_amount numeric DEFAULT 0,
      cogs_loss numeric DEFAULT 0,
      restocked boolean DEFAULT false,
      restocked_at timestamptz,
      affected_items jsonb,
      status text NOT NULL,
      note text,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE public.order_return_packaging_losses (
      id text PRIMARY KEY,
      return_event_id text NOT NULL,
      original_total_cost_snapshot numeric,
      is_reclassification_only boolean NOT NULL DEFAULT false
    );

    INSERT INTO public.orders (id, order_number, status) VALUES
      ('order-a', 'FH-RUNTIME-A', 'delivered'),
      ('order-b', 'FH-RUNTIME-B', 'delivered');

    INSERT INTO public.order_return_events
      (id, order_id, type, refund_amount, status, note, created_at, updated_at)
    VALUES
      ('verified-a', 'order-a', 'customer_return', 13000, 'verified', 'confirmed return', now(), now()),
      ('disputed-a', 'order-a', 'customer_return', 18000, 'disputed', 'preserved as disputed legacy record', now(), now()),
      ('verified-b', 'order-b', 'partial_return', 6000, 'verified', 'confirmed return', now(), now()),
      ('recorded-b', 'order-b', 'partial_return', 6500, 'recorded', 'pending review', now(), now());
  `);

  testDb = drizzle(client);

  const { createAccountingAutomaticReturnsV2Router } = await import("../routes/accounting-automatic-returns-v2.js");
  app = express();
  app.use("/api/admin/accounting", createAccountingAutomaticReturnsV2Router());
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  });
});

afterAll(async () => {
  await client.close();
});

const api = () => request(app);
const BASE = "/api/admin/accounting/return-events";

describe("runtime return-events route", () => {
  it("keeps the unfiltered endpoint audit-capable", async () => {
    const res = await api().get(`${BASE}?period=year`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.summary).toMatchObject({
      totalEvents: 4,
      recordedEvents: 1,
      verifiedEvents: 2,
      disputedEvents: 1,
    });
  });

  it("returns only the requested order when orderId is supplied", async () => {
    const res = await api().get(`${BASE}?period=year&orderId=order-a`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(new Set(res.body.data.map((row: { orderId: string }) => row.orderId))).toEqual(new Set(["order-a"]));
  });

  it("returns only verified events for the operational Order Details request", async () => {
    const res = await api().get(`${BASE}?period=year&orderId=order-a&status=verified`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: "verified-a",
      orderId: "order-a",
      status: "verified",
      refundAmount: 13000,
    });
    expect(res.body.summary).toMatchObject({
      totalEvents: 1,
      recordedEvents: 0,
      verifiedEvents: 1,
      disputedEvents: 0,
    });
    expect(JSON.stringify(res.body)).not.toContain("preserved as disputed legacy record");
  });

  it("still exposes disputed records when audit explicitly requests them", async () => {
    const res = await api().get(`${BASE}?period=year&orderId=order-a&status=disputed`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: "disputed-a",
      orderId: "order-a",
      status: "disputed",
      note: "preserved as disputed legacy record",
    });
  });

  it("is read-only and preserves every return-event row and status", async () => {
    await api().get(`${BASE}?period=year&orderId=order-a&status=verified`).expect(200);

    const result = await client.query<{ id: string; status: string; refund_amount: string }>(
      "SELECT id, status, refund_amount::text FROM public.order_return_events ORDER BY id",
    );

    expect(result.rows).toEqual([
      { id: "disputed-a", status: "disputed", refund_amount: "18000" },
      { id: "recorded-b", status: "recorded", refund_amount: "6500" },
      { id: "verified-a", status: "verified", refund_amount: "13000" },
      { id: "verified-b", status: "verified", refund_amount: "6000" },
    ]);
  });
});
