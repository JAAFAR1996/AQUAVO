/**
 * RED TEAM B-4(b) + B-5 — carrier cash integrity.
 *
 * B-4(b): `settlement_number` was NOT NULL but not UNIQUE. Production holds two
 *         byte-identical settlement rows; nothing distinguished "two genuine
 *         equal settlements" from "one settlement entered twice". If it is a
 *         double entry, recorded collections are overstated by 1,011,085 IQD —
 *         half the file.
 *
 * B-5:    `gross = fees + net` was documented in the schema and enforced
 *         nowhere. computeCarrierBalance derives outstanding = gross - fees -
 *         net, so a row breaking the identity was silently reported as money
 *         owed by the carrier. A corrupt document and a real unpaid balance had
 *         identical representations.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { computeCarrierBalance } from "../services/accounting-engine";

const ROOT = process.cwd();
const forwardSql = readFileSync(join(ROOT, "migrations/add_cash_settlement_integrity.sql"), "utf8");
const rollbackSql = readFileSync(join(ROOT, "migrations/add_cash_settlement_integrity_rollback.sql"), "utf8");

const BASE_TABLE = `
  CREATE TABLE cash_settlements (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    settlement_number text NOT NULL,
    carrier text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    gross_amount numeric NOT NULL DEFAULT 0,
    fees_amount numeric NOT NULL DEFAULT 0,
    net_amount numeric NOT NULL DEFAULT 0
  );
`;

async function fresh(rows = ""): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BASE_TABLE);
  if (rows) await db.exec(rows);
  return db;
}

// The real production figures, per the settled hotfix.
const PRODUCTION_ROWS = `
  INSERT INTO cash_settlements
    (settlement_number, carrier, status, gross_amount, fees_amount, net_amount)
  VALUES
    ('CS-001', 'alsaqr', 'reconciled', 1011085, 97500, 913585),
    ('CS-002', 'alsaqr', 'reconciled', 1011085, 97500, 913585);
`;

describe("B-4(b) — duplicate settlement prevention", () => {
  it("applies cleanly when settlement numbers are distinct", async () => {
    const db = await fresh(PRODUCTION_ROWS);
    await db.exec(forwardSql);
    const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM cash_settlements`);
    // Both rows survive untouched. The migration never deletes financial data.
    expect(r.rows[0].n).toBe(2);
  });

  it("REFUSES to apply when a duplicate (carrier, number) already exists", async () => {
    // The point of the migration: an unresolved financial question must stop
    // the deployment, not be silently repaired by deleting a row.
    const db = await fresh(`
      INSERT INTO cash_settlements
        (settlement_number, carrier, status, gross_amount, fees_amount, net_amount)
      VALUES ('CS-001', 'alsaqr', 'reconciled', 1011085, 97500, 913585),
             ('CS-001', 'alsaqr', 'reconciled', 1011085, 97500, 913585);
    `);
    await expect(db.exec(forwardSql)).rejects.toThrow(/duplicate/i);
    // And it did not destroy anything on the way out.
    const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM cash_settlements`);
    expect(r.rows[0].n).toBe(2);
  });

  it("blocks a re-entered carrier statement after it is applied", async () => {
    const db = await fresh(PRODUCTION_ROWS);
    await db.exec(forwardSql);
    await expect(db.exec(`
      INSERT INTO cash_settlements
        (settlement_number, carrier, status, gross_amount, fees_amount, net_amount)
      VALUES ('CS-001', 'alsaqr', 'reconciled', 1011085, 97500, 913585);
    `)).rejects.toThrow();
  });

  it("still allows the same number from a DIFFERENT carrier", async () => {
    // Scoped by carrier on purpose: two carriers may share a numbering
    // sequence, and a global unique would reject valid data.
    const db = await fresh(PRODUCTION_ROWS);
    await db.exec(forwardSql);
    await db.exec(`
      INSERT INTO cash_settlements
        (settlement_number, carrier, status, gross_amount, fees_amount, net_amount)
      VALUES ('CS-001', 'other-carrier', 'reconciled', 500, 100, 400);
    `);
    const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM cash_settlements`);
    expect(r.rows[0].n).toBe(3);
  });

  it("is idempotent and reversible", async () => {
    const db = await fresh(PRODUCTION_ROWS);
    await db.exec(forwardSql);
    await db.exec(forwardSql);
    await db.exec(rollbackSql);
    await db.exec(rollbackSql);
    const r = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_constraint
       WHERE conname IN ('cash_settlements_carrier_number_key','cash_settlements_gross_identity_chk')`);
    expect(r.rows[0].n).toBe(0);
  });
});

describe("B-5 — gross = fees + net is enforced, not merely documented", () => {
  it("rejects a reconciled row that breaks the identity", async () => {
    const db = await fresh();
    await db.exec(forwardSql);
    await expect(db.exec(`
      INSERT INTO cash_settlements
        (settlement_number, carrier, status, gross_amount, fees_amount, net_amount)
      VALUES ('BAD-1', 'alsaqr', 'reconciled', 2022170, 168998, 142500);
    `)).rejects.toThrow();
  });

  it("permits an unbalanced DRAFT — a work in progress is not a document yet", async () => {
    const db = await fresh();
    await db.exec(forwardSql);
    await db.exec(`
      INSERT INTO cash_settlements
        (settlement_number, carrier, status, gross_amount, fees_amount, net_amount)
      VALUES ('DRAFT-1', 'alsaqr', 'draft', 2022170, 168998, 142500);
    `);
    const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM cash_settlements`);
    expect(r.rows[0].n).toBe(1);
  });

  it("does NOT retroactively reject existing history (NOT VALID)", async () => {
    // Historical rows are evidence. The constraint governs future writes; it
    // does not reinterpret or delete what is already recorded.
    const db = await fresh(`
      INSERT INTO cash_settlements
        (settlement_number, carrier, status, gross_amount, fees_amount, net_amount)
      VALUES ('LEGACY-1', 'alsaqr', 'reconciled', 2022170, 168998, 142500);
    `);
    await db.exec(forwardSql); // must not throw
    const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM cash_settlements`);
    expect(r.rows[0].n).toBe(1);
  });
});

describe("B-5 — the engine reports a corrupt document as an exception, not a receivable", () => {
  const balanced = [
    { status: "reconciled", grossAmount: 1011085, feesAmount: 97500, netAmount: 913585 },
    { status: "reconciled", grossAmount: 1011085, feesAmount: 97500, netAmount: 913585 },
  ];

  it("the settled production position is clean and fully settled", () => {
    const b = computeCarrierBalance(balanced, 0);
    expect(b.grossCustomerCollections).toBe(2_022_170);
    expect(b.carrierFees).toBe(195_000);
    expect(b.netCashReceived).toBe(1_827_170);
    expect(b.outstanding).toBe(0);
    expect(b.hasInvariantViolation).toBe(false);
    expect(b.fullySettled).toBe(true);
  });

  it("flags a row that breaks the identity instead of banking it", () => {
    const b = computeCarrierBalance(
      [{ status: "reconciled", grossAmount: 2022170, feesAmount: 168998, netAmount: 142500 }], 0);
    // The arithmetic is still reported — nothing is hidden or netted away...
    expect(b.outstanding).toBe(1_710_672);
    // ...but it is explicitly marked as originating in a broken document, so a
    // reader cannot mistake it for money the carrier owes.
    expect(b.hasInvariantViolation).toBe(true);
    expect(b.invariantViolationCount).toBe(1);
    expect(b.invariantViolationAmount).toBe(1_710_672);
    expect(b.fullySettled).toBe(false);
  });

  it("detects violations per row — two opposite errors cannot cancel out", () => {
    // Checking the totals instead of each row would report this as clean.
    const b = computeCarrierBalance([
      { status: "reconciled", grossAmount: 1000, feesAmount: 100, netAmount: 800 },  // +100
      { status: "reconciled", grossAmount: 1000, feesAmount: 100, netAmount: 1000 }, // -100
    ], 0);
    expect(b.outstanding).toBe(0);
    expect(b.invariantViolationCount).toBe(2);
    expect(b.hasInvariantViolation).toBe(true);
    // Zero outstanding is NOT "settled" when the documents are corrupt.
    expect(b.fullySettled).toBe(false);
  });

  it("ignores draft rows entirely", () => {
    const b = computeCarrierBalance(
      [...balanced, { status: "draft", grossAmount: 999, feesAmount: 1, netAmount: 1 }], 0);
    expect(b.grossCustomerCollections).toBe(2_022_170);
    expect(b.hasInvariantViolation).toBe(false);
  });

  it("still never deducts an approved return from the carrier balance", () => {
    // The settled behaviour from the earlier hotfix must survive this change.
    const b = computeCarrierBalance(balanced, 10_000);
    expect(b.documentedAdjustments).toBe(10_000);
    expect(b.outstanding).toBe(0);
  });
});
