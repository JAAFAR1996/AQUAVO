import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

import { FulfillmentDraftPanel } from "../fulfillment-draft-panel";
import { FulfillmentHistoryPanel } from "../fulfillment-history-panel";
import { FulfillmentProfitabilityPanel } from "../fulfillment-profitability-panel";
import type { DraftView, FulfillmentEvent, OrderCostBreakdown } from "@/hooks/use-fulfillment";

const ORDER_ID = "order-1";

// ── Fixtures ────────────────────────────────────────────────────────────────

function draftFixture(overrides: Partial<DraftView> = {}): DraftView {
  return {
    id: "draft-1",
    orderId: ORDER_ID,
    eventType: "original",
    state: "suggested",
    profileFamilyId: "fam-1",
    profileId: "ver-1",
    profileVersion: 2,
    suggestionReason: "طلب صغير — بروفايل الصندوق الصغير",
    lines: [
      {
        id: "line-1", materialId: "mat-1", materialName: "صندوق صغير", category: "box",
        description: null, quantity: 1, unit: "قطعة", unitCost: 500, totalCost: 500,
        costStatus: "exact", source: "catalog", note: null,
      },
    ],
    expectedCost: 500,
    knownCostSubtotal: 500,
    costStatus: "exact",
    missingCostLines: [],
    stock: { wouldGoNegative: false, shortages: [] },
    confirmedEventId: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function eventFixture(overrides: Partial<FulfillmentEvent> = {}): FulfillmentEvent {
  return {
    id: "ev-1", orderId: ORDER_ID, eventType: "original", sequenceNumber: 1,
    workflowState: "confirmed", costStatus: "exact",
    profileFamilyId: null, profileId: null, profileVersion: null,
    reversalOfEventId: null, parentEventId: null, draftId: "draft-1",
    expectedCost: 500, actualCost: 500, variance: 0,
    varianceReason: null, adjustmentReason: null,
    recordedBy: "admin-1", recordedAt: "2026-07-01T10:05:00.000Z",
    lines: [],
    ...overrides,
  };
}

function breakdownFixture(overrides: Partial<OrderCostBreakdown> = {}): OrderCostBreakdown {
  return {
    orderId: ORDER_ID, orderNumber: "AQ-1001", status: "delivered",
    createdAt: "2026-07-01T09:00:00.000Z",
    collectedAmount: 50000, revenue: 45000,
    productCogs: 20000, supplierPackaging: 1000,
    aquavoFulfillmentCost: 500, originalShipmentCost: 500,
    reshipmentCost: null, returnHandlingCost: null, replacementCost: null,
    courierCost: 5000, commissions: null, paymentFees: null, otherDirectCosts: null,
    totalKnownDirectCost: null, contributionProfit: null, contributionMargin: null,
    unallocated: {
      legacyBoxCost: null, unknownProductLines: 0,
      unknownFulfillmentLines: 0, reversedFulfillmentCost: 0,
    },
    dataStatus: "incomplete", productCostStatus: "exact", fulfillmentCostStatus: "exact",
    items: [],
    ...overrides,
  };
}

// ── Fetch harness ───────────────────────────────────────────────────────────

interface Routes {
  draft?: () => unknown;
  events?: () => unknown;
  profitability?: () => unknown;
  confirm?: () => unknown;
  status?: number;
  never?: boolean;
}

function installFetch(routes: Routes) {
  const calls: Array<{ method: string; url: string; body: unknown }> = [];
  const handler = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    calls.push({
      method: init?.method ?? "GET",
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (routes.never) return new Promise<Response>(() => {});
    if (routes.status && routes.status >= 400) {
      return new Response("boom", { status: routes.status });
    }
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

    if (url.includes("/reference")) {
      return json({
        manualCategories: [
          { value: "box", label: "صندوق" },
          { value: "sticker", label: "ستكرات" },
        ],
        eventTypes: ["original", "reshipment"],
      });
    }
    if (url.includes("/materials")) return json({ materials: [] });
    if (url.includes("/confirm")) return json(routes.confirm?.() ?? {});
    if (url.includes("/draft")) return json({ draft: routes.draft?.() ?? draftFixture() });
    if (url.includes("/events")) return json({ events: routes.events?.() ?? [] });
    if (url.includes("/profitability")) return json({ breakdown: routes.profitability?.() ?? breakdownFixture() });
    return json({});
  });
  vi.stubGlobal("fetch", handler);
  return calls;
}

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("FulfillmentDraftPanel", () => {
  it("renders an unknown expected cost as غير معروف, never 0 د.ع", async () => {
    installFetch({
      draft: () => draftFixture({
        expectedCost: null,
        knownCostSubtotal: 500,
        costStatus: "incomplete",
        missingCostLines: ["ستكرات"],
        lines: [
          ...draftFixture().lines,
          {
            id: "line-2", materialId: null, materialName: "ستكرات", category: "sticker",
            description: null, quantity: 2, unit: null, unitCost: null, totalCost: null,
            costStatus: "unknown", source: "manual", note: null,
          },
        ],
      }),
    });

    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);

    const expected = await screen.findByTestId("expected-cost");
    expect(expected).toHaveTextContent("غير معروف");
    expect(expected).not.toHaveTextContent("0 د.ع");
    expect(expected).toHaveAttribute("data-unknown", "true");

    // The partial subtotal must be explicitly labelled, not presented as the total.
    expect(screen.getByText("مجموع البنود المعروفة فقط")).toBeInTheDocument();
    expect(screen.getByTestId("known-subtotal")).toHaveTextContent("500 د.ع");
  });

  it("warns when a line cost is unknown, before and inside the confirmation dialog", async () => {
    installFetch({
      draft: () => draftFixture({
        expectedCost: null, costStatus: "incomplete", missingCostLines: ["ستكرات"],
      }),
    });
    const user = userEvent.setup();
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);

    const warning = await screen.findByTestId("unknown-cost-warning");
    expect(warning).toHaveTextContent("ستكرات");

    await user.click(await screen.findByTestId("confirm-fulfillment"));
    expect(await screen.findByTestId("confirm-unknown-warning")).toHaveTextContent("كلفة غير معروفة");
  });

  it("shows no unknown-cost warning when every line cost is known", async () => {
    installFetch({});
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);

    expect(await screen.findByTestId("expected-cost")).toHaveTextContent("500 د.ع");
    expect(screen.queryByTestId("unknown-cost-warning")).not.toBeInTheDocument();
  });

  it("posts the confirmation and shows the actual cost returned by the server", async () => {
    const calls = installFetch({
      confirm: () => ({
        eventId: "ev-9", alreadyConfirmed: false, sequenceNumber: 1,
        actualCost: 750, expectedCost: 500, variance: 250, costStatus: "exact",
      }),
    });
    const user = userEvent.setup();
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);

    await user.click(await screen.findByTestId("confirm-fulfillment"));
    await user.click(await screen.findByTestId("confirm-dialog-submit"));

    expect(await screen.findByTestId("actual-cost")).toHaveTextContent("750 د.ع");
    expect(screen.getByTestId("variance")).toHaveTextContent("+250 د.ع");

    const confirmCall = calls.find((c) => c.url.includes("/confirm"));
    expect(confirmCall).toBeDefined();
    expect(confirmCall?.method).toBe("POST");
    expect(confirmCall?.url).toContain("/drafts/draft-1/confirm");
  });

  it("renders the quick-add chips from the reference endpoint", async () => {
    installFetch({});
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);

    const chips = await screen.findByTestId("quick-add-chips");
    expect(within(chips).getByText("صندوق")).toBeInTheDocument();
    expect(within(chips).getByText("ستكرات")).toBeInTheDocument();
  });

  it("warns about a stock shortfall BEFORE the first confirm attempt", async () => {
    installFetch({
      draft: () => draftFixture({
        stock: {
          wouldGoNegative: true,
          shortages: [{ materialId: "mat-1", materialName: "صندوق صغير", available: 0, required: 1 }],
        },
      }),
    });
    const user = userEvent.setup();
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);

    // Visible without any confirm attempt having been made.
    const warning = await screen.findByTestId("stock-warning");
    expect(warning).toHaveTextContent("المخزون غير كافٍ");
    expect(within(warning).getByTestId("stock-shortages"))
      .toHaveTextContent("صندوق صغير: المتوفر 0 · المطلوب 1");

    await user.click(screen.getByTestId("confirm-fulfillment"));
    expect(await screen.findByTestId("confirm-stock-warning")).toBeInTheDocument();
    // The override is gone: the button stays "تأكيد" and is unusable.
    expect(screen.getByTestId("confirm-dialog-submit")).toHaveTextContent("تأكيد");
    expect(screen.getByTestId("confirm-dialog-submit")).toBeDisabled();
  });

  it("shows no stock warning when the projection says stock is sufficient", async () => {
    installFetch({});
    const user = userEvent.setup();
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);

    await screen.findByTestId("expected-cost");
    expect(screen.queryByTestId("stock-warning")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("confirm-fulfillment"));
    await screen.findByTestId("confirm-dialog");
    expect(screen.queryByTestId("confirm-stock-warning")).not.toBeInTheDocument();
    expect(screen.getByTestId("confirm-dialog-submit")).toHaveTextContent("تأكيد");
  });

  it("cannot confirm at all when stock would go negative — no request is sent", async () => {
    const calls = installFetch({
      draft: () => draftFixture({
        stock: {
          wouldGoNegative: true,
          shortages: [{ materialId: "mat-1", materialName: "صندوق صغير", available: 0, required: 1 }],
        },
      }),
      confirm: () => ({
        eventId: "ev-9", alreadyConfirmed: false, sequenceNumber: 1,
        actualCost: 500, expectedCost: 500, variance: 0, costStatus: "exact",
      }),
    });
    const user = userEvent.setup();
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);

    await user.click(await screen.findByTestId("confirm-fulfillment"));
    const submit = await screen.findByTestId("confirm-dialog-submit");
    expect(submit).toBeDisabled();
    await user.click(submit);

    // The point: not merely "the flag is false" but that nothing was attempted.
    // A shortfall is resolved by restocking, not by pushing the request through.
    expect(calls.find((c) => c.url.includes("/confirm"))).toBeUndefined();
  });

  it("tells the owner to restock rather than offering a way past the block", async () => {
    installFetch({
      draft: () => draftFixture({
        stock: {
          wouldGoNegative: true,
          shortages: [{ materialId: "mat-1", materialName: "صندوق صغير", available: 0, required: 1 }],
        },
      }),
    });
    const user = userEvent.setup();
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);

    await user.click(await screen.findByTestId("confirm-fulfillment"));
    const warning = await screen.findByTestId("confirm-stock-warning");
    expect(warning).toHaveTextContent(/زوّد المخزون/);
    expect(screen.queryByText(/رغم نقص المخزون/)).not.toBeInTheDocument();
  });

  it("renders a loading state while the draft is in flight", () => {
    installFetch({ never: true });
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);
    expect(screen.getByTestId("fulfillment-loading")).toBeInTheDocument();
  });

  it("renders an error state when the draft request fails", async () => {
    installFetch({ status: 500 });
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);
    expect(await screen.findByTestId("fulfillment-error")).toBeInTheDocument();
  });

  it("renders an empty state when the draft has no lines", async () => {
    installFetch({ draft: () => draftFixture({ lines: [], expectedCost: null, knownCostSubtotal: 0, costStatus: "unknown" }) });
    renderWithQuery(<FulfillmentDraftPanel orderId={ORDER_ID} />);
    expect(await screen.findByText("لا توجد بنود بعد — أضف مواد التغليف المستخدمة")).toBeInTheDocument();
  });
});

