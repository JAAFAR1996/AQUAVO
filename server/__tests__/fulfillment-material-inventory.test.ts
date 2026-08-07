import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import { cartonCatalogDdl } from "./helpers/packing-migrations.js";
import {
  confirmFulfillment,
  reverseFulfillmentEvent,
} from "../services/fulfillment-service.js";
import {
  confirmDraft,
  getDraft,
} from "../services/fulfillment-draft-service.js";
import {
  setPreparationMaterialTracking,
  stocktakePreparationMaterial,
} from "../services/preparation-inventory-service.js";

const ROOT = process.cwd();
const migration = (name: string) => readFileSync(join(ROOT, "migrations", name), "utf8");

let client: PGlite;
let db: ReturnType<typeof drizzle>;

async function balance(materialId: string): Promise<number> {
  const result = await client.query<{ balance: string }>(
    `SELECT COALESCE(SUM(quantity),0)::text AS balance FROM packaging_inventory_movements WHERE material_id=$1`,
    [materialId],
  );
  return Number(result.rows[0]?.balance ?? 0);
}

async function movementCount(materialId: string, type = "fulfillment_usage"): Promise<number> {
  const result = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM packaging_inventory_movements WHERE material_id=$1 AND movement_type=$2`,
    [materialId, type],
  );
  return result.rows[0]?.count ?? 0;
}

async function addMaterial(id: string, name: string, tracked: boolean): Promise<void> {
  await client.query(
    `INSERT INTO fulfillment_materials
      (id,name,category,unit,current_unit_cost,currency,active,stock_tracked,material_kind,calculation_basis)
     VALUES ($1,$2,'packaging','piece',NULL,'IQD',true,$3,'consumable','per_order')`,
    [id, name, tracked],
  );
}

async function addOrder(id: string, status = "processing"): Promise<void> {
  await client.query(
    `INSERT INTO orders (id,order_number,status,total,rounded_total,shipping_cost,items,customer_name,customer_phone)
     VALUES ($1,$2,$3,'10000','10000','0','[]'::jsonb,'test','07700000000')`,
    [id, `T-${id}`, status],
  );
}

async function seedStock(materialId: string, quantity: number, key: string): Promise<void> {
  await client.query(
    `INSERT INTO packaging_inventory_movements
      (id,material_id,movement_type,quantity,idempotency_key,source_document)
     VALUES (gen_random_uuid()::text,$1,'purchase_receipt',$2,$3,'test seed')`,
    [materialId, quantity, key],
  );
}

beforeAll(async () => {
  client = new PGlite();
  await client.exec(`
    CREATE TABLE orders (
      id text PRIMARY KEY, order_number text, user_id text, status text DEFAULT 'processing',
      payment_status text DEFAULT 'paid', total numeric DEFAULT '0', rounded_total numeric,
      shipping_cost numeric DEFAULT '0', coupon_id text, discount_total numeric DEFAULT '0',
      points_used integer DEFAULT 0, cashback_used numeric DEFAULT '0',
      points_discount numeric DEFAULT '0', points_earned integer DEFAULT 0,
      rounding_cashback numeric DEFAULT '0', items jsonb, shipping_address jsonb,
      customer_name text, customer_email text, customer_phone text,
      bonus_prize text, bonus_claimed_at timestamptz, carrier text,
      cod_received boolean DEFAULT false, box_cost numeric DEFAULT '0',
      source text DEFAULT 'website', financially_counted boolean DEFAULT true,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE products (
      id text PRIMARY KEY, slug text, name text NOT NULL, brand text, category text,
      category_id text, subcategory text, description text, price numeric DEFAULT '0',
      original_price numeric, currency text DEFAULT 'IQD', images jsonb, thumbnail text,
      rating numeric DEFAULT '0', review_count integer DEFAULT 0, stock integer DEFAULT 0,
      low_stock_threshold integer, is_new boolean DEFAULT false, is_best_seller boolean DEFAULT false,
      is_product_of_week boolean DEFAULT false, specifications jsonb, variants jsonb,
      has_variants boolean DEFAULT false, cost_price numeric, packaging_cost numeric,
      insert_cost numeric, cost_price_resolution text, packaging_cost_resolution text,
      insert_cost_resolution text, cost_resolution_note text, cost_resolution_by text,
      cost_resolution_at timestamptz, created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE order_items_relational (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, order_id text NOT NULL,
      product_id text NOT NULL, quantity integer NOT NULL,
      price_at_purchase numeric NOT NULL, total_price numeric NOT NULL,
      unit_cost_price numeric, unit_packaging_cost numeric, unit_insert_cost numeric,
      cost_snapshot_status text, cost_snapshot_source text, cost_snapshot_confidence text,
      cost_snapshot_version integer, cost_snapshot_at timestamptz, metadata jsonb
    );
    CREATE TABLE product_cost_history (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, product_id text,
      cost_price numeric, packaging_cost numeric, insert_cost numeric,
      effective_from timestamptz DEFAULT now(), note text, changed_by text,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE accounting_manual_adjustments (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text, entity_type text, entity_id text,
      field_name text, old_value_json jsonb, new_value_json jsonb, reason text,
      status text DEFAULT 'approved', created_by text, approved_by text,
      created_at timestamptz DEFAULT now(), approved_at timestamptz,
      applied_at timestamptz, note text
    );
    CREATE TABLE accounting_audit_trail (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      entity_type text NOT NULL, entity_id text NOT NULL, action text NOT NULL,
      field_name text, old_value_json jsonb, new_value_json jsonb, reason text,
      performed_by text, performed_by_name text,
      performed_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await client.exec(migration("add_fulfillment_costing.sql"));
  await client.exec(migration("add_fulfillment_hardening.sql"));
  await client.exec(migration("add_pim_line_identity.sql"));
  await client.exec(cartonCatalogDdl());
  db = drizzle(client, { schema });
});

describe("fulfillment material inventory", () => {
  it("untracked material with zero ledger never blocks a draft, but its cost remains", async () => {
    await addMaterial("mat-untracked", "ستكر غير متتبع", false);
    await addOrder("ord-untracked");
    await client.exec(`
      INSERT INTO fulfillment_preparation_drafts (id,order_id,event_type,state)
      VALUES ('draft-untracked','ord-untracked','original','editing');
      INSERT INTO fulfillment_preparation_draft_lines
        (id,draft_id,material_id,material_name,quantity,unit,unit_cost,cost_status,source)
      VALUES ('draft-line-untracked','draft-untracked','mat-untracked','ستكر غير متتبع','1','piece','50','exact','catalog');
    `);

    const draft = await getDraft(db, "draft-untracked");
    expect(draft.stock.wouldGoNegative).toBe(false);
    expect(draft.stock.shortages).toEqual([]);
    expect(draft.expectedCost).toBe(50);

    const confirmed = await confirmDraft(db, { draftId: "draft-untracked", recordedBy: "owner" });
    expect(confirmed.actualCost).toBe(50);
    expect(await movementCount("mat-untracked")).toBe(0);
    const line = await client.query<{ total_cost: string }>(
      `SELECT total_cost::text FROM order_fulfillment_lines WHERE event_id=$1`, [confirmed.eventId]);
    expect(Number(line.rows[0]?.total_cost)).toBe(50);
  });

  it("tracked stock 10, required 1 confirms and leaves 9", async () => {
    await addMaterial("mat-ten", "كارت متتبع", true);
    await addOrder("ord-ten");
    await seedStock("mat-ten", 10, "seed-ten");

    const result = await confirmFulfillment(db, {
      orderId: "ord-ten", requestId: "confirm-ten", eventType: "original",
      lines: [{ materialId: "mat-ten", materialName: "كارت متتبع", quantity: 1, unitCost: 100 }],
    });
    expect(result.actualCost).toBe(100);
    expect(await balance("mat-ten")).toBe(9);
    expect(await movementCount("mat-ten")).toBe(1);
  });

  it("tracked stock 0, required 1 is rejected by the backend", async () => {
    await addMaterial("mat-zero", "ستكر نفد", true);
    await addOrder("ord-zero");
    await expect(confirmFulfillment(db, {
      orderId: "ord-zero", requestId: "confirm-zero", eventType: "original",
      lines: [{ materialId: "mat-zero", materialName: "ستكر نفد", quantity: 1, unitCost: 50 }],
    })).rejects.toThrow(/INSUFFICIENT_STOCK.*المطلوب 1.*المتوفر 0/);
    expect(await movementCount("mat-zero")).toBe(0);
    const events = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM order_fulfillment_events WHERE order_id='ord-zero'`);
    expect(events.rows[0]?.count).toBe(0);
  });

  it("replaying the same confirm request never deducts twice", async () => {
    await addMaterial("mat-repeat", "مادة إعادة", true);
    await addOrder("ord-repeat");
    await seedStock("mat-repeat", 10, "seed-repeat");
    const input = {
      orderId: "ord-repeat", requestId: "same-request", eventType: "original" as const,
      lines: [{ materialId: "mat-repeat", materialName: "مادة إعادة", quantity: 1, unitCost: 75 }],
    };
    const first = await confirmFulfillment(db, input);
    const second = await confirmFulfillment(db, input);
    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.eventId).toBe(first.eventId);
    expect(await balance("mat-repeat")).toBe(9);
    expect(await movementCount("mat-repeat")).toBe(1);
  });

  it("stocktake from 100 to 80 appends -20 instead of overwriting", async () => {
    await addMaterial("mat-stocktake-down", "جرد ناقص", true);
    await seedStock("mat-stocktake-down", 100, "seed-stocktake-down");
    const result = await stocktakePreparationMaterial(db, {
      materialId: "mat-stocktake-down", targetQuantity: 80,
      reason: "عد فعلي", idempotencyKey: "stocktake-down", actor: { id: "owner" },
    });
    expect(result.adjustment).toBe(-20);
    expect(result.balance).toBe(80);
    expect(await balance("mat-stocktake-down")).toBe(80);
    const movement = await client.query<{ quantity: string; movement_type: string }>(
      `SELECT quantity::text,movement_type FROM packaging_inventory_movements WHERE id=$1`, [result.movementId]);
    expect(Number(movement.rows[0]?.quantity)).toBe(-20);
    expect(movement.rows[0]?.movement_type).toBe("correction");
  });

  it("stocktake from 80 to 120 appends +40", async () => {
    await addMaterial("mat-stocktake-up", "جرد زائد", true);
    await seedStock("mat-stocktake-up", 80, "seed-stocktake-up");
    const result = await stocktakePreparationMaterial(db, {
      materialId: "mat-stocktake-up", targetQuantity: 120,
      reason: "عد فعلي", idempotencyKey: "stocktake-up", actor: { id: "owner" },
    });
    expect(result.adjustment).toBe(40);
    expect(await balance("mat-stocktake-up")).toBe(120);
  });

  it("enabling tracking requires and records the physical opening quantity", async () => {
    await addMaterial("mat-enable", "تفعيل جرد", false);
    const enabled = await setPreparationMaterialTracking(db, {
      materialId: "mat-enable", enabled: true, currentQuantity: 500,
      lowStockThreshold: 50, reason: "جرد افتتاحي", idempotencyKey: "enable-500",
      actor: { id: "owner", name: "المالك" },
    });
    expect(enabled.stockTracked).toBe(true);
    expect(enabled.adjustment).toBe(500);
    expect(enabled.balance).toBe(500);
    const material = await client.query<{ stock_tracked: boolean; low_stock_threshold: string }>(
      `SELECT stock_tracked,low_stock_threshold::text FROM fulfillment_materials WHERE id='mat-enable'`);
    expect(material.rows[0]?.stock_tracked).toBe(true);
    expect(Number(material.rows[0]?.low_stock_threshold)).toBe(50);
    expect(await balance("mat-enable")).toBe(500);
  });

  it("inventory quantity never duplicates the fulfillment cost snapshot", async () => {
    await addMaterial("mat-cost", "مادة كلفة", true);
    await addOrder("ord-cost");
    await seedStock("mat-cost", 5, "seed-cost");
    const result = await confirmFulfillment(db, {
      orderId: "ord-cost", requestId: "cost-once", eventType: "original",
      lines: [{ materialId: "mat-cost", materialName: "مادة كلفة", quantity: 2, unitCost: 75 }],
    });
    expect(result.actualCost).toBe(150);
    const event = await client.query<{ actual_cost: string }>(
      `SELECT actual_cost::text FROM order_fulfillment_events WHERE id=$1`, [result.eventId]);
    expect(Number(event.rows[0]?.actual_cost)).toBe(150);
    expect(await balance("mat-cost")).toBe(3);
    const usage = await client.query<{ quantity: string }>(
      `SELECT quantity::text FROM packaging_inventory_movements WHERE event_id=$1`, [result.eventId]);
    expect(Number(usage.rows[0]?.quantity)).toBe(-2);
  });

  it("pre-shipment reversal restores tracked stock, but shipped orders cannot be restocked by fulfillment reversal", async () => {
    await addMaterial("mat-reverse", "عكس", true);
    await seedStock("mat-reverse", 4, "seed-reverse");
    await addOrder("ord-reverse-pre");
    const pre = await confirmFulfillment(db, {
      orderId: "ord-reverse-pre", requestId: "pre-use", eventType: "original",
      lines: [{ materialId: "mat-reverse", materialName: "عكس", quantity: 1, unitCost: 100 }],
    });
    expect(await balance("mat-reverse")).toBe(3);
    const reversed = await reverseFulfillmentEvent(db, pre.eventId, "إلغاء التجهيز قبل الشحن", "owner");
    expect(reversed.reversedMovements).toBe(1);
    expect(await balance("mat-reverse")).toBe(4);

    await addOrder("ord-reverse-shipped");
    const shipped = await confirmFulfillment(db, {
      orderId: "ord-reverse-shipped", requestId: "will-ship", eventType: "original",
      lines: [{ materialId: "mat-reverse", materialName: "عكس", quantity: 1, unitCost: 100 }],
    });
    expect(await balance("mat-reverse")).toBe(3);
    await client.exec(`UPDATE orders SET status='shipped' WHERE id='ord-reverse-shipped'`);
    await expect(reverseFulfillmentEvent(db, shipped.eventId, "مرتجع بعد الشحن", "owner"))
      .rejects.toThrow(/REVERSAL_INVALID_AFTER_SHIPMENT/);
    expect(await balance("mat-reverse")).toBe(3);
  });
});
