import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { requiredFinancialNumber } from "../../shared/financial-truth.js";
import { currentFinancialMonth, readFinancialTruth } from "./financial-truth.js";

type Db = NonNullable<ReturnType<typeof getDb>>;
type Executor = Pick<Db, "execute">;
type Row = Record<string, unknown>;
function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  if (!Array.isArray(rows)) throw new Error("PERIOD_CLOSE_SOURCE_UNAVAILABLE");
  return rows;
}

/** The scheduled job owns automatic writes. GET routes only read their status. */
export async function runAutomaticPeriodClose(
  db: Db, actorId = "system", actorName = "AQUAVO automatic monthly close",
) {
  return db.transaction(async tx => {
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
    await tx.execute(sql`SET LOCAL statement_timeout='20000'`);
    const truth = await readFinancialTruth(tx, currentFinancialMonth());
    // Global valuation/source failures apply to every open close candidate.
    // Unmatched cash in a different month is checked per period by PostgreSQL.
    const globalBlockers = Object.fromEntries(truth.issues
      .filter(issue => issue.scope === "current" && issue.key !== "settlements_global")
      .map(issue => [issue.key, issue.count]));
    if (Object.keys(globalBlockers).length) {
      return (await getAutomaticPeriodCloseStatus(tx)).map(row => row.status === "already_closed" ? row
        : { ...row, status: "blocked", blockers: { ...row.blockers, ...globalBlockers } });
    }
    const result = await tx.execute(sql`
      SELECT * FROM public.auto_close_ended_accounting_periods(${actorId},${actorName}) ORDER BY period_key
    `);
    return rowsOf(result).map(row => ({ periodKey: String(row.period_key), status: String(row.close_status), blockers: row.blockers ?? {} }));
  });
}

/** Looking at a report must not close or rewrite an accounting period. */
export async function getAutomaticPeriodCloseStatus(db: Executor) {
  const result = await db.execute(sql`
    SELECT r.*,c.status AS period_close_status FROM public.v_accounting_period_readiness r
    LEFT JOIN public.accounting_period_closes c ON c.period_key=r.period_key
    WHERE r.period_key<to_char(clock_timestamp() AT TIME ZONE 'Asia/Baghdad','YYYY-MM')
    ORDER BY r.period_key
  `);
  const keys = ["incomplete_cost_orders", "missing_fulfillment_orders", "incomplete_fulfillment_orders",
    "payment_evidence_errors", "unsettled_carrier_orders", "delivery_surplus_exceptions", "unverified_returns",
    "undocumented_expenses", "inventory_mismatches", "procurement_integrity_failures", "settlement_integrity_failures",
    "open_review_flags", "journal_difference"];
  return rowsOf(result).map(row => {
    const blockers: Record<string, number> = {};
    for (const key of keys) {
      const amount = Math.abs(requiredFinancialNumber(row[key], key));
      if (amount > 0) blockers[key] = amount;
    }
    const closed = row.period_close_status === "closed" || row.period_close_status === "tax_final";
    return { periodKey: String(row.period_key), status: closed ? "already_closed" : Object.keys(blockers).length ? "blocked" : "awaiting_scheduler", blockers };
  });
}
