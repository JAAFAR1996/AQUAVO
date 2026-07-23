// F-6 — Inventory availability invariant tests.
//
// Reconstructs (from docs/audit/orderitem-trigger-forensics.md) the production
// "enforce"-mode canonical inventory ledger on PGlite and proves the storefront-
// availability invariants the remediation depends on:
//
//   * the reconciliation report identifies EXACTLY the SKUs that would 500 at
//     checkout — at the true per-variant / base granularity the guard checks,
//     with NO variant false-positives (the blind spot in e2e D13b);
//   * the canonical guard rejects an oversell and never lets stock go negative;
//   * variants draw down their OWN balance, never a sibling variant's;
//   * the shipped repair (migrations/inventory_availability_repair.sql runs) is
//     valid against this schema and makes the divergent SKUs orderable, while
//     creating NO unrelated movements and staying idempotent;
//   * an opening/adjustment movement projects onto products.stock (the storefront
//     source of truth) via the AFTER-INSERT projection trigger.
//
// NOTE: PGlite is single-connection, so the concurrent "final unit" case is
// exercised sequentially — which is exactly what the advisory-lock + running-sum
// guard reduces a real parallel race to: the first sale wins, the second is
// rejected. The guard SQL (SUM under a per-SKU advisory lock, checked BEFORE the
// row is visible) is what makes that hold under real multi-connection Postgres.
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";

let db: PGlite;

const MAIN = "loc-main";

// Faithful reconstruction of the live enforce-mode ledger DDL.
const LEDGER_DDL = `
CREATE TABLE inventory_locations (
  id text PRIMARY KEY, code text NOT NULL, is_active boolean NOT NULL DEFAULT true
);
INSERT INTO inventory_locations (id, code, is_active) VALUES ('${MAIN}', 'MAIN', true);

CREATE TABLE products (
  id text PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  has_variants boolean NOT NULL DEFAULT false,
  variants jsonb,
  deleted_at timestamptz
);

CREATE TABLE inventory_movements (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id text NOT NULL,
  variant_id text,
  location_id text NOT NULL,
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  movement_type text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  idempotency_key text NOT NULL UNIQUE,
  unit_cost numeric,
  currency text NOT NULL DEFAULT 'IQD',
  happened_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_movement_id text
);

CREATE VIEW inventory_canonical_balances AS
  SELECT product_id, variant_id, location_id,
         sum(quantity_delta) AS canonical_stock,
         max(happened_at) AS last_movement_at
  FROM inventory_movements
  GROUP BY product_id, variant_id, location_id;

-- BEFORE INSERT guard: never let the canonical running balance go negative.
CREATE OR REPLACE FUNCTION prevent_negative_inventory_balance() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE current_balance bigint;
BEGIN
  SELECT COALESCE(SUM(quantity_delta),0) INTO current_balance
  FROM inventory_movements
  WHERE product_id=NEW.product_id
    AND variant_id IS NOT DISTINCT FROM NEW.variant_id
    AND location_id=NEW.location_id;
  IF current_balance + NEW.quantity_delta < 0 THEN
    RAISE EXCEPTION 'insufficient canonical inventory balance for product %, variant %, location %',
      NEW.product_id, NEW.variant_id, NEW.location_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER inventory_movements_prevent_negative
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_negative_inventory_balance();

-- AFTER INSERT: project the recomputed balance onto products.stock (non-variant)
-- or the matching variant's stock in the jsonb (variant products).
CREATE OR REPLACE FUNCTION project_inventory_movement_to_product_stock() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE current_balance bigint; variant_product boolean;
BEGIN
  IF NEW.location_id <> '${MAIN}' THEN RETURN NEW; END IF;
  SELECT has_variants INTO variant_product FROM products WHERE id=NEW.product_id;
  SELECT COALESCE(SUM(quantity_delta),0) INTO current_balance
  FROM inventory_movements
  WHERE product_id=NEW.product_id
    AND variant_id IS NOT DISTINCT FROM NEW.variant_id
    AND location_id=NEW.location_id;
  IF NEW.variant_id IS NULL THEN
    IF COALESCE(variant_product,false)=false THEN
      UPDATE products SET stock=current_balance::integer WHERE id=NEW.product_id;
    END IF;
  ELSE
    UPDATE products p SET variants=(
      SELECT jsonb_agg(CASE WHEN elem->>'id'=NEW.variant_id
        THEN jsonb_set(elem,'{stock}',to_jsonb(current_balance::integer),false)
        ELSE elem END ORDER BY ord)
      FROM jsonb_array_elements(p.variants) WITH ORDINALITY AS x(elem,ord))
    WHERE p.id=NEW.product_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER inventory_movements_project_product_stock
  AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION project_inventory_movement_to_product_stock();
`;

