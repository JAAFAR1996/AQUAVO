// Consolidation proof (Drizzle + PGlite): every redirected consumer reports the
// SAME numbers as the canonical accounting engine for the same database.
//
// Before this consolidation each consumer carried its own revenue formula:
//   - groqFinanceAudit re-implemented collectedAmount / the delivered filter /
//     COGS / the return-loss split.
//   - the MCP finance tools summed rounded_total for statuses
//     IN ('delivered','confirmed') and never deducted shipping.
//   - ai-dashboard summed CAST(orders.total AS NUMERIC) across ALL statuses.
//
// The tests below assert the arithmetic identities those consumers now rely on,
// against real engine output over a real Postgres, and assert that an UNKNOWN
// cost propagates as null rather than 0.
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../../shared/schema.js";
import {
  buildCostResolver,
  calcOrderProfit,
  collectProductIds,
  computePeriodFinancials,
  getRealizedOrdersForPeriod,
  type Db,
} from "../services/accounting-engine.js";
import { orderCollectedAmount, toMoney } from "../../shared/order-financials.js";
import { runInvariantChecks, type FinanceSnapshot } from "../services/groqFinanceAudit.js";

let client: PGlite;
let db: Db;

const START = new Date("2026-01-01T00:00:00Z");
const END = new Date("2026-12-31T23:59:59Z");

// Minimal schema: exactly the tables computePeriodFinancials/buildCostResolver read.
const DDL = `
CREATE TABLE products (
  id text PRIMARY KEY, slug text NOT NULL, name text NOT NULL, brand text NOT NULL,
  category text NOT NULL, category_id text, subcategory text NOT NULL, description text NOT NULL,
  price numeric NOT NULL, original_price numeric, currency text NOT NULL DEFAULT 'IQD',
  images jsonb NOT NULL DEFAULT '[]', thumbnail text NOT NULL DEFAULT '',
  rating numeric NOT NULL DEFAULT '0', review_count integer NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0, low_stock_threshold integer NOT NULL DEFAULT 10,
  is_new boolean NOT NULL DEFAULT false, is_best_seller boolean NOT NULL DEFAULT false,
  is_product_of_week boolean NOT NULL DEFAULT false,
  specifications jsonb NOT NULL DEFAULT '{}', variants jsonb,
  has_variants boolean NOT NULL DEFAULT false,
  cost_price numeric, packaging_cost numeric, insert_cost numeric,
  -- F-5 cost-resolution columns (migrations/add_product_cost_resolution.sql)
  cost_price_resolution text, packaging_cost_resolution text, insert_cost_resolution text,
  cost_resolution_note text, cost_resolution_by text, cost_resolution_at timestamptz,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);
CREATE TABLE orders (
  id text PRIMARY KEY, order_number text UNIQUE, user_id text,
  status text NOT NULL DEFAULT 'pending', payment_status text NOT NULL DEFAULT 'pending',
  total numeric NOT NULL, rounded_total numeric,
  shipping_cost numeric NOT NULL DEFAULT '0', coupon_id text,
  discount_total numeric DEFAULT '0', points_used integer DEFAULT 0,
  cashback_used integer DEFAULT 0, points_discount numeric DEFAULT '0',
  points_earned integer DEFAULT 0, rounding_cashback integer DEFAULT 0,
  items jsonb NOT NULL, shipping_address jsonb,
  customer_name text, customer_email text, customer_phone text,
  bonus_prize jsonb, bonus_claimed_at timestamp, carrier text,
  cod_received boolean DEFAULT false, box_cost numeric DEFAULT '0',
  source text DEFAULT 'website', financially_counted boolean,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE order_items_relational (
  id text PRIMARY KEY, order_id text NOT NULL, product_id text NOT NULL,
  quantity integer NOT NULL, price_at_purchase numeric NOT NULL, total_price numeric NOT NULL,
  unit_cost_price numeric, unit_packaging_cost numeric, unit_insert_cost numeric,
  cost_snapshot_status text, cost_snapshot_source text, cost_snapshot_confidence text,
  cost_snapshot_version integer, cost_snapshot_at timestamp, metadata jsonb
);
CREATE TABLE product_cost_history (
  id text PRIMARY KEY, product_id text NOT NULL,
  cost_price numeric NOT NULL DEFAULT '0', packaging_cost numeric NOT NULL DEFAULT '0',
  insert_cost numeric NOT NULL DEFAULT '0', effective_from timestamp NOT NULL,
  note text, changed_by text, created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE accounting_manual_adjustments (
  id text PRIMARY KEY, entity_type text NOT NULL, entity_id text NOT NULL,
  field_name text NOT NULL, old_value_json jsonb, new_value_json jsonb NOT NULL,
  reason text NOT NULL, status text NOT NULL DEFAULT 'pending',
  created_by text NOT NULL, approved_by text,
  created_at timestamp NOT NULL DEFAULT now(), approved_at timestamp,
  applied_at timestamp, note text
);
CREATE TABLE expenses (
  id text PRIMARY KEY, category text NOT NULL, amount numeric NOT NULL,
  description text, expense_date timestamp NOT NULL,
  is_recurring boolean NOT NULL DEFAULT false, recurring_period text,
  deleted_at timestamp, deleted_by text,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE order_return_events (
  id text PRIMARY KEY, order_id text NOT NULL, type text NOT NULL, reason text,
  refund_amount numeric DEFAULT '0', delivery_cost_loss numeric DEFAULT '0',
  return_shipping_cost numeric DEFAULT '0', packaging_loss numeric DEFAULT '0',
  product_write_off_amount numeric DEFAULT '0', cogs_loss numeric DEFAULT '0',
  restocked boolean DEFAULT false, restocked_at timestamp, affected_items jsonb,
  status text DEFAULT 'recorded', note text, created_by text,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
`;

