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
    expect(migration).toContain("'alwaseet','الوسيط',5000,true");
    expect(migration).toContain("NOT EXISTS(SELECT 1 FROM public.delivery_companies WHERE active=true AND is_default=true)");
    expect(migration).not.toContain("is_default=true,\n  updated_at=clock_timestamp()");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.accounting_monthly_positions");
    expect(migration).toContain("amount=gross_amount-fee_amount");
    expect(migration).toContain("owner_confirmation");
    expect(migration).toContain("74a21cb654e3aea76af7a10bb6f1e95c88a3e7db41df0c5373245ffd3cf15b8e");
  });

  it("separates fixed delivery fees from explained statement deductions", () => {
    expect(existsSync(join(root, "migrations/0059_accounting_carrier_other_deductions.sql"))).toBe(true);
    expect(existsSync(join(root, "migrations/0059_accounting_carrier_other_deductions_rollback.sql"))).toBe(true);
    const migration = read("migrations/0059_accounting_carrier_other_deductions.sql");
    expect(migration).toContain("other_deduction_amount");
    expect(migration).toContain("amount=gross_amount-fee_amount-other_deduction_amount");
    expect(migration).toContain("mod(NEW.fee_amount,v_default_fee)<>0");
    expect(migration).toContain("CARRIER_FEE_NOT_MULTIPLE");
    const route = read("server/routes/accounting-monthly-position-v2.ts");
    expect(route).toContain("otherDeductionAmount");
    expect(route).toContain("أجور التوصيل لازم تكون مضاعفات");
    expect(route).toContain("ضع الفرق بخانة «اقتطاع آخر»");
  });

  it("keeps monthly positions separate from profit", () => {
    const migration = read("migrations/0057_accounting_operating_defaults.sql");
    expect(migration).not.toContain("journal_entries(");
    expect(migration).not.toContain("product_revenue=");
    const api = read("server/routes/accounting-monthly-position-v2.ts");
    expect(api).toContain('positionType: z.enum(["cash", "bank", "carrier_receivable", "supplier_payable", "other_receivable"])');
    expect(api).toContain("الصافي يجب أن يساوي الإجمالي ناقص أجور التوصيل وناقص الاقتطاعات الأخرى");
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
    expect(setup).toContain("'verified_manual_standard'");
    expect(setup).toContain("current_cost_record_id=${costRecordId},current_unit_cost=${input.unitCost}");
    expect(setup).toContain("previous_version_id");
    expect(setup).toContain("superseded_by_id");
    expect(setup).toContain("INSERT INTO public.packaging_profile_items");
    expect(setup).not.toContain("UPDATE public.order_fulfillment_events SET");
  });

  it("mounts statement validation and smart carriers before operations and legacy accounting", () => {
    const routes = read("server/routes.ts");
    const position = routes.indexOf('app.use("/api/admin/accounting", createAccountingMonthlyPositionV2Router())');
    const setup = routes.indexOf('app.use("/api/admin/accounting", createAccountingSetupV2Router())');
    const smart = routes.indexOf('app.use("/api/admin/accounting", createAccountingSmartCarrierV2Router())');
    const operations = routes.indexOf('app.use("/api/admin/accounting", createAccountingOperationsV2Router())');
    const legacy = routes.indexOf('app.use("/api/admin/accounting", createAccountingRouter())');
    expect(position).toBeGreaterThan(-1);
    expect(position).toBeLessThan(setup);
    expect(setup).toBeLessThan(smart);
    expect(smart).toBeLessThan(operations);
    expect(operations).toBeLessThan(legacy);
  });

  it("snapshots the selected or default delivery company on the order", () => {
    const orders = read("server/routes/admin-orders-v2.ts");
    expect(orders).toContain("deliveryCompanyId");
    expect(orders).toContain("WHERE active=true AND is_default=true");
    expect(orders).toContain("carrierName = company.name");
    expect(orders).toContain("carrierFee = Number(company.default_fee)");
  });

  it("exposes automatic carrier accounting and only physical manual reconciliations", () => {
    const smart = read("client/src/components/admin/finance-smart-carrier-center-v2.tsx");
    const lite = read("client/src/components/admin/finance-accounting-operations-lite-v2.tsx");
    const register = read("client/src/components/admin/finance-accounting-register-v2.tsx");

    expect(register).toContain("<FinanceSmartCarrierCenterV2 periodKey={periodKey} />");
    expect(register).toContain("<FinanceAccountingOperationsLiteV2 periodKey={periodKey} />");
    expect(register).not.toContain("<FinanceCarrierPositionV2 periodKey={periodKey} />");

    expect(smart).toContain("لا يوجد إدخال يدوي للمبالغ");
    expect(smart).toContain("company.outstanding.gross");
    expect(smart).toContain("company.outstanding.fees");
    expect(smart).toContain("company.outstanding.net");
    expect(smart).toContain("company.outstandingOrders.map((order) => order.orderId)");
    expect(smart).toContain("/api/admin/accounting/v2/orders/${orderId}/delivery-company");

    expect(lite).toContain("تأكيد داخلي — بدون ملف");
    expect(lite).toContain("/api/admin/accounting/v2/fixed-preparation-items");
    expect(lite).toContain("عدّ الصندوق");
    expect(lite).not.toContain('value="carrier_receivable"');
    expect(lite).not.toContain("positionGross");
    expect(lite).not.toContain("positionFee");
  });

  it("includes operating context in the accountant package", () => {
    const reports = read("server/routes/accounting-v2.ts");
    expect(reports).toContain("deliveryCompanies");
    expect(reports).toContain("monthlyPositions");
    expect(reports).toContain("fixedPreparationItems");
    expect(reports).toContain("Monthly positions are owner-confirmed reconciliation snapshots");
  });
});
