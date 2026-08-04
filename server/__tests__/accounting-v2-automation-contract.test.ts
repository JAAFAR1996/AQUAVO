import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Accounting V2 automation", () => {
  it("ships migration 0062 with a complete explicit rollback and valid ledger registration", () => {
    expect(existsSync(join(root, "migrations/0062_accounting_automation_opening_balances.sql"))).toBe(true);
    expect(existsSync(join(root, "migrations/0062_accounting_automation_opening_balances_rollback.sql"))).toBe(true);
    const migration = read("migrations/0062_accounting_automation_opening_balances.sql");
    const rollback = read("migrations/0062_accounting_automation_opening_balances_rollback.sql");
    expect(migration).toContain("'accounting_cutover'");
    expect(migration).toContain("'opening_balances'");
    expect(migration).toContain("public.v_accounting_live_balances");
    expect(migration).toContain("public.auto_close_ended_accounting_periods");
    expect(migration).toContain("Asia/Baghdad");
    expect(migration).toContain("interval '1 month'");
    expect(migration).toContain("journal_entries_closed_period_guard");
    expect(migration).toContain("journal_lines_immutable_guard");
    expect(migration).toContain("IF v_total=0 THEN");
    expect(migration).toContain("monetary return requires accounting fact");
    const checksum = migration.match(/'0062_accounting_automation_opening_balances',\s*'([0-9a-f]{64})'/)?.[1];
    expect(checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(rollback).toContain("CREATE OR REPLACE FUNCTION public.post_verified_return_journal()");
    expect(rollback).toContain("accounting fact missing for order");
    expect(rollback).toContain("structural rollback; immutable opening entry retained");
  });

  it("does not restore rejected stock before physical receipt", () => {
    const migration = read("migrations/0062_accounting_automation_opening_balances.sql");
    expect(migration).toContain("NEW.status NOT IN ('cancelled','rejected_returned','returned')");
    expect(migration).not.toContain("NEW.status NOT IN ('cancelled','rejected','rejected_returned','rejected_carrier','returned')");
  });

  it("creates and completes returns from the atomic order transition", () => {
    const orderRoute = read("server/routes/admin-orders-v2.ts");
    const service = read("server/services/order-return-automation-v2.ts");
    expect(orderRoute).toContain("syncAutomaticReturnLifecycle(tx");
    expect(orderRoute).toContain("automaticReturn");
    expect(service).toContain("AUTO_ORDER_STATUS_REJECTED");
    expect(service).toContain("restocked=true");
    expect(service).toContain("status='verified'");
    expect(service).toContain("material_kind='carton'");
    expect(service).toContain("order_return_packaging_losses");
    expect(service).toContain("is_reclassification_only");
    expect(service).toContain("'damaged_carton','automatic',true");
    expect(service).toContain("أي أجرة أو اقتطاع تعتمد من كشف شركة التوصيل فقط");
    expect(service).not.toContain("SUM(e.actual_cost)");
  });

  it("mounts a read-only automatic returns API before legacy accounting", () => {
    const routes = read("server/routes.ts");
    const automatic = routes.indexOf('app.use("/api/admin/accounting", createAccountingAutomaticReturnsV2Router())');
    const legacy = routes.indexOf('app.use("/api/admin/accounting", createAccountingRouter())');
    const api = read("server/routes/accounting-automatic-returns-v2.ts");
    expect(automatic).toBeGreaterThan(-1);
    expect(automatic).toBeLessThan(legacy);
    expect(api).toContain("requireAccountingAdmin");
    expect(api).toContain("packaging_classification_loss");
    expect(api).not.toContain("router.post");
  });

  it("removes manual return creation from the finance workspace", () => {
    const page = read("client/src/pages/admin/finance.tsx");
    const component = read("client/src/components/admin/finance-automatic-returns-v2.tsx");
    expect(page).toContain("FinanceAutomaticReturnsV2");
    expect(page).not.toContain("FinanceReturnEvents");
    expect(component).toContain("ماكو إنشاء راجع من صفحة المالية");
    expect(component).toContain("كارت الشكر ما ينحسبن خسارة ثانية");
    expect(component).not.toContain('method: "POST"');
    expect(component).not.toContain("تسجيل خسارة / راجع");
  });

  it("uses automatic ledger balances and hides the manual close button", () => {
    const register = read("client/src/components/admin/finance-accounting-register-v2.tsx");
    const api = read("server/routes/accounting-v2.ts");
    const cron = read("server/routes/cron.ts");
    expect(register).toContain("liveBalances");
    expect(register).toContain("الإغلاق التلقائي");
    expect(register).not.toContain("إغلاق إداري للشهر");
    expect(api).toContain("runAutomaticPeriodClose");
    expect(api).toContain("v_accounting_live_balances");
    expect(cron).toContain("automaticClose");
    expect(cron).toContain("runAutomaticPeriodClose");
  });

  it("creates a branded PDF instead of downloading raw JSON", () => {
    const register = read("client/src/components/admin/finance-accounting-register-v2.tsx");
    const pdf = read("client/src/lib/accountant-pdf-v2.ts");
    expect(register).toContain("downloadAccountantPdfV2");
    expect(register).toContain("تنزيل ملف المحاسب PDF");
    expect(register).not.toContain("application/json;charset=utf-8");
    expect(pdf).toContain("/brand/aquavo-v2-horizontal.svg");
    expect(pdf).toContain("محل المنبع");
    expect(pdf).toContain("غير صالح للتقديم الضريبي النهائي");
    expect(pdf).toContain("#0B93A6");
    expect(pdf).toContain("#F6F4EF");
  });
});
