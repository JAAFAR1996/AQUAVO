import { useState, useEffect, useCallback } from "react";

// ─── Types (mirrored from server — not imported to avoid Vite bundling server code) ─

interface FinanceSnapshot {
  generatedAt: string;
  scope: "all_time";
  grossRevenue: number;
  netRevenue: number;
  totalCogs: number;
  grossProfit: number;
  expensesTotal: number;
  returnLossVerified: number;
  /** grossProfit (before expenses and before return losses) */
  profitBeforeExpensesAndReturns: number;
  /** grossProfit - expensesTotal (after expenses, BEFORE subtracting return losses) */
  profitAfterExpensesBeforeReturns: number;
  finalNetProfit: number;
  cogsBasis: "approximate_current_cost" | "unavailable";
  deliveredNetTotal: number;
  receivedCashTotal: number;
  approvedReturnDeductions: number;
  pendingSettlement: number;
  verifiedReturnEventsCount: number;
  recordedReturnEventsCount: number;
  returnedOrdersCount: number;
  returnedProductsCount: number;
  refundAmount: number;
  totalReturnFinancialImpact: number;
  inventoryValueAtCost: number;
  lowStockCount: number;
  outOfStockCount: number;
  costsComplete: boolean;
  missingCostLines: number;
  hasCodDrilldown: boolean;
  hasReturnEvents: boolean;
  notes: Array<{ type: "warning" | "info"; message: string }>;
}

interface AuditFinding {
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  explanation: string;
  affectedOrders: string[];
  expectedValue: number | null;
  actualValue: number | null;
  difference: number | null;
  suggestedFix: string;
  requiresHumanApproval: true;
  status?: string;
}

interface AuditReport {
  overallStatus: "ok" | "warning" | "critical";
  summary: string;
  findings: AuditFinding[];
}

interface InvariantCheck {
  name: string;
  passed: boolean;
  expected?: number | null;
  actual?: number | null;
  note?: string;
}

interface FinanceAuditResult {
  snapshot: FinanceSnapshot;
  invariantChecks: InvariantCheck[];
  report: AuditReport | null;
  error?: string;
  generatedAt: string;
}

// Shape returned by GET /audit/history
interface AuditRunSummary {
  id: string;
  overallStatus: string;
  model: string;
  summary: string | null;
  startedAt: string;
  completedAt: string;
  errorMessage: string | null;
  triggeredBy: string;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
}

// Shape returned by GET /audit/latest (DB-backed)
interface AuditRunFull extends AuditRunSummary {
  snapshot: FinanceSnapshot;
  invariantChecks: InvariantCheck[];
  findings: AuditFinding[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n) + " د.ع";

const fmtNum = (n: number | string | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n));

function nextScheduledTime(intervalHours = 12): string {
  const now = new Date();
  // Approximate: next firing at the hour that is a multiple of intervalHours
  const nextHour = (Math.floor(now.getHours() / intervalHours) + 1) * intervalHours;
  const next = new Date(now);
  next.setHours(nextHour % 24, 0, 0, 0);
  if (nextHour >= 24) next.setDate(next.getDate() + 1);
  return next.toLocaleString("ar-IQ");
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  low:      { bg: "#0d1f3c", border: "#0B93A640", text: "#67e8f9" },
  medium:   { bg: "#1a1a0a", border: "#f59e0b60", text: "#fcd34d" },
  high:     { bg: "#1a0d0d", border: "#ef444460", text: "#fca5a5" },
  critical: { bg: "#200010", border: "#dc2626", text: "#f87171" },
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  ok:       { bg: "#0a2010", border: "#22c55e60", text: "#4ade80", label: "سليم" },
  warning:  { bg: "#1a1500", border: "#f59e0b60", text: "#fcd34d", label: "تحذير" },
  critical: { bg: "#200010", border: "#dc262660", text: "#f87171", label: "حرج" },
  failed:   { bg: "#1a0d0d", border: "#ef444460", text: "#fca5a5", label: "فشل" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{ height: 72, background: "#0d1f3c", borderRadius: 10, opacity: 0.5,
            animation: "pulse 1.5s ease-in-out infinite" }}
        />
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ background: "#1a0d0d", border: "1px solid #ef4444", borderRadius: 10,
      padding: "12px 16px", color: "#fca5a5", fontSize: 13 }}>
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.failed;
  return (
    <span style={{ background: colors.border, color: colors.text,
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
      textTransform: "uppercase", letterSpacing: 0.5 }}>
      {colors.label}
    </span>
  );
}

