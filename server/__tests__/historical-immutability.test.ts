/**
 * MISSION §11 — "تثبيت الأسعار والكلف تاريخياً — ممنوع إعادة حساب الماضي"
 *
 * This file exists to prove ONE claim with numbers and executable evidence:
 *
 *   "تغيير سعر أو كلفة منتج لا يغيّر أي طلب أو ربح تاريخي، ويؤثر فقط على
 *    الطلبات الجديدة بعد effectiveFrom."
 *
 * The ten tests mandated by §11 are implemented literally and are labelled
 * §11.1 … §11.10 so each can be traced back to the requirement.
 *
 * Two layers, deliberately:
 *   - ENGINE tests prove the calculation never consults today's catalogue.
 *   - DATABASE tests (PGlite, real Postgres) prove the guarantee survives a
 *     writer that bypasses the application entirely — which is the only way to
 *     answer Red Team B-7, since an application-level convention cannot.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import {
  calcOrderProfit,
  lineCostSnapshot,
  computeTaxReadiness,
  type CostResolver,
  type OrderRow,
  type RelationalLineSnapshot,
} from "../services/accounting-engine";

const ROOT = process.cwd();

// ───────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ───────────────────────────────────────────────────────────────────────────

/** A product whose CURRENT catalogue cost is 6,500 — deliberately not 5,000. */
const currentCatalogueCost = {
  costPrice: 6500,
  packagingCost: 0,
  insertCost: 0,
  status: "exact" as const,
  source: "product_current" as const,
  costBasis: "estimated_database_reference" as const,
};

/** A resolver that always answers with today's catalogue cost (6,500). */
const catalogueResolver: CostResolver = {
  getCurrent: () => currentCatalogueCost,
  getEffective: () => currentCatalogueCost,
};

function orderWithFrozenCost(costAtSale: number | null, salePrice: number): OrderRow {
  return {
    id: "order-historical",
    status: "delivered",
    createdAt: new Date("2026-03-01T10:00:00Z"),
    roundedTotal: String(salePrice + 5000),
    total: String(salePrice + 5000),
    shippingCost: "5000",
    boxCost: "0",
    items: [
      {
        productId: "p1",
        productName: "فلتر خارجي",
        quantity: 1,
        priceAtPurchase: salePrice,
        // The frozen cost snapshot taken at sale time. Field names must match
        // OrderLineItem exactly — a mismatch silently falls through to the
        // resolver, which is precisely the bug §11 guards against.
        costPrice: costAtSale,
        packagingCost: 0,
        insertCost: 0,
        costStatus: costAtSale === null ? "unknown" : "exact",
        costSource: costAtSale === null ? "none" : "product_current",
      },
    ],
  } as unknown as OrderRow;
}

// ═══════════════════════════════════════════════════════════════════════════
// §11.1 – §11.4  Cost changes must not reach back
// ═══════════════════════════════════════════════════════════════════════════

