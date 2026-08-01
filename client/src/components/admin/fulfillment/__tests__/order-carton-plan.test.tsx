// Phase 3: the planner is reachable from the real order workflow, and it fails
// closed loudly rather than quietly.
//
// The regression this guards: carton-plan-viewer.tsx was fully built, tested and
// reachable by API, and nothing rendered it. A planner nobody can open is not a
// planner.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(async () => ({ json: async () => ({}) })),
  getQueryFn: () => async () => ({}),
}));

function renderWithClient(ui: ReactElement, seed: Array<[string, unknown]> = []) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity, queryFn: async () => ({}) },
    },
  });
  for (const [k, v] of seed) qc.setQueryData([k], v);
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const BASE = "/api/admin/packaging";

const CARTON = {
  id: "c1", name: "كارتونة وسط", sku: "BOX-M",
  internalLengthCm: 27, internalWidthCm: 20, internalHeightCm: 14,
  maxWeightKg: 6, safetyPaddingCm: null, unitCost: 250,
  onHand: 10, reserved: 2, available: 8, lowStockThreshold: 3,
  active: true, notes: null,
};

describe("the carton plan is part of the order workflow", () => {
  it("is mounted inside the per-order fulfillment panel", async () => {
    const { OrderFulfillmentPanel } = await import("../order-fulfillment-panel");
    renderWithClient(<OrderFulfillmentPanel orderId="ord-1" />, [
      [`${BASE}/cartons`, { items: [CARTON] }],
      [`${BASE}/packing/missing`, { items: [] }],
    ]);
    expect(screen.getByTestId("order-carton-plan-section")).toBeInTheDocument();
    expect(screen.getByTestId("carton-plan-viewer")).toBeInTheDocument();
  });

  it("carries the heading the owner was promised", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(
      <OrderCartonPlanSection orderId="ord-1"><div /></OrderCartonPlanSection>,
      [[`${BASE}/cartons`, { items: [CARTON] }], [`${BASE}/packing/missing`, { items: [] }]],
    );
    expect(screen.getByTestId("order-carton-plan-section")).toHaveTextContent("خطة التغليف المقترحة");
  });

  it("says packaging cost never reaches the customer total", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(
      <OrderCartonPlanSection orderId="ord-1"><div /></OrderCartonPlanSection>,
      [[`${BASE}/cartons`, { items: [CARTON] }], [`${BASE}/packing/missing`, { items: [] }]],
    );
    expect(screen.getByTestId("order-carton-plan-section")).toHaveTextContent(
      /ما تغيّر المبلغ المستحق على الزبون/,
    );
  });
});

describe("it fails closed when the prerequisites are absent", () => {
  it("explains the planner cannot run with no carton catalogue, and hides it", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(
      <OrderCartonPlanSection orderId="ord-1">
        <div data-testid="planner-body" />
      </OrderCartonPlanSection>,
      [[`${BASE}/cartons`, { items: [] }], [`${BASE}/packing/missing`, { items: [] }]],
    );

    const notice = screen.getByTestId("no-cartons-for-plan");
    expect(notice).toHaveTextContent(/ماكو ولا كارتونة مسجّلة/);
    expect(notice).toHaveTextContent(/ما يخترع ولا قياس/);
    // Not merely disabled — there is nothing to plan into, so nothing is offered.
    expect(screen.queryByTestId("planner-body")).not.toBeInTheDocument();
  });

  it("treats an inactive carton as no carton at all", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(
      <OrderCartonPlanSection orderId="ord-1">
        <div data-testid="planner-body" />
      </OrderCartonPlanSection>,
      [
        [`${BASE}/cartons`, { items: [{ ...CARTON, active: false }] }],
        [`${BASE}/packing/missing`, { items: [] }],
      ],
    );
    expect(screen.getByTestId("no-cartons-for-plan")).toBeInTheDocument();
    expect(screen.queryByTestId("planner-body")).not.toBeInTheDocument();
  });

  it("warns up front when products still lack packing data", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(
      <OrderCartonPlanSection orderId="ord-1">
        <div data-testid="planner-body" />
      </OrderCartonPlanSection>,
      [
        [`${BASE}/cartons`, { items: [CARTON] }],
        [
          `${BASE}/packing/missing`,
          { items: [{ productId: "p1", productName: "سخان", variantId: null, missing: ["packed_weight_kg"] }] },
        ],
      ],
    );
    expect(screen.getByTestId("plan-missing-badge")).toHaveTextContent("1");
    expect(screen.getByTestId("plan-missing-data-note")).toHaveTextContent(/تغليف يدوي/);
    // The planner still runs; it is the planner's job to refuse this order.
    expect(screen.getByTestId("planner-body")).toBeInTheDocument();
  });
});

describe("no safety bypass is reachable from the order workflow", () => {
  it("offers no control that approves a plan which failed validation", async () => {
    const { OrderFulfillmentPanel } = await import("../order-fulfillment-panel");
    renderWithClient(<OrderFulfillmentPanel orderId="ord-1" />, [
      [`${BASE}/cartons`, { items: [CARTON] }],
      [`${BASE}/packing/missing`, { items: [] }],
    ]);
    expect(screen.getByTestId("button-validate-plan")).toBeDisabled();
    expect(screen.getByTestId("button-reserve-cartons")).toBeDisabled();
    expect(screen.queryByText(/تجاهل|رغم|بالقوة/)).not.toBeInTheDocument();
  });
});
