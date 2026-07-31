// Admin UI behaviour for the carton planner.
//
// Two things matter most here and both are asserted directly:
//   1. an unknown cost renders as «غير معروف», never as 0 د.ع — a missing cost
//      and a free item are different facts and the screen must not blur them;
//   2. there is no control anywhere that approves a plan which failed safety
//      validation.
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import {
  CALCULATION_BASIS_LABEL,
  UNKNOWN_LABEL,
  bpToPercent,
  cartonDimsLabel,
  formatCm,
  formatIqd,
  formatKg,
} from "@/hooks/use-packaging";

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(async () => ({ json: async () => ({}) })),
  getQueryFn: () => async () => ({}),
}));

function renderWithClient(ui: ReactElement, seed: Array<[string, unknown]> = []) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, queryFn: async () => ({}) } },
  });
  for (const [key, value] of seed) qc.setQueryData([key], value);
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const BASE = "/api/admin/packaging";

describe("formatting never turns unknown into zero", () => {
  it("renders a null cost as غير معروف", () => {
    expect(formatIqd(null)).toBe(UNKNOWN_LABEL);
    expect(formatIqd(undefined)).toBe(UNKNOWN_LABEL);
    expect(formatIqd(0)).toBe("0 د.ع"); // a real, verified zero still shows as 0
    expect(formatIqd(1000)).toBe("1,000 د.ع");
  });

  it("renders unknown dimensions and weights as غير معروف", () => {
    expect(formatCm(null)).toBe(UNKNOWN_LABEL);
    expect(formatKg(null)).toBe(UNKNOWN_LABEL);
    expect(bpToPercent(null)).toBe(UNKNOWN_LABEL);
  });

  it("converts millimetres and grams for display only", () => {
    expect(formatCm(195)).toBe("19.5");
    expect(formatCm(320)).toBe("32");
    expect(formatKg(1500)).toBe("1.50 كغم");
    expect(bpToPercent(8600)).toBe("86%");
  });

  it("labels a carton with no recorded dimensions honestly", () => {
    expect(
      cartonDimsLabel({ internalLengthCm: null, internalWidthCm: 20, internalHeightCm: 14 }),
    ).toBe(UNKNOWN_LABEL);
    expect(
      cartonDimsLabel({ internalLengthCm: 27, internalWidthCm: 20, internalHeightCm: 14 }),
    ).toBe("27×20×14 سم");
  });

  it("spells out each calculation basis in Arabic", () => {
    expect(CALCULATION_BASIS_LABEL.per_order).toBe("مرة واحدة لكل طلب");
    expect(CALCULATION_BASIS_LABEL.per_carton).toBe("لكل كارتونة");
    expect(CALCULATION_BASIS_LABEL.per_product_unit).toBe("لكل قطعة منتج");
  });
});

describe("preparation costs panel", () => {
  it("shows the two seeded costs with their basis and price", async () => {
    const { PreparationCostsPanel } = await import("../packaging-panels");
    renderWithClient(<PreparationCostsPanel />, [
      [
        `${BASE}/preparation-costs`,
        {
          items: [
            {
              id: "1", name: "ملصق السعر", sku: "PRICE_LABEL", calculationBasis: "per_order",
              unitCost: 50, currency: "IQD", active: true, archivedAt: null,
              stockTracked: false, notes: null,
            },
            {
              id: "2", name: "كارت الشكر والتواصل", sku: "THANK_YOU_SOCIAL_CARD",
              calculationBasis: "per_order", unitCost: 100, currency: "IQD", active: true,
              archivedAt: null, stockTracked: false, notes: null,
            },
          ],
        },
      ],
    ]);

    expect(screen.getByTestId("cost-PRICE_LABEL")).toHaveTextContent("50 د.ع");
    expect(screen.getByTestId("cost-THANK_YOU_SOCIAL_CARD")).toHaveTextContent("100 د.ع");
    // The basis sits in the same line as the stock note, so match loosely.
    expect(screen.getAllByText(/مرة واحدة لكل طلب/)).toHaveLength(2);
  });

  it("states that internal costs never change the customer total", async () => {
    const { PreparationCostsPanel } = await import("../packaging-panels");
    renderWithClient(<PreparationCostsPanel />, [[`${BASE}/preparation-costs`, { items: [] }]]);
    expect(screen.getByText(/لا تغيّر المبلغ المستحق على الزبون/)).toBeInTheDocument();
  });
});

