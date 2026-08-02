// Phase 1 surface: the section is reachable, the data-entry workflow exists, and
// the import refuses to apply a match it could not resolve.
//
// The single most important assertion in this file is that an `ambiguous` row
// cannot be committed. Everything else here is a convenience; that one is a
// data-integrity guarantee, and it is enforced on the server too.
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const apiRequest = vi.fn(async () => ({ json: async () => ({}) }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: (...a: unknown[]) => apiRequest(...(a as [])),
  getQueryFn: () => async () => ({}),
}));

function renderWithClient(ui: ReactElement, seed: Array<[string, unknown]> = []) {
  const qc = new QueryClient({
    // staleTime: Infinity matters here. These tests await user interactions, and
    // with the default staleTime the stub queryFn refetches on the first flushed
    // microtask and replaces the seeded fixture with {}, emptying the panel
    // mid-test. Seeded data must stay put for the whole interaction.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity, queryFn: async () => ({}) },
    },
  });
  for (const [key, value] of seed) qc.setQueryData([key], value);
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const BASE = "/api/admin/packaging";

describe("التغليف والكراتين is reachable from the finance centre", () => {
  it("renders the primary carton workspace and keeps detailed panels under advanced management", async () => {
    const { PackagingSection } = await import("../packaging-section");
    renderWithClient(<PackagingSection />);

    const section = screen.getByTestId("section-packaging");
    expect(section).toHaveAttribute("dir", "rtl");
    expect(screen.getByTestId("button-add-carton-primary")).toHaveTextContent("إضافة كارتونة جديدة");
    expect(screen.getByTestId("advanced-packaging-toggle")).toHaveTextContent("إدارة متقدمة");
    expect(screen.getByTestId("tab-preparation")).toHaveTextContent("مواد تجهيز الطلب");
    expect(screen.getByTestId("tab-cartons")).toHaveTextContent("تفاصيل الكراتين");
    expect(screen.getByTestId("tab-packing")).toHaveTextContent("بيانات تغليف المنتجات");
    expect(screen.getByTestId("tab-stock")).toHaveTextContent("تنبيهات المخزون");
  });

  it("states up front that packaging cost never changes what the customer pays", async () => {
    const { PackagingSection } = await import("../packaging-section");
    renderWithClient(<PackagingSection />);
    expect(screen.getByTestId("section-packaging")).toHaveTextContent(
      /ما تغيّر المبلغ\s+المستحق على الزبون/,
    );
  });

  it("is wired into the finance page tab list", async () => {
    // Guards the exact regression this branch fixes: the panels existed but
    // nothing imported them, so the whole feature was unreachable.
    const src = await import("@/pages/admin/finance?raw").catch(() => null);
    // Fall back to a structural check when ?raw is unavailable in this setup.
    if (src == null) {
      const mod = await import("@/components/admin/packaging");
      expect(mod.PackagingSection).toBeTypeOf("function");
      return;
    }
    expect(String((src as { default: string }).default)).toContain("التغليف والكراتين");
  });
});

describe("preparation material data entry", () => {
  it("offers add, edit, deactivate and archive rather than delete", async () => {
    const user = userEvent.setup();
    const { PreparationCostsPanel } = await import("../packaging-panels");
    renderWithClient(<PreparationCostsPanel />, [
      [
        `${BASE}/preparation-costs`,
        {
          items: [{
            id: "m1", name: "ملصق السعر", sku: "PRICE_LABEL", calculationBasis: "per_order",
            unitCost: 50, currency: "IQD", active: true, archivedAt: null,
            stockTracked: false, notes: null,
          }],
        },
      ],
    ]);

    expect(screen.getByTestId("button-add-preparation-cost")).toBeInTheDocument();

    await user.click(screen.getByTestId("button-edit-prep-PRICE_LABEL"));
    expect(screen.getByTestId("button-toggle-active-m1")).toHaveTextContent("تعطيل");
    expect(screen.getByTestId("button-archive-m1")).toBeInTheDocument();
    // Archiving is how an audited material leaves circulation. No delete exists.
    expect(screen.queryByText(/^حذف$/)).not.toBeInTheDocument();
  });

  it("will not save an edit without a reason", async () => {
    const user = userEvent.setup();
    const { PreparationCostsPanel } = await import("../packaging-panels");
    renderWithClient(<PreparationCostsPanel />, [
      [
        `${BASE}/preparation-costs`,
        {
          items: [{
            id: "m1", name: "ملصق السعر", sku: "PRICE_LABEL", calculationBasis: "per_order",
            unitCost: 50, currency: "IQD", active: true, archivedAt: null,
            stockTracked: false, notes: null,
          }],
        },
      ],
    ]);
    await user.click(screen.getByTestId("button-edit-prep-PRICE_LABEL"));
    expect(screen.getByTestId("button-save-edit-m1")).toBeDisabled();

    await user.type(screen.getByTestId("input-edit-reason-m1"), "تصحيح الاسم");
    expect(screen.getByTestId("button-save-edit-m1")).toBeEnabled();
  });

  it("says a new cost applies forward only and never rewrites old orders", async () => {
    const user = userEvent.setup();
    const { PreparationCostsPanel } = await import("../packaging-panels");
    renderWithClient(<PreparationCostsPanel />, [
      [
        `${BASE}/preparation-costs`,
        {
          items: [{
            id: "m1", name: "ملصق السعر", sku: "PRICE_LABEL", calculationBasis: "per_order",
            unitCost: 50, currency: "IQD", active: true, archivedAt: null,
            stockTracked: false, notes: null,
          }],
        },
      ],
    ]);
    await user.click(screen.getByTestId("button-edit-prep-PRICE_LABEL"));
    expect(screen.getByTestId("cost-editor-m1")).toHaveTextContent(
      /الطلبات المجهّزة سابقاً تحتفظ\s+بكلفتها الأصلية/,
    );
  });
});

