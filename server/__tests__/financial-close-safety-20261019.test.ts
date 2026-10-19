import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const state = vi.hoisted(() => ({ issues: [] as Array<{ key: string; scope: string; count: number }>, read: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: () => null }));
vi.mock("../services/financial-truth.js", () => ({ currentFinancialMonth: () => "2026-10", readFinancialTruth: (...args: unknown[]) => state.read(...args) }));
import { runAutomaticPeriodClose } from "../services/accounting-auto-close-v2.js";
const dialect = new PgDialect();
const checkKeys = ["incomplete_cost_orders", "missing_fulfillment_orders", "incomplete_fulfillment_orders", "payment_evidence_errors",
 "unsettled_carrier_orders", "delivery_surplus_exceptions", "unverified_returns", "undocumented_expenses", "inventory_mismatches",
 "procurement_integrity_failures", "settlement_integrity_failures", "open_review_flags", "journal_difference"];
function fakeDatabase() {
 const statements: string[] = [];
 const tx = { execute: vi.fn(async (query: any) => {
  const text = dialect.sqlToQuery(query).sql; statements.push(text);
  if (text.includes("auto_close_ended_accounting_periods")) return { rows: [{ period_key: "2026-09", close_status: "closed", blockers: {} }] };
  if (text.includes("v_accounting_period_readiness")) return { rows: [{ ...Object.fromEntries(checkKeys.map(k => [k, 0])), period_key: "2026-09", period_close_status: null }] };
  return { rows: [] };
 }) };
 const db = { transaction: vi.fn(async (fn: (value: typeof tx) => unknown) => fn(tx)) };
 return { db, tx, statements };
}
beforeEach(() => { state.issues = []; state.read.mockReset(); state.read.mockImplementation(async () => ({ issues: state.issues })); });
describe("Scheduled close uses the same global evidence boundary as the register", () => {
 it("does not invoke the closing writer when valuation differs even if the old period view is green", async () => {
  state.issues = [{ key: "inventory_valuation_difference", scope: "current", count: 1 }];
  const { db, statements } = fakeDatabase();
  const result = await runAutomaticPeriodClose(db as any);
  expect(result[0]).toMatchObject({ status: "blocked", blockers: { inventory_valuation_difference: 1 } });
  expect(statements.some(s => s.includes("auto_close_ended_accounting_periods"))).toBe(false);
  expect(statements[0]).toContain("SERIALIZABLE");
 });
 it("leaves period-specific settlement checks to the protected database closer", async () => {
  state.issues = [{ key: "settlements_global", scope: "current", count: 3 }, { key: "historical_cost_incomplete", scope: "historical", count: 5 }];
  const { db, tx, statements } = fakeDatabase();
  expect((await runAutomaticPeriodClose(db as any))[0].status).toBe("closed");
  expect(state.read).toHaveBeenCalledWith(tx, "2026-10");
  expect(statements.filter(s => s.includes("auto_close_ended_accounting_periods"))).toHaveLength(1);
 });
 it("does not write if a required evidence source cannot be read", async () => {
  state.read.mockRejectedValue(new Error("source unavailable")); const { db, statements } = fakeDatabase();
  await expect(runAutomaticPeriodClose(db as any)).rejects.toThrow("source unavailable");
  expect(statements.some(s => s.includes("auto_close_ended_accounting_periods"))).toBe(false);
 });
});
