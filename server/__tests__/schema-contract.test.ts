/**
 * SCHEMA CONTRACT — shared/schema.ts must describe the real database.
 *
 * WHY THIS EXISTS
 * ---------------
 * `cash_settlements` carries four integrity constraints in production:
 * a global UNIQUE on settlement_number, a validated net = gross - fees check,
 * a non-negative amounts check, and a status vocabulary check. None of them
 * was declared in shared/schema.ts.
 *
 * An adversarial review read shared/schema.ts, reasonably concluded the table
 * was unprotected, and raised two blockers: "a re-entered carrier statement
 * would inflate collections by 1,011,085 IQD" and "an arithmetically impossible
 * settlement is reported as a carrier receivable". A migration was written to
 * add both protections. Read-only verification against production then showed
 * the protections already existed — and were STRONGER than the replacements
 * (unique globally, not per carrier; the arithmetic check VALIDATED against
 * every row, not NOT VALID). The migration was withdrawn.
 *
 * The defect was never the database. It was that this repo's schema file could
 * drift from the database with nothing to notice. These tests are the notice.
 *
 * They are deliberately source-level, not DB-level: they must fail in CI,
 * without credentials, the moment someone deletes a constraint declaration.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const schemaSource = readFileSync(join(process.cwd(), "shared/schema.ts"), "utf8");

/**
 * Verbatim from production via pg_get_constraintdef(), read-only, 2026-07-28,
 * Neon project shiny-tree-43710630. Updating these values is a deliberate act
 * that must be justified against a fresh reading of the database.
 */