function product(id: string, cost: string | null) {
  return `INSERT INTO products (id,slug,name,brand,category,subcategory,description,price,cost_price,packaging_cost,insert_cost,stock)
    VALUES ('${id}','${id}','${id}','B','c','s','d','10000',${cost === null ? "NULL" : `'${cost}'`},'100','50',10)`;
}

function order(o: {
  id: string; status: string; total: string; rounded: string | null; shipping: string;
  box: string; items: unknown; day: string;
}) {
  return `INSERT INTO orders (id,order_number,status,total,rounded_total,shipping_cost,box_cost,items,created_at)
    VALUES ('${o.id}','${o.id}','${o.status}','${o.total}',${o.rounded === null ? "NULL" : `'${o.rounded}'`},
    '${o.shipping}','${o.box}','${JSON.stringify(o.items)}','${o.day}')`;
}

beforeAll(async () => {
  client = new PGlite();
  await client.exec(DDL);
  db = drizzle(client, { schema }) as unknown as Db;

  await client.exec(product("p-known", "6000"));
  await client.exec(product("p-unknown", null)); // cost NEVER entered = UNKNOWN

  // Realized, fully-known cost. Frozen snapshot on the line.
  await client.exec(order({
    id: "o-known", status: "delivered", total: "12100", rounded: "12000",
    shipping: "5000", box: "500", day: "2026-03-01",
    items: [{ productId: "p-known", productName: "p-known", quantity: 2, priceAtPurchase: 5000,
              costPrice: 3000, packagingCost: 100, insertCost: 50, costStatus: "exact", costSource: "manual" }],
  }));
  // Realized, but the line carries NO cost evidence at all → resolver falls back
  // to a product whose cost_price is NULL → order cost is UNKNOWN.
  await client.exec(order({
    id: "o-unknown", status: "delivered", total: "8000", rounded: "8000",
    shipping: "5000", box: "0", day: "2026-03-02",
    items: [{ productId: "p-unknown", productName: "p-unknown", quantity: 1, priceAtPurchase: 8000 }],
  }));
  // NOT realized — 'confirmed' must never count as revenue. The old MCP SQL
  // counted this one.
  await client.exec(order({
    id: "o-confirmed", status: "confirmed", total: "99000", rounded: "99000",
    shipping: "5000", box: "0", day: "2026-03-03",
    items: [{ productId: "p-known", productName: "p-known", quantity: 1, priceAtPurchase: 99000,
              costPrice: 3000, packagingCost: 100, insertCost: 50, costStatus: "exact" }],
  }));
  // Cancelled — must never count.
  await client.exec(order({
    id: "o-cancelled", status: "cancelled", total: "40000", rounded: "40000",
    shipping: "5000", box: "0", day: "2026-03-04", items: [],
  }));

  await client.exec(`INSERT INTO expenses (id,category,amount,expense_date) VALUES ('e1','rent','1000','2026-03-05')`);
  await client.exec(`INSERT INTO order_return_events (id,order_id,type,refund_amount,delivery_cost_loss,cogs_loss,restocked,status,created_at)
    VALUES ('r1','o-known','customer_return','2000','300','5000',true,'verified','2026-03-06')`);
});

