import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { SQL, eq, sql } from "drizzle-orm";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import * as schema from "../../shared/schema";
import { getDb } from "../db";
import { LoyaltyStorage, loyaltyStorage } from "../storage/loyalty-storage";
import { transitionAdminOrderStatus } from "../routes/admin-orders-v2";
import { applyPackagingLifecycle } from "../services/packaging-lifecycle-runner";
import { syncAutomaticReturnLifecycle } from "../services/order-return-automation-v2";
import { badgeEngine } from "../storage/badge-engine";
import { challengeStorage } from "../storage/challenge-storage";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));
vi.mock("../services/packaging-lifecycle-runner.js", () => ({ applyPackagingLifecycle: vi.fn() }));
vi.mock("../services/order-return-automation-v2.js", () => ({ syncAutomaticReturnLifecycle: vi.fn() }));
vi.mock("../storage/badge-engine.js", () => ({ badgeEngine: { checkAndAwardBadges: vi.fn() } }));
vi.mock("../storage/challenge-storage.js", () => ({ challengeStorage: { updateProgress: vi.fn() } }));
let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;
const storage = new LoyaltyStorage();

function tableDdl(table: PgTable): string {
  const config = getTableConfig(table), dialect = new PgDialect();
  const columns = config.columns.map(column => {
    let value = `"${column.name}" ${column.getSQLType()}`;
    if (column.primary) value += " PRIMARY KEY";
    if (column.notNull) value += " NOT NULL";
    if (column.default !== undefined) {
      const fallback = column.default;
      const literal = fallback instanceof SQL ? dialect.sqlToQuery(fallback).sql
        : fallback === null ? "NULL" : typeof fallback === "number" || typeof fallback === "boolean" ? String(fallback)
        : `'${(typeof fallback === "string" ? fallback : JSON.stringify(fallback)).replace(/'/g, "''")}'`;
      value += ` DEFAULT ${literal}`;
    }
    return value;
  });
  return `CREATE TABLE "${config.name}" (${columns.join(",")});`;
}

beforeAll(async () => {
  pg = new PGlite(); await pg.waitReady;
  for (const table of [schema.users, schema.orders, schema.loyaltyTransactions, schema.accountingAuditTrail]) await pg.exec(tableDdl(table));
  await pg.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_fee numeric, ADD COLUMN IF NOT EXISTS client_ip text;");
  db = drizzle(pg, { schema });
  vi.mocked(getDb).mockReturnValue(db as unknown as NonNullable<ReturnType<typeof getDb>>);
});
afterAll(async () => { await pg?.close(); });
afterEach(() => { vi.restoreAllMocks(); });
beforeEach(async () => {
  await pg.exec("TRUNCATE users, orders, loyalty_transactions, accounting_audit_trail;");
  vi.mocked(applyPackagingLifecycle).mockReset().mockResolvedValue({ action: "none", detail: "noop", reasonAr: "Synthetic fixture" });
  vi.mocked(syncAutomaticReturnLifecycle).mockReset().mockResolvedValue({ eventId: null, action: "none" });
  vi.mocked(badgeEngine.checkAndAwardBadges).mockReset().mockResolvedValue([]);
  vi.mocked(challengeStorage.updateProgress).mockReset().mockResolvedValue(null);
  await db.insert(schema.users).values({
    id: "member", email: "member@example.invalid", passwordHash: "fixture",
    loyaltyPoints: 100, cashbackBalance: 50, pendingLoyaltyPoints: 0,
    pendingCashbackBalance: 0, totalSpent: 0, loyaltyTier: "bronze",
  });
});