describe("FulfillmentHistoryPanel", () => {
  it("lists events in sequence order regardless of API ordering", async () => {
    installFetch({
      events: () => [
        eventFixture({ id: "ev-3", sequenceNumber: 3, eventType: "reshipment" }),
        eventFixture({ id: "ev-1", sequenceNumber: 1, eventType: "original" }),
        eventFixture({ id: "ev-2", sequenceNumber: 2, eventType: "replacement" }),
      ],
    });
    renderWithQuery(<FulfillmentHistoryPanel orderId={ORDER_ID} />);

    await waitFor(() => expect(screen.getAllByTestId("event-row")).toHaveLength(3));
    const sequences = screen.getAllByTestId("event-row").map((el) => el.getAttribute("data-sequence"));
    expect(sequences).toEqual(["1", "2", "3"]);
  });

  it("requires a reason of at least 3 characters before allowing a reversal", async () => {
    installFetch({ events: () => [eventFixture()] });
    const user = userEvent.setup();
    renderWithQuery(<FulfillmentHistoryPanel orderId={ORDER_ID} />);

    const row = await screen.findByTestId("event-row");
    await user.click(within(row).getByRole("button", { expanded: false }));
    await user.click(await screen.findByText("عكس الحدث"));

    const submit = await screen.findByTestId("reverse-submit");
    expect(submit).toBeDisabled();

    await user.type(screen.getByTestId("reverse-reason"), "خطأ بالتجهيز");
    expect(submit).not.toBeDisabled();
  });

  it("renders an empty state when the order has no fulfillment events", async () => {
    installFetch({ events: () => [] });
    renderWithQuery(<FulfillmentHistoryPanel orderId={ORDER_ID} />);
    expect(await screen.findByTestId("fulfillment-empty")).toBeInTheDocument();
  });

  it("renders an error state when the history request fails", async () => {
    installFetch({ status: 500 });
    renderWithQuery(<FulfillmentHistoryPanel orderId={ORDER_ID} />);
    expect(await screen.findByTestId("fulfillment-error")).toBeInTheDocument();
  });
});

