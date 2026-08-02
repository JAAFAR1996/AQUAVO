import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(join(process.cwd(), "client/src/pages/admin-dashboard.tsx"), "utf8");
const finance = readFileSync(join(process.cwd(), "client/src/pages/admin/finance.tsx"), "utf8");

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
    expect((dashboard.match(/>مركز المالية</g) ?? []).length).toBe(1);
  });

  it("labels the automated reviewer as read-only", () => {
    expect(finance).toContain("المراجع الآلي");
    expect(finance).toContain("قراءة فقط — يفحص الأرقام ولا يعدّلها");
    expect(finance).not.toContain(">تدقيق محاسبي<");
  });
});
