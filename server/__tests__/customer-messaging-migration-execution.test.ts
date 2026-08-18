import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "migrations/0079_customer_post_delivery_messaging.sql"),
  "utf8",
);

async function baseDb(withDependency = true): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE aquavo_runtime;
    CREATE TABLE public.orders (
      id text PRIMARY KEY,
      status text NOT NULL
    );
    CREATE TABLE public.schema_migrations (
      version text PRIMARY KEY,
      checksum text,
      notes text,
      applied_at timestamptz NOT NULL DEFAULT now(),
      rolled_back_at timestamptz
    );
  `);

  if (withDependency) {
    await db.exec(`
      INSERT INTO public.schema_migrations(version,checksum,notes)
      VALUES('0078_accounting_external_handoff_hardening','test','test dependency');
    `);
  }

  return db;
}

describe("0079 customer post-delivery messaging migration", () => {
  it("fails closed when accounting dependency 0078 is absent", async () => {
    const db = await baseDb(false);
    await expect(db.exec(migration)).rejects.toThrow(/0079_DEPENDENCY_MISSING/);
  });

  it("queues exactly one delivery-care job for a genuine delivered transition", async () => {
    const db = await baseDb();
    await db.exec(migration);
    await db.exec(`INSERT INTO public.orders(id,status) VALUES('order-1','shipped')`);

    await db.exec(`UPDATE public.orders SET status='delivered' WHERE id='order-1'`);
    await db.exec(`UPDATE public.orders SET status='delivered' WHERE id='order-1'`);

    const result = await db.query<{
      job_type: string;
      status: string;
      provider_status: string | null;
      provider_status_at: Date | null;
      count: string;
    }>(`
      SELECT job_type,status,provider_status,provider_status_at,count(*)::text AS count
      FROM public.customer_message_jobs
      WHERE order_id='order-1'
      GROUP BY job_type,status,provider_status,provider_status_at
    `);

    expect(result.rows).toEqual([
      {
        job_type: "delivery_care",
        status: "pending",
        provider_status: null,
        provider_status_at: null,
        count: "1",
      },
    ]);
  });

  it("creates an idempotent durable provider-status inbox", async () => {
    const db = await baseDb();
    await db.exec(migration);

    await db.exec(`
      INSERT INTO public.whatsapp_provider_status_events (
        provider_message_id,
        provider_status,
        provider_status_at,
        error_code
      ) VALUES (
        'wamid.test-1',
        'delivered',
        '2026-08-18T12:00:00Z',
        NULL
      )
      ON CONFLICT (provider_message_id, provider_status, provider_status_at) DO NOTHING;

      INSERT INTO public.whatsapp_provider_status_events (
        provider_message_id,
        provider_status,
        provider_status_at,
        error_code
      ) VALUES (
        'wamid.test-1',
        'delivered',
        '2026-08-18T12:00:00Z',
        NULL
      )
      ON CONFLICT (provider_message_id, provider_status, provider_status_at) DO NOTHING;
    `);

    const result = await db.query<{
      provider_message_id: string;
      provider_status: string;
      applied_at: Date | null;
      count: string;
    }>(`
      SELECT provider_message_id,provider_status,applied_at,count(*)::text AS count
      FROM public.whatsapp_provider_status_events
      WHERE provider_message_id='wamid.test-1'
      GROUP BY provider_message_id,provider_status,applied_at
    `);

    expect(result.rows).toEqual([
      {
        provider_message_id: "wamid.test-1",
        provider_status: "delivered",
        applied_at: null,
        count: "1",
      },
    ]);
  });

  it("does not enqueue review work during phase one", async () => {
    const db = await baseDb();
    await db.exec(migration);
    await db.exec(`INSERT INTO public.orders(id,status) VALUES('order-2','shipped')`);
    await db.exec(`UPDATE public.orders SET status='delivered' WHERE id='order-2'`);

    const result = await db.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM public.customer_message_jobs
      WHERE order_id='order-2'
        AND job_type IN ('review_request','review_reminder')
    `);
    expect(result.rows[0]?.count).toBe("0");
  });

  it("cancels a still-pending care job if delivery is corrected to a terminal problem state", async () => {
    const db = await baseDb();
    await db.exec(migration);
    await db.exec(`INSERT INTO public.orders(id,status) VALUES('order-3','shipped')`);
    await db.exec(`UPDATE public.orders SET status='delivered' WHERE id='order-3'`);
    await db.exec(`UPDATE public.orders SET status='returned' WHERE id='order-3'`);

    const result = await db.query<{ status: string; code: string | null }>(`
      SELECT status,last_error_code AS code
      FROM public.customer_message_jobs
      WHERE order_id='order-3' AND job_type='delivery_care'
    `);
    expect(result.rows[0]).toEqual({ status: "cancelled", code: "ORDER_NO_LONGER_DELIVERED" });
  });
});
