import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Accounting V2 operating defaults", () => {
  it("ships migration 0057 and a rollback", () => {
    expect(existsSync(join(root, "migrations/0057_accounting_operating_defaults.sql"))).toBe(true);
    expect(existsSync(join(root, "migrations/0057_accounting_operating_defaults_rollback.sql"))).toBe(true);
    const migration = read("migrations/0057_accounting_operating_defaults.sql");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.delivery_companies");
    expect(migration).toContain("VALUES('alwaseet','الوسيط',5000,true,true");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.accounting_monthly_positions");
    expect(migration).toContain("amount=gross_amount-fee_amount");
    expect(migration).toContain("owner_confirmation");
  });

  it("keeps monthly positions separate from profit", () => {
    const migration = read("migrations/0057_accounting_operating_defaults.sql");
    expect(migration).not.toContain("journal_entries(");
    expect(migration).not.toContain("product_revenue=");
    const api = read("server/routes/accounting-setup-v2.ts");
    expect(api).toContain('positionType: z.enum(["cash", "bank", "carrier_receivable", "supplier_payable", "other_receivable"])');
    expect(api).toContain("الصافي يجب أن يساوي الإجمالي ناقص أجور الشركة");
  });

  it("accepts electronic evidence or an explicit owner confirmation", () => {
    const operations = read("server/routes/accounting-operations-v2.ts");
    expect(operations).toContain('mode: z.literal("owner_confirmation")');
    expect(operations).toContain('storageProvider: "internal_owner_confirmation"');
    expect(operations).toContain('createHash("sha256")');
    expect(operations).toContain('evidenceLevel: evidence.mode === "owner_confirmation" ? "internal_only" : "external_electronic"');
    expect(operations).not.toContain("ارفع فاتورة أو وصل المصروف");
  });

  it("versions fixed per-order additions instead of rewriting historical orders", () => {
    const setup = read("server/routes/accounting-setup-v2.ts");
    expect(setup).toContain("material_kind");
    expect(setup).toContain("'consumable','per_order',false");
    expect(setup).toContain("previous_version_id");
    expect(setup).toContain("superseded_by_id");
    expect(setup).toContain("INSERT INTO public.packaging_profile_items");
    expect(setup).not.toContain("UPDATE public.order_fulfillment_events SET");
  });

  it("mounts setup routes before accounting operations and legacy accounting", () => {
    const routes = read("server/routes.ts");
    const setup = routes.indexOf('app.use("/api/admin/accounting", createAccountingSetupV2Router())');
    const operations = routes.indexOf('app.use("/api/admin/accounting", createAccountingOperationsV2Router())');
    const legacy = routes.indexOf('app.use("/api/admin/accounting", createAccountingRouter())');
    expect(setup).toBeGreaterThan(-1);
    expect(setup).toBeLessThan(operations);
    expect(operations).toBeLessThan(legacy);
  });

  it("snapshots the selected or default delivery company on the order", () => {
    const orders = read("server/routes/admin-orders-v2.ts");
    expect(orders).toContain("deliveryCompanyId");
    expect(orders).toContain("WHERE active=true AND is_default=true");
    expect(orders).toContain("carrierName = company.name");
    expect(orders).toContain("carrierFee = Number(company.default_fee)");
  });

  it("exposes all controls in the finance operator workspace", () => {
    const component = read("client/src/components/admin/finance-accounting-operations-v2.tsx");
    expect(component).toContain("تأكيد داخلي — بدون ملف");
    expect(component).toContain("/api/admin/accounting/v2/delivery-companies");
    expect(component).toContain("/api/admin/accounting/v2/monthly-positions");
    expect(component).toContain("/api/admin/accounting/v2/fixed-preparation-items");
    expect(component).toContain("رصيد الصندوق هو النقد الموجود فعلياً، مو ربح الشهر");
  });

  it("includes operating context in the accountant package", () => {
    const reports = read("server/routes/accounting-v2.ts");
    expect(reports).toContain("deliveryCompanies");
    expect(reports).toContain("monthlyPositions");
    expect(reports).toContain("fixedPreparationItems");
    expect(reports).toContain("Monthly positions are owner-confirmed reconciliation snapshots");
  });
});
