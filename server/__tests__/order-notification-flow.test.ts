/**
 * Merchant "new order" notification flow: one Telegram message per confirmed
 * order, for cash on delivery and for verified Wayl payments, with duplicate
 * suppression and failure isolation.
 */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));
vi.mock("../services/analytics-tracker.js", () => ({ analyticsTracker: { trackSessionStatus: vi.fn(), trackPurchase: vi.fn() } }));
vi.mock("../services/loyalty-notifications.js", () => ({ loyaltyNotifications: { sendPostPurchaseNotifications: vi.fn() } }));
vi.mock("../storage/referral-storage.js", () => ({ ReferralStorage: class { markFirstPurchase = vi.fn(async () => ({ referral: null })); } }));
vi.mock("../storage/loyalty-storage.js", () => ({ loyaltyStorage: { awardReferralPurchaseBonus: vi.fn() } }));

import { getDb } from "../db.js";
import {
  buildMerchantNotificationFromStoredOrder,
  enqueueMerchantNotificationOutbox,
  processPaymentOutboxForOrder,
} from "../services/payment-maintenance.js";

const ordersRoute = readFileSync("server/routes/orders.ts", "utf8");
const waylService = readFileSync("server/services/wayl-order-payment.ts", "utf8");
const waylRoute = readFileSync("server/routes/wayl.ts", "utf8");
const maintenance = readFileSync("server/services/payment-maintenance.ts", "utf8");
const testRoute = readFileSync("server/routes/production-test-orders.ts", "utf8");

type OutboxRow = { id: string; event_key: string; order_id: string; event_type: string; status: string; attempts: number; last_error: string | null };

/**
 * Minimal in-memory stand-in for the SQL the outbox uses: unique event_key,
 * claim/deliver/retry state transitions, and the is_test lookup.
 */
function createFakeDb(state: { order: any; payment: any; outbox: OutboxRow[]; isTest?: boolean }) {
  // drizzle: StringChunk.value is string[]; nested sql`` fragments carry their own
  // queryChunks; interpolated params are boxed primitives.
  const isText = (c: any) => c && typeof c === "object" && Array.isArray(c.value);
  const flatten = (q: any): any[] => (q?.queryChunks ?? []).flatMap((c: any) => (c && typeof c === "object" && Array.isArray(c.queryChunks) ? flatten(c) : [c]));
  const sqlText = (q: any) => flatten(q).map((c: any) => (isText(c) ? c.value.join("") : "")).join("");
  const params = (q: any) => flatten(q).filter((c: any) => !isText(c)).map((c: any) => (c != null && typeof c === "object" && typeof c.valueOf === "function" ? c.valueOf() : c));
  const execute = async (q: any) => {
    const text = sqlText(q);
    const values = params(q);
    if (process.env.DEBUG_FAKE_DB) process.stdout.write(`\n[fake-db] ${text.replace(/\s+/g, " ").slice(0, 160)} | params=${JSON.stringify(values)}\n`);
    if (/INSERT INTO payment_outbox/.test(text)) {
      const eventKey = String(values[0]);
      if (!state.outbox.some((row) => row.event_key === eventKey)) {
        state.outbox.push({ id: `evt-${state.outbox.length + 1}`, event_key: eventKey, order_id: String(values[1]), event_type: eventKey.split(":")[1], status: "pending", attempts: 0, last_error: null });
      }
      return { rows: [] };
    }
    if (/WITH candidates AS/.test(text)) {
      const orderId = values.find((v: unknown) => typeof v === "string");
      const claimed = state.outbox.filter((row) => row.status === "pending" && row.order_id === orderId);
      for (const row of claimed) { row.status = "processing"; row.attempts += 1; }
      return { rows: claimed.map((row) => ({ id: row.id, orderId: row.order_id, eventType: row.event_type, payload: {}, attempts: row.attempts })) };
    }
    if (/SET status='delivered'/.test(text)) {
      const row = state.outbox.find((r) => r.id === String(values[0]));
      if (row) row.status = "delivered";
      return { rows: [] };
    }
    if (/SET status='pending'/.test(text)) {
      const row = state.outbox.find((r) => r.id === String(values[values.length - 1]));
      if (row) { row.status = "pending"; row.last_error = String(values[1]); }
      return { rows: [] };
    }
    if (/SELECT is_test FROM orders/.test(text)) return { rows: [{ is_test: Boolean(state.isTest) }] };
    throw new Error(`unexpected SQL in test: ${text.slice(0, 80)}`);
  };
  const selectChain = (table: any) => ({
    from: (t: any) => ({
      where: () => ({
        limit: async () => {
          const name = t?.[Symbol.for("drizzle:Name")] ?? t?._?.name;
          if (name === "payments" || table === "payments") return state.payment ? [state.payment] : [];
          return state.order ? [state.order] : [];
        },
      }),
    }),
  });
  const db = {
    execute,
    select: (projection?: any) => selectChain(projection && "method" in projection ? "payments" : "orders"),
    transaction: async (fn: (tx: any) => Promise<any>) => fn(db),
  };
  return db;
}

