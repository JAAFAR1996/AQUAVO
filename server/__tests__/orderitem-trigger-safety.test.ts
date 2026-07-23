import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

/**
 * Production-shaped proof that add_orderitem_backfill_trigger_safety.sql:
 *   1. leaves NORMAL application behaviour of the two live-production-only
 *      triggers (record_order_item_inventory_sale, prevent_unsafe_order_
 *      dependency_mutation — see docs/audit/orderitem-trigger-forensics.md)
 *      completely unchanged;
 *   2. opens EXACTLY the two narrow, evidence-producing exceptions the
 *      backfill needs, and nothing more (no batch, no matching GUC, wrong
 *      batch, forged metadata, or an application-created row can ever use
 *      either exception);
 *   3. its rollback restores both functions to their captured-live originals
 *      BYTE-FOR-BYTE (verified by SHA-256 of pg_get_functiondef()).
 *
 * SIMPLIFICATIONS FROM THE LIVE FIXTURE (see docs/audit/orderitem-trigger-
 * safety-design.md for the full list + justification):
 *   - project_inventory_movement_to_product_stock() (AFTER INSERT ON
 *     inventory_movements → writes products.stock/variants) is NOT modeled.
 *     It is irrelevant to the guard logic under test: whether or not a
 *     movement row is projected onto products.stock has no bearing on
 *     whether the movement row itself was created or suppressed, which is
 *     exactly what every assertion below checks.
 *   - refresh_order_financial_snapshot_trigger() (the third trigger on
 *     order_items_relational) is NOT modeled: its called procedure
 *     (refresh_order_financial_snapshot) was not captured verbatim in the
 *     forensics pass and is untouched by this migration; including it would
 *     add fixture surface without proving anything about the two functions
 *     this migration edits.
 *   - reject_inventory_movement_mutation() (immutability guard on
 *     inventory_movements UPDATE/DELETE) is NOT modeled: no test here
 *     updates or deletes an inventory_movements row.
 *   - prevent_negative_inventory_balance() (BEFORE INSERT ON
 *     inventory_movements) IS modeled, because record_order_item_inventory_
 *     sale's INSERT would otherwise fail unrealistically (every product
 *     starts at zero ledger balance). Each test product is seeded with an
 *     opening positive movement first, mirroring the real one-time
 *     "owner_approved_storefront_opening" reconciliation batch described in
 *     the forensics doc (§9).
 */

const ROOT = process.cwd();
const forwardSql = readFileSync(
  join(ROOT, "migrations/add_orderitem_backfill_trigger_safety.sql"), "utf8");
const rollbackSql = readFileSync(
  join(ROOT, "migrations/add_orderitem_backfill_trigger_safety_rollback.sql"), "utf8");

// Captured-live fingerprints from docs/audit/orderitem-trigger-forensics.md §2.
const ORIGINAL_FINGERPRINTS: Record<string, string> = {
  record_order_item_inventory_sale:
    "c14f31465132476698f4f587cc15849bf3a535f919eab51dd0c0ab35f45dee3c",
  prevent_unsafe_order_dependency_mutation:
    "98c626552eb4fe75728dc7c64648e2a50b952f9503dd4b7060550d8e5219f631",
};

async function applyInTx(db: PGlite, sqlText: string, pre = ""): Promise<void> {
  try {
    await db.exec(`BEGIN;
${pre}
${sqlText}
COMMIT;`);
  } catch (err) {
    await db.exec("ROLLBACK").catch(() => undefined);
    throw err;
  }
}

async function scalar(db: PGlite, sql: string, params: unknown[] = []): Promise<number> {
  const r = await db.query<Record<string, unknown>>(sql, params);
  return Number(Object.values(r.rows[0])[0]);
}

async function funcSourceSha256(db: PGlite, fn: string): Promise<string> {
  const r = await db.query<{ src: string }>(
    `SELECT pg_get_functiondef(p.oid) AS src
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname=$1`, [fn]);
  return createHash("sha256").update(r.rows[0].src, "utf8").digest("hex");
}

