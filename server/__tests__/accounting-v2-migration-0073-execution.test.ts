import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "migrations/0073_accounting_final_hardening.sql"),
  "utf8",
);

function functionSql(name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}`;
  const start = migration.indexOf(marker);
  if (start < 0) throw new Error(`Missing function ${name} in 0073`);
  const terminator = "$function$;";
  const end = migration.indexOf(terminator, start);
  if (end < 0) throw new Error(`Unterminated function ${name} in 0073`);
  return migration.slice(start, end + terminator.length);
}

function viewSql(name: string): string {
  const marker = `CREATE OR REPLACE VIEW public.${name}`;
  const start = migration.indexOf(marker);
  if (start < 0) throw new Error(`Missing view ${name} in 0073`);
  const end = migration.indexOf(";\n", start);
  if (end < 0) throw new Error(`Unterminated view ${name} in 0073`);
  return migration.slice(start, end + 1);
}

function statementSql(marker: string): string {
  const start = migration.indexOf(marker);
  if (start < 0) throw new Error(`Missing statement ${marker} in 0073`);
  const end = migration.indexOf(";", start);
  if (end < 0) throw new Error(`Unterminated statement ${marker} in 0073`);
  return migration.slice(start, end + 1);
}

async function settlementDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(String.raw`
    CREATE TABLE orders(id text PRIMARY KEY, carrier text);
    CREATE TABLE payment_events(id text PRIMARY KEY, order_id text NOT NULL, status text NOT NULL, amount numeric NOT NULL);
    CREATE TABLE order_accounting_facts(
      id text PRIMARY KEY, order_id text NOT NULL UNIQUE, payment_event_id text NOT NULL,
      gross_collected numeric NOT NULL, carrier_fee numeric NOT NULL, merchant_net numeric NOT NULL,
      carrier_snapshot text, cash_custody text NOT NULL DEFAULT 'carrier'
    );
    CREATE TABLE order_accounting_carrier_snapshots(
      order_fact_id text PRIMARY KEY, order_id text NOT NULL UNIQUE, carrier text NOT NULL,
      evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), created_by text
    );
    CREATE TABLE cash_settlements(
      id text PRIMARY KEY, settlement_number text NOT NULL UNIQUE, carrier text NOT NULL,
      status text NOT NULL DEFAULT 'draft', gross_amount numeric NOT NULL DEFAULT 0,
      fees_amount numeric NOT NULL DEFAULT 0, net_amount numeric NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'IQD', received_at timestamptz, bank_reference text,
      evidence jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE cash_settlement_items(
      id text PRIMARY KEY, settlement_id text NOT NULL, order_id text NOT NULL, payment_event_id text,
      gross_amount numeric NOT NULL, fee_amount numeric NOT NULL DEFAULT 0, net_amount numeric NOT NULL,
      reconciliation_status text NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE order_accounting_settlements(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, order_fact_id text NOT NULL UNIQUE,
      settlement_id text NOT NULL, settlement_item_id text NOT NULL, gross_amount numeric NOT NULL,
      carrier_fee numeric NOT NULL, merchant_net numeric NOT NULL, status text NOT NULL,
      matched_at timestamptz NOT NULL, evidence jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE journal_entries(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, entry_date timestamptz NOT NULL,
      period_key text NOT NULL, source_type text NOT NULL, source_id text NOT NULL, event_kind text NOT NULL,
      description text, total_debit numeric NOT NULL, total_credit numeric NOT NULL,
      evidence jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE journal_lines(
      entry_id text NOT NULL, line_number integer NOT NULL, account_code text NOT NULL,
      debit numeric NOT NULL DEFAULT 0, credit numeric NOT NULL DEFAULT 0, memo text, dimensions jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE OR REPLACE FUNCTION validate_journal_entry(p_id text) RETURNS void LANGUAGE plpgsql AS $$
    DECLARE d numeric; c numeric; BEGIN
      SELECT COALESCE(SUM(debit),0),COALESCE(SUM(credit),0) INTO d,c FROM journal_lines WHERE entry_id=p_id;
      IF d<>c THEN RAISE EXCEPTION 'UNBALANCED'; END IF;
    END $$;

    INSERT INTO orders VALUES ('order-a','Carrier A'),('order-b','Carrier B');
    INSERT INTO payment_events VALUES ('pay-a','order-a','completed',1000),('pay-b','order-b','completed',1000);
    INSERT INTO order_accounting_facts(id,order_id,payment_event_id,gross_collected,carrier_fee,merchant_net,carrier_snapshot)
    VALUES ('fact-a','order-a','pay-a',1000,100,900,'Carrier A'),('fact-b','order-b','pay-b',1000,100,900,'Carrier B');
  `);

  await db.exec(statementSql("CREATE UNIQUE INDEX IF NOT EXISTS cash_settlement_items_one_matched_order_idx"));
  await db.exec(statementSql("CREATE UNIQUE INDEX IF NOT EXISTS cash_settlement_items_one_matched_payment_idx"));
  await db.exec(functionSql("validate_cash_settlement_reconciliation"));
  await db.exec(functionSql("post_settlement_journal_and_match_facts"));
  await db.exec(functionSql("guard_posted_cash_settlement_mutation"));
  await db.exec(functionSql("guard_posted_cash_settlement_item_mutation"));
  await db.exec(`CREATE TRIGGER cash_settlements_validate_reconciliation BEFORE UPDATE OF status ON cash_settlements FOR EACH ROW EXECUTE FUNCTION validate_cash_settlement_reconciliation()`);
  await db.exec(`CREATE TRIGGER cash_settlements_post_journal AFTER UPDATE OF status ON cash_settlements FOR EACH ROW EXECUTE FUNCTION post_settlement_journal_and_match_facts()`);
  await db.exec(`CREATE TRIGGER cash_settlements_posted_immutable BEFORE DELETE OR UPDATE ON cash_settlements FOR EACH ROW EXECUTE FUNCTION guard_posted_cash_settlement_mutation()`);
  await db.exec(`CREATE TRIGGER cash_settlement_items_posted_immutable BEFORE INSERT OR DELETE OR UPDATE ON cash_settlement_items FOR EACH ROW EXECUTE FUNCTION guard_posted_cash_settlement_item_mutation()`);
  return db;
}

async function procurementDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(String.raw`
    CREATE TABLE suppliers(id text PRIMARY KEY, code text NOT NULL, legal_name text NOT NULL, display_name text NOT NULL, is_active boolean NOT NULL DEFAULT true);
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
      debit numeric NOT NULL DEFAULT 0, credit numeric NOT NULL DEFAULT 0, memo text, dimensions jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE purchase_accounting_facts(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, goods_receipt_id text NOT NULL UNIQUE,
      purchase_order_id text NOT NULL, supplier_id text NOT NULL, recognized_at timestamptz NOT NULL,
      period_key text NOT NULL, currency text NOT NULL, exchange_rate_to_iqd numeric NOT NULL,
      base_inventory_iqd numeric NOT NULL, landed_cost_iqd numeric NOT NULL DEFAULT 0,
      inventory_value_iqd numeric NOT NULL, payable_iqd numeric NOT NULL, policy_version text NOT NULL DEFAULT 'p2p_v1_receipt_accrual',
      evidence jsonb NOT NULL DEFAULT '{}'::jsonb, created_by text, created_at timestamptz NOT NULL DEFAULT now(), payable_original numeric NOT NULL
    );
    CREATE TABLE purchase_accounting_reversals(id text PRIMARY KEY DEFAULT gen_random_uuid()::text, purchase_accounting_fact_id text NOT NULL UNIQUE);
    CREATE TABLE supplier_payments(
      id serial PRIMARY KEY, supplier_name text NOT NULL, amount_usd integer NOT NULL, amount_iqd integer,
      reason text NOT NULL, status text NOT NULL, paid_at timestamp, approved_by_founder boolean,
      notes text, supplier_id text, currency text, amount_original numeric, exchange_rate_to_iqd numeric,
      paid_from_account_code text, payment_reference text, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
      accounting_posted_at timestamptz, accounting_reversed_at timestamptz,
      exchange_rate_source text, exchange_rate_effective_at timestamptz
    );
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

    INSERT INTO suppliers VALUES ('supplier-a','SUP-A','Supplier A','Supplier A',true);
    INSERT INTO products(id,stock,cost_price,variants,has_variants,cost_price_resolution)
    VALUES ('p-variant',10,50,'[{"id":"v1","stock":10,"costPrice":50},{"id":"v2","stock":10,"costPrice":70}]',true,'known');
    INSERT INTO inventory_movements(id,product_id,variant_id,location_id,quantity_delta,movement_type,metadata)
    VALUES ('opening-v1','p-variant','v1','main',10,'opening','{}'),('opening-v2','p-variant','v2','main',10,'opening','{}');
  `);

  for (const name of [
    "set_current_inventory_unit_cost",
    "prepare_purchase_receipt_weighted_cost",
    "apply_purchase_receipt_weighted_cost",
    "prepare_purchase_accounting_fact_currency",
    "post_goods_receipt",
    "post_supplier_payment",
    "guard_supplier_payment_application_mutation",
  ]) await db.exec(functionSql(name));

  await db.exec(`CREATE TRIGGER purchase_accounting_fact_currency_prepare BEFORE INSERT ON purchase_accounting_facts FOR EACH ROW EXECUTE FUNCTION prepare_purchase_accounting_fact_currency()`);
  await db.exec(`CREATE TRIGGER inventory_movements_purchase_wac_prepare BEFORE INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION prepare_purchase_receipt_weighted_cost()`);
  await db.exec(`CREATE TRIGGER inventory_movements_purchase_wac_apply AFTER INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION apply_purchase_receipt_weighted_cost()`);
  await db.exec(`CREATE TRIGGER supplier_payment_applications_immutable BEFORE DELETE OR UPDATE ON supplier_payment_applications FOR EACH ROW EXECUTE FUNCTION guard_supplier_payment_application_mutation()`);
  return db;
}

async function readinessDb(variantStock = 1): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(String.raw`
    CREATE TABLE accounting_cutovers(cutover_at timestamptz NOT NULL, status text NOT NULL);
    INSERT INTO accounting_cutovers VALUES ('2000-01-01T00:00:00Z','active');
    CREATE TABLE inventory_locations(id text PRIMARY KEY, code text NOT NULL, is_active boolean NOT NULL);
    INSERT INTO inventory_locations VALUES ('main','MAIN',true);
    CREATE TABLE products(id text PRIMARY KEY, deleted_at timestamp, has_variants boolean NOT NULL, stock integer NOT NULL DEFAULT 0, variants jsonb, cost_price numeric);
    INSERT INTO products VALUES ('variant-product',NULL,true,${variantStock},'[{"id":"v1","stock":${variantStock},"costPrice":100}]',100);
    CREATE TABLE inventory_movements(location_id text, product_id text, variant_id text, quantity_delta integer);
    INSERT INTO inventory_movements VALUES ('main','variant-product','v1',1);
    CREATE TABLE accounting_review_flags(status text, category text);
    CREATE TABLE suppliers(id text PRIMARY KEY, display_name text NOT NULL);
    CREATE TABLE purchase_accounting_facts(id text PRIMARY KEY, goods_receipt_id text, purchase_order_id text, supplier_id text, recognized_at timestamptz, payable_iqd numeric, currency text, payable_original numeric);
    CREATE TABLE purchase_accounting_reversals(id text PRIMARY KEY, purchase_accounting_fact_id text);
    CREATE TABLE supplier_payment_applications(purchase_accounting_fact_id text, status text, carrying_amount_iqd numeric, applied_amount_original numeric, cash_amount_iqd numeric, fx_difference_iqd numeric);
    CREATE TABLE purchase_order_items(id text PRIMARY KEY, received_quantity numeric);
    CREATE TABLE goods_receipts(id text PRIMARY KEY, status text);
    CREATE TABLE goods_receipt_items(purchase_order_item_id text, accepted_quantity numeric, goods_receipt_id text);
    CREATE TABLE supplier_payments(status text, accounting_posted_at timestamptz);
    CREATE TABLE journal_entries(id text PRIMARY KEY DEFAULT gen_random_uuid()::text, period_key text, source_type text, source_id text, event_kind text, total_debit numeric, total_credit numeric);
    CREATE TABLE journal_lines(entry_id text, account_code text, debit numeric NOT NULL DEFAULT 0, credit numeric NOT NULL DEFAULT 0);
    CREATE TABLE order_accounting_facts(order_id text, period_key text, cost_status text, cogs_amount numeric, payment_event_id text, gross_collected numeric, cash_custody text, delivery_surplus numeric, merchant_net numeric, delivery_subsidy numeric);
    CREATE TABLE orders(id text PRIMARY KEY, box_cost numeric);
    CREATE TABLE order_fulfillment_events(order_id text, event_type text, workflow_state text, cost_status text, actual_cost numeric);
    CREATE TABLE payment_events(id text PRIMARY KEY, status text, amount numeric);
    CREATE TABLE order_accounting_settlements(order_fact_id text, status text);
    CREATE TABLE order_return_events(updated_at timestamp, status text);
    CREATE TABLE expenses(expense_occurred_at timestamptz, expense_date timestamp, deleted_at timestamp, accounting_status text, amount numeric);
    CREATE TABLE cash_settlements(id text PRIMARY KEY, status text, received_at timestamptz, created_at timestamptz, net_amount numeric);
    CREATE TABLE cash_settlement_items(settlement_id text, order_id text, reconciliation_status text);
    CREATE TABLE tax_profiles(id text PRIMARY KEY, status text, taxpayer_number text, tax_branch text, registered_address text, accountant_license_number text, accountant_approved_at timestamptz, approval_evidence_id text);
    CREATE TABLE accounting_period_closes(
      id text PRIMARY KEY, period_key text, status text, close_type text, revenue numeric DEFAULT 0, cogs numeric DEFAULT 0,
      gross_profit numeric DEFAULT 0, expenses_total numeric DEFAULT 0, sales_return_deduction numeric DEFAULT 0,
      actual_return_loss numeric DEFAULT 0, delivery_subsidy_total numeric DEFAULT 0, delivery_surplus_total numeric DEFAULT 0,
      fulfillment_cost_total numeric DEFAULT 0, final_net_profit numeric DEFAULT 0, delivered_orders integer DEFAULT 0,
      readiness_json jsonb DEFAULT '{}'::jsonb, snapshot_json jsonb DEFAULT '{}'::jsonb
    );
    INSERT INTO accounting_period_closes(id,period_key,status,close_type) VALUES ('period-test','2000-01','reopened','administrative');

    CREATE OR REPLACE FUNCTION aquavo_active_cutover() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '2000-01-01T00:00:00Z'::timestamptz $$;
    CREATE OR REPLACE FUNCTION accounting_period_account_balance(p_period text,p_account text) RETURNS numeric LANGUAGE sql AS $$
      SELECT COALESCE(SUM(l.debit-l.credit),0) FROM journal_entries j JOIN journal_lines l ON l.entry_id=j.id WHERE j.period_key=p_period AND l.account_code=p_account
    $$;
  `);
  await db.exec(viewSql("v_supplier_payables"));
  await db.exec(viewSql("v_procurement_accounting_readiness"));
  await db.exec(viewSql("v_accounting_period_readiness"));
  await db.exec(functionSql("guard_accounting_period_tax_finalization"));
  await db.exec(`CREATE TRIGGER period_guard BEFORE INSERT OR UPDATE ON accounting_period_closes FOR EACH ROW EXECUTE FUNCTION guard_accounting_period_tax_finalization()`);
  return db;
}

describe("0073 cash settlement hardening (actual migration functions)", () => {
  it("rejects a duplicate carrier settlement for an already matched order/payment event", async () => {
    const db = await settlementDb();
    await db.exec(`INSERT INTO cash_settlements VALUES ('s1','S1','Carrier A','draft',1000,100,900,'IQD',NULL,NULL,'{}',now())`);
    await db.exec(`INSERT INTO cash_settlement_items VALUES ('i1','s1','order-a','pay-a',1000,100,900,'matched')`);
    await expect(db.exec(`INSERT INTO cash_settlement_items VALUES ('i2','s1','order-a','pay-a',1000,100,900,'matched')`)).rejects.toThrow(/unique|duplicate/i);
  });

  it("rejects the wrong carrier", async () => {
    const db = await settlementDb();
    await db.exec(`INSERT INTO cash_settlements VALUES ('s1','S1','Carrier B','draft',1000,100,900,'IQD',NULL,NULL,'{}',now())`);
    await db.exec(`INSERT INTO cash_settlement_items VALUES ('i1','s1','order-a','pay-a',1000,100,900,'matched')`);
    await expect(db.exec(`UPDATE cash_settlements SET status='reconciled' WHERE id='s1'`)).rejects.toThrow(/SETTLEMENT_CARRIER_MISMATCH/);
  });

  it("rejects a payment event from another order", async () => {
    const db = await settlementDb();
    await db.exec(`INSERT INTO cash_settlements VALUES ('s1','S1','Carrier A','draft',1000,100,900,'IQD',NULL,NULL,'{}',now())`);
    await db.exec(`INSERT INTO cash_settlement_items VALUES ('i1','s1','order-a','pay-b',1000,100,900,'matched')`);
    await expect(db.exec(`UPDATE cash_settlements SET status='reconciled' WHERE id='s1'`)).rejects.toThrow(/SETTLEMENT_PAYMENT_EVENT_MISMATCH/);
  });

  it("keeps a reconciled settlement immutable", async () => {
    const db = await settlementDb();
    await db.exec(`INSERT INTO cash_settlements VALUES ('s1','S1','Carrier A','draft',1000,100,900,'IQD',now(),NULL,'{}',now())`);
    await db.exec(`INSERT INTO cash_settlement_items VALUES ('i1','s1','order-a','pay-a',1000,100,900,'matched')`);
    await db.exec(`UPDATE cash_settlements SET status='reconciled' WHERE id='s1'`);
    await expect(db.exec(`UPDATE cash_settlements SET gross_amount=1001 WHERE id='s1'`)).rejects.toThrow(/POSTED_CASH_SETTLEMENT_IMMUTABLE/);
  });
});

describe("0073 procurement, FX and moving weighted average", () => {
  async function seedTwoPurchaseOrders(db: PGlite): Promise<void> {
    await db.exec(`
      INSERT INTO purchase_orders(id,supplier_id,status,currency,subtotal,total) VALUES ('po-a','supplier-a','ordered','IQD',500,500),('po-b','supplier-a','ordered','IQD',500,500);
      INSERT INTO purchase_order_items(id,purchase_order_id,product_id,variant_id,ordered_quantity,unit_cost,line_total)
      VALUES ('poi-a','po-a','p-variant','v1',5,100,500),('poi-b','po-b','p-variant','v2',5,100,500);
    `);
  }

  it("rejects cross-PO goods receipt items", async () => {
    const db = await procurementDb(); await seedTwoPurchaseOrders(db);
    await db.exec(`INSERT INTO goods_receipts VALUES ('gr','po-a','main','verified',now(),NULL,NULL,NULL,now()); INSERT INTO goods_receipt_items VALUES ('gri','gr','poi-b','p-variant','v2',1,100,NULL)`);
    await expect(db.query(`SELECT post_goods_receipt('gr','test')`)).rejects.toThrow(/GOODS_RECEIPT_IDENTITY_MISMATCH/);
  });

  it("rejects a wrong product/variant receipt", async () => {
    const db = await procurementDb(); await seedTwoPurchaseOrders(db);
    await db.exec(`INSERT INTO goods_receipts VALUES ('gr','po-a','main','verified',now(),NULL,NULL,NULL,now()); INSERT INTO goods_receipt_items VALUES ('gri','gr','poi-a','p-variant','v2',1,100,NULL)`);
    await expect(db.query(`SELECT post_goods_receipt('gr','test')`)).rejects.toThrow(/GOODS_RECEIPT_IDENTITY_MISMATCH/);
  });

  it("rejects receipt price variance without a PO amendment", async () => {
    const db = await procurementDb(); await seedTwoPurchaseOrders(db);
    await db.exec(`INSERT INTO goods_receipts VALUES ('gr','po-a','main','verified',now(),NULL,NULL,NULL,now()); INSERT INTO goods_receipt_items VALUES ('gri','gr','poi-a','p-variant','v1',1,101,NULL)`);
    await expect(db.query(`SELECT post_goods_receipt('gr','test')`)).rejects.toThrow(/GOODS_RECEIPT_PRICE_VARIANCE_REQUIRES_PO_AMENDMENT/);
  });

  it("updates moving weighted average cost from the posted receipt", async () => {
    const db = await procurementDb(); await seedTwoPurchaseOrders(db);
    await db.exec(`INSERT INTO goods_receipts VALUES ('gr','po-a','main','verified',now(),NULL,NULL,NULL,now()); INSERT INTO goods_receipt_items VALUES ('gri','gr','poi-a','p-variant','v1',2,100,NULL)`);
    await db.query(`SELECT post_goods_receipt('gr','test')`);
    const result = await db.query<{ cost: string; event_cost: string }>(`
      SELECT (SELECT e->>'costPrice' FROM products p CROSS JOIN LATERAL jsonb_array_elements(p.variants) e WHERE p.id='p-variant' AND e->>'id'='v1') cost,
             (SELECT unit_cost_after::text FROM inventory_cost_events WHERE product_id='p-variant' AND variant_id='v1' ORDER BY created_at DESC LIMIT 1) event_cost
    `);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0]!;
    expect(Number(row.cost)).toBeCloseTo(58.333333, 5);
    expect(Number(row.event_cost)).toBeCloseTo(58.333333, 5);
  });

  it("closes original-currency AP and records FX loss when payment FX changes", async () => {
    const db = await procurementDb();
    await db.exec(`
      INSERT INTO purchase_orders(id,supplier_id,status,currency,subtotal,total,exchange_rate_to_iqd,exchange_rate_source,exchange_rate_effective_at)
      VALUES ('po-fx','supplier-a','ordered','USD',2,2,1300,'bank',now());
      INSERT INTO purchase_order_items VALUES ('poi-fx','po-fx',NULL,'p-variant','v2',2,1,2);
      INSERT INTO goods_receipts VALUES ('gr-fx','po-fx','main','verified',now(),NULL,NULL,NULL,now());
      INSERT INTO goods_receipt_items VALUES ('gri-fx','gr-fx','poi-fx','p-variant','v2',2,1,NULL);
    `);
    await db.query(`SELECT post_goods_receipt('gr-fx','test')`);
    await db.exec(`
      INSERT INTO supplier_payments(supplier_name,amount_usd,amount_iqd,reason,status,paid_at,approved_by_founder,supplier_id,currency,amount_original,exchange_rate_to_iqd,paid_from_account_code,payment_reference,evidence,exchange_rate_source,exchange_rate_effective_at)
      VALUES ('Supplier A',2,2800,'fx test','paid',now(),true,'supplier-a','USD',2,1400,'1000','FX-1','{}','bank',now());
    `);
    await db.query(`SELECT post_supplier_payment(1,'test')`);
    const result = await db.query<{ applied: string; carrying: string; cash: string; fx: string; fx_gl: string }>(`
      SELECT a.applied_amount_original::text applied,a.carrying_amount_iqd::text carrying,a.cash_amount_iqd::text cash,a.fx_difference_iqd::text fx,
        (SELECT COALESCE(SUM(l.debit-l.credit),0)::text FROM journal_entries j JOIN journal_lines l ON l.entry_id=j.id WHERE j.source_type='supplier_payment' AND j.source_id='1' AND l.account_code='5400') fx_gl
      FROM supplier_payment_applications a WHERE payment_id=1
    `);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0]!;
    expect(Number(row.applied)).toBe(2);
    expect(Number(row.carrying)).toBe(2600);
    expect(Number(row.cash)).toBe(2800);
    expect(Number(row.fx)).toBe(200);
    expect(Number(row.fx_gl)).toBe(200);
    const outstanding = await db.query<{ amount: string }>(`SELECT (f.payable_original-a.applied_amount_original)::text amount FROM purchase_accounting_facts f JOIN supplier_payment_applications a ON a.purchase_accounting_fact_id=f.id WHERE f.purchase_order_id='po-fx'`);
    expect(outstanding.rows).toHaveLength(1);
    expect(Number(outstanding.rows[0]!.amount)).toBe(0);
  });

  it("keeps a matched supplier payment application immutable", async () => {
    const db = await procurementDb();
    await db.exec(`INSERT INTO purchase_accounting_facts(id,goods_receipt_id,purchase_order_id,supplier_id,recognized_at,period_key,currency,exchange_rate_to_iqd,base_inventory_iqd,landed_cost_iqd,inventory_value_iqd,payable_iqd,payable_original) VALUES ('f','gr','po','supplier-a',now(),'2026-08','IQD',1,100,0,100,100,100)`);
    await db.exec(`INSERT INTO supplier_payments(id,supplier_name,amount_usd,reason,status) VALUES (1,'Supplier A',1,'x','scheduled')`);
    await db.exec(`INSERT INTO supplier_payment_applications(payment_id,purchase_accounting_fact_id,applied_amount_iqd,status,applied_amount_original,carrying_amount_iqd,cash_amount_iqd,fx_difference_iqd) VALUES (1,'f',100,'matched',100,100,100,0)`);
    await expect(db.exec(`UPDATE supplier_payment_applications SET applied_amount_original=99 WHERE payment_id=1`)).rejects.toThrow(/MATCHED_SUPPLIER_PAYMENT_APPLICATION_IMMUTABLE/);
  });
});

describe("0073 period readiness", () => {
  it("detects a variant inventory mismatch", async () => {
    const db = await readinessDb(2);
    const result = await db.query<{ inventory_mismatches: string }>(`SELECT inventory_mismatches::text FROM v_accounting_period_readiness WHERE period_key='2000-01'`);
    expect(result.rows).toHaveLength(1);
    expect(Number(result.rows[0]!.inventory_mismatches)).toBe(1);
  });

  it("turns AP/GL mismatch into a procurement failure and blocks period close", async () => {
    const db = await readinessDb(1);
    await db.exec(`
      INSERT INTO journal_entries(id,period_key,source_type,source_id,event_kind,total_debit,total_credit) VALUES ('j','2000-01','test','ap','mismatch',100,100);
      INSERT INTO journal_lines VALUES ('j','1000',100,0),('j','2000',0,100);
    `);
    const readiness = await db.query<{ ap_difference_iqd: string; failures: string }>(`
      SELECT p.ap_difference_iqd::text, r.procurement_integrity_failures::text failures
      FROM v_procurement_accounting_readiness p CROSS JOIN v_accounting_period_readiness r WHERE r.period_key='2000-01'
    `);
    expect(readiness.rows).toHaveLength(1);
    const row = readiness.rows[0]!;
    expect(Number(row.ap_difference_iqd)).not.toBe(0);
    expect(Number(row.failures)).toBe(1);
    await expect(db.exec(`UPDATE accounting_period_closes SET status='closed' WHERE id='period-test'`)).rejects.toThrow(/ADMIN_CLOSE_BLOCKED: readiness failed/);
  });
});
