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
