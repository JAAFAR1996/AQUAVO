/**
 * ORDER COST-SNAPSHOT INVARIANT
 * =============================
 * Every newly created order line — storefront, admin/WhatsApp, or any other
 * entry point — must capture the SAME immutable cost snapshot through ONE
 * canonical transactional path.
 *
 * Covers the two HIGH defects:
 *   F-1  lockProductForUpdate() never SELECTed the cost columns, so every
 *        storefront line froze costStatus:"unknown" and became uncostable.
 *   F-2  the admin/WhatsApp path wrote no cost snapshot at all.
 *
 * And the semantic rule that must never be violated:
 *   verified zero (0) !== unknown (NULL).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { products, orders, orderItems, settings } from "../../shared/schema.js";
import { getDb } from "../db.js";
import { OrderStorage } from "../storage/order-storage.js";
import {
  buildProductCostSnapshot,
  parseCostValue,
  toJsonbCostFields,
  toRelationalCostFields,
  resolveSnapshotComponent,
  COST_SNAPSHOT_VERSION,
} from "../services/product-cost-snapshot.js";
import { resolveCostComponent } from "../services/accounting-engine.js";

vi.mock("../db.js", () => ({ getDb: vi.fn(), db: null }));
// The schema-readiness deployment guard is exercised by schema-readiness.test.ts;
// here we assume the migration is applied so we can test snapshot behaviour.
vi.mock("../services/schema-readiness.js", () => ({
  getSchemaReadiness: async () => ({ orderCreationEnabled: true, ready: true, missingColumns: [], checkedAt: "", detail: "" }),
  assertOrderCreationReady: () => { },
}));

// ---------------------------------------------------------------------------
// Shared fake transaction. Records what each creation path actually wrote and
// which SQL it issued, so we can assert on the real emitted payloads.
// ---------------------------------------------------------------------------
type ProductRow = Record<string, any>;

function makeHarness(opts: {
  productRows: Record<string, ProductRow | null>;
  failOnLineIndex?: number;      // throw while inserting the Nth relational line
  failOnOrderInsert?: boolean;
}) {
  const state = {
    orderInserts: [] as any[],
    orderItemInserts: [] as any[],
    productUpdates: [] as Array<{ id: string; payload: any }>,
    executedSql: [] as string[],
    committed: false,
    rolledBack: false,
    lockedIds: [] as string[],
  };

  const mkTx = () => {
    let relationalLineCount = 0;
    return {
      execute: vi.fn(async (q: any) => {
        const text = JSON.stringify(q?.queryChunks ?? q ?? "");
        state.executedSql.push(text);
        // Identify a product lock by the bound product id appearing in the chunks.
        for (const id of Object.keys(opts.productRows)) {
          if (text.includes(`"${id}"`)) {
            state.lockedIds.push(id);
            const row = opts.productRows[id];
            return { rows: row ? [row] : [] };
          }
        }
        return { rows: [] };
      }),
      select: vi.fn(() => ({
        from: vi.fn((table: any) => {
          const rows = table === settings ? [{ value: "5000" }] : [];
          const p = Promise.resolve(rows);
          return {
            where: vi.fn(() => ({ limit: vi.fn(async () => rows), then: p.then.bind(p) })),
            limit: vi.fn(async () => rows),
            then: p.then.bind(p),
          };
        }),
      })),
      update: vi.fn((table: any) => ({
        set: vi.fn((payload: any) => ({
          where: vi.fn(async () => {
            if (table === products) state.productUpdates.push({ id: "?", payload });
            return [];
          }),
        })),
      })),
      insert: vi.fn((table: any) => ({
        values: vi.fn((payload: any) => {
          const apply = () => {
            if (table === orders) {
              if (opts.failOnOrderInsert) throw new Error("order insert exploded");
              state.orderInserts.push(payload);
              return [{ id: "order-1", ...payload }];
            }
            if (table === orderItems) {
              const rows = Array.isArray(payload) ? payload : [payload];
              for (const r of rows) {
                if (opts.failOnLineIndex === relationalLineCount) {
                  relationalLineCount++;
                  throw new Error("relational line insert exploded");
                }
                relationalLineCount++;
                state.orderItemInserts.push(r);
              }
              return rows;
            }
            return [{ id: "row-1" }];
          };
          const result = apply();
          return {
            returning: vi.fn(async () => result),
            then: (res: any, rej: any) => Promise.resolve(result).then(res, rej),
          };
        }),
      })),
    };
  };

  const db = {
    transaction: vi.fn(async (cb: any) => {
      const snapshotBefore = {
        orderInserts: [...state.orderInserts],
        orderItemInserts: [...state.orderItemInserts],
        productUpdates: [...state.productUpdates],
      };
      try {
        const r = await cb(mkTx());
        state.committed = true;
        return r;
      } catch (e) {
        // emulate ROLLBACK: discard everything staged in this transaction
        state.rolledBack = true;
        state.orderInserts = snapshotBefore.orderInserts;
        state.orderItemInserts = snapshotBefore.orderItemInserts;
        state.productUpdates = snapshotBefore.productUpdates;
        throw e;
      }
    }),
  };

  vi.mocked(getDb).mockReturnValue(db as any);
  return { state, db, storage: new OrderStorage() };
}

const CUSTOMER = { name: "Customer", phone: "07701234567", address: "Baghdad" };

const KNOWN_COST_PRODUCT: ProductRow = {
  id: "p-known", name: "Filter", price: "10000", stock: 10,
  variants: null, hasVariants: false,
  costPrice: "6000", packagingCost: "500", insertCost: "250",
};
/** A human confirmed every component is genuinely 0 (F-5 resolution present). */
const VERIFIED_ZERO_PRODUCT: ProductRow = {
  id: "p-zero", name: "Free Sample", price: "10000", stock: 10,
  variants: null, hasVariants: false,
  costPrice: "0", packagingCost: "0", insertCost: "0",
  costPriceResolution: "verified_zero",
  packagingCostResolution: "verified_zero",
  insertCostResolution: "verified_zero",
};
const UNKNOWN_COST_PRODUCT: ProductRow = {
  id: "p-unknown", name: "Mystery Heater", price: "10000", stock: 10,
  variants: null, hasVariants: false,
  costPrice: null, packagingCost: null, insertCost: null,
};
/**
 * F-10. The dangerous row: cost_price is 0 only because the column carried
 * `DEFAULT '0'`. Nobody ever confirmed it. This MUST snapshot as UNKNOWN.
 */
