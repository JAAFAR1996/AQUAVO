type AnyRow = Record<string, any>;

const BRAND = {
  primary: "#0B93A6",
  flow: "#0B64A6",
  light: "#F6F4EF",
  text: "#232323",
  muted: "#6B6B6B",
  border: "#DDD8CE",
  warning: "#C97A2E",
  white: "#FFFFFF",
};

function esc(value: unknown): string {
  return String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function iqd(value: unknown): string {
  const n = Number(value ?? 0);
  return `${Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-US")} د.ع`;
}
function dateBaghdad(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" });
}
function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out.length ? out : [[]];
}
function table(headers: string[], rows: string[][]): string {
  return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.length
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}" class="empty">لا توجد بيانات</td></tr>`}</tbody></table>`;
}
function cards(items: Array<[string, string, string?]>): string {
  return `<div class="cards">${items.map(([label, value, note]) => `<div class="card"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${note ? `<div class="note">${esc(note)}</div>` : ""}</div>`).join("")}</div>`;
}

function pageHtml(title: string, subtitle: string, body: string, meta: { period: string; status: string; page: number; pages: number }): string {
  const draft = meta.status !== "tax_final";
  return `<section class="aqv-page" dir="rtl">
    ${draft ? `<div class="watermark">DRAFT</div>` : ""}
    <header>
      <div class="brand"><img src="/brand/aquavo-v2-horizontal.svg" alt="AQUAVO"><div class="issuer">تقرير صادر عن محل المنبع <span>— AL NABEA SHOP</span></div></div>
      <div class="meta"><strong>${esc(meta.period)}</strong><span>${draft ? "مسودة إدارية" : "معتمد ضريبياً"}</span><small>صفحة ${meta.page} من ${meta.pages}</small></div>
    </header>
    <div class="rule"></div>
    <div class="heading"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>
    <main>${body}</main>
    <footer>
      <strong>${draft ? "غير صالح للتقديم الضريبي النهائي" : "TAX FINAL — معتمد وفق بيانات المحاسب"}</strong>
      <span>تقرير محاسبي صادر عن محل المنبع — العلامة التجارية: AQUAVO</span>
      <small>aquavoiq.com · 07747880673 · info@aquavoiq.com · instagram.com/aquavo_iq</small>
    </footer>
  </section>`;
}

const STYLE = `
  *{box-sizing:border-box} .aqv-page{position:relative;width:794px;height:1123px;overflow:hidden;background:${BRAND.light};color:${BRAND.text};padding:34px 38px 30px;font-family:Cairo,Arial,sans-serif}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.brand img{width:205px;height:57px;object-fit:contain;object-position:right center}.issuer{font-size:11px;color:${BRAND.muted};margin-top:7px}.issuer span{font-family:Inter,Arial,sans-serif;direction:ltr;display:inline-block}.meta{text-align:left;display:grid;gap:5px;color:${BRAND.muted};font-family:Inter,Cairo,Arial,sans-serif}.meta strong{font-size:15px;color:${BRAND.text}}.meta span{font-size:11px}.meta small{font-size:9px}
  .rule{height:2px;background:${BRAND.text};margin:16px 0 18px}.heading h1{margin:0;font-size:21px}.heading p{margin:5px 0 18px;color:${BRAND.muted};font-size:11px;line-height:1.7}
  main{font-size:11px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}.card{background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:7px;padding:11px;min-height:74px}.label{font-size:10px;color:${BRAND.muted}}.value{font-size:17px;font-weight:800;margin-top:5px;color:${BRAND.text}}.note{font-size:8.5px;color:${BRAND.muted};margin-top:4px;line-height:1.5}
  h2{font-size:14px;margin:14px 0 8px;border-right:4px solid ${BRAND.primary};padding-right:8px}table{width:100%;border-collapse:collapse;background:${BRAND.white};font-size:9px}th{background:#EFECE5;text-align:right;padding:7px;border:1px solid ${BRAND.border};font-weight:700}td{padding:7px;border:1px solid ${BRAND.border};vertical-align:top}.empty{text-align:center;color:${BRAND.muted};padding:24px}.notice{border:1px solid ${BRAND.border};border-radius:7px;background:${BRAND.white};padding:11px;line-height:1.8;margin-bottom:13px}.warning{border-color:${BRAND.warning};color:#7a4618}.ok{border-color:${BRAND.primary};color:#075F6B}.watermark{position:absolute;left:110px;top:450px;transform:rotate(-25deg);font:900 110px Inter,Arial,sans-serif;color:rgba(201,122,46,.08);letter-spacing:12px;z-index:0;pointer-events:none}.aqv-page>*{position:relative;z-index:1}
  footer{position:absolute;right:38px;left:38px;bottom:24px;border-top:1px dashed ${BRAND.border};padding-top:10px;display:grid;gap:3px;text-align:center;color:${BRAND.muted};font-size:8.5px}footer strong{color:${BRAND.warning};font-size:9.5px}footer small{font-family:Inter,Arial,sans-serif;direction:ltr}
`;

