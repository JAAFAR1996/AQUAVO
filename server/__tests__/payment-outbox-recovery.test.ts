import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), claim: vi.fn(), selectLimit: vi.fn(), notify: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: () => ({
  execute: mocks.execute,
  transaction: (run: (tx: { execute: typeof mocks.claim }) => Promise<unknown>) => run({ execute: mocks.claim }),
  select: () => ({ from: () => ({ where: () => ({ limit: mocks.selectLimit }) }) }),
}) }));
vi.mock("../services/analytics-tracker.js", () => ({ analyticsTracker: {} }));
vi.mock("../services/loyalty-notifications.js", () => ({ loyaltyNotifications: {} }));
vi.mock("../storage/referral-storage.js", () => ({ ReferralStorage: class {} }));
vi.mock("../storage/loyalty-storage.js", () => ({ loyaltyStorage: {} }));
vi.mock("../services/order-notifications.js", () => ({ sendOrderNotification: mocks.notify }));
import { processPaymentOutbox } from "../services/payment-maintenance.js";
const dialect = new PgDialect();
const writes: string[] = [];
beforeEach(() => {
  vi.clearAllMocks(); writes.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.claim.mockResolvedValue({ rows: [{ id: "event-1", orderId: "order-1", eventType: "merchant_notification", payload: {}, attempts: 1 }] });
  mocks.selectLimit.mockResolvedValueOnce([{ id: "order-1", total: "5000", items: [], paymentStatus: "unpaid" }]).mockResolvedValueOnce([]);
  mocks.execute.mockImplementation(async (query) => {
    const text = dialect.sqlToQuery(query).sql;
    if (text.includes("SELECT is_test")) return { rows: [{ is_test: false }] };
    writes.push(text); return { rows: [] };
  });
});
afterEach(() => vi.restoreAllMocks());
describe("merchant outbox during integration recovery", () => {
  it("leaves an unconfigured Telegram notification pending for retry", async () => {
    mocks.notify.mockResolvedValue("skipped");
    expect(await processPaymentOutbox(1)).toEqual({ processed: 0, failed: 1 });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("SET status='pending'");
    expect(writes[0]).not.toContain("SET status='delivered'");
  });
  it("marks a confirmed send delivered", async () => {
    mocks.notify.mockResolvedValue("sent");
    expect(await processPaymentOutbox(1)).toEqual({ processed: 1, failed: 0 });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("SET status='delivered'");
  });
});
