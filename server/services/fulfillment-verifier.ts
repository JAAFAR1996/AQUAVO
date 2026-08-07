// ─────────────────────────────────────────────────────────────────────────────
// INDEPENDENT fulfillment verification.
//
// This module deliberately does NOT reuse the confirmation/draft/cost services.
// It re-derives every invariant from RAW SQL over the stored rows, so a bug in
// those services cannot hide itself by also being present in the checker. It is
// strictly READ-ONLY: it issues SELECTs and never writes.
//
// Run it against any database (local PGlite, a Neon child branch, production
// read-replica) to answer one question: does the stored data actually satisfy
// the invariants the system claims to enforce?
// ─────────────────────────────────────────────────────────────────────────────
import { sql } from "drizzle-orm";
import type { FulfillmentDb } from "./fulfillment-db.js";

export type Severity = "critical" | "warning" | "info";

export interface VerificationFinding {
  check: string;
  severity: Severity;
  message: string;
  /** Identifiers only — this report must stay PII-free. */
  offenders: string[];
  count: number;
}

export interface VerificationReport {
  ok: boolean;
  checkedAt: string;
  findings: VerificationFinding[];
  totals: {
    events: number;
    lines: number;
    movements: number;
    drafts: number;
    materials: number;
    costRecords: number;
  };
}

interface RowsResult<T> { rows: T[] }
function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as RowsResult<T>).rows)) {
    return (result as RowsResult<T>).rows;
  }
  return [];
}

/** Each check returns the IDs that VIOLATE it. An empty array means the invariant holds. */
interface Check {
  name: string;
  severity: Severity;
  message: string;
  query: ReturnType<typeof sql>;
}

/**
 * Every check is phrased as "find the rows that break the rule". A correct database
 * returns nothing for all of them.
 */