describe("FulfillmentProfitabilityPanel", () => {
  it("renders unknown totals as غير معروف and surfaces the data status badge", async () => {
    installFetch({});
    renderWithQuery(<FulfillmentProfitabilityPanel orderId={ORDER_ID} />);

    const rows = await screen.findByTestId("profitability-rows");
    const profitRow = within(rows).getByText("الربح المباشر").closest("button");
    expect(profitRow).not.toBeNull();
    expect(profitRow!).toHaveTextContent("غير معروف");
    expect(profitRow!).not.toHaveTextContent("0 د.ع");

    expect(screen.getAllByTestId("cost-status-badge")[0]).toHaveTextContent("ناقص");
  });

  it("drills a fulfillment total down to the events that produced it", async () => {
    installFetch({
      events: () => [eventFixture({
        lines: [{
          id: "l1", materialId: "mat-1", materialName: "صندوق صغير", quantity: 1,
          unitCost: 500, totalCost: 500, costStatus: "exact", source: "catalog",
          category: "box", description: null, unit: "قطعة", note: null,
        }],
      })],
    });
    const user = userEvent.setup();
    renderWithQuery(<FulfillmentProfitabilityPanel orderId={ORDER_ID} />);

    await user.click(await screen.findByText(/الشحنة الأصلية/));
    const drilldown = await screen.findByTestId("events-drilldown");
    expect(within(drilldown).getByText("صندوق صغير × 1 قطعة")).toBeInTheDocument();
  });

  it("renders loading and error states", async () => {
    installFetch({ never: true });
    const { unmount } = renderWithQuery(<FulfillmentProfitabilityPanel orderId={ORDER_ID} />);
    expect(screen.getByTestId("fulfillment-loading")).toBeInTheDocument();
    unmount();

    installFetch({ status: 500 });
    renderWithQuery(<FulfillmentProfitabilityPanel orderId={ORDER_ID} />);
    expect(await screen.findByTestId("fulfillment-error")).toBeInTheDocument();
  });
});
