import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * EXECUTION CONTRACT GUARD
 *
 * Every reviewed migration is applied by an EXECUTOR that wraps the complete file
 * in one transaction:  BEGIN; <file> COMMIT;  (ROLLBACK on error).
 *
 * PostgreSQL has no true nested transactions. A top-level BEGIN/COMMIT/ROLLBACK
 * inside such a file emits warnings, can commit the outer transaction early, and
 * makes rollback evidence ambiguous — a partially-applied migration could look
 * committed. This test fails if any reviewed file reintroduces one.
 *
 * Transaction-control keywords are legal inside PL/pgSQL blocks as block
 * delimiters (`DO $$ BEGIN ... END $$`), so those are excluded — only *executable
 * top-level* statements are rejected.
 */

const ROOT = process.cwd();

const REVIEWED_FILES = [
  "migrations/add_order_item_cost_snapshot.sql",
  "migrations/add_orderitem_backfill_trigger_safety.sql",
  "migrations/add_orderitem_backfill_trigger_safety_rollback.sql",
  "migrations/backfill_orderitems_from_jsonb.sql",
  "migrations/add_fulfillment_costing.sql",
  "migrations/add_fulfillment_hardening.sql",
  "migrations/add_order_item_cost_snapshot_rollback.sql",
  "migrations/backfill_orderitems_from_jsonb_rollback.sql",
  "migrations/add_fulfillment_costing_rollback.sql",
  "migrations/add_fulfillment_hardening_rollback.sql",
  "migrations/backfill_orderitems_reconcile_report.sql",
];

/** Strip line comments, block comments, and every $tag$...$tag$ body. */
function executableTopLevel(sql: string): string {
  let s = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove dollar-quoted bodies (DO blocks, function bodies) — BEGIN/END there
  // are PL/pgSQL block delimiters, not transaction control.
  s = s.replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1?\$/g, " DOLLAR_QUOTED_BODY ");
  return s;
}

describe("migration execution contract: the executor owns the transaction", () => {
  for (const rel of REVIEWED_FILES) {
    it(`${rel} contains no top-level BEGIN / COMMIT / ROLLBACK`, () => {
      const exec = executableTopLevel(readFileSync(join(ROOT, rel), "utf8"));
      const offenders = [...exec.matchAll(/(^|;|\s)\s*(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION|END)\s*;/gi)]
        .map((m) => m[2].toUpperCase());
      expect(offenders, `${rel} must not manage its own transaction`).toEqual([]);
    });
  }

  it("the guard actually catches a violation (negative control)", () => {
    const bad = executableTopLevel("CREATE TABLE t(); \nBEGIN;\nINSERT INTO t VALUES (1);\nCOMMIT;\n");
    const offenders = [...bad.matchAll(/(^|;|\s)\s*(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION|END)\s*;/gi)]
      .map((m) => m[2].toUpperCase());
    expect(offenders).toContain("BEGIN");
    expect(offenders).toContain("COMMIT");
  });

  it("a DO block's BEGIN/END is not mistaken for transaction control (false-positive control)", () => {
    const ok = executableTopLevel(`DO $x$ BEGIN RAISE NOTICE 'hi'; END $x$;`);
    const offenders = [...ok.matchAll(/(^|;|\s)\s*(BEGIN|COMMIT|ROLLBACK)\s*;/gi)];
    expect(offenders).toEqual([]);
  });
});
