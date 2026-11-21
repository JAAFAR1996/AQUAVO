import { and, eq, exists, isNotNull, sql } from "drizzle-orm";
import { aiMonitoringLogs, diagnosisCases } from "../../shared/schema.js";
import type { getDb } from "../db.js";

/** The old verified flag could be written by user feedback. Require admin provenance. */
export function reviewedDiagnosisCondition(db: NonNullable<ReturnType<typeof getDb>>) {
  return and(eq(diagnosisCases.verified, true), exists(db.select({ id: aiMonitoringLogs.id })
    .from(aiMonitoringLogs).where(and(
      eq(aiMonitoringLogs.event, "diagnosis_case_reviewed"),
      isNotNull(aiMonitoringLogs.userId),
      sql`${aiMonitoringLogs.details}->>'caseId' = ${diagnosisCases.id}`,
    ))));
}
