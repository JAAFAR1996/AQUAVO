import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { SQL, eq } from "drizzle-orm";
import { getTableConfig, PgDialect, type PgTable } from "drizzle-orm/pg-core";
import * as schema from "../../shared/schema";
import { getDb } from "../db";
import { awardFirstReferralPurchase } from "../services/referral-purchase-reward";
import { ReferralStorage } from "../storage/referral-storage";
import { LoyaltyStorage } from "../storage/loyalty-storage";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));
let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;
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
  for (const table of [schema.users, schema.orders, schema.payments, schema.referrals, schema.referralCodes, schema.loyaltyTransactions]) {
    await pg.exec(tableDdl(table));
  }
  db = drizzle(pg, { schema });
  vi.mocked(getDb).mockReturnValue(db as unknown as NonNullable<ReturnType<typeof getDb>>);
});
afterAll(async () => { await pg?.close(); });
beforeEach(async () => {
  await pg.exec("TRUNCATE users, orders, payments, referrals, referral_codes, loyalty_transactions;");
  await db.insert(schema.users).values([
    { id: "referrer", email: "referrer@example.invalid", passwordHash: "test" },
    { id: "buyer", email: "buyer@example.invalid", passwordHash: "test" },
    { id: "other", email: "other@example.invalid", passwordHash: "test" },
  ]);
  await db.insert(schema.referralCodes).values({ id: "code", code: "TEST-CODE", userId: "referrer" });
  await db.insert(schema.referrals).values({ id: "referral", referrerUserId: "referrer", referredUserId: "buyer", referralCodeId: "code", status: "registered" });
  await db.insert(schema.orders).values({ id: "first", userId: "buyer", total: "8549", roundedTotal: "8750", status: "pending", items: [], createdAt: new Date("2026-11-01T00:00:00Z") });
});
const points = async () => (await db.select().from(schema.users).where(eq(schema.users.id, "referrer")))[0].loyaltyPoints;

describe("atomic first referral purchase", () => {
  it("grants exactly 25 once across simultaneous retries and both legacy entry points", async () => {
    const storage = new ReferralStorage();
    const results = await Promise.all(Array.from({ length: 4 }, () => storage.markFirstPurchase("buyer", "first")));
    expect(new Set(results.map(result => result.discountCode)).size).toBe(1);
    expect(await points()).toBe(25);
    expect(await db.select().from(schema.loyaltyTransactions)).toHaveLength(1);
    expect(await new LoyaltyStorage().awardReferralPurchaseBonus("referrer", "first")).toBe(0);
    expect((await db.select().from(schema.orders))[0].roundedTotal).toBe("8750");
  });

  it("does not grant twice for two different concurrent orders from the same buyer", async () => {
    await db.insert(schema.orders).values({ id: "second", userId: "buyer", total: "10000", items: [], status: "pending", createdAt: new Date("2026-11-02T00:00:00Z") });
    const results = await Promise.all([awardFirstReferralPurchase({ orderId: "second" }), awardFirstReferralPurchase({ orderId: "first" })]);
    expect(results.map(result => result.pointsAwarded)).toEqual([0, 25]);
    expect((await db.select().from(schema.referrals))[0].firstOrderId).toBe("first");
    expect(await points()).toBe(25);
  });

  it("rolls back the claim and balance when the ledger rejects a grant, then safely retries", async () => {
    await pg.exec("ALTER TABLE loyalty_transactions ADD CONSTRAINT reject_referral_fixture CHECK (type <> 'referral_earn')");
    try {
      await expect(awardFirstReferralPurchase({ orderId: "first" })).rejects.toBeTruthy();
      expect(await points()).toBe(0);
      expect((await db.select().from(schema.referrals))[0]).toMatchObject({ status: "registered", firstOrderId: null, referredCouponCode: null });
    } finally { await pg.exec("ALTER TABLE loyalty_transactions DROP CONSTRAINT reject_referral_fixture"); }
    expect((await awardFirstReferralPurchase({ orderId: "first" })).pointsAwarded).toBe(25);
  });

  it("repairs a historical claim with no ledger without changing its discount code", async () => {
    await db.update(schema.referrals).set({ status: "first_purchase", firstOrderId: "first", referredCouponCode: "REF5-LEGACY" });
    const result = await awardFirstReferralPurchase({ orderId: "first" });
    expect(result).toMatchObject({ pointsAwarded: 25, discountCode: "REF5-LEGACY" });
    expect((await awardFirstReferralPurchase({ orderId: "first" })).pointsAwarded).toBe(0);
  });

  it("recognizes old ledger entries that did not have referralId metadata", async () => {
    await db.update(schema.referrals).set({ status: "first_purchase", firstOrderId: "first" });
    await db.update(schema.users).set({ loyaltyPoints: 25 }).where(eq(schema.users.id, "referrer"));
    await db.insert(schema.loyaltyTransactions).values({ userId: "referrer", type: "referral_earn", amount: 25, balanceAfter: 25, orderId: "first", description: "Historical grant", metadata: { triggeredBy: "first_purchase" } });
    expect((await awardFirstReferralPurchase({ orderId: "first" })).pointsAwarded).toBe(0);
    expect(await points()).toBe(25);
  });

  it("rejects wrong ownership, unrelated referrers, absent and cancelled orders", async () => {
    expect((await awardFirstReferralPurchase({ orderId: "first", referredUserId: "other" })).pointsAwarded).toBe(0);
    expect(await new LoyaltyStorage().awardReferralPurchaseBonus("other", "first")).toBe(0);
    expect((await awardFirstReferralPurchase({ orderId: "absent" })).pointsAwarded).toBe(0);
    await db.update(schema.orders).set({ status: "cancelled" });
    expect((await awardFirstReferralPurchase({ orderId: "first" })).pointsAwarded).toBe(0);
    expect(await points()).toBe(0);
  });

  it("requires verified online payment while retaining the existing accepted-COD timing", async () => {
    await db.insert(schema.payments).values({ orderId: "first", amount: "8750", method: "wayl", status: "pending" });
    expect((await awardFirstReferralPurchase({ orderId: "first" })).pointsAwarded).toBe(0);
    await db.update(schema.orders).set({ paymentStatus: "paid" });
    expect((await awardFirstReferralPurchase({ orderId: "first" })).pointsAwarded).toBe(25);
  });
});


