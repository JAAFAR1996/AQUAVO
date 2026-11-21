import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { LoyaltyNotificationService } from "../services/loyalty-notifications";
import type { TransactionalOrderLoyaltyResult } from "../storage/loyalty-storage";
import { users } from "../../shared/schema";

const state = vi.hoisted(() => ({ coupons: vi.fn(), notifications: vi.fn(), select: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: vi.fn() }));
vi.mock("../storage/index.js", () => ({ storage: { createCoupon: state.coupons } }));
beforeEach(() => {
  state.coupons.mockReset(); state.notifications.mockReset(); state.select.mockReset();
  state.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ lb: 10 }] }) }) });
  const db = {
    select: state.select,
    insert: () => ({ values: state.notifications }),
  };
  vi.mocked(getDb).mockReturnValue(db as unknown as NonNullable<ReturnType<typeof getDb>>);
});

describe("transactional purchase notification contract", () => {
  it("accepts the real purchase result without inventing an approved balance or granting coupons from pending points", async () => {
    const result: TransactionalOrderLoyaltyResult = {
      purchasePoints: 1000, roundingPoints: 201, roundedTotal: 8750,
      newTier: "bronze", tierChanged: false, actualCashbackUsed: 0, pointsDiscount: 0,
      newCashbackBalance: 0, newPendingCashbackBalance: 201, newPendingLoyaltyPoints: 1000,
    };
    await new LoyaltyNotificationService().sendPostPurchaseNotifications("member", "order", result);
    expect(state.notifications).toHaveBeenCalledTimes(1);
    expect(state.notifications).toHaveBeenCalledWith(expect.objectContaining({
      type: "loyalty_points_earned",
      metadata: expect.objectContaining({ orderId: "order", purchasePoints: 1000, roundingPoints: 201, totalBalance: 10 }),
    }));
    expect(state.select).toHaveBeenCalledWith({ lb: users.loyaltyPoints });
    expect(state.coupons).not.toHaveBeenCalled();
  });
});
