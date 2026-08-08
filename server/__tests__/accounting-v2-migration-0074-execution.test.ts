import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration73 = readFileSync(join(process.cwd(), "migrations/0073_accounting_final_hardening.sql"), "utf8");
const migration74 = readFileSync(join(process.cwd(), "migrations/0074_purchase_received_quantity_immutability.sql"), "utf8");

function functionSql(body: string, name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}`;
  const start = body.indexOf(marker);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const end = body.indexOf("$function$;", start);
  if (end < 0) throw new Error(`Unterminated function ${name}`);
  return body.slice(start, end + "$function$;".length);
}

function viewSql(name: string): string {
  const marker = `CREATE OR REPLACE VIEW public.${name}`;
  const start = migration73.indexOf(marker);
  if (start < 0) throw new Error(`Missing view ${name}`);
  const end = migration73.indexOf(";\n", start);
  if (end < 0) throw new Error(`Unterminated view ${name}`);
  return migration73.slice(start, end + 1);
}

async function procurementDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(String.raw`
    CREATE ROLE aquavo_runtime;
    CREATE TABLE suppliers(id text PRIMARY KEY, display_name text NOT NULL);
    CREATE TABLE products(
      id text PRIMARY KEY, stock integer NOT NULL DEFAULT 0, cost_price numeric,
      variants jsonb, has_variants boolean NOT NULL DEFAULT false, deleted_at timestamp,
      cost_price_resolution text, cost_resolution_note text, cost_resolution_by text, cost_resolution_at timestamptz
    );
    CREATE TABLE purchase_orders(
      id text PRIMARY KEY, supplier_id text NOT NULL, status text NOT NULL, currency text NOT NULL,
      subtotal numeric NOT NULL DEFAULT 0, shipping_cost numeric NOT NULL DEFAULT 0,
      customs_cost numeric NOT NULL DEFAULT 0, other_cost numeric NOT NULL DEFAULT 0, total numeric NOT NULL DEFAULT 0,
      exchange_rate_to_iqd numeric, exchange_rate_source text, exchange_rate_effective_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE purchase_order_items(
      id text PRIMARY KEY, purchase_order_id text NOT NULL, supplier_product_id text, product_id text NOT NULL,
      variant_id text, ordered_quantity numeric NOT NULL, received_quantity numeric NOT NULL DEFAULT 0,
      unit_cost numeric NOT NULL, line_total numeric NOT NULL
    );
    CREATE TABLE goods_receipts(
      id text PRIMARY KEY, purchase_order_id text NOT NULL, location_id text NOT NULL, status text NOT NULL,
      received_at timestamptz, verified_at timestamptz, verified_by text, notes text, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE goods_receipt_items(
      id text PRIMARY KEY, goods_receipt_id text NOT NULL, purchase_order_item_id text NOT NULL,
      product_id text NOT NULL, variant_id text, accepted_quantity numeric NOT NULL DEFAULT 0,
      unit_cost numeric, inventory_movement_id text
    );
    CREATE TABLE landed_cost_allocations(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, purchase_order_id text NOT NULL,
      purchase_order_item_id text, allocated_amount_iqd numeric, payee_type text
    );
    CREATE TABLE inventory_movements(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, product_id text NOT NULL, variant_id text,
      location_id text NOT NULL, quantity_delta integer NOT NULL, movement_type text NOT NULL,
      source_type text, source_id text, idempotency_key text UNIQUE, unit_cost numeric, currency text,
      happened_at timestamptz, created_by text, reversed_movement_id text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE inventory_cost_events(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, movement_id text NOT NULL UNIQUE,
      product_id text NOT NULL, variant_id text, method text NOT NULL, qty_before numeric NOT NULL,
      unit_cost_before numeric NOT NULL, received_qty numeric NOT NULL, received_value_iqd numeric NOT NULL,
      unit_cost_after numeric NOT NULL, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE journal_entries(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, entry_date timestamptz NOT NULL,
      period_key text NOT NULL, source_type text NOT NULL, source_id text NOT NULL, event_kind text NOT NULL,
      description text, total_debit numeric NOT NULL, total_credit numeric NOT NULL,
      reversal_of_entry_id text, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_by text
    );
    CREATE TABLE journal_lines(
      entry_id text NOT NULL, line_number integer NOT NULL, account_code text NOT NULL,
      debit numeric NOT NULL DEFAULT 0, credit numeric NOT NULL DEFAULT 0, memo text,
      dimensions jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE purchase_accounting_facts(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, goods_receipt_id text NOT NULL UNIQUE,
      purchase_order_id text NOT NULL, supplier_id text NOT NULL, recognized_at timestamptz NOT NULL,
      period_key text NOT NULL, currency text NOT NULL, exchange_rate_to_iqd numeric NOT NULL,
      base_inventory_iqd numeric NOT NULL, landed_cost_iqd numeric NOT NULL DEFAULT 0,
      inventory_value_iqd numeric NOT NULL, payable_iqd numeric NOT NULL,
      policy_version text NOT NULL DEFAULT 'p2p_v1_receipt_accrual', evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by text, created_at timestamptz NOT NULL DEFAULT now(), payable_original numeric NOT NULL
    );
    CREATE TABLE purchase_accounting_reversals(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, purchase_accounting_fact_id text NOT NULL UNIQUE,
      goods_receipt_id text NOT NULL UNIQUE, reversed_at timestamptz NOT NULL DEFAULT now(), reason text NOT NULL,
      journal_entry_id text NOT NULL, created_by text, evidence jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE supplier_payments(id integer PRIMARY KEY, status text, accounting_posted_at timestamptz);
    CREATE TABLE supplier_payment_applications(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, payment_id integer NOT NULL,
      purchase_accounting_fact_id text NOT NULL, applied_amount_iqd numeric NOT NULL,
      status text NOT NULL DEFAULT 'matched', matched_at timestamptz NOT NULL DEFAULT now(), reversed_at timestamptz,
      evidence jsonb NOT NULL DEFAULT '{}'::jsonb, applied_amount_original numeric,
      carrying_amount_iqd numeric, cash_amount_iqd numeric, fx_difference_iqd numeric,
      UNIQUE(payment_id,purchase_accounting_fact_id)
    );
    CREATE OR REPLACE FUNCTION validate_journal_entry(p_id text) RETURNS void LANGUAGE plpgsql AS $$
    DECLARE d numeric; c numeric; BEGIN
      SELECT COALESCE(SUM(debit),0),COALESCE(SUM(credit),0) INTO d,c FROM journal_lines WHERE entry_id=p_id;
      IF d<>c THEN RAISE EXCEPTION 'UNBALANCED'; END IF;
    END $$;

    INSERT INTO suppliers VALUES ('supplier-a','Supplier A');
    INSERT INTO products(id,stock,cost_price,variants,has_variants,cost_price_resolution)
    VALUES ('product-a',10,50,'[]',false,'known');
    INSERT INTO inventory_movements(id,product_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,unit_cost,currency,happened_at,metadata)
    VALUES ('opening','product-a','main',10,'opening','opening','opening','opening',50,'IQD',now(),'{}');
  `);

  for (const name of [
    "set_current_inventory_unit_cost",
    "prepare_purchase_receipt_weighted_cost",
    "apply_purchase_receipt_weighted_cost",
    "prepare_purchase_accounting_fact_currency",
    "post_goods_receipt",
    "reverse_posted_goods_receipt",
  ]) await db.exec(functionSql(migration73, name));

  for (const name of [
    "arm_purchase_received_quantity_internal_context",
    "clear_purchase_received_quantity_internal_context",
    "guard_accounted_purchase_order_item_mutation",
  ]) await db.exec(functionSql(migration74, name));

  await db.exec(viewSql("v_supplier_payables"));
  await db.exec(viewSql("v_procurement_accounting_readiness"));

  await db.exec(`CREATE TRIGGER purchase_accounting_fact_currency_prepare BEFORE INSERT ON purchase_accounting_facts FOR EACH ROW EXECUTE FUNCTION prepare_purchase_accounting_fact_currency()`);
  await db.exec(`CREATE TRIGGER inventory_movements_purchase_wac_prepare BEFORE INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION prepare_purchase_receipt_weighted_cost()`);
  await db.exec(`CREATE TRIGGER inventory_movements_purchase_wac_apply AFTER INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION apply_purchase_receipt_weighted_cost()`);
  await db.exec(`CREATE TRIGGER inventory_movements_received_quantity_context AFTER INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION arm_purchase_received_quantity_internal_context()`);
  await db.exec(`CREATE TRIGGER purchase_order_items_accounted_immutable BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION guard_accounted_purchase_order_item_mutation()`);
  await db.exec(`CREATE TRIGGER purchase_order_items_received_quantity_context_clear AFTER UPDATE OF received_quantity ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION clear_purchase_received_quantity_internal_context()`);

  await db.exec(`GRANT USAGE ON SCHEMA public TO aquavo_runtime`);
  await db.exec(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO aquavo_runtime`);
  await db.exec(`GRANT INSERT ON inventory_movements TO aquavo_runtime`);
  await db.exec(`GRANT UPDATE ON purchase_order_items TO aquavo_runtime`);
  return db;
}

async function seedOrder(db: PGlite): Promise<void> {
  await db.exec(`
    INSERT INTO purchase_orders(id,supplier_id,status,currency,subtotal,total)
    VALUES ('po','supplier-a','ordered','IQD',300,300);
    INSERT INTO purchase_order_items(id,purchase_order_id,product_id,ordered_quantity,received_quantity,unit_cost,line_total)
    VALUES ('poi','po','product-a',3,0,100,300);
  `);
}

async function addReceipt(db: PGlite, suffix: string): Promise<void> {
  await db.exec(`
    INSERT INTO goods_receipts(id,purchase_order_id,location_id,status,received_at,verified_at,verified_by)
    VALUES ('gr-${suffix}','po','main','verified',now(),now(),'test');
    INSERT INTO goods_receipt_items(id,goods_receipt_id,purchase_order_item_id,product_id,accepted_quantity,unit_cost)
    VALUES ('gri-${suffix}','gr-${suffix}','poi','product-a',1,100);
  `);
}

async function postReceipt(db: PGlite, suffix: string): Promise<void> {
  await db.query(`SELECT post_goods_receipt('gr-${suffix}','test')`);
}

async function currentReceived(db: PGlite): Promise<number> {
  const result = await db.query<{ received: string }>(`SELECT received_quantity::text received FROM purchase_order_items WHERE id='poi'`);
  return Number(result.rows[0]!.received);
}

async function readiness(db: PGlite): Promise<{ mismatch: number; failures: number }> {
  const result = await db.query<Record<string, string>>(`SELECT * FROM v_procurement_accounting_readiness`);
  const row = result.rows[0]!;
  const mismatch = Number(row.purchase_item_received_mismatches);
  const failures = [
    "posted_receipts_missing_fact",
    "facts_missing_journal",
    "paid_supplier_payments_missing_journal",
    "purchase_item_received_mismatches",
  ].some((key) => Number(row[key]) !== 0) || Number(row.ap_difference_iqd) !== 0 ? 1 : 0;
  return { mismatch, failures };
}

describe("0074 purchase received_quantity immutability", () => {
  it("allows pre-receipt edits under the existing rules", async () => {
    const db = await procurementDb(); await seedOrder(db);
    await db.exec(`UPDATE purchase_order_items SET received_quantity=2 WHERE id='poi'`);
    expect(await currentReceived(db)).toBe(2);
    await db.exec(`UPDATE purchase_order_items SET received_quantity=0 WHERE id='poi'`);
    expect(await currentReceived(db)).toBe(0);
  });

  it("lets post_goods_receipt increment received_quantity", async () => {
    const db = await procurementDb(); await seedOrder(db); await addReceipt(db,"1"); await postReceipt(db,"1");
    expect(await currentReceived(db)).toBe(1);
  });

  it("rejects direct received_quantity mutation after a posted/accounted receipt", async () => {
    const db = await procurementDb(); await seedOrder(db); await addReceipt(db,"1"); await postReceipt(db,"1");
    await expect(db.exec(`UPDATE purchase_order_items SET received_quantity=0 WHERE id='poi'`))
      .rejects.toThrow(/ACCOUNTED_PURCHASE_ORDER_ITEM_RECEIVED_QUANTITY_IMMUTABLE/);
    expect(await currentReceived(db)).toBe(1);
  });

  it("does not allow an old movement id plus forged GUC values to reopen the write path", async () => {
    const db = await procurementDb(); await seedOrder(db); await addReceipt(db,"1"); await postReceipt(db,"1");
    const movement = await db.query<{ id: string }>(`SELECT id FROM inventory_movements WHERE source_type='goods_receipt_item' AND source_id='gri-1'`);
    const id = movement.rows[0]!.id.replaceAll("'", "''");
    await db.exec(`SELECT set_config('aquavo.purchase_received_quantity_mode','post_goods_receipt',true)`);
    await db.exec(`SELECT set_config('aquavo.purchase_received_quantity_movement_id','${id}',true)`);
    await expect(db.exec(`UPDATE purchase_order_items SET received_quantity=2 WHERE id='poi'`))
      .rejects.toThrow(/ACCOUNTED_PURCHASE_ORDER_ITEM_RECEIVED_QUANTITY_IMMUTABLE/);
  });

  it("does not let aquavo_runtime forge a reversal-looking inventory movement to arm the context", async () => {
    const db = await procurementDb(); await seedOrder(db); await addReceipt(db,"1"); await postReceipt(db,"1");
    const movement = await db.query<{ id: string }>(`SELECT id FROM inventory_movements WHERE source_type='goods_receipt_item' AND source_id='gri-1'`);
    const id = movement.rows[0]!.id.replaceAll("'", "''");
    await db.exec(`SET ROLE aquavo_runtime`);
    await db.exec(`
      INSERT INTO inventory_movements(id,product_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,unit_cost,currency,happened_at,reversed_movement_id,metadata)
      VALUES ('forged-reversal','product-a','main',-1,'manual_adjustment','goods_receipt_reversal','gr-1','forged-reversal',100,'IQD',now(),'${id}','{}')
    `);
    await expect(db.exec(`UPDATE purchase_order_items SET received_quantity=0 WHERE id='poi'`))
      .rejects.toThrow(/ACCOUNTED_PURCHASE_ORDER_ITEM_RECEIVED_QUANTITY_IMMUTABLE/);
    await db.exec(`RESET ROLE`);
  });

  it("allows a partial receipt followed by a second receipt", async () => {
    const db = await procurementDb(); await seedOrder(db);
    await addReceipt(db,"1"); await postReceipt(db,"1");
    await addReceipt(db,"2"); await postReceipt(db,"2");
    expect(await currentReceived(db)).toBe(2);
  });

  it("lets reverse_posted_goods_receipt decrement received_quantity", async () => {
    const db = await procurementDb(); await seedOrder(db);
    await addReceipt(db,"1"); await postReceipt(db,"1");
    await addReceipt(db,"2"); await postReceipt(db,"2");
    await db.query(`SELECT reverse_posted_goods_receipt('gr-2','test','regression reversal')`);
    expect(await currentReceived(db)).toBe(1);
    const state = await db.query<{ status: string }>(`SELECT status FROM goods_receipts WHERE id='gr-2'`);
    expect(state.rows[0]!.status).toBe("cancelled");
  });

  it("rejects direct received_quantity changes under aquavo_runtime", async () => {
    const db = await procurementDb(); await seedOrder(db); await addReceipt(db,"1"); await postReceipt(db,"1");
    await db.exec(`SET ROLE aquavo_runtime`);
    await expect(db.exec(`UPDATE purchase_order_items SET received_quantity=0 WHERE id='poi'`))
      .rejects.toThrow(/ACCOUNTED_PURCHASE_ORDER_ITEM_RECEIVED_QUANTITY_IMMUTABLE/);
    await db.exec(`RESET ROLE`);
  });

  it("keeps the existing economic-field immutability guard", async () => {
    const db = await procurementDb(); await seedOrder(db); await addReceipt(db,"1"); await postReceipt(db,"1");
    await expect(db.exec(`UPDATE purchase_order_items SET unit_cost=101 WHERE id='poi'`))
      .rejects.toThrow(/ACCOUNTED_PURCHASE_ORDER_ITEM_IMMUTABLE/);
  });

  it("keeps procurement integrity and received-quantity reconciliation clean after valid post/reverse flows", async () => {
    const db = await procurementDb(); await seedOrder(db);
    await addReceipt(db,"1"); await postReceipt(db,"1");
    await addReceipt(db,"2"); await postReceipt(db,"2");
    await db.query(`SELECT reverse_posted_goods_receipt('gr-2','test','regression reversal')`);
    const state = await readiness(db);
    expect(state.mismatch).toBe(0);
    expect(state.failures).toBe(0);
  });
});
