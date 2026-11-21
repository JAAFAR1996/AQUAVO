import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { IN_PROGRESS_STATUSES, REALIZED_STATUSES } from "../../shared/order-financials.js";
import { loyaltyTransactions, orders, payments, referrals, users, type Referral } from "../../shared/schema.js";
import { getDb } from "../db.js";

export const REFERRAL_FIRST_PURCHASE_BONUS = 25;
const purchaseStatuses = [...IN_PROGRESS_STATUSES, ...REALIZED_STATUSES];

type Result = { referral: Referral | null; discountCode: string | null; pointsAwarded: number };
const none = (): Result => ({ referral: null, discountCode: null, pointsAwarded: 0 });

/** Claim, balance and ledger share one transaction. Existing partial legacy
 * claims can be repaired by replaying the same order, without granting twice.
 * Policy is unchanged: accepted COD orders and verified online purchases qualify.
 */
export async function awardFirstReferralPurchase(input: {
  orderId: string;
  referredUserId?: string;
  expectedReferrerUserId?: string;
}): Promise<Result> {
  const db = getDb();
  if (!db) throw new Error("Database not connected");
  return db.transaction(async tx => {
    // Match the commerce lock order: order first, then account balance.
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1).for("update");
    if (!order?.userId || (input.referredUserId && order.userId !== input.referredUserId)
      || !purchaseStatuses.some(status => status === order.status)) return none();
    const orderPayments = await tx.select({ method: payments.method }).from(payments)
      .where(eq(payments.orderId, order.id));
    if (orderPayments.some(payment => ["wayl", "alqaseh"].includes(payment.method)) && order.paymentStatus !== "paid") return none();

    // Lock all records for the referred account in a stable order. This also
    // prevents legacy duplicate referral rows from earning another first reward.
    const candidates = await tx.select().from(referrals).where(eq(referrals.referredUserId, order.userId))
      .orderBy(asc(referrals.createdAt), asc(referrals.id)).for("update");
    const referral = candidates.find(candidate => candidate.firstOrderId) ?? candidates[0];
    if (!referral || referral.referrerUserId === order.userId
      || (input.expectedReferrerUserId && referral.referrerUserId !== input.expectedReferrerUserId)) return none();
    if (referral.firstOrderId && referral.firstOrderId !== order.id) return none();
    if (!referral.firstOrderId) {
      if (referral.status !== "registered") return none();
      const [firstOrder] = await tx.select({ id: orders.id }).from(orders)
        .where(and(eq(orders.userId, order.userId), inArray(orders.status, purchaseStatuses)))
        .orderBy(asc(orders.createdAt), asc(orders.id)).limit(1);
      if (firstOrder?.id !== order.id) return none();
    }

    const [referrer] = await tx.select().from(users).where(eq(users.id, referral.referrerUserId)).limit(1).for("update");
    if (!referrer) return none();
    const [previous] = await tx.select({ id: loyaltyTransactions.id }).from(loyaltyTransactions)
      .where(and(eq(loyaltyTransactions.userId, referrer.id), eq(loyaltyTransactions.type, "referral_earn"),
        or(eq(loyaltyTransactions.orderId, order.id), and(
          sql`${loyaltyTransactions.metadata}->>'referralId' = ${referral.id}`,
          sql`${loyaltyTransactions.metadata}->>'triggeredBy' = 'first_purchase'`))))
      .limit(1);

    const discountCode = referral.referredCouponCode ?? `REF5-${randomBytes(3).toString("hex").toUpperCase()}`;
    const [claimed] = await tx.update(referrals).set({
      status: referral.status === "rewarded" ? "rewarded" : "first_purchase",
      firstOrderId: order.id,
      firstOrderDate: referral.firstOrderDate ?? new Date(),
      referredDiscountAwarded: true, referredCouponCode: discountCode, updatedAt: new Date(),
    }).where(eq(referrals.id, referral.id)).returning();
    if (!claimed) throw new Error("Referral claim returned no record");
    if (previous) return { referral: claimed, discountCode, pointsAwarded: 0 };

    const balance = (referrer.loyaltyPoints ?? 0) + REFERRAL_FIRST_PURCHASE_BONUS;
    await tx.update(users).set({ loyaltyPoints: balance, updatedAt: new Date() }).where(eq(users.id, referrer.id));
    await tx.insert(loyaltyTransactions).values({
      userId: referrer.id, type: "referral_earn", pointsType: "loyalty", status: "approved",
      amount: REFERRAL_FIRST_PURCHASE_BONUS, balanceAfter: balance, orderId: order.id,
      description: `كسبت ${REFERRAL_FIRST_PURCHASE_BONUS} نقطة لأن صديقك المُحال اشترى أول طلب!`,
      metadata: { triggeredBy: "first_purchase", referralId: referral.id },
    });
    return { referral: claimed, discountCode, pointsAwarded: REFERRAL_FIRST_PURCHASE_BONUS };
  });
}
