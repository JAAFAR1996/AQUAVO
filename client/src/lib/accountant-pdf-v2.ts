type AnyRow = Record<string, any>;
type PageSpec = { title: string; subtitle: string; body: string };

const BRAND = {
  primary: "#0B93A6",
  primaryDark: "#075F6B",
  light: "#F6F4EF",
  text: "#232323",
  muted: "#6B6B6B",
  border: "#DDD8CE",
  warning: "#C97A2E",
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
function countValue(value: unknown): string {
  const n = finiteNumber(value);
  return n == null ? "غير متوفر" : Math.round(n).toLocaleString("en-US");
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
  const head = headers.map((header) => `<th>${esc(header)}</th>`).join("");
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}" class="empty">لا توجد بيانات</td></tr>`;
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
function cards(items: Array<[string, string, string?]>): string {
  return `<div class="cards">${items.map(([label, value, note]) => (
    `<div class="card${value === "غير متوفر" ? " missing" : ""}"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div>${note ? `<div class="note">${esc(note)}</div>` : ""}</div>`
  )).join("")}</div>`;
}
function pageHtml(title: string, subtitle: string, body: string, meta: { period: string; status: string; page: number; pages: number; legalName: string; legalNameEn: string }): string {
  const draft = meta.status !== "tax_final";
  return `<section class="aqv-page" dir="rtl">
    ${draft ? `<div class="watermark">مسودة</div>` : ""}
    <header>
      <div class="brand"><img src="/brand/aquavo-v2-horizontal.svg" alt="AQUAVO"><div class="issuer">تقرير صادر عن ${esc(meta.legalName)} <span>— ${esc(meta.legalNameEn)}</span></div></div>
      <div class="meta"><strong>${esc(meta.period)}</strong><span>${draft ? "مسودة إدارية" : "معتمد ضريبياً"}</span><small>صفحة ${meta.page} من ${meta.pages}</small></div>
    </header>
    <div class="rule"></div>
    <div class="heading"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>
    <main>${body}</main>
    <footer>
      <strong>${draft ? "غير صالح للتقديم الضريبي النهائي" : "TAX FINAL — معتمد وفق بيانات المحاسب"}</strong>
      <span>مصدر الأرقام: دفتر الأستاذ المزدوج وحقائق الطلبات المحاسبية؛ القيم المفقودة لا تُستبدل بأصفار.</span>
      <span>تقرير محاسبي صادر عن ${esc(meta.legalName)} — العلامة التجارية: AQUAVO</span>
      <small>aquavoiq.com · 07747880673 · info@aquavoiq.com · instagram.com/aquavo_iq</small>
    </footer>
  </section>`;
}

const STYLE = `
  *{box-sizing:border-box}.aqv-page{position:relative;width:794px;height:1123px;overflow:hidden;background:${BRAND.light};color:${BRAND.text};padding:34px 38px 34px;font-family:Cairo,Arial,sans-serif}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.brand img{width:205px;height:57px;object-fit:contain;object-position:right center}.issuer{font-size:11px;color:${BRAND.muted};margin-top:7px}.issuer span{font-family:Inter,Arial,sans-serif;direction:ltr;display:inline-block}.meta{text-align:left;display:grid;gap:5px;color:${BRAND.muted};font-family:Inter,Cairo,Arial,sans-serif}.meta strong{font-size:15px;color:${BRAND.text}}.meta span{font-size:11px}.meta small{font-size:9px}
  .rule{height:3px;background:linear-gradient(90deg,${BRAND.primary} 0 28%,${BRAND.text} 28% 100%);margin:16px 0 18px}.heading h1{margin:0;font-size:21px}.heading p{margin:5px 0 18px;color:${BRAND.muted};font-size:11px;line-height:1.7}main{font-size:11px}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}.card{background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:7px;padding:11px;min-height:74px}.card.missing{border-color:${BRAND.warning}}.label{font-size:10px;color:${BRAND.muted}}.value{font-size:17px;font-weight:800;margin-top:5px;color:${BRAND.text}}.missing .value{color:${BRAND.warning};font-size:13px}.note{font-size:8.5px;color:${BRAND.muted};margin-top:4px;line-height:1.5}
  h2{font-size:14px;margin:14px 0 8px;border-right:4px solid ${BRAND.primary};padding-right:8px}table{width:100%;border-collapse:collapse;background:${BRAND.white};font-size:8.5px}th{background:#EFECE5;text-align:right;padding:6px;border:1px solid ${BRAND.border};font-weight:700}td{padding:6px;border:1px solid ${BRAND.border};vertical-align:top;line-height:1.45}.empty{text-align:center;color:${BRAND.muted};padding:24px}
  .notice{border:1px solid ${BRAND.border};border-radius:7px;background:${BRAND.white};padding:11px;line-height:1.8;margin-bottom:13px}.warning{border-color:${BRAND.warning};color:#7a4618}.ok{border-color:${BRAND.primary};color:${BRAND.primaryDark}}.watermark{position:absolute;left:145px;top:450px;transform:rotate(-25deg);font:900 96px Cairo,Arial,sans-serif;color:rgba(201,122,46,.08);z-index:0;pointer-events:none}.aqv-page>*{position:relative;z-index:1}
  footer{position:absolute;right:38px;left:38px;bottom:22px;border-top:1px dashed ${BRAND.border};padding-top:8px;display:grid;gap:2px;text-align:center;color:${BRAND.muted};font-size:8px}footer strong{color:${BRAND.warning};font-size:9px}footer small{font-family:Inter,Arial,sans-serif;direction:ltr}
`;

function appendChunkPages(
  pages: PageSpec[], groups: AnyRow[][], title: string, subtitle: (index: number) => string,
  headers: string[], rowBuilder: (row: AnyRow) => string[],
): void {
  groups.forEach((group, index) => pages.push({
    title,
    subtitle: subtitle(index),
    body: table(headers, group.map(rowBuilder)),
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

function flattenJournal(entries: AnyRow[]): AnyRow[] {
  const rows: AnyRow[] = [];
  for (const entry of entries) {
    const lines = Array.isArray(entry.lines) ? entry.lines : [];
    if (!lines.length) {
      rows.push({ ...entry, lineNumber: null, accountCode: "—", accountName: "قيد بلا سطور", debit: null, credit: null, memo: "—" });
      continue;
    }
    for (const line of lines) rows.push({ ...entry, ...line });
  }
  return rows;
}

function buildPages(payload: AnyRow): PageSpec[] {
  const summary: AnyRow = payload.readiness ?? {};
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

  pages.push({
    title: "الملف المحاسبي الشهري",
    subtitle: `الفترة ${payload.manifest?.periodKey ?? "—"} · السياسة ${payload.manifest?.policyVersion ?? "—"} · توليد ${dateBaghdad(payload.manifest?.generatedAt)} · IQD`,
    body: `${cards([
      ["مبيعات المنتجات", iqd(summary.product_revenue)],
      ["فرق التقريب", iqd(summary.rounding_adjustment), "حساب مستقل 3050"],
      ["صافي حق AQUAVO", iqd(summary.merchant_net)],
      ["كلفة المنتجات", iqd(summary.cogs)],
      ["كلفة التجهيز", iqd(summary.fulfillment_cost)],
      ["صافي الربح الإداري", iqd(canonicalNetProfit(summary)), "قبل TAX FINAL"],
    ])}
    <h2>الأرصدة الحية من دفتر الأستاذ</h2>
    ${cards([
      ["الصندوق", iqd(balanceMap.get("1000"))],
      ["البنك", iqd(balanceMap.get("1010"))],
      ["COD لدى شركات التوصيل", iqd(balanceMap.get("1100"))],
      ["مخزون المنتجات", iqd(balanceMap.get("1200"))],
      ["مخزون مواد التجهيز", iqd(balanceMap.get("1210"))],
      ["رأس المال", iqd(balanceMap.get("3100"))],
    ])}
    <div class="notice ${blockers.length ? "warning" : "ok"}">${blockers.length
      ? `الإغلاق متوقف لحين معالجة ${blockers.length} نوع من الموانع.`
      : "لا توجد موانع محاسبية مسجلة لهذه الفترة."}</div>
    <h2>موانع الإغلاق</h2>
    ${table(["المفتاح", "الوصف", "العدد"], blockers.map((row) => [esc(row.key), esc(row.label), esc(row.count)]))}`,
  });

  pages.push({
    title: "حالة الملف والاعتماد",
    subtitle: "بيانات المنشأة والملف الضريبي والأدلة؛ الحقول الناقصة تبقى ظاهرة ولا تُفترض تلقائياً",
    body: `${cards([
      ["حالة الملف الضريبي", esc(profile.status ?? "غير متوفر")],
      ["رقم المكلف", esc(profile.taxpayer_number ?? "غير متوفر")],
      ["الفرع الضريبي", esc(profile.tax_branch ?? "غير متوفر")],
      ["العنوان المسجل", esc(profile.registered_address ?? "غير متوفر")],
      ["إجازة المحاسب", esc(profile.accountant_license_number ?? "غير متوفر")],
      ["اعتماد المحاسب", profile.accountant_approved_at ? dateBaghdad(profile.accountant_approved_at) : "غير متوفر"],
    ])}
    <div class="notice ${payload.manifest?.taxFinal ? "ok" : "warning"}">${payload.manifest?.taxFinal
      ? "الفترة موسومة TAX FINAL في النظام."
      : "هذه حزمة إدارية/مراجعة وليست إقراراً أو اعتماداً ضريبياً نهائياً."}</div>
    <h2>فهرس الأدلة</h2>
    ${table(["النوع", "الجهة", "رقم المستند", "التاريخ", "المبلغ", "المصدر"], evidenceIndex.slice(0, 12).map((row) => [
      esc(row.document_type), esc(row.issuer), esc(row.document_number), esc(row.document_date), iqd(row.amount), esc(row.storage_provider),
    ]))}`,
  });

  appendChunkPages(
    pages, chunks(sales, 16), "سجل المبيعات المتحققة",
    (index) => `الجزء ${index + 1} · الإيراد يتحقق عند التسليم فقط`,
    ["الطلب", "التحقق", "COD", "توصيل", "أجرة الشركة", "مبيعات المنتجات", "صافي AQUAVO", "التسوية"],
    (row) => [esc(row.order_number ?? row.order_id), dateBaghdad(row.recognized_at), iqd(row.gross_collected), iqd(row.customer_delivery_fee), iqd(row.carrier_fee), iqd(row.product_revenue), iqd(row.merchant_net), esc(row.settlement_status)],
  );

  const journalLines = flattenJournal(journal);
  appendChunkPages(
    pages, chunks(journalLines, 20), "دفتر اليومية التفصيلي",
    (index) => `الجزء ${index + 1} · كل سطر يوضح الحساب المدين/الدائن وليس عنوان القيد فقط`,
    ["القيد", "التاريخ", "المصدر", "الحساب", "البيان", "مدين", "دائن"],
    (row) => [
      esc(row.entry_number), dateBaghdad(row.entry_date), esc(`${row.source_type ?? "—"}/${row.event_kind ?? "—"}`),
      esc(`${row.accountCode ?? "—"} ${row.accountName ?? ""}`), esc(row.memo ?? row.description), iqd(row.debit), iqd(row.credit),
    ],
  );

  appendChunkPages(
    pages, chunks(expenses, 18), "المصاريف",
    (index) => `الجزء ${index + 1} · التصنيف الضريبي يبقى للمحاسب في مرحلة TAX FINAL`,
    ["التاريخ", "الفئة", "الجهة", "الوصف", "المبلغ", "الحالة", "المعالجة الضريبية"],
    (row) => [dateBaghdad(row.expense_occurred_at ?? row.expense_date), esc(row.category), esc(row.vendor_name), esc(row.description), iqd(row.amount), esc(row.accounting_status), esc(row.tax_treatment ?? "pending")],
  );

  appendChunkPages(
    pages, chunks(returns, 17), "الراجعات والخسائر",
    (index) => `الجزء ${index + 1} · المعتمد فقط يدخل الحسابات`,
    ["الطلب", "النوع", "الحالة", "رد المبلغ", "التغليف", "شطب المنتج", "أعيد للمخزون", "التحديث"],
    (row) => [esc(row.order_id), esc(row.type), esc(row.status), iqd(row.refund_amount), iqd(row.packaging_loss), iqd(row.product_write_off_amount), row.restocked ? "نعم" : "لا", dateBaghdad(row.updated_at)],
  );

  pages.push({
    title: "تسويات شركات التوصيل",
    subtitle: "الإجمالي والأجور والصافي مشتقة من حقائق الطلبات وتخضع لمطابقة شركة النقل والدفع",
    body: table(
      ["رقم التسوية", "الشركة", "التاريخ", "الإجمالي", "الأجور", "الصافي", "الحالة"],
      settlements.map((row) => [esc(row.settlement_number ?? row.id), esc(row.carrier), dateBaghdad(row.received_at ?? row.updated_at), iqd(row.gross_amount), iqd(row.fees_amount), iqd(row.net_amount), esc(row.status)]),
    ),
  });

  appendChunkPages(
    pages, chunks(openingInventory, 20), "تفصيل المخزون الافتتاحي",
    (index) => `الجزء ${index + 1} · مرجع القطع المحاسبي 1 آب 2026`,
    ["المنتج", "المتغير", "الكمية", "كلفة الوحدة", "القيمة", "مصدر الكلفة"],
    (row) => [
      esc(row.product_id), esc(row.variant_id), countValue(row.quantity ?? row.stock),
      iqd(row.unit_cost_iqd ?? row.unit_cost ?? row.cost_price), iqd(row.value_iqd ?? row.total_value ?? row.inventory_value),
      esc(row.cost_source ?? row.source),
    ],
  );

  pages.push({
    title: "المراكز الشهرية المؤكدة",
    subtitle: "تأكيدات الصندوق وذمم شركات التوصيل والمراكز الإدارية المساندة",
    body: table(
      ["النوع", "شركة التوصيل", "المبلغ", "الإجمالي", "الأجور", "استقطاع آخر", "الحالة"],
      monthlyPositions.map((row) => [
        esc(row.position_type), esc(row.delivery_company_name), iqd(row.amount), iqd(row.gross_amount),
        iqd(row.fee_amount), iqd(row.other_deduction_amount), esc(row.status),
      ]),
    ),
  });

  if (evidenceIndex.length > 12) {
    appendChunkPages(
      pages, chunks(evidenceIndex.slice(12), 20), "فهرس الأدلة — تكملة",
      (index) => `الجزء ${index + 1}`,
      ["النوع", "الجهة", "رقم المستند", "التاريخ", "المبلغ", "المصدر"],
      (row) => [esc(row.document_type), esc(row.issuer), esc(row.document_number), esc(row.document_date), iqd(row.amount), esc(row.storage_provider)],
    );
  }

  return pages;
}

export async function downloadAccountantPdfV2(payload: AnyRow): Promise<void> {
  validateAccountantPayload(payload);
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
        legalName: String(payload.manifest?.legalName ?? "محل المنبع"),
        legalNameEn: String(payload.manifest?.legalNameEn ?? "AL NABEA SHOP"),
      })}`;
      const page = host.querySelector<HTMLElement>(".aqv-page");
      if (!page) throw new Error("تعذر تجهيز صفحة PDF");
      const images = Array.from(page.querySelectorAll("img"));
      await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
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
