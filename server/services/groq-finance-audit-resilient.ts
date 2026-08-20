import Groq from "groq-sdk";
import {
  auditReportSchema,
  buildFinanceSnapshot,
  runInvariantChecks,
  type AuditReport,
  type FinanceAuditResult,
  type FinanceSnapshot,
  type InvariantCheck,
} from "./groqFinanceAudit.js";

let lastAuditResult: FinanceAuditResult | null = null;

export function getLastResilientFinanceAuditResult(): FinanceAuditResult | null {
  return lastAuditResult;
}

function getClient(): Groq {
  const key = process.env.FINANCE_GROQ_API_KEY?.trim();
  if (!key) throw new Error("FINANCE_GROQ_API_KEY غير مُعدّ");
  return new Groq({ apiKey: key });
}

function modelCandidates(): string[] {
  const configured = process.env.FINANCE_GROQ_MODEL?.trim();
  return Array.from(new Set([
    configured,
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
  ].filter((value): value is string => Boolean(value))));
}

function parseJsonObject(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response did not contain a JSON object");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function numericOrOriginal(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return value;
}

function normalizeAuditPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const root = { ...(value as Record<string, unknown>) };
  if (!Array.isArray(root.findings)) return root;

  root.findings = root.findings.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const finding = { ...(item as Record<string, unknown>) };
    for (const key of ["expectedValue", "actualValue", "difference"] as const) {
      finding[key] = numericOrOriginal(finding[key]);
    }
    return finding;
  });
  return root;
}

function buildPrompt(snapshot: FinanceSnapshot, checks: InvariantCheck[]): string {
  return `أنت محاسب مدقق لمتجر عراقي يعمل بالدفع عند الاستلام. حلل فقط البيانات المقدمة ولا تخترع أرقاماً أو طلبات.

أعد JSON فقط بهذا الشكل:
{
  "overallStatus": "ok|warning|critical",
  "summary": "ملخص عربي واضح",
  "findings": [{
    "severity": "low|medium|high|critical",
    "category": "settlement|returns|profit|inventory|payment|duplicate_counting|missing_drilldown|suspicious_number",
    "title": "...",
    "explanation": "...",
    "affectedOrders": [],
    "expectedValue": null,
    "actualValue": null,
    "difference": null,
    "suggestedFix": "...",
    "requiresHumanApproval": true
  }]
}

قواعد إلزامية:
- requiresHumanApproval يجب أن تكون true دائماً.
- الحقول expectedValue/actualValue/difference أرقام JSON أو null فقط، بدون وحدات وبدون نص.
- إذا ماكو مشكلة مدعومة بالدليل خل findings فارغة.
- لا تضف categories خارج القائمة.

SNAPSHOT:
${JSON.stringify(snapshot)}

DETERMINISTIC_CHECKS:
${JSON.stringify(checks)}`;
}

export async function runResilientGroqAudit(
  snapshot: FinanceSnapshot,
  checks: InvariantCheck[],
): Promise<{ report: AuditReport; model: string }> {
  const client = getClient();
  const prompt = buildPrompt(snapshot, checks);
  const failures: string[] = [];

  for (const model of modelCandidates()) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const normalized = normalizeAuditPayload(parseJsonObject(raw));
      const validated = auditReportSchema.safeParse(normalized);
      if (!validated.success) {
        failures.push(`${model}: schema ${validated.error.issues.slice(0, 3).map((issue) => issue.message).join("; ")}`);
        continue;
      }
      return { report: validated.data, model };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${model}: ${message.slice(0, 180)}`);
    }
  }

  throw new Error(`تعذر تشغيل Finance AI Audit على موديلات الإنتاج المتاحة: ${failures.join(" | ")}`);
}

export async function runResilientFinanceAudit(triggeredBy = "scheduled"): Promise<FinanceAuditResult> {
  const generatedAt = new Date().toISOString();
  const snapshot = await buildFinanceSnapshot();
  const invariantChecks = runInvariantChecks(snapshot);

  let report: AuditReport | null = null;
  let error: string | undefined;
  let usedModel: string | undefined;

  try {
    const audited = await runResilientGroqAudit(snapshot, invariantChecks);
    report = audited.report;
    usedModel = audited.model;
  } catch (auditError) {
    error = auditError instanceof Error ? auditError.message : "خطأ غير معروف أثناء Finance AI Audit";
  }

  const result: FinanceAuditResult = { snapshot, invariantChecks, report, error, generatedAt };
  lastAuditResult = result;

  try {
    const { financeAuditStorage } = await import("./financeAuditStorage.js");
    await financeAuditStorage.saveAuditRun(
      result,
      usedModel ? `${triggeredBy}:${usedModel}` : triggeredBy,
    );
  } catch (storageError) {
    console.error(
      "[FinanceAudit] Failed to persist resilient audit run:",
      storageError instanceof Error ? storageError.message : storageError,
    );
  }

  return result;
}
