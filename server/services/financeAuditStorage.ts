import { getDb } from "../db.js";
import { financeAuditRuns, financeAuditFindings } from "../../shared/schema.js";
import { desc, eq } from "drizzle-orm";
import type { FinanceAuditResult, AuditFinding, InvariantCheck } from "./groqFinanceAudit.js";

export interface AuditRunSummary {
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

export interface AuditRunFull extends AuditRunSummary {
  snapshot: Record<string, unknown>;
  invariantChecks: Record<string, unknown>[];
  findings: Array<{
    id: string;
    severity: string;
    category: string;
    title: string;
    explanation: string;
    affectedOrders: string[] | null;
    expectedValue: string | null;
    actualValue: string | null;
    difference: string | null;
    suggestedFix: string;
    requiresHumanApproval: boolean;
    status: string;
  }>;
}

export interface PersistedAuditDecision {
  overallStatus: "ok" | "warning" | "critical";
  summary: string;
  findings: AuditFinding[];
}

function invariantSeverity(check: InvariantCheck): "high" | "critical" {
  const name = check.name.toLowerCase();
  if (
    name.includes("balance")
    || name.includes("affects profit")
    || name.includes("excessive")
    || name.includes("within delivered")
  ) {
    return "critical";
  }
  return "high";
}

function findingFromInvariant(check: InvariantCheck): AuditFinding {
  const expected = check.expected ?? null;
  const actual = check.actual ?? null;
  const difference = expected != null && actual != null ? actual - expected : null;

  return {
    severity: invariantSeverity(check),
    category: "suspicious_number",
    title: `فشل فحص حتمي: ${check.name}`,
    explanation:
      check.note
      ?? "أحد فحوصات SQL الحتمية لم يطابق النتيجة المتوقعة. هذا التنبيه لا يعتمد على رأي نموذج ذكاء اصطناعي.",
    affectedOrders: [],
    expectedValue: expected,
    actualValue: actual,
    difference,
    suggestedFix:
      "راجع مصدر الأرقام والسجلات المرتبطة يدوياً، ثم وثّق أي تصحيح قبل اعتماده. لا تنفذ تعديلاً آلياً.",
    requiresHumanApproval: true,
  };
}

function aiUnavailableFinding(error: string): AuditFinding {
  return {
    severity: "medium",
    category: "missing_drilldown",
    title: "تحليل Groq غير متاح — تم الاعتماد على الفحوصات الحتمية",
    explanation:
      `تعذر الحصول على تقرير AI صالح، لكن لقطة الحسابات وفحوصات SQL اكتملت وحُفظت. السبب التقني: ${error.slice(0, 500)}`,
    affectedOrders: [],
    expectedValue: null,
    actualValue: null,
    difference: null,
    suggestedFix:
      "راجع إعداد النموذج وعقد JSON بصورة منفصلة. لا تعتبر تعطل AI دليلاً على صحة أو خطأ الأرقام.",
    requiresHumanApproval: true,
  };
}

/**
 * Produces the report that is safe to persist.
 * Deterministic invariant failures always survive, even when the AI response
 * is malformed, unavailable, or incorrectly reports an OK state.
 */
export function derivePersistedAuditDecision(
  result: FinanceAuditResult,
): PersistedAuditDecision {
  const failedChecks = result.invariantChecks.filter((check) => !check.passed);
  const deterministicFindings = failedChecks.map(findingFromInvariant);
  const aiFindings = result.report?.findings ?? [];
  const findings = [...deterministicFindings, ...aiFindings];

  if (result.error) {
    findings.push(aiUnavailableFinding(result.error));
  }

  const hasCritical = findings.some((finding) => finding.severity === "critical");
  const hasHigh = findings.some((finding) => finding.severity === "high");

  let overallStatus: "ok" | "warning" | "critical";
  if (failedChecks.length > 0 || hasCritical) {
    overallStatus = "critical";
  } else if (result.error || hasHigh || findings.length > 0 || result.report?.overallStatus === "warning") {
    overallStatus = "warning";
  } else {
    overallStatus = result.report?.overallStatus === "critical" ? "critical" : "ok";
  }

  const deterministicSummary = failedChecks.length > 0
    ? `فشل ${failedChecks.length} فحص حتمي. يجب مراجعة الأرقام قبل أي اعتماد أو تعديل.`
    : "جميع الفحوصات الحتمية نجحت.";

  const aiSummary = result.report?.summary?.trim();
  const aiState = result.error
    ? "تحليل Groq لم ينتج JSON صالحاً، لذلك لم يُستخدم كحكم على الأرقام."
    : "";

  return {
    overallStatus,
    summary: [deterministicSummary, aiSummary, aiState].filter(Boolean).join(" "),
    findings,
  };
}

class FinanceAuditStorage {
  private ensureDb() {
    const db = getDb();
    if (!db) throw new Error("Database not available");
    return db;
  }

