import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { orderReturnEventInputSchema } from "../../shared/accounting";

const root = process.cwd();
const modalSource = () => readFileSync(
  join(root, "client/src/components/admin/order-return-adjustment-modal.tsx"),
  "utf8",
);
const adminOrdersSource = () => readFileSync(
  join(root, "server/routes/admin-orders-v2.ts"),
  "utf8",
);

describe("return variant and disposition contract", () => {
  it("preserves order line and variant identity through Zod", () => {
    const parsed = orderReturnEventInputSchema.parse({
      orderId: "order-1",
      type: "partial_return",
      affectedItems: [{
        productId: "p",
        orderItemId: "line",
        variantId: "v",
        qty: 1,
        priceAtPurchase: 100,
        cogsAtTime: 0,
      }],
    });
    expect(parsed.affectedItems?.[0]).toMatchObject({
      orderItemId: "line",
      variantId: "v",
    });
  });

  it("loads canonical relational lines instead of trusting orders.items JSONB", () => {
    const modal = modalSource();
    const route = adminOrdersSource();

    expect(modal).toContain("/api/admin/orders/${order.id}/return-lines");
    expect(modal).toContain("orderItemId: line.orderItemId");
    expect(modal).toContain("variantId: line.variantId ?? null");
    expect(modal).not.toContain("order.items");

    expect(route).toContain('router.get("/orders/:id/return-lines"');
    expect(route).toContain("FROM public.order_items_relational oi");
    expect(route).toContain("oi.id AS order_item_id");
  });

  it("keeps refund and COGS advisory-only and rejects mixed disposition", () => {
    const modal = modalSource();
    expect(modal).toContain("cogsAtTime: 0");
    expect(modal).toContain("PostgreSQL يعيد حسابه من سعر البيع الأصلي");
    expect(modal).toContain("new Set(selectedStates.map((state) => state.restocked)).size > 1");
    expect(modal).not.toContain("costMap[");
  });
});
