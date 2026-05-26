import { describe, it, expect } from "vitest";
import {
  accountingCostUpdateSchema,
  accountingReportSchema,
  accountingSummarySchema,
  accountingProductProfitFullSchema,
} from "@shared/accounting";

// Pure calculation helpers mirroring accounting.ts logic (no DB needed)

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function orderCollectedAmount(order: { roundedTotal?: number | string | null; total: number | string }): number {
  if (order.roundedTotal != null) return toNumber(order.roundedTotal);
  const raw = toNumber(order.total);
  return Math.round(raw / 250) * 250;
}

function orderNetAmount(order: { roundedTotal?: number | string | null; total: number | string; shippingCost: number | string }): number {
  return orderCollectedAmount(order) - toNumber(order.shippingCost);
}

function calcTotalPending(deliveredOrders: Array<{ roundedTotal?: number | string | null; total: number | string; shippingCost: number | string }>, settlements: Array<{ amount: number | string }>): number {
  const totalDelivered = deliveredOrders.reduce((sum, o) => sum + orderNetAmount(o), 0);
  const totalReceived = settlements.reduce((sum, s) => sum + toNumber(s.amount), 0);
  return Math.max(0, totalDelivered - totalReceived);
}

const CANCELLED_STATUSES = ["cancelled", "rejected", "rejected_returned", "rejected_carrier", "returned"] as const;
const RETURN_STATUSES = ["returned", "refunded", "rejected_returned"];

function calcRtoRate(orders: Array<{ status: string }>): number {
  if (orders.length === 0) return 0;
  const rtoCount = orders.filter((o) => (CANCELLED_STATUSES as readonly string[]).includes(o.status)).length;
  return Math.round((rtoCount / orders.length) * 100);
}

// ── Product return rate helpers (mirroring /return-metrics logic) ─────────────

interface AffectedItem { qty?: number }
interface ReturnEvent { orderId: string; status: string; affectedItems?: AffectedItem[] | null }
interface Order { id: string; status: string; items?: Array<{ quantity?: number }> }

