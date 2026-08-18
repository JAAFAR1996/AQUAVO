/**
 * AUTO ORDER PROCESSOR — quarantine guard.
 *
 * `AutoOrderProcessor.processScheduledOrders()` is legacy code that cannot
 * work: it inserts `priceAtTime` and `totalAmount`, neither of which is a
 * column (`price_at_purchase` / `total` are), omits the NOT NULL `total_price`,
 * writes no cost snapshot at all, and uses `db.insert` outside a transaction so
 * a partial failure would leave orphan rows.
 *
 * It was quarantined by an earlier fix. This file proves the quarantine is
 * still airtight, because "it's disabled" is a claim that decays silently.
 *
 * It is NOT a third production order path and must never be reported as one.
 * Active paths: storefront checkout, and manual/WhatsApp invoices.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const source = read("server/services/auto-order-processor.ts");

describe("auto order processor stays quarantined", () => {
  it("throws when invoked, rather than silently doing nothing", async () => {
    const { AutoOrderProcessor } = await import("../services/auto-order-processor.js");
    await expect(new AutoOrderProcessor().processScheduledOrders()).rejects.toThrow(/QUARANTINED/);
  });

  it("the quarantine is unconditional — no flag, env var or argument reopens it", () => {
    const body = source.slice(source.indexOf("async processScheduledOrders"));
    const upToThrow = body.slice(0, body.indexOf("QUARANTINED") + 40);
    // A conditional guard could be bypassed by config. The throw must be the
    // first thing the method does.
    expect(upToThrow).not.toMatch(/process\.env/);
    expect(upToThrow).not.toMatch(/featureFlag|isEnabled|allowAuto/i);
    expect(upToThrow).toMatch(/throw new Error/);
  });

  it("is not reachable from any route, scheduler, queue or cron", () => {
    // Wiring it anywhere would let broken inserts reach production.
    for (const file of [
      "server/routes.ts",
      "server/index.ts",
      "server/routes/ai-advanced.ts",
    ]) {
      let src = "";
      try { src = read(file); } catch { continue; }
      expect(src, `${file} must not call processScheduledOrders`)
        .not.toMatch(/processScheduledOrders\s*\(/);
    }
  });

  it("no cron/scheduler registration mentions it", () => {
    // server/cron is the scheduler surface; a registration here would run it
    // without any route being involved.
    const cronFiles = ["server/cron/index.ts", "server/cron.ts"];
    for (const f of cronFiles) {
      let src = "";
      try { src = read(f); } catch { continue; }
      expect(src).not.toMatch(/processScheduledOrders/);
    }
  });

  it("no reprocessing path keys off an order status transition", () => {
    const orderStorage = read("server/storage/order-storage.ts");
    const createStart = orderStorage.indexOf("async createOrderSecure(");
    const createEnd = orderStorage.indexOf("// Payment Methods", createStart);
    expect(createStart).toBeGreaterThanOrEqual(0);
    expect(createEnd).toBeGreaterThan(createStart);
    const createBody = orderStorage.slice(createStart, createEnd);

    // Checkout validates and locks availability, but the sale deduction belongs to
    // order_items_relational -> inventory_movements -> storefront projection.
    expect(createBody).toMatch(/await tx\.insert\(orderItems\)\.values\(/);
    expect(createBody).not.toMatch(/stock:\s*(?:currentStock|variantStock)\s*-\s*quantity/);
    expect(createBody).not.toMatch(/variants:\s*updatedVariants/);

    // A later status transition must never create another sale movement.
    const updateFn = orderStorage.slice(orderStorage.indexOf("async updateOrder"));
    const nextMethod = updateFn.indexOf("\n    async ", 1);
    const updateBody = nextMethod === -1 ? updateFn.slice(0, 4000) : updateFn.slice(0, nextMethod);
    expect(updateBody).not.toMatch(/stock:\s*\w*\s*[-+]\s*quantity/);
    expect(updateBody).not.toMatch(/inventoryMovements|inventory_movements|insert\(orderItems\)/i);
  });

  it("no status-change handler creates a shipment, deducts stock or runs fulfilment", () => {
    // The admin order route is the only place that reacts to a status change
    // (admin.ts ~241-345). Its handlers do loyalty points and an IP block —
    // nothing that could produce a second shipment or stock movement. If that
    // ever changes, the DB lifecycle guard becomes the only thing standing
    // between a status edit and duplicated fulfilment, so this test pins it.
    const admin = read("server/routes/admin.ts");
    const start = admin.indexOf("const oldStatus = previousOrder?.status");
    expect(start).toBeGreaterThan(-1);
    const handlers = admin.slice(start, start + 6000);

    expect(handlers).not.toMatch(/fulfillmentService|createFulfillment|confirmFulfillment/i);
    expect(handlers).not.toMatch(/stock:\s*\w*\s*[-+]\s*quantity/);
    expect(handlers).not.toMatch(/inventory_movements|insert\(inventoryMovements\)/i);
    expect(handlers).not.toMatch(/sendOrderNotification/);
  });

  it("the new-order notification fires only on creation, never on status change", () => {
    // A delivered order pushed back to pending must not re-announce itself as a
    // new order. The call lives in the creation route only.
    const orders = read("server/routes/orders.ts");
    expect(orders).toMatch(/sendOrderNotification/);
    const admin = read("server/routes/admin.ts");
    expect(admin).not.toMatch(/sendOrderNotification/);
  });

  it("fulfillment declares idempotency against double cost/stock", () => {
    const svc = read("server/services/fulfillment-service.ts");
    expect(svc).toMatch(/never double cost or double stock deduction/i);
    expect(svc).toMatch(/idem/i);
  });

  it("still carries the deprecation marker explaining WHY", () => {
    // If someone deletes the explanation, the next reader may "fix" the throw.
    expect(source).toMatch(/@deprecated\s+QUARANTINED/);
  });
});
