import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("accounting expense and PDF truth contract", () => {
  it("records an expense before approval and enforces the August cutover", () => {
    const source = read("server/routes/accounting-operations-v2.ts");
    expect(source).toContain('router.post("/v2/expenses"');
    expect(source).toContain("accounting_status,tax_treatment");
    expect(source).toContain("'recorded','pending','IQD'");
    expect(source).toContain('value.expenseDate < "2026-08-01"');
  });

  it("shows a real empty state instead of an unexplained empty select", () => {
    const source = read("client/src/components/admin/finance-accounting-operations-lite-v2.tsx");
    expect(source).toContain("لا توجد مصاريف مسجلة بانتظار الاعتماد لهذا الشهر");
    expect(source).toContain("تسجيل المصروف بانتظار الاعتماد");
    expect(source).toContain("disabled={!hasPendingExpense}");
    expect(source).toContain("disabled={approvalDisabled}");
    expect(source).toContain("setNewDate(periodStart(periodKey))");
  });

  it("does not replace missing live balances with hardcoded zeroes", () => {
    const source = read("client/src/components/admin/finance-accounting-register-v2.tsx");
    expect(source).toContain("REQUIRED_BALANCE_CODES");
    expect(source).toContain('return "غير متوفر"');
    expect(source).not.toContain('balances.get("1000") ?? 0');
    expect(source).not.toContain("z.coerce.number().default(0)");
  });

  it("fails closed in server accounting routes instead of fabricating numeric zero", () => {
    const registerRoute = read("server/routes/accounting-v2.ts");
    const setupRoute = read("server/routes/accounting-setup-v2.ts");
    for (const source of [registerRoute, setupRoute]) {
      expect(source).toContain("ACCOUNTING_NUMERIC_VALUE_MISSING");
      expect(source).toContain("ACCOUNTING_NUMERIC_VALUE_INVALID");
      expect(source).not.toContain("Number.isFinite(number) ? number : 0");
    }
    // The schema gate must name the latest accounting migration it actually
    // requires, including the 0078 external-handoff hardening.
    expect(registerRoute).toContain("ACCOUNTING_V2_LATEST_MIGRATION_REQUIRED");
    expect(registerRoute).toContain("0078_accounting_external_handoff_hardening");
  });

  it("requires the carrier fee explicitly instead of inventing 5,000 IQD", () => {
    const client = read("client/src/components/admin/finance-smart-carrier-center-v2.tsx");
    const server = read("server/routes/accounting-setup-v2.ts");
    expect(client).toContain("أدخل أجرة الشركة صراحةً");
    expect(client).not.toContain('useState("5000")');
    expect(client).not.toContain('setNewCompanyFee("5000")');
    expect(server).not.toContain("default(5000)");
  });

  it("uses the AQUAVO light document identity and rejects incomplete PDF figures", () => {
    const source = read("client/src/lib/accountant-pdf-v2.ts");
    expect(source).toContain('light: "#F6F4EF"');
    expect(source).toContain('text: "#232323"');
    expect(source).toContain('border: "#DDD8CE"');
    expect(source).toContain('/brand/aquavo-v2-horizontal.svg');
    expect(source).toContain("validateAccountantPayload(payload)");
    expect(source).toContain("القيم المفقودة لا تُستبدل بأصفار");
    expect(source).not.toContain("Number(value ?? 0)");
  });
});
