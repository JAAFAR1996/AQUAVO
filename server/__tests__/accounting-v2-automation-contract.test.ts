import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Accounting V2 automation", () => {
  it("ships migration 0062 with an explicit rollback", () => {
    expect(existsSync(join(root, "migrations/0062_accounting_automation_opening_balances.sql"))).toBe(true);
    expect(existsSync(join(root, "migrations/0062_accounting_automation_opening_balances_rollback.sql"))).toBe(true);
    const migration = read("migrations/0062_accounting_automation_opening_balances.sql");
    expect(migration).toContain("'accounting_cutover'");
    expect(migration).toContain("'opening_balances'");
    expect(migration).toContain("public.v_accounting_live_balances");
    expect(migration).toContain("public.auto_close_ended_accounting_periods");
    expect(migration).toContain("Asia/Baghdad");
    expect(migration).toContain("interval '1 month'");
    expect(migration).toContain("journal_entries_closed_period_guard");
    expect(migration).toContain("journal_lines_immutable_guard");
  });

  it("does not restore rejected stock before physical receipt", () => {
    const migration = read("migrations/0062_accounting_automation_opening_balances.sql");
    expect(migration).toContain("NEW.status NOT IN ('cancelled','rejected_returned','returned')");
    expect(migration).not.toContain("NEW.status NOT IN ('cancelled','rejected','rejected_returned','rejected_carrier','returned')");
  });

  it("creates and receives return events from the atomic order transition", () => {
    const orderRoute = read("server/routes/admin-orders-v2.ts");
    const service = read("server/services/order-return-automation-v2.ts");
    expect(orderRoute).toContain("syncAutomaticReturnLifecycle(tx");
    expect(orderRoute).toContain("automaticReturn");
    expect(service).toContain("AUTO_ORDER_STATUS_REJECTED");
    expect(service).toContain("restocked=true");
    expect(service).toContain("أي أجرة أو اقتطاع تعتمد من كشف شركة التوصيل فقط");
    expect(service).not.toContain("status='verified'");
  });

  it("removes manual return creation from the finance workspace", () => {
    const page = read("client/src/pages/admin/finance.tsx");
    const component = read("client/src/components/admin/finance-automatic-returns-v2.tsx");
    expect(page).toContain("FinanceAutomaticReturnsV2");
    expect(page).not.toContain("FinanceReturnEvents");
    expect(component).toContain("ماكو إنشاء راجع من صفحة المالية");
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
