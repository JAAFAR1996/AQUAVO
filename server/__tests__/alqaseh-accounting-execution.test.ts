import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "migrations/20260825_alqaseh_online_accounting.sql"),
  "utf8",
);

async function accountingDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(String.raw`
    CREATE TABLE orders(
      id text PRIMARY KEY,
      order_number text NOT NULL,
      status text NOT NULL,
      delivered_at timestamptz,
      rounded_total numeric,
      total numeric NOT NULL,
      shipping_cost numeric NOT NULL DEFAULT 0,
      carrier_fee numeric,
      points_discount numeric NOT NULL DEFAULT 0,
      discount_total numeric NOT NULL DEFAULT 0,
      carrier text,
      total_formula_version text,
      payment_status text NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE payments(
      id text PRIMARY KEY,
      order_id text NOT NULL UNIQUE,
      amount numeric NOT NULL,
      currency text NOT NULL DEFAULT 'IQD',
      method text NOT NULL,
      status text NOT NULL,
      transaction_id text,
      provider_response jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE delivery_companies(
      company_key text PRIMARY KEY,
      name text NOT NULL,
      active boolean NOT NULL DEFAULT true
    );

    CREATE TABLE order_items_relational(
      id text PRIMARY KEY,
      order_id text NOT NULL,
      quantity numeric NOT NULL,
      cost_snapshot_status text,
      unit_cost_price numeric,
      unit_packaging_cost numeric,
      unit_insert_cost numeric
    );

    CREATE TABLE payment_events(
      id text PRIMARY KEY DEFAULT ('pe-' || substr(md5(random()::text),1,20)),
      order_id text NOT NULL,
      event_type text NOT NULL,
      status text NOT NULL,
      amount numeric NOT NULL,
      currency text NOT NULL DEFAULT 'IQD',
      method text NOT NULL,
      provider text,
      provider_transaction_id text,
      idempotency_key text NOT NULL UNIQUE,
      occurred_at timestamptz NOT NULL,
      evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by text
    );

    CREATE TABLE order_accounting_facts(
      id text PRIMARY KEY DEFAULT ('fact-' || substr(md5(random()::text),1,20)),
      order_id text NOT NULL UNIQUE,
      payment_event_id text NOT NULL,
      recognized_at timestamptz NOT NULL,
      period_key text NOT NULL,
      gross_collected numeric NOT NULL,
      customer_delivery_fee numeric NOT NULL,
      carrier_fee numeric NOT NULL,
      product_revenue numeric NOT NULL,
      rounding_adjustment numeric NOT NULL,
      merchant_net numeric NOT NULL,
      delivery_subsidy numeric NOT NULL,
      delivery_surplus numeric NOT NULL,
      cash_custody text NOT NULL,
      cogs_amount numeric,
      cost_status text NOT NULL,
      currency text NOT NULL,
      policy_version text NOT NULL,
      carrier_snapshot text,
      evidence jsonb NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE journal_entries(
      id text PRIMARY KEY DEFAULT ('je-' || substr(md5(random()::text),1,20)),
      entry_date timestamptz NOT NULL,
      period_key text NOT NULL,
      source_type text NOT NULL,
      source_id text NOT NULL,
      event_kind text NOT NULL,
      description text,
      total_debit numeric NOT NULL,
      total_credit numeric NOT NULL,
      evidence jsonb NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE TABLE journal_lines(
      entry_id text NOT NULL,
      line_number integer NOT NULL,
      account_code text NOT NULL,
      debit numeric NOT NULL DEFAULT 0,
      credit numeric NOT NULL DEFAULT 0,
      memo text,
      dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
      PRIMARY KEY(entry_id,line_number)
    );

    CREATE OR REPLACE FUNCTION aquavo_active_cutover() RETURNS timestamptz
    LANGUAGE sql AS $$ SELECT '2000-01-01T00:00:00Z'::timestamptz $$;

    CREATE OR REPLACE FUNCTION validate_journal_entry(p_id text) RETURNS void
    LANGUAGE plpgsql AS $$
    DECLARE d numeric; c numeric;
    BEGIN
      SELECT COALESCE(SUM(debit),0),COALESCE(SUM(credit),0)
      INTO d,c FROM journal_lines WHERE entry_id=p_id;
      IF d<>c THEN RAISE EXCEPTION 'UNBALANCED % %',d,c; END IF;
    END $$;

    CREATE OR REPLACE FUNCTION post_order_cogs_journal(p_fact_id text) RETURNS text
    LANGUAGE sql AS $$ SELECT p_fact_id $$;

    CREATE OR REPLACE FUNCTION post_order_fulfillment_journal(p_order_id text) RETURNS text
    LANGUAGE sql AS $$ SELECT p_order_id $$;
  `);

  await db.exec(migration);
  await db.exec(`
    CREATE TRIGGER orders_record_delivery_accounting
    AFTER UPDATE OF status ON orders
    FOR EACH ROW EXECUTE FUNCTION record_order_delivery_accounting();
  `);
  return db;
}