describe("carton catalogue panel", () => {
  const carton = {
    id: "c1", name: "كارتونة وسط", sku: "BOX-M",
    internalLengthCm: 27, internalWidthCm: 20, internalHeightCm: 14,
    maxWeightKg: 5, safetyPaddingCm: 0.5, unitCost: 1000,
    onHand: 10, reserved: 2, available: 8, lowStockThreshold: 8,
    active: true, notes: null,
  };

  it("shows on-hand, reserved and available separately", async () => {
    const { CartonCatalogPanel } = await import("../packaging-panels");
    renderWithClient(<CartonCatalogPanel />, [[`${BASE}/cartons`, { items: [carton] }]]);
    const row = screen.getByTestId("carton-BOX-M");
    expect(within(row).getByTitle("على الرف")).toHaveTextContent("10");
    expect(within(row).getByTitle("محجوز")).toHaveTextContent("2");
    expect(screen.getByTestId("available-BOX-M")).toHaveTextContent("8");
  });

  it("flags a carton at or below its threshold", async () => {
    const { CartonCatalogPanel } = await import("../packaging-panels");
    renderWithClient(<CartonCatalogPanel />, [[`${BASE}/cartons`, { items: [carton] }]]);
    expect(screen.getByText("مخزون منخفض")).toBeInTheDocument();
  });

  it("flags a carton with nothing available", async () => {
    const { CartonCatalogPanel } = await import("../packaging-panels");
    renderWithClient(<CartonCatalogPanel />, [
      [`${BASE}/cartons`, { items: [{ ...carton, available: 0, reserved: 10 }] }],
    ]);
    expect(screen.getByText("نفد المخزون")).toBeInTheDocument();
  });

  it("shows an unpriced carton as غير معروف rather than free", async () => {
    const { CartonCatalogPanel } = await import("../packaging-panels");
    renderWithClient(<CartonCatalogPanel />, [
      [`${BASE}/cartons`, { items: [{ ...carton, unitCost: null }] }],
    ]);
    expect(within(screen.getByTestId("carton-BOX-M")).getByText(/غير معروف/)).toBeInTheDocument();
  });

  it("says plainly that no carton is invented when the catalogue is empty", async () => {
    const { CartonCatalogPanel } = await import("../packaging-panels");
    renderWithClient(<CartonCatalogPanel />, [[`${BASE}/cartons`, { items: [] }]]);
    expect(screen.getByTestId("no-cartons-notice")).toHaveTextContent(/ما يخترع ولا كارتونة/);
  });
});

describe("missing packing data queue", () => {
  it("names the missing fields in Arabic", async () => {
    const { MissingPackingDataPanel } = await import("../packaging-panels");
    renderWithClient(<MissingPackingDataPanel />, [
      [
        `${BASE}/packing/missing`,
        {
          items: [
            {
              productId: "p1", productName: "هيتر ستيل 100 واط", variantId: null,
              missing: ["packed_depth_cm", "packed_weight_kg"],
            },
          ],
        },
      ],
    ]);
    const row = screen.getByTestId("missing-p1");
    expect(row).toHaveTextContent("السماكة/العمق بعد التغليف");
    expect(row).toHaveTextContent("الوزن بعد التغليف");
  });
});