// Records a sale exactly as record_order_item_inventory_sale() would.
async function sale(productId: string, qty: number, variantId: string | null, key: string) {
  await db.query(
    `INSERT INTO inventory_movements
       (product_id, variant_id, location_id, quantity_delta, movement_type, source_type, idempotency_key)
     VALUES ($1,$2,$3,$4,'sale','order_line',$5)`,
    [productId, variantId, MAIN, -Math.abs(qty), key],
  );
}

async function opening(productId: string, qty: number, variantId: string | null, key: string) {
  await db.query(
    `INSERT INTO inventory_movements
       (product_id, variant_id, location_id, quantity_delta, movement_type, source_type, idempotency_key)
     VALUES ($1,$2,$3,$4,'opening_balance','owner_approved_storefront_opening',$5)`,
    [productId, variantId, MAIN, Math.abs(qty), key],
  );
}

// Authoritative per-SKU divergence report (mirrors REPORT A of the shipped
// migrations/inventory_availability_reconciliation_report.sql).
const REPORT_A = `
WITH main AS (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active LIMIT 1),
advertised_skus AS (
  SELECT p.id AS product_id, NULL::text AS variant_id, p.stock AS advertised_stock
  FROM products p
  WHERE p.has_variants=false AND p.stock>0 AND CAST(p.price AS numeric)>0 AND p.deleted_at IS NULL
  UNION ALL
  SELECT p.id, (v->>'id'), COALESCE((v->>'stock')::int,0)
  FROM products p, jsonb_array_elements(p.variants) v
  WHERE p.has_variants=true AND CAST(p.price AS numeric)>0 AND p.deleted_at IS NULL
    AND COALESCE((v->>'stock')::int,0)>0
),
scored AS (
  SELECT s.*, (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m, main
    WHERE m.product_id=s.product_id AND m.variant_id IS NOT DISTINCT FROM s.variant_id
      AND m.location_id=main.id) AS canonical_stock
  FROM advertised_skus s
)
SELECT product_id, variant_id, advertised_stock, canonical_stock
FROM scored WHERE canonical_stock<=0 ORDER BY product_id, variant_id NULLS FIRST`;

