import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("orders client IP schema contract", () => {
  it("ships a forward migration for the column used by order creation and admin transitions", () => {
    const migration = read("migrations/0067_orders_client_ip_schema_drift.sql");
    const orderRoute = read("server/routes/orders.ts");
    const adminRoute = read("server/routes/admin-orders-v2.ts");

    expect(migration).toContain("ADD COLUMN IF NOT EXISTS client_ip text");
    expect(migration).toContain("0067_orders_client_ip_schema_drift");
    expect(orderRoute).toContain("UPDATE orders SET client_ip");
    expect(adminRoute).toContain("SELECT id,order_number,status,user_id,client_ip,carrier,carrier_fee");
  });

  it("blocks rollback after IP evidence has been captured", () => {
    const rollback = read("migrations/0067_orders_client_ip_schema_drift_rollback.sql");
    expect(rollback).toContain("WHERE client_ip IS NOT NULL");
    expect(rollback).toContain("0067_ROLLBACK_BLOCKED");
    expect(rollback).toContain("DROP COLUMN IF EXISTS client_ip");
  });
});
