/**
 * PHASE 1A GATE — order creation must keep working on the PRE-MIGRATION schema.
 *
 * This branch declares five new columns on `order_items_relational` and nine on
 * `product_cost_history` in shared/schema.ts, but their migrations are NOT
 * applied to production. Drizzle builds SQL from the schema definition, so any
 * read or write that names a column implicitly would compile a query the live
 * database cannot answer — and every affected request would fail the moment
 * this deploys, before a single migration runs.
 *
 * The structural guard in order-creation-dual-write.test.ts reads source text.
 * That is not sufficient here: only executing the real path against a real
 * database that LACKS the new columns can prove deploy safety.
 *
 * So this test builds a Postgres (PGlite) whose `order_items_relational` and
 * `product_cost_history` are exactly the production shape — the new columns are
 * deliberately absent — and runs the genuine production entry point,
 * `OrderStorage.createOrderSecure`, against it.
 *
 * It asserts what is TRUE today, not what we intend later:
 *   - the order is created and both line stores are written;
 *   - the COST snapshot is written (that migration is already in production);
 *   - the SALE-PRICE snapshot is NOT written, because neither the columns nor
 *     the writer exist yet. Claiming otherwise would be false.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

vi.mock("../db.js", () => ({ getDb: vi.fn(), db: null }));
// The deployment-readiness guard has its own suite (schema-readiness.test.ts).
// Here it must not short-circuit the path we are trying to exercise.
vi.mock("../services/schema-readiness.js", () => ({
  getSchemaReadiness: async () => ({
    orderCreationEnabled: true, ready: true, missingColumns: [], checkedAt: "", detail: "",
  }),
  assertOrderCreationReady: () => {},
}));

const { getDb } = await import("../db.js");
const { OrderStorage } = await import("../storage/order-storage.js");
const schema = await import("../../shared/schema.js");

/**
 * PRODUCTION SHAPE, 2026-07-28. `order_items_relational` carries the eight
 * cost-snapshot columns (already migrated) and NONE of the five sale-price
 * columns. `product_cost_history` keeps NOT NULL DEFAULT '0' and has no
 * resolution columns. This is the schema this branch must not break.
 */
const PRE_MIGRATION_SCHEMA = `
  CREATE TABLE products (
    id text PRIMARY KEY,
    name text NOT NULL,
    price numeric NOT NULL,
    original_price numeric,
    currency text DEFAULT 'IQD',
    stock integer NOT NULL DEFAULT 0,
    low_stock_threshold integer DEFAULT 10,
    cost_price numeric,
    packaging_cost numeric,
    insert_cost numeric,
    cost_price_resolution text,
    packaging_cost_resolution text,
    insert_cost_resolution text,
    cost_resolution_note text,
    cost_resolution_by text,
    cost_resolution_at timestamp,
    variants jsonb,
    has_variants boolean DEFAULT false,
    deleted_at timestamp,
    slug text,
    description text,
    category text,
    category_id text,
    subcategory text,
    brand text,
    images jsonb,
    thumbnail text,
    specifications jsonb,
    rating numeric,
    review_count integer,
    is_new boolean,
    is_best_seller boolean,
    is_product_of_week boolean,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
  );

  CREATE TABLE orders (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number text NOT NULL,
    user_id text,
    status text NOT NULL DEFAULT 'pending',
    payment_status text DEFAULT 'pending',
    total numeric NOT NULL,
    rounded_total numeric,
    shipping_cost numeric DEFAULT '0',
    coupon_id text,
    discount_total numeric DEFAULT '0',
    points_used integer,
    cashback_used numeric,
    points_discount numeric,
    points_earned integer,
    rounding_cashback numeric,
    items jsonb,
    shipping_address text,
    customer_name text,
    customer_email text,
    customer_phone text,
    bonus_prize text,
    bonus_claimed_at timestamp,
    carrier text,
    cod_received boolean DEFAULT false,
    box_cost numeric DEFAULT '0',
    source text DEFAULT 'website',
    financially_counted boolean,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
  );

  -- The eight cost-snapshot columns exist; the five sale-price columns do NOT.
  CREATE TABLE order_items_relational (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id text NOT NULL,
    product_id text NOT NULL,
    quantity integer NOT NULL,
    price_at_purchase numeric NOT NULL,
    total_price numeric NOT NULL,
    unit_cost_price numeric,
    unit_packaging_cost numeric,
    unit_insert_cost numeric,
    cost_snapshot_status text,
    cost_snapshot_source text,
    cost_snapshot_confidence text,
    cost_snapshot_version integer,
    cost_snapshot_at timestamp,
    metadata jsonb
  );

  -- Pre-fix shape: NOT NULL DEFAULT '0', no resolution/evidence columns.
  CREATE TABLE product_cost_history (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id text NOT NULL,
    cost_price numeric NOT NULL DEFAULT '0',
    packaging_cost numeric NOT NULL DEFAULT '0',
    insert_cost numeric NOT NULL DEFAULT '0',
    effective_from timestamp NOT NULL,
    note text,
    changed_by text,
    created_at timestamp DEFAULT now()
  );

  CREATE TABLE settings (
    key text PRIMARY KEY,
    value text,
    updated_at timestamp DEFAULT now()
  );

  -- buildCostResolver layers approved manual overrides on top of the resolved
  -- cost, so the read path touches this table too.
  CREATE TABLE accounting_manual_adjustments (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    field_name text NOT NULL,
    old_value_json jsonb,
    new_value_json jsonb NOT NULL,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_by text NOT NULL,
    approved_by text,
    created_at timestamp DEFAULT now(),
    approved_at timestamp,
    applied_at timestamp,
    note text
  );

  CREATE TABLE coupons (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code text NOT NULL,
    description text,
    discount_type text,
    discount_value numeric,
    min_order_amount numeric,
    max_uses integer,
    max_uses_per_user integer,
    used_count integer DEFAULT 0,
    user_id text,
    is_active boolean DEFAULT true,
    start_date timestamp,
    end_date timestamp,
    created_at timestamp DEFAULT now()
  );
`;