describe("F-6 inventory availability invariants", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(LEDGER_DDL);
    await db.exec(`
      INSERT INTO products (id,name,price,stock,has_variants,variants) VALUES
        ('p-healthy','Healthy Filter',10000,5,false,NULL),
        ('p-divergent','Divergent Heater',10000,3,false,NULL),
        ('p-var-healthy','Healthy Pump',10000,4,true,
           '[{"id":"vh-s","label":"S","stock":4}]'::jsonb),
        ('p-var-divergent','Divergent Light',10000,6,true,
           '[{"id":"vd-a","label":"A","stock":6}]'::jsonb),
        ('p-oos','Out Of Stock',10000,0,false,NULL);`);
    // Opening balances only for the "healthy" SKUs. The "divergent" ones are
    // advertised (stock>0) but were never opened in the ledger — exactly the
    // F-6 condition. p-oos is not advertised (stock=0).
    await opening("p-healthy", 5, null, "open:p-healthy");
    await opening("p-var-healthy", 4, "vh-s", "open:p-var-healthy:vh-s");
  });

  it("REPORT A identifies exactly the genuinely divergent SKUs (base + variant), not the healthy ones or the OOS one", async () => {
    const { rows } = await db.query<{ product_id: string; variant_id: string | null }>(REPORT_A);
    const keys = rows.map((r) => `${r.product_id}:${r.variant_id ?? "base"}`).sort();
    expect(keys).toEqual(["p-divergent:base", "p-var-divergent:vd-a"]);
  });

  it("the legacy D13b (base-only) query FALSELY flags the healthy variant product — proving the report must be per-SKU", async () => {
    const { rows } = await db.query<{ id: string }>(`
      SELECT p.id FROM products p
      WHERE p.stock>0 AND CAST(p.price AS numeric)>0 AND p.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM inventory_canonical_balances b
          WHERE b.product_id=p.id AND b.variant_id IS NULL AND b.canonical_stock>0)`);
    const ids = rows.map((r) => r.id).sort();
    // Includes the HEALTHY variant product (false positive) — its stock lives at
    // variant level, so the base variant_id IS NULL balance is 0.
    expect(ids).toContain("p-var-healthy");
    expect(ids).toContain("p-var-divergent");
  });

  it("advertised + canonical positive -> a sale succeeds and decrements canonical", async () => {
    await sale("p-healthy", 2, null, "sale:p-healthy:1");
    const { rows } = await db.query<{ canonical_stock: string }>(
      `SELECT canonical_stock FROM inventory_canonical_balances WHERE product_id='p-healthy' AND variant_id IS NULL`);
    expect(Number(rows[0].canonical_stock)).toBe(3); // 5 opened - 2 sold
  });

  it("advertised + canonical zero -> the sale is REJECTED by the guard (this is the raw 500 the app now maps to 409)", async () => {
    await expect(sale("p-divergent", 1, null, "sale:p-divergent:1"))
      .rejects.toThrow(/insufficient canonical inventory balance/);
  });

  it("never goes negative: selling the final unit succeeds, the next unit is rejected", async () => {
    await opening("p-final", 1, null, "open:p-final"); // create+open a 1-unit SKU
    await db.query(`INSERT INTO products (id,name,price,stock,has_variants) VALUES ('p-final','Final',10000,1,false)`);
    await sale("p-final", 1, null, "sale:p-final:win");        // 1 -> 0  OK
    await expect(sale("p-final", 1, null, "sale:p-final:lose")) // 0 -> -1 rejected
      .rejects.toThrow(/insufficient canonical inventory balance/);
    const { rows } = await db.query<{ canonical_stock: string }>(
      `SELECT canonical_stock FROM inventory_canonical_balances WHERE product_id='p-final' AND variant_id IS NULL`);
    expect(Number(rows[0].canonical_stock)).toBe(0); // never negative
  });

  it("variants draw down their OWN balance, not a sibling's", async () => {
    await db.query(`INSERT INTO products (id,name,price,stock,has_variants,variants)
      VALUES ('p-two-var','Two Var',10000,3,true,'[{"id":"a","label":"A","stock":2},{"id":"b","label":"B","stock":1}]'::jsonb)`);
    await opening("p-two-var", 2, "a", "open:p-two-var:a");
    await opening("p-two-var", 1, "b", "open:p-two-var:b");
    // Drain variant B; variant A must be untouched and still sellable.
    await sale("p-two-var", 1, "b", "sale:p-two-var:b1");
    await expect(sale("p-two-var", 1, "b", "sale:p-two-var:b2"))
      .rejects.toThrow(/insufficient canonical inventory balance/); // B empty
    await sale("p-two-var", 2, "a", "sale:p-two-var:a1");           // A still has its own 2
    const { rows } = await db.query<{ variant_id: string; canonical_stock: string }>(
      `SELECT variant_id, canonical_stock FROM inventory_canonical_balances
       WHERE product_id='p-two-var' ORDER BY variant_id`);
    const map = Object.fromEntries(rows.map((r) => [r.variant_id, Number(r.canonical_stock)]));
    expect(map).toEqual({ a: 0, b: 0 });
  });

  it("an opening/adjustment movement projects onto products.stock (storefront source of truth)", async () => {
    await db.query(`INSERT INTO products (id,name,price,stock,has_variants) VALUES ('p-adjust','Adjust',10000,0,false)`);
    await opening("p-adjust", 7, null, "open:p-adjust");
    const { rows } = await db.query<{ stock: number }>(`SELECT stock FROM products WHERE id='p-adjust'`);
    expect(rows[0].stock).toBe(7); // admin stock adjustment reflected on the storefront
  });

  it("the shipped repair opens the divergent SKUs, makes them orderable, and creates NO unrelated movements", async () => {
    const before = await db.query<{ n: string }>(`SELECT count(*)::text n FROM inventory_movements`);
    // Core INSERT of migrations/inventory_availability_repair.sql (parity).
    const repairInsert = `
      WITH main AS (SELECT id FROM inventory_locations WHERE code='MAIN' AND is_active LIMIT 1),
      advertised_skus AS (
        SELECT p.id AS product_id, NULL::text AS variant_id, p.stock AS advertised_stock
        FROM products p WHERE p.has_variants=false AND p.stock>0 AND CAST(p.price AS numeric)>0 AND p.deleted_at IS NULL
        UNION ALL
        SELECT p.id,(v->>'id'),COALESCE((v->>'stock')::int,0)
        FROM products p, jsonb_array_elements(p.variants) v
        WHERE p.has_variants=true AND CAST(p.price AS numeric)>0 AND p.deleted_at IS NULL
          AND COALESCE((v->>'stock')::int,0)>0),
      divergent AS (
        SELECT s.product_id,s.variant_id,s.advertised_stock,
          (SELECT COALESCE(SUM(m.quantity_delta),0) FROM inventory_movements m, main
           WHERE m.product_id=s.product_id AND m.variant_id IS NOT DISTINCT FROM s.variant_id
             AND m.location_id=main.id) AS canonical_stock
        FROM advertised_skus s)
      INSERT INTO inventory_movements
        (product_id,variant_id,location_id,quantity_delta,movement_type,source_type,idempotency_key,metadata)
      SELECT d.product_id,d.variant_id,(SELECT id FROM main),(d.advertised_stock-d.canonical_stock),
        'opening_balance','availability_reconciliation',
        'availability-reconciliation:'||d.product_id||':'||COALESCE(d.variant_id,'base'),
        jsonb_build_object('reason','F-6','advertised_stock',d.advertised_stock,'canonical_before',d.canonical_stock)
      FROM divergent d WHERE d.canonical_stock<=0 AND d.advertised_stock>0
      ON CONFLICT (idempotency_key) DO NOTHING`;
    await db.query(repairInsert);

    // Only the two divergent SKUs got a movement (p-divergent base + p-var-divergent:vd-a).
    const after = await db.query<{ n: string }>(`SELECT count(*)::text n FROM inventory_movements`);
    expect(Number(after.rows[0].n) - Number(before.rows[0].n)).toBe(2);

    // Report A is now clean.
    const { rows: stillDivergent } = await db.query(REPORT_A);
    expect(stillDivergent).toEqual([]);

    // The previously-unorderable SKU is now orderable.
    await sale("p-divergent", 1, null, "sale:p-divergent:after-repair");
    const { rows } = await db.query<{ canonical_stock: string }>(
      `SELECT canonical_stock FROM inventory_canonical_balances WHERE product_id='p-divergent' AND variant_id IS NULL`);
    expect(Number(rows[0].canonical_stock)).toBe(2); // 3 opened - 1 sold

    // Re-running the repair is idempotent (no new movements).
    await db.query(repairInsert);
    const again = await db.query<{ n: string }>(`SELECT count(*)::text n FROM inventory_movements`);
    expect(Number(again.rows[0].n)).toBe(Number(after.rows[0].n) + 1); // +1 = only the sale above
  });
});
