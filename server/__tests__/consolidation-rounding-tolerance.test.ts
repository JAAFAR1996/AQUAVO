// The finance-audit invariants compare figures that were rounded INDEPENDENTLY for
// display against a quantity the engine rounded ONCE. That gap is arithmetic, not a
// defect, and the tolerance must be derived from it rather than guessed — a tolerance
// that is too tight makes the AI auditor report a phantom accounting problem, and one
// that is too loose stops catching real formula errors.
//
// These tests pin the derivation. They deliberately model the rounding rather than
// calling the service, so they document WHY the number is what it is.
import { describe, it, expect } from "vitest";

/** The six independently-rounded inputs invariant #4 re-derives its answer from. */
const INDEPENDENT_ROUNDINGS = 6;
/** Plus the single rounding applied to the engine's own finalNetProfit. */
const MAX_DRIFT = INDEPENDENT_ROUNDINGS * 0.5 + 0.5; // 3.5
const TOLERANCE = 4; // the smallest integer that cannot false-fail

describe("finance-audit rounding-drift tolerance", () => {
  it("the tolerance is the smallest integer that covers the worst-case drift", () => {
    expect(MAX_DRIFT).toBe(3.5);
    expect(TOLERANCE).toBeGreaterThanOrEqual(MAX_DRIFT);
    expect(TOLERANCE - 1).toBeLessThan(MAX_DRIFT); // 3 would be too tight
  });

  it("a tolerance of 1 DOES false-fail on ordinary fractional inputs", () => {
    // Six components that are individually rounded, then recombined.
    const exact = {
      revenue: 1_000_000.4, cogs: 600_000.4, packaging: 50_000.4,
      expensesTotal: 100_000.4, salesReturnDeduction: 20_000.4, actualReturnLoss: 10_000.4,
    };
    const r = (n: number) => Math.round(n);

    // What the engine reports: ONE rounding of the exact expression.
    const engineFinal = r(
      exact.revenue - exact.cogs - exact.packaging
      - exact.salesReturnDeduction - exact.actualReturnLoss - exact.expensesTotal,
    );

    // What the audit re-derives from the SIX displayed (already rounded) figures.
    const profitAfterExpenses =
      r(exact.revenue) - (r(exact.cogs) + r(exact.packaging)) - r(exact.expensesTotal);
    const recomputed =
      profitAfterExpenses - r(exact.salesReturnDeduction) - r(exact.actualReturnLoss);

    const drift = Math.abs(recomputed - engineFinal);
    expect(drift).toBeGreaterThan(1);        // the old `<= 1` would have failed here
    expect(drift).toBeLessThanOrEqual(TOLERANCE);
  });

  it("the tolerance still catches a REAL formula error", () => {
    // A component subtracted twice — the shape of an actual defect.
    const profitAfterExpenses = 230_000;
    const salesReturnDeduction = 20_000;
    const actualReturnLoss = 10_000;
    const correct = profitAfterExpenses - salesReturnDeduction - actualReturnLoss;
    const doubleCounted = correct - salesReturnDeduction;

    expect(Math.abs(doubleCounted - correct)).toBeGreaterThan(TOLERANCE);
  });

  it("a sign flip is caught too", () => {
    const base = 230_000, deduction = 20_000;
    const correct = base - deduction;
    const flipped = base + deduction;
    expect(Math.abs(flipped - correct)).toBeGreaterThan(TOLERANCE);
  });

  it("whole-dinar inputs (the common case) drift by exactly zero", () => {
    const r = (n: number) => Math.round(n);
    const exact = {
      revenue: 1_000_000, cogs: 600_000, packaging: 50_000,
      expensesTotal: 100_000, salesReturnDeduction: 20_000, actualReturnLoss: 10_000,
    };
    const engineFinal = r(
      exact.revenue - exact.cogs - exact.packaging
      - exact.salesReturnDeduction - exact.actualReturnLoss - exact.expensesTotal,
    );
    const recomputed =
      r(exact.revenue) - (r(exact.cogs) + r(exact.packaging)) - r(exact.expensesTotal)
      - r(exact.salesReturnDeduction) - r(exact.actualReturnLoss);
    expect(recomputed).toBe(engineFinal);
  });
});
