import type { ZodType } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  accountingReportSchema,
  EXPENSE_CATEGORY_LABELS,
  type AccountingReport,
  type AccountingPeriod,
} from "@shared/accounting";

type Period = Extract<AccountingPeriod, "day" | "week" | "month" | "year">;

const PERIOD_LABELS: Record<Period, string> = {
  day: "اليوم",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
  year: "هذا العام",
};

const RETURN_TYPE_LABELS: Record<string, string> = {
  rejected_delivery: "رفض عند التسليم",
  failed_delivery: "فشل التسليم",
  customer_return: "إرجاع الزبون",
  cancelled_before_shipping: "إلغاء قبل الشحن",
  cancelled_after_shipping: "إلغاء بعد الشحن",
  damaged_return: "راجع تالف",
  partial_return: "إرجاع جزئي",
  lost_package: "طرد ضائع",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

const pct = (n: number) => `${n}%`;

async function fetchAccounting<T>(url: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
  return schema.parse(json.data);
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "خطأ غير معروف";
}

function Card({
  label,
  value,
  sub,
  color = "#199bb8",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{ background: "#0d1f3c", border: "1px solid #199bb820", borderRadius: 12, padding: "14px 18px" }}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div style={{ color: "#199bb8", fontSize: 13, fontWeight: 700, marginBottom: 10, marginTop: 24 }}>
      {title}
    </div>
  );
}

function Warning({ message }: { message: string }) {
  return (
    <div style={{
      background: "#1a1500",
      border: "1px solid #f59e0b40",
      color: "#fcd34d",
      padding: "10px 16px",
      borderRadius: 8,
      fontSize: 12,
      marginBottom: 8,
    }}>
      {message}
    </div>
  );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        {children}
      </table>
    </div>
  );
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #1e3a5f", whiteSpace: "nowrap" }}>
    {children}
  </th>
);

const TD = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <td style={{ padding: "8px 12px", color: color ?? "#cbd5e1", borderBottom: "1px solid #0d1f3c", whiteSpace: "nowrap" }}>
    {children}
  </td>
);

