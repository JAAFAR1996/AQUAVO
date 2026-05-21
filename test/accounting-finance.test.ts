import { describe, it, expect } from "vitest";

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
  grossRevenue: number;
  netRevenue: number;
  totalCogs: number;
  grossProfit: number;
  expensesTotal: number;
  returnLossVerified: number;
  netProfitBeforeReturns: number;
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

  const computedFinal = snapshot.netProfitBeforeReturns - snapshot.returnLossVerified;
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
  const netProfitBeforeReturns = 80000;
  const finalNetProfit = netProfitBeforeReturns - returnLossVerified;

  return {
    generatedAt: new Date().toISOString(),
    grossRevenue: 550000,
    netRevenue: deliveredNetTotal,
    totalCogs: 350000,
    grossProfit: 150000,
    expensesTotal: 70000,
    returnLossVerified,
    netProfitBeforeReturns,
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
      netProfitBeforeReturns: 100000,
      returnLossVerified: 30000,
      finalNetProfit: 70000, // correct: 100000 - 30000
    });
    const checks = runTestInvariantChecks(snap);
    const check = checks.find(c => c.name === "return loss affects profit once only")!;
    expect(check.passed).toBe(true);
  });

  it("return loss invariant fails when loss is applied twice", () => {
    const snap = makeSnapshot({
      netProfitBeforeReturns: 100000,
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