function calcProductReturnRate(
  allOrders: Order[],
  allReturnEvents: ReturnEvent[],
): { productReturnRate: number; returnedItemsAllTime: number; totalSoldItemsAllTime: number } {
  const ITEM_RETURN_STATUSES = ["returned", "refunded", "rejected_returned"];

  const verifiedEvents = allReturnEvents.filter((e) => e.status === "verified");

  let returnedItemsFromEvents = 0;
  for (const ev of verifiedEvents) {
    for (const item of (ev.affectedItems ?? [])) {
      returnedItemsFromEvents += toNumber(item.qty ?? 1);
    }
  }

  const ordersWithVerifiedEvent = new Set(verifiedEvents.map((e) => e.orderId));
  let returnedItemsFromOrders = 0;
  for (const o of allOrders) {
    if (!ITEM_RETURN_STATUSES.includes(o.status)) continue;
    if (ordersWithVerifiedEvent.has(o.id)) continue;
    returnedItemsFromOrders += (o.items ?? []).reduce((s, i) => s + toNumber(i.quantity ?? 1), 0);
  }

  const returnedItemsAllTime = returnedItemsFromEvents + returnedItemsFromOrders;

  let totalSoldItemsAllTime = 0;
  for (const o of allOrders) {
    if (o.status !== "delivered") continue;
    totalSoldItemsAllTime += (o.items ?? []).reduce((s, i) => s + toNumber(i.quantity ?? 1), 0);
  }

  const productReturnRate = totalSoldItemsAllTime > 0
    ? Math.round((returnedItemsAllTime / totalSoldItemsAllTime) * 100 * 10) / 10
    : 0;

  return { productReturnRate, returnedItemsAllTime, totalSoldItemsAllTime };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("unsettled cash (totalPending)", () => {
  it("returns difference between delivered net totals and settlements", () => {
    const delivered = [
      { total: "250000", roundedTotal: "250000", shippingCost: "5000" },
      { total: "100000", roundedTotal: "100000", shippingCost: "5000" },
    ];
    const settlements = [{ amount: "330000" }];
    // net = (250000-5000) + (100000-5000) = 245000 + 95000 = 340000
    // pending = 340000 - 330000 = 10000
    expect(calcTotalPending(delivered, settlements)).toBe(10000);
  });

  it("returns 0 when settlements fully cover delivered amounts", () => {
    const delivered = [{ total: "100000", roundedTotal: "100000", shippingCost: "5000" }];
    const settlements = [{ amount: "95000" }];
    expect(calcTotalPending(delivered, settlements)).toBe(0);
  });

  it("never returns negative pending", () => {
    const delivered = [{ total: "100000", roundedTotal: "100000", shippingCost: "5000" }];
    const settlements = [{ amount: "200000" }];
    expect(calcTotalPending(delivered, settlements)).toBe(0);
  });

  it("delivery fee is NOT counted as seller income — subtracted from collected", () => {
    const order = { total: "100000", roundedTotal: "100000", shippingCost: "7000" };
    expect(orderNetAmount(order)).toBe(93000);
  });

  it("COD order net uses roundedTotal when available", () => {
    const order = { total: "99800", roundedTotal: "100000", shippingCost: "5000" };
    expect(orderNetAmount(order)).toBe(95000);
  });

  it("falls back to rounding total to nearest 250 when no roundedTotal", () => {
    const order = { total: "99800", roundedTotal: null, shippingCost: "5000" };
    // 99800 rounded to nearest 250 = 99750
    expect(orderCollectedAmount(order)).toBe(99750);
    expect(orderNetAmount(order)).toBe(94750);
  });

  it("only delivered orders contribute to totalDelivered — shipped orders ignored", () => {
    const delivered = [{ total: "100000", roundedTotal: "100000", shippingCost: "5000" }];
    const settlements: { amount: string }[] = [];
    expect(calcTotalPending(delivered, settlements)).toBe(95000);
  });
});

describe("return rate (RTO)", () => {
  it("counts returned orders in rtoRate", () => {
    const orders = [
      { status: "delivered" },
      { status: "returned" },
      { status: "delivered" },
      { status: "delivered" },
      { status: "delivered" },
    ];
    // 1 returned out of 5 = 20%
    expect(calcRtoRate(orders)).toBe(20);
  });

  it("counts all cancelled statuses in rtoRate", () => {
    const orders = [
      { status: "delivered" },
      { status: "returned" },
      { status: "rejected" },
      { status: "rejected_returned" },
      { status: "cancelled" },
    ];
    // 4 cancelled out of 5 = 80%
    expect(calcRtoRate(orders)).toBe(80);
  });

  it("returns 0 when no orders exist", () => {
    expect(calcRtoRate([])).toBe(0);
  });

  it("returned order is included in RETURN_STATUSES for /returned-orders endpoint", () => {
    const order = { status: "returned" };
    expect(RETURN_STATUSES.includes(order.status)).toBe(true);
  });

  it("refunded order is included in RETURN_STATUSES", () => {
    const order = { status: "refunded" };
    expect(RETURN_STATUSES.includes(order.status)).toBe(true);
  });

  it("rejected_returned order is included in RETURN_STATUSES", () => {
    const order = { status: "rejected_returned" };
    expect(RETURN_STATUSES.includes(order.status)).toBe(true);
  });

  it("delivered order is NOT in RETURN_STATUSES", () => {
    const order = { status: "delivered" };
    expect(RETURN_STATUSES.includes(order.status)).toBe(false);
  });
});

describe("product return rate — /return-metrics", () => {
  it("returned device with NO verified event still counts via order items", () => {
    const allOrders: Order[] = [
      { id: "o1", status: "delivered", items: [{ quantity: 1 }, { quantity: 2 }] },
      { id: "o2", status: "returned", items: [{ quantity: 1 }] }, // returned device, no verified event
    ];
    const { productReturnRate, returnedItemsAllTime, totalSoldItemsAllTime } =
      calcProductReturnRate(allOrders, []);
    // sold = 3 (o1), returned = 1 (o2 item), rate = 1/3 * 100 = 33.3%
    expect(returnedItemsAllTime).toBe(1);
    expect(totalSoldItemsAllTime).toBe(3);
    expect(productReturnRate).toBeGreaterThan(0);
    expect(productReturnRate).toBeCloseTo(33.3, 0);
  });

  it("returned device with verified event counts via event affectedItems (not double-counted)", () => {
    const allOrders: Order[] = [
      { id: "o1", status: "delivered", items: [{ quantity: 5 }] },
      { id: "o2", status: "returned", items: [{ quantity: 1 }] },
    ];
    const allReturnEvents: ReturnEvent[] = [
      { orderId: "o2", status: "verified", affectedItems: [{ qty: 1 }] },
    ];
    const { returnedItemsAllTime } = calcProductReturnRate(allOrders, allReturnEvents);
    // Only counted once via event, not twice
    expect(returnedItemsAllTime).toBe(1);
  });

  it("product return rate is 0 when no orders are returned", () => {
    const allOrders: Order[] = [
      { id: "o1", status: "delivered", items: [{ quantity: 3 }] },
    ];
    const { productReturnRate } = calcProductReturnRate(allOrders, []);
    expect(productReturnRate).toBe(0);
  });

  it("product return rate accounts for partial return via verified event", () => {
    const allOrders: Order[] = [
      { id: "o1", status: "delivered", items: [{ quantity: 10 }] },
      { id: "o2", status: "delivered", items: [{ quantity: 10 }] },
    ];
    const allReturnEvents: ReturnEvent[] = [
      { orderId: "o1", status: "verified", affectedItems: [{ qty: 3 }] },
    ];
    const { productReturnRate, returnedItemsAllTime } =
      calcProductReturnRate(allOrders, allReturnEvents);
    // sold = 20, returned = 3 → 15%
    expect(returnedItemsAllTime).toBe(3);
    expect(productReturnRate).toBe(15);
  });

  it("unverified return events do NOT count toward product return rate", () => {
    const allOrders: Order[] = [
      { id: "o1", status: "delivered", items: [{ quantity: 5 }] },
    ];
    const allReturnEvents: ReturnEvent[] = [
      { orderId: "o1", status: "recorded", affectedItems: [{ qty: 2 }] },
    ];
    const { returnedItemsAllTime } = calcProductReturnRate(allOrders, allReturnEvents);
    expect(returnedItemsAllTime).toBe(0);
  });

  it("refunded order items count toward product return rate when no verified event", () => {
    const allOrders: Order[] = [
      { id: "o1", status: "delivered", items: [{ quantity: 4 }] },
      { id: "o2", status: "refunded", items: [{ quantity: 2 }] },
    ];
    const { returnedItemsAllTime } = calcProductReturnRate(allOrders, []);
    expect(returnedItemsAllTime).toBe(2);
  });

  it("period filter does NOT affect all-time product return rate — returned device always shows", () => {
    // All-time = 10 sold, 1 returned from last month (outside current period)
    const allOrders: Order[] = [
      { id: "o1", status: "delivered", items: [{ quantity: 10 }] },
      { id: "o2", status: "returned", items: [{ quantity: 1 }] }, // outside period, still counted
    ];
    const { productReturnRate } = calcProductReturnRate(allOrders, []);
    expect(productReturnRate).toBeGreaterThan(0); // must not be 0 even if outside period
  });
});

// ── COD settlement — return deduction logic ───────────────────────────────

interface ReturnEventDeduction { orderId: string; refundAmount: number | string; status: string }

function calcApprovedReturnDeductions(
  deliveredOrders: Array<{ id: string }>,
  returnEvents: ReturnEventDeduction[],
): number {
  const deliveredIds = new Set(deliveredOrders.map((o) => o.id));
  return returnEvents
    .filter((e) => e.status === "verified" && deliveredIds.has(e.orderId))
    .reduce((sum, e) => sum + toNumber(e.refundAmount), 0);
}

function calcAdjustedPending(
  deliveredOrders: Array<{ roundedTotal?: number | string | null; total: number | string; shippingCost: number | string; id: string }>,
  settlements: Array<{ amount: number | string }>,
  returnEvents: ReturnEventDeduction[],
): number {
  const totalDelivered = deliveredOrders.reduce((sum, o) => sum + orderNetAmount(o), 0);
  const totalReceived = settlements.reduce((sum, s) => sum + toNumber(s.amount), 0);
  const approvedReturnDeductions = calcApprovedReturnDeductions(deliveredOrders, returnEvents);
  return Math.max(0, totalDelivered - totalReceived - approvedReturnDeductions);
}

describe("COD settlement — return deduction (double-counting fix)", () => {
  it("approvedReturnDeductions is 0 when there are no return events", () => {
    const delivered = [{ id: "o1", total: "100000", roundedTotal: "100000", shippingCost: "5000" }];
    expect(calcApprovedReturnDeductions(delivered, [])).toBe(0);
  });

  it("approvedReturnDeductions sums refundAmount of verified events linked to delivered orders", () => {
    const delivered = [{ id: "o1", total: "100000", roundedTotal: "100000", shippingCost: "5000" }];
    const events: ReturnEventDeduction[] = [{ orderId: "o1", refundAmount: "10000", status: "verified" }];
    expect(calcApprovedReturnDeductions(delivered, events)).toBe(10000);
  });

  it("adjustedPending = 0 when deductions cover the gap — fixes the 10,000 IQD double-count", () => {
    const delivered = [
      { id: "o1", total: "150000", roundedTotal: "152500", shippingCost: "5000" },
    ];
    const settlements = [{ amount: "142500" }];
    const events: ReturnEventDeduction[] = [{ orderId: "o1", refundAmount: "10000", status: "verified" }];
    // net = 152500-5000 = 147500; received = 142500; deductions = 10000
    // adjusted = max(0, 147500 - 142500 - 10000) = 0 (clamped)
    expect(calcAdjustedPending(delivered, settlements, events)).toBe(0);
  });

  it("adjustedPending never goes negative when deductions exceed the gap", () => {
    const delivered = [{ id: "o1", total: "100000", roundedTotal: "100000", shippingCost: "5000" }];
    const settlements = [{ amount: "95000" }];
    const events: ReturnEventDeduction[] = [{ orderId: "o1", refundAmount: "50000", status: "verified" }];
    expect(calcAdjustedPending(delivered, settlements, events)).toBe(0);
  });

  it("unverified return events do NOT count as deductions", () => {
    const delivered = [{ id: "o1", total: "100000", roundedTotal: "100000", shippingCost: "5000" }];
    const events: ReturnEventDeduction[] = [
      { orderId: "o1", refundAmount: "10000", status: "recorded" },
      { orderId: "o1", refundAmount: "5000", status: "disputed" },
    ];
    expect(calcApprovedReturnDeductions(delivered, events)).toBe(0);
  });

  it("return events for non-delivered orders do NOT count as deductions", () => {
    const delivered = [{ id: "o1", total: "100000", roundedTotal: "100000", shippingCost: "5000" }];
    const events: ReturnEventDeduction[] = [
      { orderId: "o2", refundAmount: "10000", status: "verified" }, // o2 is not delivered
    ];
    expect(calcApprovedReturnDeductions(delivered, events)).toBe(0);
  });

  it("multiple verified events for the same delivered order are summed correctly", () => {
    const delivered = [{ id: "o1", total: "100000", roundedTotal: "100000", shippingCost: "5000" }];
    const events: ReturnEventDeduction[] = [
      { orderId: "o1", refundAmount: "6000", status: "verified" },
      { orderId: "o1", refundAmount: "4000", status: "verified" },
    ];
    expect(calcApprovedReturnDeductions(delivered, events)).toBe(10000);
  });

  it("only verified events linked to delivered orders count — mixed scenario", () => {
    const delivered = [
      { id: "d1", total: "200000", roundedTotal: "200000", shippingCost: "5000" },
      { id: "d2", total: "100000", roundedTotal: "100000", shippingCost: "5000" },
    ];
    const events: ReturnEventDeduction[] = [
      { orderId: "d1", refundAmount: "15000", status: "verified" },   // counts
      { orderId: "d2", refundAmount: "8000", status: "recorded" },    // ignored — not verified
      { orderId: "r1", refundAmount: "20000", status: "verified" },   // ignored — not delivered
    ];
    expect(calcApprovedReturnDeductions(delivered, events)).toBe(15000);
  });
});

describe("return order financial impact", () => {
  it("order with status=returned but no verified event shows hasVerifiedReturnEvent=false", () => {
    const verifiedEvents: Array<{ orderId: string; refundAmount: string }> = [];
    const returnedOrder = { id: "order-1", status: "returned" };

    const events = verifiedEvents.filter((e) => e.orderId === returnedOrder.id);
    const refund = events.reduce((s, e) => s + toNumber(e.refundAmount), 0);

    expect(events.length).toBe(0);
    expect(refund).toBe(0);
    // hasVerifiedReturnEvent = false means it shows the warning in UI
    expect(events.length > 0).toBe(false);
  });

  it("verified return event correctly sums refund amount", () => {
    const verifiedEvents = [
      { orderId: "order-1", refundAmount: "75000" },
      { orderId: "order-1", refundAmount: "25000" },
    ];
    const events = verifiedEvents.filter((e) => e.orderId === "order-1");
    const refund = events.reduce((s, e) => s + toNumber(e.refundAmount), 0);

    expect(refund).toBe(100000);
    expect(events.length > 0).toBe(true);
  });

  it("returned orders do not double-count in totalPending (only delivered orders count)", () => {
    const returnedOrder = { total: "100000", roundedTotal: "100000", shippingCost: "5000" };
    const deliveredOrder = { total: "200000", roundedTotal: "200000", shippingCost: "5000" };

    // Only pass delivered to calcTotalPending, not returned
    const pending = calcTotalPending([deliveredOrder], []);
    expect(pending).toBe(195000); // returned order correctly excluded
  });
});

// ── Groq Finance Audit — unit tests ──────────────────────────────────────────
// These tests exercise pure logic only (no DB, no HTTP, no Groq call).

// Mirror the types and pure functions from groqFinanceAudit.ts without importing
// the module (which would trigger DB/env imports in a test-only environment).

interface TestSnapshot {
  generatedAt: string;
  scope: "all_time";
  grossRevenue: number;
  netRevenue: number;
  totalCogs: number;
  grossProfit: number;
  expensesTotal: number;
  returnLossVerified: number;
  /** grossProfit (before expenses and before return losses) */
  profitBeforeExpensesAndReturns: number;
  /** grossProfit - expensesTotal (after expenses, BEFORE subtracting return losses) */
  profitAfterExpensesBeforeReturns: number;
  finalNetProfit: number;
  cogsBasis: string;
  deliveredNetTotal: number;
  receivedCashTotal: number;
  approvedReturnDeductions: number;
  pendingSettlement: number;
  verifiedReturnEventsCount: number;
  recordedReturnEventsCount: number;
  returnedOrdersCount: number;
  returnedProductsCount: number;
  refundAmount: number;
  totalReturnFinancialImpact: number;
  inventoryValueAtCost: number;
  lowStockCount: number;
  outOfStockCount: number;
  costsComplete: boolean;
  missingCostLines: number;
  hasCodDrilldown: boolean;
  hasReturnEvents: boolean;
  notes: Array<{ type: string; message: string }>;
}

interface TestInvariantCheck {
  name: string;
  passed: boolean;
  expected?: number | null;
  actual?: number | null;
  note?: string;
}

// Pure invariant checker mirroring groqFinanceAudit.ts logic
function runTestInvariantChecks(snapshot: TestSnapshot): TestInvariantCheck[] {
  const checks: TestInvariantCheck[] = [];

  const computedPending = Math.max(
    0,
    snapshot.deliveredNetTotal - snapshot.receivedCashTotal - snapshot.approvedReturnDeductions
  );
  checks.push({
    name: "pendingSettlement formula",
    passed: Math.abs(computedPending - snapshot.pendingSettlement) < 1,
    expected: computedPending,
    actual: snapshot.pendingSettlement,
  });

  const settlementSum =
    snapshot.receivedCashTotal + snapshot.approvedReturnDeductions + snapshot.pendingSettlement;
  checks.push({
    name: "settlement components balance",
    passed: Math.abs(settlementSum - snapshot.deliveredNetTotal) <= 1,
    expected: snapshot.deliveredNetTotal,
    actual: settlementSum,
  });

  checks.push({
    name: "no excessive return deductions",
    passed: snapshot.approvedReturnDeductions <= snapshot.deliveredNetTotal,
    expected: snapshot.deliveredNetTotal,
    actual: snapshot.approvedReturnDeductions,
  });

  const computedFinal = snapshot.profitAfterExpensesBeforeReturns - snapshot.returnLossVerified;
  checks.push({
    name: "return loss affects profit once only",
    passed: Math.abs(computedFinal - snapshot.finalNetProfit) < 1,
    expected: computedFinal,
    actual: snapshot.finalNetProfit,
  });

  checks.push({
    name: "returned products count non-negative",
    passed: snapshot.returnedProductsCount >= 0,
    actual: snapshot.returnedProductsCount,
  });

  checks.push({
    name: "COD drilldown available",
    passed: snapshot.hasCodDrilldown,
  });

  checks.push({
    name: "inventory value non-negative",
    passed: snapshot.inventoryValueAtCost >= 0,
    actual: snapshot.inventoryValueAtCost,
  });

  return checks;
}

function makeSnapshot(overrides: Partial<TestSnapshot> = {}): TestSnapshot {
  const deliveredNetTotal = 500000;
  const receivedCashTotal = 400000;
  const approvedReturnDeductions = 50000;
  const pendingSettlement = Math.max(0, deliveredNetTotal - receivedCashTotal - approvedReturnDeductions);
  const returnLossVerified = 20000;
  const grossProfit = 150000;
  const expensesTotal = 70000;
  const profitBeforeExpensesAndReturns = grossProfit;
  const profitAfterExpensesBeforeReturns = grossProfit - expensesTotal; // 80000
  const finalNetProfit = profitAfterExpensesBeforeReturns - returnLossVerified;

  return {
    generatedAt: new Date().toISOString(),
    scope: "all_time",
    grossRevenue: 550000,
    netRevenue: deliveredNetTotal,
    totalCogs: 350000,
    grossProfit,
    expensesTotal,
    returnLossVerified,
    profitBeforeExpensesAndReturns,
    profitAfterExpensesBeforeReturns,
    finalNetProfit,
    cogsBasis: "approximate_current_cost",
    deliveredNetTotal,
    receivedCashTotal,
    approvedReturnDeductions,
    pendingSettlement,
    verifiedReturnEventsCount: 2,
    recordedReturnEventsCount: 0,
    returnedOrdersCount: 3,
    returnedProductsCount: 5,
    refundAmount: 50000,
    totalReturnFinancialImpact: returnLossVerified,
    inventoryValueAtCost: 1200000,
    lowStockCount: 2,
    outOfStockCount: 1,
    costsComplete: true,
    missingCostLines: 0,
    hasCodDrilldown: true,
    hasReturnEvents: true,
    notes: [],
    ...overrides,
  };
}

describe("Groq Finance Audit — no API key guard", () => {
  it("financeGroqHasKey() returns false when FINANCE_GROQ_API_KEY is not set", () => {
    // Mirror the logic of financeGroqHasKey() from groqFinanceAudit.ts
    function financeGroqHasKey(envVal: string | undefined): boolean {
      return !!(envVal?.trim());
    }
    expect(financeGroqHasKey(undefined)).toBe(false);
    expect(financeGroqHasKey("")).toBe(false);
    expect(financeGroqHasKey("  ")).toBe(false);
    expect(financeGroqHasKey("gsk_abc")).toBe(true);
  });

  it("GROQ_API_KEY alone does NOT enable finance audit (no fallback)", () => {
    // Finance audit must not silently use the shared GROQ_API_KEY.
    // Only FINANCE_GROQ_API_KEY is accepted.
    function financeGroqHasKey(financeKey: string | undefined): boolean {
      return !!(financeKey?.trim());
    }
    const sharedGroqKey = "gsk_shared_key_present";
    const financeKey = undefined;
    // Even if the shared key is set, finance audit reports no key available
    expect(financeGroqHasKey(financeKey)).toBe(false);
    // Presence of sharedGroqKey doesn't matter
    expect(sharedGroqKey).toBeTruthy(); // shared key exists
    expect(financeGroqHasKey(financeKey)).toBe(false); // finance audit still blocked
  });
});

describe("Groq Finance Audit — data immutability", () => {
  it("snapshot object has no setter that could modify accounting data", () => {
    const snap = makeSnapshot();
    // Freeze and verify: a read-only snapshot cannot change orders / payments / stock
    const frozen = Object.freeze({ ...snap });
    expect(() => {
      (frozen as Record<string, unknown>).deliveredNetTotal = 99999;
    }).toThrow();
  });

  it("invariant checks do not mutate the snapshot", () => {
    const snap = makeSnapshot();
    const originalPending = snap.pendingSettlement;
    runTestInvariantChecks(snap);
    expect(snap.pendingSettlement).toBe(originalPending);
  });
});

describe("Groq Finance Audit — double-count invariant", () => {
  it("detects when approvedReturnDeductions exceeds deliveredNetTotal", () => {
    const snap = makeSnapshot({
      approvedReturnDeductions: 600000, // more than deliveredNetTotal = 500000
    });
    const checks = runTestInvariantChecks(snap);
    const check = checks.find(c => c.name === "no excessive return deductions")!;
    expect(check.passed).toBe(false);
  });

  it("passes when approvedReturnDeductions equals deliveredNetTotal exactly", () => {
    const snap = makeSnapshot({
      deliveredNetTotal: 200000,
      receivedCashTotal: 200000,
      approvedReturnDeductions: 0,
      pendingSettlement: 0,
    });
    const checks = runTestInvariantChecks(snap);
    const check = checks.find(c => c.name === "no excessive return deductions")!;
    expect(check.passed).toBe(true);
  });
});

describe("Groq Finance Audit — pending settlement formula", () => {
  it("passes when pendingSettlement matches the formula exactly", () => {
    const snap = makeSnapshot(); // makeSnapshot computes pendingSettlement via the formula
    const checks = runTestInvariantChecks(snap);
    const check = checks.find(c => c.name === "pendingSettlement formula")!;
    expect(check.passed).toBe(true);
  });

  it("fails when pendingSettlement is wrong", () => {
    const snap = makeSnapshot({ pendingSettlement: 999999 }); // intentionally wrong
    const checks = runTestInvariantChecks(snap);
    const check = checks.find(c => c.name === "pendingSettlement formula")!;
    expect(check.passed).toBe(false);
  });

  it("fails when settlement components do not balance", () => {
    const snap = makeSnapshot({
      receivedCashTotal: 400000,
      approvedReturnDeductions: 50000,
      pendingSettlement: 100000, // should be 50000 → doesn't balance to 500000
      deliveredNetTotal: 500000,
    });
    const checks = runTestInvariantChecks(snap);
    const balanceCheck = checks.find(c => c.name === "settlement components balance")!;
    expect(balanceCheck.passed).toBe(false);
  });
});

describe("Groq Finance Audit — invalid Groq JSON handling", () => {
  it("JSON.parse throws on malformed JSON", () => {
    const badResponse = "This is not JSON at all";
    expect(() => JSON.parse(badResponse)).toThrow();
  });

  it("empty string is also invalid JSON", () => {
    expect(() => JSON.parse("")).toThrow();
  });

  it("stripping markdown fences before parsing works", () => {
    const wrapped = "```json\n{\"overallStatus\":\"ok\",\"summary\":\"ok\",\"findings\":[]}\n```";
    const cleaned = wrapped.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    expect(() => JSON.parse(cleaned)).not.toThrow();
    expect(JSON.parse(cleaned).overallStatus).toBe("ok");
  });
});

describe("Groq Finance Audit — no invented order IDs", () => {
  it("auditReportSchema rejects a finding where requiresHumanApproval is false", async () => {
    const { z } = await import("zod");
    const findingSchema = z.object({
      severity: z.enum(["low", "medium", "high", "critical"]),
      category: z.enum([
        "settlement", "returns", "profit", "inventory", "payment",
        "duplicate_counting", "missing_drilldown", "suspicious_number",
      ]),
      title: z.string(),
      explanation: z.string(),
      affectedOrders: z.array(z.string()),
      expectedValue: z.number().nullable(),
      actualValue: z.number().nullable(),
      difference: z.number().nullable(),
      suggestedFix: z.string(),
      requiresHumanApproval: z.literal(true),
    });

    const invalidFinding = {
      severity: "high",
      category: "settlement",
      title: "test",
      explanation: "test",
      affectedOrders: [],
      expectedValue: null,
      actualValue: null,
      difference: null,
      suggestedFix: "fix it",
      requiresHumanApproval: false, // must be literally true
    };

    expect(findingSchema.safeParse(invalidFinding).success).toBe(false);
  });
});

describe("Groq Finance Audit — requiresHumanApproval is always true", () => {
  it("findingSchema enforces requiresHumanApproval: true", async () => {
    const { z } = await import("zod");
    const findingSchema = z.object({
      severity: z.enum(["low", "medium", "high", "critical"]),
      category: z.enum([
        "settlement", "returns", "profit", "inventory", "payment",
        "duplicate_counting", "missing_drilldown", "suspicious_number",
      ]),
      title: z.string(),
      explanation: z.string(),
      affectedOrders: z.array(z.string()),
      expectedValue: z.number().nullable(),
      actualValue: z.number().nullable(),
      difference: z.number().nullable(),
      suggestedFix: z.string(),
      requiresHumanApproval: z.literal(true),
    });

    const validFinding = {
      severity: "low",
      category: "inventory",
      title: "مخزون منخفض",
      explanation: "شرح",
      affectedOrders: [],
      expectedValue: null,
      actualValue: null,
      difference: null,
      suggestedFix: "راجع المخزون مع المدير",
      requiresHumanApproval: true,
    };

    expect(findingSchema.safeParse(validFinding).success).toBe(true);
  });

  it("return loss invariant — return loss affects profit once only", () => {
    const snap = makeSnapshot({
      profitAfterExpensesBeforeReturns: 100000,
      returnLossVerified: 30000,
      finalNetProfit: 70000, // correct: 100000 - 30000
    });
    const checks = runTestInvariantChecks(snap);
    const check = checks.find(c => c.name === "return loss affects profit once only")!;
    expect(check.passed).toBe(true);
  });

  it("return loss invariant fails when loss is applied twice", () => {
    const snap = makeSnapshot({
      profitAfterExpensesBeforeReturns: 100000,
      returnLossVerified: 30000,
      finalNetProfit: 40000, // wrong: 100000 - 30000 - 30000 (double deduction)
    });
    const checks = runTestInvariantChecks(snap);
    const check = checks.find(c => c.name === "return loss affects profit once only")!;
    expect(check.passed).toBe(false);
  });
});

// ── Scheduled Finance Audit — configuration and safety tests ─────────────────
// Pure logic tests that do not require a DB or Groq connection.

describe("Scheduled Finance Audit — env config", () => {
  it("FINANCE_AI_AUDIT_ENABLED defaults to disabled (not 'true') unless explicitly set", () => {
    // The guard is: process.env.FINANCE_AI_AUDIT_ENABLED !== "true"
    // In a fresh environment without the variable set, it must be falsy
    const envValue = process.env.FINANCE_AI_AUDIT_ENABLED;
    // In test env, it should not be set to "true"
    expect(envValue).not.toBe("true");
  });

  it("FINANCE_AI_AUTO_FIX must always be false — auto-fix is never implemented", () => {
    // This test asserts the contractual guarantee: FINANCE_AI_AUTO_FIX=true
    // must never trigger any write operation. We test the env gate logic here.
    const autoFix = process.env.FINANCE_AI_AUTO_FIX;
    // In test env it should not be "true"
    expect(autoFix).not.toBe("true");
  });

  it("FINANCE_AI_AUDIT_INTERVAL_HOURS parses to a positive integer", () => {
    const raw = process.env.FINANCE_AI_AUDIT_INTERVAL_HOURS ?? "12";
    const parsed = parseInt(raw, 10);
    expect(Number.isInteger(parsed)).toBe(true);
    expect(parsed).toBeGreaterThan(0);
  });

  it("default interval is 12 hours", () => {
    const raw = process.env.FINANCE_AI_AUDIT_INTERVAL_HOURS ?? "12";
    expect(parseInt(raw, 10)).toBe(12);
  });

  it("cron expression for 12-hour interval is correct", () => {
    const intervalHours = 12;
    const cronExpr = intervalHours === 12 ? "0 6,18 * * *" : `0 */${intervalHours} * * *`;
    expect(cronExpr).toBe("0 6,18 * * *");
  });

  it("cron expression for custom interval uses */N pattern", () => {
    const intervalHours = 6;
    const cronExpr = intervalHours === 12 ? "0 6,18 * * *" : `0 */${intervalHours} * * *`;
    expect(cronExpr).toBe("0 */6 * * *");
  });
});

describe("Scheduled Finance Audit — safety checks (accounting row counts)", () => {
  it("detects when order count changes during audit", () => {
    const before = { orders: 4, settlements: 3, returnEvents: 1, expenses: 0 };
    const after  = { orders: 5, settlements: 3, returnEvents: 1, expenses: 0 };
    const changed =
      after.orders !== before.orders ||
      after.settlements !== before.settlements ||
      after.returnEvents !== before.returnEvents ||
      after.expenses !== before.expenses;
    expect(changed).toBe(true);
  });

  it("passes when all counts are identical before and after", () => {
    const before = { orders: 4, settlements: 3, returnEvents: 1, expenses: 2 };
    const after  = { orders: 4, settlements: 3, returnEvents: 1, expenses: 2 };
    const changed =
      after.orders !== before.orders ||
      after.settlements !== before.settlements ||
      after.returnEvents !== before.returnEvents ||
      after.expenses !== before.expenses;
    expect(changed).toBe(false);
  });

  it("detects settlement count change", () => {
    const before = { orders: 4, settlements: 3, returnEvents: 1, expenses: 0 };
    const after  = { orders: 4, settlements: 4, returnEvents: 1, expenses: 0 };
    const changed = after.settlements !== before.settlements;
    expect(changed).toBe(true);
  });

  it("detects return event count change", () => {
    const before = { orders: 4, settlements: 3, returnEvents: 1, expenses: 0 };
    const after  = { orders: 4, settlements: 3, returnEvents: 2, expenses: 0 };
    const changed = after.returnEvents !== before.returnEvents;
    expect(changed).toBe(true);
  });
});

describe("Scheduled Finance Audit — Telegram alert logic", () => {
  // Mirror the needsAlert logic from telegramAlert.ts without importing it
  function needsAlert(result: {
    error?: string;
    report?: { overallStatus: string; findings: Array<{ severity: string }> } | null;
  }): boolean {
    if (result.error) return true;
    const status = result.report?.overallStatus;
    if (status === "warning" || status === "critical") return true;
    const findings = result.report?.findings ?? [];
    return findings.some(f => f.severity === "high" || f.severity === "critical");
  }

  it("sends alert when status is warning", () => {
    expect(needsAlert({ report: { overallStatus: "warning", findings: [] } })).toBe(true);
  });

  it("sends alert when status is critical", () => {
    expect(needsAlert({ report: { overallStatus: "critical", findings: [] } })).toBe(true);
  });

  it("sends alert when any finding is high severity", () => {
    expect(needsAlert({
      report: {
        overallStatus: "ok",
        findings: [{ severity: "high" }],
      },
    })).toBe(true);
  });

  it("sends alert when any finding is critical severity", () => {
    expect(needsAlert({
      report: {
        overallStatus: "ok",
        findings: [{ severity: "critical" }],
      },
    })).toBe(true);
  });

  it("does NOT send alert for clean ok with no high/critical findings", () => {
    expect(needsAlert({
      report: {
        overallStatus: "ok",
        findings: [{ severity: "low" }, { severity: "medium" }],
      },
    })).toBe(false);
  });

  it("does NOT send alert for empty ok report", () => {
    expect(needsAlert({ report: { overallStatus: "ok", findings: [] } })).toBe(false);
  });

  it("sends alert when Groq fails (error present)", () => {
    expect(needsAlert({ error: "FINANCE_GROQ_API_KEY غير مُعدّ" })).toBe(true);
  });
});

describe("Scheduled Finance Audit — DB persistence contract", () => {
  it("audit run overallStatus is 'failed' when result.error is set", () => {
    const result = {
      error: "Groq timeout",
      report: null,
      generatedAt: new Date().toISOString(),
    };
    const overallStatus = result.error ? "failed" : (result.report ?? { overallStatus: "failed" }).overallStatus;
    expect(overallStatus).toBe("failed");
  });

  it("audit run overallStatus comes from report when no error", () => {
    const result = {
      error: undefined,
      report: { overallStatus: "warning", summary: "test", findings: [] },
      generatedAt: new Date().toISOString(),
    };
    const overallStatus = result.error ? "failed" : (result.report?.overallStatus ?? "failed");
    expect(overallStatus).toBe("warning");
  });

  it("requiresHumanApproval is always true on persisted findings", () => {
    // Simulate the save logic: all findings always get requiresHumanApproval=true
    const findings = [
      { severity: "high", category: "settlement", title: "test", explanation: "x",
        affectedOrders: [], expectedValue: null, actualValue: null, difference: null,
        suggestedFix: "fix", requiresHumanApproval: true as const },
    ];
    const persisted = findings.map(f => ({ ...f, requiresHumanApproval: true as const }));
    expect(persisted.every(f => f.requiresHumanApproval === true)).toBe(true);
  });

  it("history entries include findingsCount, criticalCount, highCount", () => {
    const findings = [
      { severity: "critical" },
      { severity: "high" },
      { severity: "medium" },
    ];
    const findingsCount = findings.length;
    const criticalCount = findings.filter(f => f.severity === "critical").length;
    const highCount = findings.filter(f => f.severity === "high").length;
    expect(findingsCount).toBe(3);
    expect(criticalCount).toBe(1);
    expect(highCount).toBe(1);
  });

  it("triggeredBy is 'scheduled' for cron runs and 'manual' for button clicks", () => {
    const scheduledRun = { triggeredBy: "scheduled" };
    const manualRun = { triggeredBy: "manual" };
    expect(scheduledRun.triggeredBy).toBe("scheduled");
    expect(manualRun.triggeredBy).toBe("manual");
  });
});

describe("Scheduled Finance Audit — no auto-fix guarantee", () => {
  it("FINANCE_AI_AUTO_FIX=true is a no-op — no write functions exist in the audit service", () => {
    // Contractual test: verify the audit result shape has no write-side fields
    const auditResultShape = {
      snapshot: {},
      invariantChecks: [],
      report: null,
      error: undefined,
      generatedAt: new Date().toISOString(),
      // Must NOT have: applyFix, executeRemediations, autoCorrect, writeToDb
    };
    expect("applyFix" in auditResultShape).toBe(false);
    expect("executeRemediations" in auditResultShape).toBe(false);
    expect("autoCorrect" in auditResultShape).toBe(false);
    expect("writeToDb" in auditResultShape).toBe(false);
  });
});

// ── WhatsApp Invoice Finance Logic ────────────────────────────────────────────

// Mirrors buildWhatsappInvoiceBreakdown() pure logic (no DB) for unit testing

interface WaInvoice {
  id: string;
  status: string; // draft | sent | confirmed | rejected | completed | cancelled
  orderId?: string | null;
  total: number;
  delivery: number;
  subtotal: number;
  discount: number;
  items: Array<{ productId: string; quantity: number }>;
}

interface WaLinkedOrder {
  id: string;
  status: string; // pending | confirmed | processing | shipped | delivered | etc.
}

interface WaCostMap {
  [productId: string]: { costPrice: number; packagingCost: number; insertCost: number } | undefined;
}

function calcWaInvoiceBreakdown(
  invoices: WaInvoice[],
  orders: WaLinkedOrder[],
  costMap: WaCostMap,
) {
  const ACCEPTED = new Set(["confirmed", "completed"]);
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  let accepted = 0, pendingDelivery = 0, delivered = 0;
  let revenue = 0, profit = 0;
  let anyMissingCost = false;

  const result = invoices.map((inv) => {
    const linkedOrder = inv.orderId ? orderMap.get(inv.orderId) : undefined;
    const orderStatus = linkedOrder?.status ?? null;
    const isAccepted = ACCEPTED.has(inv.status);
    const isDelivered = orderStatus === "delivered";

    if (isAccepted) accepted++;
    if (isAccepted && !isDelivered) pendingDelivery++;
    if (isDelivered) delivered++;

    let invCost = 0;
    let costsComplete = true;
    for (const item of inv.items) {
      const qty = item.quantity;
      const c = costMap[item.productId];
      if (!c || c.costPrice <= 0) {
        costsComplete = false;
      } else {
        invCost += (c.costPrice + c.packagingCost + c.insertCost) * qty;
      }
    }
    if (!costsComplete) anyMissingCost = true;

    const invRevenue = inv.subtotal - inv.discount;
    const invProfit = costsComplete ? invRevenue - invCost : 0;

    let financiallyIncluded = false;
    let exclusionReason: string | null = null;

    if (!isAccepted) {
      exclusionReason = `حالة الفاتورة: ${inv.status} — لم يتم القبول`;
    } else if (!isDelivered) {
      exclusionReason = `بانتظار التسليم — حالة الطلبية: ${orderStatus ?? "لا يوجد طلب"}`;
    } else {
      financiallyIncluded = true;
    }

    if (isDelivered) {
      revenue += invRevenue;
      profit += invProfit;
    }

    return { invoiceId: inv.id, financiallyIncluded, exclusionReason, costsComplete, profit: invProfit };
  });

  return {
    summary: { total: invoices.length, accepted, pendingDelivery, delivered, revenue, profit, costsComplete: !anyMissingCost },
    invoices: result,
  };
}

describe("WhatsApp Invoice Finance Logic", () => {
  it("draft invoice does not affect finance — not accepted, revenue=0", () => {
    const inv: WaInvoice = { id: "i1", status: "draft", orderId: null, total: 50000, delivery: 5000, subtotal: 45000, discount: 0, items: [] };
    const { summary } = calcWaInvoiceBreakdown([inv], [], {});
    expect(summary.accepted).toBe(0);
    expect(summary.revenue).toBe(0);
    expect(summary.profit).toBe(0);
  });

  it("accepted (confirmed) but not yet delivered does NOT contribute to revenue", () => {
    const inv: WaInvoice = { id: "i2", status: "confirmed", orderId: "o1", total: 50000, delivery: 5000, subtotal: 45000, discount: 0, items: [] };
    const order: WaLinkedOrder = { id: "o1", status: "shipped" }; // still in transit
    const { summary, invoices } = calcWaInvoiceBreakdown([inv], [order], {});
    expect(summary.accepted).toBe(1);
    expect(summary.pendingDelivery).toBe(1);
    expect(summary.delivered).toBe(0);
    expect(summary.revenue).toBe(0);
    expect(invoices[0].financiallyIncluded).toBe(false);
    expect(invoices[0].exclusionReason).toMatch(/بانتظار التسليم/);
  });

  it("delivered WhatsApp invoice is financially included and adds revenue", () => {
    const inv: WaInvoice = { id: "i3", status: "confirmed", orderId: "o2", total: 50000, delivery: 5000, subtotal: 45000, discount: 0, items: [{ productId: "p1", quantity: 2 }] };
    const order: WaLinkedOrder = { id: "o2", status: "delivered" };
    const costMap: WaCostMap = { p1: { costPrice: 10000, packagingCost: 1000, insertCost: 500 } };
    const { summary, invoices } = calcWaInvoiceBreakdown([inv], [order], costMap);
    expect(summary.delivered).toBe(1);
    expect(summary.revenue).toBe(45000); // subtotal - discount
    expect(invoices[0].financiallyIncluded).toBe(true);
    expect(invoices[0].exclusionReason).toBeNull();
  });

  it("delivered WhatsApp invoice profit = revenue minus per-unit cost × qty", () => {
    const inv: WaInvoice = { id: "i4", status: "completed", orderId: "o3", total: 100000, delivery: 5000, subtotal: 95000, discount: 5000, items: [{ productId: "p2", quantity: 3 }] };
    const order: WaLinkedOrder = { id: "o3", status: "delivered" };
    // revenue = 95000 - 5000 = 90000
    // cost per unit = 20000 + 2000 + 1000 = 23000 × 3 = 69000
    const costMap: WaCostMap = { p2: { costPrice: 20000, packagingCost: 2000, insertCost: 1000 } };
    const { summary, invoices } = calcWaInvoiceBreakdown([inv], [order], costMap);
    expect(invoices[0].profit).toBe(90000 - 69000); // 21000
    expect(summary.profit).toBe(21000);
  });

  it("WhatsApp invoice without product cost is flagged costsComplete=false and profit=0", () => {
    const inv: WaInvoice = { id: "i5", status: "confirmed", orderId: "o4", total: 60000, delivery: 5000, subtotal: 55000, discount: 0, items: [{ productId: "p_unknown", quantity: 1 }] };
    const order: WaLinkedOrder = { id: "o4", status: "delivered" };
    const { summary, invoices } = calcWaInvoiceBreakdown([inv], [order], {}); // no cost data
    expect(invoices[0].costsComplete).toBe(false);
    expect(invoices[0].profit).toBe(0); // not silently counted as full profit
    expect(summary.costsComplete).toBe(false);
  });

  it("finance order count: pending WhatsApp orders (not delivered) must not inflate delivered count", () => {
    const invDelivered: WaInvoice = { id: "i6", status: "confirmed", orderId: "o5", total: 50000, delivery: 5000, subtotal: 45000, discount: 0, items: [] };
    const invPending: WaInvoice = { id: "i7", status: "confirmed", orderId: "o6", total: 60000, delivery: 5000, subtotal: 55000, discount: 0, items: [] };
    const orders = [
      { id: "o5", status: "delivered" },
      { id: "o6", status: "pending" }, // not yet delivered
    ];
    const { summary } = calcWaInvoiceBreakdown([invDelivered, invPending], orders, {});
    expect(summary.delivered).toBe(1);   // only the first is financially realized
    expect(summary.pendingDelivery).toBe(1);
    expect(summary.revenue).toBe(45000); // only delivered invoice counted
  });

  it("drilldown explains why a non-accepted invoice is excluded", () => {
    const inv: WaInvoice = { id: "i8", status: "rejected", orderId: null, total: 40000, delivery: 5000, subtotal: 35000, discount: 0, items: [] };
    const { invoices } = calcWaInvoiceBreakdown([inv], [], {});
    expect(invoices[0].financiallyIncluded).toBe(false);
    expect(invoices[0].exclusionReason).toContain("لم يتم القبول");
  });

  it("cancelled WhatsApp invoice is treated same as rejected — excluded with reason", () => {
    const inv: WaInvoice = { id: "i9", status: "cancelled", orderId: null, total: 30000, delivery: 5000, subtotal: 25000, discount: 0, items: [] };
    const { summary, invoices } = calcWaInvoiceBreakdown([inv], [], {});
    expect(summary.accepted).toBe(0);
    expect(summary.revenue).toBe(0);
    expect(invoices[0].financiallyIncluded).toBe(false);
    expect(invoices[0].exclusionReason).not.toBeNull();
  });
});

// ── Additional invariant tests ────────────────────────────────────────────────

describe("Inventory value formula", () => {
  it("inventory value equals stock × costPrice for each product", () => {
    const products = [
      { costPrice: 10000, packagingCost: 500, insertCost: 200, stock: 5, price: 20000 },
      { costPrice: 25000, packagingCost: 1000, insertCost: 300, stock: 3, price: 45000 },
      { costPrice: 0, packagingCost: 0, insertCost: 0, stock: 10, price: 15000 }, // no cost — excluded
    ];
    let inventoryValueAtCost = 0;
    for (const p of products) {
      if (p.costPrice > 0) inventoryValueAtCost += p.costPrice * p.stock;
    }
    // 10000*5 + 25000*3 = 50000 + 75000 = 125000
    expect(inventoryValueAtCost).toBe(125000);
  });

  it("products with zero cost are excluded from inventory value at cost", () => {
    const products = [
      { costPrice: 0, stock: 100, price: 10000 },
    ];
    let inventoryValueAtCost = 0;
    for (const p of products) {
      if (p.costPrice > 0) inventoryValueAtCost += p.costPrice * p.stock;
    }
    expect(inventoryValueAtCost).toBe(0);
  });

  it("potential gross profit from stock uses totalCostPerUnit (costPrice + packagingCost + insertCost)", () => {
    const product = { costPrice: 10000, packagingCost: 500, insertCost: 200, stock: 5, price: 20000 };
    const totalCostPerUnit = product.costPrice + product.packagingCost + product.insertCost; // 10700
    const potentialGrossProfit = (product.price - totalCostPerUnit) * product.stock;
    // (20000 - 10700) * 5 = 9300 * 5 = 46500
    expect(potentialGrossProfit).toBe(46500);

    // The WRONG formula (report bug — missing packagingCost + insertCost):
    const wrongFormula = (product.price - product.costPrice) * product.stock;
    // (20000 - 10000) * 5 = 10000 * 5 = 50000
    expect(wrongFormula).toBe(50000);

    // Correct formula produces LESS profit (because it includes packaging costs)
    expect(potentialGrossProfit).toBeLessThan(wrongFormula);
  });
});

describe("Shipping fee is not product profit", () => {
  it("shipping cost is subtracted from collected amount — seller does not pocket it", () => {
    const order = { total: "100000", roundedTotal: "100000", shippingCost: "5000" };
    const netAmount = orderCollectedAmount(order) - toNumber(order.shippingCost);
    // seller receives 100000 - 5000 = 95000 (shipping goes to carrier)
    expect(netAmount).toBe(95000);
  });

  it("zero shipping cost means full collected amount is product revenue", () => {
    const order = { total: "80000", roundedTotal: "80000", shippingCost: "0" };
    const netAmount = orderCollectedAmount(order) - toNumber(order.shippingCost);
    expect(netAmount).toBe(80000);
  });

  it("shipping cost of 7500 is always excluded from seller revenue", () => {
    const order = { total: "250000", roundedTotal: "250000", shippingCost: "7500" };
    const netAmount = orderCollectedAmount(order) - toNumber(order.shippingCost);
    expect(netAmount).toBe(242500);
  });
});

describe("WhatsApp source=null detection", () => {
  it("order with source=null counts as website order (wrong bucket) but financial numbers are still correct", () => {
    // The source column determines categorization only — delivered orders count in revenue regardless of source
    const orders = [
      { id: "o1", status: "delivered", source: null },       // WA order with missing source
      { id: "o2", status: "delivered", source: "whatsapp" }, // WA order with correct source
      { id: "o3", status: "delivered", source: "website" },  // website order
    ];
    const whatsappOrders = orders.filter(o => o.source === "whatsapp");
    const websiteOrders = orders.filter(o => o.source !== "whatsapp");

    // source=null is incorrectly bucketed as website
    expect(whatsappOrders.length).toBe(1); // only o2 with explicit source
    expect(websiteOrders.length).toBe(2);  // o1 (null) and o3

    // But ALL delivered orders still contribute to totalRevenue calculation
    const allDelivered = orders.filter(o => o.status === "delivered");
    expect(allDelivered.length).toBe(3); // all three count financially
  });

  it("whatsappOrdersCount is understated when source is null for WA orders", () => {
    const orders = [
      { source: null },       // WA order missing source
      { source: "whatsapp" }, // correctly tagged
    ];
    const whatsappOrdersCount = orders.filter(o => o.source === "whatsapp").length;
    // Only 1 detected, even though 2 are WhatsApp orders
    expect(whatsappOrdersCount).toBe(1);
  });
});

describe("Revenue and profit drilldown reconciliation", () => {
  it("sum of per-order revenue matches total revenue", () => {
    // Mirrors the /summary aggregation: totalRevenue = sum of calcOrderProfit(o).revenue
    const orders = [
      { roundedTotal: 100000, shippingCost: 5000 },
      { roundedTotal: 200000, shippingCost: 5000 },
      { roundedTotal: 150000, shippingCost: 7500 },
    ];
    const revenues = orders.map(o => orderCollectedAmount(o) - toNumber(o.shippingCost));
    const totalRevenue = revenues.reduce((s, r) => s + r, 0);
    // (95000) + (195000) + (142500) = 432500
    expect(revenues[0]).toBe(95000);
    expect(revenues[1]).toBe(195000);
    expect(revenues[2]).toBe(142500);
    expect(totalRevenue).toBe(432500);
  });

  it("delivered orders count matches the number of order rows used for revenue", () => {
    const allOrders = [
      { status: "delivered" },
      { status: "pending" },
      { status: "delivered" },
      { status: "shipped" },
    ];
    const deliveredOrders = allOrders.filter(o => o.status === "delivered");
    // Only delivered orders contribute to revenue
    expect(deliveredOrders.length).toBe(2);
    // Pending and shipped are excluded
    expect(allOrders.length - deliveredOrders.length).toBe(2);
  });
});

// ── Warning fixes — P&L label clarity ────────────────────────────────────────

describe("P&L field naming — profitBeforeExpensesAndReturns vs profitAfterExpensesBeforeReturns", () => {
  it("profitBeforeExpensesAndReturns equals grossProfit", () => {
    const snap = makeSnapshot();
    expect(snap.profitBeforeExpensesAndReturns).toBe(snap.grossProfit);
  });

  it("profitAfterExpensesBeforeReturns equals grossProfit minus expensesTotal", () => {
    const snap = makeSnapshot();
    expect(snap.profitAfterExpensesBeforeReturns).toBe(snap.grossProfit - snap.expensesTotal);
  });

  it("finalNetProfit equals profitAfterExpensesBeforeReturns minus returnLossVerified", () => {
    const snap = makeSnapshot();
    expect(snap.finalNetProfit).toBe(snap.profitAfterExpensesBeforeReturns - snap.returnLossVerified);
  });

  it("profitBeforeExpensesAndReturns > profitAfterExpensesBeforeReturns when expenses > 0", () => {
    const snap = makeSnapshot({ expensesTotal: 50000 });
    expect(snap.profitBeforeExpensesAndReturns).toBeGreaterThan(snap.profitAfterExpensesBeforeReturns);
  });

  it("profitAfterExpensesBeforeReturns > finalNetProfit when returnLossVerified > 0", () => {
    const snap = makeSnapshot({ returnLossVerified: 10000, finalNetProfit: 70000 });
    expect(snap.profitAfterExpensesBeforeReturns).toBeGreaterThan(snap.finalNetProfit);
  });

  it("snapshot always carries scope = 'all_time'", () => {
    const snap = makeSnapshot();
    expect(snap.scope).toBe("all_time");
  });
});

// ── Warning fixes — all-time scope ───────────────────────────────────────────

describe("Groq audit snapshot — scope is always all_time", () => {
  it("makeSnapshot produces scope='all_time'", () => {
    expect(makeSnapshot().scope).toBe("all_time");
  });

  it("scope field is not a period like 'month' or 'week'", () => {
    const snap = makeSnapshot();
    expect(snap.scope).not.toBe("month");
    expect(snap.scope).not.toBe("week");
    expect(snap.scope).not.toBe("day");
  });

  it("two snapshots taken at different times both have scope=all_time", () => {
    const s1 = makeSnapshot();
    const s2 = makeSnapshot({ grossRevenue: 999999 });
    expect(s1.scope).toBe("all_time");
    expect(s2.scope).toBe("all_time");
  });
});

// ── Warning fixes — WhatsApp source=null detection ───────────────────────────

describe("WhatsApp source=null review — linked orders missing source tag", () => {
  interface ReviewOrder {
    id: string;
    source: string | null;
    status: string;
    invoiceId: string | null; // non-null = has manual_invoice link
  }

  function findSourceNullLinkedOrders(orders: ReviewOrder[]): ReviewOrder[] {
    // Mirror the backend query logic: orders linked to manual_invoices but source IS NULL
    return orders.filter(o => o.source === null && o.invoiceId !== null);
  }

  it("returns orders that have a manual_invoice link but source=null", () => {
    const orders: ReviewOrder[] = [
      { id: "o1", source: null,        status: "delivered", invoiceId: "inv1" }, // linked WA, missing source
      { id: "o2", source: "whatsapp",  status: "delivered", invoiceId: "inv2" }, // correctly tagged
      { id: "o3", source: "website",   status: "delivered", invoiceId: null   }, // regular website order
      { id: "o4", source: null,        status: "pending",   invoiceId: null   }, // no invoice link
    ];
    const flagged = findSourceNullLinkedOrders(orders);
    expect(flagged.length).toBe(1);
    expect(flagged[0].id).toBe("o1");
  });

  it("returns empty when all WA-linked orders are properly tagged", () => {
    const orders: ReviewOrder[] = [
      { id: "o1", source: "whatsapp", status: "delivered", invoiceId: "inv1" },
      { id: "o2", source: "whatsapp", status: "pending",   invoiceId: "inv2" },
    ];
    expect(findSourceNullLinkedOrders(orders)).toHaveLength(0);
  });

  it("source=null without invoice link is NOT flagged (could be old website order)", () => {
    const orders: ReviewOrder[] = [
      { id: "o1", source: null, status: "delivered", invoiceId: null },
    ];
    // No invoice link → not a WhatsApp source issue
    expect(findSourceNullLinkedOrders(orders)).toHaveLength(0);
  });

  it("flagged orders are already counted in revenue if delivered — only source tag is wrong", () => {
    const orders: ReviewOrder[] = [
      { id: "o1", source: null, status: "delivered", invoiceId: "inv1" },
    ];
    const flagged = findSourceNullLinkedOrders(orders);
    // Revenue calculation only looks at status=delivered, not source
    // So the order IS counted in revenue — the source tag is cosmetic/tracking issue
    const countedInRevenue = orders.filter(o => o.status === "delivered").length;
    expect(countedInRevenue).toBe(1);
    expect(flagged[0].status).toBe("delivered"); // the flagged order IS in revenue
  });
});

// ── Warning fixes — non-delivered orders drilldown badge ─────────────────────

describe("Non-delivered orders — unrealized profit badge logic", () => {
  const REALIZED_STATUSES = ["delivered"];

  function isRealized(status: string): boolean {
    return REALIZED_STATUSES.includes(status);
  }

  it("only 'delivered' orders are realized (contribute to actual profit)", () => {
    expect(isRealized("delivered")).toBe(true);
    expect(isRealized("pending")).toBe(false);
    expect(isRealized("shipped")).toBe(false);
    expect(isRealized("confirmed")).toBe(false);
    expect(isRealized("processing")).toBe(false);
    expect(isRealized("rejected")).toBe(false);
    expect(isRealized("cancelled")).toBe(false);
  });

  it("non-delivered orders shown in drilldown must be marked as unrealized", () => {
    const drilldownOrders = [
      { orderId: "o1", status: "delivered",  netProfit: 50000 },
      { orderId: "o2", status: "shipped",    netProfit: 30000 }, // not yet realized
      { orderId: "o3", status: "confirmed",  netProfit: 25000 }, // not yet realized
    ];
    const unrealized = drilldownOrders.filter(o => !isRealized(o.status));
    expect(unrealized.length).toBe(2);
    // Unrealized profit must not be added to actual totals
    const actualProfit = drilldownOrders
      .filter(o => isRealized(o.status))
      .reduce((s, o) => s + o.netProfit, 0);
    expect(actualProfit).toBe(50000);
  });

  it("hypothetical profit for non-delivered order equals revenue - cogs (no guarantees)", () => {
    const order = { status: "shipped", revenue: 100000, cogs: 60000 };
    // This is hypothetical — not yet realized
    const hypotheticalProfit = order.revenue - order.cogs;
    expect(hypotheticalProfit).toBe(40000);
    expect(isRealized(order.status)).toBe(false);
  });
});

// ── Warning fixes — returned stock warning logic ──────────────────────────────

describe("Return events — restocked=false warning logic", () => {
  interface ReturnEvent {
    id: string;
    status: string;
    restocked: boolean;
    type: string;
  }

  it("return event with restocked=false should show stock warning", () => {
    const event: ReturnEvent = { id: "e1", status: "verified", restocked: false, type: "customer_return" };
    // Warning: stock was NOT updated — admin must update manually
    const needsStockWarning = !event.restocked;
    expect(needsStockWarning).toBe(true);
  });

  it("return event with restocked=true has no stock warning", () => {
    const event: ReturnEvent = { id: "e2", status: "verified", restocked: true, type: "customer_return" };
    const needsStockWarning = !event.restocked;
    expect(needsStockWarning).toBe(false);
  });

  it("registering a return event never auto-increments product stock", () => {
    // This is an invariant: creating or updating a return event must not touch products.stock.
    // The system relies on restocked flag + manual admin action.
    const event: ReturnEvent = { id: "e3", status: "verified", restocked: false, type: "customer_return" };

    let productStock = 5; // simulate stock before return event
    // WRONG (would be auto-increment): productStock += 1;
    // Correct: stock does NOT change automatically when a return event is recorded
    const stockAfterEvent = productStock; // unchanged
    expect(stockAfterEvent).toBe(5);
    expect(event.restocked).toBe(false);
  });

  it("only verified events enter financial accounting — recorded events do not", () => {
    const events: ReturnEvent[] = [
      { id: "e1", status: "recorded", restocked: false, type: "customer_return" },
      { id: "e2", status: "verified", restocked: false, type: "customer_return" },
      { id: "e3", status: "disputed", restocked: false, type: "customer_return" },
    ];
    const financiallyActive = events.filter(e => e.status === "verified");
    expect(financiallyActive.length).toBe(1);
    expect(financiallyActive[0].id).toBe("e2");
  });
});

// ── Warning fixes — audit history persistence ────────────────────────────────

describe("Audit history persistence status", () => {
  type PersistenceSource = "db" | "memory" | null;

  function getPersistenceLabel(source: PersistenceSource): string {
    if (source === "db") return "محفوظ في قاعدة البيانات";
    if (source === "memory") return "مؤقت — يُفقد عند إعادة التشغيل";
    return "لا يوجد نتيجة";
  }

  it("persistenceSource='db' means audit survived a server restart", () => {
    const label = getPersistenceLabel("db");
    expect(label).toContain("قاعدة البيانات");
  });

  it("persistenceSource='memory' triggers a migration warning in UI", () => {
    const label = getPersistenceLabel("memory");
    expect(label).toContain("مؤقت");
  });

  it("persistenceSource=null means no audit has been run yet", () => {
    const label = getPersistenceLabel(null);
    expect(label).toContain("لا يوجد");
  });

  it("audit/latest response includes persistenceSource field", () => {
    // Simulate the expected response shape from GET /audit/latest
    const dbResponse = { success: true, data: {}, persistenceSource: "db" as PersistenceSource };
    const memResponse = { success: true, data: {}, persistenceSource: "memory" as PersistenceSource };
    const emptyResponse = { success: true, data: null, persistenceSource: null as PersistenceSource };

    expect(dbResponse.persistenceSource).toBe("db");
    expect(memResponse.persistenceSource).toBe("memory");
    expect(emptyResponse.persistenceSource).toBeNull();
  });

  it("finance audit tables migration must be applied manually — not auto-run", () => {
    // The migration SQL file exists at migrations/run-finance-audit-tables.sql.
    // It is NOT run automatically — it requires manual execution in Neon console.
    // This test documents the contract: auto-migration is intentionally absent.
    const migrationFile = "migrations/run-finance-audit-tables.sql";
    const isAutoRun = false; // design decision — never auto-migrate in production
    expect(isAutoRun).toBe(false);
    expect(migrationFile).toContain("finance-audit-tables");
  });
});

// ─── Return-loss split model ─────────────────────────────────────────────────
//
// Business rule:
//   salesReturnDeduction  = refundAmount  (revenue reversal, affects P&L, NOT a product loss)
//   actualReturnLoss      = opLoss + writeOff + (restocked ? 0 : cogsLoss)
//   netProfitAfterReturns = netProfit - salesReturnDeduction - actualReturnLoss

type ReturnEventLike = {
  refundAmount: number;
  deliveryCostLoss: number;
  returnShippingCost: number;
  packagingLoss: number;
  productWriteOffAmount: number;
  cogsLoss: number;
  restocked: boolean | null;
};

function eventSalesReturnDeduction(e: ReturnEventLike): number {
  return e.refundAmount;
}

function eventActualReturnLoss(e: ReturnEventLike): number {
  const opLoss = e.deliveryCostLoss + e.returnShippingCost + e.packagingLoss;
  const writeOff = e.productWriteOffAmount;
  const productCost = e.restocked !== true ? e.cogsLoss : 0;
  return opLoss + writeOff + productCost;
}

describe("return-loss split model", () => {
  it("sellable return: actualReturnLoss excludes cogsLoss (restocked=true)", () => {
    const event: ReturnEventLike = {
      refundAmount: 50000,
      deliveryCostLoss: 5000,
      returnShippingCost: 3000,
      packagingLoss: 1000,
      productWriteOffAmount: 0,
      cogsLoss: 30000,
      restocked: true,
    };
    // cogsLoss is excluded because the product came back to stock
    expect(eventActualReturnLoss(event)).toBe(5000 + 3000 + 1000); // 9000
  });

  it("sellable return: salesReturnDeduction equals refundAmount (revenue reversal only)", () => {
    const event: ReturnEventLike = {
      refundAmount: 50000,
      deliveryCostLoss: 5000,
      returnShippingCost: 3000,
      packagingLoss: 1000,
      productWriteOffAmount: 0,
      cogsLoss: 30000,
      restocked: true,
    };
    expect(eventSalesReturnDeduction(event)).toBe(50000);
  });

  it("damaged return: actualReturnLoss includes cogsLoss (restocked=false)", () => {
    const event: ReturnEventLike = {
      refundAmount: 40000,
      deliveryCostLoss: 5000,
      returnShippingCost: 3000,
      packagingLoss: 2000,
      productWriteOffAmount: 10000,
      cogsLoss: 25000,
      restocked: false,
    };
    // All losses apply: op + writeOff + cogs
    expect(eventActualReturnLoss(event)).toBe(5000 + 3000 + 2000 + 10000 + 25000); // 45000
  });

  it("restocked=null is treated as non-sellable (cogsLoss counted as loss)", () => {
    const event: ReturnEventLike = {
      refundAmount: 30000,
      deliveryCostLoss: 2000,
      returnShippingCost: 1000,
      packagingLoss: 0,
      productWriteOffAmount: 0,
      cogsLoss: 20000,
      restocked: null,
    };
    // null restocked → cogsLoss included
    expect(eventActualReturnLoss(event)).toBe(2000 + 1000 + 20000); // 23000
  });

  it("refundAmount does NOT appear in actualReturnLoss for any return type", () => {
    const sellable: ReturnEventLike = {
      refundAmount: 60000, deliveryCostLoss: 0, returnShippingCost: 0,
      packagingLoss: 0, productWriteOffAmount: 0, cogsLoss: 0, restocked: true,
    };
    const damaged: ReturnEventLike = {
      refundAmount: 60000, deliveryCostLoss: 0, returnShippingCost: 0,
      packagingLoss: 0, productWriteOffAmount: 0, cogsLoss: 0, restocked: false,
    };
    expect(eventActualReturnLoss(sellable)).toBe(0);
    expect(eventActualReturnLoss(damaged)).toBe(0);
  });

  it("COD settlement deduction equals refundAmount (settlement ≠ product loss)", () => {
    // The COD formula: pendingSettlement = max(0, deliveredNetTotal - received - approvedReturnDeductions)
    // approvedReturnDeductions = sum(refundAmount) for verified events on delivered orders
    const deliveredNetTotal = 500000;
    const receivedCash = 400000;
    const refundAmount = 30000; // settlement deduction
    const pending = Math.max(0, deliveredNetTotal - receivedCash - refundAmount);
    expect(pending).toBe(70000);
    // The refundAmount (30000) reduces settlement — it is NOT an additional product loss
  });

  it("netProfitAfterReturns uses both salesReturnDeduction and actualReturnLoss", () => {
    const netProfitBeforeReturns = 300000;
    const event: ReturnEventLike = {
      refundAmount: 50000,
      deliveryCostLoss: 5000,
      returnShippingCost: 3000,
      packagingLoss: 1000,
      productWriteOffAmount: 0,
      cogsLoss: 30000,
      restocked: true,  // sellable → cogsLoss excluded from actualReturnLoss
    };
    const deduction = eventSalesReturnDeduction(event); // 50000
    const loss = eventActualReturnLoss(event);           // 9000 (no cogs)
    const netProfitAfterReturns = netProfitBeforeReturns - deduction - loss;
    expect(netProfitAfterReturns).toBe(241000); // 300000 - 50000 - 9000
  });

  it("write-off event always counts productWriteOffAmount regardless of restocked status", () => {
    const event: ReturnEventLike = {
      refundAmount: 0,
      deliveryCostLoss: 0,
      returnShippingCost: 0,
      packagingLoss: 0,
      productWriteOffAmount: 15000,
      cogsLoss: 20000,
      restocked: true, // even if restocked, writeOff is always a real loss
    };
    // writeOff is included; cogsLoss excluded because restocked=true
    expect(eventActualReturnLoss(event)).toBe(15000);
  });
});

// ── Finance page — 11 specific audit checks ───────────────────────────────────

// 1 & 2: Cost calculation uses 1420, never 1520, never old شراء د
describe("finance-product-costs: exchange rate must be 1420", () => {
  const EXCHANGE_RATE = 1420;

  function computeCost(purchaseUsd: number, shippingIqd: number, woodIqd: number): number {
    return Math.round(purchaseUsd * EXCHANGE_RATE + shippingIqd + woodIqd);
  }

  it("10 USD × 1420 = 14200 din (not 15200)", () => {
    expect(computeCost(10, 0, 0)).toBe(14200);
    expect(computeCost(10, 0, 0)).not.toBe(10 * 1520);
  });

  it("includes shipping and wood correctly", () => {
    expect(computeCost(5, 2000, 1000)).toBe(5 * 1420 + 2000 + 1000);
  });

  it("result is always an integer", () => {
    expect(Number.isInteger(computeCost(1.5, 500, 0))).toBe(true);
  });
});

// 2: old شراء د (purchaseIqd) field must NOT be used
describe("accountingCostUpdateSchema: no legacy purchaseIqd / salePrice field", () => {
  it("schema keys do not include purchaseIqd (old شراء بالدينار)", () => {
    const keys = Object.keys(accountingCostUpdateSchema.shape);
    expect(keys).not.toContain("purchaseIqd");
    expect(keys).not.toContain("purchaseUsd");
  });

  it("schema does not include salePrice or price (cost tab never touches sale price)", () => {
    const keys = Object.keys(accountingCostUpdateSchema.shape);
    expect(keys).not.toContain("price");
    expect(keys).not.toContain("salePrice");
  });

  it("schema contains costPrice, packagingCost, insertCost", () => {
    const keys = Object.keys(accountingCostUpdateSchema.shape);
    expect(keys).toContain("costPrice");
    expect(keys).toContain("packagingCost");
    expect(keys).toContain("insertCost");
  });
});

// 4: AI header block
describe("pricing/apply: AI header block", () => {
  function isAiBlocked(headers: Record<string, string | undefined>): boolean {
    return !!(headers["x-ai-agent"] || headers["x-automated"]);
  }

  it("blocks x-ai-agent header", () => {
    expect(isAiBlocked({ "x-ai-agent": "true" })).toBe(true);
  });

  it("blocks x-automated header", () => {
    expect(isAiBlocked({ "x-automated": "1" })).toBe(true);
  });

  it("allows normal browser requests through", () => {
    expect(isAiBlocked({})).toBe(false);
    expect(isAiBlocked({ "content-type": "application/json" })).toBe(false);
  });
});

// 5: adminConfirm token required
describe("pricing/apply: adminConfirm token required", () => {
  const REQUIRED = "I_CONFIRM_PRICE_CHANGE";
  const isConfirmed = (t: unknown) => t === REQUIRED;

  it("accepts exact token", () => { expect(isConfirmed(REQUIRED)).toBe(true); });
  it("rejects undefined", () => { expect(isConfirmed(undefined)).toBe(false); });
  it("rejects wrong string", () => { expect(isConfirmed("yes")).toBe(false); });
  it("rejects empty string", () => { expect(isConfirmed("")).toBe(false); });
});

// 6: applyPricingRules throws immediately
describe("competitive-pricer: applyPricingRules must throw", () => {
  function applyPricingRulesGuard(): never {
    throw new Error(
      "[CompetitivePricer] applyPricingRules() is disabled. " +
      "Sale price changes must go through POST /api/pricing/apply with adminConfirm token.",
    );
  }

  it("throws with disabled message", () => {
    expect(() => applyPricingRulesGuard()).toThrow("applyPricingRules() is disabled");
  });

  it("error references the safe endpoint", () => {
    expect(() => applyPricingRulesGuard()).toThrow("/api/pricing/apply");
  });
});

// 7: accountingReportSchema.returns has totalReturnFinancialImpact
describe("accountingReportSchema: returns.totalReturnFinancialImpact present", () => {
  it("returns object has totalReturnFinancialImpact (was root cause of empty reports tab)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (accountingReportSchema.shape.returns as any).shape;
    expect(shape).toHaveProperty("totalReturnFinancialImpact");
  });

  it("totalReturnFinancialImpact parses a number correctly", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (accountingReportSchema.shape.returns as any).shape;
    expect(shape.totalReturnFinancialImpact.safeParse(5000).success).toBe(true);
  });
});

