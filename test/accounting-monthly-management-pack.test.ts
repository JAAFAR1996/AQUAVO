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

  it("presents summary, comparison, reconciliation, product and per-order detail", () => {
    const pdf = read("client/src/lib/accountant-pdf-v2.ts");
    for (const phrase of [
      "تقرير الإدارة والمحاسب الشهري",
      "مقارنة الشهر الحالي بالشهر السابق",
      "جسر الربح والخسارة",
      "هل أرقام الشهر مترابطة؟",
      "شنو باع هذا الشهر؟",
      "فهرس الطلبات المتحققة",
      "تفاصيل الطلب",
      "دفتر اليومية التفصيلي",
      "شلون تنقري الأرقام؟",
    ]) expect(pdf).toContain(phrase);
    expect(pdf).toContain("القيم المفقودة لا تُستبدل بأصفار");
    expect(pdf).toContain("وليس بيان IFRS مستقل");
  });
});