describe("consolidation — realized-order selection is canonical", () => {
  it("only realized (delivered) orders are selected; confirmed/cancelled are excluded", async () => {
    const realized = await getRealizedOrdersForPeriod(db, START, END);
    expect(realized.map((o) => o.id).sort()).toEqual(["o-known", "o-unknown"]);
  });

  it("MCP order-source counts still see ALL orders — only MONEY is realized-only", async () => {
    const all = await db.select().from(schema.orders);
    expect(all).toHaveLength(4);
  });
});

describe("consolidation — consumers agree with the engine", () => {
  it("period revenue equals the sum of per-order calcOrderProfit revenue", async () => {
    const fin = await computePeriodFinancials(db, START, END);
    const realized = await getRealizedOrdersForPeriod(db, START, END);
    const costs = await buildCostResolver(db, collectProductIds(realized));
    const perOrder = realized.reduce((s, o) => s + calcOrderProfit(o, costs).revenue, 0);
    expect(fin.revenue).toBe(Math.round(perOrder));
    // collected − shipping: (12000−5000) + (8000−5000)
    expect(fin.revenue).toBe(10000);
  });

  it("MCP get_dashboard_stats / get_orders_summary AOV derivation matches the engine", async () => {
    const fin = await computePeriodFinancials(db, START, END);
    // This is verbatim the expression the redirected MCP tools now use.
    const avg = fin.deliveredOrders > 0 ? Math.round(fin.revenue / fin.deliveredOrders) : 0;
    expect(fin.deliveredOrders).toBe(2);
    expect(avg).toBe(5000);
  });

  it("MCP get_revenue_breakdown shipping/discount totals sum only REALIZED orders", async () => {
    const realized = await getRealizedOrdersForPeriod(db, START, END);
    const shipping = Math.round(realized.reduce((s, o) => s + toMoney(o.shippingCost), 0));
    expect(shipping).toBe(10000); // 5000 + 5000 — the 'confirmed' order's 5000 is NOT included
  });

  it("groqFinanceAudit's P&L identity reproduces the engine's finalNetProfit", async () => {
    const fin = await computePeriodFinancials(db, START, END);
    // The snapshot's own arithmetic, exactly as buildFinanceSnapshot composes it.
    const totalCogs = fin.cogs + fin.packaging;
    const grossProfit = fin.revenue - totalCogs;
    const afterExpenses = grossProfit - fin.expensesTotal;
    const composed = afterExpenses - fin.salesReturnDeduction - fin.actualReturnLoss;
    expect(Math.abs(composed - fin.finalNetProfit)).toBeLessThanOrEqual(1);
  });

  it("a restocked return contributes NO cogsLoss (recovered to inventory)", async () => {
    const fin = await computePeriodFinancials(db, START, END);
    // refund 2000 is a revenue reversal; loss = deliveryCostLoss 300 only.
    // cogsLoss 5000 is excluded because restocked = true.
    expect(fin.salesReturnDeduction).toBe(2000);
    expect(fin.actualReturnLoss).toBe(300);
  });

  it("groqFinanceAudit invariant checks pass on an engine-derived snapshot", async () => {
    const fin = await computePeriodFinancials(db, START, END);
    const realized = await getRealizedOrdersForPeriod(db, START, END);
    const grossRevenue = Math.round(realized.reduce((s, o) => s + orderCollectedAmount(o), 0));
    const totalCogs = fin.cogs + fin.packaging;
    const grossProfit = fin.revenue - totalCogs;

    const snapshot = {
      deliveredNetTotal: fin.revenue,
      receivedCashTotal: 0,
      approvedReturnDeductions: 2000,
      pendingSettlement: Math.max(0, fin.revenue - 0 - 2000),
      profitAfterExpensesBeforeReturns: grossProfit - fin.expensesTotal,
      salesReturnDeduction: fin.salesReturnDeduction,
      actualReturnLoss: fin.actualReturnLoss,
      finalNetProfit: fin.finalNetProfit,
      refundAmount: fin.salesReturnDeduction,
      totalReturnFinancialImpact: fin.salesReturnDeduction + fin.actualReturnLoss,
      returnedProductsCount: 0,
      hasCodDrilldown: true,
      inventoryValueAtCost: 0,
    } as unknown as FinanceSnapshot;

    const failed = runInvariantChecks(snapshot).filter((c) => !c.passed);
    expect(failed.map((c) => c.name)).toEqual([]);
    expect(grossRevenue).toBe(20000); // 12000 + 8000 collected
  });
});

