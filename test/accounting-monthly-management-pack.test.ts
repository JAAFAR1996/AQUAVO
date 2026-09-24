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

  it("keeps PDF generation bounded enough for a large monthly pack", () => {
    const pdf = read("client/src/lib/accountant-pdf-v2.ts");
    const ui = read("client/src/components/admin/finance-accounting-register-v2.tsx");
    expect(pdf).toContain("buildPackedOrderDetailPages");
    expect(pdf).toContain("getFontEmbedCSS");
    expect(pdf).toContain("toJpeg");
    expect(pdf).toContain("pixelRatio: 1.22");
    expect(pdf).toContain("cacheBust: false");
    expect(pdf).toContain("preferredFontFormat: \"woff2\"");
    expect(pdf).not.toContain("for (const order of sales) pages.push(...buildOrderDetailPages(order))");
    expect(ui).toContain("جاري بناء PDF");
    expect(ui).toContain("pdfProgress.current");
    expect(ui).toContain("pdfProgress.total");
  });

  it("presents summary, comparison, reconciliation, product and per-order detail", () => {
    const pdf = read("client/src/lib/accountant-pdf-v2.ts");
    for (const phrase of [
      "الشهر بنظرة وحدة",
      "الشهر الحالي مقابل السابق",
      "من المبيعات للربح — وين راحت الفلوس؟",
      "هل الأرقام تركب على بعضها؟",
      "شنو باع أكثر؟",
      "فهرس الطلبات المتحققة",
      "من جوّه كل طلب — سجل التدقيق",
      "دفتر اليومية — أثر كل حركة",
      "شلون تنقري الأرقام؟",
      "comparisonTile",
      "barRows",
      "rankingBars",
      "motion-rail",
    ]) expect(pdf).toContain(phrase);
    expect(pdf).toContain("القيم المفقودة لا تُستبدل بأصفار");
    expect(pdf).toContain("وليس بيان IFRS مستقل");
    expect(pdf).toContain("verifiedRestockCogs");
    expect(pdf).toContain("orderPeriodContribution");
  });
});