async function seedOrder(
  db: PGlite,
  id: string,
  options: { online?: boolean; paymentStatus?: string; paymentAmount?: number; carrier?: string } = {},
): Promise<void> {
  const paymentStatus = options.paymentStatus ?? (options.online ? "paid" : "pending");
  const carrier = options.carrier ?? "Fast Carrier";
  await db.exec(`
    INSERT INTO orders(
      id,order_number,status,total,rounded_total,shipping_cost,carrier_fee,points_discount,
      discount_total,carrier,total_formula_version,payment_status
    ) VALUES(
      '${id}','ORD-${id}','shipped',30000,30000,5000,5000,0,0,'${carrier}','v5','${paymentStatus}'
    );
    INSERT INTO order_items_relational(
      id,order_id,quantity,cost_snapshot_status,unit_cost_price,unit_packaging_cost,unit_insert_cost
    ) VALUES ('item-${id}','${id}',1,'exact',10000,0,0);
  `);
  if (options.online) {
    const amount = options.paymentAmount ?? 30000;
    const status = paymentStatus === "paid" ? "completed" : "pending";
    await db.exec(`
      INSERT INTO payments(id,order_id,amount,currency,method,status,transaction_id)
      VALUES ('pay-${id}','${id}',${amount},'IQD','alqaseh','${status}','alq-${id}');
    `);
  }
}

async function deliver(db: PGlite, id: string): Promise<void> {
  await db.exec(`UPDATE orders SET status='delivered', delivered_at=now() WHERE id='${id}'`);
}

describe("Al-Qaseh delivery accounting execution", () => {
  it("records a paid Al-Qaseh delivery as bank capture, never COD", async () => {
    const db = await accountingDb();
    await seedOrder(db, "online", { online: true });
    await deliver(db, "online");

    const events = await db.query<Record<string, string>>(`
      SELECT event_type,method,provider,provider_transaction_id,amount::text amount
      FROM payment_events WHERE order_id='online'
    `);
    expect(events.rows).toHaveLength(1);
    expect(events.rows[0]).toMatchObject({
      event_type: "capture",
      method: "alqaseh",
      provider: "alqaseh",
      provider_transaction_id: "alq-online",
      amount: "30000",
    });

    const facts = await db.query<Record<string, string>>(`
      SELECT cash_custody,policy_version,evidence->>'payment_method' payment_method
      FROM order_accounting_facts WHERE order_id='online'
    `);
    expect(facts.rows[0]).toMatchObject({
      cash_custody: "bank",
      policy_version: "v6_alqaseh_online_accounting",
      payment_method: "alqaseh",
    });

    const journal = await db.query<Record<string, string>>(`
      SELECT description,total_debit::text total_debit,total_credit::text total_credit
      FROM journal_entries WHERE source_id='online' AND event_kind='delivery_recognition'
    `);
    expect(journal.rows[0]).toMatchObject({
      description: "إثبات بيع مدفوع إلكترونياً عند التسليم",
      total_debit: "30000",
      total_credit: "30000",
    });

    const bankLine = await db.query<Record<string, string>>(`
      SELECT account_code,debit::text debit FROM journal_lines
      WHERE entry_id=(SELECT id FROM journal_entries WHERE source_id='online')
        AND account_code='1010'
    `);
    expect(bankLine.rows[0]).toMatchObject({ account_code: "1010", debit: "30000" });

    const cod = await db.query<{ count: number }>(`
      SELECT COUNT(*)::int count FROM payment_events WHERE order_id='online' AND event_type='cod_received'
    `);
    expect(cod.rows[0]?.count).toBe(0);
  });

  it("preserves COD delivery accounting when there is no online payment", async () => {
    const db = await accountingDb();
    await seedOrder(db, "cod");
    await deliver(db, "cod");

    const event = await db.query<Record<string, string>>(`
      SELECT event_type,method FROM payment_events WHERE order_id='cod'
    `);
    expect(event.rows[0]).toMatchObject({ event_type: "cod_received", method: "cod" });

    const fact = await db.query<Record<string, string>>(`
      SELECT cash_custody,evidence->>'payment_method' payment_method
      FROM order_accounting_facts WHERE order_id='cod'
    `);
    expect(fact.rows[0]).toMatchObject({ cash_custody: "carrier", payment_method: "cod" });
  });

  it("blocks delivery when an Al-Qaseh payment is not completed", async () => {
    const db = await accountingDb();
    await seedOrder(db, "pending-online", { online: true, paymentStatus: "pending" });
    await expect(deliver(db, "pending-online")).rejects.toThrow(/ONLINE_PAYMENT_NOT_COMPLETED_FOR_DELIVERY/);

    const order = await db.query<{ status: string }>(`SELECT status FROM orders WHERE id='pending-online'`);
    expect(order.rows[0]?.status).toBe("shipped");
  });

  it("blocks delivery when the verified payment amount does not match the order", async () => {
    const db = await accountingDb();
    await seedOrder(db, "mismatch", { online: true, paymentAmount: 29750 });
    await expect(deliver(db, "mismatch")).rejects.toThrow(/ONLINE_PAYMENT_AMOUNT_MISMATCH/);

    const events = await db.query<{ count: number }>(`
      SELECT COUNT(*)::int count FROM payment_events WHERE order_id='mismatch'
    `);
    expect(events.rows[0]?.count).toBe(0);
  });
});
