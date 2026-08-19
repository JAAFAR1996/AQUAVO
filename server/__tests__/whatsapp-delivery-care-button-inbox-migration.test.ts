import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration0079 = readFileSync(
  join(process.cwd(), "migrations/0079_customer_post_delivery_messaging.sql"),
  "utf8",
);
const migration0082 = readFileSync(
  join(process.cwd(), "migrations/0082_whatsapp_delivery_care_button_inbox.sql"),
  "utf8",
);

async function baseDb(): Promise<PGlite> {
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
    INSERT INTO public.schema_migrations(version,checksum,notes)
    VALUES('0078_accounting_external_handoff_hardening','test','dependency');
  `);
  return db;
}

describe("0082 WhatsApp delivery-care button inbox migration", () => {
  it("fails closed if 0079 is not active", async () => {
    const db = await baseDb();
    await expect(db.exec(migration0082)).rejects.toThrow(/0082_DEPENDENCY_MISSING/);
  });

  it("creates an idempotent inbox keyed by Meta inbound message id", async () => {
    const db = await baseDb();
    await db.exec(migration0079);
    await db.exec(migration0082);

    await db.exec(`
      INSERT INTO public.whatsapp_delivery_care_button_events (
        inbound_message_id,
        context_provider_message_id,
        sender_phone,
        button_payload,
        button_text,
        received_at
      ) VALUES (
        'wamid.inbound-1',
        'wamid.outbound-1',
        '9647721310937',
        'aquavo_delivery_ok_v1',
        'وصلتني وكلشي تمام',
        '2026-08-19T12:00:00Z'
      )
      ON CONFLICT (inbound_message_id) DO NOTHING;

      INSERT INTO public.whatsapp_delivery_care_button_events (
        inbound_message_id,
        context_provider_message_id,
        sender_phone,
        button_payload,
        button_text,
        received_at
      ) VALUES (
        'wamid.inbound-1',
        'wamid.outbound-1',
        '9647721310937',
        'aquavo_delivery_ok_v1',
        'وصلتني وكلشي تمام',
        '2026-08-19T12:00:00Z'
      )
      ON CONFLICT (inbound_message_id) DO NOTHING;
    `);

    const result = await db.query<{ count: string; applied_at: Date | null }>(`
      SELECT count(*)::text AS count, max(applied_at) AS applied_at
      FROM public.whatsapp_delivery_care_button_events
      WHERE inbound_message_id='wamid.inbound-1'
    `);

    expect(result.rows[0]).toEqual({ count: "1", applied_at: null });
  });
});