const UNRESOLVED_ZERO_PRODUCT: ProductRow = {
  id: "p-unresolved-zero", name: "Never Costed", price: "10000", stock: 10,
  variants: null, hasVariants: false,
  costPrice: "0", packagingCost: "0", insertCost: "0",
  costPriceResolution: "unresolved",
  packagingCostResolution: "unresolved",
  insertCostResolution: "unresolved",
};
/** Same row before add_product_cost_resolution.sql is applied: no metadata. */
const BARE_ZERO_PRODUCT: ProductRow = {
  id: "p-bare-zero", name: "Pre-migration Zero", price: "10000", stock: 10,
  variants: null, hasVariants: false,
  costPrice: "0", packagingCost: "0", insertCost: "0",
};
/** The one active zero-cost product in production — out of stock, so unorderable. */
const OUT_OF_STOCK_ZERO_PRODUCT: ProductRow = {
  id: "houyi-mountain-wood", name: "خشب الجبل الطبيعي", price: "5000", stock: 0,
  variants: null, hasVariants: false,
  costPrice: "0", packagingCost: "0", insertCost: "0",
  costPriceResolution: "unresolved",
};

// ===========================================================================
describe("canonical builder — verified zero vs unknown", () => {
  it("parseCostValue keeps a verified 0 as 0 and maps absent to null", () => {
    expect(parseCostValue("0")).toBe(0);
    expect(parseCostValue(0)).toBe(0);
    expect(parseCostValue(null)).toBeNull();
    expect(parseCostValue(undefined)).toBeNull();
    expect(parseCostValue("")).toBeNull();
    expect(parseCostValue("not-a-number")).toBeNull();
  });

  it("known cost → exact / product_current / high", () => {
    const s = buildProductCostSnapshot(KNOWN_COST_PRODUCT);
    expect(s).toMatchObject({
      costPrice: 6000, packagingCost: 500, insertCost: 250,
      costStatus: "exact", costSource: "product_current", costConfidence: "high",
      costSnapshotVersion: COST_SNAPSHOT_VERSION,
    });
  });

  it("verified zero stays 0 — NOT unknown", () => {
    const s = buildProductCostSnapshot(VERIFIED_ZERO_PRODUCT);
    expect(s.costPrice).toBe(0);
    expect(s.packagingCost).toBe(0);
    expect(s.insertCost).toBe(0);
    expect(s.costStatus).toBe("verified_zero");
    expect(s.costSource).toBe("product_current");
  });

  it("unknown stays NULL — never collapses to 0", () => {
    const s = buildProductCostSnapshot(UNKNOWN_COST_PRODUCT);
    expect(s.costPrice).toBeNull();
    expect(s.packagingCost).toBeNull();
    expect(s.insertCost).toBeNull();
    expect(s.costStatus).toBe("unknown");
    expect(s.costSource).toBe("none");
    expect(s.costConfidence).toBeNull();
  });

  it("partial evidence is 'incomplete', not silently completed with zeros", () => {
    const s = buildProductCostSnapshot({ costPrice: "6000", packagingCost: null, insertCost: null });
    expect(s.costStatus).toBe("incomplete");
    expect(s.costPrice).toBe(6000);
    expect(s.packagingCost).toBeNull();
    expect(s.costConfidence).toBe("medium");
  });

  it("accepts snake_case rows too, so a raw-SQL caller cannot reintroduce F-1", () => {
    const s = buildProductCostSnapshot({ cost_price: "300", packaging_cost: "1", insert_cost: "2" });
    expect(s.costPrice).toBe(300);
    expect(s.costStatus).toBe("exact");
  });

  it("F-10: an UNRESOLVED zero snapshots as UNKNOWN, never as an exact 0", () => {
    const s = buildProductCostSnapshot(UNRESOLVED_ZERO_PRODUCT);
    expect(s.costPrice).toBeNull();
    expect(s.packagingCost).toBeNull();
    expect(s.insertCost).toBeNull();
    expect(s.costStatus).toBe("unknown");
    expect(s.costSource).toBe("none");
    expect(s.costConfidence).toBeNull();
  });

  it("F-10: a BARE zero (no resolution column yet) is UNKNOWN too — the conservative reading", () => {
    const s = buildProductCostSnapshot(BARE_ZERO_PRODUCT);
    expect(s.costPrice).toBeNull();
    expect(s.costStatus).toBe("unknown");
  });

  it("F-10: a positive cost is evidence of itself even when marked unresolved", () => {
    const s = buildProductCostSnapshot({
      costPrice: "6000", packagingCost: "500", insertCost: "250",
      costPriceResolution: "unresolved",
      packagingCostResolution: "unresolved",
      insertCostResolution: "unresolved",
    });
    expect(s.costPrice).toBe(6000);
    expect(s.costStatus).toBe("exact");
  });

  it("F-10: a verified-zero cost with unresolved-zero components is 'incomplete', not fabricated", () => {
    const s = buildProductCostSnapshot({
      costPrice: "0", packagingCost: "0", insertCost: "0",
      costPriceResolution: "verified_zero",
    });
    expect(s.costPrice).toBe(0);
    expect(s.packagingCost).toBeNull();
    expect(s.insertCost).toBeNull();
    expect(s.costStatus).toBe("incomplete");
  });

  it("F-10: snake_case resolution spellings are honoured too", () => {
    const s = buildProductCostSnapshot({
      cost_price: "0", packaging_cost: "0", insert_cost: "0",
      cost_price_resolution: "unresolved",
    });
    expect(s.costPrice).toBeNull();
    expect(s.costStatus).toBe("unknown");
  });

  it("F-10: the snapshot builder and the accounting read path agree on every zero", () => {
    // Same decision table on both sides — a zero must never mean one thing at
    // write time and another at read time.
    for (const resolution of ["verified_zero", "unresolved", null, undefined]) {
      expect(resolveSnapshotComponent("0", resolution))
        .toBe(resolveCostComponent(0, resolution));
      expect(resolveSnapshotComponent("6000", resolution))
        .toBe(resolveCostComponent(6000, resolution));
      expect(resolveSnapshotComponent(null, resolution))
        .toBe(resolveCostComponent(null, resolution));
    }
  });

  it("JSONB and relational projections describe the same snapshot", () => {
    const s = buildProductCostSnapshot(KNOWN_COST_PRODUCT);
    const j = toJsonbCostFields(s);
    const r = toRelationalCostFields(s);
    expect(String(j.costPrice)).toBe(r.unitCostPrice);
    expect(j.costStatus).toBe(r.costSnapshotStatus);
    expect(j.costSource).toBe(r.costSnapshotSource);
  });
});

