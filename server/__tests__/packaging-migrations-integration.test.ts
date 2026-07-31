// Real migration execution against a disposable PostgreSQL (PGlite).
//
// Neon writes are unavailable in this environment, which is not a reason to ship
// unexecuted SQL. Every migration in this feature is applied here for real:
// forward, then rolled back in reverse, then applied again — because a rollback
// that leaves debris only shows up on the second apply.
//
// PGlite runs genuine PostgreSQL, so constraints, partial indexes, triggers and
// plpgsql functions all behave as they will on Neon. What it cannot cover is
// noted at the bottom of this file and in OPERATOR-RUNBOOK.md.
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = process.cwd();
const sqlOf = (f: string) => readFileSync(join(ROOT, "migrations", f), "utf8");

/** In order. 0039 first: the governance recovery precedes everything after it. */
const FORWARD = [
  "0039_accounting_phase1b_snapshot_writer_and_payment_ledger.sql",
  "0040_packaging_carton_catalog.sql",
  "0041_product_packing_data.sql",
  "0042_carton_reservations.sql",
  "0043_order_packing_plans.sql",
  "0044_admin_stock_alerts.sql",
  "0045_order_return_packaging_losses.sql",
  "0046_return_packaging_loss_source.sql",
  "0047_packing_import_drafts.sql",
  "0048_packing_policy_and_preparation_costs.sql",
  "0049_default_preparation_profile.sql",
];

const ROLLBACK = [...FORWARD].reverse().map((f) => f.replace(/\.sql$/, "_rollback.sql"));

/** Only the migrations this feature owns — 0039 is verified separately. */
const FEATURE_FORWARD = FORWARD.slice(1);
const FEATURE_ROLLBACK = [...FEATURE_FORWARD].reverse().map((f) =>
  f.replace(/\.sql$/, "_rollback.sql"),
);

let db: PGlite;

/**
 * The pre-existing schema these migrations land on. Built from the real
 * fulfillment migrations plus the minimal shape of the tables they reference,
 * so foreign keys and triggers are exercised rather than stubbed away.
 */