function buildChecks(): Check[] {
  return [
    {
      name: "event_cost_matches_lines",
      severity: "critical",
      message: "A confirmed event's actual_cost does not equal the sum of its own line totals.",
      // Recomputed independently: sum the lines, compare to the stored figure.
      // An event with ANY unknown line must store NULL, not a partial sum.
      query: sql`
        SELECT e.id
          FROM order_fulfillment_events e
          LEFT JOIN LATERAL (
            SELECT SUM(l.total_cost) AS s, COUNT(*) FILTER (WHERE l.total_cost IS NULL) AS unknowns,
                   COUNT(*) AS n
              FROM order_fulfillment_lines l WHERE l.event_id = e.id
          ) agg ON true
         WHERE e.workflow_state IN ('confirmed','adjusted')
           AND e.reversal_of_event_id IS NULL
           AND COALESCE(agg.n, 0) > 0
           AND (
             (agg.unknowns > 0 AND e.actual_cost IS NOT NULL)
             OR (agg.unknowns = 0 AND (e.actual_cost IS NULL OR ABS(e.actual_cost - agg.s) > 0.005))
           )`,
    },
    {
      name: "variance_matches_actual_minus_expected",
      severity: "critical",
      message: "A stored variance is not exactly actual − expected.",
      query: sql`
        SELECT id FROM order_fulfillment_events
         WHERE expected_cost IS NOT NULL AND actual_cost IS NOT NULL
           AND (variance IS NULL OR ABS(variance - (actual_cost - expected_cost)) > 0.005)`,
    },
    {
      name: "unknown_cost_never_zero",
      severity: "critical",
      message: "A line has a total_cost but no unit_cost_snapshot (an unknown cost was materialized).",
      query: sql`
        SELECT id FROM order_fulfillment_lines
         WHERE unit_cost_snapshot IS NULL AND total_cost IS NOT NULL`,
    },
    {
      name: "line_total_matches_quantity_times_unit_cost",
      severity: "critical",
      message: "A line's total_cost is not quantity × unit_cost_snapshot.",
      query: sql`
        SELECT id FROM order_fulfillment_lines
         WHERE unit_cost_snapshot IS NOT NULL AND total_cost IS NOT NULL
           AND ABS(total_cost - (quantity * unit_cost_snapshot)) > 0.005`,
    },
    {
      name: "sequence_unique_per_order",
      severity: "critical",
      message: "An order has two events sharing a sequence number (chronology is ambiguous).",
      query: sql`
        SELECT order_id || ':' || sequence_number::text AS id
          FROM order_fulfillment_events
         GROUP BY order_id, sequence_number HAVING COUNT(*) > 1`,
    },
    {
      name: "sequence_counter_not_behind",
      severity: "critical",
      message: "The per-order sequence counter is behind the highest issued number (it could re-issue).",
      query: sql`
        SELECT e.order_id AS id
          FROM order_fulfillment_events e
          JOIN order_fulfillment_sequences s ON s.order_id = e.order_id
         GROUP BY e.order_id, s.next_sequence
        HAVING MAX(e.sequence_number) >= s.next_sequence`,
    },
    {
      name: "one_active_original_per_order",
      severity: "critical",
      message: "An order has more than one active (non-reversed) original shipment.",
      query: sql`
        SELECT order_id AS id FROM order_fulfillment_events
         WHERE event_type = 'original' AND workflow_state <> 'reversed'
         GROUP BY order_id HAVING COUNT(*) > 1`,
    },
    {
      name: "idempotency_keys_unique",
      severity: "critical",
      message: "Duplicate event idempotency keys (a retried request created a second event).",
      query: sql`
        SELECT idempotency_key AS id FROM order_fulfillment_events
         GROUP BY idempotency_key HAVING COUNT(*) > 1`,
    },
    {
      name: "movement_idempotency_keys_unique",
      severity: "critical",
      message: "Duplicate movement idempotency keys (stock could have been deducted twice).",
      query: sql`
        SELECT idempotency_key AS id FROM packaging_inventory_movements
         GROUP BY idempotency_key HAVING COUNT(*) > 1`,
    },
    {
      name: "reversal_exact_negation",
      severity: "critical",
      message: "A reversal movement is not the exact negative of the movement it references.",
      query: sql`
        SELECT r.id
          FROM packaging_inventory_movements r
          JOIN packaging_inventory_movements o ON o.id = r.reversal_of_movement_id
         WHERE r.quantity <> -o.quantity
            OR r.material_id IS DISTINCT FROM o.material_id
            OR r.order_id IS DISTINCT FROM o.order_id`,
    },
    {
      name: "one_active_reversal_per_event",
      severity: "critical",
      message: "An event has more than one active reversal.",
      query: sql`
        SELECT reversal_of_event_id AS id FROM order_fulfillment_events
         WHERE reversal_of_event_id IS NOT NULL AND workflow_state <> 'reversed'
         GROUP BY reversal_of_event_id HAVING COUNT(*) > 1`,
    },
    {
      name: "no_self_reversal",
      severity: "critical",
      message: "An event or movement reverses itself.",
      query: sql`
        SELECT id FROM order_fulfillment_events WHERE reversal_of_event_id = id
        UNION ALL
        SELECT id FROM packaging_inventory_movements WHERE reversal_of_movement_id = id`,
    },
    {
      name: "no_reversal_cycles",
      severity: "critical",
      message: "The reversal reference graph contains a cycle.",
      // Walk every chain up to a bounded depth; a node that reappears is a cycle.
      query: sql`
        WITH RECURSIVE walk(root, node, depth) AS (
          SELECT id, reversal_of_event_id, 1
            FROM order_fulfillment_events WHERE reversal_of_event_id IS NOT NULL
          UNION ALL
          SELECT w.root, e.reversal_of_event_id, w.depth + 1
            FROM walk w JOIN order_fulfillment_events e ON e.id = w.node
           WHERE w.node IS NOT NULL AND w.depth < 64
        )
        SELECT DISTINCT root AS id FROM walk WHERE node = root`,
    },
    {
      name: "reversal_same_order",
      severity: "critical",
      message: "A reversal event belongs to a different order than the event it reverses.",
      query: sql`
        SELECT r.id FROM order_fulfillment_events r
          JOIN order_fulfillment_events o ON o.id = r.reversal_of_event_id
         WHERE r.order_id IS DISTINCT FROM o.order_id`,
    },
    {
      name: "reversal_movement_cites_referent",
      severity: "critical",
      message: "A movement typed 'reversal' does not cite a referent, or a non-reversal does.",
      query: sql`
        SELECT id FROM packaging_inventory_movements
         WHERE (movement_type = 'reversal') <> (reversal_of_movement_id IS NOT NULL)`,
    },
    {
      name: "catalog_cost_matches_approved_record",
      severity: "critical",
      message: "A material's catalog cost contradicts its cited approved cost record.",
      query: sql`
        SELECT m.id FROM fulfillment_materials m
          LEFT JOIN material_cost_records r ON r.id = m.current_cost_record_id
         WHERE (m.current_cost_record_id IS NULL AND m.current_unit_cost IS NOT NULL)
            OR (m.current_cost_record_id IS NOT NULL AND (
                  r.id IS NULL
               OR r.material_id IS DISTINCT FROM m.id
               OR r.approval_status <> 'approved'
               OR r.unit_cost IS DISTINCT FROM m.current_unit_cost
               OR r.purchase_id IS DISTINCT FROM m.current_cost_purchase_id))`,
    },
    {
      name: "one_active_approved_cost_per_material",
      severity: "critical",
      message: "A material has more than one active approved cost record.",
      query: sql`
        SELECT material_id AS id FROM material_cost_records
         WHERE approval_status = 'approved' AND superseded_by_id IS NULL
         GROUP BY material_id HAVING COUNT(*) > 1`,
    },
    {
      name: "approved_cost_has_approver",
      severity: "critical",
      message: "An approved cost record has no approver or no approval timestamp.",
      query: sql`
        SELECT id FROM material_cost_records
         WHERE approval_status = 'approved' AND (approved_by IS NULL OR approved_at IS NULL)`,
    },
    {
      name: "zero_cost_is_justified",
      severity: "warning",
      message: "A zero unit cost exists without a stated reason (it may be an unknown cost coerced to 0).",
      query: sql`
        SELECT id FROM material_cost_records
         WHERE unit_cost = 0 AND length(btrim(COALESCE(reason,''))) = 0`,
    },
    {
      name: "profile_family_version_unique",
      severity: "critical",
      message: "A profile family has two rows with the same version number.",
      query: sql`
        SELECT profile_family_id || ':' || version::text AS id
          FROM packaging_profiles WHERE profile_family_id IS NOT NULL
         GROUP BY profile_family_id, version HAVING COUNT(*) > 1`,
    },
    {
      name: "used_profile_version_is_locked",
      severity: "critical",
      message: "A profile version cited by a confirmed event is not locked (it could still be edited).",
      query: sql`
        SELECT DISTINCT p.id
          FROM packaging_profiles p
          JOIN order_fulfillment_events e ON e.profile_id = p.id
         WHERE e.workflow_state IN ('confirmed','adjusted') AND p.locked = false`,
    },
    {
      name: "consumed_draft_has_event",
      severity: "critical",
      message: "A draft is marked consumed but cites no confirmed event.",
      query: sql`
        SELECT id FROM fulfillment_preparation_drafts
         WHERE state = 'consumed' AND confirmed_event_id IS NULL`,
    },
    {
      name: "draft_converted_at_most_once",
      severity: "critical",
      message: "Two events were created from the same draft (a draft was confirmed twice).",
      query: sql`
        SELECT draft_id AS id FROM order_fulfillment_events
         WHERE draft_id IS NOT NULL GROUP BY draft_id HAVING COUNT(*) > 1`,
    },
    {
      name: "at_most_one_open_draft",
      severity: "warning",
      message: "An order has more than one open draft for the same event type.",
      query: sql`
        SELECT order_id || ':' || event_type AS id
          FROM fulfillment_preparation_drafts
         WHERE state IN ('suggested','editing','awaiting_confirmation')
         GROUP BY order_id, event_type HAVING COUNT(*) > 1`,
    },
    {
      name: "movement_direction_correct",
      severity: "critical",
      message: "A stock movement has the wrong sign for its type (receipt negative or usage positive).",
      query: sql`
        SELECT id FROM packaging_inventory_movements
         WHERE (movement_type IN ('purchase_receipt','return_to_stock') AND quantity <= 0)
            OR (movement_type IN ('fulfillment_usage','damage_waste') AND quantity >= 0)`,
    },
    {
      name: "every_material_line_has_a_movement",
      severity: "critical",
      message: "A confirmed line references a stock-tracked catalog material but posted no stock movement.",
      query: sql`
        SELECT l.id FROM order_fulfillment_lines l
          JOIN order_fulfillment_events e ON e.id = l.event_id
          JOIN fulfillment_materials fm ON fm.id = l.material_id
         WHERE l.material_id IS NOT NULL
           AND fm.stock_tracked = true
           AND e.workflow_state IN ('confirmed','adjusted')
           AND NOT EXISTS (
             SELECT 1 FROM packaging_inventory_movements m
              WHERE m.event_id = l.event_id AND m.material_id = l.material_id
                AND m.movement_type = 'fulfillment_usage')`,
    },
    {
      name: "stock_never_negative",
      severity: "warning",
      message: "A material's derived stock balance is negative (allowed only via an explicit override).",
      query: sql`
        SELECT material_id AS id FROM packaging_inventory_movements
         GROUP BY material_id HAVING SUM(quantity) < 0`,
    },
    {
      name: "cost_component_boundary_respected",
      severity: "critical",
      message: "A fulfillment line carries a product-COGS cost component (double counting risk).",
      query: sql`
        SELECT id FROM order_fulfillment_lines
         WHERE cost_component_type <> 'aquavo_fulfillment_material'`,
    },
    {
      name: "no_orphan_event_references",
      severity: "critical",
      message: "An event references a parent/reversal target that does not exist.",
      query: sql`
        SELECT e.id FROM order_fulfillment_events e
         WHERE (e.parent_event_id IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM order_fulfillment_events p WHERE p.id = e.parent_event_id))
            OR (e.reversal_of_event_id IS NOT NULL
                AND NOT EXISTS (SELECT 1 FROM order_fulfillment_events r WHERE r.id = e.reversal_of_event_id))`,
    },
  ];
}

