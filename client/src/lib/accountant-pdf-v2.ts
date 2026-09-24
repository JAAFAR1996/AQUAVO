import { jsPDF } from "jspdf";
import { getFontEmbedCSS, toJpeg } from "html-to-image";

type AnyRow = Record<string, any>;
type PageSpec = { title: string; subtitle: string; body: string; section?: string };
export type AccountantPdfProgress = { current: number; total: number; stage: "preparing" | "rendering" | "saving" };

const BRAND = {
  primary: "#0B93A6",
  primaryDark: "#075F6B",
  navy: "#0B1E28",
  light: "#F6F4EF",
  paper: "#FFFFFF",
  text: "#232323",
  muted: "#6B7280",
  subtle: "#8B96A3",
  border: "#DDD8CE",
  soft: "#EDF7F8",
  warning: "#C97A2E",
  warningBg: "#FFF7ED",
  danger: "#A63A3A",
  dangerBg: "#FEF2F2",
  ok: "#247A63",
  okBg: "#ECFDF5",
  white: "#FFFFFF",
};
const REQUIRED_BALANCE_CODES = ["1000", "1010", "1100", "1200", "3100"] as const;
const REQUIRED_SUMMARY_FIELDS = [
  "product_revenue", "rounding_adjustment", "merchant_net", "cogs", "fulfillment_cost",
  "verified_expenses", "fx_net_expense", "journal_difference", "realized_orders",
] as const;