const storedOrder = {
  id: "order-1",
  orderNumber: "FH-1001",
  customerName: "زبون & <b>",
  customerPhone: "07700000000",
  shippingAddress: "بغداد - المنصور",
  items: [{ productId: "p1", productName: "YEE Filter", variantLabel: "12/16 mm", quantity: 2, priceAtPurchase: 8500, lineTotal: 17000 }],
  total: "22000",
  roundedTotal: "22000",
  shippingCost: "5000",
  discountTotal: "0",
  paymentStatus: "pending",
  createdAt: new Date("2026-09-18T12:45:00.000Z"),
};

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = "123:test";
  process.env.TELEGRAM_CHAT_ID = "42";
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
});

function telegramOk() {
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("durable merchant notification (shared by COD and Wayl)", () => {
  it("one COD order => exactly one Telegram message, built from the STORED order", async () => {
    const state = { order: storedOrder, payment: { method: "cod", status: "pending" }, outbox: [] as OutboxRow[] };
    (getDb as any).mockReturnValue(createFakeDb(state));
    const fetchMock = vi.fn(async () => telegramOk());
    vi.stubGlobal("fetch", fetchMock);

    await enqueueMerchantNotificationOutbox("order-1");
    const result = await processPaymentOutboxForOrder("order-1");

    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const text = JSON.parse(String((fetchMock.mock.calls[0] as any)[1].body)).text as string;
    expect(text).toContain("💵 الدفع عند الاستلام");
    expect(text).toContain("الخيار: 12/16 mm");
    expect(text).toContain("زبون &amp; &lt;b&gt;");
    expect(text).toContain("💰 <b>المطلوب: 22,000 د.ع</b>");
    expect(state.outbox[0].status).toBe("delivered");
  });

  it("a duplicate enqueue for the same order (repeated request / duplicate webhook) sends nothing more", async () => {
    const state = { order: storedOrder, payment: { method: "cod", status: "pending" }, outbox: [] as OutboxRow[] };
    (getDb as any).mockReturnValue(createFakeDb(state));
    const fetchMock = vi.fn(async () => telegramOk());
    vi.stubGlobal("fetch", fetchMock);

    await enqueueMerchantNotificationOutbox("order-1");
    await processPaymentOutboxForOrder("order-1");
    await enqueueMerchantNotificationOutbox("order-1");
    await enqueueMerchantNotificationOutbox("order-1");
    const second = await processPaymentOutboxForOrder("order-1");

    expect(state.outbox).toHaveLength(1);
    expect(second).toEqual({ processed: 0, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a verified Wayl payment renders as paid; an unpaid Wayl link never does", async () => {
    const paid = { ...storedOrder, paymentStatus: "paid" };
    const state = { order: paid, payment: { method: "wayl", status: "completed" }, outbox: [] as OutboxRow[] };
    (getDb as any).mockReturnValue(createFakeDb(state));

    expect((await buildMerchantNotificationFromStoredOrder(paid)).paymentMethod).toBe("wayl_paid");

    state.payment = { method: "wayl", status: "pending" };
    expect((await buildMerchantNotificationFromStoredOrder(storedOrder)).paymentMethod).toBe("cod");
  });

  it("a Telegram outage leaves the event pending for retry and never throws to the caller", async () => {
    const state = { order: storedOrder, payment: { method: "cod", status: "pending" }, outbox: [] as OutboxRow[] };
    (getDb as any).mockReturnValue(createFakeDb(state));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{\"ok\":false,\"description\":\"boom\"}", { status: 502 })));

    await enqueueMerchantNotificationOutbox("order-1");
    const result = await processPaymentOutboxForOrder("order-1");

    expect(result).toEqual({ processed: 0, failed: 1 });
    expect(state.outbox[0].status).toBe("pending");
    expect(state.outbox[0].last_error).toContain("HTTP 502");
  });

  it("skips test orders and marks the event delivered without calling Telegram", async () => {
    const state = { order: storedOrder, payment: { method: "cod", status: "pending" }, outbox: [] as OutboxRow[], isTest: true };
    (getDb as any).mockReturnValue(createFakeDb(state));
    const fetchMock = vi.fn(async () => telegramOk());
    vi.stubGlobal("fetch", fetchMock);

    await enqueueMerchantNotificationOutbox("order-1");
    await processPaymentOutboxForOrder("order-1");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.outbox[0].status).toBe("delivered");
  });

  it("missing Telegram config is a skip, not a retry loop", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const state = { order: storedOrder, payment: { method: "cod", status: "pending" }, outbox: [] as OutboxRow[] };
    (getDb as any).mockReturnValue(createFakeDb(state));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await enqueueMerchantNotificationOutbox("order-1");
    const result = await processPaymentOutboxForOrder("order-1");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, failed: 0 });
  });
});

