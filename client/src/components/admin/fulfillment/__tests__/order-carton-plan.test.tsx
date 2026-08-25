// The carton chooser is reachable from the real order workflow, and it fails
// closed rather than quietly offering a choice it cannot honour.
//
// The regression this guards: carton selection was fully built, tested and
// reachable by API, and nothing rendered it. A chooser nobody can open is not a
// chooser. That guarantee survives; what changed underneath it is the mechanism.
// f0cecd82 ("Replace automatic carton planner with manual size selector")
// retired the automatic planner and carton-plan-viewer.tsx, so the assertions
// below track the manual selector that replaced it.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { fulfillmentKeys, type DraftView, type FulfillmentEvent } from "@/hooks/use-fulfillment";
import type { CartonView } from "@/hooks/use-packaging";

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(async () => ({ json: async () => ({}) })),
  getQueryFn: () => async () => ({}),
}));

type Seed = [readonly unknown[], unknown];

function renderWithClient(ui: ReactElement, seed: Seed[] = []) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity, queryFn: async () => ({}) },
    },
  });
  // Seed with the real key tuples. Fulfillment keys are multi-part, so a
  // single-string key silently misses and leaves the panel in its loading gate.
  for (const [key, value] of seed) qc.setQueryData([...key], value);
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const PACKAGING = "/api/admin/packaging";
const ORDER_ID = "ord-1";

const CARTON: CartonView = {
  id: "c1", name: "كارتونة وسط", sku: "BOX-M",
  internalLengthCm: 27, internalWidthCm: 20, internalHeightCm: 14,
  maxWeightKg: 6, safetyPaddingCm: null, unitCost: 250,
  onHand: 10, reserved: 2, available: 8, lowStockThreshold: 3,
  active: true, notes: null,
};

const DRAFT: DraftView = {
  id: "draft-1",
  orderId: ORDER_ID,
  eventType: "original",
  state: "editing",
  profileFamilyId: null,
  profileId: null,
  profileVersion: null,
  suggestionReason: null,
  lines: [],
  expectedCost: null,
  knownCostSubtotal: 0,
  costStatus: "unknown",
  missingCostLines: [],
  stock: { wouldGoNegative: false, shortages: [] },
  confirmedEventId: null,
  createdAt: "2026-08-25T00:00:00.000Z",
  updatedAt: "2026-08-25T00:00:00.000Z",
};

const CONFIRMED_ORIGINAL: FulfillmentEvent = {
  id: "evt-1",
  orderId: ORDER_ID,
  eventType: "original",
  sequenceNumber: 1,
  workflowState: "confirmed",
  costStatus: "exact",
  profileFamilyId: null,
  profileId: null,
  profileVersion: null,
  reversalOfEventId: null,
  parentEventId: null,
  draftId: null,
  expectedCost: null,
  actualCost: null,
  variance: null,
  varianceReason: null,
  adjustmentReason: null,
  recordedBy: null,
  recordedAt: "2026-08-25T00:00:00.000Z",
  lines: [],
};

const cartonSeed = (items: CartonView[]): Seed => [[`${PACKAGING}/cartons`], { items }];
const missingSeed: Seed = [[`${PACKAGING}/packing/missing`], { items: [] }];
const draftSeed: Seed = [fulfillmentKeys.draft(ORDER_ID), DRAFT];
const noEventsSeed: Seed = [fulfillmentKeys.events(ORDER_ID), []];
const confirmedSeed: Seed = [fulfillmentKeys.events(ORDER_ID), [CONFIRMED_ORIGINAL]];