function InvariantRow({ check }: { check: InvariantCheck }) {
  const passed = check.passed;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10,
      padding: "8px 0", borderBottom: "1px solid #1e3a5f20" }}>
      <span style={{ fontWeight: 700, fontSize: 13, minWidth: 18,
        color: passed ? "#4ade80" : "#f87171" }}>
        {passed ? "✓" : "✗"}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ color: passed ? "#94a3b8" : "#fca5a5", fontSize: 13 }}>{check.name}</div>
        {!passed && check.note && (
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{check.note}</div>
        )}
        {!passed && check.expected != null && (
          <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 2 }}>
            متوقع: {fmtNum(check.expected)} | فعلي: {fmtNum(check.actual ?? null)}
          </div>
        )}
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: AuditFinding }) {
  const colors = SEVERITY_COLORS[finding.severity] ?? SEVERITY_COLORS.medium;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}>
        <span style={{ background: colors.border, color: colors.text,
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
          textTransform: "uppercase", letterSpacing: 0.5 }}>
          {finding.severity}
        </span>
        <span style={{ color: colors.text, fontSize: 13, fontWeight: 600, flex: 1 }}>
          {finding.title}
        </span>
        <span style={{ color: "#64748b", fontSize: 11 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>{finding.explanation}</div>

          {(finding.expectedValue != null || finding.actualValue != null) && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {finding.expectedValue != null && (
                <div style={{ color: "#67e8f9", fontSize: 12 }}>متوقع: {fmtNum(finding.expectedValue)} د.ع</div>
              )}
              {finding.actualValue != null && (
                <div style={{ color: "#fca5a5", fontSize: 12 }}>فعلي: {fmtNum(finding.actualValue)} د.ع</div>
              )}
              {finding.difference != null && (
                <div style={{ color: "#f59e0b", fontSize: 12 }}>الفرق: {fmtNum(finding.difference)} د.ع</div>
              )}
            </div>
          )}

          {finding.affectedOrders.length > 0 && (
            <div style={{ color: "#94a3b8", fontSize: 12 }}>
              طلبيات متأثرة: {finding.affectedOrders.join("، ")}
            </div>
          )}

          <div style={{ background: "#0B1E28", borderRadius: 8, padding: "8px 12px",
            borderRight: "3px solid #0B93A6" }}>
            <div style={{ color: "#64748b", fontSize: 10, marginBottom: 4 }}>الإصلاح المقترح</div>
            <div style={{ color: "#e2e8f0", fontSize: 12 }}>{finding.suggestedFix}</div>
          </div>

          <div style={{ background: "#1a1a00", border: "1px solid #f59e0b40",
            borderRadius: 6, padding: "5px 10px",
            color: "#fcd34d", fontSize: 11, textAlign: "center" }}>
            يتطلب موافقة المدير — لا يُطبَّق تلقائياً
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ run }: { run: AuditRunSummary }) {
  const colors = STATUS_COLORS[run.overallStatus] ?? STATUS_COLORS.failed;
  const duration = Math.round(
    (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
      borderBottom: "1px solid #1e3a5f20" }}>
      <StatusBadge status={run.overallStatus} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#94a3b8", fontSize: 12, direction: "ltr", textAlign: "right" }}>
          {new Date(run.startedAt).toLocaleString("ar-IQ")}
        </div>
        {run.summary && (
          <div style={{ color: "#475569", fontSize: 11, marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {run.summary.slice(0, 70)}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        {run.findingsCount > 0 && (
          <span style={{ color: run.criticalCount > 0 ? "#f87171" : run.highCount > 0 ? "#fca5a5" : "#fcd34d",
            fontSize: 11, fontWeight: 600 }}>
            {run.findingsCount} نتيجة
          </span>
        )}
        <span style={{ color: "#334155", fontSize: 10 }}>
          {run.triggeredBy === "scheduled" ? "مجدوَل" : "يدوي"} · {duration}ث
        </span>
      </div>
    </div>
  );
}

function SchedulerStatusCard({
  enabled,
  intervalHours,
  lastRunAt,
}: {
  enabled: boolean;
  intervalHours: number;
  lastRunAt: string | null;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
      <div style={{ background: "#0B1E28", border: `1px solid ${enabled ? "#22c55e30" : "#ef444430"}`,
        borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ color: "#64748b", fontSize: 10 }}>حالة الجدولة</div>
        <div style={{ color: enabled ? "#4ade80" : "#f87171", fontSize: 13, fontWeight: 600, marginTop: 3 }}>
          {enabled ? "مفعّل" : "معطّل"}
        </div>
      </div>
      <div style={{ background: "#0B1E28", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ color: "#64748b", fontSize: 10 }}>الفترة</div>
        <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, marginTop: 3 }}>
          كل {intervalHours} ساعة
        </div>
      </div>
      <div style={{ background: "#0B1E28", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ color: "#64748b", fontSize: 10 }}>آخر تشغيل</div>
        <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, marginTop: 3 }}>
          {lastRunAt ? new Date(lastRunAt).toLocaleString("ar-IQ") : "لم يُشغَّل بعد"}
        </div>
      </div>
      {enabled && (
        <div style={{ background: "#0B1E28", border: "1px solid #0B93A620", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ color: "#64748b", fontSize: 10 }}>التشغيل القادم</div>
          <div style={{ color: "#67e8f9", fontSize: 12, fontWeight: 600, marginTop: 3 }}>
            {nextScheduledTime(intervalHours)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FinanceAudit() {
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<FinanceAuditResult | AuditRunFull | null>(null);
  const [history, setHistory] = useState<AuditRunSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [persistenceSource, setPersistenceSource] = useState<"db" | "memory" | null>(null);

  const schedulerEnabled = true; // always configured — disabled at env level
  const intervalHours = 12;

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/finance/audit/latest", { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (json?.success && json.data) {
        setLatestResult(json.data);
        setPersistenceSource(json.persistenceSource ?? null);
      }
    } catch {
      // Non-critical — just leave latestResult as null
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/finance/audit/history", { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (json?.success && Array.isArray(json.data)) setHistory(json.data);
    } catch {
      // Silent
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
    fetchHistory();
  }, [fetchLatest, fetchHistory]);

  async function runAudit() {
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch("/api/admin/finance/audit/run", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? `خطأ ${res.status}`);
      }
      setLatestResult(json.data as FinanceAuditResult);
      // Refresh history to include the new run
      await fetchHistory();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setRunning(false);
    }
  }

  // Normalise latest result — could be FinanceAuditResult (manual run) or AuditRunFull (from DB)
  const isDbResult = latestResult && "findings" in latestResult && !("report" in latestResult);
  const report: AuditReport | null = isDbResult
    ? {
        overallStatus: (latestResult as AuditRunFull).overallStatus as AuditReport["overallStatus"],
        summary: (latestResult as AuditRunFull).summary ?? "",
        findings: (latestResult as AuditRunFull).findings as unknown as AuditFinding[],
      }
    : (latestResult as FinanceAuditResult | null)?.report ?? null;

  const snapshot = (latestResult as FinanceAuditResult)?.snapshot ??
    (latestResult as AuditRunFull)?.snapshot as unknown as FinanceSnapshot ?? null;

  const invariantChecks: InvariantCheck[] = (latestResult as FinanceAuditResult)?.invariantChecks ??
    (latestResult as AuditRunFull)?.invariantChecks as unknown as InvariantCheck[] ?? [];

  const generatedAt = (latestResult as FinanceAuditResult)?.generatedAt ??
    (latestResult as AuditRunFull)?.startedAt ?? null;

  const latestError = (latestResult as FinanceAuditResult)?.error ??
    (latestResult as AuditRunFull)?.errorMessage ?? null;

  const status = report?.overallStatus ?? (latestError ? "failed" : null);
  const statusColors = status ? (STATUS_COLORS[status] ?? null) : null;
  const failedChecks = invariantChecks.filter(c => !c.passed);
  const findings = report?.findings ?? [];

  // Group findings by severity for summary
  const findingsBySeverity = {
    critical: findings.filter(f => f.severity === "critical"),
    high: findings.filter(f => f.severity === "high"),
    medium: findings.filter(f => f.severity === "medium"),
    low: findings.filter(f => f.severity === "low"),
  };

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header card */}
      <div style={{ background: "#0d1f3c", border: "1px solid #0B93A620",
        borderRadius: 12, padding: "18px 22px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>
              تدقيق المحاسب الآلي
            </h3>
            <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
              تقرير قراءة فقط — لا يُعدَّل أي بيان محاسبي تلقائياً
            </p>
          </div>
          <button
            onClick={runAudit}
            disabled={running}
            style={{ background: running ? "#0d1f3c" : "#0B93A6",
              border: "1.5px solid #0B93A6", color: "#fff", borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 600,
              cursor: running ? "not-allowed" : "pointer",
              opacity: running ? 0.6 : 1, whiteSpace: "nowrap" }}>
            {running ? "جاري التحليل..." : "تشغيل يدوي"}
          </button>
        </div>

        <div style={{ marginTop: 14, background: "#0B1E28", borderRadius: 8,
          padding: "8px 14px", border: "1px solid #1e3a5f" }}>
          <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
            تنبيه مهم
          </div>
          <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.6 }}>
            لا يتم تطبيق أي تعديل بدون موافقة المدير.
            Groq يقرأ لقطة مالية فقط — لا يكتب في قاعدة البيانات ولا يغيّر طلبيات أو مدفوعات أو مخزون.
          </div>
        </div>
      </div>

      {/* Scheduler status */}
      <div>
        <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
          حالة الجدولة التلقائية
        </div>
        <SchedulerStatusCard
          enabled={schedulerEnabled}
          intervalHours={intervalHours}
          lastRunAt={history[0]?.startedAt ?? generatedAt}
        />
      </div>

      {/* Run error */}
      {runError && <ErrorBanner message={runError} />}

      {/* Running skeleton */}
      {running && <LoadingSkeleton />}

      {/* Latest audit result */}
      {!running && latestResult && (
        <>
          {/* Overall status banner */}
          {statusColors && (
            <div style={{ background: statusColors.bg,
              border: `1.5px solid ${statusColors.border}`,
              borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <StatusBadge status={status!} />
                <span style={{ color: statusColors.text, fontSize: 13, fontWeight: 600 }}>
                  {status === "ok" ? "لا مشاكل محاسبية" :
                   status === "warning" ? "يوجد تنبيهات تستوجب المراجعة" :
                   status === "critical" ? "يوجد مشاكل حرجة تستوجب التدخل الفوري" :
                   "فشل التدقيق — راجع الخطأ"}
                </span>
              </div>
              {report?.summary && (
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
                  {report.summary}
                </div>
              )}
              {generatedAt && (
                <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>
                  تاريخ التقرير: {new Date(generatedAt).toLocaleString("ar-IQ")}
                </div>
              )}
            </div>
          )}

          {/* Groq error */}
          {latestError && <ErrorBanner message={`تعذّر الاتصال بـ Groq: ${latestError}`} />}

          {/* Findings severity summary */}
          {findings.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["critical", "high", "medium", "low"] as const).map(sev => {
                const cnt = findingsBySeverity[sev].length;
                if (cnt === 0) return null;
                const c = SEVERITY_COLORS[sev];
                return (
                  <div key={sev} style={{ background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 8, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: c.text, fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase" }}>{sev}</span>
                    <span style={{ color: c.text, fontSize: 13, fontWeight: 700 }}>{cnt}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* KPI snapshot */}
          {snapshot && (
            <div>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                اللقطة المالية المُستخدمة
              </div>

              {/* All-time scope warning */}
              <div style={{
                background: "#1a1500",
                border: "1px solid #f59e0b50",
                borderRadius: 8,
                padding: "8px 14px",
                color: "#fcd34d",
                fontSize: 11,
                lineHeight: 1.6,
                marginBottom: 10,
              }}>
                <strong>نطاق:</strong> هذه اللقطة تشمل <strong>جميع البيانات منذ بداية المتجر</strong> وليست مقيدة بفترة زمنية محددة.
                أرقام الإيرادات والمخزون هنا هي أرقام إجمالية كاملة — لا علاقة لها بفلتر الفترة في صفحة المحاسب.
              </div>

              {/* Persistence source indicator */}
              {persistenceSource === "memory" && (
                <div style={{
                  background: "#1a0d0d",
                  border: "1px solid #ef444440",
                  borderRadius: 8,
                  padding: "7px 14px",
                  color: "#fca5a5",
                  fontSize: 11,
                  marginBottom: 10,
                }}>
                  تنبيه: سجل التدقيق محفوظ في الذاكرة المؤقتة فقط (جداول DB غير مفعّلة بعد) — سيُفقد عند إعادة تشغيل الخادم.
                  لتفعيل الحفظ الدائم: شغّل <code style={{ fontFamily: "monospace", color: "#f87171" }}>migrations/run-finance-audit-tables.sql</code> في Neon.
                </div>
              )}

              <div style={{ display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {[
                  { label: "إيراد التسليمات", value: fmt(snapshot.deliveredNetTotal) },
                  { label: "مستلم من الشحن", value: fmt(snapshot.receivedCashTotal) },
                  { label: "خصم راجعات معتمدة", value: fmt(snapshot.approvedReturnDeductions) },
                  { label: "معلّق لم يُستلم", value: fmt(snapshot.pendingSettlement),
                    highlight: snapshot.pendingSettlement > 0 },
                  { label: "خسائر راجعات معتمدة", value: fmt(snapshot.totalReturnFinancialImpact) },
                  { label: "صافي ربح نهائي", value: fmt(snapshot.finalNetProfit) },
                  { label: "قيمة المخزون بالكلفة", value: fmt(snapshot.inventoryValueAtCost) },
                  { label: "مخزون منخفض/نافد",
                    value: `${snapshot.lowStockCount} / ${snapshot.outOfStockCount}` },
                ].map(card => (
                  <div key={card.label} style={{ background: "#0B1E28",
                    border: `1px solid ${card.highlight ? "#f59e0b50" : "#1e3a5f"}`,
                    borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ color: "#64748b", fontSize: 10 }}>{card.label}</div>
                    <div style={{ color: card.highlight ? "#fcd34d" : "#e2e8f0",
                      fontSize: 13, fontWeight: 600, marginTop: 3 }}>
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>
              {snapshot.cogsBasis === "unavailable" && (
                <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 6 }}>
                  تنبيه: بيانات كلفة غير مكتملة ({snapshot.missingCostLines} سطر) — أرقام الربح تقريبية
                </div>
              )}
            </div>
          )}

          {/* Invariant checks */}
          {invariantChecks.length > 0 && (
            <div style={{ background: "#0d1f3c", border: "1px solid #0B93A620",
              borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                الفحوصات الحتمية
                {failedChecks.length > 0 && (
                  <span style={{ color: "#f87171", marginRight: 6 }}>
                    ({failedChecks.length} فشلت)
                  </span>
                )}
              </div>
              {invariantChecks.map(check => (
                <InvariantRow key={check.name} check={check} />
              ))}
            </div>
          )}

          {/* Findings grouped by severity */}
          {(["critical", "high", "medium", "low"] as const).map(sev => {
            const group = findingsBySeverity[sev];
            if (group.length === 0) return null;
            return (
              <div key={sev}>
                <div style={{ color: SEVERITY_COLORS[sev].text, fontSize: 12,
                  fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {sev} ({group.length})
                </div>
                {group.map((f, i) => <FindingCard key={i} finding={f} />)}
              </div>
            );
          })}

          {findings.length === 0 && report && (
            <div style={{ background: "#0a2010", border: "1px solid #22c55e30",
              borderRadius: 10, padding: "14px 18px",
              color: "#4ade80", fontSize: 13, textAlign: "center" }}>
              لا نتائج — الأرقام المحاسبية تبدو سليمة
            </div>
          )}
        </>
      )}

      {/* Audit history */}
      <div style={{ background: "#0d1f3c", border: "1px solid #0B93A620",
        borderRadius: 12, padding: "14px 18px" }}>
        <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          سجل التدقيق (آخر 10 تشغيلات)
        </div>
        {historyLoading ? (
          <div style={{ color: "#475569", fontSize: 12 }}>جاري التحميل...</div>
        ) : history.length === 0 ? (
          <div style={{ color: "#475569", fontSize: 12 }}>لا سجل بعد — شغّل أول تدقيق</div>
        ) : (
          history.map(run => <HistoryRow key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}