describe("trigger-point contracts", () => {
  it("COD: the alert is enqueued only after createOrderSecure committed, after the idempotent early return, and can never fail the response", () => {
    const duplicateReturn = ordersRoute.search(/if \(existingOrder\) \{\r?\n\s+res\.status\(200\)\.json\(existingOrder\);/);
    const create = ordersRoute.indexOf("await storage.createOrderSecure");
    const notify = ordersRoute.indexOf("notifyMerchantOfCodOrder(order.id).catch(");
    const respond = ordersRoute.indexOf("res.status(201).json(response);");
    expect(duplicateReturn).toBeGreaterThan(-1);
    expect(duplicateReturn).toBeLessThan(create);
    expect(notify).toBeGreaterThan(create);
    expect(notify).toBeLessThan(respond);
    expect(ordersRoute).not.toMatch(/customerName: customerInfo\.name,\r?\n\s+customerPhone: customerInfo\.phone/);
  });

  it("Wayl: the alert is enqueued inside the paid-finalize transaction, after provider verification, and the webhook/return routes never send it directly", () => {
    const verify = waylService.indexOf("const link = await getWaylLinkByReferenceId(referenceId);");
    const finalize = waylService.indexOf("const finalized = await finalizePaidOrder(order.id, referenceId, context);");
    const enqueue = waylService.indexOf("await enqueuePaidOrderOutbox(tx, { orderId: updatedOrder.id, sessionId, loyaltyResult });");
    expect(verify).toBeGreaterThan(-1);
    expect(finalize).toBeGreaterThan(verify);
    expect(enqueue).toBeGreaterThan(-1);
    expect(waylService).toMatch(/if \(order\.paymentStatus === "paid" && payment\.status === "completed"\) \{\r?\n\s+return \{\r?\n\s+order,\r?\n\s+loyaltyResult: null,\r?\n\s+newlyFinalized: false,/);
    expect(waylRoute).not.toContain("sendOrderNotification");
    expect(waylService).not.toContain("sendOrderNotification");
    expect(maintenance).toContain('eventTypes = ["analytics", "loyalty", "logistics", "merchant_notification"]');
    expect(maintenance).toContain("ON CONFLICT(event_key) DO NOTHING");
  });

  it("outbox delivery derives the paid label from the stored payment row and rethrows Telegram failures", () => {
    expect(maintenance).toContain('payment?.method === "wayl" && payment?.status === "completed" && order.paymentStatus === "paid"');
    expect(maintenance).toContain("await sendOrderNotification(data, { rethrow: true });");
  });

  it("admin test orders notify only on explicit opt-in, directly and with the test prefix", () => {
    expect(testRoute).toContain("if (req.body?.notifyTelegram === true) {");
    expect(testRoute).toMatch(/paymentMethod: "cod",[\s\S]{0,120}testOrder: true,/);
    expect(testRoute).not.toContain("enqueueMerchantNotificationOutbox");
  });
});