describe("stock alerts panel", () => {
  it("renders the owner's message format and the three stock figures", async () => {
    const { StockAlertsPanel } = await import("../packaging-panels");
    renderWithClient(<StockAlertsPanel />, [
      [
        `${BASE}/alerts`,
        {
          items: [
            {
              id: "a1", materialId: "c1", alertLevel: "low", state: "open",
              onHandSnapshot: "10", reservedSnapshot: "2", availableSnapshot: "8",
              thresholdSnapshot: "8",
              messageAr: "تنبيه: بقي 8 كراتين فقط من قياس 27×20×14 سم",
              openedAt: "2026-07-31T10:00:00Z", acknowledgedAt: null,
            },
          ],
        },
      ],
    ]);
    const alert = screen.getByTestId("alert-a1");
    expect(alert).toHaveTextContent("تنبيه: بقي 8 كراتين فقط من قياس 27×20×14 سم");
    expect(alert).toHaveTextContent("on-hand 10");
    expect(alert).toHaveTextContent("reserved 2");
    expect(alert).toHaveTextContent("available 8");
  });

  it("explains that acknowledging does not close the alert", async () => {
    const { StockAlertsPanel } = await import("../packaging-panels");
    renderWithClient(<StockAlertsPanel />, [
      [
        `${BASE}/alerts`,
        {
          items: [
            {
              id: "a1", materialId: "c1", alertLevel: "critical", state: "open",
              onHandSnapshot: "0", reservedSnapshot: "0", availableSnapshot: "0",
              thresholdSnapshot: "8", messageAr: "تنبيه حرج: ماكو ولا كارتونة متاحة",
              openedAt: "2026-07-31T10:00:00Z", acknowledgedAt: null,
            },
          ],
        },
      ],
    ]);
    expect(screen.getByText(/ينغلق تلقائياً لما المتاح يرتفع فوق الحد/)).toBeInTheDocument();
  });
});

describe("return carton loss panel", () => {
  it("shows only the carton and says the amount is a reclassification", async () => {
    const { ReturnCartonLossPanel } = await import("../packaging-panels");
    renderWithClient(<ReturnCartonLossPanel orderId="o1" />, [
      [
        `${BASE}/orders/o1/return-loss`,
        {
          rows: [
            {
              id: "l1", returnEventId: "r1", fulfillmentLineId: "ln1",
              materialNameSnapshot: "كارتونة 27×20×14 سم", quantity: "1",
              originalTotalCostSnapshot: "1000", lossCategory: "damaged_carton",
              classificationMode: "automatic", reason: "كارتونة تالفة بسبب طلب راجع",
              recordedAt: "2026-07-31T10:00:00Z",
            },
          ],
          perReturnEvent: { r1: 1000 },
          orderTotal: 1000,
          isReclassificationOnly: true,
        },
      ],
    ]);

    expect(screen.getByTestId("loss-l1")).toHaveTextContent("كارتونة 27×20×14 سم");
    expect(screen.getByTestId("loss-l1")).toHaveTextContent("1,000 د.ع");
    // The sticker and the card must not appear as losses.
    expect(screen.queryByText(/ملصق السعر/)).not.toBeInTheDocument();

    const notice = screen.getByTestId("reclassification-notice");
    expect(notice).toHaveTextContent(/ما\s+ينخصم من الربح مرة ثانية/);
    expect(notice).toHaveTextContent(/الملصق وكارت الشكر رجعوا مع الطلب/);
  });
});

describe("plan viewer offers no safety bypass", () => {
  it("keeps validate and reserve disabled while safety has not passed", async () => {
    const { CartonPlanViewer } = await import("../carton-plan-viewer");
    renderWithClient(<CartonPlanViewer orderId="o1" />);
    // Nothing generated yet: neither action is available.
    expect(screen.getByTestId("button-validate-plan")).toBeDisabled();
    expect(screen.getByTestId("button-reserve-cartons")).toBeDisabled();
  });

  it("has no control that approves a failed plan", async () => {
    const { CartonPlanViewer } = await import("../carton-plan-viewer");
    renderWithClient(<CartonPlanViewer orderId="o1" />);
    for (const label of [/تجاوز/, /اعتماد رغم/, /override/i, /force/i, /تخطي الفحص/]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("requires a reason before any manual action", async () => {
    const { CartonPlanViewer } = await import("../carton-plan-viewer");
    renderWithClient(<CartonPlanViewer orderId="o1" />);
    expect(screen.getByTestId("button-manual-pack-required")).toBeDisabled();
    expect(screen.getByTestId("button-release-cartons")).toBeDisabled();
  });

  it("warns that manual packing is not a validated plan and frees the holds", async () => {
    const { CartonPlanViewer } = await import("../carton-plan-viewer");
    renderWithClient(<CartonPlanViewer orderId="o1" />);
    expect(
      screen.getByText(/لا يُسجَّل كخطة آلية آمنة، ويحرّر كل حجوزات الكراتين/),
    ).toBeInTheDocument();
  });
});
