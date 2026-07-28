import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import {
  accountingSummarySchema,
  TAX_NOT_READY_WARNING_AR,
  type AccountingSummary,
} from "@shared/accounting";

// ── Types ────────────────────────────────────────────────────────────────────

interface PeriodFigures {
  revenue: number;
  grossProfit: number;
  expensesTotal: number;
  finalNetProfit: number;
  deliveredOrders: number;
}

interface ClosedPeriod {
  id: string;
  periodKey: string;
  status: "closed" | "reopened";
  closedAt: string;
  closedByName: string | null;
  reopenedReason: string | null;
  frozen: PeriodFigures;
  live: PeriodFigures;
  drift: { revenue: number; finalNetProfit: number };
  hasDrift: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

const fmtSigned = (n: number) => (n > 0 ? "+" : "") + fmt(n);

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "خطأ غير معروف";
}

/** Months that have fully ended and are not yet closed — candidates to close. */
function closableMonths(closedKeys: Set<string>): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  // Walk back 12 months starting from last month (current month not yet ended).
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (closedKeys.has(key)) continue;
    out.push({
      key,
      label: d.toLocaleDateString("ar-IQ", { year: "numeric", month: "long" }),
    });
  }
  return out;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  card: { background: "#0d1f3c", border: "1px solid #0B93A620", borderRadius: 12, padding: 18, marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { color: "#0B93A6", fontSize: 13, fontWeight: 700, marginBottom: 12 } as React.CSSProperties,
  th: { color: "#94a3b8", fontSize: 11, fontWeight: 600, padding: "8px 10px", borderBottom: "1px solid #1e3a5f", textAlign: "right" as const, whiteSpace: "nowrap" as const } as React.CSSProperties,
  td: { padding: "10px 10px", fontSize: 12, color: "#e2e8f0", borderBottom: "1px solid #0d1f3c", verticalAlign: "top" as const } as React.CSSProperties,
  btnPrimary: { background: "#0B93A6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 } as React.CSSProperties,
  btnGhost: { background: "transparent", color: "#f59e0b", border: "1px solid #f59e0b40", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 } as React.CSSProperties,
  select: { background: "#0B1E28", border: "1px solid #1e3a5f", color: "#e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13 } as React.CSSProperties,
  infoBox: { background: "#0d1a2a", border: "1px solid #0B93A640", color: "#cbd5e1", padding: "10px 14px", borderRadius: 8, fontSize: 12, lineHeight: 1.7, marginBottom: 16 } as React.CSSProperties,
};

// ── Main component ───────────────────────────────────────────────────────────

export function FinancePeriodClose() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState("");

  const { data: periods, isLoading, error } = useQuery<ClosedPeriod[]>({
    queryKey: ["finance-periods"],
    queryFn: async () => {
      const res = await fetch("/api/admin/accounting/periods", { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return json.data as ClosedPeriod[];
    },
    staleTime: 30_000,
  });

  // TAX GATE. A period close freezes figures that are then read as final. While
  // any counted line is costed from an estimate rather than an immutable
  // sale-time snapshot, closing is blocked here AND server-side (409) — the
  // button is not the only guard, it is just the honest one.
  const { data: taxSummary } = useQuery<AccountingSummary>({
    queryKey: ["finance-tax-readiness", "year"],
    queryFn: async () => {
      const res = await fetch("/api/admin/accounting/summary?period=year", { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
      return accountingSummarySchema.parse(json.data);
    },
    staleTime: 30_000,
  });
  // Unknown readiness is treated as NOT ready — never fail open on a final close.
  const taxReportReady = taxSummary?.taxReportReady === true;

  const closedKeys = new Set((periods ?? []).filter(p => p.status === "closed").map(p => p.periodKey));
  const candidates = closableMonths(closedKeys);

  const closeMutation = useMutation({
    mutationFn: async (periodKey: string) => {
      const res = await fetch("/api/admin/accounting/periods/close", {
        method: "POST",
        credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({ periodKey }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
    },
    onSuccess: () => {
      toast({ title: "تم إغلاق الفترة", description: "تم تجميد أرقام الفترة بشكل نهائي" });
      setSelectedMonth("");
      qc.invalidateQueries({ queryKey: ["finance-periods"] });
    },
    onError: (e) => toast({ title: "تعذّر الإغلاق", description: errMsg(e), variant: "destructive" }),
  });

  const reopenMutation = useMutation({
    mutationFn: async ({ periodKey, reason }: { periodKey: string; reason: string }) => {
      const res = await fetch(`/api/admin/accounting/periods/${periodKey}/reopen`, {
        method: "POST",
        credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({ reason }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? `خطأ ${res.status}`);
    },
    onSuccess: () => {
      toast({ title: "تمت إعادة فتح الفترة" });
      qc.invalidateQueries({ queryKey: ["finance-periods"] });
    },
    onError: (e) => toast({ title: "تعذّرت إعادة الفتح", description: errMsg(e), variant: "destructive" }),
  });

  function handleReopen(periodKey: string) {
    const reason = window.prompt("سبب إعادة فتح هذه الفترة المغلقة؟ (مطلوب للسجل)");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      toast({ title: "السبب مطلوب (3 أحرف على الأقل)", variant: "destructive" });
      return;
    }
    reopenMutation.mutate({ periodKey, reason: reason.trim() });
  }

  return (
    <div dir="rtl">
      <div style={S.infoBox}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: "#0B93A6" }}>إغلاق الفترات والمطابقة</div>
        <div>
          إغلاق الفترة يُجمّد أرقامها بشكل نهائي (snapshot). بعد الإغلاق، أي تعديل لاحق على طلب قديم
          يظهر هنا كـ <span style={{ color: "#f59e0b", fontWeight: 700 }}>انحراف</span> بين الرقم المجمّد والرقم المُعاد حسابه —
          فما يتغيّر أي تقرير سابق بصمت. لفتح فترة مغلقة لازم سبب مسجّل.
        </div>
      </div>

      {!taxReportReady && (
        <div style={{
          background: "#ef444412", border: "1.5px solid #ef444455", color: "#fca5a5",
          padding: "12px 16px", borderRadius: 8, fontSize: 12, lineHeight: 1.8, marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {taxSummary?.taxReadinessWarning ?? TAX_NOT_READY_WARNING_AR}
          </div>
          <div style={{ color: "#94a3b8" }}>
            إغلاق الفترة والاعتماد النهائي معطّلان حتى تصبح كل الأسطر المحتسبة بكلفة مؤكدة
            {taxSummary
              ? ` (حالياً ${taxSummary.exactCostLines} من ${taxSummary.totalFinancialLines})`
              : ""}.
          </div>
        </div>
      )}

      {/* Close a new period */}
      <div style={S.card}>
        <div style={S.sectionTitle}>إغلاق فترة جديدة</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select style={S.select} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={!taxReportReady}>
            <option value="">اختر الشهر...</option>
            {candidates.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <button
            data-testid="close-period-button"
            style={{
              ...S.btnPrimary,
              opacity: taxReportReady && selectedMonth && !closeMutation.isPending ? 1 : 0.5,
              cursor: taxReportReady && selectedMonth ? "pointer" : "not-allowed",
            }}
            disabled={!taxReportReady || !selectedMonth || closeMutation.isPending}
            onClick={() => taxReportReady && selectedMonth && closeMutation.mutate(selectedMonth)}
          >
            {closeMutation.isPending ? "جاري الإغلاق..." : "إغلاق الفترة وتجميد الأرقام"}
          </button>
        </div>
        {candidates.length === 0 && (
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>كل الأشهر المنتهية مغلقة بالفعل</div>
        )}
      </div>

      {/* Closed periods + reconciliation */}
      <div style={S.card}>
        <div style={S.sectionTitle}>الفترات المغلقة — المطابقة</div>
        {isLoading && <div style={{ color: "#64748b", fontSize: 12 }}>جاري التحميل...</div>}
        {error && <div style={{ color: "#ef4444", fontSize: 12 }}>{errMsg(error)}</div>}
        {!isLoading && !error && (periods ?? []).length === 0 && (
          <div style={{ color: "#64748b", fontSize: 12 }}>لا توجد فترات مغلقة بعد</div>
        )}
        {periods && periods.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["الفترة", "الحالة", "صافي الربح (مجمّد)", "صافي الربح (الآن)", "الانحراف", "أُغلقت بواسطة", ""].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{p.periodKey}</td>
                    <td style={S.td}>
                      {p.status === "closed" ? (
                        <span style={{ background: "#22c55e20", color: "#86efac", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>مغلقة</span>
                      ) : (
                        <span style={{ background: "#f59e0b20", color: "#fbbf24", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>مُعاد فتحها</span>
                      )}
                    </td>
                    <td style={S.td}>{fmt(p.frozen.finalNetProfit)}</td>
                    <td style={S.td}>{fmt(p.live.finalNetProfit)}</td>
                    <td style={S.td}>
                      {p.hasDrift ? (
                        <span style={{ color: "#f59e0b", fontWeight: 700 }}>{fmtSigned(p.drift.finalNetProfit)}</span>
                      ) : (
                        <span style={{ color: "#22c55e" }}>مطابق ✓</span>
                      )}
                    </td>
                    <td style={{ ...S.td, color: "#94a3b8", fontSize: 11 }}>{p.closedByName ?? "—"}</td>
                    <td style={S.td}>
                      {p.status === "closed" && (
                        <button style={S.btnGhost} onClick={() => handleReopen(p.periodKey)} disabled={reopenMutation.isPending}>
                          إعادة فتح
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