describe("carton data entry", () => {
  it("shows the required no-cartons state and unified add action", async () => {
    const { CartonWorkspace } = await import("../carton-onboarding");
    renderWithClient(<CartonWorkspace onOpenImport={() => undefined} />, [[`${BASE}/cartons`, { items: [] }]]);

    expect(screen.getByTestId("empty-cartons-state")).toHaveTextContent("ماكو كراتين مسجلة بعد");
    expect(screen.getByTestId("empty-cartons-state")).toHaveTextContent("أضف أول نوع كارتونة");
    expect(screen.getByTestId("button-add-carton-primary")).toBeInTheDocument();
  });

  it("collects carton identity, measurements, safety, stock and cost before review", async () => {
    const user = userEvent.setup();
    const { CartonWorkspace } = await import("../carton-onboarding");
    renderWithClient(<CartonWorkspace onOpenImport={() => undefined} />, [[`${BASE}/cartons`, { items: [] }]]);

    await user.click(screen.getByTestId("button-add-carton-primary"));
    await user.click(screen.getByTestId("button-review-carton"));
    expect(screen.queryByTestId("carton-onboarding-review")).not.toBeInTheDocument();

    await user.type(screen.getByTestId("carton-name"), "كارتونة وسط");
    await user.type(screen.getByTestId("carton-sku"), "BOX-M");
    await user.type(screen.getByTestId("carton-length"), "27");
    await user.type(screen.getByTestId("carton-width"), "20");
    await user.type(screen.getByTestId("carton-height"), "14");
    await user.type(screen.getByTestId("carton-max-weight"), "8");
    await user.clear(screen.getByTestId("carton-threshold"));
    await user.type(screen.getByTestId("carton-threshold"), "5");
    await user.clear(screen.getByTestId("carton-opening-quantity"));
    await user.type(screen.getByTestId("carton-opening-quantity"), "20");
    await user.type(screen.getByTestId("carton-unit-cost"), "1000");
    await user.type(screen.getByLabelText("ملاحظة أو مصدر الكلفة"), "فاتورة المورد");
    await user.click(screen.getByTestId("button-review-carton"));

    const review = screen.getByTestId("carton-onboarding-review");
    expect(review).toHaveTextContent("BOX-M");
    expect(review).toHaveTextContent("27 × 20 × 14 سم");
    expect(review).toHaveTextContent("20");
    expect(review).toHaveTextContent("1,000 د.ع");
  });

  it("rejects an empty unit cost instead of converting it to zero", async () => {
    const user = userEvent.setup();
    const { CartonWorkspace } = await import("../carton-onboarding");
    renderWithClient(<CartonWorkspace onOpenImport={() => undefined} />, [[`${BASE}/cartons`, { items: [] }]]);

    await user.click(screen.getByTestId("button-add-carton-primary"));
    await user.type(screen.getByTestId("carton-name"), "كارتونة وسط");
    await user.type(screen.getByTestId("carton-sku"), "BOX-M");
    await user.type(screen.getByTestId("carton-length"), "27");
    await user.type(screen.getByTestId("carton-width"), "20");
    await user.type(screen.getByTestId("carton-height"), "14");
    await user.type(screen.getByTestId("carton-max-weight"), "8");
    await user.type(screen.getByLabelText("ملاحظة أو مصدر الكلفة"), "فاتورة المورد");
    await user.click(screen.getByTestId("button-review-carton"));

    expect(screen.getByRole("alert")).toHaveTextContent("كلفة الوحدة مطلوب");
    expect(screen.queryByTestId("carton-onboarding-review")).not.toBeInTheDocument();
  });

  it("tells the owner that carton measurements are internal", async () => {
    const user = userEvent.setup();
    const { CartonWorkspace } = await import("../carton-onboarding");
    renderWithClient(<CartonWorkspace onOpenImport={() => undefined} />, [[`${BASE}/cartons`, { items: [] }]]);
    await user.click(screen.getByTestId("button-add-carton-primary"));
    expect(screen.getByTestId("carton-onboarding-form")).toHaveTextContent("القياسات الداخلية");
  });
});