function esc(value: unknown): string {
  return String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function iqd(value: unknown): string {
  const n = finiteNumber(value);
  return n == null ? "غير متوفر" : `${Math.round(n).toLocaleString("en-US")} د.ع`;
}
function numberValue(value: unknown): string {
  const n = finiteNumber(value);
  return n == null ? "غير متوفر" : Math.round(n).toLocaleString("en-US");
}
function percent(value: unknown, digits = 1): string {
  const n = finiteNumber(value);
  return n == null ? "غير متوفر" : `${n.toFixed(digits)}%`;
}
function ratio(numerator: unknown, denominator: unknown): number | null {
  const n = finiteNumber(numerator);
  const d = finiteNumber(denominator);
  if (n == null || d == null || d === 0) return null;
  return (n / d) * 100;
}
function dateBaghdad(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? esc(value)
    : d.toLocaleString("ar-IQ", {
        timeZone: "Asia/Baghdad",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
}
function dateOnly(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? esc(value)
    : d.toLocaleDateString("ar-IQ", { timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit", day: "2-digit" });
}
function safeArray(value: unknown): AnyRow[] {
  if (Array.isArray(value)) return value as AnyRow[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
function safeObject(value: unknown): AnyRow {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as AnyRow;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}
function sumKnown(rows: AnyRow[], field: string): number | null {
  let found = false;
  let total = 0;
  for (const row of rows) {
    const n = finiteNumber(row?.[field]);
    if (n == null) continue;
    found = true;
    total += n;
  }
  return found ? total : null;
}
function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out.length ? out : [[]];
}
function moneyDelta(current: unknown, previous: unknown): string {
  const c = finiteNumber(current);
  const p = finiteNumber(previous);
  if (c == null || p == null) return "لا توجد مقارنة";
  if (p === 0) return c === 0 ? "0%" : "لا يمكن حساب %";
  const d = ((c - p) / Math.abs(p)) * 100;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(1)}%`;
}
function countDelta(current: unknown, previous: unknown): string {
  return moneyDelta(current, previous);
}
function statusChip(label: unknown, tone: "ok" | "warn" | "bad" | "neutral" = "neutral"): string {
  return `<span class="chip ${tone}">${esc(label)}</span>`;
}
function table(headers: string[], rows: string[][], className = ""): string {
  const head = headers.map((header) => `<th>${esc(header)}</th>`).join("");
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}" class="empty">لا توجد بيانات</td></tr>`;
  return `<table class="${className}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
function cards(items: Array<[string, string, string?]>, columns = 3): string {
  return `<div class="cards cols-${columns}">${items.map(([label, value, note]) => (
    `<div class="card${value === "غير متوفر" ? " missing" : ""}"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${note ? `<div class="note">${esc(note)}</div>` : ""}</div>`
  )).join("")}</div>`;
}
function heroMetric(label: string, value: string, note?: string): string {
  return `<div class="hero-metric"><div class="hero-label">${esc(label)}</div><div class="hero-value">${esc(value)}</div>${note ? `<div class="hero-note">${esc(note)}</div>` : ""}</div>`;
}
function sectionTitle(title: string, note?: string): string {
  return `<div class="section-title"><h2>${esc(title)}</h2>${note ? `<span>${esc(note)}</span>` : ""}</div>`;
}
function notice(text: string, tone: "ok" | "warn" | "bad" | "neutral" = "neutral"): string {
  return `<div class="notice ${tone}">${esc(text)}</div>`;
}
function pageHtml(
  title: string,
  subtitle: string,
  body: string,
  meta: { period: string; status: string; page: number; pages: number; legalName: string; legalNameEn: string; section?: string },
): string {
  const draft = meta.status !== "tax_final";
  return `<section class="aqv-page" dir="rtl">
    ${draft ? `<div class="watermark">مسودة</div>` : ""}
    <header>
      <div class="brand">
        ${meta.page === 1
          ? '<img src="/brand/aquavo-v2-horizontal.svg" alt="AQUAVO">'
          : '<div class="wordmark">AQUAVO</div>'}
        <div class="issuer">تقرير داخلي صادر عن ${esc(meta.legalName)} <span>— ${esc(meta.legalNameEn)}</span></div>
      </div>
      <div class="meta">
        <small>${esc(meta.section ?? "التقرير الشهري")}</small>
        <strong>${esc(meta.period)}</strong>
        <span>${draft ? "تقرير إدارة ومراجعة" : "الفترة موسومة TAX FINAL بالنظام"}</span>
        <small>صفحة ${meta.page} من ${meta.pages}</small>
      </div>
    </header>
    <div class="rule"></div>
    <div class="heading"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>
    <main>${body}</main>
    <footer>
      <strong>${draft ? "غير صالح للتقديم الضريبي النهائي — تقرير إدارة ومحاسبة داخلي، وليس بيان IFRS مستقل" : "TAX FINAL — وفق حالة الفترة داخل النظام"}</strong>
      <span>المصدر: دفتر الأستاذ المزدوج + حقائق الطلبات + التسويات + المصاريف الموثقة. القيم المفقودة لا تُستبدل بأصفار.</span>
      <span>المبالغ بالدينار العراقي ما لم يُذكر غير ذلك · توقيت Asia/Baghdad</span>
      <small>aquavoiq.com · 07747880673 · info@aquavoiq.com · instagram.com/aquavo_iq</small>
    </footer>
  </section>`;
}

const STYLE = `
  *{box-sizing:border-box}
  .aqv-page{position:relative;width:794px;height:1123px;overflow:hidden;background:${BRAND.light};color:${BRAND.text};padding:32px 38px 34px;font-family:Cairo,Arial,sans-serif}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
  .brand img{width:185px;height:50px;object-fit:contain;object-position:right center}.wordmark{height:50px;display:flex;align-items:center;font:900 23px Inter,Arial,sans-serif;letter-spacing:-.8px;color:${BRAND.navy}}
  .issuer{font-size:10px;color:${BRAND.muted};margin-top:6px}
  .issuer span{font-family:Inter,Arial,sans-serif;direction:ltr;display:inline-block}
  .meta{text-align:left;display:grid;gap:3px;color:${BRAND.muted};font-family:Inter,Cairo,Arial,sans-serif}
  .meta strong{font-size:16px;color:${BRAND.navy}}.meta span{font-size:9px}.meta small{font-size:8px}
  .rule{height:3px;background:linear-gradient(90deg,${BRAND.primary} 0 32%,${BRAND.navy} 32% 100%);margin:14px 0 15px}
  .heading h1{margin:0;color:${BRAND.navy};font-size:21px;letter-spacing:-.2px}
  .heading p{margin:5px 0 14px;color:${BRAND.muted};font-size:10px;line-height:1.7}
  main{font-size:10px;line-height:1.6}
  .executive-hero{background:${BRAND.navy};color:${BRAND.white};border-radius:12px;padding:17px 18px;margin-bottom:14px}
  .executive-hero .eyebrow{font-size:9px;color:#A8DDE2;margin-bottom:5px}
  .executive-hero .headline{font-size:18px;font-weight:800;line-height:1.55}
  .executive-hero .subline{font-size:9.5px;color:#D5E9EB;margin-top:5px}
  .hero-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 14px}
  .hero-metric{background:${BRAND.paper};border:1px solid ${BRAND.border};border-radius:9px;padding:10px;min-height:74px}
  .hero-label{font-size:8.5px;color:${BRAND.muted}}.hero-value{font-size:17px;font-weight:900;color:${BRAND.navy};margin-top:4px}.hero-note{font-size:8px;color:${BRAND.subtle};margin-top:3px}
  .cards{display:grid;gap:8px;margin-bottom:13px}.cards.cols-2{grid-template-columns:repeat(2,1fr)}.cards.cols-3{grid-template-columns:repeat(3,1fr)}.cards.cols-4{grid-template-columns:repeat(4,1fr)}
  .card{background:${BRAND.paper};border:1px solid ${BRAND.border};border-radius:8px;padding:10px;min-height:68px}.card.missing{border-color:${BRAND.warning}}
  .label{font-size:9px;color:${BRAND.muted}}.value{font-size:15px;font-weight:800;margin-top:4px;color:${BRAND.navy}}.missing .value{color:${BRAND.warning};font-size:12px}.note{font-size:7.8px;color:${BRAND.subtle};margin-top:3px;line-height:1.45}
  .section-title{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid ${BRAND.border};padding-bottom:5px;margin:13px 0 7px}
  .section-title h2{font-size:13px;margin:0;border-right:4px solid ${BRAND.primary};padding-right:7px;color:${BRAND.navy}}
  .section-title span{font-size:8px;color:${BRAND.muted}}
  table{width:100%;border-collapse:separate;border-spacing:0;background:${BRAND.paper};font-size:7.8px;border:1px solid ${BRAND.border};border-radius:7px;overflow:hidden}
  th{background:#EEF2F2;text-align:right;padding:5px 6px;border-left:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};font-weight:800;color:${BRAND.navy}}
  td{padding:5px 6px;border-left:1px solid ${BRAND.border};border-bottom:1px solid #ECE8E1;vertical-align:top;line-height:1.45}
  tr:nth-child(even) td{background:#FCFBF8}tr:last-child td{border-bottom:0}th:last-child,td:last-child{border-left:0}
  .compact td,.compact th{padding:4px 5px;font-size:7.4px}.empty{text-align:center;color:${BRAND.muted};padding:20px}
  .notice{border:1px solid ${BRAND.border};border-radius:8px;background:${BRAND.paper};padding:9px 11px;line-height:1.75;margin-bottom:9px}
  .notice.ok{border-color:#B7E3D3;background:${BRAND.okBg};color:#155B49}.notice.warn{border-color:#FED7AA;background:${BRAND.warningBg};color:#7A4618}.notice.bad{border-color:#F3B4B4;background:${BRAND.dangerBg};color:#7B2525}
  .chip{display:inline-block;padding:2px 6px;border-radius:999px;font-size:7.2px;font-weight:700;white-space:nowrap;background:#EEF2F2;color:#475569}
  .chip.ok{background:${BRAND.okBg};color:#16624E}.chip.warn{background:${BRAND.warningBg};color:#8A4E13}.chip.bad{background:${BRAND.dangerBg};color:#8D2D2D}
  .story{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.story-item{background:${BRAND.paper};border:1px solid ${BRAND.border};border-right:4px solid ${BRAND.primary};border-radius:8px;padding:9px 10px;line-height:1.7}.story-item strong{color:${BRAND.navy}}
  .formula{font-family:Inter,Cairo,Arial,sans-serif;direction:ltr;text-align:center;background:#F2F5F5;border:1px dashed ${BRAND.border};border-radius:7px;padding:7px;margin:7px 0 10px;color:#374151;font-size:8px}
  .order-block{background:${BRAND.paper};border:1px solid ${BRAND.border};border-radius:9px;padding:8px 9px;margin-bottom:8px;break-inside:avoid}
  .order-block:last-child{margin-bottom:0}.order-block .order-head{background:${BRAND.navy};color:white;border-radius:7px;padding:7px 9px;margin-bottom:6px;display:flex;justify-content:space-between;gap:10px}
  .order-block .order-head strong{font-size:11px}.order-block .order-head span{font-size:7px;color:#CFE3E5}.order-block .order-customer{text-align:left}
  .order-meta-line{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:5px}.order-meta-line div{background:#F7F7F4;border-radius:5px;padding:4px 5px}
  .order-meta-line small{display:block;color:${BRAND.muted};font-size:6.7px}.order-meta-line b{display:block;color:${BRAND.navy};font-size:7.5px;margin-top:1px}
  .order-financials{margin-bottom:5px}.order-financials td,.order-financials th{font-size:6.8px;padding:3px 4px}
  .order-adjustments{font-size:6.8px;color:${BRAND.muted};margin-top:4px;line-height:1.45}
  .watermark{position:absolute;left:145px;top:450px;transform:rotate(-25deg);font:900 88px Cairo,Arial,sans-serif;color:rgba(201,122,46,.065);z-index:0;pointer-events:none}
  .aqv-page>*{position:relative;z-index:1}
  footer{position:absolute;right:38px;left:38px;bottom:18px;border-top:1px dashed ${BRAND.border};padding-top:6px;display:grid;gap:1px;text-align:center;color:${BRAND.muted};font-size:7px}
  footer strong{color:${BRAND.warning};font-size:7.5px}footer small{font-family:Inter,Arial,sans-serif;direction:ltr}
`;

function appendChunkPages(
  pages: PageSpec[],
  groups: AnyRow[][],
  title: string,
  subtitle: (index: number) => string,
  headers: string[],
  rowBuilder: (row: AnyRow) => string[],
  section?: string,
): void {
  groups.forEach((group, index) => pages.push({
    title,
    subtitle: subtitle(index),
    section,
    body: table(headers, group.map(rowBuilder), "compact"),
  }));
}

function validateAccountantPayload(payload: AnyRow): void {
  if (!payload?.manifest?.periodKey) throw new Error("حزمة المحاسب لا تحتوي الفترة المحاسبية");
  const archive = payload.manifest?.archive === true || String(payload.manifest?.packageVersion ?? "").startsWith("historical-");
  if (archive) return;
  if (!payload.readiness || typeof payload.readiness !== "object") throw new Error("حزمة المحاسب لا تحتوي ملخص الجاهزية");
  const missingSummary = REQUIRED_SUMMARY_FIELDS.filter((field) => finiteNumber(payload.readiness[field]) == null);
  if (missingSummary.length) throw new Error(`لا يمكن إنشاء PDF: أرقام الملخص ناقصة (${missingSummary.join(", ")})`);
  if (!Array.isArray(payload.liveBalances)) throw new Error("حزمة المحاسب لا تحتوي أرصدة دفتر الأستاذ");
  const balanceCodes = new Set(payload.liveBalances.filter((row: AnyRow) => finiteNumber(row?.balance) != null).map((row: AnyRow) => String(row.code)));
  const missingBalances = REQUIRED_BALANCE_CODES.filter((code) => !balanceCodes.has(code));
  if (missingBalances.length) throw new Error(`لا يمكن إنشاء PDF: حسابات دفتر الأستاذ ناقصة (${missingBalances.join(", ")})`);
  if (!Array.isArray(payload.journal)) throw new Error("حزمة المحاسب لا تحتوي دفتر اليومية");
}

function canonicalNetProfit(summary: AnyRow): number | null {
  const fields = [
    "product_revenue", "rounding_adjustment", "cogs", "fulfillment_cost", "delivery_subsidy",
    "sales_returns", "actual_return_loss", "verified_expenses", "fx_net_expense",
  ];
  const values = Object.fromEntries(fields.map((field) => [field, finiteNumber(summary[field])]));
  if (Object.values(values).some((value) => value == null)) return null;
  return Number(values.product_revenue) + Number(values.rounding_adjustment)
    - Number(values.cogs) - Number(values.fulfillment_cost) - Number(values.delivery_subsidy)
    - Number(values.sales_returns) - Number(values.actual_return_loss)
    - Number(values.verified_expenses) - Number(values.fx_net_expense);
}

function grossProfit(summary: AnyRow): number | null {
  const revenue = finiteNumber(summary.product_revenue);
  const cogs = finiteNumber(summary.cogs);
  return revenue == null || cogs == null ? null : revenue - cogs;
}

function flattenJournal(entries: AnyRow[]): AnyRow[] {
  const rows: AnyRow[] = [];
  for (const entry of entries) {
    const lines = safeArray(entry.lines);
    if (!lines.length) {
      rows.push({ ...entry, lineNumber: null, accountCode: "—", accountName: "قيد بلا سطور", debit: null, credit: null, memo: "—" });
      continue;
    }
    for (const line of lines) rows.push({ ...entry, ...line });
  }
  return rows;
}

type ProductAggregate = {
  key: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  revenue: number;
  revenueKnown: boolean;
  orders: Set<string>;
};
type ProductAggregateView = ProductAggregate & { orderCount: number };

function aggregateProducts(sales: AnyRow[]): ProductAggregateView[] {
  const map = new Map<string, ProductAggregate>();
  for (const order of sales) {
    for (const item of safeArray(order.items)) {
      const key = `${item.productId ?? "unknown"}::${item.variantId ?? ""}`;
      const quantity = finiteNumber(item.quantity) ?? 0;
      const unitPrice = finiteNumber(item.priceAtPurchase);
      const lineTotal = finiteNumber(item.lineTotal) ?? (unitPrice == null ? null : unitPrice * quantity);
      const current: ProductAggregate = map.get(key) ?? {
        key,
        productName: String(item.productName ?? item.productId ?? "منتج غير مسمى"),
        variantLabel: String(item.variantLabel ?? ""),
        quantity: 0,
        revenue: 0,
        revenueKnown: false,
        orders: new Set<string>(),
      };
      current.quantity += quantity;
      if (lineTotal != null) {
        current.revenue += lineTotal;
        current.revenueKnown = true;
      }
      current.orders.add(String(order.order_number ?? order.order_id ?? "—"));
      map.set(key, current);
    }
  }
  return Array.from(map.values())
    .map((row): ProductAggregateView => ({ ...row, orderCount: row.orders.size }))
    .sort((a, b) => (b.revenueKnown ? b.revenue : -1) - (a.revenueKnown ? a.revenue : -1));
}

function verifiedRestockCogs(returns: AnyRow[]): number {
  let total = 0;
  for (const row of returns) {
    if (String(row.status ?? "").toLowerCase() !== "verified") continue;
    if (row.restocked !== true) continue;
    if (String(row.type ?? "").toLowerCase() === "rejected_delivery") continue;
    for (const item of safeArray(row.affected_items)) {
      const qty = finiteNumber(item.qty) ?? 0;
      const cogsAtTime = finiteNumber(item.cogsAtTime) ?? 0;
      total += qty * cogsAtTime;
    }
  }
  return total;
}

function orderPeriodContribution(order: AnyRow): number | null {
  const revenue = finiteNumber(order.product_revenue);
  const cogs = finiteNumber(order.cogs_amount);
  const subsidy = finiteNumber(order.delivery_subsidy);
  const fulfillment = finiteNumber(order.fulfillment_cost);
  if (revenue == null || cogs == null || subsidy == null || fulfillment == null) return null;
  return revenue - cogs - subsidy - fulfillment;
}

function orderItemRows(order: AnyRow, items: AnyRow[]): string[][] {
  return items.map((item) => {
    const qty = finiteNumber(item.quantity);
    const unitPrice = finiteNumber(item.priceAtPurchase);
    const lineTotal = finiteNumber(item.lineTotal) ?? (qty != null && unitPrice != null ? qty * unitPrice : null);
    const unitBaseCost = finiteNumber(item.costPrice);
    return [
      esc(item.productName ?? item.productId ?? "—"),
      esc(item.variantLabel ?? "—"),
      numberValue(qty),
      iqd(unitPrice),
      iqd(lineTotal),
      iqd(unitBaseCost),
      esc(item.costStatus ?? "غير متوفر"),
    ];
  });
}

type OrderDetailPart = {
  order: AnyRow;
  items: AnyRow[];
  partIndex: number;
  partCount: number;
  weight: number;
};

function splitOrderDetailParts(order: AnyRow): OrderDetailPart[] {
  const allItems = safeArray(order.items);
  const itemGroups = chunks(allItems, 6);
  return itemGroups.map((items, partIndex) => ({
    order,
    items,
    partIndex,
    partCount: itemGroups.length,
    weight: (partIndex === 0 ? 3.3 : 1.7) + Math.max(1, items.length) * 0.72,
  }));
}

function orderDetailBlock(part: OrderDetailPart): string {
  const { order, items, partIndex, partCount } = part;
  const first = partIndex === 0;
  const allItems = safeArray(order.items);
  const address = safeObject(order.shipping_address);
  const orderNo = order.order_number ?? order.order_id ?? "—";
  const contribution = orderPeriodContribution(order);

  return `<div class="order-block">
    <div class="order-head">
      <div><strong>${esc(orderNo)}${partCount > 1 ? ` · ${partIndex + 1}/${partCount}` : ""}</strong><br><span>تحقق الإيراد: ${dateBaghdad(order.recognized_at)}</span></div>
      <div class="order-customer"><span>العميل</span><br><strong>${esc(order.customer_name ?? "غير مسجل")}</strong></div>
    </div>
    ${first ? `
      <div class="order-meta-line">
        <div><small>المصدر / الحالة</small><b>${esc(order.source ?? "—")} · ${esc(order.status ?? "—")}</b></div>
        <div><small>الدفع / التسوية</small><b>${esc(order.payment_status ?? "—")} · ${esc(order.settlement_status ?? "—")}</b></div>
        <div><small>الناقل / المدينة</small><b>${esc(order.accounting_carrier ?? order.operational_carrier ?? "—")} · ${esc(address.city ?? "—")}</b></div>
        <div><small>تاريخ الطلب / البنود</small><b>${dateOnly(order.order_created_at)} · ${numberValue(allItems.length)}</b></div>
      </div>
      ${table(
        ["مبيعات", "COD", "توصيل الزبون", "أجرة الناقل", "COGS", "تجهيز", "دعم توصيل", "مساهمة"],
        [[
          iqd(order.product_revenue), iqd(order.gross_collected), iqd(order.customer_delivery_fee), iqd(order.carrier_fee),
          iqd(order.cogs_amount), iqd(order.fulfillment_cost), iqd(order.delivery_subsidy), iqd(contribution),
        ]],
        "compact order-financials",
      )}
    ` : ""}
    ${table(
      ["المنتج", "الخيار", "الكمية", "سعر الوحدة", "إجمالي السطر", "كلفة/وحدة", "حالة الكلفة"],
      orderItemRows(order, items),
      "compact",
    )}
    ${first ? `<div class="order-adjustments">الإجمالي عند الإنشاء: <b>${iqd(order.order_total)}</b> · بعد التقريب: <b>${iqd(order.rounded_total)}</b> · الخصم: <b>${iqd(order.discount_total)}</b> · خصم النقاط: <b>${iqd(order.points_discount)}</b> · نقاط مستخدمة: <b>${numberValue(order.points_used)}</b> · Cashback مستخدم: <b>${numberValue(order.cashback_used)}</b> · فرق/نقاط التقريب: <b>${numberValue(order.rounding_cashback)}</b></div>` : ""}
  </div>`;
}

function buildPackedOrderDetailPages(sales: AnyRow[]): PageSpec[] {
  const parts = sales.flatMap(splitOrderDetailParts);
  const groups: OrderDetailPart[][] = [];
  let current: OrderDetailPart[] = [];
  let weight = 0;
  const maxWeight = 10.4;

  for (const part of parts) {
    if (current.length && weight + part.weight > maxWeight) {
      groups.push(current);
      current = [];
      weight = 0;
    }
    current.push(part);
    weight += part.weight;
  }
  if (current.length) groups.push(current);

  return groups.map((group, index) => ({
    section: "تفاصيل الطلبات",
    title: "تفاصيل الطلبات — سجل التدقيق",
    subtitle: `الجزء ${index + 1} من ${groups.length} · تفاصيل كل طلب محفوظة، لكن عدة طلبات صغيرة تُجمع في الصفحة لتسريع التوليد`,
    body: group.map(orderDetailBlock).join(""),
  }));
}

function buildPages(payload: AnyRow): PageSpec[] {
  const summary: AnyRow = payload.readiness ?? {};
  const previous: AnyRow | null = payload.previousReadiness ?? null;
  const balances: AnyRow[] = Array.isArray(payload.liveBalances) ? payload.liveBalances : [];
  const sales: AnyRow[] = Array.isArray(payload.sales) ? payload.sales : [];
  const journal: AnyRow[] = Array.isArray(payload.journal) ? payload.journal : [];
  const expenses: AnyRow[] = Array.isArray(payload.expenses) ? payload.expenses : [];
  const returns: AnyRow[] = Array.isArray(payload.returns) ? payload.returns : [];
  const settlements: AnyRow[] = Array.isArray(payload.settlements) ? payload.settlements : [];
  const openingInventory: AnyRow[] = Array.isArray(payload.openingInventory) ? payload.openingInventory : [];
  const monthlyPositions: AnyRow[] = Array.isArray(payload.monthlyPositions) ? payload.monthlyPositions : [];
  const evidenceIndex: AnyRow[] = Array.isArray(payload.evidenceIndex) ? payload.evidenceIndex : [];
  const blockers: AnyRow[] = Array.isArray(summary.blockers) ? summary.blockers : [];
  const profile: AnyRow = payload.profile ?? {};
  const pages: PageSpec[] = [];
  const balanceMap = new Map<string, number>();
  for (const row of balances) {
    const value = finiteNumber(row?.balance);
    if (value != null) balanceMap.set(String(row.code), value);
  }

  const net = canonicalNetProfit(summary);
  const gross = grossProfit(summary);
  const orderCount = finiteNumber(summary.realized_orders);
  const avgOrder = orderCount && orderCount > 0 && finiteNumber(summary.product_revenue) != null
    ? Number(summary.product_revenue) / orderCount
    : null;
  const grossMargin = ratio(gross, summary.product_revenue);
  const netMargin = ratio(net, summary.product_revenue);
  const settledCount = sales.filter((row) => ["matched", "reconciled", "closed"].includes(String(row.settlement_status ?? "").toLowerCase())).length;
  const unsettledCount = sales.filter((row) => !["matched", "reconciled", "closed"].includes(String(row.settlement_status ?? "").toLowerCase())).length;
  const webOrders = sales.filter((row) => String(row.source ?? "").toLowerCase() === "website").length;
  const whatsappOrders = sales.filter((row) => String(row.source ?? "").toLowerCase() === "whatsapp").length;

  const story: string[] = [];
  if (finiteNumber(summary.product_revenue) != null && orderCount != null) {
    story.push(`تحققت مبيعات منتجات بقيمة ${iqd(summary.product_revenue)} من ${numberValue(orderCount)} طلباً محاسبياً، ومتوسط مبيعات المنتجات للطلب ${iqd(avgOrder)}.`);
  }
  if (gross != null) {
    story.push(`الربح الإجمالي بعد كلفة المنتجات بلغ ${iqd(gross)} بهامش ${percent(grossMargin)} قبل التجهيز والتوصيل والراجعات والمصاريف.`);
  }
  if (net != null) {
    story.push(`صافي النتيجة الإدارية بعد البنود المسجلة بلغ ${iqd(net)}، أي ${percent(netMargin)} من الإيراد المعدّل.`);
  }
  if (unsettledCount > 0) {
    story.push(`يوجد ${unsettledCount.toLocaleString("en-US")} طلباً في سجل الشهر لم تظهر تسويته كمطابقة/مغلقة في الحزمة الحالية.`);
  }
  if (blockers.length) {
    story.push(`الفترة فيها ${blockers.length.toLocaleString("en-US")} نوع من موانع الإغلاق، لذلك يجب مراجعتها قبل اعتبار الشهر مكتملاً.`);
  }

  pages.push({
    section: "الملخص التنفيذي",
    title: "تقرير الإدارة والمحاسب الشهري",
    subtitle: `الفترة ${payload.manifest?.periodKey ?? "—"} · توليد ${dateBaghdad(payload.manifest?.generatedAt)} · التقرير يفصل الملخص عن تفاصيل كل طلب ثم دفتر الأستاذ والأدلة`,
    body: `
      <div class="executive-hero">
        <div class="eyebrow">AQUAVO MONTHLY MANAGEMENT & ACCOUNTANT PACK</div>
        <div class="headline">شنو صار بهذا الشهر؟ الأرقام الرئيسية أولاً، وبعدها كل طلب وسنده المحاسبي بالتفصيل.</div>
        <div class="subline">لا يتم تعويض البيانات الناقصة بأصفار، وكل قيمة مهمة مرتبطة بمصدر محاسبي أو سجل تشغيلي داخل الحزمة.</div>
      </div>
      <div class="hero-grid">
        ${heroMetric("مبيعات المنتجات", iqd(summary.product_revenue), previous ? `مقارنة بالشهر السابق: ${moneyDelta(summary.product_revenue, previous.product_revenue)}` : "لا توجد مقارنة سابقة")}
        ${heroMetric("الطلبات المتحققة", numberValue(summary.realized_orders), previous ? `مقارنة: ${countDelta(summary.realized_orders, previous.realized_orders)}` : "وفق تاريخ تحقق الإيراد")}
        ${heroMetric("الربح الإجمالي", iqd(gross), `هامش ${percent(grossMargin)}`)}
        ${heroMetric("صافي النتيجة الإدارية", iqd(net), `هامش ${percent(netMargin)}`)}
      </div>
      ${sectionTitle("قراءة الشهر", "خلاصة وصفية مشتقة من الأرقام فقط")}
      <div class="story">${story.slice(0, 6).map((text) => `<div class="story-item">${esc(text)}</div>`).join("")}</div>
      ${sectionTitle("حالة الطلبات والقنوات")}
      ${cards([
        ["متوسط مبيعات الطلب", iqd(avgOrder)],
        ["طلبات الموقع", numberValue(webOrders)],
        ["طلبات واتساب", numberValue(whatsappOrders)],
        ["طلبات ظاهرة كمُسوّاة", numberValue(settledCount)],
        ["طلبات غير مسوّاة", numberValue(unsettledCount)],
        ["موانع الإغلاق", numberValue(blockers.length)],
      ], 3)}
      ${blockers.length ? notice("الشهر غير جاهز للإغلاق الكامل حسب فحوصات النظام؛ راجع صفحة المطابقة والموانع.", "warn") : notice("لا توجد موانع إغلاق مسجلة في جاهزية هذه الفترة.", "ok")}
    `,
  });

  pages.push({
    section: "المقارنة الشهرية",
    title: "مقارنة الشهر الحالي بالشهر السابق",
    subtitle: "المقارنة تساعد على فهم الاتجاه؛ عدم وجود شهر سابق صالح لا يُستبدل بقيم مفترضة",
    body: previous ? `
      ${table(["المؤشر", "الشهر الحالي", "الشهر السابق", "التغير"], [
        ["مبيعات المنتجات", iqd(summary.product_revenue), iqd(previous.product_revenue), esc(moneyDelta(summary.product_revenue, previous.product_revenue))],
        ["عدد الطلبات", numberValue(summary.realized_orders), numberValue(previous.realized_orders), esc(countDelta(summary.realized_orders, previous.realized_orders))],
        ["كلفة المنتجات", iqd(summary.cogs), iqd(previous.cogs), esc(moneyDelta(summary.cogs, previous.cogs))],
        ["كلفة التجهيز", iqd(summary.fulfillment_cost), iqd(previous.fulfillment_cost), esc(moneyDelta(summary.fulfillment_cost, previous.fulfillment_cost))],
        ["دعم التوصيل", iqd(summary.delivery_subsidy), iqd(previous.delivery_subsidy), esc(moneyDelta(summary.delivery_subsidy, previous.delivery_subsidy))],
        ["الراجعات", iqd(summary.sales_returns), iqd(previous.sales_returns), esc(moneyDelta(summary.sales_returns, previous.sales_returns))],
        ["المصاريف الموثقة", iqd(summary.verified_expenses), iqd(previous.verified_expenses), esc(moneyDelta(summary.verified_expenses, previous.verified_expenses))],
        ["صافي النتيجة الإدارية", iqd(net), iqd(canonicalNetProfit(previous)), esc(moneyDelta(net, canonicalNetProfit(previous)))],
      ])}
      ${sectionTitle("تفسير المقارنة")}
      ${notice("التغير بالنسبة المئوية يصف الحركة فقط ولا يفسر سببها. تفسير السبب يحتاج الرجوع إلى الطلبات، المصاريف، الراجعات والتسويات في الصفحات التالية.", "neutral")}
    ` : `
      ${notice("لا توجد فترة سابقة صالحة للمقارنة داخل Accounting V2 لهذه الحزمة. لذلك لم يتم اختراع مقارنة أو استخدام بيانات أرشيفية غير متجانسة.", "warn")}
    `,
  });

  const pnlRows = [
    ["مبيعات المنتجات (3000)", iqd(summary.product_revenue), "إيراد المنتجات المحقق"],
    ["كلفة المنتجات (4000)", iqd(summary.cogs), "تُطرح من مبيعات المنتجات"],
    ["الربح الإجمالي", iqd(gross), `مبيعات المنتجات − COGS · هامش ${percent(grossMargin)}`],
    ["فرق التقريب (3050)", iqd(summary.rounding_adjustment), "يؤثر في صافي النتيجة كحساب مستقل"],
    ["كلفة التجهيز (5100)", iqd(summary.fulfillment_cost), "تُطرح"],
    ["دعم التوصيل", iqd(summary.delivery_subsidy), "تُطرح"],
    ["مرتجعات المبيعات (4100)", iqd(summary.sales_returns), "تُطرح"],
    ["خسارة الراجع الفعلية (4200)", iqd(summary.actual_return_loss), "تُطرح"],
    ["المصاريف الموثقة", iqd(summary.verified_expenses), "تُطرح"],
    ["صافي فرق العملة (5400)", iqd(summary.fx_net_expense), "تُطرح"],
    ["صافي النتيجة الإدارية", iqd(net), `هامش ${percent(netMargin)}`],
  ];
  pages.push({
    section: "الأداء المالي",
    title: "جسر الربح والخسارة",
    subtitle: "يوضح من أين بدأ الربح وأين انخفض، بدون خلط مصاريف مختلفة أو إخفائها داخل رقم واحد",
    body: `
      ${cards([
        ["مبيعات المنتجات", iqd(summary.product_revenue)],
        ["الربح الإجمالي", iqd(gross), `مبيعات − COGS · هامش ${percent(grossMargin)}`],
        ["صافي حق AQUAVO", iqd(summary.merchant_net), "مؤشر تحصيل/استحقاق تشغيلي"],
        ["صافي النتيجة الإدارية", iqd(net), `هامش ${percent(netMargin)}`],
      ], 4)}
      ${table(["البند", "المبلغ", "كيف يقرأ"], pnlRows)}
      <div class="formula">Net management result = product revenue + rounding adjustment − COGS − fulfillment − delivery subsidy − sales returns − actual return loss − verified expenses − FX net expense</div>
      ${notice("هذا الجسر تقرير إدارة ومحاسبة داخلي. لا ندّعي أنه مجموعة قوائم مالية كاملة متوافقة مع IFRS؛ الهدف أن يكون قابلاً للفهم والتدقيق ويحتفظ بالمصادر والتفاصيل.", "neutral")}
    `,
  });

  const completedSettlements = settlements.filter((row) => ["reconciled", "closed"].includes(String(row.status ?? "").toLowerCase()));
  const pendingSettlements = settlements.length - completedSettlements.length;
  pages.push({
    section: "السيولة والمراكز",
    title: "لقطة الأرصدة والتحصيل",
    subtitle: "الأرصدة الحية نقطة زمنية من دفتر الأستاذ؛ تسويات شركات التوصيل تعرض حركة التحصيل المسجلة خلال الفترة",
    body: `
      ${cards([
        ["الصندوق (1000)", iqd(balanceMap.get("1000"))],
        ["البنك (1010)", iqd(balanceMap.get("1010"))],
        ["COD لدى شركات التوصيل (1100)", iqd(balanceMap.get("1100"))],
        ["مخزون المنتجات (1200)", iqd(balanceMap.get("1200"))],
        ["مخزون مواد التجهيز (1210)", iqd(balanceMap.get("1210"))],
        ["رأس المال (3100)", iqd(balanceMap.get("3100"))],
      ], 3)}
      ${sectionTitle("تسويات التحصيل المنجزة في الشهر")}
      ${cards([
        ["عدد التسويات المنجزة", numberValue(completedSettlements.length)],
        ["إجمالي COD بالتسويات", iqd(sumKnown(completedSettlements, "gross_amount"))],
        ["أجور الشركات", iqd(sumKnown(completedSettlements, "fees_amount"))],
        ["الصافي المستلم", iqd(sumKnown(completedSettlements, "net_amount"))],
      ], 4)}
      ${pendingSettlements ? notice(`يوجد ${pendingSettlements} سجل تسوية في الشهر بحالة غير reconciled/closed؛ راجع جدول التسويات التفصيلي.`, "warn") : notice("كل سجلات التسوية الظاهرة في الحزمة منتهية بحالة reconciled/closed.", "ok")}
      ${sectionTitle("المراكز الشهرية المؤكدة")}
      ${table(["النوع", "شركة التوصيل", "المبلغ", "الإجمالي", "الأجور", "استقطاع آخر"], monthlyPositions.slice(0, 10).map((row) => [
        esc(row.position_type), esc(row.delivery_company_name), iqd(row.amount), iqd(row.gross_amount), iqd(row.fee_amount), iqd(row.other_deduction_amount),
      ]), "compact")}
    `,
  });

  const orderRevenueTotal = sumKnown(sales, "product_revenue");
  const orderCogsTotal = sumKnown(sales, "cogs_amount");
  const orderFulfillmentTotal = sumKnown(sales, "fulfillment_cost");
  const restockCogs = verifiedRestockCogs(returns);
  const expectedPeriodCogs = orderCogsTotal == null ? null : orderCogsTotal - restockCogs;
  const revenueDiff = finiteNumber(summary.product_revenue) != null && orderRevenueTotal != null ? Number(summary.product_revenue) - orderRevenueTotal : null;
  const cogsDiff = finiteNumber(summary.cogs) != null && expectedPeriodCogs != null ? Number(summary.cogs) - expectedPeriodCogs : null;
  const fulfillmentDiff = finiteNumber(summary.fulfillment_cost) != null && orderFulfillmentTotal != null ? Number(summary.fulfillment_cost) - orderFulfillmentTotal : null;
  const checkRows: string[][] = [
    ["ميزان اليومية", iqd(summary.journal_difference), Math.abs(finiteNumber(summary.journal_difference) ?? Infinity) < 0.5 ? statusChip("مطابق", "ok") : statusChip("يحتاج مراجعة", "bad")],
    ["عدد الطلبات: الملخص مقابل السجل", `${numberValue(summary.realized_orders)} / ${sales.length.toLocaleString("en-US")}`, finiteNumber(summary.realized_orders) === sales.length ? statusChip("مطابق", "ok") : statusChip("يحتاج مراجعة", "bad")],
    ["إيراد المنتجات: الأستاذ مقابل طلبات الشهر", iqd(revenueDiff), revenueDiff != null && Math.abs(revenueDiff) < 0.5 ? statusChip("مطابق", "ok") : statusChip("يحتاج مراجعة", "bad")],
    ["COGS: المبيعات ناقص كلفة المعاد للمخزون", iqd(cogsDiff), cogsDiff != null && Math.abs(cogsDiff) < 0.5 ? statusChip("مطابق", "ok") : statusChip("يحتاج مراجعة", "bad")],
    ["كلفة معادة للمخزون من راجعات معتمدة", iqd(restockCogs), statusChip("تفسير COGS", "neutral")],
    ["كلفة التجهيز: الأستاذ مقابل طلبات مبيعات الشهر", iqd(fulfillmentDiff), fulfillmentDiff != null && Math.abs(fulfillmentDiff) < 0.5 ? statusChip("مطابق", "ok") : statusChip("قد يشمل تعديلات لطلبات أقدم", "warn")],
  ];
  pages.push({
    section: "الرقابة والمطابقة",
    title: "هل أرقام الشهر مترابطة؟",
    subtitle: "اختبارات ربط بين الملخص، الطلبات ودفتر اليومية؛ النتيجة لا تُخفى حتى لو كانت تحتاج مراجعة",
    body: `
      ${table(["اختبار المطابقة", "الفرق/القيمة", "النتيجة"], checkRows)}
      ${sectionTitle("موانع الإغلاق", blockers.length ? `${blockers.length} نوع` : "لا توجد")}
      ${table(["الفحص", "الوصف", "العدد"], blockers.map((row) => [esc(row.key), esc(row.label), numberValue(row.count)]))}
      ${sectionTitle("مؤشرات جاهزية إضافية")}
      ${table(["المؤشر", "القيمة"], [
        ["طلبات بكلفة غير مكتملة", numberValue(summary.incomplete_cost_orders)],
        ["طلبات بلا كلفة تجهيز مثبتة", numberValue(summary.missing_fulfillment_orders)],
        ["طلبات بكلفة تجهيز غير مكتملة", numberValue(summary.incomplete_fulfillment_orders)],
        ["أخطاء دليل الدفع", numberValue(summary.payment_evidence_errors)],
        ["طلبات ناقل غير مسواة", numberValue(summary.unsettled_carrier_orders)],
        ["راجعات غير موثقة بالكامل", numberValue(summary.unverified_returns)],
        ["مصاريف غير موثقة", numberValue(summary.undocumented_expenses)],
        ["فروقات مخزون", numberValue(summary.inventory_mismatches)],
      ], "compact")}
    `,
  });

  const products = aggregateProducts(sales);
  pages.push({
    section: "تحليل المنتجات",
    title: "شنو باع هذا الشهر؟",
    subtitle: "ترتيب حسب إيراد بنود الطلبات المسجل وقت الشراء؛ يحافظ على اسم المنتج والخيار والكمية",
    body: `
      ${cards([
        ["عدد المنتجات/الخيارات المباعة", numberValue(products.length)],
        ["إجمالي الوحدات", numberValue(products.reduce((s, row) => s + (finiteNumber(row.quantity) ?? 0), 0))],
        ["أعلى منتج/خيار بالإيراد", products[0] ? esc(`${products[0].productName}${products[0].variantLabel ? ` — ${products[0].variantLabel}` : ""}`) : "لا توجد بيانات"],
      ], 3)}
      ${table(["المنتج", "الخيار", "الكمية", "عدد الطلبات", "إيراد البنود"], products.slice(0, 18).map((row) => [
        esc(row.productName), esc(row.variantLabel || "—"), numberValue(row.quantity), numberValue(row.orderCount), row.revenueKnown ? iqd(row.revenue) : "غير متوفر",
      ]), "compact")}
      ${products.length > 18 ? notice(`يعرض هذا الملخص أعلى 18 منتج/خيار. جميع البنود تبقى موجودة داخل صفحات كل طلب.`, "neutral") : ""}
    `,
  });

  appendChunkPages(
    pages,
    chunks(sales, 14),
    "فهرس الطلبات المتحققة",
    (index) => `الجزء ${index + 1} · كل طلب له صفحة تفصيل لاحقاً`,
    ["الطلب", "التحقق", "المصدر", "مبيعات", "COGS", "تجهيز", "مساهمة", "التسوية"],
    (row) => [
      esc(row.order_number ?? row.order_id), dateBaghdad(row.recognized_at), esc(row.source),
      iqd(row.product_revenue), iqd(row.cogs_amount), iqd(row.fulfillment_cost), iqd(row.contribution_profit),
      esc(row.settlement_status),
    ],
    "الطلبات",
  );

  pages.push(...buildPackedOrderDetailPages(sales));

  appendChunkPages(
    pages,
    chunks(expenses, 20),
    "المصاريف",
    (index) => `الجزء ${index + 1} · الموثق والمعلق يظهران منفصلين بحالتهما الأصلية`,
    ["التاريخ", "الفئة", "الجهة", "الوصف", "المبلغ", "الحالة", "المعالجة الضريبية"],
    (row) => [
      dateBaghdad(row.expense_occurred_at ?? row.expense_date), esc(row.category), esc(row.vendor_name),
      esc(row.description), iqd(row.amount), esc(row.accounting_status), esc(row.tax_treatment ?? "pending"),
    ],
    "المصاريف",
  );

  appendChunkPages(
    pages,
    chunks(returns, 18),
    "الراجعات والخسائر",
    (index) => `الجزء ${index + 1} · لا يتم دمج رد المبلغ مع شطب المنتج أو خسارة التغليف`,
    ["الطلب", "النوع", "الحالة", "رد المبلغ", "التغليف", "شطب المنتج", "أعيد للمخزون", "التحديث"],
    (row) => [
      esc(row.order_id), esc(row.type), esc(row.status), iqd(row.refund_amount), iqd(row.packaging_loss),
      iqd(row.product_write_off_amount), row.restocked ? "نعم" : "لا", dateBaghdad(row.updated_at),
    ],
    "الراجعات",
  );

  appendChunkPages(
    pages,
    chunks(settlements, 18),
    "تسويات شركات التوصيل",
    (index) => `الجزء ${index + 1} · gross = fees + net في السجلات المحمية بقيود النظام`,
    ["رقم التسوية", "الشركة", "التاريخ", "الإجمالي", "الأجور", "الصافي", "الحالة"],
    (row) => [
      esc(row.settlement_number ?? row.id), esc(row.carrier), dateBaghdad(row.received_at ?? row.updated_at),
      iqd(row.gross_amount), iqd(row.fees_amount), iqd(row.net_amount), esc(row.status),
    ],
    "التسويات",
  );

  const journalLines = flattenJournal(journal);
  appendChunkPages(
    pages,
    chunks(journalLines, 24),
    "دفتر اليومية التفصيلي",
    (index) => `الجزء ${index + 1} · كل سطر يوضح الحساب المدين/الدائن والمصدر`,
    ["القيد", "التاريخ", "المصدر", "الحساب", "البيان", "مدين", "دائن"],
    (row) => [
      esc(row.entry_number), dateBaghdad(row.entry_date), esc(`${row.source_type ?? "—"}/${row.event_kind ?? "—"}`),
      esc(`${row.accountCode ?? "—"} ${row.accountName ?? ""}`), esc(row.memo ?? row.description), iqd(row.debit), iqd(row.credit),
    ],
    "دفتر الأستاذ",
  );

  appendChunkPages(
    pages,
    chunks(openingInventory, 24),
    "تفصيل المخزون الافتتاحي",
    (index) => `الجزء ${index + 1} · مرجع القطع المحاسبي 1 آب 2026`,
    ["المنتج", "المتغير", "الكمية", "كلفة الوحدة", "القيمة", "مصدر الكلفة"],
    (row) => [
      esc(row.product_id), esc(row.variant_id), numberValue(row.quantity ?? row.stock),
      iqd(row.unit_cost_iqd ?? row.unit_cost ?? row.cost_price),
      iqd(row.value_iqd ?? row.total_cost ?? row.total_value ?? row.inventory_value),
      esc(row.cost_source ?? row.cost_status ?? row.source),
    ],
    "المخزون",
  );

  pages.push({
    section: "الملف والاعتماد",
    title: "بيانات المنشأة وحالة الاعتماد",
    subtitle: "الحقول الناقصة تبقى ظاهرة صراحةً ولا يتم تخمين رقم مكلف أو فرع أو اعتماد محاسب",
    body: `
      ${cards([
        ["حالة الملف الضريبي", esc(profile.status ?? "غير متوفر")],
        ["رقم المكلف", esc(profile.taxpayer_number ?? "غير متوفر")],
        ["الفرع الضريبي", esc(profile.tax_branch ?? "غير متوفر")],
        ["العنوان المسجل", esc(profile.registered_address ?? "غير متوفر")],
        ["إجازة المحاسب", esc(profile.accountant_license_number ?? "غير متوفر")],
        ["اعتماد المحاسب", profile.accountant_approved_at ? dateBaghdad(profile.accountant_approved_at) : "غير متوفر"],
      ], 3)}
      ${payload.manifest?.taxFinal
        ? notice("الفترة موسومة TAX FINAL داخل النظام.", "ok")
        : notice("هذه الحزمة إدارية/مراجعة وليست إقراراً ضريبياً نهائياً أو بيان IFRS كامل.", "warn")}
      ${sectionTitle("فهرس الأدلة — أول 12 مستند")}
      ${table(["النوع", "الجهة", "رقم المستند", "التاريخ", "المبلغ", "المصدر"], evidenceIndex.slice(0, 12).map((row) => [
        esc(row.document_type), esc(row.issuer), esc(row.document_number), esc(row.document_date), iqd(row.amount), esc(row.storage_provider),
      ]), "compact")}
    `,
  });

  if (evidenceIndex.length > 12) {
    appendChunkPages(
      pages,
      chunks(evidenceIndex.slice(12), 24),
      "فهرس الأدلة — تكملة",
      (index) => `الجزء ${index + 1}`,
      ["النوع", "الجهة", "رقم المستند", "التاريخ", "المبلغ", "المصدر"],
      (row) => [esc(row.document_type), esc(row.issuer), esc(row.document_number), esc(row.document_date), iqd(row.amount), esc(row.storage_provider)],
      "الأدلة",
    );
  }

  pages.push({
    section: "تعريفات التقرير",
    title: "شلون تنقري الأرقام؟",
    subtitle: "تعريفات ثابتة تمنع الخلط بين المبيعات والتحصيل والكلفة والربح",
    body: `
      ${table(["المصطلح", "المعنى داخل AQUAVO"], [
        ["الطلبات المتحققة", "طلبات دخلت المحاسبة عند تحقق حدث الاعتراف بالإيراد؛ مو كل طلب منشأ على الموقع."],
        ["مبيعات المنتجات", "إيراد المنتجات من حساب الأستاذ 3000، منفصل عن أجور التوصيل."],
        ["فرق التقريب", "الفرق الناتج عن سياسة التقريب في حساب مستقل 3050."],
        ["كلفة المنتجات COGS", "كلفة البضاعة المرتبطة بالمبيعات من حساب 4000 وفق snapshot/ledger."],
        ["كلفة التجهيز", "مواد التجهيز والتغليف المسجلة محاسبياً في حساب 5100."],
        ["دعم التوصيل", "المبلغ الذي تتحمله AQUAVO عندما تكون أجرة الناقل أعلى من المبلغ المحصل من الزبون."],
        ["مساهمة الطلب", "ربح/مساهمة الطلب قبل المصاريف العامة والراجعات الأخرى بحسب حقائق الطلب."],
        ["صافي النتيجة الإدارية", "مقياس إدارة داخلي حسب المعادلة المبينة في جسر الربح، وليس تسمية IFRS مستقلة."],
        ["COD لدى شركات التوصيل", "رصيد حي من دفتر الأستاذ للمبالغ التي ما زالت بعهدة شركات التوصيل."],
        ["TAX FINAL", "حالة اعتماد داخل نظام AQUAVO؛ لا تعني وحدها أن التقرير مجموعة قوائم مالية IFRS كاملة."],
      ], "compact")}
      ${sectionTitle("مبادئ الجودة المستخدمة")}
      ${notice("التقرير يفصل البنود المختلفة بدل تجميعها بطريقة تخفي المعلومة، يعرض المقارنة عندما تتوفر، ويُبقي الفروقات والبيانات الناقصة ظاهرة وقابلة للتتبع إلى الطلب أو القيد أو المستند.", "neutral")}
    `,
  });

  return pages;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function downloadAccountantPdfV2(
  payload: AnyRow,
  onProgress?: (progress: AccountantPdfProgress) => void,
): Promise<void> {
  validateAccountantPayload(payload);
  await document.fonts?.ready;
  const pages = buildPages(payload);
  onProgress?.({ current: 0, total: pages.length, stage: "preparing" });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;z-index:-1";
  document.body.appendChild(host);
  let fontEmbedCSS: string | undefined;

  try {
    for (let index = 0; index < pages.length; index += 1) {
      const spec = pages[index];
      onProgress?.({ current: index + 1, total: pages.length, stage: "rendering" });

      host.innerHTML = `<style>${STYLE}</style>${pageHtml(spec.title, spec.subtitle, spec.body, {
        period: String(payload.manifest?.periodKey ?? "—"),
        status: payload.manifest?.taxFinal ? "tax_final" : "draft",
        page: index + 1,
        pages: pages.length,
        legalName: String(payload.manifest?.legalName ?? "محل المنبع"),
        legalNameEn: String(payload.manifest?.legalNameEn ?? "AL NABEA SHOP"),
        section: spec.section,
      })}`;

      const page = host.querySelector<HTMLElement>(".aqv-page");
      if (!page) throw new Error("تعذر تجهيز صفحة PDF");

      const images = Array.from(page.querySelectorAll("img"));
      await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      })));

      if (fontEmbedCSS == null) {
        fontEmbedCSS = await getFontEmbedCSS(page);
      }

      const dataUrl = await toJpeg(page, {
        quality: 0.9,
        pixelRatio: 1.22,
        backgroundColor: BRAND.light,
        cacheBust: false,
        preferredFontFormat: "woff2",
        fontEmbedCSS,
      });

      if (index > 0) pdf.addPage();
      pdf.addImage(dataUrl, "JPEG", 0, 0, 210, 297, undefined, "FAST");

      // Keep the admin UI responsive and allow the progress label to repaint.
      await yieldToBrowser();
    }

    onProgress?.({ current: pages.length, total: pages.length, stage: "saving" });
    pdf.save(`AQUAVO-Accounting-${payload.manifest?.periodKey ?? "period"}.pdf`);
  } finally {
    host.remove();
  }
}
