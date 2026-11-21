import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import type { CheckoutQuote } from "../../shared/checkout-quote";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../db.js", () => ({ getDb: () => state.db }));
vi.mock("../services/product-cost-snapshot.js", () => ({
  COST_SNAPSHOT_VERSION: 1,
  lockProductRowForUpdate: vi.fn(async () => ({ id: "p", name: "Filter", price: "3549", stock: 8, hasVariants: false })),
  buildProductCostSnapshot: vi.fn(() => ({})),
  toJsonbCostFields: vi.fn(() => ({ costStatus: "unresolved", costPrice: null })),
  toRelationalCostFields: vi.fn(() => ({})),
}));
vi.mock("../storage/loyalty-storage.js", () => ({ loyaltyStorage: {} }));
vi.mock("../storage/order-storage.js", () => ({ isCanonicalInventoryBalanceError: () => false, STOCK_ERROR_INSUFFICIENT: "Insufficient" }));
vi.mock("../services/order-notifications.js", () => ({ sendTelegramMessage: vi.fn() }));
vi.mock("../services/payment-maintenance.js", () => ({ enqueuePaidOrderOutbox: vi.fn(), processPaymentOutboxForOrder: vi.fn() }));
vi.mock("../services/wayl-client.js", () => ({ createWaylLink: vi.fn(), getWaylLinkByReferenceId: vi.fn() }));
import { prepareOnlineOrder } from "../services/wayl-order-payment";
import { lockProductRowForUpdate } from "../services/product-cost-snapshot";
import { checkoutQuotesMatch, CheckoutQuoteChanged } from "../../shared/checkout-quote";

class FakeDatabase {
  writes: Array<{ table: string; values: Record<string, unknown> }> = [];
  execute = vi.fn(async () => ({ rows: [] }));
  select() {
    return { from: (table: PgTable) => ({ where: () => ({ limit: async () =>
      getTableName(table) === "settings" ? [{ value: "5000" }] : [] }) }) };
  }
  insert = vi.fn((table: PgTable) => ({ values: (values: Record<string, unknown>) => {
    this.writes.push({ table: getTableName(table), values });
    return { returning: async () => [{ id: "payment", ...values }] };
  } }));
  transaction<T>(callback: (tx: FakeDatabase) => Promise<T>): Promise<T> { return callback(this); }
}
const quote: CheckoutQuote = { items: [{ productId: "p", quantity: 1, unitPrice: 3549 }],
  subtotal: 3549, shippingCost: 5000, discount: 0, amount: 8750 };
let db: FakeDatabase;
beforeEach(() => { db = new FakeDatabase(); state.db = db; });
const input = () => ({ idempotencyKey: randomUUID(), ownerSessionId: "isolated-test", userId: null,
  customerInfo: { name: "Test", phone: "07700000000", address: "Test address", notes: "  Call before delivery  " },
  whatsappMarketingOptIn: true, items: [{ productId: "p", quantity: 1 }] });

describe("server quote consent before creating a payment", () => {
  it("rejects an unaccepted amount before any order, payment or reservation write", async () => {
    const request = input();
    await expect(prepareOnlineOrder({ ...request, expectedQuote: { ...quote, amount: 8549 } }))
      .rejects.toMatchObject({ code: "CHECKOUT_QUOTE_CHANGED", status: 409, quote });
    expect(db.insert).not.toHaveBeenCalled();
    // The only execute reads reserved stock; no reservation writes occurred.
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it("preserves upward rounding, saves customer notes separately, and preserves WhatsApp consent", async () => {
    const result = await prepareOnlineOrder({ ...input(), expectedQuote: quote });
    const stored = db.writes.find(write => write.table === "orders")!.values;
    expect(stored).toMatchObject({ total: "8549", roundedTotal: "8750", roundingCashback: 201,
      customerNotes: "Call before delivery", whatsappMarketingOptIn: true });
    expect(stored).not.toHaveProperty("notes");
    expect(result.payment.amount).toBe("8750");
    expect(db.execute).toHaveBeenCalledTimes(3);
  });

  it("refuses direct payment creation for a hidden product even at a valid known price", async () => {
    vi.mocked(lockProductRowForUpdate).mockResolvedValueOnce({
      id: "p", name: "Private invoice item", price: "3549", stock: 8,
      variants: null, hasVariants: false, isStorefrontVisible: false,
      costPrice: null, packagingCost: null, insertCost: null,
    });
    await expect(prepareOnlineOrder({ ...input(), expectedQuote: quote })).rejects.toMatchObject({ status: 400 });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("also detects changed line prices even if the rounded payable total is equal", () => {
    expect(checkoutQuotesMatch(quote, { ...quote, items: [{ productId: "p", quantity: 1, unitPrice: 3550 }], subtotal: 3550 })).toBe(false);
    expect(checkoutQuotesMatch(quote, structuredClone(quote))).toBe(true);
    expect(new CheckoutQuoteChanged(quote).quote).not.toHaveProperty("costPrice");
  });
});
