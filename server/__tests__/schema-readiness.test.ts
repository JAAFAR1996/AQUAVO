import { describe, it, expect, beforeEach } from "vitest";
import {
  checkSchemaReadiness, getSchemaReadiness, assertOrderCreationReady,
  __resetSchemaReadinessCache, REQUIRED_ORDER_ITEM_COLUMNS,
} from "../services/schema-readiness.js";

/**
 * Deployment-compatibility guard.
 *
 * The app version on this branch writes 8 cost-snapshot columns that production
 * does not yet have. Without this guard it would accept traffic and fail one real
 * customer order at a time. It must instead fail readiness up front.
 */

const ALL = [
  "id", "order_id", "product_id", "quantity", "price_at_purchase", "total_price", "metadata",
  ...REQUIRED_ORDER_ITEM_COLUMNS,
];

const fakeDb = (columns: string[]) => ({
  execute: async () => ({ rows: columns.map((c) => ({ column_name: c })) }),
});
const throwingDb = { execute: async () => { throw new Error("connection refused"); } };

describe("schema readiness guard (deployment compatibility)", () => {
  beforeEach(() => __resetSchemaReadinessCache());

  it("NOT ready before the snapshot migration — names every missing column", async () => {
    const r = await checkSchemaReadiness(fakeDb([
      "id", "order_id", "product_id", "quantity", "price_at_purchase", "total_price", "metadata",
    ]));
    expect(r.ready).toBe(false);
    expect(r.orderCreationEnabled).toBe(false);
    expect(r.missingColumns).toEqual([...REQUIRED_ORDER_ITEM_COLUMNS]);
    expect(r.detail).toMatch(/add_order_item_cost_snapshot\.sql/);
  });

  it("ready after the snapshot migration", async () => {
    const r = await checkSchemaReadiness(fakeDb(ALL));
    expect(r.ready).toBe(true);
    expect(r.orderCreationEnabled).toBe(true);
    expect(r.missingColumns).toEqual([]);
  });

  it("NOT ready when a migration is only partially applied", async () => {
    const r = await checkSchemaReadiness(fakeDb(ALL.filter((c) => c !== "cost_snapshot_at")));
    expect(r.ready).toBe(false);
    expect(r.missingColumns).toEqual(["cost_snapshot_at"]);
  });

  it("NOT ready when the table is absent entirely", async () => {
    const r = await checkSchemaReadiness(fakeDb([]));
    expect(r.ready).toBe(false);
    expect(r.detail).toMatch(/not found/);
  });

  it("a probe failure reports NOT ready instead of throwing", async () => {
    const r = await checkSchemaReadiness(throwingDb);
    expect(r.ready).toBe(false);
    expect(r.detail).toMatch(/probe failed: connection refused/);
  });

  it("order creation is refused with a 503, not an opaque per-order column error", async () => {
    const r = await checkSchemaReadiness(fakeDb(["id", "order_id"]));
    try {
      assertOrderCreationReady(r);
      throw new Error("should have thrown");
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      expect(err.status).toBe(503);
      expect(err.code).toBe("SCHEMA_NOT_READY");
      expect(err.message).toMatch(/Order creation disabled/);
    }
  });

  it("passes through cleanly once the schema is ready", async () => {
    const r = await checkSchemaReadiness(fakeDb(ALL));
    expect(() => assertOrderCreationReady(r)).not.toThrow();
  });

  it("caches the result but honours a forced re-probe", async () => {
    let calls = 0;
    const counting = { execute: async () => { calls++; return { rows: ALL.map((c) => ({ column_name: c })) }; } };
    await getSchemaReadiness(counting);
    await getSchemaReadiness(counting);
    expect(calls).toBe(1);
    await getSchemaReadiness(counting, true);
    expect(calls).toBe(2);
  });
});
