import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "migrations/20260825_payment_modernization.sql"), "utf8");

async function dbWithInventory(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE products(id text PRIMARY KEY);
    CREATE TABLE orders(id text PRIMARY KEY);
    CREATE TABLE inventory_movements(
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      product_id text NOT NULL,
      variant_id text,
      location_id text NOT NULL,
      quantity_delta integer NOT NULL,
      movement_type text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE schema_migrations(
      version text PRIMARY KEY,
      checksum text,
      notes text,
      applied_at timestamptz DEFAULT now(),
      rolled_back_at timestamptz
    );
    INSERT INTO products VALUES ('p1');
    INSERT INTO orders VALUES ('online'), ('cod');
    INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,metadata)
    VALUES ('p1',NULL,'main',5,'opening','{}');
  `);
  await db.exec(migration);
  return db;
}

describe("20260825 payment modernization migration", () => {
  it("blocks another order from consuming unexpired reserved stock", async () => {
    const db = await dbWithInventory();
    await db.exec(`
      INSERT INTO payment_stock_reservations(order_id,product_id,quantity,status,expires_at)
      VALUES ('online','p1',2,'active',now()+interval '15 minutes');
    `);
    await expect(db.exec(`
      INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,metadata)
      VALUES ('p1',NULL,'main',-4,'sale','{"order_id":"cod"}');
    `)).rejects.toThrow(/active payment reservations/);
  });

  it("allows selling only the stock that remains after another reservation", async () => {
    const db = await dbWithInventory();
    await db.exec(`
      INSERT INTO payment_stock_reservations(order_id,product_id,quantity,status,expires_at)
      VALUES ('online','p1',2,'active',now()+interval '15 minutes');
      INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,metadata)
      VALUES ('p1',NULL,'main',-3,'sale','{"order_id":"cod"}');
    `);
    const result = await db.query<{ qty: string }>(`SELECT SUM(quantity_delta)::text qty FROM inventory_movements`);
    expect(Number(result.rows[0]!.qty)).toBe(2);
  });

  it("ignores expired reservations and lets the owning order consume its reservation", async () => {
    const db = await dbWithInventory();
    await db.exec(`
      INSERT INTO payment_stock_reservations(order_id,product_id,quantity,status,expires_at)
      VALUES ('online','p1',2,'active',now()-interval '1 second');
      INSERT INTO inventory_movements(product_id,variant_id,location_id,quantity_delta,movement_type,metadata)
      VALUES ('p1',NULL,'main',-5,'sale','{"order_id":"online"}');
    `);
    const result = await db.query<{ qty: string }>(`SELECT SUM(quantity_delta)::text qty FROM inventory_movements`);
    expect(Number(result.rows[0]!.qty)).toBe(0);
  });

  it("enforces one durable outbox event per event_key", async () => {
    const db = await dbWithInventory();
    await db.exec(`
      INSERT INTO payment_outbox(event_key,order_id,event_type) VALUES ('online:analytics','online','analytics');
      INSERT INTO payment_outbox(event_key,order_id,event_type) VALUES ('online:analytics','online','analytics') ON CONFLICT(event_key) DO NOTHING;
    `);
    const result = await db.query<{ count: string }>(`SELECT COUNT(*)::text count FROM payment_outbox`);
    expect(Number(result.rows[0]!.count)).toBe(1);
  });
});
