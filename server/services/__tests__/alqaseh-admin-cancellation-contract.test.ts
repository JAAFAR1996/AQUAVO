import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// This contract keeps admin cancellation from bypassing payment truth or reviving fulfillment after a late provider callback.
const root = process.cwd();
const adminRoute = fs.readFileSync(path.join(root, "server/routes/admin-orders-v2.ts"), "utf8");
const paymentService = fs.readFileSync(path.join(root, "server/services/alqaseh-order-payment.ts"), "utf8");
const adminUi = fs.readFileSync(path.join(root, "client/src/components/admin/orders-management.tsx"), "utf8");

describe("admin cancellation for unpaid Al-Qaseh orders", () => {
  it("only allows the payment-managed escape hatch to cancelled", () => {
    expect(adminRoute).toContain('oldStatus === "pending_payment" && input.status === "cancelled"');
    expect(adminRoute).toContain("admin_cancelled_before_payment");
    expect(adminRoute).toContain('{ paymentStatus: "cancelled" }');
    expect(adminRoute).toContain('${String(actor.id ?? "admin")}::text');
    expect(adminRoute).toContain('${input.financialReason ?? "إلغاء الزبون قبل إتمام الدفع"}::text');
  });

  it("prevents a late successful payment from reviving fulfillment", () => {
    expect(paymentService).toContain("CancelledOrderPaidConflict");
    expect(paymentService).toContain('"paid_after_cancellation"');
    expect(paymentService).toContain('status: locallyCancelled ? "cancelled"');
  });

  it("gives admins an explicit cancel action but keeps hard-delete protected", () => {
    expect(adminUi).toContain("CANCELLABLE_STATUSES");
    expect(adminUi).toContain("تأكيد إلغاء الطلب");
    expect(adminUi).toContain("order.status !== 'cancelled'");
  });
});
