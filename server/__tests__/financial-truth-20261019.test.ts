import { describe, expect, it } from "vitest";
import { buildFinancialTruth, requiredFinancialNumber, financialPeriodChecksClear, currentFinancialCloseBlockers, completeRecordedAmount, type TruthRow } from "../../shared/financial-truth.js";

function fixture() {
  const period: TruthRow = Object.fromEntries([
    "incomplete_cost_orders", "missing_fulfillment_orders", "incomplete_fulfillment_orders", "payment_evidence_errors",
    "unsettled_carrier_orders", "unverified_returns", "undocumented_expenses", "inventory_mismatches", "open_review_flags",
    "journal_difference", "procurement_integrity_failures", "settlement_integrity_failures", "delivery_surplus_exceptions",
    "rounding_adjustment", "sales_returns", "actual_return_loss", "fx_net_expense",
  ].map(key => [key, 0]));
  Object.assign(period, { period_key: "2026-10", product_revenue: 100000, cogs: 40000, fulfillment_cost: 2000, delivery_subsidy: 1000, verified_expenses: 7000 });
  return {
    readiness: { checked_at: "2026-10-19T09:00:00Z", cutover_at: "2026-07-31T21:00:00Z", inventory_ledger_mode: "enforce",
      payment_ledger_enabled: "true", snapshot_writer_enabled: "true", open_review_flags: 1, journal_difference: "0", legacy_realized_lines_without_exact_cost: 9 },
    period,
    inventory: { on_hand_inventory_iqd: "300", unrealized_order_inventory_iqd: "50", gl_inventory_iqd: "375", difference_iqd: "-25", missing_unrealized_costs: 0 },
    costCoverage: { missing_stocked_costs: 0, empty_catalog_drafts: 5 },
    settlementSummary: { affected_orders: 2, recorded_net_iqd: "30000" },
    settlements: [{ order_id: "synthetic-order", order_number: "SYNTHETIC-1", period_key: "2026-09", merchant_net: "10000", cod_received: true, reconciliation_reason: "cod_not_reconciled_to_settlement" }],
    periodKey: "2026-10",
  };
}
describe("Financial source truth is explicit and never manufactured", () => {
  it("returns booked profit separately from final certification and open cash matching", () => {
    const truth = buildFinancialTruth(fixture());
    expect(truth.profit.displayIqd).toBe(50000);
    expect(truth.status).toBe("needs_review"); expect(truth.independentlyAudited).toBe(false);
    expect(truth.inventory.differenceIqd).toBe(-25);
    expect(truth.settlements.orders[0].recordedReceived).toBe(true);
    expect(truth.settlements.scope).toBe("all_open_orders"); expect(truth.settlements.truncated).toBe(true);
  });
  it("does not turn incomplete COGS into an apparently final profit", () => {
    const input = fixture(); input.period.incomplete_cost_orders = 1;
    const truth = buildFinancialTruth(input);
    expect(truth.profit.recordedIqd).toBe(50000); expect(truth.profit.displayIqd).toBeNull();
    expect(truth.profit.componentsComplete).toBe(false);
  });
  it.each([null, undefined, "", "   ", NaN, Infinity, false, true])("rejects missing/invalid source number %s rather than treating it as zero", value => {
    expect(() => requiredFinancialNumber(value, "cost")).toThrow(/FINANCIAL_SOURCE/);
  });
  it("retains a real zero and negative FX expense without rounding away evidence", () => {
    expect(requiredFinancialNumber("0", "zero")).toBe(0);
    const input = fixture(); input.period.fx_net_expense = -300;
    expect(buildFinancialTruth(input).profit.displayIqd).toBe(50300);
  });
  it("separates empty catalog drafts and historical gaps from stocked cost coverage", () => {
    const truth = buildFinancialTruth(fixture());
    expect(truth.inventory.emptyCatalogDrafts).toBe(5); expect(truth.inventory.missingStockedCosts).toBe(0);
    expect(truth.issues.some(issue => issue.key === "inventory_cost_incomplete")).toBe(false);
    expect(truth.issues.find(issue => issue.key === "historical_cost_incomplete")?.scope).toBe("historical");
  });
  it("does not let a balanced global journal hide a per-period difference", () => {
    const input = fixture(); input.period.journal_difference = 500;
    expect(buildFinancialTruth(input).issues).toContainEqual(expect.objectContaining({ key: "period_journal_difference", amountIqd: 500 }));
    expect(buildFinancialTruth(input).profit.displayIqd).toBeNull();
  });
  it("represents pre-cutover periods as historical, not zero profit", () => {
    const input = fixture();
    const truth = buildFinancialTruth({ ...input, period: null, periodKey: "2026-07" });
    expect(truth.status).toBe("historical"); expect(truth.profit.displayIqd).toBeNull();
  });
  it("does not block an otherwise clear month solely for another month's unmatched receipts", () => {
    const input = fixture(); input.readiness.open_review_flags = 0; input.inventory.difference_iqd = "0";
    const truth = buildFinancialTruth(input);
    expect(truth.status).toBe("needs_review"); expect(financialPeriodChecksClear(truth)).toBe(true);
    input.period.unsettled_carrier_orders = 1;
    expect(financialPeriodChecksClear(buildFinancialTruth(input))).toBe(false);
  });
  it("even clear internal checks do not assert an independent audit", () => {
    const input = fixture(); input.readiness.open_review_flags = 0;
    input.inventory.difference_iqd = "0"; input.settlementSummary.affected_orders = 0; input.settlements = [];
    const truth = buildFinancialTruth(input);
    expect(truth.status).toBe("checks_clear"); expect(truth.independentlyAudited).toBe(false);
  });
});


describe("Global evidence retains its actual scope", () => {
  it("does not attribute global procurement or settlement-integrity failures to one month", () => {
    const input = fixture(); input.period.procurement_integrity_failures = 1;
    input.period.settlement_integrity_failures = 2;
    const truth = buildFinancialTruth(input);
    expect(truth.issues.find(issue => issue.key === "procurement_integrity_failures")?.scope).toBe("current");
    expect(truth.issues.find(issue => issue.key === "settlement_integrity_failures")?.scope).toBe("current");
    expect(currentFinancialCloseBlockers(truth)).toMatchObject({ procurement_integrity_failures: 1, settlement_integrity_failures: 2, inventory_valuation_difference: 1 });
    expect(currentFinancialCloseBlockers(truth)).not.toHaveProperty("settlements_global");
    expect(truth.profit.displayIqd).toBeNull();
  });
});


describe("Partial business aggregates never masquerade as complete amounts", () => {
  it.each([1, 3, undefined, null, -1, "0"])("suppresses an amount when cost completeness is not established (%s)", missing => {
    expect(completeRecordedAmount(1234, missing)).toBeNull();
  });
  it("keeps a recorded zero but does not manufacture one from absent data", () => {
    expect(completeRecordedAmount(0, 0)).toBe(0);
    expect(completeRecordedAmount("1234", 0)).toBe(1234);
    expect(completeRecordedAmount(null, 0)).toBeNull();
    expect(completeRecordedAmount("", 0)).toBeNull();
  });
});