function buildPages(payload: AnyRow): Array<{ title: string; subtitle: string; body: string }> {
  const summary = payload.readiness ?? {};
  const balances: AnyRow[] = payload.liveBalances ?? [];
  const sales: AnyRow[] = payload.sales ?? [];
  const journal: AnyRow[] = payload.journal ?? [];
  const expenses: AnyRow[] = payload.expenses ?? [];
  const returns: AnyRow[] = payload.returns ?? [];
  const settlements: AnyRow[] = payload.settlements ?? [];
  const blockers: AnyRow[] = summary.blockers ?? [];
  const pages: Array<{ title: string; subtitle: string; body: string }> = [];

  const balanceMap = new Map(balances.map((row) => [String(row.code), Number(row.balance ?? 0)]));
  pages.push({
    title: "الملف المحاسبي الشهري",
    subtitle: `الفترة ${payload.manifest?.periodKey ?? "—"} · توليد آلي ${dateBaghdad(payload.manifest?.generatedAt)}`,
    body: `${cards([
      ["مبيعات المنتجات", iqd(summary.product_revenue)],
      ["صافي حق AQUAVO", iqd(summary.merchant_net)],
      ["كلفة المنتجات", iqd(summary.cogs)],
      ["كلفة التجهيز", iqd(summary.fulfillment_cost)],
      ["المصاريف المعتمدة", iqd(summary.verified_expenses)],
      ["الطلبات المتحققة", String(summary.realized_orders ?? 0)],
    ])}
    <h2>الأرصدة الحية من دفتر الأستاذ</h2>
    ${cards([
      ["الصندوق", iqd(balanceMap.get("1000"))],
      ["البنك", iqd(balanceMap.get("1010"))],
      ["COD عند شركات التوصيل", iqd(balanceMap.get("1100"))],
      ["مخزون المنتجات", iqd(balanceMap.get("1200"))],
      ["رأس المال", iqd(balanceMap.get("3100"))],
      ["فرق اليومية", iqd(summary.journal_difference)],
    ])}
    <div class="notice ${blockers.length ? "warning" : "ok"}">${blockers.length
      ? `الإغلاق التلقائي متوقف لحين معالجة ${blockers.length} نوع من الموانع. النظام يعيد المحاولة يومياً.`
      : "لا توجد موانع محاسبية حالياً. الشهر يُغلق تلقائياً بعد انتهائه حسب توقيت بغداد."}</div>
    <h2>موانع الإغلاق</h2>
    ${table(["المفتاح", "الوصف", "العدد"], blockers.map((b) => [esc(b.key), esc(b.label), esc(b.count)]))}`,
  });

  for (const [index, group] of chunks(sales, 17).entries()) pages.push({
    title: "سجل المبيعات المتحققة",
    subtitle: `الجزء ${index + 1} · الإيراد يتحقق عند التسليم فقط` ,
    body: table(["الطلب", "تاريخ التحقق", "COD", "توصيل الزبون", "أجرة الشركة", "مبيعات المنتجات", "صافي AQUAVO", "التسوية"], group.map((r) => [
      esc(r.order_number ?? r.order_id), dateBaghdad(r.recognized_at), iqd(r.gross_collected), iqd(r.customer_delivery_fee), iqd(r.carrier_fee), iqd(r.product_revenue), iqd(r.merchant_net), esc(r.settlement_status),
    ])),
  });

  for (const [index, group] of chunks(journal, 18).entries()) pages.push({
    title: "دفتر اليومية",
    subtitle: `الجزء ${index + 1} · قيود مزدوجة غير قابلة للتعديل، والتصحيح بقيد عكسي`,
    body: table(["رقم القيد", "التاريخ", "المصدر", "البيان", "مدين", "دائن", "الحالة"], group.map((r) => [
      esc(r.entry_number), dateBaghdad(r.entry_date), esc(`${r.source_type}/${r.event_kind}`), esc(r.description), iqd(r.total_debit), iqd(r.total_credit), esc(r.status),
    ])),
  });

  for (const [index, group] of chunks(expenses, 18).entries()) pages.push({
    title: "المصاريف",
    subtitle: `الجزء ${index + 1} · التصنيف الضريبي يبقى للمحاسب في مرحلة TAX FINAL`,
    body: table(["التاريخ", "الفئة", "الجهة", "الوصف", "المبلغ", "الحالة", "المعالجة الضريبية"], group.map((r) => [
      dateBaghdad(r.expense_occurred_at ?? r.expense_date), esc(r.category), esc(r.vendor_name), esc(r.description), iqd(r.amount), esc(r.accounting_status), esc(r.tax_treatment ?? "pending"),
    ])),
  });

  for (const [index, group] of chunks(returns, 17).entries()) pages.push({
    title: "الراجعات والخسائر",
    subtitle: `الجزء ${index + 1} · الأحداث منشأة من سير الطلب، والمعتمد فقط يدخل الحسابات`,
    body: table(["الطلب", "النوع", "الحالة", "رد المبلغ", "التغليف", "شطب المنتج", "أعيد للمخزون", "التحديث"], group.map((r) => [
      esc(r.order_id), esc(r.type), esc(r.status), iqd(r.refund_amount), iqd(r.packaging_loss), iqd(r.product_write_off_amount), r.restocked ? "نعم" : "لا", dateBaghdad(r.updated_at),
    ])),
  });

  pages.push({
    title: "تسويات شركات التوصيل",
    subtitle: "الإجمالي والأجور والصافي مشتقة من الطلبات، وليست مدخلة يدوياً",
    body: table(["رقم التسوية", "الشركة", "التاريخ", "الإجمالي", "الأجور", "الصافي", "الحالة"], settlements.map((r) => [
      esc(r.settlement_number ?? r.id), esc(r.carrier), dateBaghdad(r.received_at ?? r.updated_at), iqd(r.gross_amount), iqd(r.fees_amount), iqd(r.net_amount), esc(r.status),
    ])),
  });

  return pages;
}

