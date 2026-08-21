import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(join(process.cwd(), "client/src/pages/admin-dashboard.tsx"), "utf8");
const finance = readFileSync(join(process.cwd(), "client/src/pages/admin/finance.tsx"), "utf8");
const retiredAccountingPanel = join(process.cwd(), "client/src/components/admin/accounting-panel.tsx");

describe("finance route contract", () => {
  it("redirects only the retired accounting section to the finance center", () => {
    expect(dashboard).toContain('get("section") === "accounting"');
    expect(dashboard).toContain('setLocation("/admin/finance", { replace: true })');
    expect(dashboard).toContain('const [location, setLocation] = useLocation()');
    expect(dashboard).toContain('"products"');
    expect(dashboard).toContain('"orders"');
    expect(dashboard).toContain('"settings"');
  });

  it("does not keep a second accounting panel or accounting tab", () => {
    expect(dashboard).not.toContain("AccountingPanel");
    expect(dashboard).not.toContain('TabsContent value="accounting"');
    expect(dashboard).not.toContain('TabsTrigger value="accounting"');
    expect(existsSync(retiredAccountingPanel)).toBe(false);
    expect((dashboard.match(/>مركز المالية</g) ?? []).length).toBe(1);
  });

  it("keeps only the four operational finance sections", () => {
    expect(finance).toContain("السجل المحاسبي والإغلاق التلقائي");
    expect(finance).toContain("التغليف والكراتين");
    expect(finance).toContain("الراجعات التلقائية");
    expect(finance).toContain("سجل التدقيق");
    expect(finance).toContain("FinanceAccountingRegisterV2");
    expect(finance).toContain("PackagingSection");
    expect(finance).toContain("FinanceAutomaticReturnsV2");
    expect(finance).not.toContain("المراجع الآلي");
    expect(finance).not.toContain("FinanceAutomatedReviewer");
    expect(finance).not.toContain(">تدقيق محاسبي<");
  });
});