  async saveAuditRun(
    result: FinanceAuditResult,
    triggeredBy: string = "scheduled",
  ): Promise<string> {
    const db = this.ensureDb();
    const startedAt = new Date(result.generatedAt);
    const completedAt = new Date();
    const decision = derivePersistedAuditDecision(result);
    const model = process.env.FINANCE_GROQ_MODEL || "llama-3.1-8b-instant";

    const [run] = await db
      .insert(financeAuditRuns)
      .values({
        overallStatus: decision.overallStatus,
        model,
        summary: decision.summary,
        snapshot: result.snapshot as unknown as Record<string, unknown>,
        invariantChecks: result.invariantChecks as unknown as Record<string, unknown>[],
        startedAt,
        completedAt,
        errorMessage: result.error ?? null,
        triggeredBy,
      })
      .returning({ id: financeAuditRuns.id });

    const runId = run.id;

    if (decision.findings.length > 0) {
      await db.insert(financeAuditFindings).values(
        decision.findings.map((finding) => ({
          runId,
          severity: finding.severity,
          category: finding.category,
          title: finding.title,
          explanation: finding.explanation,
          affectedOrders: finding.affectedOrders as unknown as string[],
          expectedValue: finding.expectedValue != null ? String(finding.expectedValue) : null,
          actualValue: finding.actualValue != null ? String(finding.actualValue) : null,
          difference: finding.difference != null ? String(finding.difference) : null,
          suggestedFix: finding.suggestedFix,
          requiresHumanApproval: true,
          status: "open",
        })),
      );
    }

    return runId;
  }

  async getLatestRun(): Promise<AuditRunFull | null> {
    const db = this.ensureDb();
    const runs = await db
      .select()
      .from(financeAuditRuns)
      .orderBy(desc(financeAuditRuns.startedAt))
      .limit(1);

    if (runs.length === 0) return null;
    const run = runs[0];

    const findings = await db
      .select()
      .from(financeAuditFindings)
      .where(eq(financeAuditFindings.runId, run.id))
      .orderBy(desc(financeAuditFindings.severity));

    return this.toFull(run, findings);
  }

  async getHistory(limit = 10): Promise<AuditRunSummary[]> {
    const db = this.ensureDb();
    const runs = await db
      .select()
      .from(financeAuditRuns)
      .orderBy(desc(financeAuditRuns.startedAt))
      .limit(limit);

    const results: AuditRunSummary[] = [];
    for (const run of runs) {
      const findings = await db
        .select({
          severity: financeAuditFindings.severity,
        })
        .from(financeAuditFindings)
        .where(eq(financeAuditFindings.runId, run.id));

      results.push({
        id: run.id,
        overallStatus: run.overallStatus,
        model: run.model,
        summary: run.summary,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt.toISOString(),
        errorMessage: run.errorMessage,
        triggeredBy: run.triggeredBy,
        findingsCount: findings.length,
        criticalCount: findings.filter((finding) => finding.severity === "critical").length,
        highCount: findings.filter((finding) => finding.severity === "high").length,
      });
    }
    return results;
  }

  private toFull(
    run: typeof financeAuditRuns.$inferSelect,
    findings: Array<typeof financeAuditFindings.$inferSelect>,
  ): AuditRunFull {
    const findingsCount = findings.length;
    const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
    const highCount = findings.filter((finding) => finding.severity === "high").length;

    return {
      id: run.id,
      overallStatus: run.overallStatus,
      model: run.model,
      summary: run.summary,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt.toISOString(),
      errorMessage: run.errorMessage,
      triggeredBy: run.triggeredBy,
      findingsCount,
      criticalCount,
      highCount,
      snapshot: run.snapshot as Record<string, unknown>,
      invariantChecks: run.invariantChecks as Record<string, unknown>[],
      findings: findings.map((finding) => ({
        id: finding.id,
        severity: finding.severity,
        category: finding.category,
        title: finding.title,
        explanation: finding.explanation,
        affectedOrders: finding.affectedOrders as string[] | null,
        expectedValue: finding.expectedValue,
        actualValue: finding.actualValue,
        difference: finding.difference,
        suggestedFix: finding.suggestedFix,
        requiresHumanApproval: finding.requiresHumanApproval,
        status: finding.status,
      })),
    };
  }
}

export const financeAuditStorage = new FinanceAuditStorage();