// ===========================================================================
describe("storefront creation path (createOrderSecure)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("F-1 REGRESSION: locks the product with the cost columns in the SELECT", async () => {
    const h = makeHarness({ productRows: { "p-known": KNOWN_COST_PRODUCT } });
    await h.storage.createOrderSecure(null, [{ productId: "p-known", quantity: 2 }], CUSTOMER);
    const lockSql = h.state.executedSql.join(" ");
    expect(lockSql).toContain("cost_price");
    expect(lockSql).toContain("packaging_cost");
    expect(lockSql).toContain("insert_cost");
    expect(lockSql).toContain("FOR UPDATE");
  });

  it("storefront KNOWN cost is frozen onto both stores", async () => {
    const h = makeHarness({ productRows: { "p-known": KNOWN_COST_PRODUCT } });
    await h.storage.createOrderSecure(null, [{ productId: "p-known", quantity: 2 }], CUSTOMER);

    const line = h.state.orderInserts[0].items[0];
    expect(line).toMatchObject({
      costPrice: 6000, packagingCost: 500, insertCost: 250,
      costStatus: "exact", costSource: "product_current",
    });

    const rel = h.state.orderItemInserts[0];
    expect(rel).toMatchObject({
      unitCostPrice: "6000", unitPackagingCost: "500", unitInsertCost: "250",
      costSnapshotStatus: "exact", costSnapshotSource: "product_current",
      costSnapshotConfidence: "high", costSnapshotVersion: 1,
    });
    expect(rel.costSnapshotAt).toBeInstanceOf(Date);
  });

  it("storefront VERIFIED ZERO is stored as 0, not NULL and not unknown", async () => {
    const h = makeHarness({ productRows: { "p-zero": VERIFIED_ZERO_PRODUCT } });
    await h.storage.createOrderSecure(null, [{ productId: "p-zero", quantity: 1 }], CUSTOMER);

    const line = h.state.orderInserts[0].items[0];
    expect(line.costPrice).toBe(0);
    expect(line.costStatus).toBe("verified_zero");

    const rel = h.state.orderItemInserts[0];
    expect(rel.unitCostPrice).toBe("0");
    expect(rel.unitCostPrice).not.toBeNull();
    expect(rel.costSnapshotStatus).toBe("verified_zero");
  });

  it("F-10 REGRESSION: storefront UNRESOLVED zero freezes UNKNOWN, not a false 0 COGS", async () => {
    const h = makeHarness({ productRows: { "p-unresolved-zero": UNRESOLVED_ZERO_PRODUCT } });
    await h.storage.createOrderSecure(
      null, [{ productId: "p-unresolved-zero", quantity: 1 }], CUSTOMER,
    );

    const line = h.state.orderInserts[0].items[0];
    expect(line.costPrice).toBeNull();
    expect(line.costStatus).toBe("unknown");
    expect(line.costSource).toBe("none");

    const rel = h.state.orderItemInserts[0];
    expect(rel.unitCostPrice).toBeNull();
    expect(rel.costSnapshotStatus).toBe("unknown");
    expect(rel.costSnapshotConfidence).toBeNull();
  });

  it("F-10 REGRESSION: the lock SELECT reads the resolution columns", async () => {
    const h = makeHarness({ productRows: { "p-known": KNOWN_COST_PRODUCT } });
    await h.storage.createOrderSecure(null, [{ productId: "p-known", quantity: 1 }], CUSTOMER);
    const lockSql = h.state.executedSql.join(" ");
    expect(lockSql).toContain("cost_price_resolution");
    expect(lockSql).toContain("packaging_cost_resolution");
    expect(lockSql).toContain("insert_cost_resolution");
  });

  it("F-10 REGRESSION: the lock SELECT excludes soft-deleted products", async () => {
    const h = makeHarness({ productRows: { "p-known": KNOWN_COST_PRODUCT } });
    await h.storage.createOrderSecure(null, [{ productId: "p-known", quantity: 1 }], CUSTOMER);
    expect(h.state.executedSql.join(" ")).toContain("deleted_at");
  });

  it("F-10 REGRESSION: a soft-deleted zero-cost product cannot be ordered at all", async () => {
    // The lock's `deleted_at IS NULL` makes the row invisible — the harness
    // models that as "no row", which is the same thing the database returns.
    const h = makeHarness({ productRows: { "p-deleted-zero": null } });
    await expect(h.storage.createOrderSecure(
      null, [{ productId: "p-deleted-zero", quantity: 1 }], CUSTOMER,
    )).rejects.toThrow(/not found/);
    expect(h.state.orderInserts).toHaveLength(0);
    expect(h.state.orderItemInserts).toHaveLength(0);
  });

  it("F-10 REGRESSION: the live out-of-stock zero-cost product cannot create an order", async () => {
    // houyi-mountain-wood — the ONE active zero-cost product in production.
    // stock = 0, so there is no live COGS exposure from it today.
    const h = makeHarness({ productRows: { "houyi-mountain-wood": OUT_OF_STOCK_ZERO_PRODUCT } });
    await expect(h.storage.createOrderSecure(
      null, [{ productId: "houyi-mountain-wood", quantity: 1 }], CUSTOMER,
    )).rejects.toThrow();
    expect(h.state.orderInserts).toHaveLength(0);
  });

  it("storefront UNKNOWN cost is stored as NULL/unknown, never 0", async () => {
    const h = makeHarness({ productRows: { "p-unknown": UNKNOWN_COST_PRODUCT } });
    await h.storage.createOrderSecure(null, [{ productId: "p-unknown", quantity: 1 }], CUSTOMER);

    const line = h.state.orderInserts[0].items[0];
    expect(line.costPrice).toBeNull();
    expect(line.costStatus).toBe("unknown");
    expect(line.costSource).toBe("none");

    const rel = h.state.orderItemInserts[0];
    expect(rel.unitCostPrice).toBeNull();
    expect(rel.costSnapshotStatus).toBe("unknown");
    expect(rel.costSnapshotConfidence).toBeNull();
  });

  it("JSONB and relational stores AGREE line-for-line", async () => {
    const h = makeHarness({
      productRows: {
        "p-known": KNOWN_COST_PRODUCT,
        "p-zero": VERIFIED_ZERO_PRODUCT,
        "p-unknown": UNKNOWN_COST_PRODUCT,
      },
    });
    await h.storage.createOrderSecure(null, [
      { productId: "p-known", quantity: 1 },
      { productId: "p-zero", quantity: 2 },
      { productId: "p-unknown", quantity: 3 },
    ], CUSTOMER);

    const jsonb = h.state.orderInserts[0].items;
    const rel = h.state.orderItemInserts;
    expect(jsonb).toHaveLength(3);
    expect(rel).toHaveLength(3);
    jsonb.forEach((line: any, i: number) => {
      expect(rel[i].productId).toBe(line.productId);
      expect(rel[i].quantity).toBe(line.quantity);
      expect(rel[i].costSnapshotStatus).toBe(line.costStatus);
      expect(rel[i].costSnapshotSource).toBe(line.costSource);
      expect(rel[i].unitCostPrice).toBe(line.costPrice === null ? null : String(line.costPrice));
      expect(rel[i].unitPackagingCost).toBe(line.packagingCost === null ? null : String(line.packagingCost));
    });
  });

  it("rolls back the WHOLE order when a relational line insert fails", async () => {
    const h = makeHarness({
      productRows: { "p-known": KNOWN_COST_PRODUCT },
      failOnLineIndex: 0,
    });
    await expect(h.storage.createOrderSecure(null, [
      { productId: "p-known", quantity: 1 },
    ], CUSTOMER)).rejects.toThrow(/relational line insert exploded/);

    expect(h.state.rolledBack).toBe(true);
    expect(h.state.orderInserts).toHaveLength(0);
    expect(h.state.orderItemInserts).toHaveLength(0);
    expect(h.state.productUpdates).toHaveLength(0); // stock deduction reverted too
  });

  it("deducts inventory exactly once per line", async () => {
    const h = makeHarness({
      productRows: { "p-known": KNOWN_COST_PRODUCT, "p-zero": VERIFIED_ZERO_PRODUCT },
    });
    await h.storage.createOrderSecure(null, [
      { productId: "p-known", quantity: 2 },
      { productId: "p-zero", quantity: 3 },
    ], CUSTOMER);

    const stockUpdates = h.state.productUpdates.filter((u) => "stock" in u.payload);
    expect(stockUpdates).toHaveLength(2);
    expect(stockUpdates[0].payload.stock).toBe(8);  // 10 - 2
    expect(stockUpdates[1].payload.stock).toBe(7);  // 10 - 3
  });

  it("concurrent creations each take their own row lock and snapshot independently", async () => {
    const runs = await Promise.all([1, 2, 3].map(async () => {
      const h = makeHarness({ productRows: { "p-known": KNOWN_COST_PRODUCT } });
      await h.storage.createOrderSecure(null, [{ productId: "p-known", quantity: 1 }], CUSTOMER);
      return h.state;
    }));
    for (const s of runs) {
      expect(s.lockedIds).toEqual(["p-known"]);
      expect(s.orderItemInserts[0].costSnapshotStatus).toBe("exact");
      expect(s.orderItemInserts[0].unitCostPrice).toBe("6000");
    }
  });

  it("a missing product aborts creation instead of writing an uncostable line", async () => {
    const h = makeHarness({ productRows: { "p-gone": null } });
    await expect(h.storage.createOrderSecure(null, [
      { productId: "p-gone", quantity: 1 },
    ], CUSTOMER)).rejects.toThrow(/not found/);
    expect(h.state.orderInserts).toHaveLength(0);
  });
});

