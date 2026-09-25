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
    expect(source).toContain("p.name AS product_name");
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
    expect(pdf).not.toContain("GanttTimeline");
    expect(pdf).toContain("AccountingFlow");
    expect(pdf).not.toContain("html-to-image");
    expect(pdf).not.toContain("jsPDF");
    expect(pdf).not.toContain("toJpeg");
    expect(ui).toContain("جاري بناء التقرير المتجهي");
    expect(ui).toContain("PDF ENGINE · VECTOR V7");
    expect(ui).toContain("تنزيل التقرير المالي V7 · VECTOR");
    expect(pdf).toContain("AQUAVO-Accounting-VECTOR-V7-");
  });

  it("proxies accounting PDF fonts through the AQUAVO origin", () => {
    const vercel = read("vercel.json");
    expect(vercel).toContain("/fonts/aquavo-noto-sans-arabic-400.woff");
    expect(vercel).toContain("/fonts/aquavo-noto-sans-arabic-700.woff");
    expect(vercel).toContain("@fontsource/noto-sans-arabic");
  });

  it("presents full accountant analysis plus detailed audit appendices", () => {
    const pdf = read("client/src/lib/accountant-pdf-vector.tsx");
    for (const phrase of [
      "تقرير الإدارة المالي الشهري",
      "جسر الربحية",
      "تركيب بنود التكلفة المسجلة",
      "قائمة نتائج الإدارة وتحليل الربحية",
      "هذا الشهر مقابل الشهر السابق",
      "السيولة والتحصيل — أين تتركز الأرصدة؟",
      "تحليل المبيعات والمنتجات ومصادر الطلبات",
      "ضوابط الإقفال والمطابقة",
      "مركز المخزون والربط مع دفتر الأستاذ",
      "كل الطلبات المتحققة خلال الشهر",
      "تفاصيل الطلبات — سجل التدقيق",
      "تحليل المصروفات",
      "المرتجعات وأثرها المالي",
      "دفتر اليومية — القيود والحسابات",
      "فهرس المستندات والأدلة",
      "منهجية الجودة",
    ]) expect(pdf).toContain(phrase);
    expect(pdf).toContain("verifiedRestockCogs");
    expect(pdf).toContain("orderPeriodContribution");
    expect(pdf).toContain("if (!rows.length) return null");
    expect(pdf).toContain("Statement of Cash Flows وفق IAS 7");
    expect(pdf).toContain("صافي القيمة القابلة للتحقق");
    expect(pdf).toContain("فترتين متماثلتين");
    expect(pdf).toContain("/fonts/aquavo-noto-sans-arabic-400.woff");
    expect(pdf).toContain("/fonts/aquavo-noto-sans-arabic-700.woff");
    expect(pdf).not.toContain("https://fonts.gstatic.com/");
    expect(pdf).not.toContain("https://cdn.jsdelivr.net/");
    expect(pdf).toContain("غير متوفر");
    expect(pdf).toContain("غير مدقق");
    expect(pdf).toContain("سري - للاستخدام الداخلي فقط");
  });
});
