import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("accounting monthly management pack", () => {
  it("enriches accountant export with prior-period comparison and order-level evidence", () => {
    const route = read("server/routes/accounting-v2.ts");
    const packageStart = route.indexOf('router.get("/v2/accountant-package"');
    expect(packageStart).toBeGreaterThan(-1);
    const source = route.slice(packageStart);
    expect(source).toContain("previousReadiness");
    expect(source).toContain("o.items");
    expect(source).toContain("o.customer_name");
    expect(source).toContain("o.discount_total");
    expect(source).toContain("o.shipping_address");
    expect(source).toContain("accounting_carrier");
    expect(source).toContain("fulfillment_cost");
    expect(source).toContain('j.period_key=${periodKey}');
  });

  it("keeps the normal accounting register lightweight", () => {
    const route = read("server/routes/accounting-v2.ts");
    const start = route.indexOf('router.get("/v2/register"');
    const end = route.indexOf('router.get("/v2/ledger"', start);
    const source = route.slice(start, end);
    expect(source).toContain("SELECT * FROM public.v_order_accounting");
    expect(source).not.toContain("o.customer_name");
    expect(source).not.toContain("o.items");
  });

  it("uses a true-vector PDF renderer instead of rasterizing every page", () => {
    const wrapper = read("client/src/lib/accountant-pdf-v2.ts");
    const pdf = read("client/src/lib/accountant-pdf-vector.tsx");
    const ui = read("client/src/components/admin/finance-accounting-register-v2.tsx");
    expect(wrapper).toContain('from "./accountant-pdf-vector"');
    expect(pdf).toContain('from "@react-pdf/renderer"');
    expect(pdf).toContain("Svg");
    expect(pdf).toContain("DonutChart");
    expect(pdf).toContain("WaterfallChart");
    expect(pdf).toContain("GanttTimeline");
    expect(pdf).toContain("AccountingFlow");
    expect(pdf).not.toContain("html-to-image");
    expect(pdf).not.toContain("jsPDF");
    expect(pdf).not.toContain("toJpeg");
    expect(ui).toContain("جاري بناء PDF");
  });

  it("presents full accountant analysis plus detailed audit appendices", () => {
    const pdf = read("client/src/lib/accountant-pdf-vector.tsx");
    for (const phrase of [
      "التحليل المالي الشهري",
      "جسر الربحية",
      "توزيع نتيجة الشهر وبنود التكلفة",
      "قراءة الربح والتكاليف",
      "هذا الشهر مقابل الشهر السابق",
      "وين موجودة السيولة حالياً؟",
      "شنو باع أكثر؟ ومنين إجت الطلبات؟",
      "مسار الإقفال الشهري وفحوص المطابقة",
      "Gantt",
      "كل الطلبات المتحققة خلال الشهر",
      "من جوّه كل طلب — سجل التدقيق",
      "المصاريف — وين صرفنا؟",
      "الراجعات — شنو رجع وشكد أثر؟",
      "دفتر اليومية — أثر كل حركة",
      "فهرس المستندات والأدلة",
      "منهجية الجودة",
    ]) expect(pdf).toContain(phrase);
    expect(pdf).toContain("verifiedRestockCogs");
    expect(pdf).toContain("orderPeriodContribution");
    expect(pdf).toContain("غير متوفر");
    expect(pdf).toContain("غير مدقق");
  });
});
