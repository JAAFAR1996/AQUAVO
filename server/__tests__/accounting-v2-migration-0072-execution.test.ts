import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = process.cwd();
const migration = readFileSync(
  join(root, "migrations/0072_accounting_require_explicit_shipped_carrier.sql"),
  "utf8",
);

const BASE = String.raw`
CREATE TABLE schema_migrations(
  version text PRIMARY KEY,
  checksum text NOT NULL,
  notes text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_at timestamptz
);

CREATE TABLE delivery_companies(
  id text PRIMARY KEY,
  company_key text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  default_fee numeric NOT NULL DEFAULT 5000,
  active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false
);

CREATE TABLE orders(
  id text PRIMARY KEY,
  status text NOT NULL,
  carrier text,
  carrier_fee numeric
);

INSERT INTO delivery_companies(id,company_key,name,default_fee,active,is_default) VALUES
  ('company-waseet','alwaseet','الوسيط',5000,true,true),
  ('company-tayir','tayir','الطائر المميز للنقل',6000,true,false),
  ('company-inactive','inactive','شركة متوقفة',7000,false,false);

-- These rows represent pre-0072 orders, including legacy rows without carrier.
INSERT INTO orders(id,status,carrier,carrier_fee) VALUES
  ('order-missing','processing',NULL,NULL),
  ('order-inactive','processing','شركة متوقفة',7000),
  ('order-waseet','processing','الوسيط',NULL),
  ('order-tayir','processing','الطائر المميز للنقل',NULL);
`;

describe("0072 explicit shipped carrier execution (PGlite PostgreSQL)", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE);
    await db.exec(migration);
  }, 60_000);

  it("rejects entering shipped without a carrier instead of applying the default", async () => {
    await expect(db.exec(`UPDATE orders SET status='shipped' WHERE id='order-missing'`))
      .rejects.toThrow(/DELIVERY_COMPANY_REQUIRED_FOR_SHIPPED/);

    const result = await db.query<{ status: string; carrier: string | null }>(
      `SELECT status,carrier FROM orders WHERE id='order-missing'`,
    );
    expect(result.rows[0]).toEqual({ status: "processing", carrier: null });
  });

  it("rejects an inactive or unknown carrier on the shipped transition", async () => {
    await expect(db.exec(`UPDATE orders SET status='shipped' WHERE id='order-inactive'`))
      .rejects.toThrow(/DELIVERY_COMPANY_INACTIVE_OR_UNKNOWN/);
  });

  it("accepts Al-Waseet explicitly and refreshes carrier_fee from delivery_companies", async () => {
    await db.exec(`UPDATE orders SET status='shipped' WHERE id='order-waseet'`);
    const result = await db.query<{ status: string; carrier: string; carrier_fee: string }>(
      `SELECT status,carrier,carrier_fee::text FROM orders WHERE id='order-waseet'`,
    );
    expect(result.rows[0].status).toBe("shipped");
    expect(result.rows[0].carrier).toBe("الوسيط");
    expect(Number(result.rows[0].carrier_fee)).toBe(5000);
  });

  it("accepts Al-Tayir explicitly and uses its current default fee", async () => {
    await db.exec(`UPDATE orders SET status='shipped' WHERE id='order-tayir'`);
    const result = await db.query<{ status: string; carrier: string; carrier_fee: string }>(
      `SELECT status,carrier,carrier_fee::text FROM orders WHERE id='order-tayir'`,
    );
    expect(result.rows[0].status).toBe("shipped");
    expect(result.rows[0].carrier).toBe("الطائر المميز للنقل");
    expect(Number(result.rows[0].carrier_fee)).toBe(6000);
  });
});
