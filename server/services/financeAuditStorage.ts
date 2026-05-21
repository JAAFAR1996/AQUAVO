import { getDb } from "../db.js";
import { financeAuditRuns, financeAuditFindings } from "../../shared/schema.js";
import { desc, eq } from "drizzle-orm";
import type { FinanceAuditResult } from "./groqFinanceAudit.js";

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

class FinanceAuditStorage {
  private ensureDb() {
    const db = getDb();
    if (!db) throw new Error("Database not available");
    return db;
  }

  async saveAuditRun(
    result: FinanceAuditResult,
    triggeredBy: string = "scheduled"
  ): Promise<string> {
    const db = this.ensureDb();
    const startedAt = new Date(result.generatedAt);
    const completedAt = new Date();
    const overallStatus = result.error
      ? "failed"
      : (result.report?.overallStatus ?? "failed");
    const model = process.env.FINANCE_GROQ_MODEL || "llama-3.1-8b-instant";

    const [run] = await db
      .insert(financeAuditRuns)
      .values({
        overallStatus,
        model,
        summary: result.report?.summary ?? null,
        snapshot: result.snapshot as unknown as Record<string, unknown>,
        invariantChecks: result.invariantChecks as unknown as Record<string, unknown>[],
        startedAt,
        completedAt,
        errorMessage: result.error ?? null,
        triggeredBy,
      })
      .returning({ id: financeAuditRuns.id });

    const runId = run.id;

    if (result.report?.findings && result.report.findings.length > 0) {
      await db.insert(financeAuditFindings).values(
        result.report.findings.map(f => ({
          runId,
          severity: f.severity,
          category: f.category,
          title: f.title,
          explanation: f.explanation,
          affectedOrders: f.affectedOrders as unknown as string[],
          expectedValue: f.expectedValue != null ? String(f.expectedValue) : null,
          actualValue: f.actualValue != null ? String(f.actualValue) : null,
          difference: f.difference != null ? String(f.difference) : null,
          suggestedFix: f.suggestedFix,
          requiresHumanApproval: true,
          status: "open",
        }))
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
        criticalCount: findings.filter(f => f.severity === "critical").length,
        highCount: findings.filter(f => f.severity === "high").length,
      });
    }
    return results;
  }

  private toFull(
    run: typeof financeAuditRuns.$inferSelect,
    findings: Array<typeof financeAuditFindings.$inferSelect>
  ): AuditRunFull {
    const findingsCount = findings.length;
    const criticalCount = findings.filter(f => f.severity === "critical").length;
    const highCount = findings.filter(f => f.severity === "high").length;
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
      findings: findings.map(f => ({
        id: f.id,
        severity: f.severity,
        category: f.category,
        title: f.title,
        explanation: f.explanation,
        affectedOrders: f.affectedOrders as string[] | null,
        expectedValue: f.expectedValue,
        actualValue: f.actualValue,
        difference: f.difference,
        suggestedFix: f.suggestedFix,
        requiresHumanApproval: f.requiresHumanApproval,
        status: f.status,
      })),
    };
  }
}

export const financeAuditStorage = new FinanceAuditStorage();