describe("canonical status retry after a post-commit loyalty failure", () => {
  const actor = { id: "test-admin", name: "Synthetic operator" };
  const runtimeDb = () => db as unknown as NonNullable<ReturnType<typeof getDb>>;

  it.each(["delivered", "cancelled", "rejected", "rejected_returned", "rejected_carrier", "returned"])(
    "recovers %s settlement on the unchanged status without replaying other customer effects",
    async (status) => {
      await seedPending("order", "processing");
      await db.update(schema.orders).set({ total: "8549", carrier: "Fixture carrier" });
      const bonus = vi.spyOn(loyaltyStorage, "generateOrderBonus").mockResolvedValue(null);
      const milestones = vi.spyOn(loyaltyStorage, "checkMilestones").mockResolvedValue({ milestones: [], tierChanged: false });
      const loggedFailure = vi.spyOn(console, "error").mockImplementation(() => undefined);
      await pg.exec("ALTER TABLE users ADD CONSTRAINT reject_status_settlement CHECK (pending_loyalty_points > 0)");
      try {
        const first = await transitionAdminOrderStatus(runtimeDb(), "order", { status }, actor);
        expect(first.oldStatus).toBe("processing");
        expect(first.order).toMatchObject({ status, total: "8549", roundedTotal: "8750" });
        expect(loggedFailure).toHaveBeenCalledWith("[AdminOrdersV2] post-commit loyalty effect failed", expect.anything());
        expect((await ledger()).map(entry => entry.status)).toEqual(["pending", "pending"]);
        expect(await member()).toMatchObject({ loyaltyPoints: 100, cashbackBalance: 50, pendingLoyaltyPoints: 3, pendingCashbackBalance: 201, totalSpent: 0 });
      } finally {
        await pg.exec("ALTER TABLE users DROP CONSTRAINT reject_status_settlement");
      }

      const retry = await transitionAdminOrderStatus(runtimeDb(), "order", { status }, actor);
      expect(retry.oldStatus).toBe(status);
      expect(retry.order).toMatchObject({ status, total: "8549", roundedTotal: "8750" });
      const isDelivery = status === "delivered";
      expect(await member()).toMatchObject({
        loyaltyPoints: isDelivery ? 103 : 100, cashbackBalance: isDelivery ? 251 : 50,
        pendingLoyaltyPoints: 0, pendingCashbackBalance: 0, totalSpent: isDelivery ? 8750 : 0,
      });
      const settledLedger = await ledger();
      expect(settledLedger).toHaveLength(isDelivery ? 2 : 3);
      expect(settledLedger.every(entry => entry.status === (isDelivery ? "approved" : "cancelled"))).toBe(true);

      await transitionAdminOrderStatus(runtimeDb(), "order", { status }, actor);
      expect(await ledger()).toEqual(settledLedger);
      expect(applyPackagingLifecycle).toHaveBeenCalledTimes(1);
      expect(syncAutomaticReturnLifecycle).toHaveBeenCalledTimes(1);
      expect(bonus).not.toHaveBeenCalled();
      expect(milestones).not.toHaveBeenCalled();
      expect(badgeEngine.checkAndAwardBadges).not.toHaveBeenCalled();
      expect(challengeStorage.updateProgress).not.toHaveBeenCalled();
    },
  );

  it("keeps fresh delivery effects once while settling repeated delivery requests idempotently", async () => {
    await seedPending("order", "processing");
    await db.update(schema.orders).set({ total: "8549", carrier: "Fixture carrier" });
    const bonus = vi.spyOn(loyaltyStorage, "generateOrderBonus").mockResolvedValue(null);
    const milestones = vi.spyOn(loyaltyStorage, "checkMilestones").mockResolvedValue({ milestones: [], tierChanged: false });
    await transitionAdminOrderStatus(runtimeDb(), "order", { status: "delivered" }, actor);
    await transitionAdminOrderStatus(runtimeDb(), "order", { status: "delivered" }, actor);
    expect(await member()).toMatchObject({ loyaltyPoints: 103, cashbackBalance: 251, totalSpent: 8750, pendingLoyaltyPoints: 0, pendingCashbackBalance: 0 });
    expect(bonus).toHaveBeenCalledExactlyOnceWith("member", "order");
    expect(milestones).toHaveBeenCalledExactlyOnceWith("member");
    expect(badgeEngine.checkAndAwardBadges).toHaveBeenCalledExactlyOnceWith("member");
    expect(challengeStorage.updateProgress).toHaveBeenCalledExactlyOnceWith("member", "cross_category", 1);
    expect(await ledger()).toHaveLength(2);
  });
});