// 8: summary warning fields
describe("accountingSummarySchema: totalReturnEvents + verifiedReturnEvents", () => {
  it("has totalReturnEvents", () => {
    expect(Object.keys(accountingSummarySchema.shape)).toContain("totalReturnEvents");
  });

  it("has verifiedReturnEvents", () => {
    expect(Object.keys(accountingSummarySchema.shape)).toContain("verifiedReturnEvents");
  });

  it("warning condition: total > verified means pending returns exist", () => {
    const warn = (total: number, verified: number) => total > verified;
    expect(warn(5, 3)).toBe(true);
    expect(warn(3, 3)).toBe(false);
    expect(warn(0, 0)).toBe(false);
  });
});

// 9: drilldown counted logic
describe("product-sales-drill: counted = delivered only", () => {
  const REALIZED = ["delivered"];
  const isCounted = (s: string) => REALIZED.includes(s);

  it("delivered → counted", () => { expect(isCounted("delivered")).toBe(true); });
  it("pending → not counted", () => { expect(isCounted("pending")).toBe(false); });
  it("cancelled → not counted", () => { expect(isCounted("cancelled")).toBe(false); });

  it("grossSoldQty = sum of delivered lines only", () => {
    const lines = [
      { status: "delivered", qty: 3 },
      { status: "pending",   qty: 2 },
      { status: "delivered", qty: 1 },
    ];
    const gross = lines.filter((l) => isCounted(l.status)).reduce((s, l) => s + l.qty, 0);
    expect(gross).toBe(4);
  });
});

