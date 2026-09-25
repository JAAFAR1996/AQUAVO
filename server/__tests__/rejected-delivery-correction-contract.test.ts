import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("rejected order corrected to delivered", () => {
  it("disputes the automatic rejected-delivery event instead of leaving a false return", () => {
    const service = read("server/services/order-return-automation-v2.ts");

    expect(service).toContain('input.newStatus === "delivered" && rejectionStatuses.has(input.oldStatus)');
    expect(service).toContain("SET status='disputed'");
    expect(service).toContain("RETURN_ALREADY_RECEIVED");
    expect(service).toContain('reason: "تصحيح رفض الاستلام: الزبون استلم الطلب فعلياً"');
  });

  it("gives the admin a delivered correction action while preserving the real-return action", () => {
    const ui = read("client/src/components/admin/orders-management.tsx");

    expect(ui).toContain("onClick={() => setDeliverOrderId(order.id)}");
    expect(ui).toContain("الزبون استلم");
    expect(ui).toContain("handleStatusChange(order.id, 'returned')");
    expect(ui).toContain("استلمت من الشركة");
  });
});