async function seedPending(orderId = "order", status = "delivered", loyalty = 3, cashback = 201, total = 8750) {
  await db.insert(schema.orders).values({
    id: orderId, userId: "member", status, total: String(total), roundedTotal: String(total), items: [],
  });
  await db.update(schema.users).set({
    pendingLoyaltyPoints: sql`${schema.users.pendingLoyaltyPoints} + ${loyalty}`,
    pendingCashbackBalance: sql`${schema.users.pendingCashbackBalance} + ${cashback}`,
  }).where(eq(schema.users.id, "member"));
  await db.insert(schema.loyaltyTransactions).values([
    { userId: "member", orderId, type: "purchase_earn", pointsType: "loyalty", status: "pending", amount: loyalty, balanceAfter: loyalty, description: "Synthetic pending purchase points" },
    { userId: "member", orderId, type: "rounding_earn", pointsType: "cashback", status: "pending", amount: cashback, balanceAfter: cashback, description: "Synthetic pending rounding cashback" },
  ]);
}
const member = async () => (await db.select().from(schema.users).where(eq(schema.users.id, "member")))[0];
const ledger = async () => db.select().from(schema.loyaltyTransactions);

describe("atomic order loyalty lifecycle", () => {
  it("approves each order once while preserving simultaneous welcome and other order awards", async () => {
    await seedPending("first");
    await seedPending("second", "delivered", 5, 24, 12500);
    await Promise.all([
      storage.approveOrderPoints("member", "first", 8750),
      storage.approveOrderPoints("member", "second", 12500),
      storage.awardWelcomeBonus("member"),
    ]);
    expect(await member()).toMatchObject({
      loyaltyPoints: 128, cashbackBalance: 275, totalSpent: 21250,
      pendingLoyaltyPoints: 0, pendingCashbackBalance: 0, welcomeBonusClaimed: true,
    });
    expect(await ledger()).toHaveLength(5);
    expect((await ledger()).every(entry => entry.status === "approved")).toBe(true);
    await Promise.all([
      storage.approveOrderPoints("member", "first", 8750),
      storage.approveOrderPoints("member", "second", 12500),
      storage.awardWelcomeBonus("member"),
    ]);
    expect(await member()).toMatchObject({ loyaltyPoints: 128, cashbackBalance: 275, totalSpent: 21250 });
    expect(await ledger()).toHaveLength(5);
  });

  it.each(["approve", "cancel"] as const)("rolls back every %s ledger change when the balance write fails, then permits a safe retry", async (action) => {
    await seedPending("order", action === "approve" ? "delivered" : "cancelled");
    await pg.exec("ALTER TABLE users ADD CONSTRAINT reject_lifecycle_balance CHECK (pending_loyalty_points > 0)");
    const settle = () => action === "approve"
      ? storage.approveOrderPoints("member", "order", 8750)
      : storage.cancelOrderPoints("member", "order");
    try {
      await expect(settle()).rejects.toBeTruthy();
      expect((await ledger()).map(entry => entry.status)).toEqual(["pending", "pending"]);
      expect(await member()).toMatchObject({
        loyaltyPoints: 100, cashbackBalance: 50, pendingLoyaltyPoints: 3,
        pendingCashbackBalance: 201, totalSpent: 0,
      });
    } finally { await pg.exec("ALTER TABLE users DROP CONSTRAINT reject_lifecycle_balance"); }
    await settle();
    expect(await member()).toMatchObject({
      loyaltyPoints: action === "approve" ? 103 : 100,
      cashbackBalance: action === "approve" ? 251 : 50,
      totalSpent: action === "approve" ? 8750 : 0,
      pendingLoyaltyPoints: 0, pendingCashbackBalance: 0,
    });
    expect((await ledger()).every(entry => entry.status === (action === "approve" ? "approved" : "cancelled"))).toBe(true);
  });

  it("rolls back the tier and balances if its promotion ledger insert fails", async () => {
    await seedPending();
    await db.update(schema.users).set({ totalSpent: 399000 });
    await pg.exec("ALTER TABLE loyalty_transactions ADD CONSTRAINT reject_tier_ledger CHECK (type <> 'tier_bonus')");
    try {
      await expect(storage.approveOrderPoints("member", "order", 8750)).rejects.toBeTruthy();
      expect(await member()).toMatchObject({ loyaltyPoints: 100, cashbackBalance: 50, totalSpent: 399000, loyaltyTier: "bronze", pendingLoyaltyPoints: 3 });
      expect((await ledger()).map(entry => entry.status)).toEqual(["pending", "pending"]);
    } finally { await pg.exec("ALTER TABLE loyalty_transactions DROP CONSTRAINT reject_tier_ledger"); }
    await storage.approveOrderPoints("member", "order", 8750);
    expect(await member()).toMatchObject({ loyaltyPoints: 103, cashbackBalance: 251, totalSpent: 407750, loyaltyTier: "silver" });
    expect((await ledger()).filter(entry => entry.type === "tier_bonus")).toHaveLength(1);
    await storage.approveOrderPoints("member", "order", 8750);
    expect((await ledger()).filter(entry => entry.type === "tier_bonus")).toHaveLength(1);
  });

  it("rolls back cancelled balances and pending claims when cancellation audit fails", async () => {
    await seedPending("order", "cancelled");
    await pg.exec("ALTER TABLE loyalty_transactions ADD CONSTRAINT reject_cancellation_ledger CHECK (type <> 'order_cancelled')");
    try {
      await expect(storage.cancelOrderPoints("member", "order")).rejects.toBeTruthy();
      expect(await member()).toMatchObject({ pendingLoyaltyPoints: 3, pendingCashbackBalance: 201, loyaltyPoints: 100, cashbackBalance: 50 });
      expect((await ledger()).map(entry => entry.status)).toEqual(["pending", "pending"]);
    } finally { await pg.exec("ALTER TABLE loyalty_transactions DROP CONSTRAINT reject_cancellation_ledger"); }
    await Promise.all(Array.from({ length: 4 }, () => storage.cancelOrderPoints("member", "order")));
    const cancellations = (await ledger()).filter(entry => entry.type === "order_cancelled");
    expect(cancellations).toHaveLength(1);
    expect(cancellations[0]).toMatchObject({ amount: -204, pointsType: "loyalty", status: "cancelled" });
    expect(await member()).toMatchObject({ pendingLoyaltyPoints: 0, pendingCashbackBalance: 0, loyaltyPoints: 100, cashbackBalance: 50 });
  });

  it.each(["cancelled", "rejected", "rejected_returned", "rejected_carrier", "returned"])("ignores a stale delivery effect after the current status becomes %s", async (status) => {
    await seedPending("order", status);
    await Promise.all([
      storage.approveOrderPoints("member", "order", 8750),
      storage.cancelOrderPoints("member", "order"),
    ]);
    expect(await member()).toMatchObject({ loyaltyPoints: 100, cashbackBalance: 50, totalSpent: 0, pendingLoyaltyPoints: 0, pendingCashbackBalance: 0 });
    expect((await ledger()).filter(entry => entry.type === "order_cancelled")).toHaveLength(1);
    expect((await ledger()).every(entry => entry.status === "cancelled")).toBe(true);
  });

  it("ignores stale cancellation after fulfillment resumes and preserves delivery approval", async () => {
    await seedPending("order", "processing");
    await storage.cancelOrderPoints("member", "order");
    expect((await ledger()).map(entry => entry.status)).toEqual(["pending", "pending"]);
    await db.update(schema.orders).set({ status: "delivered" });
    await Promise.all([
      storage.cancelOrderPoints("member", "order"),
      storage.approveOrderPoints("member", "order", 8750),
    ]);
    expect(await member()).toMatchObject({ loyaltyPoints: 103, cashbackBalance: 251, totalSpent: 8750 });
    expect((await ledger()).map(entry => entry.status)).toEqual(["approved", "approved"]);
  });

  it("does not alter another user's or an absent order's pending ledger", async () => {
    await seedPending();
    await storage.approveOrderPoints("other", "order", 8750);
    await storage.approveOrderPoints("member", "missing", 8750);
    await db.update(schema.orders).set({ status: "cancelled" });
    await storage.cancelOrderPoints("other", "order");
    await storage.cancelOrderPoints("member", "missing");
    expect((await ledger()).map(entry => entry.status)).toEqual(["pending", "pending"]);
    expect(await member()).toMatchObject({ loyaltyPoints: 100, cashbackBalance: 50, pendingLoyaltyPoints: 3, pendingCashbackBalance: 201 });
  });

  it("preserves the existing policy of not clawing back already approved balances on return", async () => {
    await seedPending();
    await storage.approveOrderPoints("member", "order", 8750);
    await db.update(schema.orders).set({ status: "returned" });
    await storage.cancelOrderPoints("member", "order");
    expect(await member()).toMatchObject({ loyaltyPoints: 103, cashbackBalance: 251, totalSpent: 8750, pendingLoyaltyPoints: 0, pendingCashbackBalance: 0 });
    expect((await ledger()).map(entry => entry.status)).toEqual(["approved", "approved"]);
  });
});