async function baseline(client: PGlite): Promise<void> {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum text,
      applied_at timestamptz NOT NULL DEFAULT now(),
      applied_by text,
      rolled_back_at timestamptz,
      notes text
    );

    CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id text PRIMARY KEY,
      status text NOT NULL DEFAULT 'pending',
      total numeric NOT NULL DEFAULT 0,
      rounded_total numeric,
      box_cost numeric,
      source text,
      financially_counted boolean DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id text PRIMARY KEY,
      name text NOT NULL,
      stock integer NOT NULL DEFAULT 0,
      variants jsonb,
      cost_price numeric,
      packaging_cost numeric,
      insert_cost numeric,
      cost_price_resolution text,
      packaging_cost_resolution text,
      insert_cost_resolution text,
      deleted_at timestamp
    );

    CREATE TABLE IF NOT EXISTS order_items_relational (
      id text PRIMARY KEY,
      order_id text NOT NULL REFERENCES orders(id),
      product_id text NOT NULL,
      quantity integer NOT NULL,
      price_at_purchase numeric NOT NULL,
      total_price numeric NOT NULL,
      metadata jsonb,
      unit_sale_price_snapshot numeric,
      discount_snapshot numeric,
      final_unit_sale_price_snapshot numeric,
      sale_price_snapshot_at timestamp,
      sale_price_source text,
      unit_cost_price numeric,
      unit_packaging_cost numeric,
      unit_insert_cost numeric,
      cost_snapshot_version integer,
      cost_snapshot_at timestamp,
      cost_snapshot_status text,
      cost_snapshot_source text,
      cost_snapshot_confidence text
    );

    CREATE TABLE IF NOT EXISTS order_return_events (
      id text PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id text NOT NULL REFERENCES orders(id),
      type text NOT NULL,
      packaging_loss numeric NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'recorded',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $BODY$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $BODY$ LANGUAGE plpgsql;
  `);

  // The real fulfillment schema these migrations extend.
  await client.exec(sqlOf("add_fulfillment_costing.sql"));
  await client.exec(sqlOf("add_fulfillment_hardening.sql"));
  await client.exec(sqlOf("add_pim_line_identity.sql"));
}

/** Compact catalog signature — the same shape used to verify 0039 on Neon. */
async function signature(client: PGlite): Promise<Record<string, string>> {
  const res = await client.query<{ k: string; sig: string }>(`
    WITH sig AS (
      SELECT 'tables' k, 'T:'||table_name s FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE'
      UNION ALL SELECT 'columns', 'C:'||table_name||'.'||column_name||':'||data_type
        FROM information_schema.columns WHERE table_schema='public'
      UNION ALL SELECT 'indexes', 'I:'||indexname||'='||md5(indexdef)
        FROM pg_indexes WHERE schemaname='public'
      UNION ALL SELECT 'constraints', 'K:'||conrelid::regclass::text||'.'||conname
        FROM pg_constraint WHERE connamespace='public'::regnamespace
      UNION ALL SELECT 'triggers', 'G:'||c.relname||'.'||t.tgname
        FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND NOT t.tgisinternal
      UNION ALL SELECT 'functions', 'F:'||p.proname
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    )
    SELECT k, md5(string_agg(s, E'\n' ORDER BY s)) sig FROM sig GROUP BY k
  `);
  return Object.fromEntries(res.rows.map((r) => [r.k, r.sig]));
}

async function count(client: PGlite, sql: string): Promise<number> {
  const r = await client.query<{ n: string }>(sql);
  return Number(r.rows[0]?.n ?? 0);
}

beforeAll(async () => {
  db = new PGlite();
  await baseline(db);
}, 120_000);

describe("migrations 0039-0048 apply cleanly", () => {
  it("applies every migration in order", async () => {
    for (const f of FORWARD) {
      await db.exec(sqlOf(f));
    }
    // Each feature migration registered itself; 0039 deliberately does not.
    const registered = await count(
      db,
      `SELECT count(*) n FROM schema_migrations WHERE version LIKE '004%'`,
    );
    expect(registered).toBe(FEATURE_FORWARD.length);
  }, 120_000);

  it("is idempotent — a second application changes nothing", async () => {
    const before = await signature(db);
    for (const f of FORWARD) await db.exec(sqlOf(f));
    expect(await signature(db)).toEqual(before);
  }, 120_000);

  it("creates every expected table", async () => {
    const n = await count(
      db,
      `SELECT count(*) n FROM information_schema.tables WHERE table_schema='public' AND table_name IN
       ('product_packing_data','carton_reservations','order_packing_plans','order_packing_plan_items',
        'admin_stock_alerts','order_return_packaging_losses','packing_import_drafts','packing_import_draft_lines')`,
    );
    expect(n).toBe(8);
  });

  it("adds the carton columns to fulfillment_materials", async () => {
    const n = await count(
      db,
      `SELECT count(*) n FROM information_schema.columns
        WHERE table_schema='public' AND table_name='fulfillment_materials'
          AND column_name IN ('sku','material_kind','calculation_basis','stock_tracked',
            'low_stock_threshold','internal_length_cm','internal_width_cm','internal_height_cm',
            'max_weight_kg','safety_padding_cm','archived_at')`,
    );
    expect(n).toBe(11);
  });

  it("creates the deduplication and idempotency indexes", async () => {
    const r = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN
       ('asa_one_open_uidx','cres_one_active_uidx','cres_idempotency_uidx',
        'orpl_event_line_uidx','ppd_product_variant_uidx','opp_one_live_uidx')`,
    );
    expect(r.rows.map((x) => x.indexname).sort()).toEqual([
      "asa_one_open_uidx",
      "cres_idempotency_uidx",
      "cres_one_active_uidx",
      "opp_one_live_uidx",
      "orpl_event_line_uidx",
      "ppd_product_variant_uidx",
    ]);
  });

  it("creates the 0039 snapshot writer, trigger and readiness view", async () => {
    expect(
      await count(db, `SELECT count(*) n FROM pg_proc WHERE proname='write_order_item_financial_snapshots'`),
    ).toBe(1);
    expect(
      await count(db, `SELECT count(*) n FROM pg_trigger WHERE tgname='order_items_b_write_financial_snapshots'`),
    ).toBe(1);
    expect(
      await count(db, `SELECT count(*) n FROM information_schema.views
                        WHERE table_schema='public' AND table_name='accounting_readiness_status'`),
    ).toBe(1);
  });

  it("seeds exactly two preparation costs and no cartons", async () => {
    const seeded = await db.query<{ sku: string; calculation_basis: string; stock_tracked: boolean; current_unit_cost: string }>(
      `SELECT sku, calculation_basis, stock_tracked, current_unit_cost
         FROM fulfillment_materials WHERE sku IS NOT NULL ORDER BY sku`,
    );
    expect(seeded.rows.map((r) => r.sku)).toEqual(["PRICE_LABEL", "THANK_YOU_SOCIAL_CARD"]);
    for (const r of seeded.rows) {
      expect(r.calculation_basis).toBe("per_order");
      expect(r.stock_tracked).toBe(false);
    }
    expect(Number(seeded.rows[0]!.current_unit_cost)).toBe(50);
    expect(Number(seeded.rows[1]!.current_unit_cost)).toBe(100);

    // The whole point: no invented carton.
    expect(await count(db, `SELECT count(*) n FROM fulfillment_materials WHERE material_kind='carton'`)).toBe(0);
    expect(await count(db, `SELECT count(*) n FROM product_packing_data`)).toBe(0);
  });

  it("routes the seeded costs through an approved, effective-dated cost record", async () => {
    const r = await db.query<{ approval_status: string; cost_basis: string; unit_cost: string }>(
      `SELECT r.approval_status, r.cost_basis, r.unit_cost
         FROM material_cost_records r JOIN fulfillment_materials f ON f.id=r.material_id
        WHERE f.sku='PRICE_LABEL'`,
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]!.approval_status).toBe("approved");
    expect(r.rows[0]!.cost_basis).toBe("verified_manual_standard");
  });

  it("0049 creates one default profile family that actually applies the two costs", async () => {
    const fam = await db.query<{ id: string; applies_to: unknown; active: boolean }>(
      `SELECT id, applies_to, active FROM packaging_profile_families
        WHERE family_key='default-preparation'`,
    );
    expect(fam.rows).toHaveLength(1);
    expect(fam.rows[0]!.active).toBe(true);
    // suggestProfileForOrder only scores a family when applies_to.default is set;
    // without this the draft opens empty and 50+100 never reach an order.
    expect(fam.rows[0]!.applies_to).toMatchObject({ default: true });

    const ver = await db.query<{ version: number; expected_cost: string; locked: boolean }>(
      `SELECT p.version, p.expected_cost, p.locked FROM packaging_profiles p
         JOIN packaging_profile_families f ON f.id=p.profile_family_id
        WHERE f.family_key='default-preparation'`,
    );
    expect(ver.rows).toHaveLength(1);
    expect(ver.rows[0]!.version).toBe(1);
    expect(ver.rows[0]!.locked).toBe(false);
    expect(Number(ver.rows[0]!.expected_cost)).toBe(150); // 50 + 100, summed from the approved records

    const items = await db.query<{ sku: string; quantity: string }>(
      `SELECT m.sku, i.quantity FROM packaging_profile_items i
         JOIN fulfillment_materials m ON m.id=i.material_id
         JOIN packaging_profiles p ON p.id=i.profile_id
         JOIN packaging_profile_families f ON f.id=p.profile_family_id
        WHERE f.family_key='default-preparation' ORDER BY m.sku`,
    );
    expect(items.rows.map((r) => r.sku)).toEqual(["PRICE_LABEL", "THANK_YOU_SOCIAL_CARD"]);
    // Quantity is the profile multiplier. Both materials are per_order, so a
    // five-carton order still counts each of them exactly once.
    for (const r of items.rows) expect(Number(r.quantity)).toBe(1);
  });

  it("0049 is idempotent — re-applying does not create a second family or duplicate items", async () => {
    await db.exec(sqlOf("0049_default_preparation_profile.sql"));
    await db.exec(sqlOf("0049_default_preparation_profile.sql"));
    expect(
      await count(db, `SELECT count(*) n FROM packaging_profile_families WHERE family_key='default-preparation'`),
    ).toBe(1);
    expect(
      await count(
        db,
        `SELECT count(*) n FROM packaging_profiles p JOIN packaging_profile_families f ON f.id=p.profile_family_id
          WHERE f.family_key='default-preparation'`,
      ),
    ).toBe(1);
    expect(
      await count(
        db,
        `SELECT count(*) n FROM packaging_profile_items i
           JOIN packaging_profiles p ON p.id=i.profile_id
           JOIN packaging_profile_families f ON f.id=p.profile_family_id
          WHERE f.family_key='default-preparation'`,
      ),
    ).toBe(2);
  });

  it("seeds the support policy and the kill switches", async () => {
    const r = await db.query<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key LIKE 'packing_%' OR key LIKE 'carton_%' ORDER BY key`,
    );
    const m = Object.fromEntries(r.rows.map((x) => [x.key, x.value]));
    expect(m["packing_min_support_ratio"]).toBe("0.80");
    expect(m["packing_max_overhang_ratio"]).toBe("0.20");
    expect(m["packing_fragile_min_support_ratio"]).toBe("0.95");
    expect(m["carton_planner_enabled"]).toBe("true");
    expect(m["carton_reservations_enabled"]).toBe("true");
  });
});

describe("constraints actually bite", () => {
  it("rejects a zero or negative carton dimension", async () => {
    await expect(
      db.exec(`INSERT INTO fulfillment_materials (id,name,material_kind,internal_length_cm)
               VALUES ('bad-dim','x','carton',0)`),
    ).rejects.toThrow();
  });

  it("rejects an unknown calculation basis", async () => {
    await expect(
      db.exec(`INSERT INTO fulfillment_materials (id,name,calculation_basis)
               VALUES ('bad-basis','x','per_moon')`),
    ).rejects.toThrow();
  });

  it("rejects an internal dimension larger than the external one", async () => {
    await expect(
      db.exec(`INSERT INTO fulfillment_materials (id,name,material_kind,internal_length_cm,external_length_cm)
               VALUES ('bad-nest','x','carton',50,40)`),
    ).rejects.toThrow();
  });

  it("rejects a support ratio outside 0..1", async () => {
    await db.exec(`INSERT INTO products (id,name) VALUES ('p1','منتج') ON CONFLICT DO NOTHING`);
    await expect(
      db.exec(`INSERT INTO product_packing_data (id,product_id,minimum_support_ratio)
               VALUES ('bad-ratio','p1',1.5)`),
    ).rejects.toThrow();
  });

  it("allows one product-level row and one row per variant, but not two of either", async () => {
    await db.exec(`INSERT INTO product_packing_data (id,product_id) VALUES ('ppd-1','p1')`);
    await db.exec(`INSERT INTO product_packing_data (id,product_id,variant_id) VALUES ('ppd-2','p1','v1')`);
    await expect(
      db.exec(`INSERT INTO product_packing_data (id,product_id) VALUES ('ppd-3','p1')`),
    ).rejects.toThrow();
  });

  it("allows only one open alert per carton", async () => {
    await db.exec(`INSERT INTO fulfillment_materials (id,name,material_kind,stock_tracked)
                   VALUES ('mat-c1','كارتونة اختبار','carton',true)`);
    await db.exec(`INSERT INTO admin_stock_alerts (id,material_id,alert_level,state)
                   VALUES ('a1','mat-c1','low','open')`);
    await expect(
      db.exec(`INSERT INTO admin_stock_alerts (id,material_id,alert_level,state)
               VALUES ('a2','mat-c1','critical','open')`),
    ).rejects.toThrow();
    // Closing it re-arms: a new alert becomes possible again.
    await db.exec(`UPDATE admin_stock_alerts SET state='closed', closed_at=now() WHERE id='a1'`);
    await db.exec(`INSERT INTO admin_stock_alerts (id,material_id,alert_level,state)
                   VALUES ('a2','mat-c1','critical','open')`);
    expect(await count(db, `SELECT count(*) n FROM admin_stock_alerts WHERE material_id='mat-c1'`)).toBe(2);
  });

  it("allows only one active reservation per order and material", async () => {
    await db.exec(`INSERT INTO orders (id,status) VALUES ('o1','confirmed') ON CONFLICT DO NOTHING`);
    await db.exec(`INSERT INTO carton_reservations (id,order_id,material_id,quantity,state,idempotency_key)
                   VALUES ('r1','o1','mat-c1',1,'active','k1')`);
    await expect(
      db.exec(`INSERT INTO carton_reservations (id,order_id,material_id,quantity,state,idempotency_key)
               VALUES ('r2','o1','mat-c1',1,'active','k2')`),
    ).rejects.toThrow();
    // Releasing frees the slot — which is what a carton change relies on.
    await db.exec(`UPDATE carton_reservations SET state='released', released_reason='تغيير كارتونة' WHERE id='r1'`);
    await db.exec(`INSERT INTO carton_reservations (id,order_id,material_id,quantity,state,idempotency_key)
                   VALUES ('r2','o1','mat-c1',1,'active','k2')`);
  });

  it("rejects a duplicate reservation idempotency key", async () => {
    await expect(
      db.exec(`INSERT INTO carton_reservations (id,order_id,material_id,quantity,state,idempotency_key)
               VALUES ('r3','o1','mat-c1',1,'released','k2')`),
    ).rejects.toThrow();
  });

  it("requires a reason to leave the automated model", async () => {
    await expect(
      db.exec(`INSERT INTO order_packing_plans (id,order_id,state) VALUES ('pl1','o1','manual_pack_required')`),
    ).rejects.toThrow();
    await db.exec(`INSERT INTO order_packing_plans (id,order_id,state,manual_reason)
                   VALUES ('pl1','o1','manual_pack_required','تغليف يدوي خارج النموذج')`);
  });

  it("refuses to mark a plan validated without a hash and a report", async () => {
    await expect(
      db.exec(`INSERT INTO order_packing_plans (id,order_id,state) VALUES ('pl2','o1','validated')`),
    ).rejects.toThrow();
  });
});

describe("return-loss quantity ceiling (0045 trigger)", () => {
  beforeAll(async () => {
    await db.exec(`
      INSERT INTO orders (id,status) VALUES ('o-ret','delivered') ON CONFLICT DO NOTHING;
      INSERT INTO order_fulfillment_events (id,order_id,event_type,sequence_number,idempotency_key,workflow_state,cost_status)
        VALUES ('ev-ret','o-ret','original',1,'idem-ret','confirmed','exact');
      INSERT INTO order_fulfillment_lines (id,event_id,order_id,material_id,material_name_snapshot,quantity,unit_cost_snapshot,total_cost,cost_status)
        VALUES ('ln-ret','ev-ret','o-ret','mat-c1','كارتونة اختبار',2,1000,2000,'exact');
      INSERT INTO order_return_events (id,order_id,type) VALUES ('re-1','o-ret','partial_return');
      INSERT INTO order_return_events (id,order_id,type) VALUES ('re-2','o-ret','partial_return');
      INSERT INTO order_return_events (id,order_id,type) VALUES ('re-3','o-ret','partial_return');
    `);
  });

  const insertLoss = (id: string, retEvent: string, qty: number) =>
    db.exec(`INSERT INTO order_return_packaging_losses
        (id,order_id,return_event_id,fulfillment_event_id,fulfillment_line_id,
         material_id,material_name_snapshot,quantity,original_unit_cost_snapshot,
         original_total_cost_snapshot,original_cost_status)
      VALUES ('${id}','o-ret','${retEvent}','ev-ret','ln-ret','mat-c1','كارتونة اختبار',
              ${qty},1000,${qty * 1000},'exact')`);

  it("accepts the first partial classification of 1 of 2", async () => {
    await insertLoss("loss-1", "re-1", 1);
    expect(await count(db, `SELECT count(*) n FROM order_return_packaging_losses WHERE fulfillment_line_id='ln-ret'`)).toBe(1);
  });

  it("accepts the second partial classification of the remaining 1", async () => {
    await insertLoss("loss-2", "re-2", 1);
    const total = await count(db, `SELECT COALESCE(SUM(quantity),0) n FROM order_return_packaging_losses WHERE fulfillment_line_id='ln-ret'`);
    expect(total).toBe(2);
  });

  it("rejects a third classification — the cumulative ceiling is reached", async () => {
    await expect(insertLoss("loss-3", "re-3", 1)).rejects.toThrow(/exceeds/i);
  });

  it("rejects re-processing the same return event", async () => {
    await expect(insertLoss("loss-dup", "re-1", 1)).rejects.toThrow();
  });

  it("keeps each return event reporting only its own loss", async () => {
    const r = await db.query<{ return_event_id: string; n: string }>(
      `SELECT return_event_id, SUM(original_total_cost_snapshot) n
         FROM order_return_packaging_losses WHERE fulfillment_line_id='ln-ret'
        GROUP BY return_event_id ORDER BY return_event_id`,
    );
    expect(r.rows.map((x) => Number(x.n))).toEqual([1000, 1000]);
  });

  it("blocks any edit or deletion of a classification", async () => {
    await expect(db.exec(`UPDATE order_return_packaging_losses SET quantity=5 WHERE id='loss-1'`)).rejects.toThrow(/immutable/i);
    await expect(db.exec(`DELETE FROM order_return_packaging_losses WHERE id='loss-1'`)).rejects.toThrow(/immutable/i);
  });

  it("never restores carton stock — no movement exists for the return", async () => {
    expect(
      await count(db, `SELECT count(*) n FROM packaging_inventory_movements WHERE order_id='o-ret'`),
    ).toBe(0);
  });
});

describe("rollback and re-apply", () => {
  it("rolls every feature migration back in reverse order", async () => {
    for (const f of FEATURE_ROLLBACK) await db.exec(sqlOf(f));

    const remaining = await count(
      db,
      `SELECT count(*) n FROM information_schema.tables WHERE table_schema='public' AND table_name IN
       ('product_packing_data','carton_reservations','order_packing_plans','order_packing_plan_items',
        'admin_stock_alerts','order_return_packaging_losses','packing_import_drafts','packing_import_draft_lines')`,
    );
    expect(remaining).toBe(0);

    const cartonCols = await count(
      db,
      `SELECT count(*) n FROM information_schema.columns WHERE table_schema='public'
        AND table_name='fulfillment_materials' AND column_name IN ('sku','material_kind','internal_length_cm')`,
    );
    expect(cartonCols).toBe(0);

    // The two seeded materials survive as archived rows rather than being
    // deleted: their approved cost records are evidence and mcr_approved_guard
    // refuses to delete those, so retiring the material is the honest rollback.
    expect(
      await count(db, `SELECT count(*) n FROM fulfillment_materials WHERE name IN ('ملصق السعر','كارت الشكر والتواصل')`),
    ).toBe(2);
    expect(
      await count(db, `SELECT count(*) n FROM material_cost_records WHERE created_by='migration-0048'`),
    ).toBe(2);

    const flagged = await count(
      db,
      `SELECT count(*) n FROM schema_migrations WHERE version LIKE '004%' AND rolled_back_at IS NOT NULL`,
    );
    expect(flagged).toBe(FEATURE_FORWARD.length);
  }, 120_000);

  it("leaves the pre-existing fulfillment schema intact", async () => {
    // The rollbacks must not have taken the tables they extended with them.
    const n = await count(
      db,
      `SELECT count(*) n FROM information_schema.tables WHERE table_schema='public' AND table_name IN
       ('fulfillment_materials','packaging_inventory_movements','order_fulfillment_events','order_fulfillment_lines')`,
    );
    expect(n).toBe(4);
  });

  it("leaves historical fixture rows untouched", async () => {
    expect(await count(db, `SELECT count(*) n FROM orders`)).toBeGreaterThan(0);
    expect(await count(db, `SELECT count(*) n FROM order_fulfillment_lines WHERE id='ln-ret'`)).toBe(1);
    // order_return_events survives; only the discriminator column is dropped.
    expect(await count(db, `SELECT count(*) n FROM order_return_events`)).toBe(3);
    expect(
      await count(db, `SELECT count(*) n FROM information_schema.columns
                        WHERE table_name='order_return_events' AND column_name='packaging_loss_source'`),
    ).toBe(0);
  });

  it("re-applies cleanly afterwards — rollback left no debris", async () => {
    for (const f of FEATURE_FORWARD) await db.exec(sqlOf(f));
    const n = await count(
      db,
      `SELECT count(*) n FROM information_schema.tables WHERE table_schema='public' AND table_name IN
       ('product_packing_data','carton_reservations','order_packing_plans','order_packing_plan_items',
        'admin_stock_alerts','order_return_packaging_losses','packing_import_drafts','packing_import_draft_lines')`,
    );
    expect(n).toBe(8);
    // Converged, not duplicated: the archived rows are revived in place and
    // re-stamped with their sku rather than a second pair being inserted.
    expect(await count(db, `SELECT count(*) n FROM fulfillment_materials WHERE sku='PRICE_LABEL'`)).toBe(1);
    expect(await count(db, `SELECT count(*) n FROM fulfillment_materials WHERE name='ملصق السعر'`)).toBe(1);
    expect(
      await count(db, `SELECT count(*) n FROM fulfillment_materials WHERE sku='PRICE_LABEL' AND active AND archived_at IS NULL`),
    ).toBe(1);
    // And the cost record is not duplicated either.
    expect(await count(db, `SELECT count(*) n FROM material_cost_records WHERE created_by='migration-0048'`)).toBe(2);
  }, 120_000);
});

// NOT COVERED HERE — needs Neon, see OPERATOR-RUNBOOK.md:
//   * that 0039 reproduces Production's exact catalog (needs the pre-0039 branch);
//   * that applying 0039 to Production is a true no-op (needs Production);
//   * true multi-connection concurrency: PGlite is single-connection, so the
//     advisory-lock race between two simultaneous reservations cannot be staged
//     here. The lock ordering and the atomic re-check are unit-tested; the race
//     itself is a runbook step.