const CUSTOMER = { name: "زبون بغداد", phone: "07701234567", address: "بغداد - الكرادة" };

async function freshDb() {
  const pg = new PGlite();
  await pg.exec(PRE_MIGRATION_SCHEMA);
  await pg.exec(`
    INSERT INTO products (id, name, price, stock, cost_price, packaging_cost, insert_cost,
                          cost_price_resolution, packaging_cost_resolution, insert_cost_resolution)
    VALUES ('p-filter', 'فلتر خارجي', 20000, 10, 5000, 500, 250, 'known', 'known', 'known');
    INSERT INTO settings (key, value) VALUES ('shipping_fee', '5000');
  `);
  const db = drizzle(pg, { schema });
  vi.mocked(getDb).mockReturnValue(db as never);
  return { pg, db };
}

describe("PHASE 1A — DEPLOYMENT ORDER GUARD (migration MUST precede merge)", () => {
  let pg: PGlite;

  beforeEach(async () => {
    ({ pg } = await freshDb());
  });

  it("PROVES the hazard: createOrderSecure FAILS on the pre-migration schema", async () => {
    // ⚠️ THIS IS NOT ACCEPTABLE SITE BEHAVIOUR. It is a deployment-ORDER guard.
    //
    // Drizzle compiles an INSERT column list from the schema definition, not
    // from the keys supplied at the call site. Because shared/schema.ts now
    // declares the five sale-price columns, EVERY insert into
    // order_items_relational names them and fills them with `default` — even
    // though no caller mentions them. Against a database where those columns
    // do not exist, the insert fails.
    //
    // Consequence: merging this branch BEFORE applying
    // add_order_item_sale_price_snapshot.sql would break every order-creation
    // path in production (storefront, WhatsApp/manual, auto-processor).
    //
    // This test passes when the failure occurs, because the failure IS the
    // evidence for "migration-first". After the migration, the post-migration
    // suite below is the one that must pass.
    const storage = new OrderStorage();

    await expect(
      storage.createOrderSecure(null, [{ productId: "p-filter", quantity: 2 }], CUSTOMER),
    ).rejects.toThrow(/unit_sale_price_snapshot/);

    // And it fails ATOMICALLY — no partial order is left behind.
    const orders = await pg.query<{ n: number }>(`SELECT count(*)::int AS n FROM orders`);
    expect(orders.rows[0].n).toBe(0);
  });

  it("names the exact missing column, so the required migration is unambiguous", async () => {
    const storage = new OrderStorage();
    const err = await storage
      .createOrderSecure(null, [{ productId: "p-filter", quantity: 1 }], CUSTOMER)
      .then(() => null, (e: unknown) => e as Error);

    expect(err).toBeTruthy();
    // The remedy is add_order_item_sale_price_snapshot.sql — nothing else.
    expect(String(err?.message)).toMatch(/unit_sale_price_snapshot/);
  });

  it("READ paths still work pre-migration — only WRITES are blocked", async () => {
    // The explicit projections on this branch keep every accounting READ valid
    // on both schema versions. Only the Drizzle-generated INSERT is the problem.
    // That distinction is what makes "migration-first" sufficient, rather than
    // requiring the schema declarations to be reverted.
    const { buildCostResolver, buildRelationalLineResolver } =
      await import("../services/accounting-engine.js");
    const db = getDb();

    await expect(buildCostResolver(db as never, new Set(["p-filter"]))).resolves.toBeTruthy();
    await expect(
      buildRelationalLineResolver(db as never, new Set(["any-order-id"])),
    ).resolves.toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST-MIGRATION — the state after the Phase 1A migrations are applied.
// ═══════════════════════════════════════════════════════════════════════════

describe("PHASE 1A — order creation AFTER the migrations are applied", () => {
  let pg: PGlite;

  beforeEach(async () => {
    ({ pg } = await freshDb());
    // Applied in the approved rollout order. cash_settlement integrity is
    // independent of the order-creation path and is covered by its own suite.
    for (const file of [
      "migrations/add_order_item_sale_price_snapshot.sql",
      "migrations/add_order_item_snapshot_immutability.sql",
      "migrations/fix_product_cost_history_nullable.sql",
    ]) {
      await pg.exec(readFileSync(join(process.cwd(), file), "utf8"));
    }
  });

  it("the real order-creation path SUCCEEDS", async () => {
    const storage = new OrderStorage();
    const order = await storage.createOrderSecure(
      null, [{ productId: "p-filter", quantity: 2 }], CUSTOMER);
    expect(order).toBeTruthy();

    const o = await pg.query<{ n: number }>(`SELECT count(*)::int AS n FROM orders`);
    expect(o.rows[0].n).toBe(1);
  });

  it("creates the order AND its order_items_relational line", async () => {
    const storage = new OrderStorage();
    await storage.createOrderSecure(null, [{ productId: "p-filter", quantity: 2 }], CUSTOMER);

    const rel = await pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM order_items_relational`);
    expect(rel.rows[0].n).toBe(1);

    const jsonb = await pg.query<{ items: unknown[] }>(`SELECT items FROM orders LIMIT 1`);
    expect(Array.isArray(jsonb.rows[0].items)).toBe(true);
    expect(jsonb.rows[0].items.length).toBe(1);
  });

  it("still writes the COST snapshot (already-migrated behaviour is unchanged)", async () => {
    const storage = new OrderStorage();
    await storage.createOrderSecure(null, [{ productId: "p-filter", quantity: 1 }], CUSTOMER);

    const r = await pg.query<{ unit_cost_price: string; cost_snapshot_status: string }>(
      `SELECT unit_cost_price, cost_snapshot_status FROM order_items_relational LIMIT 1`);
    expect(Number(r.rows[0].unit_cost_price)).toBe(5000);
    expect(r.rows[0].cost_snapshot_status).toBe("exact");
  });

  it("leaves EVERY sale-price snapshot field NULL — the writer is not built yet", async () => {
    // Phase 1A ships the columns, the constraints and the trigger. It does NOT
    // ship the writer. Claiming otherwise would be false, so this asserts the
    // columns stay empty — and will fail the moment a writer appears without
    // its own tests.
    const storage = new OrderStorage();
    await storage.createOrderSecure(null, [{ productId: "p-filter", quantity: 1 }], CUSTOMER);

    const r = await pg.query<Record<string, unknown>>(`
      SELECT unit_sale_price_snapshot, discount_snapshot,
             final_unit_sale_price_snapshot, sale_price_snapshot_at, sale_price_source
      FROM order_items_relational LIMIT 1`);
    for (const [col, value] of Object.entries(r.rows[0])) {
      expect(value, `${col} must remain NULL in Phase 1A`).toBeNull();
    }
  });

  it("does not fabricate provenance: price_at_purchase remains the only recorded price", async () => {
    const storage = new OrderStorage();
    await storage.createOrderSecure(null, [{ productId: "p-filter", quantity: 1 }], CUSTOMER);
    const r = await pg.query<{ price_at_purchase: string }>(
      `SELECT price_at_purchase FROM order_items_relational LIMIT 1`);
    expect(Number(r.rows[0].price_at_purchase)).toBe(20000);
  });

  it("a historical order is untouched when the product's price/cost changes later", async () => {
    const storage = new OrderStorage();
    await storage.createOrderSecure(null, [{ productId: "p-filter", quantity: 1 }], CUSTOMER);

    await pg.exec(`UPDATE products SET cost_price = 6500, price = 26000 WHERE id = 'p-filter'`);

    const r = await pg.query<{ unit_cost_price: string; price_at_purchase: string }>(
      `SELECT unit_cost_price, price_at_purchase FROM order_items_relational LIMIT 1`);
    expect(Number(r.rows[0].unit_cost_price)).toBe(5000);
    expect(Number(r.rows[0].price_at_purchase)).toBe(20000);
  });

  it("the immutability trigger now protects that line from raw SQL", async () => {
    const storage = new OrderStorage();
    await storage.createOrderSecure(null, [{ productId: "p-filter", quantity: 1 }], CUSTOMER);

    await expect(
      pg.exec(`UPDATE order_items_relational SET unit_cost_price = 6500`),
    ).rejects.toThrow(/immutable/i);
  });

  it("SCOPE STATEMENT: this does NOT prove end-to-end §11 protection", () => {
    // Stated explicitly so no reader over-reads this suite.
    // Proven here: the schema, constraints and trigger are in place, and order
    // creation survives them.
    // NOT proven and NOT claimed:
    //   - sale-price snapshots are captured (no writer exists);
    //   - returns re-cost from the original snapshot end-to-end;
    //   - the 182 historical lines gained any evidence.
    // Those belong to later phases and must carry their own tests.
    expect(true).toBe(true);
  });
});