export async function downloadAccountantPdfV2(payload: AnyRow): Promise<void> {
  const [{ jsPDF }, { toPng }] = await Promise.all([import("jspdf"), import("html-to-image")]);
  await document.fonts?.ready;
  const pages = buildPages(payload);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;z-index:-1";
  document.body.appendChild(host);

  try {
    for (let index = 0; index < pages.length; index += 1) {
      const spec = pages[index];
      host.innerHTML = `<style>${STYLE}</style>${pageHtml(spec.title, spec.subtitle, spec.body, {
        period: String(payload.manifest?.periodKey ?? "—"),
        status: payload.manifest?.taxFinal ? "tax_final" : "draft",
        page: index + 1,
        pages: pages.length,
      })}`;
      const page = host.querySelector<HTMLElement>(".aqv-page");
      if (!page) throw new Error("تعذر تجهيز صفحة PDF");
      const images = Array.from(page.querySelectorAll("img"));
      await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        img.onload = () => resolve(); img.onerror = () => resolve();
      })));
      const dataUrl = await toPng(page, { pixelRatio: 1.7, backgroundColor: BRAND.light, cacheBust: true });
      if (index > 0) pdf.addPage();
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297, undefined, "FAST");
    }
    pdf.save(`AQUAVO-Accounting-${payload.manifest?.periodKey ?? "period"}.pdf`);
  } finally {
    host.remove();
  }
}
