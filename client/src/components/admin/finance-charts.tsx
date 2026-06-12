import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";

interface TimeseriesPoint {
  date: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

interface TimeseriesResponse {
  granularity: "day" | "month";
  series: TimeseriesPoint[];
}

interface ReportResponse {
  summary: {
    revenue: number;
    grossProfit: number;
    expensesTotal: number;
    finalNetProfit: number;
    grossMargin: number;
    marginAfterExpenses: number;
    deliveredOrders: number;
    averageOrderValue: number;
  };
  expenses: { total: number; byCategory: { category: string; total: number }[] };
  topProducts: {
    topByGrossProfit: { productId: string; name: string; grossProfit: number; revenue: number }[];
  };
}

// ── Labels & colors ──────────────────────────────────────────────────────────

const EXPENSE_LABELS: Record<string, string> = {
  rent: "إيجار",
  salary: "رواتب",
  marketing: "تسويق",
  shipping_cost: "شحن",
  utilities: "خدمات",
  other: "أخرى",
};

const PIE_COLORS = ["#199bb8", "#f59e0b", "#22c55e", "#a855f7", "#ef4444", "#64748b"];

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

function shortDate(d: string): string {
  // "YYYY-MM-DD" → "MM-DD" | "YYYY-MM" → "YYYY-MM"
  const parts = d.split("-");
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : d;
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "خطأ غير معروف";
}

// ── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#0d1f3c",
  border: "1px solid #199bb820",
  borderRadius: 12,
  padding: 18,
};

const sectionTitle: React.CSSProperties = {
  color: "#199bb8",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 14,
};

const axisStyle = { fill: "#64748b", fontSize: 11 };

function tooltipStyle() {
  return {
    contentStyle: {
      background: "#010611",
      border: "1px solid #1e3a5f",
      borderRadius: 8,
      fontSize: 12,
    } as React.CSSProperties,
    labelStyle: { color: "#94a3b8" } as React.CSSProperties,
    itemStyle: { color: "#e2e8f0" } as React.CSSProperties,
  };
}

// ── KPI card with delta ──────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={card}>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{fmt(value)}</div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function FinanceCharts({ period }: { period: Period }) {
  const tsQuery = useQuery<TimeseriesResponse>({
    queryKey: ["finance-timeseries", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/accounting/report-timeseries?period=${period}`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json.data as TimeseriesResponse;
    },
    staleTime: 60_000,
  });

  const reportQuery = useQuery<ReportResponse>({
    queryKey: ["finance-report-charts", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/accounting/report?period=${period}`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json.data as ReportResponse;
    },
    staleTime: 60_000,
  });

  const series = (tsQuery.data?.series ?? []).map((p) => ({ ...p, label: shortDate(p.date) }));
  const report = reportQuery.data;

  const expenseData = (report?.expenses.byCategory ?? []).map((e) => ({
    name: EXPENSE_LABELS[e.category] ?? e.category,
    value: e.total,
  }));

  const topProducts = (report?.topProducts.topByGrossProfit ?? []).map((p) => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name,
    grossProfit: p.grossProfit,
  }));

  const tt = tooltipStyle();
  const isLoading = tsQuery.isLoading || reportQuery.isLoading;
  const error = tsQuery.error || reportQuery.error;

  if (error) {
    return <div dir="rtl" style={{ color: "#ef4444", fontSize: 13, padding: 20 }}>{errMsg(error)}</div>;
  }

  return (
    <div dir="rtl">
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        <KpiCard label="الإيراد" value={report?.summary.revenue ?? 0} color="#22c55e" />
        <KpiCard label="الربح الإجمالي" value={report?.summary.grossProfit ?? 0} color="#199bb8" />
        <KpiCard label="المصاريف" value={report?.summary.expensesTotal ?? 0} color="#f59e0b" />
        <KpiCard
          label="صافي الربح النهائي"
          value={report?.summary.finalNetProfit ?? 0}
          color={(report?.summary.finalNetProfit ?? 0) >= 0 ? "#22c55e" : "#ef4444"}
        />
      </div>

      {isLoading && (
        <div style={{ color: "#64748b", fontSize: 13, padding: "10px 0 18px" }}>جاري تحميل الرسوم...</div>
      )}

      {/* Revenue & net profit trend */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={sectionTitle}>الإيراد وصافي الربح عبر الزمن</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#199bb8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#199bb8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis dataKey="label" tick={axisStyle} stroke="#1e3a5f" />
            <YAxis tickFormatter={fmtCompact} tick={axisStyle} stroke="#1e3a5f" width={48} />
            <Tooltip {...tt} formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="#22c55e" fill="url(#gRev)" strokeWidth={2} />
            <Area type="monotone" dataKey="netProfit" name="صافي الربح" stroke="#199bb8" fill="url(#gNet)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column: expenses donut + top products bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={sectionTitle}>المصاريف حسب الفئة</div>
          {expenseData.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 12, padding: "40px 0", textAlign: "center" }}>لا مصاريف مسجّلة لهذه الفترة</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {expenseData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#0d1f3c" />
                  ))}
                </Pie>
                <Tooltip {...tt} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <div style={sectionTitle}>أعلى المنتجات ربحاً</div>
          {topProducts.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 12, padding: "40px 0", textAlign: "center" }}>لا بيانات منتجات لهذه الفترة</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtCompact} tick={axisStyle} stroke="#1e3a5f" />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="#1e3a5f" width={120} />
                <Tooltip {...tt} formatter={(v: number) => fmt(v)} cursor={{ fill: "#199bb810" }} />
                <Bar dataKey="grossProfit" name="ربح إجمالي" fill="#199bb8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue vs COGS vs Expenses composition */}
      <div style={card}>
        <div style={sectionTitle}>تركيبة الإيراد: كلفة البضاعة + المصاريف + صافي الربح</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis dataKey="label" tick={axisStyle} stroke="#1e3a5f" />
            <YAxis tickFormatter={fmtCompact} tick={axisStyle} stroke="#1e3a5f" width={48} />
            <Tooltip {...tt} formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="cogs" name="كلفة البضاعة" stackId="a" fill="#ef4444" />
            <Bar dataKey="expenses" name="مصاريف" stackId="a" fill="#f59e0b" />
            <Bar dataKey="netProfit" name="صافي الربح" stackId="a" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