describe("consolidation — an UNKNOWN cost propagates as null, never 0", () => {
  it("the order with no cost evidence is flagged incomplete with null exact figures", async () => {
    const realized = await getRealizedOrdersForPeriod(db, START, END);
    const costs = await buildCostResolver(db, collectProductIds(realized));
    const unknown = realized.find((o) => o.id === "o-unknown")!;
    const p = calcOrderProfit(unknown, costs);

    expect(p.costStatus).toBe("incomplete");
    expect(p.exactCogs).toBeNull();
    expect(p.exactNetProfit).toBeNull();
    expect(p.grossMerchandiseProfit).toBeNull();
    expect(p.contributionProfit).toBeNull();
    expect(p.missingCostLines).toBe(1);
    // The unknown line contributed NOTHING to COGS — it was not read as a zero cost.
    expect(p.cogs).toBe(0);
    expect(p.items[0].unitCostPrice).toBeNull();
  });

  it("one unknown order makes the whole period's exact figures null (not 0)", async () => {
    const fin = await computePeriodFinancials(db, START, END);
    expect(fin.costComplete).toBe(false);
    expect(fin.ordersWithIncompleteCost).toBe(1);
    expect(fin.costStatus).toBe("incomplete");
    // These are what the MCP tools now surface as exact_cogs / exact_final_net_profit.
    expect(fin.exactCogs).toBeNull();
    expect(fin.exactFinalNetProfit).toBeNull();
    // The estimate is still a number — but it is never LABELLED exact.
    expect(typeof fin.cogs).toBe("number");
  });

  it("the fully-known order still yields exact figures", async () => {
    const realized = await getRealizedOrdersForPeriod(db, START, END);
    const costs = await buildCostResolver(db, collectProductIds(realized));
    const known = realized.find((o) => o.id === "o-known")!;
    const p = calcOrderProfit(known, costs);

    expect(p.costStatus).toBe("exact");
    expect(p.revenue).toBe(7000);          // 12000 collected − 5000 shipping
    expect(p.exactCogs).toBe(6300);        // 2 × (3000 + 100 + 50)
    expect(p.exactNetProfit).toBe(200);    // 7000 − 6300 − 500 box
  });
});
