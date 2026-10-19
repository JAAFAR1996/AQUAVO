import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
const state = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => state.query }));
vi.mock("@/components/admin/financial-truth-panel", () => ({ FinancialTruthPanel: () => <div>Quality panel</div> }));
import FinanceHtmlReportPage from "../admin/finance-report";
beforeEach(() => { cleanup(); state.query = { data: undefined, isPending: false, isError: false, isFetching: false, refetch: vi.fn() }; });
describe("Finance report never substitutes unavailable sources with an empty report", () => {
  it("shows loading rather than zero-valued financial tables", () => {
    state.query.isPending = true;
    const { container } = render(<FinanceHtmlReportPage />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(container.querySelectorAll("table")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /طباعة/ })).toBeNull();
  });
  it("hides a cached payload after the source refresh fails", () => {
    state.query.isError = true;
    state.query.data = { readiness: { product_revenue: 12345 }, sales: [] };
    const { container } = render(<FinanceHtmlReportPage />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(container.textContent).not.toContain("12,345");
    expect(container.querySelectorAll("table")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "إعادة التحقق" })).toBeTruthy();
  });
  it("does not print data without the server's quality contract", () => {
    state.query.data = { readiness: { product_revenue: 1000 }, sales: [] };
    render(<FinanceHtmlReportPage />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /طباعة/ })).toBeNull();
  });
});
