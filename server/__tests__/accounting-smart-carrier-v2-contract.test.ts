import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("smart carrier accounting v2", () => {
  it("mounts the smart carrier route before legacy accounting", () => {
    const routes = read("server/routes.ts");
    const smart = routes.indexOf('app.use("/api/admin/accounting", createAccountingSmartCarrierV2Router())');
    const legacy = routes.indexOf('app.use("/api/admin/accounting", createAccountingRouter())');
    expect(routes).toContain('import { createAccountingSmartCarrierV2Router } from "./routes/accounting-smart-carrier-v2.js"');
    expect(smart).toBeGreaterThan(-1);
    expect(smart).toBeLessThan(legacy);
  });

  it("groups outstanding money from immutable facts instead of typed totals", () => {
    const route = read("server/routes/accounting-smart-carrier-v2.ts");
    expect(route).toContain("FROM public.order_accounting_facts f");
    expect(route).toContain("LEFT JOIN public.order_accounting_settlements s");
    expect(route).toContain("f.cash_custody='carrier'");
    expect(route).toContain("s.id IS NULL");
    expect(route).toContain("grossCollected: money(row.gross_collected)");
    expect(route).toContain("carrierFee: money(row.carrier_fee)");
    expect(route).toContain("merchantNet: money(row.merchant_net)");
  });

  it("assigns the company before realization and records an audit change", () => {
    const route = read("server/routes/accounting-smart-carrier-v2.ts");
    expect(route).toContain('router.post("/v2/orders/:id/delivery-company"');
    expect(route).toContain("FOR UPDATE");
    expect(route).toContain("order_accounting_facts");
    expect(route).toContain("recordFinancialChange(tx as never");
    expect(route).toContain("carrier_fee=${money(company.default_fee)}");
  });

  it("removes manual carrier money fields from the active finance workspace", () => {
    const register = read("client/src/components/admin/finance-accounting-register-v2.tsx");
    const smart = read("client/src/components/admin/finance-smart-carrier-center-v2.tsx");
    const lite = read("client/src/components/admin/finance-accounting-operations-lite-v2.tsx");
    expect(register).toContain("<FinanceSmartCarrierCenterV2 periodKey={periodKey} />");
    expect(register).toContain("<FinanceAccountingOperationsLiteV2 periodKey={periodKey} />");
    expect(smart).toContain("لا يوجد إدخال يدوي للمبالغ");
    expect(smart).toContain("company.outstanding.gross");
    expect(smart).toContain("company.outstanding.fees");
    expect(smart).toContain("company.outstanding.net");
    expect(lite).not.toContain('value="carrier_receivable"');
    expect(lite).not.toContain("positionGross");
    expect(lite).not.toContain("positionFee");
  });

  it("settles every outstanding order for the selected company without manual order picking", () => {
    const smart = read("client/src/components/admin/finance-smart-carrier-center-v2.tsx");
    expect(smart).toContain("company.outstandingOrders.map((order) => order.orderId)");
    expect(smart).toContain("استلام ومطابقة كل طلبات الشركة");
    expect(smart).not.toContain('type="checkbox" checked={selectedOrders');
  });
});