const PRODUCTION_CONSTRAINTS = [
  {
    name: "cash_settlements_settlement_number_key",
    definition: "UNIQUE (settlement_number)",
    validated: true,
    // What the schema file must contain for this to be represented.
    schemaMarker: /settlementNumber:\s*text\("settlement_number"\)\.notNull\(\)\.unique\(\)/,
  },
  {
    name: "cash_settlements_net_formula_check",
    definition: "CHECK ((net_amount = (gross_amount - fees_amount)))",
    validated: true,
    schemaMarker: /check\(\s*"cash_settlements_net_formula_check"/,
  },
  {
    name: "cash_settlements_amount_check",
    definition:
      "CHECK (((gross_amount >= (0)::numeric) AND (fees_amount >= (0)::numeric) AND (net_amount >= (0)::numeric)))",
    validated: true,
    schemaMarker: /check\(\s*"cash_settlements_amount_check"/,
  },
  {
    name: "cash_settlements_status_check",
    definition:
      "CHECK ((status = ANY (ARRAY['draft'::text, 'received'::text, 'reconciled'::text, 'closed'::text, 'rejected'::text])))",
    validated: true,
    schemaMarker: /check\(\s*"cash_settlements_status_check"/,
  },
] as const;

describe("schema contract — cash_settlements", () => {
  for (const c of PRODUCTION_CONSTRAINTS) {
    it(`declares ${c.name}`, () => {
      expect(
        schemaSource,
        `shared/schema.ts no longer declares ${c.name}.\n` +
          `Production definition: ${c.definition}\n` +
          `Removing a declaration does NOT remove the constraint from the database — ` +
          `it only hides it, which is exactly the drift that caused a redundant ` +
          `migration to be written.`,
      ).toMatch(c.schemaMarker);
    });
  }

  it("scopes the settlement-number UNIQUE globally, never per-carrier", () => {
    // The withdrawn migration used UNIQUE(carrier, settlement_number), which is
    // strictly WEAKER: it would permit the same settlement number to be entered
    // twice under two carrier spellings. Production is global. Re-introducing
    // the composite form would be a silent downgrade.
    expect(schemaSource).not.toMatch(/unique\w*\([^)]*carrier[^)]*settlement_number/i);
    expect(schemaSource).not.toContain("cash_settlements_carrier_number_key");
  });

  it("does not reintroduce the withdrawn NOT VALID arithmetic check", () => {
    // Production validates net = gross - fees against every existing row.
    // A NOT VALID variant would assert less while looking like more.
    expect(schemaSource).not.toContain("cash_settlements_gross_identity_chk");
  });

  it("records WHY these declarations exist, so they are not pruned as noise", () => {
    expect(schemaSource).toMatch(/SCHEMA DRIFT/);
    expect(schemaSource).toMatch(/pg_get_constraintdef/);
  });
});

describe("schema contract — the constraints actually behave as declared", () => {
  /** Production DDL, transcribed to prove the semantics we claim. */
  const TABLE_DDL = `
    CREATE TABLE cash_settlements (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      settlement_number text NOT NULL,
      carrier text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      gross_amount numeric NOT NULL DEFAULT 0,
      fees_amount numeric NOT NULL DEFAULT 0,
      net_amount numeric NOT NULL DEFAULT 0,
      CONSTRAINT cash_settlements_settlement_number_key UNIQUE (settlement_number),
      CONSTRAINT cash_settlements_net_formula_check CHECK (net_amount = gross_amount - fees_amount),
      CONSTRAINT cash_settlements_amount_check
        CHECK (gross_amount >= 0 AND fees_amount >= 0 AND net_amount >= 0),
      CONSTRAINT cash_settlements_status_check
        CHECK (status IN ('draft','received','reconciled','closed','rejected'))
    );
  `;

  async function db() {
    const pg = new PGlite();
    await pg.exec(TABLE_DDL);
    return pg;
  }

  it("rejects a duplicate settlement number even under a different carrier", async () => {
    const pg = await db();
    await pg.exec(`INSERT INTO cash_settlements (settlement_number, carrier, status,
      gross_amount, fees_amount, net_amount)
      VALUES ('CS-1', 'carrier-a', 'reconciled', 1000, 100, 900);`);
    // This is the case the withdrawn per-carrier UNIQUE would have ALLOWED.
    await expect(pg.exec(`INSERT INTO cash_settlements (settlement_number, carrier, status,
      gross_amount, fees_amount, net_amount)
      VALUES ('CS-1', 'carrier-b', 'reconciled', 1000, 100, 900);`)).rejects.toThrow();
  });

  it("rejects broken arithmetic in ANY status, including draft", async () => {
    const pg = await db();
    // The withdrawn check exempted drafts. Production does not.
    await expect(pg.exec(`INSERT INTO cash_settlements (settlement_number, carrier, status,
      gross_amount, fees_amount, net_amount)
      VALUES ('CS-2', 'carrier-a', 'draft', 2022170, 168998, 142500);`)).rejects.toThrow();
    await expect(pg.exec(`INSERT INTO cash_settlements (settlement_number, carrier, status,
      gross_amount, fees_amount, net_amount)
      VALUES ('CS-3', 'carrier-a', 'reconciled', 2022170, 168998, 142500);`)).rejects.toThrow();
  });

  it("rejects negative money and unknown statuses", async () => {
    const pg = await db();
    await expect(pg.exec(`INSERT INTO cash_settlements (settlement_number, carrier, status,
      gross_amount, fees_amount, net_amount)
      VALUES ('CS-4', 'c', 'reconciled', -100, -10, -90);`)).rejects.toThrow();
    await expect(pg.exec(`INSERT INTO cash_settlements (settlement_number, carrier, status,
      gross_amount, fees_amount, net_amount)
      VALUES ('CS-5', 'c', 'bogus', 1000, 100, 900);`)).rejects.toThrow();
  });

  it("accepts the two real production settlements", async () => {
    const pg = await db();
    await pg.exec(`INSERT INTO cash_settlements (settlement_number, carrier, status,
      gross_amount, fees_amount, net_amount) VALUES
      ('CS-OWNER-CASH-20260723', 'carrier', 'reconciled', 1748420, 180000, 1568420),
      ('CS-OWNER-CASH-20260726-LATE3', 'carrier', 'reconciled', 273750, 15000, 258750);`);
    const r = await pg.query<{ gross: string; fees: string; net: string }>(
      `SELECT sum(gross_amount) gross, sum(fees_amount) fees, sum(net_amount) net
       FROM cash_settlements WHERE status='reconciled'`);
    expect(Number(r.rows[0].gross)).toBe(2_022_170);
    expect(Number(r.rows[0].fees)).toBe(195_000);
    expect(Number(r.rows[0].net)).toBe(1_827_170);
  });
});

describe("withdrawn migration must not reappear", () => {
  it("add_cash_settlement_integrity.sql is not in the repo", () => {
    // It duplicated existing production protection in a weaker form. If a future
    // change needs it back, that change must first re-read production.
    for (const f of [
      "migrations/add_cash_settlement_integrity.sql",
      "migrations/add_cash_settlement_integrity_rollback.sql",
    ]) {
      expect(() => readFileSync(join(process.cwd(), f), "utf8")).toThrow();
    }
  });
});
