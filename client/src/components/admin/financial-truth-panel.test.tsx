import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FinancialTruthPanel } from "./financial-truth-panel";
import type { FinancialTruth } from "@shared/financial-truth";
const data: FinancialTruth = {
  version: "financial-truth-v1", generatedAt: "2026-10-19T09:00:00Z", periodKey: "2026-10", currency: "IQD",
  timezone: "Asia/Baghdad", cutoverAt: "2026-07-31T21:00:00Z", independentlyAudited: false, engineConfigured: true,
  status: "needs_review", issues: [{ key: "inventory_valuation_difference", label: "فرق التقييم", scope: "current", count: 1, amountIqd: -25, nextStep: "طابق المستند" }],
  profit: { recordedIqd: 50000, displayIqd: null, componentsComplete: false, label: "الربح غير مكتمل", formula: "booked-source formula" },
  inventory: { onHandIqd: 300, inTransitIqd: 50, ledgerIqd: 375, differenceIqd: -25, missingStockedCosts: 0, emptyCatalogDrafts: 5 },
  settlements: { count: 1, recordedNetIqd: 10000, scope: "all_open_orders", truncated: false,
    orders: [{ orderId: "synthetic", orderNumber: "SYNTHETIC-1", periodKey: "2026-09", recordedReceived: true, recordedNetIqd: 10000, reason: "cod_not_reconciled_to_settlement" }] },
  historicalMissingCostLines: 9, notice: "الربح ليس نقدا متاحا للسحب.",
};
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}
describe("Financial truth panel", () => {
  it("shows incomplete profit as unavailable and signed valuation discrepancy without calling it missing cash", () => {
    render(<FinancialTruthPanel data={data} />, { wrapper });
    expect(screen.getByText('غير متوفر')).toBeInTheDocument();
    expect(screen.queryByText('50,000 د.ع')).not.toBeInTheDocument();
    expect(screen.getByText('-25 د.ع')).toBeInTheDocument();
    expect(screen.getByText('معلّم مستلم — يحتاج ربط المستند')).toBeInTheDocument();
    expect(screen.getByText(/لا يعامل نقص بياناتها كخسارة مخزون/)).toBeInTheDocument();
  });
  it("refuses a failed refresh instead of painting zero or clear status", async () => {
    const previous = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 503 }));
    try {
      render(<FinancialTruthPanel periodKey="2026-10" />, { wrapper });
      expect(await screen.findByTestId('financial-truth-unavailable')).toBeInTheDocument();
      expect(screen.queryByText('0 د.ع')).not.toBeInTheDocument();
    } finally { globalThis.fetch = previous; }
  });
});