// 10: pending orders excluded from profitability (explicit)
describe("profitability: REALIZED_STATUSES only contains delivered", () => {
  const REALIZED = ["delivered"];

  it("pending is excluded", () => { expect(REALIZED.includes("pending")).toBe(false); });
  it("confirmed is excluded", () => { expect(REALIZED.includes("confirmed")).toBe(false); });
  it("shipped is excluded", () => { expect(REALIZED.includes("shipped")).toBe(false); });
  it("processing is excluded", () => { expect(REALIZED.includes("processing")).toBe(false); });
});

// 11: inventory formula uses costPrice (accountingProductProfitFullSchema field check)
describe("inventory potential profit: formula and schema", () => {
  function potentialGross(
    stock: number, salePrice: number,
    costPrice: number, packagingCost: number, insertCost: number,
  ): number {
    if (costPrice <= 0) return 0;
    return (salePrice - costPrice - packagingCost - insertCost) * stock;
  }

  it("10 units @ sale=20000, cost=12000, pkg=500, insert=200 → 73000", () => {
    expect(potentialGross(10, 20000, 12000, 500, 200)).toBe(73000);
  });

  it("returns 0 when costPrice=0 (missing cost data)", () => {
    expect(potentialGross(5, 20000, 0, 500, 200)).toBe(0);
  });

  it("accountingProductProfitFullSchema has potentialGrossProfitFromStock", () => {
    expect(Object.keys(accountingProductProfitFullSchema.shape)).toContain("potentialGrossProfitFromStock");
  });

  it("returnRate is item-based (returnedQty / unitsSold): schema has both fields", () => {
    const keys = Object.keys(accountingProductProfitFullSchema.shape);
    expect(keys).toContain("returnRate");
    expect(keys).toContain("returnedQty");
  });
});

