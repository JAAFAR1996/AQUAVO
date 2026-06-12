import { useQuery } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";
type AccountType = "asset" | "liability" | "revenue" | "expense" | "contra_revenue";

interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerResponse {
  trialBalance: TrialBalanceRow[];
  totals: { totalDebit: number; totalCredit: number; difference: number; balanced: boolean };
  incomeStatement: {
    revenue: number;
    salesReturns: number;
    netRevenue: number;
    cogs: number;
    grossProfit: number;
    packaging: number;
    returnsLoss: number;
    operatingExpenses: number;
    netIncome: number;
  };
  integrity: { ledgerNetIncome: number; computedFinalNetProfit: number; difference: number; matches: boolean };
  counts: { orders: number; expenses: number; returns: number; journalEntries: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "خطأ غير معروف";
}

const TYPE_LABELS: Record<AccountType, string> = {
  asset: "أصول",
  liability: "التزامات",
  revenue: "إيرادات",
  expense: "مصاريف",
  contra_revenue: "مردودات",
};

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  card: { background: "#0d1f3c", border: "1px solid #199bb820", borderRadius: 12, padding: 18, marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { color: "#199bb8", fontSize: 13, fontWeight: 700, marginBottom: 12 } as React.CSSProperties,
  th: { color: "#94a3b8", fontSize: 11, fontWeight: 600, padding: "8px 10px", borderBottom: "1px solid #1e3a5f", textAlign: "right" as const, whiteSpace: "nowrap" as const } as React.CSSProperties,
  thNum: { color: "#94a3b8", fontSize: 11, fontWeight: 600, padding: "8px 10px", borderBottom: "1px solid #1e3a5f", textAlign: "left" as const, whiteSpace: "nowrap" as const } as React.CSSProperties,
  td: { padding: "9px 10px", fontSize: 12, color: "#e2e8f0", borderBottom: "1px solid #0d1f3c" } as React.CSSProperties,
  tdNum: { padding: "9px 10px", fontSize: 12, color: "#e2e8f0", borderBottom: "1px solid #0d1f3c", textAlign: "left" as const, fontVariantNumeric: "tabular-nums" as const } as React.CSSProperties,
  plRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #0d1f3c", fontSize: 13 } as React.CSSProperties,
};

function PLRow({ label, value, strong, color }: { label: string; value: number; strong?: boolean; color?: string }) {
  return (
    <div style={{ ...S.plRow, fontWeight: strong ? 700 : 400 }}>
      <span style={{ color: strong ? "#e2e8f0" : "#94a3b8" }}>{label}</span>
      <span style={{ color: color ?? (value < 0 ? "#ef4444" : "#e2e8f0"), fontVariantNumeric: "tabular-nums" }}>{fmt(value)}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function FinanceLedger({ period }: { period: Period }) {
  const { data, isLoading, error } = useQuery<LedgerResponse>({
    queryKey: ["finance-ledger", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/accounting/ledger?period=${period}`, { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json.data as LedgerResponse;
    },
    staleTime: 60_000,
  });

  if (error) return <div dir="rtl" style={{ color: "#ef4444", fontSize: 13, padding: 20 }}>{errMsg(error)}</div>;
  if (isLoading || !data) return <div dir="rtl" style={{ color: "#64748b", fontSize: 13, padding: 20 }}>جاري تحميل الدفتر...</div>;

  const { trialBalance, totals, incomeStatement: pl, integrity, counts } = data;

  return (
    <div dir="rtl">
      {/* Integrity badges */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ ...S.card, marginBottom: 0, border: totals.balanced ? "1px solid #22c55e50" : "1px solid #ef444450" }}>
          <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>توازن القيد المزدوج</div>
          <div style={{ color: totals.balanced ? "#22c55e" : "#ef4444", fontSize: 18, fontWeight: 700 }}>
            {totals.balanced ? "متوازن ✓" : `غير متوازن (فرق ${fmt(totals.difference)})`}
          </div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
            مدين {fmt(totals.totalDebit)} = دائن {fmt(totals.totalCredit)}
          </div>
        </div>
        <div style={{ ...S.card, marginBottom: 0, border: integrity.matches ? "1px solid #22c55e50" : "1px solid #f59e0b50" }}>
          <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>مطابقة صافي الدخل</div>
          <div style={{ color: integrity.matches ? "#22c55e" : "#f59e0b", fontSize: 18, fontWeight: 700 }}>
            {integrity.matches ? "مطابق ✓" : `انحراف ${fmt(integrity.difference)}`}
          </div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
            الدفتر {fmt(integrity.ledgerNetIncome)} | التقرير {fmt(integrity.computedFinalNetProfit)}
          </div>
        </div>
        <div style={{ ...S.card, marginBottom: 0 }}>
          <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>عدد القيود</div>
          <div style={{ color: "#199bb8", fontSize: 18, fontWeight: 700 }}>{counts.journalEntries}</div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
            {counts.orders} طلب · {counts.expenses} مصروف · {counts.returns} راجع
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {/* Trial balance */}
        <div style={S.card}>
          <div style={S.sectionTitle}>ميزان المراجعة</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={S.th}>الحساب</th>
                  <th style={S.th}>النوع</th>
                  <th style={S.thNum}>مدين</th>
                  <th style={S.thNum}>دائن</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map((a) => (
                  <tr key={a.code}>
                    <td style={S.td}>
                      <span style={{ color: "#64748b", fontSize: 10, marginLeft: 6 }}>{a.code}</span>
                      {a.name}
                    </td>
                    <td style={{ ...S.td, color: "#94a3b8", fontSize: 11 }}>{TYPE_LABELS[a.type]}</td>
                    <td style={S.tdNum}>{a.debit > 0 ? fmt(a.debit) : "—"}</td>
                    <td style={S.tdNum}>{a.credit > 0 ? fmt(a.credit) : "—"}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #1e3a5f" }}>
                  <td style={{ ...S.td, fontWeight: 700, color: "#199bb8" }} colSpan={2}>الإجمالي</td>
                  <td style={{ ...S.tdNum, fontWeight: 700, color: totals.balanced ? "#22c55e" : "#ef4444" }}>{fmt(totals.totalDebit)}</td>
                  <td style={{ ...S.tdNum, fontWeight: 700, color: totals.balanced ? "#22c55e" : "#ef4444" }}>{fmt(totals.totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Income statement */}
        <div style={S.card}>
          <div style={S.sectionTitle}>قائمة الدخل (من الدفتر)</div>
          <PLRow label="إيرادات المبيعات" value={pl.revenue} />
          <PLRow label="− مردودات المبيعات" value={-pl.salesReturns} />
          <PLRow label="صافي الإيراد" value={pl.netRevenue} strong />
          <PLRow label="− كلفة البضاعة المباعة" value={-pl.cogs} />
          <PLRow label="مجمل الربح" value={pl.grossProfit} strong color="#199bb8" />
          <PLRow label="− تكلفة الكراتين" value={-pl.packaging} />
          <PLRow label="− خسائر الراجعات" value={-pl.returnsLoss} />
          <PLRow label="− مصاريف تشغيلية" value={-pl.operatingExpenses} />
          <div style={{ marginTop: 6, paddingTop: 8, borderTop: "2px solid #1e3a5f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800 }}>
              <span style={{ color: "#e2e8f0" }}>صافي الدخل</span>
              <span style={{ color: pl.netIncome >= 0 ? "#22c55e" : "#ef4444", fontVariantNumeric: "tabular-nums" }}>{fmt(pl.netIncome)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