const COUNT_QUERIES: Array<[keyof VerificationReport["totals"], string]> = [
  ["events", "order_fulfillment_events"],
  ["lines", "order_fulfillment_lines"],
  ["movements", "packaging_inventory_movements"],
  ["drafts", "fulfillment_preparation_drafts"],
  ["materials", "fulfillment_materials"],
  ["costRecords", "material_cost_records"],
];

const MAX_OFFENDERS_REPORTED = 25;

/**
 * Run every invariant check. READ-ONLY. Returns a report whose `ok` is true only
 * when no CRITICAL finding was raised (warnings are surfaced but do not fail).
 */
export async function verifyFulfillmentIntegrity(db: FulfillmentDb): Promise<VerificationReport> {
  const findings: VerificationFinding[] = [];

  for (const check of buildChecks()) {
    let offenders: string[];
    try {
      const result = await db.execute(check.query);
      offenders = rowsOf<{ id: string | null }>(result)
        .map((r) => String(r.id ?? ""))
        .filter(Boolean);
    } catch (err) {
      findings.push({
        check: check.name, severity: "critical", count: 1,
        message: `Check could not run: ${err instanceof Error ? err.message : String(err)}`,
        offenders: [],
      });
      continue;
    }
    if (offenders.length > 0) {
      findings.push({
        check: check.name, severity: check.severity, message: check.message,
        offenders: offenders.slice(0, MAX_OFFENDERS_REPORTED), count: offenders.length,
      });
    }
  }

  const totals = {
    events: 0, lines: 0, movements: 0, drafts: 0, materials: 0, costRecords: 0,
  } as VerificationReport["totals"];
  for (const [key, table] of COUNT_QUERIES) {
    try {
      const r = await db.execute(sql.raw(`SELECT COUNT(*)::int AS c FROM ${table}`));
      totals[key] = Number(rowsOf<{ c: number }>(r)[0]?.c ?? 0);
    } catch {
      totals[key] = -1; // table absent on this database
    }
  }

  return {
    ok: !findings.some((f) => f.severity === "critical"),
    checkedAt: new Date().toISOString(),
    findings,
    totals,
  };
}

/** Human-readable report for CLI output. Contains identifiers only — no PII. */
export function formatVerificationReport(report: VerificationReport): string {
  const lines: string[] = [];
  lines.push(`Fulfillment integrity — ${report.ok ? "PASS" : "FAIL"} (${report.checkedAt})`);
  lines.push(`  rows: events=${report.totals.events} lines=${report.totals.lines} ` +
    `movements=${report.totals.movements} drafts=${report.totals.drafts} ` +
    `materials=${report.totals.materials} costRecords=${report.totals.costRecords}`);
  if (report.findings.length === 0) {
    lines.push("  all invariants hold.");
    return lines.join("\n");
  }
  for (const f of report.findings) {
    lines.push(`  [${f.severity.toUpperCase()}] ${f.check} — ${f.count} row(s)`);
    lines.push(`      ${f.message}`);
    lines.push(`      offenders: ${f.offenders.join(", ")}${f.count > f.offenders.length ? ", …" : ""}`);
  }
  return lines.join("\n");
}
