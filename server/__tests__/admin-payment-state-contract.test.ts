import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("admin payment-managed order states", () => {
  it("renders payment states explicitly instead of pretending they are pending", () => {
    const ui = read("client/src/components/admin/orders-management.tsx");

    expect(ui).toContain('pending_payment: { label: "بانتظار الدفع الإلكتروني 💳"');
    expect(ui).toContain('payment_review: { label: "الدفع مؤكد — مراجعة المخزون ⚠️"');
    expect(ui).not.toContain("|| ORDER_STATUSES.pending");
    expect(ui).toContain("حالة غير معروفة:");
  });

  it("keeps fulfillment controls locked until the payment lifecycle releases the order", () => {
    const ui = read("client/src/components/admin/orders-management.tsx");

    expect(ui).toContain('const PAYMENT_LOCKED_STATUSES = new Set(["pending_payment", "payment_review"])');
    expect(ui).toContain("بانتظار دفع الزبون 💳");
    expect(ui).toContain("التجهيز متوقف إلى أن تؤكد Al-Qaseh نجاح الدفع");
    expect(ui).toContain("PAYMENT_LOCKED_STATUSES.has(selectedOrder.status)");
    expect(ui).toContain("order.status === 'pending'");
  });

  it("rejects manual admin transitions out of payment-managed states", () => {
    const route = read("server/routes/admin-orders-v2.ts");

    expect(route).toContain('const PAYMENT_MANAGED_STATUSES = new Set(["pending_payment", "payment_review"])');
    expect(route).toContain("PAYMENT_MANAGED_STATUSES.has(oldStatus) && input.status !== oldStatus");
    expect(route).toContain("{ statusCode: 409 }");
    expect(route).toContain("بعد نجاح Al-Qaseh ينتقل تلقائياً إلى قيد الانتظار");
  });
});