describe("orderitem backfill trigger safety (production-shaped, PGlite)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();

    // ── Minimal production-shaped fixture (see file header for what's cut) ──
    await db.exec(`
      CREATE TABLE settings (
        key text PRIMARY KEY,
        value text
      );
      INSERT INTO settings (key, value) VALUES ('inventory_ledger_mode', 'enforce');

      CREATE TABLE inventory_locations (
        id text PRIMARY KEY,
        code text NOT NULL,
        is_active boolean NOT NULL DEFAULT true
      );
      INSERT INTO inventory_locations (id, code, is_active) VALUES ('loc-main', 'MAIN', true);

      CREATE TABLE products (
        id text PRIMARY KEY,
        stock integer NOT NULL DEFAULT 0
      );

      CREATE TABLE orders (
        id text PRIMARY KEY,
        status text NOT NULL,
        payment_status text NOT NULL,
        cod_received boolean NOT NULL DEFAULT false
      );

      CREATE TABLE payment_events (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        order_id text NOT NULL
      );

      CREATE TABLE cash_settlement_items (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        order_id text NOT NULL
      );

      CREATE TABLE inventory_movements (
        id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        product_id      text NOT NULL,
        variant_id      text,
        location_id     text NOT NULL,
        quantity_delta  integer NOT NULL,
        movement_type   text NOT NULL,
        source_type     text NOT NULL,
        source_id       text,
        idempotency_key text NOT NULL,
        currency        text NOT NULL,
        happened_at     timestamptz NOT NULL DEFAULT now(),
        created_by      text,
        metadata        jsonb
      );
      CREATE UNIQUE INDEX inventory_movements_idem_uidx ON inventory_movements(idempotency_key);

      CREATE TABLE order_items_relational (
        id                text PRIMARY KEY,
        order_id          text NOT NULL REFERENCES orders(id),
        product_id        text NOT NULL REFERENCES products(id),
        quantity          integer NOT NULL,
        price_at_purchase numeric NOT NULL,
        total_price       numeric NOT NULL,
        metadata          jsonb
      );

      -- Owned by migrations/backfill_orderitems_from_jsonb.sql (not this
      -- workstream); reproduced here only so the fixture can populate rows
      -- for the batch-eligibility checks this migration's functions read.
      CREATE TABLE orderitem_backfill_batches (
        batch_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        started_at     timestamptz NOT NULL DEFAULT now(),
        finished_at    timestamptz,
        source         text NOT NULL DEFAULT 'orders.items',
        migration      text NOT NULL DEFAULT 'backfill_orderitems_from_jsonb.sql',
        rows_inserted  integer,
        unresolved_lines integer,
        ambiguous_groups integer,
        reconciliation_complete boolean,
        rolled_back_at timestamptz,
        note           text
      );

      -- ── order_is_hard_deletable, verbatim from the forensics capture ──────
      CREATE OR REPLACE FUNCTION public.order_is_hard_deletable(target_order_id text)
       RETURNS boolean
       LANGUAGE sql
       STABLE
      AS $function$ SELECT EXISTS(SELECT 1 FROM orders o WHERE o.id=target_order_id AND o.status='pending' AND o.payment_status='pending' AND COALESCE(o.cod_received,false)=false) AND NOT EXISTS(SELECT 1 FROM payment_events WHERE order_id=target_order_id) AND NOT EXISTS(SELECT 1 FROM cash_settlement_items WHERE order_id=target_order_id) AND NOT EXISTS(SELECT 1 FROM inventory_movements WHERE source_id=target_order_id AND source_type IN ('order_line','order_status_reversal')); $function$;

      -- ── prevent_negative_inventory_balance, verbatim from the forensics capture ──
      CREATE OR REPLACE FUNCTION public.prevent_negative_inventory_balance()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $function$ DECLARE current_balance bigint; lock_key text; BEGIN lock_key:=NEW.product_id||'|'||COALESCE(NEW.variant_id,'')||'|'||NEW.location_id; PERFORM pg_advisory_xact_lock(hashtextextended(lock_key,0)); SELECT COALESCE(SUM(quantity_delta),0) INTO current_balance FROM inventory_movements WHERE product_id=NEW.product_id AND variant_id IS NOT DISTINCT FROM NEW.variant_id AND location_id=NEW.location_id; IF current_balance+NEW.quantity_delta<0 THEN RAISE EXCEPTION 'insufficient canonical inventory balance for product %, variant %, location %',NEW.product_id,NEW.variant_id,NEW.location_id; END IF; RETURN NEW; END; $function$;
      CREATE TRIGGER inventory_movements_prevent_negative BEFORE INSERT ON inventory_movements
        FOR EACH ROW EXECUTE FUNCTION prevent_negative_inventory_balance();

      -- ── the two ORIGINAL (pre-migration) live functions, verbatim ─────────
      CREATE OR REPLACE FUNCTION public.record_order_item_inventory_sale()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $function$ DECLARE mode text; main_location text; line_variant text; BEGIN SELECT value INTO mode FROM settings WHERE key='inventory_ledger_mode'; IF COALESCE(mode,'off')<>'enforce' THEN RETURN NEW; END IF; SELECT id INTO main_location FROM inventory_locations WHERE code='MAIN' AND is_active=true LIMIT 1; IF main_location IS NULL THEN RAISE EXCEPTION 'MAIN inventory location is not configured'; END IF; line_variant:=NULLIF(NEW.metadata->>'variantId',''); INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,source_type,source_id,idempotency_key,currency,happened_at,created_by,metadata) VALUES (NEW.product_id,line_variant,main_location,-NEW.quantity,'sale','order_line',NEW.order_id,'order_item:'||NEW.id,'IQD',now(),'database_trigger',jsonb_build_object('order_id',NEW.order_id,'order_item_id',NEW.id)) ON CONFLICT(idempotency_key) DO NOTHING; RETURN NEW; END; $function$;

      CREATE OR REPLACE FUNCTION public.prevent_unsafe_order_dependency_mutation()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $function$ DECLARE old_order_id text; new_order_id text; BEGIN old_order_id:=to_jsonb(OLD)->>TG_ARGV[0]; IF TG_OP='UPDATE' THEN new_order_id:=to_jsonb(NEW)->>TG_ARGV[0]; IF old_order_id IS NOT DISTINCT FROM new_order_id THEN RETURN NEW; END IF; END IF; IF old_order_id IS NOT NULL AND NOT order_is_hard_deletable(old_order_id) THEN RAISE EXCEPTION 'order % is audited and its dependent records cannot be removed or detached',old_order_id; END IF; IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $function$;

      CREATE TRIGGER order_items_guard_order_detach BEFORE DELETE OR UPDATE OF order_id ON order_items_relational
        FOR EACH ROW EXECUTE FUNCTION prevent_unsafe_order_dependency_mutation('order_id');
      CREATE TRIGGER order_items_record_inventory_sale AFTER INSERT ON order_items_relational
        FOR EACH ROW EXECUTE FUNCTION record_order_item_inventory_sale();
    `);

    // Seed products + orders used across tests, plus opening ledger balances
    // (mirrors the real one-time owner-approved reconciliation batch — see
    // file header simplification note).
    const products = ["prod-A", "prod-B", "prod-C", "prod-D", "prod-E", "prod-F"];
    for (const p of products) {
      await db.query(`INSERT INTO products (id, stock) VALUES ($1, 100)`, [p]);
      await db.query(
        `INSERT INTO inventory_movements
           (product_id, location_id, quantity_delta, movement_type, source_type, idempotency_key, currency, created_by)
         VALUES ($1, 'loc-main', 100, 'reconciliation', 'inventory_reconciliation', 'opening:'||$1, 'IQD', 'owner:test')`,
        [p]);
    }

    // A "gap" order: delivered/paid/cod_received=true → order_is_hard_deletable=false,
    // exactly the 12-gap-order shape from the forensics capture.
    await db.query(
      `INSERT INTO orders (id, status, payment_status, cod_received) VALUES ('ord-gap', 'delivered', 'paid', true)`);
    // A "pending" order: order_is_hard_deletable=true (no payment_events/cash_settlement_items/movements yet).
    await db.query(
      `INSERT INTO orders (id, status, payment_status, cod_received) VALUES ('ord-pending', 'pending', 'pending', false)`);
  });

  // ── §1: normal application behaviour is unaffected ──────────────────────
  describe("before the migration is applied (baseline = ORIGINAL live behaviour)", () => {
    it("1. a normal application insert records an inventory movement", async () => {
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-app-1', 'ord-pending', 'prod-A', 2, 1000, 2000, '{}'::jsonb)`);
      expect(await scalar(db,
        `SELECT count(*) FROM inventory_movements WHERE idempotency_key='order_item:rel-app-1'`)).toBe(1);
      expect(await scalar(db,
        `SELECT count(*) FROM inventory_movements WHERE idempotency_key='order_item:rel-app-1' AND quantity_delta=-2 AND source_type='order_line'`)).toBe(1);
    });

    it("6. normal audited-row deletion remains BLOCKED (gap order, no GUCs set)", async () => {
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-gap-baseline', 'ord-gap', 'prod-B', 1, 500, 500, '{}'::jsonb)`);
      await expect(db.query(`DELETE FROM order_items_relational WHERE id='rel-gap-baseline'`))
        .rejects.toThrow(/audited and its dependent records cannot be removed/);
      expect(await scalar(db,
        `SELECT count(*) FROM order_items_relational WHERE id='rel-gap-baseline'`)).toBe(1);
    });
  });

  // ── Apply the migration ──────────────────────────────────────────────────
  it("migration applies cleanly (CREATE OR REPLACE both functions, adds the audit table)", async () => {
    await applyInTx(db, forwardSql);
    expect(await scalar(db,
      `SELECT count(*) FROM information_schema.tables WHERE table_name='orderitem_trigger_safety_audit'`)).toBe(1);
  });

  describe("after the migration — normal behaviour must be BYTE-IDENTICAL", () => {
    it("1. (repeat, post-migration) a normal application insert STILL records an inventory movement", async () => {
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-app-2', 'ord-pending', 'prod-A', 3, 1000, 3000, '{}'::jsonb)`);
      expect(await scalar(db,
        `SELECT count(*) FROM inventory_movements WHERE idempotency_key='order_item:rel-app-2' AND quantity_delta=-3`)).toBe(1);
      expect(await scalar(db,
        `SELECT count(*) FROM orderitem_trigger_safety_audit`)).toBe(0);
    });

    it("2. a backfill-SHAPED insert with NO valid session context still records a movement (normal rules apply)", async () => {
      // Row carries a plausible-looking metadata.backfill.batch_id, but NO
      // session GUCs are set at all — the exception must not fire.
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-shaped-1', 'ord-pending', 'prod-C', 1, 750, 750,
                 jsonb_build_object('backfill', jsonb_build_object('batch_id', gen_random_uuid())))`);
      expect(await scalar(db,
        `SELECT count(*) FROM inventory_movements WHERE idempotency_key='order_item:rel-shaped-1'`)).toBe(1);
      expect(await scalar(db, `SELECT count(*) FROM orderitem_trigger_safety_audit`)).toBe(0);
    });

    it("6. (repeat, post-migration) normal audited-row deletion STILL remains BLOCKED with no GUCs set", async () => {
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-gap-post', 'ord-gap', 'prod-B', 1, 500, 500, '{}'::jsonb)`);
      await expect(db.query(`DELETE FROM order_items_relational WHERE id='rel-gap-post'`))
        .rejects.toThrow(/audited and its dependent records cannot be removed/);
    });

    it("9a. a row shaped like backfill but wrapped in an UPDATE of order_id is STILL blocked", async () => {
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-gap-upd', 'ord-gap', 'prod-B', 1, 500, 500,
                 jsonb_build_object('backfill', jsonb_build_object('batch_id', gen_random_uuid())))`);
      // Even with authorization GUCs, an UPDATE-of-order_id is never permitted
      // by the delete-only exception; the ORIGINAL guard runs unconditionally.
      await expect(applyInTx(db, `UPDATE order_items_relational SET order_id='ord-pending' WHERE id='rel-gap-upd';`,
        `SET LOCAL aquavo.backfill_rollback_authorized = 'on';`))
        .rejects.toThrow(/audited and its dependent records cannot be removed/);
    });
  });

  // ── §3-5: the inventory-sale exception ───────────────────────────────────
  describe("the inventory-sale exception", () => {
    it("opens an eligible backfill batch (finished_at IS NULL — matches the real in-flight window)", async () => {
      const r = await db.query<{ batch_id: string }>(
        `INSERT INTO orderitem_backfill_batches (source, migration) VALUES ('orders.items', 'backfill_orderitems_from_jsonb.sql') RETURNING batch_id`);
      (globalThis as any).__testBatchOpen = r.rows[0].batch_id;
    });

    it("3. exact approved backfill insert (all 6 conditions) creates ZERO inventory movements", async () => {
      const batch = (globalThis as any).__testBatchOpen as string;
      await applyInTx(db,
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-bf-ok', 'ord-gap', 'prod-D', 1, 900, 900,
                 jsonb_build_object('backfill', jsonb_build_object('batch_id', '${batch}', 'source', 'orders.items', 'migration', 'backfill_orderitems_from_jsonb.sql')));`,
        `SET LOCAL aquavo.backfill_batch_id = '${batch}';`);
      expect(await scalar(db,
        `SELECT count(*) FROM inventory_movements WHERE idempotency_key='order_item:rel-bf-ok'`)).toBe(0);
      expect(await scalar(db,
        `SELECT count(*) FROM orderitem_trigger_safety_audit
         WHERE event_type='inventory_sale_suppressed' AND order_item_id='rel-bf-ok' AND batch_id='${batch}'`)).toBe(1);
    });

    it("4. wrong batch UUID in the GUC cannot bypass", async () => {
      const batch = (globalThis as any).__testBatchOpen as string;
      const wrongBatch = "00000000-0000-4000-8000-000000000099";
      await applyInTx(db,
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-bf-wrongguc', 'ord-pending', 'prod-D', 1, 900, 900,
                 jsonb_build_object('backfill', jsonb_build_object('batch_id', '${batch}')));`,
        `SET LOCAL aquavo.backfill_batch_id = '${wrongBatch}';`);
      expect(await scalar(db,
        `SELECT count(*) FROM inventory_movements WHERE idempotency_key='order_item:rel-bf-wrongguc'`)).toBe(1);
      expect(await scalar(db,
        `SELECT count(*) FROM orderitem_trigger_safety_audit WHERE order_item_id='rel-bf-wrongguc'`)).toBe(0);
    });

    it("5. forged metadata.backfill.batch_id with no matching batch row cannot bypass", async () => {
      const forged = "11111111-1111-4111-8111-111111111111";
      await applyInTx(db,
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-bf-forged', 'ord-pending', 'prod-D', 1, 900, 900,
                 jsonb_build_object('backfill', jsonb_build_object('batch_id', '${forged}')));`,
        `SET LOCAL aquavo.backfill_batch_id = '${forged}';`);
      expect(await scalar(db,
        `SELECT count(*) FROM inventory_movements WHERE idempotency_key='order_item:rel-bf-forged'`)).toBe(1);
      expect(await scalar(db,
        `SELECT count(*) FROM orderitem_trigger_safety_audit WHERE order_item_id='rel-bf-forged'`)).toBe(0);
    });

    it("a FINISHED batch cannot suppress a movement for a new, unrelated insert (condition 6 matters)", async () => {
      const batch = (globalThis as any).__testBatchOpen as string;
      await db.query(`UPDATE orderitem_backfill_batches SET finished_at=now(), rows_inserted=1 WHERE batch_id=$1`, [batch]);
      await applyInTx(db,
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-bf-finished', 'ord-pending', 'prod-D', 1, 900, 900,
                 jsonb_build_object('backfill', jsonb_build_object('batch_id', '${batch}')));`,
        `SET LOCAL aquavo.backfill_batch_id = '${batch}';`);
      expect(await scalar(db,
        `SELECT count(*) FROM inventory_movements WHERE idempotency_key='order_item:rel-bf-finished'`)).toBe(1);
    });
  });

  // ── §7-9: the audited-delete exception ───────────────────────────────────
  describe("the audited-delete exception", () => {
    it("7. exact batch rollback deletion SUCCEEDS", async () => {
      const batch = (globalThis as any).__testBatchOpen as string; // now finished, per the test above
      await applyInTx(db, `DELETE FROM order_items_relational WHERE id='rel-bf-ok';`,
        `SET LOCAL aquavo.backfill_rollback_authorized = 'on'; SET LOCAL aquavo.backfill_batch_id = '${batch}';`);
      expect(await scalar(db, `SELECT count(*) FROM order_items_relational WHERE id='rel-bf-ok'`)).toBe(0);
      expect(await scalar(db,
        `SELECT count(*) FROM orderitem_trigger_safety_audit
         WHERE event_type='audited_delete_authorized' AND order_item_id='rel-bf-ok' AND batch_id='${batch}'`)).toBe(1);
    });

    it("8. wrong-batch deletion remains BLOCKED", async () => {
      const batch = (globalThis as any).__testBatchOpen as string;
      const wrongBatch = "00000000-0000-4000-8000-000000000099";
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-bf-wrongdel', 'ord-gap', 'prod-E', 1, 800, 800,
                 jsonb_build_object('backfill', jsonb_build_object('batch_id', '${batch}')))`);
      // insert unguarded above records a real movement — irrelevant to this test, only the delete matters
      await expect(applyInTx(db, `DELETE FROM order_items_relational WHERE id='rel-bf-wrongdel';`,
        `SET LOCAL aquavo.backfill_rollback_authorized = 'on'; SET LOCAL aquavo.backfill_batch_id = '${wrongBatch}';`))
        .rejects.toThrow(/audited and its dependent records cannot be removed/);
      expect(await scalar(db, `SELECT count(*) FROM order_items_relational WHERE id='rel-bf-wrongdel'`)).toBe(1);
    });

    it("8b. missing rollback-authorized flag (batch id correct) remains BLOCKED", async () => {
      const batch = (globalThis as any).__testBatchOpen as string;
      await expect(applyInTx(db, `DELETE FROM order_items_relational WHERE id='rel-bf-wrongdel';`,
        `SET LOCAL aquavo.backfill_batch_id = '${batch}';`)) // authorized flag NOT set
        .rejects.toThrow(/audited and its dependent records cannot be removed/);
      expect(await scalar(db, `SELECT count(*) FROM order_items_relational WHERE id='rel-bf-wrongdel'`)).toBe(1);
    });

    it("9. application-created rows (no metadata.backfill) can NEVER be deleted via the exception", async () => {
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-app-gap', 'ord-gap', 'prod-E', 1, 800, 800, '{}'::jsonb)`);
      const batch = (globalThis as any).__testBatchOpen as string;
      // Fully "authorized" session, but the row has no backfill provenance at all.
      await expect(applyInTx(db, `DELETE FROM order_items_relational WHERE id='rel-app-gap';`,
        `SET LOCAL aquavo.backfill_rollback_authorized = 'on'; SET LOCAL aquavo.backfill_batch_id = '${batch}';`))
        .rejects.toThrow(/audited and its dependent records cannot be removed/);
      expect(await scalar(db, `SELECT count(*) FROM order_items_relational WHERE id='rel-app-gap'`)).toBe(1);
    });

    it("even NULL metadata (not just missing key) is refused by the delete exception", async () => {
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-app-nullmeta', 'ord-gap', 'prod-E', 1, 800, 800, NULL)`);
      const batch = (globalThis as any).__testBatchOpen as string;
      await expect(applyInTx(db, `DELETE FROM order_items_relational WHERE id='rel-app-nullmeta';`,
        `SET LOCAL aquavo.backfill_rollback_authorized = 'on'; SET LOCAL aquavo.backfill_batch_id = '${batch}';`))
        .rejects.toThrow(/audited and its dependent records cannot be removed/);
    });

    it("a row on an order with NO prior order_line movement is still deletable without any exception", async () => {
      // A genuinely hard-deletable order (pending/pending/cod_received=false,
      // no payment_events/cash_settlement_items) whose ONLY order_line
      // movement is the one this insert itself creates. Deleting it is
      // blocked by nothing but the original guard's own logic — no GUCs.
      // We disable enforce mode for this one insert so it creates NO
      // order_line movement, leaving the order genuinely hard-deletable,
      // then delete with zero GUCs set to prove the ORIGINAL (non-exception)
      // path still permits an ordinary deletable row.
      await db.query(`INSERT INTO orders (id, status, payment_status, cod_received)
                       VALUES ('ord-pending-clean', 'pending', 'pending', false)`);
      await applyInTx(db,
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-pending-del', 'ord-pending-clean', 'prod-E', 1, 800, 800, '{}'::jsonb);`,
        `UPDATE settings SET value='off' WHERE key='inventory_ledger_mode';`);
      // restore enforce mode for subsequent tests
      await db.query(`UPDATE settings SET value='enforce' WHERE key='inventory_ledger_mode'`);
      await db.query(`DELETE FROM order_items_relational WHERE id='rel-pending-del'`); // no GUCs needed
      expect(await scalar(db, `SELECT count(*) FROM order_items_relational WHERE id='rel-pending-del'`)).toBe(0);
      // no audit row for a delete that never needed the exception
      expect(await scalar(db,
        `SELECT count(*) FROM orderitem_trigger_safety_audit WHERE order_item_id='rel-pending-del'`)).toBe(0);
    });
  });

  // ── §10: rollback restores byte-identical originals ──────────────────────
  describe("rollback", () => {
    it("10. rollback restores the original function definitions EXACTLY", async () => {
      // Snapshot the (modified, post-forward-migration) function hashes first
      // as a negative control — they must NOT already equal the originals.
      const beforeHashes: Record<string, string> = {};
      for (const fn of Object.keys(ORIGINAL_FINGERPRINTS)) {
        beforeHashes[fn] = await funcSourceSha256(db, fn);
        expect(beforeHashes[fn]).not.toBe(ORIGINAL_FINGERPRINTS[fn]);
      }

      await applyInTx(db, rollbackSql);

      for (const fn of Object.keys(ORIGINAL_FINGERPRINTS)) {
        const liveHash = await funcSourceSha256(db, fn);
        // The SHA-256 of PGlite's own pg_get_functiondef() reconstruction,
        // post-rollback, must equal the fingerprint captured LIVE against
        // real production in docs/audit/orderitem-trigger-forensics.md §2 —
        // the strongest form of "byte-for-byte identical" available without
        // a live Neon connection (which this agent is forbidden from making).
        expect(liveHash).toBe(ORIGINAL_FINGERPRINTS[fn]);
      }

      // The audit table introduced by the forward migration is gone.
      expect(await scalar(db,
        `SELECT count(*) FROM information_schema.tables WHERE table_name='orderitem_trigger_safety_audit'`)).toBe(0);
    });

    it("post-rollback: normal insert behaviour is exactly the pre-migration original (no exception code path exists)", async () => {
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-post-rollback', 'ord-pending', 'prod-F', 1, 111, 111,
                 jsonb_build_object('backfill', jsonb_build_object('batch_id', gen_random_uuid())))`);
      expect(await scalar(db,
        `SELECT count(*) FROM inventory_movements WHERE idempotency_key='order_item:rel-post-rollback'`)).toBe(1);
    });

    it("post-rollback: the audited-delete guard is unconditionally back to original (GUCs do nothing)", async () => {
      await db.query(
        `INSERT INTO order_items_relational (id, order_id, product_id, quantity, price_at_purchase, total_price, metadata)
         VALUES ('rel-post-rollback-gap', 'ord-gap', 'prod-F', 1, 111, 111, '{}'::jsonb)`);
      await expect(applyInTx(db, `DELETE FROM order_items_relational WHERE id='rel-post-rollback-gap';`,
        `SET LOCAL aquavo.backfill_rollback_authorized = 'on'; SET LOCAL aquavo.backfill_batch_id = '${(globalThis as any).__testBatchOpen}';`))
        .rejects.toThrow(/audited and its dependent records cannot be removed/);
    });
  });

  it("forward + rollback SQL files parse and the fixture reflects the intended shape (sanity)", () => {
    expect(forwardSql).toContain("record_order_item_inventory_sale");
    expect(forwardSql).toContain("prevent_unsafe_order_dependency_mutation");
    expect(rollbackSql).toContain("DROP TABLE IF EXISTS orderitem_trigger_safety_audit");
  });
});