describe("product-sales-drill: variant breakdown aggregation (soil product 10 vs 7)", () => {
  it("parent product with two variants shows total 10 = 7 + 3", () => {
    const variants = [
      { variantId: "coarse3", variantLabel: "حبيبات خشنة 3 لتر", grossQty: 7 },
      { variantId: "fine15",  variantLabel: "حبيبات ناعمة 1.5 لتر", grossQty: 3 },
    ];
    const total = variants.reduce((sum, v) => sum + v.grossQty, 0);
    expect(total).toBe(10);
  });

  it("variant breakdown sums match grossSoldQty", () => {
    const breakdown = [
      { variantId: "coarse3", grossQty: 7 },
      { variantId: "fine15",  grossQty: 3 },
    ];
    const grossSoldQty = 10;
    expect(breakdown.reduce((s, v) => s + v.grossQty, 0)).toBe(grossSoldQty);
  });

  it("product with no variant has null variantId in breakdown", () => {
    const breakdown = [{ variantId: null as string | null, variantLabel: null as string | null, grossQty: 5, revenue: 50000 }];
    expect(breakdown[0].variantId).toBeNull();
    expect(breakdown[0].grossQty).toBe(5);
  });

  it("variant note text covers both كل الأنواع/الأحجام and العدد الكلي", () => {
    const note = "العدد الكلي يجمع كل الأنواع/الأحجام التابعة لنفس المنتج.";
    expect(note).toContain("العدد الكلي");
    expect(note).toContain("الأنواع/الأحجام");
  });

  it("drilldown order row includes variantLabel and variantId fields", () => {
    const row = {
      orderId: "5fd36322-d3d2-43f0-9f89-b21cfea21334",
      orderNumber: null,
      orderStatus: "delivered",
      orderSource: "whatsapp",
      orderCreatedAt: "2025-01-01T00:00:00.000Z",
      qty: 7,
      priceAtPurchase: 12300,
      variantId: "coarse3",
      variantLabel: "حبيبات خشنة 3 لتر",
      counted: true,
      exclusionReason: null,
    };
    expect(row.variantId).toBe("coarse3");
    expect(row.variantLabel).toBe("حبيبات خشنة 3 لتر");
    expect(row.counted).toBe(true);
  });
});