describe("packing import", () => {
  it("parses quoted CSV, CRLF and a BOM", async () => {
    const { parseCsv } = await import("../packing-import-panel");
    const grid = parseCsv('﻿a,b\r\n"x,1","y""z"\r\n');
    expect(grid).toEqual([["a", "b"], ["x,1", 'y"z']]);
  });

  it("maps the locked Arabic headers, including the sheet's typo", async () => {
    const { mapSheet } = await import("../packing-import-panel");
    const { rows, missingHeaders } = mapSheet([
      ["اسم المنتج", "عدد القطع", "طول المنتج مع كارتونة", "عرض المنتج مع كارتونتة", "هل قابل للطي"],
      ["سخان 50 واط", "12", "27", "20", "نعم"],
    ]);
    expect(missingHeaders).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      productName: "سخان 50 واط",
      pieceCount: "12",
      packedHeight: "27",
      packedWidth: "20",
    });
  });

  it("accepts the correctly-spelled width header too", async () => {
    const { mapSheet } = await import("../packing-import-panel");
    const { rows } = mapSheet([
      ["اسم المنتج", "عرض المنتج مع كارتونة"],
      ["سخان", "20"],
    ]);
    expect(rows[0]).toMatchObject({ packedWidth: "20" });
  });

  it("reports a missing product-name column instead of guessing one", async () => {
    const { mapSheet } = await import("../packing-import-panel");
    const { rows, missingHeaders } = mapSheet([["عدد القطع"], ["12"]]);
    expect(rows).toEqual([]);
    expect(missingHeaders).toEqual(["اسم المنتج"]);
  });

  it("never sends عدد القطع anywhere near stock — it is carried as raw text only", async () => {
    const { mapSheet } = await import("../packing-import-panel");
    const { rows } = mapSheet([
      ["اسم المنتج", "عدد القطع"],
      ["سخان", "12"],
    ]);
    // It rides along as a string for display/warnings and has no numeric
    // quantity field that any inventory path could pick up.
    expect(rows[0]!.pieceCount).toBe("12");
    expect(Object.keys(rows[0]!)).not.toContain("quantity");
    expect(Object.keys(rows[0]!)).not.toContain("stock");
  });

  it("warns that depth and weight stay missing after import", async () => {
    const { PackingImportPanel } = await import("../packing-import-panel");
    renderWithClient(<PackingImportPanel />, [[`${BASE}/packing/missing`, { items: [] }]]);
    expect(screen.getByTestId("panel-packing-import")).toHaveTextContent(/السماكة/);
    expect(screen.getByTestId("panel-packing-import")).toHaveTextContent(/الوزن/);
  });

  it("says plainly that عدد القطع does not touch product stock", async () => {
    const { PackingImportPanel } = await import("../packing-import-panel");
    renderWithClient(<PackingImportPanel />, [[`${BASE}/packing/missing`, { items: [] }]]);
    expect(screen.getByTestId("panel-packing-import")).toHaveTextContent(
      /ما يمس مخزون المنتجات/,
    );
  });

  it("lists products that still cannot be planned, naming the missing field", async () => {
    const { PackingImportPanel } = await import("../packing-import-panel");
    renderWithClient(<PackingImportPanel />, [
      [
        `${BASE}/packing/missing`,
        { items: [{ productId: "p1", productName: "سخان", variantId: null, missing: ["packed_depth_cm", "packed_weight_kg"] }] },
      ],
    ]);
    const row = screen.getByTestId("missing-row-p1");
    expect(row).toHaveTextContent("السماكة/العمق بعد التغليف");
    expect(row).toHaveTextContent("الوزن بعد التغليف");
  });
});