describe("atomic referral signup reward", () => {
  it("credits 50 once, keeps statistics and ledger aligned, then independently credits the 25 purchase bonus", async () => {
    await db.delete(schema.referrals);
    const storage = new ReferralStorage();
    const referrals = await Promise.all(Array.from({ length: 4 }, () => storage.createReferral("code", "referrer", "buyer")));
    expect(new Set(referrals.map(referral => referral.id)).size).toBe(1);
    expect(await points()).toBe(50);
    expect((await db.select().from(schema.referralCodes))[0]).toMatchObject({ totalReferrals: 1, totalPointsEarned: 50 });
    expect(await db.select().from(schema.loyaltyTransactions)).toHaveLength(1);
    expect((await awardFirstReferralPurchase({ orderId: "first" })).pointsAwarded).toBe(25);
    expect(await points()).toBe(75);
    expect((await db.select().from(schema.loyaltyTransactions)).map(row => row.amount)).toEqual([50, 25]);
  });

  it("rolls back signup claim, points and statistics when the ledger write fails", async () => {
    await db.delete(schema.referrals);
    const storage = new ReferralStorage();
    await pg.exec("ALTER TABLE loyalty_transactions ADD CONSTRAINT reject_signup_fixture CHECK (amount <> 50)");
    try {
      await expect(storage.createReferral("code", "referrer", "buyer")).rejects.toBeTruthy();
      expect(await db.select().from(schema.referrals)).toHaveLength(0);
      expect(await points()).toBe(0);
      expect((await db.select().from(schema.referralCodes))[0]).toMatchObject({ totalReferrals: 0, totalPointsEarned: 0 });
    } finally { await pg.exec("ALTER TABLE loyalty_transactions DROP CONSTRAINT reject_signup_fixture"); }
    await storage.createReferral("code", "referrer", "buyer");
    expect(await points()).toBe(50);
  });

  it("rejects self-referral, an inactive code, the wrong code owner, and switching an existing referral", async () => {
    const storage = new ReferralStorage();
    await expect(storage.createReferral("code", "buyer", "buyer")).rejects.toMatchObject({ status: 400 });
    await expect(storage.createReferral("code", "other", "buyer")).rejects.toMatchObject({ status: 409 });
    await db.delete(schema.referrals);
    await expect(storage.createReferral("code", "other", "buyer")).rejects.toMatchObject({ status: 400 });
    await db.update(schema.referralCodes).set({ isActive: false });
    await expect(storage.createReferral("code", "referrer", "buyer")).rejects.toMatchObject({ status: 400 });
    expect(await points()).toBe(0);
  });

  it("does not recredit a historical signup merely because its old ledger was missing", async () => {
    await db.update(schema.referrals).set({ referrerPointsAwarded: 50 });
    await db.update(schema.users).set({ loyaltyPoints: 50 }).where(eq(schema.users.id, "referrer"));
    await new ReferralStorage().createReferral("code", "referrer", "buyer");
    expect(await points()).toBe(50);
    expect(await db.select().from(schema.loyaltyTransactions)).toHaveLength(0);
  });
});