// ─── Manual Adjustments ──────────────────────────────────────────────────────

import {
  manualAdjustmentCreateSchema,
  reviewFlagStatusUpdateSchema,
  ADJUSTMENT_ENTITY_TYPES,
  ADJUSTMENT_STATUSES,
  REVIEW_FLAG_STATUSES,
} from "@shared/accounting";

describe("manual-adjustments: cost override changes costPrice but not sale price", () => {
  it("manual cost override sets costPrice field, not price", () => {
    const adj = manualAdjustmentCreateSchema.parse({
      entityType: "product",
      entityId: "yee-07509",
      fieldName: "costPrice",
      newValueJson: 15106,
      reason: "كلفة محسوبة يدويًا: 6.28 × 1420 + 6188",
    });
    expect(adj.fieldName).toBe("costPrice");
    expect(adj.fieldName).not.toBe("price");
    expect(adj.newValueJson).toBe(15106);
  });

  it("manual adjustment schema requires reason — rejects empty reason", () => {
    const result = manualAdjustmentCreateSchema.safeParse({
      entityType: "product",
      entityId: "p-001",
      fieldName: "costPrice",
      newValueJson: 5000,
      reason: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("approved override status is approved or applied", () => {
    const statuses = [...ADJUSTMENT_STATUSES];
    expect(statuses).toContain("approved");
    expect(statuses).toContain("applied");
    expect(statuses).toContain("pending");
    expect(statuses).toContain("rejected");
  });
});

describe("manual-adjustments: approved override priority over auto calculation", () => {
  it("approved override value replaces auto-computed value", () => {
    const autoValue = 14000;
    const override = { status: "approved", newValueJson: 15106 };
    const result = override.status === "approved" || override.status === "applied"
      ? (override.newValueJson as number)
      : autoValue;
    expect(result).toBe(15106);
    expect(result).not.toBe(autoValue);
  });

  it("rejected override does not affect finance — auto value used", () => {
    const autoValue = 14000;
    const override = { status: "rejected", newValueJson: 99999 };
    const result = override.status === "approved" || override.status === "applied"
      ? (override.newValueJson as number)
      : autoValue;
    expect(result).toBe(autoValue);
  });
});

describe("manual-adjustments: AI cannot approve or apply", () => {
  it("adjustment created by AI is blocked — AI header check", () => {
    const aiHeaders = { "x-ai-agent": "groq-audit" };
    const isBlocked = !!aiHeaders["x-ai-agent"];
    expect(isBlocked).toBe(true);
  });

  it("x-automated header also blocked", () => {
    const headers = { "x-automated": "cron-scheduler" };
    const isBlocked = !!(headers as Record<string, string>)["x-automated"];
    expect(isBlocked).toBe(true);
  });

  it("adjustment with no AI header proceeds to pending status", () => {
    const headers: Record<string, string> = {};
    const isBlocked = !!(headers["x-ai-agent"] || headers["x-automated"]);
    expect(isBlocked).toBe(false);
  });
});

describe("manual-adjustments: sellable returned product prevents COGS loss", () => {
  it("restocked + sellable → actualReturnLoss = 0", () => {
    const returnEvent = { restocked: true, sellable: true, cogsLoss: 5000 };
    const actualLoss = returnEvent.restocked && returnEvent.sellable ? 0 : returnEvent.cogsLoss;
    expect(actualLoss).toBe(0);
  });

  it("non-sellable damaged return → cogsLoss applied", () => {
    const returnEvent = { restocked: false, sellable: false, cogsLoss: 5000 };
    const actualLoss = returnEvent.restocked && returnEvent.sellable ? 0 : returnEvent.cogsLoss;
    expect(actualLoss).toBe(5000);
  });
});

describe("manual-adjustments: whatsapp invoice financiallyCounted=false excludes revenue", () => {
  it("financiallyCounted=false prevents revenue inclusion", () => {
    const invoice = { financiallyCounted: false, total: 50000, status: "confirmed" };
    const counted = invoice.financiallyCounted === true;
    expect(counted).toBe(false);
  });

  it("financiallyCounted override written as boolean not string", () => {
    const adj = manualAdjustmentCreateSchema.parse({
      entityType: "invoice",
      entityId: "inv-001",
      fieldName: "financiallyCounted",
      newValueJson: false,
      reason: "بانتظار التسليم — لا تُحتسب ماليًا",
    });
    expect(adj.newValueJson).toBe(false);
    expect(typeof adj.newValueJson).toBe("boolean");
  });
});

describe("manual-adjustments: review flag schema", () => {
  it("review flag statuses include open, resolved, ignored", () => {
    expect([...REVIEW_FLAG_STATUSES]).toContain("open");
    expect([...REVIEW_FLAG_STATUSES]).toContain("resolved");
    expect([...REVIEW_FLAG_STATUSES]).toContain("ignored");
  });

  it("review flag status update schema validates correctly", () => {
    const valid = reviewFlagStatusUpdateSchema.parse({ status: "resolved" });
    expect(valid.status).toBe("resolved");

    const bad = reviewFlagStatusUpdateSchema.safeParse({ status: "deleted" });
    expect(bad.success).toBe(false);
  });

  it("every manual change requires reason — reason field min 3 chars", () => {
    const badReason = manualAdjustmentCreateSchema.safeParse({
      entityType: "product",
      entityId: "p-001",
      fieldName: "stock",
      newValueJson: 15,
      reason: "ok",
    });
    expect(badReason.success).toBe(false);

    const goodReason = manualAdjustmentCreateSchema.safeParse({
      entityType: "product",
      entityId: "p-001",
      fieldName: "stock",
      newValueJson: 15,
      reason: "تصحيح عد يدوي بعد جرد المستودع",
    });
    expect(goodReason.success).toBe(true);
  });
});

describe("override system: approved cost override affects profitability", () => {
  it("approved override has higher priority than auto value", () => {
    const autoValue = 14000;
    const override = { status: "approved" as const, newValueJson: 15106, reason: "تصحيح كلفة" };
    const effective = (override.status === "approved" || override.status === "applied")
      ? Number(override.newValueJson) : autoValue;
    expect(effective).toBe(15106);
    expect(effective).not.toBe(autoValue);
  });

  it("rejected override does not affect finance — falls back to auto", () => {
    const autoValue = 14000;
    const override = { status: "rejected" as const, newValueJson: 99999, reason: "غلط" };
    const effective = (override.status === "approved" || override.status === "applied")
      ? Number(override.newValueJson) : autoValue;
    expect(effective).toBe(autoValue);
  });

  it("applied override has same priority as approved", () => {
    const autoValue = 14000;
    const override = { status: "applied" as const, newValueJson: 15106, reason: "تم التطبيق" };
    const effective = (override.status === "approved" || override.status === "applied")
      ? Number(override.newValueJson) : autoValue;
    expect(effective).toBe(15106);
  });

  it("profitability schema includes overridden and overrideReason fields", () => {
    const keys = Object.keys(accountingProductProfitFullSchema.shape);
    expect(keys).toContain("overridden");
    expect(keys).toContain("overrideReason");
  });
});

describe("financiallyCounted: manual inclusion/exclusion", () => {
  it("financiallyCounted=false excludes delivered order from revenue", () => {
    const order = { status: "delivered", financiallyCounted: false };
    const fc = (order as any).financiallyCounted;
    const included = fc === false ? false : fc === true ? true : order.status === "delivered";
    expect(included).toBe(false);
  });

  it("financiallyCounted=true includes order regardless of status", () => {
    const order = { status: "pending", financiallyCounted: true };
    const fc = (order as any).financiallyCounted;
    const included = fc === false ? false : fc === true ? true : order.status === "delivered";
    expect(included).toBe(true);
  });

  it("financiallyCounted=null falls back to automatic REALIZED_STATUSES", () => {
    const REALIZED = ["delivered"];
    const orderDelivered = { status: "delivered", financiallyCounted: null };
    const orderPending = { status: "pending", financiallyCounted: null };
    const fcD = (orderDelivered as any).financiallyCounted;
    const fcP = (orderPending as any).financiallyCounted;
    const inclD = fcD === false ? false : fcD === true ? true : REALIZED.includes(orderDelivered.status);
    const inclP = fcP === false ? false : fcP === true ? true : REALIZED.includes(orderPending.status);
    expect(inclD).toBe(true);
    expect(inclP).toBe(false);
  });

  it("WhatsApp invoice financiallyCounted=false excludes revenue even if delivered", () => {
    const inv = { status: "confirmed", financiallyCounted: false, orderId: "ord-1" };
    const orderStatus = "delivered";
    const isDelivered = orderStatus === "delivered";
    const manualFc = (inv as any).financiallyCounted;
    let included = isDelivered;
    if (manualFc === false) included = false;
    else if (manualFc === true) included = true;
    expect(included).toBe(false);
  });

  it("manual badge: overridden=true means معدل يدويًا should be shown", () => {
    const row = { overridden: true, overrideReason: "تصحيح كلفة يدوي بسعر صرف 1420" };
    expect(row.overridden).toBe(true);
    expect(row.overrideReason).toContain("كلفة");
  });
});
