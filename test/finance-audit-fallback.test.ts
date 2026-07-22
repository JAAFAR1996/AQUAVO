import { describe, expect, it } from "vitest";
import { derivePersistedAuditDecision } from "../server/services/financeAuditStorage.js";
import type { FinanceAuditResult } from "../server/services/groqFinanceAudit.js";

function baseResult(): FinanceAuditResult {
  return {
    generatedAt: new Date("2026-07-22T00:00:00Z").toISOString(),
    snapshot: {} as FinanceAuditResult["snapshot"],
    invariantChecks: [
      {
        name: "inventory value non-negative",
        passed: true,
        actual: 10,
      },
    ],
    report: {
      overallStatus: "ok",
      summary: "AI says the report is fine.",
      findings: [],
    },
  };
}

describe("finance audit deterministic persistence", () => {
  it("stores an AI failure as warning without losing deterministic results", () => {
    const result = baseResult();
    result.report = null;
    result.error = "Groq returned numbers as strings";

    const decision = derivePersistedAuditDecision(result);

    expect(decision.overallStatus).toBe("warning");
    expect(decision.summary).toContain("جميع الفحوصات الحتمية نجحت");
    expect(decision.findings).toHaveLength(1);
    expect(decision.findings[0]).toMatchObject({
      severity: "medium",
      category: "missing_drilldown",
      requiresHumanApproval: true,
    });
  });

  it("lets a failed invariant override an AI ok response", () => {
    const result = baseResult();
    result.invariantChecks = [
      {
        name: "settlement components balance",
        passed: false,
        expected: 100,
        actual: 70,
        note: "received + pending must equal delivered",
      },
    ];

    const decision = derivePersistedAuditDecision(result);

    expect(decision.overallStatus).toBe("critical");
    expect(decision.findings).toHaveLength(1);
    expect(decision.findings[0]).toMatchObject({
      severity: "critical",
      category: "suspicious_number",
      expectedValue: 100,
      actualValue: 70,
      difference: -30,
      requiresHumanApproval: true,
    });
  });
});