// ===========================================================================
describe("admin / WhatsApp creation path (invoice confirmation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function runInvoice(productRow: ProductRow | null, item: any) {
    const h = makeHarness({ productRows: { [item.productId]: productRow } });
    const { InvoiceStorage } = await import("../storage/invoice-storage.js");
    const inv = new InvoiceStorage();
    const invoice = {
      id: "inv-1", invoiceNo: "FH-260101-AAAABBBB", total: "20000",
      delivery: "5000", discount: "0",
      customerName: "Ali", customerPhone: "07700000000",
      customerCity: "بغداد", customerAddress: "الكرادة",
      items: [item],
    };
    const orderId = await (inv as any).createOrderFromInvoice(invoice);
    return { h, orderId };
  }

  const invItem = (productId: string) => ({
    productId, name: "Line", quantity: 2, unitPrice: 10000,
    variantLabel: null, variantId: null,
  });

  it("F-2 REGRESSION: WhatsApp KNOWN cost now writes a snapshot to BOTH stores", async () => {
    const { h } = await runInvoice(KNOWN_COST_PRODUCT, invItem("p-known"));

    const line = h.state.orderInserts[0].items[0];
    expect(line).toMatchObject({
      costPrice: 6000, packagingCost: 500, insertCost: 250,
      costStatus: "exact", costSource: "product_current",
    });
    const rel = h.state.orderItemInserts[0];
    expect(rel).toMatchObject({
      unitCostPrice: "6000", costSnapshotStatus: "exact",
      costSnapshotSource: "product_current", costSnapshotConfidence: "high",
      costSnapshotVersion: 1,
    });
    expect(h.state.orderInserts[0].source).toBe("whatsapp");
  });

  it("WhatsApp VERIFIED ZERO stays 0", async () => {
    const { h } = await runInvoice(VERIFIED_ZERO_PRODUCT, invItem("p-zero"));
    expect(h.state.orderInserts[0].items[0].costPrice).toBe(0);
    expect(h.state.orderItemInserts[0].unitCostPrice).toBe("0");
    expect(h.state.orderItemInserts[0].costSnapshotStatus).toBe("verified_zero");
  });

  it("F-10 REGRESSION: WhatsApp UNRESOLVED zero is UNKNOWN, not a false 0", async () => {
    const { h } = await runInvoice(UNRESOLVED_ZERO_PRODUCT, invItem("p-unresolved-zero"));
    expect(h.state.orderInserts[0].items[0].costPrice).toBeNull();
    expect(h.state.orderInserts[0].items[0].costStatus).toBe("unknown");
    expect(h.state.orderItemInserts[0].unitCostPrice).toBeNull();
    expect(h.state.orderItemInserts[0].costSnapshotStatus).toBe("unknown");
  });

  it("F-10 REGRESSION: storefront and WhatsApp snapshot every cost shape IDENTICALLY", async () => {
    const shapes: ProductRow[] = [
      KNOWN_COST_PRODUCT, VERIFIED_ZERO_PRODUCT,
      UNKNOWN_COST_PRODUCT, UNRESOLVED_ZERO_PRODUCT, BARE_ZERO_PRODUCT,
    ];
    for (const row of shapes) {
      vi.clearAllMocks();
      const store = makeHarness({ productRows: { [row.id]: row } });
      await store.storage.createOrderSecure(null, [{ productId: row.id, quantity: 2 }], CUSTOMER);

      vi.clearAllMocks();
      const { h: wa } = await runInvoice(row, invItem(row.id));

      const s = store.state.orderInserts[0].items[0];
      const w = wa.state.orderInserts[0].items[0];
      const label = `parity for ${row.id}`;
      expect(w.costPrice, label).toBe(s.costPrice);
      expect(w.packagingCost, label).toBe(s.packagingCost);
      expect(w.insertCost, label).toBe(s.insertCost);
      expect(w.costStatus, label).toBe(s.costStatus);
      expect(w.costSource, label).toBe(s.costSource);

      const sr = store.state.orderItemInserts[0];
      const wr = wa.state.orderItemInserts[0];
      expect(wr.unitCostPrice, label).toBe(sr.unitCostPrice);
      expect(wr.costSnapshotStatus, label).toBe(sr.costSnapshotStatus);
      expect(wr.costSnapshotConfidence, label).toBe(sr.costSnapshotConfidence);
    }
  });

  it("WhatsApp UNKNOWN cost stays NULL/unknown", async () => {
    const { h } = await runInvoice(UNKNOWN_COST_PRODUCT, invItem("p-unknown"));
    expect(h.state.orderInserts[0].items[0].costPrice).toBeNull();
    expect(h.state.orderInserts[0].items[0].costStatus).toBe("unknown");
    expect(h.state.orderItemInserts[0].unitCostPrice).toBeNull();
    expect(h.state.orderItemInserts[0].costSnapshotStatus).toBe("unknown");
    expect(h.state.orderItemInserts[0].costSnapshotConfidence).toBeNull();
  });

  it("WhatsApp locks each product FOR UPDATE with the cost columns", async () => {
    const { h } = await runInvoice(KNOWN_COST_PRODUCT, invItem("p-known"));
    const sqlText = h.state.executedSql.join(" ");
    expect(sqlText).toContain("cost_price");
    expect(sqlText).toContain("FOR UPDATE");
    expect(h.state.lockedIds).toEqual(["p-known"]);
  });

  it("WhatsApp JSONB and relational agree", async () => {
    const { h } = await runInvoice(KNOWN_COST_PRODUCT, invItem("p-known"));
    const j = h.state.orderInserts[0].items[0];
    const r = h.state.orderItemInserts[0];
    expect(r.costSnapshotStatus).toBe(j.costStatus);
    expect(r.costSnapshotSource).toBe(j.costSource);
    expect(r.unitCostPrice).toBe(String(j.costPrice));
    expect(Number(r.totalPrice)).toBe(j.lineTotal);
  });

  it("WhatsApp deducts inventory exactly once per line", async () => {
    const { h } = await runInvoice(KNOWN_COST_PRODUCT, invItem("p-known"));
    expect(h.state.productUpdates).toHaveLength(1);
  });

  it("WhatsApp fails closed when the invoice references a missing product", async () => {
    await expect(runInvoice(null, invItem("p-gone"))).rejects.toThrow(/المنتج غير موجود/);
  });
});

// ===========================================================================
describe("unsafe legacy paths still fail closed", () => {
  it("storage.createOrder() throws instead of writing a snapshot-less order", async () => {
    const h = makeHarness({ productRows: {} });
    await expect(h.storage.createOrder({} as any)).rejects.toThrow(/disabled/);
  });

  it("AutoOrderProcessor.processScheduledOrders() stays quarantined", async () => {
    const { AutoOrderProcessor } = await import("../services/auto-order-processor.js");
    await expect(new AutoOrderProcessor().processScheduledOrders()).rejects.toThrow(/QUARANTINED/);
  });
});
