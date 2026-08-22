import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routes = readFileSync(join(process.cwd(), "server/routes.ts"), "utf8");
const adminOrders = readFileSync(join(process.cwd(), "server/routes/admin-orders-v2.ts"), "utf8");
const canonicalAccounting = readFileSync(
  join(process.cwd(), "server/routes/accounting-packaging-canonical.ts"),
  "utf8",
);

describe("canonical carton accounting cleanup", () => {
  it("mounts canonical packaging accounting before the legacy accounting router", () => {
    const canonicalMount = routes.indexOf("createCanonicalPackagingAccountingRouter()");
    const legacyMount = routes.indexOf("createAccountingRouter()");
    expect(canonicalMount).toBeGreaterThan(-1);
    expect(legacyMount).toBeGreaterThan(-1);
    expect(canonicalMount).toBeLessThan(legacyMount);
  });

  it("does not accept a manual box cost during order status transitions", () => {
    const schemaStart = adminOrders.indexOf("const statusTransitionSchema");
    const schemaEnd = adminOrders.indexOf("type LockedOrder", schemaStart);
    const schema = adminOrders.slice(schemaStart, schemaEnd);
    expect(schema).not.toContain("boxCost:");
    expect(adminOrders).not.toContain("input.boxCost");
  });

  it("retires the old manual box-cost mutation at the canonical boundary", () => {
    expect(canonicalAccounting).toContain('router.patch("/orders/:orderId/box-cost"');
    expect(canonicalAccounting).toContain("res.status(410)");
    expect(canonicalAccounting).toContain("اختر الكارتونة الفعلية من تجهيز الطلب");
  });
});
