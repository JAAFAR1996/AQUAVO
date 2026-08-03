import { sql } from "drizzle-orm";
import { getDb } from "../db.js";

type Db = NonNullable<ReturnType<typeof getDb>>;
type Row = { period_key: string; close_status: string; blockers: unknown };

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

/**
 * Closes every ended Baghdad accounting month that has no readiness blockers.
 * The database function performs exact calendar arithmetic, so February,
 * leap years and 30/31-day months require no application-side date guessing.
 * Repeated calls are safe and are intentionally used by both the daily cron
 * and read endpoints as a self-healing fallback.
 */
export async function runAutomaticPeriodClose(
  db: Db,
  actorId = "system",
  actorName = "AQUAVO automatic monthly close",
) {
  const result = await db.execute(sql`
    SELECT *
    FROM public.auto_close_ended_accounting_periods(${actorId},${actorName})
    ORDER BY period_key
  `);
  return rowsOf(result).map((row) => ({
    periodKey: String(row.period_key),
    status: String(row.close_status),
    blockers: row.blockers ?? {},
  }));
}
