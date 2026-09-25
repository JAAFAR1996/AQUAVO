import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "@/styles/accounting-html-report.css";

type Row = Record<string, any>;

const STATUS_AR: Record<string, string> = {
  matched: "مطابق",
  reconciled: "مسوّى",
  closed: "مغلق",
  unsettled: "غير مسوّى",
  pending: "قيد المتابعة",
  paid: "مدفوع",
  delivered: "مسلّم",
  verified: "موثّق",
  rejected_delivery: "رفض استلام",
  website: "الموقع",
  whatsapp: "واتساب",
  known: "كلفة مثبتة",
  provisional: "كلفة مؤقتة",
  unknown: "كلفة غير محسومة",
  exact: "مثبت",
  draft: "مسودة",
  tax_final: "اعتماد ضريبي نهائي",
};

function finite(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function iqd(value: unknown): string {
  const number = finite(value);
  return number == null ? "غير متوفر" : `${Math.round(number).toLocaleString("en-US")} د.ع`;
}

function numberValue(value: unknown): string {
  const number = finite(value);
  return number == null ? "غير متوفر" : Math.round(number).toLocaleString("en-US");
}

function percent(value: unknown, digits = 1): string {
  const number = finite(value);
  return number == null ? "غير متوفر" : `${number.toFixed(digits)}%`;
}

function ratio(numerator: unknown, denominator: unknown): number | null {
  const n = finite(numerator);
  const d = finite(denominator);
  if (n == null || d == null || d === 0) return null;
  return (n / d) * 100;
}

function delta(current: unknown, previous: unknown): number | null {
  const c = finite(current);
  const p = finite(previous);
  if (c == null || p == null || p === 0) return null;
  return ((c - p) / Math.abs(p)) * 100;
}

function dateBaghdad(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateOnly(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function periodLabel(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return periodKey;
  return new Intl.DateTimeFormat("ar-IQ", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function baghdadMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}`;
}

function humanStatus(value: unknown): string {
  if (value == null || value === "") return "غير متوفر";
  const raw = String(value);
  return STATUS_AR[raw.toLowerCase()] ?? raw.replaceAll("_", " ");
}

function safeArray(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
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

function canonicalNet(summary: Row): number | null {
  const fields = [
    "product_revenue",
    "rounding_adjustment",
    "cogs",
    "fulfillment_cost",
    "delivery_subsidy",
    "sales_returns",
    "actual_return_loss",
    "verified_expenses",
    "fx_net_expense",
  ];
  const values = Object.fromEntries(fields.map((field) => [field, finite(summary[field])]));
  if (Object.values(values).some((value) => value == null)) return null;
  return Number(values.product_revenue)
    + Number(values.rounding_adjustment)
    - Number(values.cogs)
    - Number(values.fulfillment_cost)
    - Number(values.delivery_subsidy)
    - Number(values.sales_returns)
    - Number(values.actual_return_loss)
    - Number(values.verified_expenses)
    - Number(values.fx_net_expense);
}

function grossProfit(summary: Row): number | null {
  const revenue = finite(summary.product_revenue);
  const cogs = finite(summary.cogs);
  return revenue == null || cogs == null ? null : revenue - cogs;
}

function contribution(order: Row): number | null {
  const revenue = finite(order.product_revenue);
  const cogs = finite(order.cogs_amount);
  const subsidy = finite(order.delivery_subsidy);
  const fulfillment = finite(order.fulfillment_cost);
  if (revenue == null || cogs == null || subsidy == null || fulfillment == null) return null;
  return revenue - cogs - subsidy - fulfillment;
}

function readJson(response: Response): Promise<any> {
  return response.json().catch(() => ({})).then((body) => {
    if (!response.ok) {
      throw new Error(typeof body?.message === "string" ? body.message : "فشل تحميل التقرير المحاسبي");
    }
    return body;
  });
}

function Kpi({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: React.ReactNode;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <div className={`acct-html-kpi acct-html-kpi--${tone}`}>
      <div className="acct-html-kpi__label">{label}</div>
      <div className="acct-html-kpi__value">{value}</div>
      {note ? <div className="acct-html-kpi__note">{note}</div> : null}
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="acct-html-section">
      <div className="acct-html-section__head">
        <div>
          <div className="acct-html-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function DataTable({
  columns,
  rows,
  empty = "لا توجد بيانات لهذه الفترة",
}: {
  columns: Array<{ key: string; label: string; numeric?: boolean }>;
  rows: Array<Record<string, React.ReactNode>>;
  empty?: string;
}) {
  return (
    <div className="acct-html-table-wrap">
      <table className="acct-html-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.numeric ? "is-number" : undefined}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={String(index)}>
              {columns.map((column) => (
                <td key={column.key} className={column.numeric ? "is-number" : undefined}>
                  {row[column.key] ?? "—"}
                </td>
              ))}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} className="acct-html-empty">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BarRows({
  rows,
}: {
  rows: Array<{ label: string; value: number; amount: string; meta?: string }>;
}) {
  return (
    <div className="acct-html-bars">
      {rows.map((row) => (
        <div className="acct-html-bar" key={row.label}>
          <div className="acct-html-bar__head">
            <strong>{row.label}</strong>
            <span>{row.amount}{row.meta ? ` · ${row.meta}` : ""}</span>
          </div>
          <div className="acct-html-bar__track">
            <div className="acct-html-bar__fill" style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Donut({
  segments,
  center,
  subcenter,
  formatter = iqd,
}: {
  segments: Array<{ label: string; value: number; className: string }>;
  center: string;
  subcenter: string;
  formatter?: (value: number) => string;
}) {
  const positive = segments.filter((segment) => segment.value > 0);
  const total = positive.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;
  return (
    <div className="acct-html-donut-block">
      <svg className="acct-html-donut" viewBox="0 0 42 42" aria-label="توزيع نسبي">
        <circle className="acct-html-donut__base" cx="21" cy="21" r="15.9155" fill="transparent" />
        {positive.map((segment) => {
          const share = total ? (segment.value / total) * 100 : 0;
          const element = (
            <circle
              key={segment.label}
              className={`acct-html-donut__segment ${segment.className}`}
              cx="21"
              cy="21"
              r="15.9155"
              fill="transparent"
              strokeDasharray={`${share} ${100 - share}`}
              strokeDashoffset={String(25 - offset)}
            />
          );
          offset += share;
          return element;
        })}
        <text x="21" y="20.2" textAnchor="middle" className="acct-html-donut__center">{center}</text>
        <text x="21" y="24.2" textAnchor="middle" className="acct-html-donut__sub">{subcenter}</text>
      </svg>
      <div className="acct-html-legend">
        {segments.map((segment) => (
          <div key={segment.label}><span className={`acct-html-legend__dot ${segment.className}`} />{segment.label}<strong>{formatter(segment.value)}</strong></div>
        ))}
      </div>
    </div>
  );
}

function Waterfall({ summary, net }: { summary: Row; net: number | null }) {
  const revenue = Math.max(0, finite(summary.product_revenue) ?? 0);
  const rounding = finite(summary.rounding_adjustment) ?? 0;
  const items = [
    { label: "المبيعات", delta: revenue, kind: "total" },
    { label: "التقريب", delta: rounding, kind: rounding >= 0 ? "plus" : "minus" },
    { label: "COGS", delta: -(finite(summary.cogs) ?? 0), kind: "minus" },
    { label: "التجهيز", delta: -(finite(summary.fulfillment_cost) ?? 0), kind: "minus" },
    { label: "دعم التوصيل", delta: -(finite(summary.delivery_subsidy) ?? 0), kind: "minus" },
    { label: "الراجعات", delta: -((finite(summary.sales_returns) ?? 0) + (finite(summary.actual_return_loss) ?? 0)), kind: "minus" },
    { label: "المصاريف", delta: -(finite(summary.verified_expenses) ?? 0), kind: "minus" },
    { label: "فرق العملة", delta: -(finite(summary.fx_net_expense) ?? 0), kind: "minus" },
  ];
  const max = Math.max(1, revenue);
  let cursor = 0;
  const plotted = items.map((item) => {
    const start = cursor;
    cursor += item.delta;
    return { ...item, start, end: cursor };
  });
  return (
    <div className="acct-html-waterfall">
      {plotted.map((item) => {
        const high = Math.max(item.start, item.end);
        const low = Math.min(item.start, item.end);
        const left = Math.max(0, (low / max) * 100);
        const width = Math.max(item.delta !== 0 ? 1.4 : 0.4, (Math.abs(item.delta) / max) * 100);
        return (
          <div className="acct-html-waterfall__row" key={item.label}>
            <span className="acct-html-waterfall__label">{item.label}</span>
            <div className="acct-html-waterfall__track">
              <div
                className={`acct-html-waterfall__bar acct-html-waterfall__bar--${item.kind}`}
                style={{ right: `${left}%`, width: `${Math.min(100, width)}%` }}
                title={`${item.label}: ${iqd(item.delta)}`}
              />
            </div>
            <strong>{item.kind === "total" ? iqd(item.end) : `${item.delta < 0 ? "−" : "+"} ${iqd(Math.abs(item.delta))}`}</strong>
          </div>
        );
      })}
      <div className="acct-html-waterfall__row acct-html-waterfall__row--net">
        <span className="acct-html-waterfall__label">صافي النتيجة</span>
        <div className="acct-html-waterfall__track">
          <div className="acct-html-waterfall__bar acct-html-waterfall__bar--net" style={{ right: "0", width: `${Math.min(100, Math.max(1.4, ((net ?? 0) / max) * 100))}%` }} />
        </div>
        <strong>{iqd(net)}</strong>
      </div>
    </div>
  );
}

function deltaLabel(current: unknown, previous: unknown, invert = false): React.ReactNode {
  const value = delta(current, previous);
  if (value == null) return <span className="acct-html-delta acct-html-delta--neutral">لا توجد قاعدة مقارنة</span>;
  const good = invert ? value <= 0 : value >= 0;
  return <span className={`acct-html-delta ${good ? "acct-html-delta--good" : "acct-html-delta--bad"}`}>
    {value >= 0 ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
  </span>;
}

export default function FinanceHtmlReportPage() {
  const queryPeriod = new URLSearchParams(window.location.search).get("period");
  const [periodKey, setPeriodKey] = useState(
    queryPeriod && /^20\d{2}-(0[1-9]|1[0-2])$/.test(queryPeriod) ? queryPeriod : baghdadMonth(),
  );

  const report = useQuery({
    queryKey: ["accounting-html-report", periodKey],
    queryFn: async () => readJson(await fetch(
      `/api/admin/accounting/v2/accountant-package?periodKey=${encodeURIComponent(periodKey)}`,
      { credentials: "include" },
    )),
    retry: false,
  });

  useEffect(() => {
    document.title = `AQUAVO · التقرير المالي · ${periodKey}`;
    return () => { document.title = "AQUAVO"; };
  }, [periodKey]);

  const payload = report.data as Row | undefined;
  const summary = payload?.readiness ?? {};
  const previous = payload?.previousReadiness ?? null;
  const balances = safeArray(payload?.liveBalances);
  const sales = safeArray(payload?.sales);
  const expenses = safeArray(payload?.expenses);
  const returns = safeArray(payload?.returns);
  const settlements = safeArray(payload?.settlements);
  const inventory = safeArray(payload?.openingInventory);
  const journal = safeArray(payload?.journal);
  const evidence = safeArray(payload?.evidenceIndex);
  const blockers = safeArray(summary?.blockers);
  const profile = payload?.profile ?? {};
  const close = payload?.close ?? {};

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of balances) {
      const value = finite(row.balance);
      if (value != null) map.set(String(row.code), value);
    }
    return map;
  }, [balances]);

  const gross = grossProfit(summary);
  const net = canonicalNet(summary);
  const orderCount = finite(summary.realized_orders);
  const averageOrder = orderCount && orderCount > 0 && finite(summary.product_revenue) != null
    ? Number(summary.product_revenue) / orderCount
    : null;
  const grossMargin = ratio(gross, summary.product_revenue);
  const netMargin = ratio(net, summary.product_revenue);

  const settled = sales.filter((row) => ["matched", "reconciled", "closed"].includes(String(row.settlement_status ?? "").toLowerCase())).length;
  const settleRate = sales.length ? (settled / sales.length) * 100 : null;
  const webOrders = sales.filter((row) => String(row.source ?? "").toLowerCase() === "website").length;
  const whatsappOrders = sales.filter((row) => String(row.source ?? "").toLowerCase() === "whatsapp").length;
  const otherOrders = Math.max(0, sales.length - webOrders - whatsappOrders);

  const productMap = new Map<string, { label: string; revenue: number; quantity: number; orders: Set<string> }>();
  for (const order of sales) {
    for (const item of safeArray(order.items)) {
      const key = `${item.productId ?? "unknown"}::${item.variantId ?? ""}`;
      const quantity = finite(item.quantity) ?? 0;
      const unit = finite(item.priceAtPurchase);
      const line = finite(item.lineTotal) ?? (unit == null ? 0 : unit * quantity);
      const existing = productMap.get(key) ?? {
        label: String(item.productName ?? item.productId ?? "منتج غير مسمى") + (item.variantLabel ? ` — ${item.variantLabel}` : ""),
        revenue: 0,
        quantity: 0,
        orders: new Set<string>(),
      };
      existing.revenue += line;
      existing.quantity += quantity;
      existing.orders.add(String(order.order_number ?? order.order_id ?? "—"));
      productMap.set(key, existing);
    }
  }
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const maxProductRevenue = Math.max(1, ...topProducts.map((item) => item.revenue));

  const inventoryValue = inventory.reduce((sum, row) => sum + (finite(row.total_cost ?? row.total_value ?? row.inventory_value) ?? 0), 0);
  const inventoryUnits = inventory.reduce((sum, row) => sum + (finite(row.quantity ?? row.stock) ?? 0), 0);
  const unresolvedInventory = inventory.filter((row) => ["unknown", "provisional"].includes(String(row.cost_status ?? "").toLowerCase())).length;
  const inventoryDifference = balanceMap.has("1200") ? Number(balanceMap.get("1200")) - inventoryValue : null;
  const topInventory = inventory
    .map((row) => ({
      label: String(row.product_name ?? row.product_slug ?? row.product_id ?? "منتج غير مسمى"),
      value: finite(row.total_cost ?? row.total_value ?? row.inventory_value) ?? 0,
      units: finite(row.quantity ?? row.stock) ?? 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const maxInventory = Math.max(1, ...topInventory.map((item) => item.value));

  const expenseTotal = expenses.reduce((sum, row) => sum + (finite(row.amount) ?? 0), 0);
  const returnTotal = returns.reduce((sum, row) => sum + (finite(row.refund_amount) ?? 0), 0);
  const collectionNet = settlements
    .filter((row) => ["reconciled", "closed"].includes(String(row.status ?? "").toLowerCase()))
    .reduce((sum, row) => sum + (finite(row.net_amount) ?? 0), 0);

  const costSegments = [
    { label: "كلفة المنتجات", value: Math.max(0, finite(summary.cogs) ?? 0), className: "seg-1" },
    { label: "كلفة التجهيز", value: Math.max(0, finite(summary.fulfillment_cost) ?? 0), className: "seg-2" },
    { label: "دعم التوصيل", value: Math.max(0, finite(summary.delivery_subsidy) ?? 0), className: "seg-3" },
    {
      label: "راجعات ومصاريف",
      value: Math.max(0,
        (finite(summary.sales_returns) ?? 0)
        + (finite(summary.actual_return_loss) ?? 0)
        + (finite(summary.verified_expenses) ?? 0)
        + (finite(summary.fx_net_expense) ?? 0)),
      className: "seg-4",
    },
  ];

  function changePeriod(next: string) {
    if (!next) return;
    setPeriodKey(next);
    const url = new URL(window.location.href);
    url.searchParams.set("period", next);
    window.history.replaceState({}, "", url.toString());
  }

  if (report.isLoading) {
    return <div className="acct-html-loading" dir="rtl"><div className="acct-html-spinner" /><strong>جاري بناء تقرير HTML من دفتر الأستاذ…</strong></div>;
  }

  if (report.error) {
    return (
      <div className="acct-html-loading" dir="rtl">
        <div className="acct-html-error">
          <strong>تعذر فتح التقرير</strong>
          <p>{report.error instanceof Error ? report.error.message : "حدث خطأ غير متوقع"}</p>
          <button onClick={() => window.location.assign("/admin/finance")}>العودة إلى مركز المالية</button>
        </div>
      </div>
    );
  }

  const closeStatus = String(close.status ?? "").toLowerCase();
  const isCurrentOpen = periodKey === baghdadMonth() && !["closed", "tax_final"].includes(closeStatus);

  const pnlRows = [
    { label: "مبيعات المنتجات", value: iqd(summary.product_revenue), className: "" },
    { label: "فرق التقريب", value: iqd(summary.rounding_adjustment), className: "" },
    { label: "كلفة المنتجات (COGS)", value: `− ${iqd(summary.cogs)}`, className: "is-deduction" },
    { label: "الربح الإجمالي", value: iqd(gross), className: "is-subtotal" },
    { label: "كلفة التجهيز", value: `− ${iqd(summary.fulfillment_cost)}`, className: "is-deduction" },
    { label: "دعم التوصيل", value: `− ${iqd(summary.delivery_subsidy)}`, className: "is-deduction" },
    { label: "المرتجعات والخسائر", value: `− ${iqd((finite(summary.sales_returns) ?? 0) + (finite(summary.actual_return_loss) ?? 0))}`, className: "is-deduction" },
    { label: "المصاريف الموثقة", value: `− ${iqd(summary.verified_expenses)}`, className: "is-deduction" },
    { label: "صافي فرق العملة", value: `− ${iqd(summary.fx_net_expense)}`, className: "is-deduction" },
    { label: "صافي النتيجة الإدارية", value: iqd(net), className: "is-net" },
  ];

  const orderRows = sales.map((order) => ({
    order: String(order.order_number ?? order.order_id ?? "—"),
    date: dateOnly(order.recognized_at),
    customer: String(order.customer_name ?? "عميل غير مسجل"),
    source: humanStatus(order.source),
    revenue: iqd(order.product_revenue),
    cogs: iqd(order.cogs_amount),
    contribution: iqd(contribution(order)),
    settlement: humanStatus(order.settlement_status),
  }));

  const journalRows: Array<Record<string, React.ReactNode>> = [];
  for (const entry of journal) {
    const lines = safeArray(entry.lines);
    if (!lines.length) {
      journalRows.push({
        entry: String(entry.entry_number ?? "—"),
        date: dateOnly(entry.entry_date),
        source: humanStatus(entry.source_type),
        account: "قيد بلا سطور",
        memo: String(entry.description ?? "—"),
        debit: "—",
        credit: "—",
      });
      continue;
    }
    for (const line of lines) {
      journalRows.push({
        entry: String(entry.entry_number ?? "—"),
        date: dateOnly(entry.entry_date),
        source: humanStatus(entry.source_type),
        account: `${line.accountCode ?? "—"} · ${line.accountName ?? ""}`,
        memo: String(line.memo ?? entry.description ?? "—"),
        debit: iqd(line.debit),
        credit: iqd(line.credit),
      });
    }
  }

  return (
    <div className="acct-html-shell" dir="rtl">
      <aside className="acct-html-nav">
        <div className="acct-html-nav__brand">AQUAVO</div>
        <div className="acct-html-nav__caption">MANAGEMENT ACCOUNTING</div>
        <a href="#executive">الملخص التنفيذي</a>
        <a href="#profitability">قائمة النتائج</a>
        <a href="#comparison">المقارنة الشهرية</a>
        <a href="#collections">التحصيل والأرصدة</a>
        <a href="#sales">المبيعات والمنتجات</a>
        <a href="#inventory">المخزون</a>
        <a href="#close">الإقفال والمطابقة</a>
        <a href="#audit">سجل التدقيق</a>
        <a href="#methodology">المنهجية والاعتماد</a>
      </aside>

      <main className="acct-html-main">
        <div className="acct-html-toolbar no-print">
          <div>
            <button className="acct-html-btn acct-html-btn--ghost" onClick={() => window.location.assign("/admin/finance")}>العودة لمركز المالية</button>
          </div>
          <div className="acct-html-toolbar__actions">
            <input type="month" min="2026-08" max={baghdadMonth()} value={periodKey} onChange={(event) => changePeriod(event.target.value)} />
            <button className="acct-html-btn acct-html-btn--primary" onClick={() => window.print()}>طباعة / حفظ PDF</button>
          </div>
        </div>

        <header className="acct-html-cover" id="executive">
          <div className="acct-html-cover__topline">
            <div>
              <span className="acct-html-confidential">سري · للاستخدام الداخلي فقط</span>
              <div className="acct-html-cover__brand">AQUAVO</div>
              <div className="acct-html-cover__legal">محل المنبع · AL NABEA SHOP</div>
            </div>
            <div className="acct-html-cover__period">
              <span>الفترة المحاسبية</span>
              <strong>{periodLabel(periodKey)}</strong>
              <small>تولد في {dateBaghdad(payload?.manifest?.generatedAt)}</small>
            </div>
          </div>
          <div className="acct-html-cover__title">
            <div>
              <div className="acct-html-eyebrow">MONTHLY MANAGEMENT ACCOUNTING REPORT</div>
              <h1>تقرير الإدارة المالي الشهري</h1>
              <p>قراءة تنفيذية للنتيجة، الربحية، التحصيل، المخزون، وضوابط الإقفال مبنية على دفتر الأستاذ وحقائق الطلبات والتسويات.</p>
            </div>
            <div className={`acct-html-close-status ${blockers.length ? "is-warning" : "is-ok"}`}>
              <span>حالة الفترة</span>
              <strong>{payload?.manifest?.taxFinal ? "اعتماد ضريبي نهائي" : closeStatus === "closed" ? "مغلقة إدارياً" : blockers.length ? "إقفال معلّق" : "جاهزة للإقفال الإداري"}</strong>
              <small>{blockers.length ? `${numberValue(blockers.length)} نوع استثناء مفتوح` : "لا توجد موانع إغلاق مسجلة"}</small>
            </div>
          </div>
          {isCurrentOpen ? (
            <div className="acct-html-banner">
              الفترة الحالية ما زالت مفتوحة. أي مقارنة مع الشهر السابق تُقرأ كمؤشر اتجاهي وليست مقارنة نهائية بين فترتين متماثلتين.
            </div>
          ) : null}
        </header>

        <div className="acct-html-kpi-grid">
          <Kpi label="مبيعات المنتجات" value={iqd(summary.product_revenue)} note={previous ? deltaLabel(summary.product_revenue, previous.product_revenue) : undefined} />
          <Kpi label="كلفة المنتجات" value={iqd(summary.cogs)} note={`${percent(ratio(summary.cogs, summary.product_revenue))} من المبيعات`} />
          <Kpi label="الربح الإجمالي" value={iqd(gross)} note={`هامش ${percent(grossMargin)}`} tone="positive" />
          <Kpi label="صافي النتيجة الإدارية" value={iqd(net)} note={`هامش ${percent(netMargin)}`} tone="positive" />
          <Kpi label="الطلبات المتحققة" value={numberValue(summary.realized_orders)} note={`متوسط الطلب ${iqd(averageOrder)}`} />
          <Kpi label="التسوية" value={percent(settleRate)} note={`${settled} من ${sales.length} طلب`} tone={settled === sales.length ? "positive" : "warning"} />
        </div>

        <Section
          id="profitability"
          eyebrow="01 · PROFITABILITY"
          title="قائمة نتائج الإدارة وتحليل الربحية"
          subtitle="تسلسل محاسبي واضح من الإيراد إلى صافي النتيجة، مع فصل بنود التخفيض وعدم خلط الربح بالمصروفات."
        >
          <div className="acct-html-grid acct-html-grid--2">
            <div className="acct-html-card">
              <div className="acct-html-card__head"><h3>قائمة نتائج الإدارة</h3><span>IQD</span></div>
              <table className="acct-html-pnl">
                <tbody>
                  {pnlRows.map((row) => (
                    <tr key={row.label} className={row.className}>
                      <td>{row.label}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="acct-html-footnote">هذا عرض إدارة داخلي وليس مجموعة قوائم مالية مدققة وفق IFRS.</div>
            </div>
            <div className="acct-html-card">
              <div className="acct-html-card__head"><h3>جسر الربحية</h3><span>الأثر على الفترة</span></div>
              <Waterfall summary={summary} net={net} />
            </div>
          </div>

          <div className="acct-html-grid acct-html-grid--2 acct-html-mt">
            <div className="acct-html-card">
              <div className="acct-html-card__head"><h3>وزن بنود التكلفة من المبيعات</h3><span>قاعدة 100%</span></div>
              <BarRows rows={[
                { label: "كلفة المنتجات", value: Math.max(0, ratio(summary.cogs, summary.product_revenue) ?? 0), amount: iqd(summary.cogs), meta: percent(ratio(summary.cogs, summary.product_revenue)) },
                { label: "كلفة التجهيز", value: Math.max(0, ratio(summary.fulfillment_cost, summary.product_revenue) ?? 0), amount: iqd(summary.fulfillment_cost), meta: percent(ratio(summary.fulfillment_cost, summary.product_revenue)) },
                { label: "دعم التوصيل", value: Math.max(0, ratio(summary.delivery_subsidy, summary.product_revenue) ?? 0), amount: iqd(summary.delivery_subsidy), meta: percent(ratio(summary.delivery_subsidy, summary.product_revenue)) },
                { label: "الراجعات والخسائر", value: Math.max(0, ratio((finite(summary.sales_returns) ?? 0) + (finite(summary.actual_return_loss) ?? 0), summary.product_revenue) ?? 0), amount: iqd((finite(summary.sales_returns) ?? 0) + (finite(summary.actual_return_loss) ?? 0)) },
                { label: "المصاريف الموثقة", value: Math.max(0, ratio(summary.verified_expenses, summary.product_revenue) ?? 0), amount: iqd(summary.verified_expenses), meta: percent(ratio(summary.verified_expenses, summary.product_revenue)) },
              ]} />
            </div>
            <div className="acct-html-card">
              <div className="acct-html-card__head"><h3>تركيب بنود التكلفة</h3><span>لا يشمل صافي الربح</span></div>
              <Donut
                segments={costSegments}
                center={iqd(costSegments.reduce((sum, item) => sum + item.value, 0))}
                subcenter="إجمالي التكلفة"
              />
            </div>
          </div>
        </Section>

        <Section
          id="comparison"
          eyebrow="02 · PERIOD COMPARISON"
          title="هذا الشهر مقابل الشهر السابق"
          subtitle={isCurrentOpen ? "الفترة الحالية مفتوحة؛ النسب أدناه اتجاهية فقط." : "مقارنة أداء مع آخر فترة محاسبية سابقة متاحة."}
        >
          {previous ? (
            <div className="acct-html-compare-grid">
              {[
                ["مبيعات المنتجات", summary.product_revenue, previous.product_revenue, false],
                ["الطلبات", summary.realized_orders, previous.realized_orders, false],
                ["كلفة المنتجات", summary.cogs, previous.cogs, true],
                ["كلفة التجهيز", summary.fulfillment_cost, previous.fulfillment_cost, true],
                ["دعم التوصيل", summary.delivery_subsidy, previous.delivery_subsidy, true],
                ["المصاريف الموثقة", summary.verified_expenses, previous.verified_expenses, true],
              ].map(([label, current, old, invert]) => (
                <div className="acct-html-compare" key={String(label)}>
                  <span>{String(label)}</span>
                  <strong>{String(label) === "الطلبات" ? numberValue(current) : iqd(current)}</strong>
                  <small>السابق: {String(label) === "الطلبات" ? numberValue(old) : iqd(old)}</small>
                  {deltaLabel(current, old, Boolean(invert))}
                </div>
              ))}
            </div>
          ) : <div className="acct-html-empty-card">لا توجد فترة سابقة متجانسة متاحة للمقارنة.</div>}
        </Section>

        <Section
          id="collections"
          eyebrow="03 · CASH & COLLECTIONS"
          title="التحصيل والأرصدة التشغيلية"
          subtitle="فصل النقد والبنك وCOD والمخزون ورأس المال؛ لا يتم وصفها مجتمعة كسيولة."
        >
          <div className="acct-html-balance-grid">
            <Kpi label="النقد بالصندوق · 1000" value={iqd(balanceMap.get("1000"))} />
            <Kpi label="الحساب البنكي · 1010" value={iqd(balanceMap.get("1010"))} />
            <Kpi label="COD لدى شركات التوصيل · 1100" value={iqd(balanceMap.get("1100"))} note={`${percent(ratio(balanceMap.get("1100"), summary.product_revenue))} من حجم المبيعات`} />
            <Kpi label="مخزون المنتجات · 1200" value={iqd(balanceMap.get("1200"))} />
            <Kpi label="رأس المال · 3100" value={iqd(balanceMap.get("3100"))} />
            <Kpi label="صافي التحصيلات المسجلة" value={iqd(collectionNet)} note={`${settlements.length} سجل تسوية`} />
          </div>
          <div className="acct-html-grid acct-html-grid--2 acct-html-mt">
            <div className="acct-html-card">
              <div className="acct-html-card__head"><h3>مصادر الطلبات</h3><span>{sales.length} طلب</span></div>
              <Donut
                segments={[
                  { label: "الموقع", value: webOrders, className: "seg-1" },
                  { label: "واتساب", value: whatsappOrders, className: "seg-2" },
                  { label: "أخرى", value: otherOrders, className: "seg-3" },
                ]}
                center={numberValue(sales.length)}
                subcenter="طلب"
                formatter={numberValue}
              />
            </div>
            <div className="acct-html-card acct-html-note-card">
              <h3>ملاحظة محاسبية</h3>
              <p>هذا القسم لا يمثل قائمة تدفقات نقدية وفق IAS 7 لأن الحزمة الحالية لا تصنف كل حركة نقدية إلى تشغيلية واستثمارية وتمويلية. المعروض هو أرصدة دفتر الأستاذ والتحصيلات المثبتة فقط.</p>
            </div>
          </div>
        </Section>

        <Section
          id="sales"
          eyebrow="04 · SALES"
          title="المبيعات والمنتجات"
          subtitle="ترتيب المنتجات حسب الإيراد التاريخي المسجل داخل بنود الطلبات."
        >
          <div className="acct-html-card">
            <div className="acct-html-card__head"><h3>أعلى المنتجات بالإيراد</h3><span>Top 10</span></div>
            <div className="acct-html-ranking">
              {topProducts.length ? topProducts.map((product, index) => (
                <div className="acct-html-ranking__row" key={`${product.label}-${index}`}>
                  <span className="acct-html-ranking__no">{String(index + 1).padStart(2, "0")}</span>
                  <div className="acct-html-ranking__main">
                    <div><strong>{product.label}</strong><small>{numberValue(product.quantity)} وحدة · {numberValue(product.orders.size)} طلب</small></div>
                    <div className="acct-html-ranking__track"><span style={{ width: `${Math.max(2, (product.revenue / maxProductRevenue) * 100)}%` }} /></div>
                  </div>
                  <strong>{iqd(product.revenue)}</strong>
                </div>
              )) : <div className="acct-html-empty">لا توجد مبيعات قابلة للترتيب.</div>}
            </div>
          </div>
        </Section>

        <Section
          id="inventory"
          eyebrow="05 · INVENTORY CONTROL"
          title="مركز المخزون والربط مع دفتر الأستاذ"
          subtitle="مراجعة قيمة لقطة المخزون مقابل الحساب 1200 مع إبراز البنود الأعلى قيمة والكلف غير المحسومة."
        >
          <div className="acct-html-balance-grid">
            <Kpi label="قيمة لقطة المخزون" value={iqd(inventoryValue)} />
            <Kpi label="رصيد الأستاذ · 1200" value={iqd(balanceMap.get("1200"))} />
            <Kpi label="فرق المطابقة" value={iqd(inventoryDifference)} note={Math.abs(inventoryDifference ?? Infinity) < 0.5 ? "مطابق" : "يتطلب مراجعة"} tone={Math.abs(inventoryDifference ?? Infinity) < 0.5 ? "positive" : "warning"} />
            <Kpi label="إجمالي الوحدات" value={numberValue(inventoryUnits)} note={`${inventory.length} سطر مخزون`} />
            <Kpi label="كلف غير محسومة" value={numberValue(unresolvedInventory)} tone={unresolvedInventory ? "warning" : "positive"} />
            <Kpi label="أساس القياس" value="الكلفة الدفترية" note="NRV يحتاج اختباراً منفصلاً" />
          </div>
          <div className="acct-html-card acct-html-mt">
            <div className="acct-html-card__head"><h3>أعلى بنود المخزون بالقيمة الدفترية</h3><span>Top 10</span></div>
            <div className="acct-html-ranking">
              {topInventory.map((item, index) => (
                <div className="acct-html-ranking__row" key={`${item.label}-${index}`}>
                  <span className="acct-html-ranking__no">{String(index + 1).padStart(2, "0")}</span>
                  <div className="acct-html-ranking__main">
                    <div><strong>{item.label}</strong><small>{numberValue(item.units)} وحدة</small></div>
                    <div className="acct-html-ranking__track"><span style={{ width: `${Math.max(2, (item.value / maxInventory) * 100)}%` }} /></div>
                  </div>
                  <strong>{iqd(item.value)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="acct-html-note acct-html-mt">
            القيمة الظاهرة هي كلفة دفترية. اختبار صافي القيمة القابلة للتحقق وفق IAS 2 يحتاج معلومات سعر البيع وتكاليف الإتمام/البيع ولا يتم افتراضها داخل هذا التقرير.
          </div>
        </Section>

        <Section
          id="close"
          eyebrow="06 · CLOSE CONTROLS"
          title="ضوابط الإقفال والمطابقة"
          subtitle="استثناءات فعلية من جاهزية الفترة؛ لا توجد مراحل أو تواريخ افتراضية غير مدعومة بالبيانات."
        >
          <div className="acct-html-grid acct-html-grid--2">
            <div className="acct-html-card">
              <div className="acct-html-card__head"><h3>الإجراءات المفتوحة قبل الإقفال</h3><span>{blockers.length}</span></div>
              <DataTable
                columns={[
                  { key: "item", label: "الإجراء / الاستثناء" },
                  { key: "count", label: "العدد", numeric: true },
                ]}
                rows={blockers.map((row) => ({ item: String(row.label ?? humanStatus(row.key)), count: numberValue(row.count) }))}
                empty="لا توجد استثناءات مفتوحة مسجلة."
              />
            </div>
            <div className="acct-html-card acct-html-control-list">
              <div className="acct-html-card__head"><h3>اختبارات المطابقة</h3><span>Controls</span></div>
              {[
                ["ميزان اليومية", iqd(summary.journal_difference), Math.abs(finite(summary.journal_difference) ?? Infinity) < 0.5],
                ["عدد الطلبات", `${numberValue(summary.realized_orders)} / ${numberValue(sales.length)}`, finite(summary.realized_orders) === sales.length],
                ["المخزون مع الأستاذ", iqd(inventoryDifference), Math.abs(inventoryDifference ?? Infinity) < 0.5],
                ["موانع الإقفال", numberValue(blockers.length), blockers.length === 0],
              ].map(([label, value, ok]) => (
                <div className="acct-html-control" key={String(label)}>
                  <div><strong>{String(label)}</strong><span>{String(value)}</span></div>
                  <b className={ok ? "is-ok" : "is-review"}>{ok ? "مطابق" : "مراجعة"}</b>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="audit"
          eyebrow="07 · AUDIT TRAIL"
          title="سجل التدقيق والتفاصيل"
          subtitle="تفاصيل المصدر تبقى قابلة للتتبع؛ الجداول التالية هي طبقة المراجعة وليست الملخص التنفيذي."
        >
          <div className="acct-html-audit-block">
            <h3>الطلبات المتحققة</h3>
            <DataTable
              columns={[
                { key: "order", label: "الطلب" },
                { key: "date", label: "التاريخ" },
                { key: "customer", label: "الزبون" },
                { key: "source", label: "المصدر" },
                { key: "revenue", label: "المبيعات", numeric: true },
                { key: "cogs", label: "COGS", numeric: true },
                { key: "contribution", label: "المساهمة", numeric: true },
                { key: "settlement", label: "التسوية" },
              ]}
              rows={orderRows}
            />
          </div>

          <div className="acct-html-audit-block">
            <h3>المصاريف · الإجمالي {iqd(expenseTotal)}</h3>
            <DataTable
              columns={[
                { key: "date", label: "التاريخ" },
                { key: "category", label: "الفئة" },
                { key: "vendor", label: "الجهة" },
                { key: "description", label: "الوصف" },
                { key: "amount", label: "المبلغ", numeric: true },
                { key: "status", label: "الحالة" },
              ]}
              rows={expenses.map((row) => ({
                date: dateOnly(row.expense_occurred_at ?? row.expense_date),
                category: humanStatus(row.category),
                vendor: String(row.vendor_name ?? "—"),
                description: String(row.description ?? "—"),
                amount: iqd(row.amount),
                status: humanStatus(row.accounting_status),
              }))}
            />
          </div>

          <div className="acct-html-audit-block">
            <h3>الراجعات · ردود المبالغ {iqd(returnTotal)}</h3>
            <DataTable
              columns={[
                { key: "order", label: "الطلب" },
                { key: "type", label: "النوع" },
                { key: "status", label: "الحالة" },
                { key: "refund", label: "رد المبلغ", numeric: true },
                { key: "packaging", label: "خسارة التغليف", numeric: true },
                { key: "writeoff", label: "شطب المنتج", numeric: true },
                { key: "restocked", label: "إعادة مخزون" },
              ]}
              rows={returns.map((row) => ({
                order: String(row.order_id ?? "—"),
                type: humanStatus(row.type),
                status: humanStatus(row.status),
                refund: iqd(row.refund_amount),
                packaging: iqd(row.packaging_loss),
                writeoff: iqd(row.product_write_off_amount),
                restocked: row.restocked ? "نعم" : "لا",
              }))}
            />
          </div>

          <div className="acct-html-audit-block">
            <h3>تسويات شركات التوصيل</h3>
            <DataTable
              columns={[
                { key: "settlement", label: "التسوية" },
                { key: "carrier", label: "الشركة" },
                { key: "date", label: "التاريخ" },
                { key: "gross", label: "الإجمالي", numeric: true },
                { key: "fees", label: "الأجور", numeric: true },
                { key: "net", label: "الصافي", numeric: true },
                { key: "status", label: "الحالة" },
              ]}
              rows={settlements.map((row) => ({
                settlement: String(row.settlement_number ?? row.id ?? "—"),
                carrier: String(row.carrier ?? "—"),
                date: dateOnly(row.received_at ?? row.updated_at),
                gross: iqd(row.gross_amount),
                fees: iqd(row.fees_amount),
                net: iqd(row.net_amount),
                status: humanStatus(row.status),
              }))}
            />
          </div>

          <div className="acct-html-audit-block">
            <h3>دفتر اليومية — القيود والحسابات</h3>
            <DataTable
              columns={[
                { key: "entry", label: "القيد" },
                { key: "date", label: "التاريخ" },
                { key: "source", label: "المصدر" },
                { key: "account", label: "الحساب" },
                { key: "memo", label: "البيان" },
                { key: "debit", label: "مدين", numeric: true },
                { key: "credit", label: "دائن", numeric: true },
              ]}
              rows={journalRows}
            />
          </div>

          <div className="acct-html-audit-block">
            <h3>المخزون الافتتاحي</h3>
            <DataTable
              columns={[
                { key: "product", label: "المنتج" },
                { key: "variant", label: "المتغير" },
                { key: "qty", label: "الكمية", numeric: true },
                { key: "unit", label: "كلفة الوحدة", numeric: true },
                { key: "value", label: "القيمة", numeric: true },
                { key: "status", label: "مصدر/حالة الكلفة" },
              ]}
              rows={inventory.map((row) => ({
                product: String(row.product_name ?? row.product_slug ?? row.product_id ?? "—"),
                variant: String(row.variant_id ?? "—"),
                qty: numberValue(row.quantity ?? row.stock),
                unit: iqd(row.unit_cost ?? row.cost_price),
                value: iqd(row.total_cost ?? row.total_value ?? row.inventory_value),
                status: humanStatus(row.cost_status ?? row.cost_source),
              }))}
            />
          </div>

          <div className="acct-html-audit-block">
            <h3>فهرس المستندات والأدلة</h3>
            <DataTable
              columns={[
                { key: "type", label: "النوع" },
                { key: "issuer", label: "الجهة" },
                { key: "number", label: "رقم المستند" },
                { key: "date", label: "التاريخ" },
                { key: "amount", label: "المبلغ", numeric: true },
                { key: "source", label: "المصدر" },
              ]}
              rows={evidence.map((row) => ({
                type: humanStatus(row.document_type),
                issuer: String(row.issuer ?? "—"),
                number: String(row.document_number ?? "—"),
                date: String(row.document_date ?? "—"),
                amount: iqd(row.amount),
                source: humanStatus(row.storage_provider),
              }))}
            />
          </div>
        </Section>

        <Section
          id="methodology"
          eyebrow="08 · BASIS OF PREPARATION"
          title="أساس الإعداد، الاعتماد، وحدود التقرير"
          subtitle="الحقول غير المسجلة تبقى غير مسجلة؛ لا يتم اختراع رقم مكلف أو اعتماد محاسب."
        >
          <div className="acct-html-profile-grid">
            {[
              ["حالة الملف", profile.status],
              ["رقم المكلف", profile.taxpayer_number],
              ["الفرع الضريبي", profile.tax_branch],
              ["العنوان المسجل", profile.registered_address],
              ["إجازة المحاسب", profile.accountant_license_number],
              ["حالة التقرير", payload?.manifest?.taxFinal ? "اعتماد ضريبي نهائي" : "إدارة ومراجعة داخلية"],
            ].map(([label, value]) => (
              <div className="acct-html-profile" key={String(label)}>
                <span>{String(label)}</span>
                <strong>{value == null || String(value).trim() === "" ? "غير مسجل في النظام" : humanStatus(value)}</strong>
              </div>
            ))}
          </div>
          <div className="acct-html-methodology">
            <div><strong>الطلبات المتحققة</strong><p>طلبات دخلت المحاسبة عند تحقق الاعتراف بالإيراد، وليس كل طلب منشأ على الموقع.</p></div>
            <div><strong>مبيعات المنتجات</strong><p>إيراد المنتجات منفصل عن أجور التوصيل.</p></div>
            <div><strong>كلفة المنتجات COGS</strong><p>كلفة البضاعة المرتبطة بالمبيعات وفق لقطة الكلفة المحاسبية ودفتر الأستاذ.</p></div>
            <div><strong>COD لدى شركات التوصيل</strong><p>رصيد دفتر أستاذ للمبالغ التي ما زالت بعهدة شركات التوصيل.</p></div>
            <div><strong>صافي النتيجة الإدارية</strong><p>مقياس إدارة داخلي حسب المعادلة الظاهرة في التقرير؛ ليس تسمية IFRS مستقلة.</p></div>
            <div><strong>حدود التقرير</strong><p>هذا تقرير إدارة داخلي غير مدقق. لا يمثل مجموعة قوائم مالية مكتملة وفق IFRS، ولا قائمة تدفقات نقدية وفق IAS 7، ولا يثبت بمفرده اختبار IAS 2 لصافي القيمة القابلة للتحقق للمخزون.</p></div>
          </div>
        </Section>

        <footer className="acct-html-footer">
          <div>AQUAVO · تقرير إدارة مالي داخلي · {periodKey}</div>
          <div>سري — للاستخدام الداخلي فقط</div>
        </footer>
      </main>
    </div>
  );
}
