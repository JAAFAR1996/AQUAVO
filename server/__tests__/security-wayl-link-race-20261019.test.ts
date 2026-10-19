import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
const state = vi.hoisted(() => ({ db: null as any, product: null as any, createLink: vi.fn(), eligible: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: () => state.db }));
vi.mock("../storage/loyalty-storage.js", () => ({ loyaltyStorage: {} }));
vi.mock("../services/order-notifications.js", () => ({ sendTelegramMessage: vi.fn(async () => {}) }));
vi.mock("../services/payment-maintenance.js", () => ({ enqueuePaidOrderOutbox: vi.fn(), processPaymentOutboxForOrder: vi.fn() }));
vi.mock("../services/wayl-client.js", () => ({ createWaylLink: (...args: any[]) => state.createLink(...args), getWaylLinkByReferenceId: vi.fn() }));
vi.mock("../services/coupon-policy.js", async (original) => ({
  ...await original<any>(), eligibleCoupon: (...args: any[]) => state.eligible(...args),
}));
vi.mock("../services/product-cost-snapshot.js", async (original) => ({
  ...await original<any>(), lockProductRowForUpdate: vi.fn(async () => state.product),
}));
import { startWaylPaymentForOrder } from "../services/wayl-order-payment.js";
let order: any, payment: any, writes: Array<{ table: string; values: any }>;
const urls = { redirectUrl: "https://store.example/return", webhookUrl: "https://store.example/webhook" };
const link = { id: "synthetic-link", url: "https://provider.example/pay/synthetic", status: "Created" };
beforeEach(() => {
  order = { id: "synthetic-order", orderNumber: "SYNTHETIC", userId: null, status: "pending_payment", paymentStatus: "pending", total: "10000", roundedTotal: "10000", items: [{ productId: "synthetic-product", quantity: 1, priceAtPurchase: 5000 }] };
  payment = { id: "synthetic-payment", orderId: order.id, method: "wayl", status: "pending", amount: "10000", currency: "IQD", transactionId: null, providerResponse: { attempts: [] } };
  state.product = { id: "synthetic-product", stock: 10, price: "5000", variants: [], hasVariants: false };
  writes = []; state.createLink.mockReset(); state.eligible.mockReset();
  state.eligible.mockResolvedValue({ id: "synthetic-coupon", code: "SYNTHETIC" });
  const db: any = {
    select: () => ({ from: (table: any) => ({ where: () => ({ limit: async () => [structuredClone(getTableName(table) === "orders" ? order : getTableName(table) === "payments" ? payment : { id: "synthetic-coupon", code: "SYNTHETIC" })] }) }) }),
    execute: async () => ({ rows: [{ reserved: 0 }] }),
    update: (table: any) => ({ set: (values: any) => ({ where: () => {
      writes.push({ table: getTableName(table), values: structuredClone(values) });
      const target = getTableName(table) === "orders" ? order : payment;
      Object.assign(target, values);
      return { then: (resolve: any) => Promise.resolve(resolve([structuredClone(target)])), returning: async () => [structuredClone(target)] };
    } }) }),
    transaction: async (fn: any) => fn(db),
  };
  state.db = db;
});
async function pauseProvider() {
  let release!: (value: any) => void, entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  state.createLink.mockImplementation(() => { entered(); return new Promise(resolve => { release = resolve; }); });
  return { started, release: (value: any) => release(value) };
}
describe("Real link creation across delayed provider responses", () => {
  it("does not revive a cancelled order or return a payable URL after cancellation", async () => {
    const provider = await pauseProvider();
    const attempt = startWaylPaymentForOrder(order.id, urls);
    const rejected = expect(attempt).rejects.toMatchObject({ status: 409 });
    await provider.started;
    order.status = "cancelled"; order.paymentStatus = "cancelled"; payment.status = "cancelled";
    const before = writes.length; provider.release(link); await rejected;
    expect(order.status).toBe("cancelled"); expect(payment.status).toBe("cancelled");
    expect(writes).toHaveLength(before);
  });
  it("preserves a verified early webhook completion while the create call is in flight", async () => {
    const provider = await pauseProvider(); const attempt = startWaylPaymentForOrder(order.id, urls);
    await provider.started;
    order.status = "pending"; order.paymentStatus = "paid"; payment.status = "completed";
    const before = writes.length; provider.release(link); await attempt;
    expect(order.paymentStatus).toBe("paid"); expect(payment.status).toBe("completed"); expect(writes).toHaveLength(before);
  });
  it("rejects an exhausted coupon before issuing a retry link", async () => {
    order.couponId = "synthetic-coupon"; order.paymentStatus = "failed"; payment.status = "failed";
    payment.transactionId = order.id; payment.providerResponse.attempts = [{ referenceId: order.id, status: "Rejected", url: link.url }];
    state.eligible.mockRejectedValue(Object.assign(new Error("Coupon capacity unavailable"), { status: 400 }));
    await expect(startWaylPaymentForOrder(order.id, urls, { forceNew: true })).rejects.toThrow("Coupon capacity unavailable");
    expect(state.createLink).not.toHaveBeenCalled(); expect(order.paymentStatus).toBe("failed");
  });
  it("reacquires the retry coupon hold before provider I/O and excludes its own old order", async () => {
    order.couponId = "synthetic-coupon"; order.paymentStatus = "failed"; payment.status = "failed";
    payment.transactionId = order.id; payment.providerResponse.attempts = [{ referenceId: order.id, status: "Rejected", url: link.url }];
    state.createLink.mockImplementation(async () => {
      expect(order.paymentStatus).toBe("pending"); return link;
    });
    await startWaylPaymentForOrder(order.id, urls, { forceNew: true });
    expect(state.eligible).toHaveBeenCalledWith(state.db, "SYNTHETIC", { userId: null, subtotal: 5000, excludeOrderId: order.id });
    expect(state.createLink).toHaveBeenCalledTimes(1);
  });
});
