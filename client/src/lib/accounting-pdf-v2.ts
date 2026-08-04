import { toPng } from "html-to-image";
import jsPDF from "jspdf";

type Row = Record<string, unknown>;
type AccountingPackage = {
  manifest?: Row;
  readiness?: Row;
  close?: Row | null;
  sales?: Row[];
  journal?: Row[];
  expenses?: Row[];
  returns?: Row[];
  settlements?: Row[];
  deliveryCompanies?: Row[];
  monthlyPositions?: Row[];
  fixedPreparationItems?: Row[];
};

const COLORS = {
  teal: "#0B93A6",
  blue: "#0B64A6",
  dark: "#0B1E28",
  light: "#F6F4EF",
  text: "#232323",
  muted: "#6B6B6B",
  border: "#DDD8CE",
};

const money = (value: unknown) => `${Math.round(Number(value ?? 0)).toLocaleString("en-US")} د.ع`;
const text = (value: unknown) => value == null || value === "" ? "—" : String(value);
const dateText = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? text(value) : date.toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" });
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, css: Partial<CSSStyleDeclaration> = {}, value?: string) {
  const node = document.createElement(tag);
  Object.assign(node.style, css);
  if (value != null) node.textContent = value;
  return node;
}

function pageBase(title: string, periodKey: string, pageNumber: number) {
  const page = el("section", {
    width: "794px", height: "1123px", boxSizing: "border-box", overflow: "hidden",
    background: COLORS.light, color: COLORS.text, direction: "rtl", position: "relative",
    fontFamily: "Cairo, Arial, sans-serif", padding: "42px 46px 50px",
  });
  const header = el("header", { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" });
  const brand = el("div", { textAlign: "left", direction: "ltr" });
  brand.append(el("div", { color: COLORS.teal, fontSize: "31px", fontWeight: "800", letterSpacing: "1px" }, "AQUAVO"));
  brand.append(el("div", { color: COLORS.muted, fontSize: "11px", marginTop: "2px" }, "Freshwater aquarium systems - Iraq"));
  const heading = el("div", { textAlign: "right" });
  heading.append(el("div", { color: COLORS.dark, fontSize: "24px", fontWeight: "800" }, title));
  heading.append(el("div", { color: COLORS.muted, fontSize: "12px", marginTop: "6px" }, `محل المنبع - الفترة ${periodKey}`));
  header.append(heading, brand);
  page.append(header);
  page.append(el("div", { height: "4px", background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.blue})`, marginBottom: "24px" }));
  const body = el("main", { display: "grid", gap: "16px" });
  page.append(body);
  const footer = el("footer", {
    position: "absolute", left: "46px", right: "46px", bottom: "20px", display: "flex",
    justifyContent: "space-between", borderTop: `1px solid ${COLORS.border}`, paddingTop: "8px",
    color: COLORS.muted, fontSize: "10px",
  });
  footer.append(el("span", {}, `صفحة ${pageNumber}`), el("span", {}, "تقرير إداري مولد آلياً من نظام AQUAVO"));
  page.append(footer);
  return { page, body };
}

function sectionTitle(value: string) {
  return el("h2", { margin: "0", color: COLORS.dark, fontSize: "16px", fontWeight: "800", borderRight: `4px solid ${COLORS.teal}`, paddingRight: "9px" }, value);
}

function cards(items: Array<{ label: string; value: string; note?: string }>) {
  const grid = el("div", { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" });
  for (const item of items) {
    const card = el("div", { border: `1px solid ${COLORS.border}`, borderRadius: "10px", background: "#fff", padding: "13px" });
    card.append(el("div", { color: COLORS.muted, fontSize: "10px" }, item.label));
    card.append(el("div", { color: COLORS.dark, fontSize: "18px", fontWeight: "800", marginTop: "5px" }, item.value));
    if (item.note) card.append(el("div", { color: COLORS.muted, fontSize: "9px", marginTop: "4px" }, item.note));
    grid.append(card);
  }
  return grid;
}

function table(headers: string[], rows: string[][], widths?: string[]) {
  const wrapper = el("div", { border: `1px solid ${COLORS.border}`, borderRadius: "10px", overflow: "hidden", background: "#fff" });
  const node = document.createElement("table");
  Object.assign(node.style, { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", direction: "rtl" });
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((header, index) => {
    const th = document.createElement("th");
    th.textContent = header;
    Object.assign(th.style, { background: COLORS.dark, color: "#fff", padding: "8px 7px", fontSize: "9px", textAlign: "right", width: widths?.[index] ?? "auto" });
    headRow.append(th);
  });
  head.append(headRow); node.append(head);
  const body = document.createElement("tbody");
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    row.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      Object.assign(td.style, { padding: "7px", fontSize: "8.5px", color: COLORS.text, textAlign: "right", verticalAlign: "top", borderBottom: rowIndex === rows.length - 1 ? "0" : `1px solid ${COLORS.border}`, wordBreak: "break-word" });
      tr.append(td);
    });
    body.append(tr);
  });
  node.append(body); wrapper.append(node);
  return wrapper;
}

function summaryPages(pkg: AccountingPackage, periodKey: string) {
  const readiness = pkg.readiness ?? {};
  const revenue = Number(readiness.product_revenue ?? 0);
  const cogs = Number(readiness.cogs ?? 0);
  const fulfillment = Number(readiness.fulfillment_cost ?? 0);
  const subsidy = Number(readiness.delivery_subsidy ?? 0);
  const returns = Number(readiness.sales_returns ?? 0) + Number(readiness.actual_return_loss ?? 0);
  const expenses = Number(readiness.verified_expenses ?? 0);
  const profit = revenue - cogs - fulfillment - subsidy - returns - expenses;
  const { page, body } = pageBase("الملف المحاسبي الشهري", periodKey, 1);
  body.append(sectionTitle("ملخص الأداء"));
  body.append(cards([
    { label: "مبيعات المنتجات", value: money(revenue) },
    { label: "صافي حق AQUAVO", value: money(readiness.merchant_net) },
    { label: "صافي الربح الإداري", value: money(profit) },
    { label: "كلفة المنتجات", value: money(cogs) },
    { label: "كلفة التجهيز", value: money(fulfillment) },
    { label: "المصاريف المعتمدة", value: money(expenses) },
  ]));
  body.append(sectionTitle("حالة الشهر"));
  const close = pkg.close ?? null;
  body.append(cards([
    { label: "الحالة", value: close ? text(close.status) : "مفتوح", note: "الإغلاق الإداري يتم تلقائياً بعد انتهاء الشهر" },
    { label: "عدد الطلبات المتحققة", value: text(readiness.realized_orders ?? 0) },
    { label: "فرق اليومية", value: money(readiness.journal_difference), note: "يجب أن يساوي صفراً" },
  ]));
  const positionRows = (pkg.monthlyPositions ?? []).map((row) => [
    text(row.position_type), text(row.delivery_company_name), money(row.amount), text(row.note),
  ]);
  if (positionRows.length) {
    body.append(sectionTitle("لقطات المطابقة المؤكدة"));
    body.append(table(["النوع", "الجهة", "المبلغ", "الملاحظة"], positionRows.slice(0, 10), ["18%", "20%", "18%", "44%"]));
  }
  return page;
}

function salesPages(pkg: AccountingPackage, periodKey: string, startPage: number) {
  const rows = pkg.sales ?? [];
  const pages: HTMLElement[] = [];
  const chunkSize = 18;
  for (let offset = 0; offset < Math.max(rows.length, 1); offset += chunkSize) {
    const { page, body } = pageBase("سجل المبيعات", periodKey, startPage + pages.length);
    const chunk = rows.slice(offset, offset + chunkSize);
    body.append(sectionTitle(`الطلبات ${rows.length ? `${offset + 1}-${Math.min(offset + chunk.length, rows.length)} من ${rows.length}` : "- لا توجد مبيعات"}`));
    body.append(table(
      ["الطلب", "التاريخ", "COD", "توصيل الزبون", "أجرة الشركة", "مبيعات المنتجات", "صافي AQUAVO"],
      chunk.map((row) => [
        text(row.order_number ?? row.order_id), dateText(row.recognized_at), money(row.gross_collected),
        money(row.customer_delivery_fee), money(row.carrier_fee), money(row.product_revenue), money(row.merchant_net),
      ]),
      ["15%", "18%", "13%", "13%", "13%", "14%", "14%"],
    ));
    pages.push(page);
  }
  return pages;
}

function detailPages(pkg: AccountingPackage, periodKey: string, startPage: number) {
  const pages: HTMLElement[] = [];
  const blocks: Array<{ title: string; headers: string[]; rows: string[][]; widths?: string[] }> = [
    {
      title: "المصاريف المعتمدة",
      headers: ["التاريخ", "التصنيف", "الجهة", "الغرض", "المبلغ"],
      rows: (pkg.expenses ?? []).filter((row) => row.accounting_status === "verified").map((row) => [dateText(row.expense_occurred_at ?? row.expense_date), text(row.category), text(row.vendor_name), text(row.business_purpose ?? row.description), money(row.amount)]),
      widths: ["18%", "17%", "20%", "29%", "16%"],
    },
    {
      title: "الراجعات والخسائر",
      headers: ["الطلب", "النوع", "الحالة", "الاسترداد", "الخسارة", "أعيد للمخزون"],
      rows: (pkg.returns ?? []).map((row) => [text(row.order_id), text(row.type), text(row.status), money(row.refund_amount), money(Number(row.delivery_cost_loss ?? 0) + Number(row.return_shipping_cost ?? 0) + Number(row.packaging_loss ?? 0) + Number(row.product_write_off_amount ?? 0)), row.restocked ? "نعم" : "لا"]),
      widths: ["19%", "18%", "14%", "16%", "17%", "16%"],
    },
    {
      title: "تسويات شركات التوصيل",
      headers: ["الشركة", "الحالة", "الإجمالي", "الأجور", "الصافي", "تاريخ الاستلام"],
      rows: (pkg.settlements ?? []).map((row) => [text(row.carrier), text(row.status), money(row.gross_amount), money(row.fees_amount), money(row.net_amount), dateText(row.received_at ?? row.updated_at)]),
      widths: ["20%", "14%", "17%", "16%", "17%", "16%"],
    },
  ];
  for (const block of blocks) {
    const chunks = block.rows.length ? Array.from({ length: Math.ceil(block.rows.length / 20) }, (_, index) => block.rows.slice(index * 20, index * 20 + 20)) : [[]];
    for (const chunk of chunks) {
      const { page, body } = pageBase(block.title, periodKey, startPage + pages.length);
      body.append(sectionTitle(block.title));
      body.append(table(block.headers, chunk, block.widths));
      pages.push(page);
    }
  }
  return pages;
}

export async function downloadAccountingPdf(pkg: AccountingPackage, periodKey: string) {
  const root = el("div", { position: "fixed", left: "-10000px", top: "0", zIndex: "-1" });
  const pages: HTMLElement[] = [summaryPages(pkg, periodKey)];
  pages.push(...salesPages(pkg, periodKey, pages.length + 1));
  pages.push(...detailPages(pkg, periodKey, pages.length + 1));
  pages.forEach((page) => root.append(page));
  document.body.append(root);
  try {
    await document.fonts?.ready;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    for (let index = 0; index < pages.length; index += 1) {
      if (index > 0) pdf.addPage("a4", "portrait");
      const dataUrl = await toPng(pages[index], { pixelRatio: 1.7, cacheBust: true, backgroundColor: COLORS.light });
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297, undefined, "FAST");
    }
    pdf.save(`AQUAVO-ACCOUNTING-${periodKey}.pdf`);
  } finally {
    root.remove();
  }
}