describe("carton selection is part of the order workflow", () => {
  it("is mounted inside the per-order fulfillment panel", async () => {
    const { OrderFulfillmentPanel } = await import("../order-fulfillment-panel");
    renderWithClient(<OrderFulfillmentPanel orderId={ORDER_ID} />, [
      cartonSeed([CARTON]), missingSeed, draftSeed, noEventsSeed,
    ]);
    expect(screen.getByTestId("order-carton-plan-section")).toBeInTheDocument();
    expect(screen.getByTestId("manual-carton-size-selector")).toBeInTheDocument();
  });

  it("stays reachable after the original fulfillment is confirmed", async () => {
    const { OrderFulfillmentPanel } = await import("../order-fulfillment-panel");
    renderWithClient(<OrderFulfillmentPanel orderId={ORDER_ID} />, [
      cartonSeed([CARTON]), missingSeed, draftSeed, confirmedSeed,
    ]);
    // 851d3b5f: a confirmed order whose carton was never saved must still be
    // fixable, as an adjustment — never by confirming the original twice.
    expect(screen.getByTestId("original-fulfillment-confirmed")).toBeInTheDocument();
    expect(screen.getByTestId("order-carton-plan-section")).toBeInTheDocument();
  });

  it("carries the heading the owner was promised", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(<OrderCartonPlanSection orderId={ORDER_ID} />, [
      cartonSeed([CARTON]), missingSeed, draftSeed,
    ]);
    expect(screen.getByTestId("order-carton-plan-section")).toHaveTextContent("اختيار الكارتون");
  });

  it("says the choice is manual, never inferred for the owner", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(<OrderCartonPlanSection orderId={ORDER_ID} />, [
      cartonSeed([CARTON]), missingSeed, draftSeed,
    ]);
    expect(screen.getByTestId("order-carton-plan-section")).toHaveTextContent("الاختيار يدوي");
    for (const size of ["small", "medium", "large"]) {
      expect(screen.getByTestId(`carton-size-${size}`)).toBeInTheDocument();
    }
  });

  it("fails closed when the carton catalogue is empty", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(<OrderCartonPlanSection orderId={ORDER_ID} />, [
      cartonSeed([]), missingSeed, draftSeed,
    ]);
    // Every size is offered but none is selectable: no catalogue, no choice.
    for (const size of ["small", "medium", "large"]) {
      expect(screen.getByTestId(`carton-size-${size}`)).toBeDisabled();
    }
  });

  it("treats an inactive carton as no carton at all", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(<OrderCartonPlanSection orderId={ORDER_ID} />, [
      cartonSeed([{ ...CARTON, active: false }]), missingSeed, draftSeed,
    ]);
    expect(screen.getByTestId("carton-size-medium")).toBeDisabled();
  });

  it("offers only the sizes the catalogue can actually supply", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(<OrderCartonPlanSection orderId={ORDER_ID} />, [
      cartonSeed([CARTON]), missingSeed, draftSeed,
    ]);
    // Only BOX-M is stocked, so medium is live and the other two stay closed.
    expect(screen.getByTestId("carton-size-medium")).toBeEnabled();
    expect(screen.getByTestId("carton-size-small")).toBeDisabled();
    expect(screen.getByTestId("carton-size-large")).toBeDisabled();
  });

  it("does not show the global missing-catalogue count on an individual order", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    // A store-wide gap is an inventory problem, not this order's problem, so the
    // section must render identically whatever the global list happens to hold.
    // Asserting on the rendered text directly would be meaningless here: the
    // carton's own dimensions (27, 20, 250) already contain any digit we picked.
    const renderWith = (missing: unknown[]) => {
      const view = renderWithClient(<OrderCartonPlanSection orderId={ORDER_ID} />, [
        cartonSeed([CARTON]),
        [[`${PACKAGING}/packing/missing`], { items: missing }],
        draftSeed,
      ]);
      const text = view.getByTestId("order-carton-plan-section").textContent;
      view.unmount();
      return text;
    };

    expect(renderWith([{ id: "x" }, { id: "y" }])).toBe(renderWith([]));
  });

  it("locks the chooser once the draft is no longer editable", async () => {
    const { OrderCartonPlanSection } = await import("../order-carton-plan-section");
    renderWithClient(<OrderCartonPlanSection orderId={ORDER_ID} />, [
      cartonSeed([CARTON]), missingSeed,
      [fulfillmentKeys.draft(ORDER_ID), { ...DRAFT, state: "consumed" }],
    ]);
    // Consumed means the cost and stock already moved; re-choosing would double it.
    expect(screen.getByTestId("carton-size-medium")).toBeDisabled();
    expect(screen.getByTestId("order-carton-plan-section")).toHaveTextContent("مقفول بعد التأكيد");
  });
});