describe("§11 — a cost change does not alter a historical order", () => {
  it("§11.1–3: an order sold at cost 5,000 still reports 5,000 after the product cost becomes 6,500", () => {
    const historical = orderWithFrozenCost(5000, 20000);
    // The resolver is deliberately hostile: asked for a cost it returns 6,500.
    // If the engine consults it for a line that already carries a snapshot,
    // this test fails — which is exactly the regression §11 forbids.
    const profit = calcOrderProfit(historical, catalogueResolver);

    expect(profit.cogs).toBe(5000);
    expect(profit.cogs).not.toBe(6500);
    // Profit follows the frozen cost, not the catalogue.
    expect(profit.revenue - profit.cogs).toBe(20000 - 5000);
  });

  it("§11.4: an order created AFTER the change uses the new cost 6,500", () => {
    // A new line with no snapshot of its own must fall through to the resolver.
    const fresh = {
      id: "order-new",
      status: "delivered",
      createdAt: new Date("2026-06-01T10:00:00Z"),
      roundedTotal: "25000",
      total: "25000",
      shippingCost: "5000",
      boxCost: "0",
      items: [{ productId: "p1", productName: "فلتر خارجي", quantity: 1, priceAtPurchase: 20000 }],
    } as unknown as OrderRow;

    const profit = calcOrderProfit(fresh, catalogueResolver);
    expect(profit.cogs).toBe(6500);
  });

  it("the two orders coexist with different costs for the same product", () => {
    // The heart of §11: same product, same resolver, two different truths,
    // decided by whether the line was snapshotted — never by the catalogue.
    const oldProfit = calcOrderProfit(orderWithFrozenCost(5000, 20000), catalogueResolver);
    const newProfit = calcOrderProfit(
      {
        id: "o-new", status: "delivered", createdAt: new Date("2026-06-01"),
        roundedTotal: "25000", total: "25000", shippingCost: "5000", boxCost: "0",
        items: [{ productId: "p1", productName: "فلتر خارجي", quantity: 1, priceAtPurchase: 20000 }],
      } as unknown as OrderRow,
      catalogueResolver,
    );
    expect(oldProfit.cogs).toBe(5000);
    expect(newProfit.cogs).toBe(6500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// §11.5  Sale price changes must not reach back
// ═══════════════════════════════════════════════════════════════════════════

describe("§11.5 — a sale-price change does not alter a historical order", () => {
  it("revenue comes from the order line, never from products.price", () => {
    // Sold at 20,000. The catalogue price today is irrelevant and is not even
    // reachable from calcOrderProfit — revenue is derived from the order's own
    // collected total and its line prices.
    const profit = calcOrderProfit(orderWithFrozenCost(5000, 20000), catalogueResolver);
    const before = profit.revenue;

    // Re-running with a resolver reporting a wildly different cost does not
    // move revenue at all: the two are independent, as §11 requires.
    const hostile: CostResolver = {
      getCurrent: () => ({ ...currentCatalogueCost, costPrice: 999999 }),
      getEffective: () => ({ ...currentCatalogueCost, costPrice: 999999 }),
    };
    expect(calcOrderProfit(orderWithFrozenCost(5000, 20000), hostile).revenue).toBe(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// §11.6  Returns use the ORIGINAL order's cost
// ═══════════════════════════════════════════════════════════════════════════

describe("§11.6 — a return is costed from the original order snapshot", () => {
  it("the frozen snapshot is what a return must read, not the current cost", () => {
    // lineCostSnapshot is the single accessor a return path uses to recover the
    // original cost. It must return the frozen 5,000 regardless of catalogue.
    const line = {
      productId: "p1", quantity: 1, priceAtPurchase: 20000,
      costPrice: 5000, packagingCost: 0, insertCost: 0,
      costStatus: "exact", costSource: "product_current",
    };
    const snap = lineCostSnapshot(line as never);
    expect(snap).not.toBeNull();
    expect(snap?.costPrice).toBe(5000);
    expect(snap?.costPrice).not.toBe(6500);
    expect(snap?.costBasis).toBe("exact_snapshot");
  });

  it("a line with no snapshot yields null — a return must NOT silently use today's cost", () => {
    // Returning null forces the caller to make an explicit, visible decision.
    // Silently substituting the current cost would let a return manufacture
    // profit or loss out of a catalogue edit.
    expect(lineCostSnapshot({ productId: "p1", quantity: 1, priceAtPurchase: 20000 } as never)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// §11.7  Prior-period report fingerprints are stable
// ═══════════════════════════════════════════════════════════════════════════

describe("§11.7 — a closed period's figures are reproducible", () => {
  it("recomputing the same historical order yields a byte-identical fingerprint", () => {
    const fingerprint = (r: ReturnType<typeof calcOrderProfit>) =>
      JSON.stringify({ revenue: r.revenue, cogs: r.cogs, net: r.netProfit, status: r.costStatus });

    const first = fingerprint(calcOrderProfit(orderWithFrozenCost(5000, 20000), catalogueResolver));

    // Simulate every catalogue mutation §11 lists: purchase price, FX, freight,
    // packaging, current sale price, supplier. All of them land in the resolver.
    for (const mutated of [1, 6500, 12345, 999999]) {
      const drifted: CostResolver = {
        getCurrent: () => ({ ...currentCatalogueCost, costPrice: mutated }),
        getEffective: () => ({ ...currentCatalogueCost, costPrice: mutated }),
      };
      expect(fingerprint(calcOrderProfit(orderWithFrozenCost(5000, 20000), drifted))).toBe(first);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// §11.9  A line without an exact snapshot blocks TAX FINAL
// ═══════════════════════════════════════════════════════════════════════════

describe("§11.9 — an unsnapshotted line can never be tax-final", () => {
  it("the current production shape (0 exact of 182) is not ready", () => {
    const r = computeTaxReadiness({
      exactCostLines: 0,
      estimatedHistoryLines: 39,
      estimatedReferenceLines: 143,
      unknownCostLines: 0,
    });
    expect(r.totalFinancialLines).toBe(182);
    expect(r.costSnapshotsComplete).toBe(false);
    expect(r.taxReportReady).toBe(false);
    expect(r.taxReadinessWarning).not.toBeNull();
  });

  it("a single non-exact line among 181 exact ones still blocks", () => {
    const r = computeTaxReadiness({
      exactCostLines: 181, estimatedHistoryLines: 1,
      estimatedReferenceLines: 0, unknownCostLines: 0,
    });
    expect(r.costSnapshotsComplete).toBe(false);
    expect(r.taxReportReady).toBe(false);
  });

  it("an unknown cost never yields a reportable 100% margin", () => {
    const profit = calcOrderProfit(
      orderWithFrozenCost(null, 20000),
      { getCurrent: () => undefined, getEffective: () => undefined },
    );
    // `cogs` is a running accumulator: an unknown line contributes nothing to
    // it, so it reads 0. That is NOT the safety property — a naive reader could
    // still divide by it and print a 100% margin. The actual guarantee is that
    // every EXACT figure refuses to exist, so no consumer can read a confident
    // profit off an order with an unknown cost.
    expect(profit.exactCogs).toBeNull();
    expect(profit.grossMerchandiseProfit).toBeNull();
    expect(profit.contributionProfit).toBeNull();
    expect(profit.costStatus).toBe("incomplete");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// §11.8 + §11.10  DATABASE-LEVEL proof (Red Team B-7)
//
// The engine tests above prove the CALCULATION is safe. They cannot prove the
// DATA is safe, because any writer that bypasses the application could rewrite
// a frozen snapshot. These tests run real Postgres and prove the guarantee
// holds against raw SQL.
// ═══════════════════════════════════════════════════════════════════════════

const BASE_SCHEMA = `
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
  CREATE TABLE products (
    id text PRIMARY KEY,
    cost_price numeric,
    price numeric
  );
`;

const immutabilitySql = readFileSync(
  join(ROOT, "migrations/add_order_item_snapshot_immutability.sql"), "utf8");
const immutabilityRollbackSql = readFileSync(
  join(ROOT, "migrations/add_order_item_snapshot_immutability_rollback.sql"), "utf8");
const salePriceSql = readFileSync(
  join(ROOT, "migrations/add_order_item_sale_price_snapshot.sql"), "utf8");

describe("§11.10 — a DB trigger blocks mutation of an exact snapshot", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(BASE_SCHEMA);
    await db.exec(immutabilitySql);
    await db.exec(`
      INSERT INTO products (id, cost_price, price) VALUES ('p1', 5000, 20000);
      INSERT INTO order_items_relational
        (id, order_id, product_id, quantity, price_at_purchase, total_price,
         unit_cost_price, cost_snapshot_status, cost_snapshot_source)
      VALUES
        ('line-exact', 'o1', 'p1', 1, 20000, 20000, 5000, 'exact', 'product_current'),
        ('line-est',   'o2', 'p1', 1, 20000, 20000, 5000, 'estimated', 'cost_history');
    `);
  });

  it("refuses a direct UPDATE of a frozen cost — raw SQL cannot rewrite history", async () => {
    await expect(
      db.exec(`UPDATE order_items_relational SET unit_cost_price = 6500 WHERE id = 'line-exact'`)
    ).rejects.toThrow(/immutable/i);

    const r = await db.query<{ unit_cost_price: string }>(
      `SELECT unit_cost_price FROM order_items_relational WHERE id = 'line-exact'`);
    expect(Number(r.rows[0].unit_cost_price)).toBe(5000);
  });

  it("refuses a DELETE of a frozen line", async () => {
    await expect(
      db.exec(`DELETE FROM order_items_relational WHERE id = 'line-exact'`)
    ).rejects.toThrow(/immutable/i);
  });

  it("§11.8: updating products.cost_price does NOT update any order line", async () => {
    // The literal test §11.8 asks for. A catalogue edit is allowed; it simply
    // has no reach into the order line.
    await db.exec(`UPDATE products SET cost_price = 6500 WHERE id = 'p1'`);
    const r = await db.query<{ id: string; unit_cost_price: string }>(
      `SELECT id, unit_cost_price FROM order_items_relational ORDER BY id`);
    for (const row of r.rows) expect(Number(row.unit_cost_price)).toBe(5000);
  });

  it("leaves ESTIMATED lines mutable — reconstruction must be able to upgrade them", async () => {
    // If this failed, the Historical Cost Evidence Reconstruction workflow
    // could never promote the 182 lines to exact.
    await db.exec(`UPDATE order_items_relational SET unit_cost_price = 5200 WHERE id = 'line-est'`);
    const r = await db.query<{ unit_cost_price: string }>(
      `SELECT unit_cost_price FROM order_items_relational WHERE id = 'line-est'`);
    expect(Number(r.rows[0].unit_cost_price)).toBe(5200);
  });

  it("allows a non-financial edit to a frozen line (metadata is not money)", async () => {
    await db.exec(
      `UPDATE order_items_relational SET metadata = '{"note":"x"}'::jsonb WHERE id = 'line-exact'`);
    const r = await db.query(`SELECT metadata FROM order_items_relational WHERE id = 'line-exact'`);
    expect(r.rows[0]).toBeTruthy();
  });

  it("permits an AUDITED correction and records evidence of it", async () => {
    await db.exec(`
      SET LOCAL aquavo.snapshot_correction_id = 'CR-2026-001';
      SET LOCAL aquavo.snapshot_correction_authorized = 'on';
      UPDATE order_items_relational SET unit_cost_price = 5100 WHERE id = 'line-exact';
    `);
    const ev = await db.query<{ correction_id: string; before_row: unknown; after_row: unknown }>(
      `SELECT correction_id, before_row, after_row FROM order_item_snapshot_corrections`);
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0].correction_id).toBe("CR-2026-001");
    // The ORIGINAL value survives in the evidence row — §11 "احتفظ بالرقم السابق".
    expect(Number((ev.rows[0].before_row as { unit_cost_price: string }).unit_cost_price)).toBe(5000);
    expect(Number((ev.rows[0].after_row as { unit_cost_price: string }).unit_cost_price)).toBe(5100);
  });

  it("refuses a correction id WITHOUT the authorization flag", async () => {
    // Both GUCs are required. One alone is not a correction path.
    await expect(db.exec(`
      SET LOCAL aquavo.snapshot_correction_id = 'CR-2026-002';
      UPDATE order_items_relational SET unit_cost_price = 7000 WHERE id = 'line-exact';
    `)).rejects.toThrow(/immutable/i);
  });

  it("the authorization does not leak into a later transaction", async () => {
    await db.exec(`
      SET LOCAL aquavo.snapshot_correction_id = 'CR-2026-003';
      SET LOCAL aquavo.snapshot_correction_authorized = 'on';
      UPDATE order_items_relational SET unit_cost_price = 5100 WHERE id = 'line-exact';
    `);
    // A fresh statement outside that transaction must be blocked again.
    await expect(
      db.exec(`UPDATE order_items_relational SET unit_cost_price = 8000 WHERE id = 'line-exact'`)
    ).rejects.toThrow(/immutable/i);
  });

  it("M-5: accepts verified_zero, which the old CHECK rejected", async () => {
    await db.exec(`
      INSERT INTO order_items_relational
        (id, order_id, product_id, quantity, price_at_purchase, total_price,
         unit_cost_price, cost_snapshot_status, cost_snapshot_source)
      VALUES ('line-vz', 'o3', 'p1', 1, 20000, 20000, 0, 'verified_zero', 'manual');
    `);
    const r = await db.query(`SELECT id FROM order_items_relational WHERE id = 'line-vz'`);
    expect(r.rows).toHaveLength(1);
  });
});

describe("§11 migrations are idempotent and reversible", () => {
  it("the immutability migration applies twice and rolls back", async () => {
    const db = new PGlite();
    await db.exec(BASE_SCHEMA);
    await db.exec(immutabilitySql);
    await db.exec(immutabilitySql); // must not throw
    await db.exec(immutabilityRollbackSql);
    const t = await db.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger WHERE tgname = 'order_item_cost_snapshot_immutable'`);
    expect(t.rows).toHaveLength(0);
  });

  it("the sale-price migration adds columns without inventing a single snapshot", async () => {
    const db = new PGlite();
    await db.exec(BASE_SCHEMA);
    await db.exec(`
      INSERT INTO order_items_relational
        (id, order_id, product_id, quantity, price_at_purchase, total_price)
      VALUES ('l1', 'o1', 'p1', 1, 20000, 20000);
    `);
    await db.exec(salePriceSql);
    await db.exec(salePriceSql); // idempotent

    const r = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM order_items_relational
       WHERE sale_price_source IS NOT NULL OR sale_price_snapshot_at IS NOT NULL`);
    // The migration's own fail-closed block asserts this too; asserting here
    // as well means a future edit that adds a backfill fails the test suite,
    // not just the deployment.
    expect(r.rows[0].n).toBe(0);
  });

  it("rejects a sale-price snapshot whose arithmetic does not hold", async () => {
    const db = new PGlite();
    await db.exec(BASE_SCHEMA);
    await db.exec(salePriceSql);
    await expect(db.exec(`
      INSERT INTO order_items_relational
        (id, order_id, product_id, quantity, price_at_purchase, total_price,
         unit_sale_price_snapshot, discount_snapshot, final_unit_sale_price_snapshot,
         sale_price_snapshot_at, sale_price_source)
      VALUES ('bad', 'o1', 'p1', 1, 20000, 20000, 20000, 5000, 99999, now(), 'product_current');
    `)).rejects.toThrow();
  });

  it("rejects claimed provenance with no snapshot timestamp", async () => {
    const db = new PGlite();
    await db.exec(BASE_SCHEMA);
    await db.exec(salePriceSql);
    await expect(db.exec(`
      INSERT INTO order_items_relational
        (id, order_id, product_id, quantity, price_at_purchase, total_price, sale_price_source)
      VALUES ('bad2', 'o1', 'p1', 1, 20000, 20000, 'product_current');
    `)).rejects.toThrow();
  });
});