function exportCSV(report: AccountingReport, period: Period) {
  const s = report.summary;
  const rows: (string | number)[][] = [
    ["تقرير مالي AQUAVO", PERIOD_LABELS[period]],
    ["تاريخ الإنشاء", report.generatedAt],
    [],
    ["الإيرادات", s.revenue],
    ["كلفة البضاعة", s.totalCogs],
    ["التغليف", s.totalPackaging],
    ["الربح الإجمالي", s.grossProfit],
    ["هامش الربح الإجمالي", pct(s.grossMargin)],
    ["خصم تسوية راجعات (عكس إيراد)", s.salesReturnDeduction],
    ["خسائر راجعات فعلية (تشغيلية)", s.actualReturnLoss],
    ["الربح بعد الراجعات", s.netProfitAfterReturns],
    ["المصاريف", s.expensesTotal],
    ["صافي الربح النهائي", s.finalNetProfit],
    ["الهامش النهائي", pct(s.marginAfterExpenses)],
    ["طلبات موصّلة", s.deliveredOrders],
    ["وحدات مباعة", s.unitsSold],
    ["متوسط قيمة الطلب", s.averageOrderValue],
    [],
    ["أفضل المنتجات ربحاً — المنتج", "الإيراد", "الربح الإجمالي", "هامش الربح"],
    ...report.topProducts.topByGrossProfit.map((p) => [p.name, p.revenue, p.grossProfit, pct(p.grossMargin)]),
    [],
    ["المصاريف — الفئة", "المبلغ"],
    ...report.expenses.byCategory.map((e) => [e.category, e.total]),
  ];
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aquavo-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FinanceReport({ period }: { period: Period }) {
  const { data: report, isLoading, error } = useQuery<AccountingReport>({
    queryKey: ["accounting-report", period],
    queryFn: () =>
      fetchAccounting(`/api/admin/accounting/report?period=${period}`, accountingReportSchema),
  });

  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ background: "#0d1f3c", borderRadius: 12, height: 72, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#1a0d0d", border: "1px solid #ef444440", color: "#fca5a5", padding: "10px 16px", borderRadius: 8, fontSize: 12 }}>
        {errMsg(error)}
      </div>
    );
  }

  if (!report) return null;

  const s = report.summary;
  const profitColor = (n: number) => n > 0 ? "#22c55e" : n < 0 ? "#ef4444" : "#64748b";
  const marginColor = (n: number) => n >= 20 ? "#22c55e" : n > 0 ? "#f59e0b" : "#ef4444";

  return (
    <div dir="rtl">
      {/* A) Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>تقرير مالي — {PERIOD_LABELS[period]}</div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
            الأرقام تعتمد على الطلبات المسلّمة والراجعات المعتمدة فقط
          </div>
          <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>
            تم الإنشاء: {new Date(report.generatedAt).toLocaleString("ar-IQ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => exportCSV(report, period)}
            style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", color: "#94a3b8", padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
          >
            تصدير CSV
          </button>
          <button
            onClick={() => window.print()}
            style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", color: "#94a3b8", padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
          >
            طباعة
          </button>
        </div>
      </div>

      {/* G) Warnings */}
      {report.notes.map((n, i) => (
        <Warning key={i} message={n.message} />
      ))}

      {/* B) KPI Cards */}
      <SectionTitle title="ملخص الفترة" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Card label="الإيرادات" value={fmt(s.revenue)} />
        <Card label="الربح الإجمالي" value={fmt(s.grossProfit)} sub={pct(s.grossMargin)} />
        <Card label="الربح قبل الراجعات" value={s.costsComplete ? fmt(s.netProfitBeforeReturns) : "غير مكتمل"} color={s.costsComplete ? "#199bb8" : "#94a3b8"} />
        <Card label="خصم تسوية راجعات" value={fmt(s.salesReturnDeduction)} color={s.salesReturnDeduction > 0 ? "#f97316" : "#64748b"} sub="عكس إيراد — ليس خسارة منتج" />
        <Card label="خسائر راجعات فعلية" value={fmt(s.actualReturnLoss)} color={s.actualReturnLoss > 0 ? "#ef4444" : "#64748b"} sub={`${s.nonSellableReturnedCount} غير قابل للبيع`} />
        <Card label="الربح بعد الراجعات" value={s.costsComplete ? fmt(s.netProfitAfterReturns) : "غير مكتمل"} color={s.costsComplete ? profitColor(s.netProfitAfterReturns) : "#94a3b8"} sub={s.costsComplete ? pct(s.marginAfterReturns) : undefined} />
        <Card label="المصاريف" value={fmt(s.expensesTotal)} color={s.expensesTotal > 0 ? "#f97316" : "#64748b"} />
        <Card label="صافي الربح النهائي" value={s.costsComplete ? fmt(s.finalNetProfit) : "غير مكتمل"} color={s.costsComplete ? profitColor(s.finalNetProfit) : "#94a3b8"} sub={s.costsComplete ? pct(s.marginAfterExpenses) : undefined} />
        <Card label="الهامش النهائي" value={s.costsComplete ? pct(s.marginAfterExpenses) : "غير مكتمل"} color={s.costsComplete ? marginColor(s.marginAfterExpenses) : "#94a3b8"} sub={`${s.deliveredOrders} طلبية موصّلة`} />
      </div>

      {/* C) Profit Bridge */}
      <SectionTitle title="جسر الربح" />
      <div style={{ background: "#0d1f3c", border: "1px solid #199bb820", borderRadius: 12, padding: "16px 20px", marginBottom: 20, maxWidth: 480 }}>
        {[
          { label: "الإيرادات", value: s.revenue, type: "total", color: "#199bb8" },
          { label: "كلفة البضاعة", value: -s.totalCogs, type: "sub", color: "#ef4444" },
          { label: "التغليف والكارتون", value: -s.totalPackaging, type: "sub", color: "#ef4444" },
          { label: "= الربح الإجمالي", value: s.grossProfit, type: "result", color: profitColor(s.grossProfit), badge: pct(s.grossMargin) },
          { label: "خصم تسوية راجعات (عكس إيراد)", value: -s.salesReturnDeduction, type: "sub", color: s.salesReturnDeduction > 0 ? "#f97316" : "#64748b" },
          { label: "خسائر راجعات فعلية (تشغيلية + غير قابلة للبيع)", value: -s.actualReturnLoss, type: "sub", color: s.actualReturnLoss > 0 ? "#ef4444" : "#64748b" },
          { label: "= الربح بعد الراجعات", value: s.netProfitAfterReturns, type: "result", color: profitColor(s.netProfitAfterReturns), badge: s.costsComplete ? pct(s.marginAfterReturns) : undefined },
          { label: "المصاريف", value: -s.expensesTotal, type: "sub", color: s.expensesTotal > 0 ? "#f97316" : "#64748b" },
          { label: "= صافي الربح النهائي", value: s.finalNetProfit, type: "result", color: profitColor(s.finalNetProfit), badge: s.costsComplete ? pct(s.marginAfterExpenses) : undefined },
        ].map((row, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "7px 0",
            borderBottom: row.type === "result" ? "1px solid #1e3a5f" : undefined,
            paddingRight: row.type === "sub" ? 16 : 0,
          }}>
            <span style={{ color: row.type === "result" ? "#e2e8f0" : "#94a3b8", fontSize: row.type === "result" ? 13 : 12, fontWeight: row.type === "result" ? 700 : 400 }}>
              {row.label}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {row.badge && (
                <span style={{ background: "#199bb820", color: "#199bb8", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}>{row.badge}</span>
              )}
              <span style={{ color: row.color, fontWeight: row.type === "result" ? 700 : 400, fontSize: row.type === "result" ? 14 : 12 }}>
                {(!s.costsComplete && row.type === "result" && row.label !== "الإيرادات") ? "غير مكتمل" : fmt(row.value)}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* D) Top Products */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Top by gross profit */}
        <div>
          <SectionTitle title="أفضل المنتجات ربحاً" />
          <div style={{ background: "#0d1f3c", border: "1px solid #199bb820", borderRadius: 12, overflow: "hidden" }}>
            <TableWrapper>
              <thead>
                <tr>
                  <TH>المنتج</TH>
                  <TH>مبيع</TH>
                  <TH>ربح خام</TH>
                  <TH>هامش</TH>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.topByGrossProfit.length === 0 ? (
                  <tr><TD><span style={{ color: "#475569" }}>لا مبيعات</span></TD><TD>—</TD><TD>—</TD><TD>—</TD></tr>
                ) : report.topProducts.topByGrossProfit.map((p) => (
                  <tr key={p.productId}>
                    <TD><span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{p.name}</span></TD>
                    <TD>{p.unitsSold}</TD>
                    <TD color="#22c55e">{fmt(p.grossProfit)}</TD>
                    <TD color={marginColor(p.grossMargin)}>{pct(p.grossMargin)}</TD>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          </div>
        </div>

        {/* Weak margin */}
        <div>
          <SectionTitle title="أضعف المنتجات هامشاً" />
          <div style={{ background: "#0d1f3c", border: "1px solid #199bb820", borderRadius: 12, overflow: "hidden" }}>
            <TableWrapper>
              <thead>
                <tr>
                  <TH>المنتج</TH>
                  <TH>مبيع</TH>
                  <TH>إيراد</TH>
                  <TH>هامش</TH>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.weakMarginProducts.length === 0 ? (
                  <tr><TD><span style={{ color: "#22c55e" }}>جميع الهوامش مقبولة</span></TD><TD>—</TD><TD>—</TD><TD>—</TD></tr>
                ) : report.topProducts.weakMarginProducts.map((p) => (
                  <tr key={p.productId}>
                    <TD><span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{p.name}</span></TD>
                    <TD>{p.unitsSold}</TD>
                    <TD>{fmt(p.revenue)}</TD>
                    <TD color="#ef4444">{pct(p.grossMargin)}</TD>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Returned products */}
        <div>
          <SectionTitle title="المنتجات اللي عليها راجع" />
          <div style={{ background: "#0d1f3c", border: "1px solid #199bb820", borderRadius: 12, overflow: "hidden" }}>
            <TableWrapper>
              <thead>
                <tr>
                  <TH>المنتج</TH>
                  <TH>كمية راجعة</TH>
                  <TH>خسارة الراجع</TH>
                  <TH>معدل الراجع</TH>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.returnedProducts.length === 0 ? (
                  <tr><TD><span style={{ color: "#22c55e" }}>لا راجعات معتمدة</span></TD><TD>—</TD><TD>—</TD><TD>—</TD></tr>
                ) : report.topProducts.returnedProducts.map((p) => (
                  <tr key={p.productId}>
                    <TD><span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{p.name}</span></TD>
                    <TD color="#f97316">{p.returnedQty}</TD>
                    <TD color="#ef4444">{fmt(p.returnFinancialImpact)}</TD>
                    <TD color={p.returnRate > 30 ? "#ef4444" : "#f59e0b"}>{pct(p.returnRate)}</TD>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          </div>
        </div>

        {/* Low stock */}
        <div>
          <SectionTitle title="منتجات مخزونها قليل أو نفد" />
          <div style={{ background: "#0d1f3c", border: "1px solid #199bb820", borderRadius: 12, overflow: "hidden" }}>
            <TableWrapper>
              <thead>
                <tr>
                  <TH>المنتج</TH>
                  <TH>المخزون</TH>
                  <TH>السعر</TH>
                  <TH>الحالة</TH>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.lowStockProducts.length === 0 ? (
                  <tr><TD><span style={{ color: "#22c55e" }}>المخزون مناسب</span></TD><TD>—</TD><TD>—</TD><TD>—</TD></tr>
                ) : report.topProducts.lowStockProducts.map((p) => (
                  <tr key={p.productId}>
                    <TD><span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{p.name}</span></TD>
                    <TD color={p.stock === 0 ? "#ef4444" : "#f97316"}>{p.stock}</TD>
                    <TD>{fmt(p.salePrice)}</TD>
                    <TD color={p.stock === 0 ? "#ef4444" : "#f59e0b"}>{p.status}</TD>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          </div>
        </div>
      </div>

      {/* E) Expense Breakdown */}
      <SectionTitle title="تفصيل المصاريف" />
      <div style={{ background: "#0d1f3c", border: "1px solid #199bb820", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        {report.expenses.byCategory.length === 0 ? (
          <div style={{ color: "#475569", fontSize: 12, padding: "16px 20px" }}>لا مصاريف مسجّلة لهذه الفترة</div>
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <TH>الفئة</TH>
                <TH>المبلغ</TH>
                <TH>النسبة من الإيراد</TH>
              </tr>
            </thead>
            <tbody>
              {report.expenses.byCategory.map((e) => (
                <tr key={e.category}>
                  <TD>{EXPENSE_CATEGORY_LABELS[e.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? e.category}</TD>
                  <TD color="#f97316">{fmt(e.total)}</TD>
                  <TD color="#64748b">{s.revenue > 0 ? pct(Math.round((e.total / s.revenue) * 100)) : "—"}</TD>
                </tr>
              ))}
              <tr>
                <td style={{ padding: "8px 12px", color: "#e2e8f0", fontWeight: 700, borderTop: "1px solid #1e3a5f" }}>الإجمالي</td>
                <td style={{ padding: "8px 12px", color: "#f97316", fontWeight: 700, borderTop: "1px solid #1e3a5f" }}>{fmt(report.expenses.total)}</td>
                <td style={{ padding: "8px 12px", color: "#64748b", borderTop: "1px solid #1e3a5f" }}>{s.revenue > 0 ? pct(Math.round((report.expenses.total / s.revenue) * 100)) : "—"}</td>
              </tr>
            </tbody>
          </TableWrapper>
        )}
      </div>

      {/* F) Returns Breakdown */}
      <SectionTitle title="تفصيل الراجعات المعتمدة" />
      <div style={{ background: "#0d1f3c", border: "1px solid #199bb820", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        {report.returns.events.length === 0 ? (
          <div style={{ color: "#475569", fontSize: 12, padding: "16px 20px" }}>لا راجعات معتمدة لهذه الفترة</div>
        ) : (
          <TableWrapper>
            <thead>
              <tr>
                <TH>رقم الطلب</TH>
                <TH>نوع الراجع</TH>
                <TH>قابل للبيع</TH>
                <TH>خصم تسوية COD</TH>
                <TH>خسارة فعلية</TH>
                <TH>السبب</TH>
                <TH>الحالة</TH>
                <TH>التاريخ</TH>
              </tr>
            </thead>
            <tbody>
              {report.returns.events.map((e) => (
                <tr key={e.id}>
                  <TD color="#199bb8">{e.orderNumber ?? e.orderId.slice(0, 8) + "…"}</TD>
                  <TD>{RETURN_TYPE_LABELS[e.type] ?? e.type}</TD>
                  <TD color={e.restocked ? "#22c55e" : "#f59e0b"}>{e.restocked ? "نعم" : "لا"}</TD>
                  <TD color="#f97316">{e.settlementDeduction > 0 ? fmt(e.settlementDeduction) : "—"}</TD>
                  <TD color={e.actualReturnLoss > 0 ? "#ef4444" : "#64748b"}>{e.actualReturnLoss > 0 ? fmt(e.actualReturnLoss) : "—"}</TD>
                  <TD color="#94a3b8">{e.reason ?? e.note ?? "—"}</TD>
                  <TD color="#22c55e">{e.status === "verified" ? "معتمد" : e.status}</TD>
                  <TD color="#475569">{new Date(e.createdAt).toLocaleDateString("ar-IQ")}</TD>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </div>

      {/* Inventory snapshot */}
      <SectionTitle title="لقطة المخزون" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Card label="قيمة المخزون (بالكلفة)" value={fmt(report.inventory.inventoryValueAtCost)} />
        <Card label="إيراد محتمل من المخزون" value={fmt(report.inventory.potentialRevenueFromStock)} />
        <Card label="ربح محتمل من المخزون" value={fmt(report.inventory.potentialGrossProfitFromStock)} color="#22c55e" />
        <Card label="منتجات مخزون منخفض" value={String(report.inventory.lowStockCount)} color={report.inventory.lowStockCount > 0 ? "#f97316" : "#199bb8"} />
        <Card label="منتجات نفد مخزونها" value={String(report.inventory.outOfStockCount)} color={report.inventory.outOfStockCount > 0 ? "#ef4444" : "#199bb8"} />
        <Card label="منتجات قريباً" value={String(report.inventory.comingSoonCount)} color="#64748b" />
      </div>
    </div>
  );
}
