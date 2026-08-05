import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { orderReturnEventInputSchema } from "../../shared/accounting";

const root = process.cwd();
const source = () => readFileSync(join(root, "client/src/components/admin/order-return-adjustment-modal.tsx"), "utf8");

describe("return variant and disposition contract", () => {
  it("preserves order line and variant identity through Zod", () => {
    const parsed = orderReturnEventInputSchema.parse({
      orderId: "order-1",
      type: "partial_return",
      affectedItems: [{ productId: "p", orderItemId: "line", variantId: "v", qty: 1, priceAtPurchase: 100, cogsAtTime: 0 }],
    });
    expect(parsed.affectedItems?.[0]).toMatchObject({ orderItemId: "line", variantId: "v" });
  });

  it("uses order-line keys and sends exact variant identity", () => {
    expect(source()).toContain("const orderLineKey = (item: OrderItem)");
    expect(source()).toContain("orderItemId: item.orderItemId ?? item.id");
    expect(source()).toContain("variantId: item.variantId ?? null");
    expect(source()).not.toContain("itemStates[item.productId]");
  });

  it("does not trust current cost and rejects mixed disposition", () => {
    expect(source()).toContain("cogsAtTime: 0");
    expect(source()).not.toContain("costMap[");
    expect(source()).toContain("new Set(selectedStates.map((state) => state.restocked)).size > 1");
  });
});
