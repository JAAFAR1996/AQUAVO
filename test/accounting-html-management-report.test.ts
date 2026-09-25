import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("accounting HTML management report", () => {
  it("routes a protected standalone finance report", () => {
    const app = read("client/src/App.tsx");
    const routes = read("shared/site-routes.ts");
    expect(app).toContain('const FinanceHtmlReportPage = lazy(() => import("@/pages/admin/finance-report"))');
    expect(app).toContain('<Route path="/admin/finance/report">');
    expect(app).toContain("<FinanceHtmlReportPage />");
    expect(app).toContain("<RequireAdmin>");
    expect(routes).toContain('"/admin/finance/report"');
  });

  it("uses the canonical accountant package and does not invent a second accounting source", () => {
    const report = read("client/src/pages/admin/finance-report.tsx");
    expect(report).toContain("/api/admin/accounting/v2/accountant-package");
    expect(report).toContain("canonicalNet");
    expect(report).toContain("grossProfit");
    expect(report).toContain("openingInventory");
    expect(report).toContain("liveBalances");
    expect(report).toContain("journal");
    expect(report).toContain("evidenceIndex");
    expect(report).not.toContain("Math.random");
  });

  it("is print-ready HTML with management sections and no external font dependency", () => {
    const report = read("client/src/pages/admin/finance-report.tsx");
    const css = read("client/src/styles/accounting-html-report.css");
    for (const phrase of [
      "تقرير الإدارة المالي الشهري",
      "قائمة نتائج الإدارة وتحليل الربحية",
      "التحصيل والأرصدة التشغيلية",
      "مركز المخزون والربط مع دفتر الأستاذ",
      "ضوابط الإقفال والمطابقة",
      "سجل التدقيق والتفاصيل",
      "أساس الإعداد، الاعتماد، وحدود التقرير",
      "طباعة / حفظ PDF",
    ]) expect(report).toContain(phrase);
    expect(css).toContain("@media print");
    expect(css).toContain("@page");
    expect(css).toContain("A4 landscape");
    expect(css).toContain("print-color-adjust");
    expect(css).not.toContain("fonts.googleapis.com");
    expect(css).not.toContain("fonts.gstatic.com");
    expect(report).not.toContain("Gantt");
  });

  it("links the HTML report from the canonical accounting register", () => {
    const register = read("client/src/components/admin/finance-accounting-register-v2.tsx");
    expect(register).toContain("فتح تقرير الإدارة HTML");
    expect(register).toContain("/admin/finance/report?period=");
  });
});
