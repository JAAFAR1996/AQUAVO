import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Product } from "@/types";
import i18next from "i18next";

const controls = vi.hoisted(() => ({ navigate: vi.fn(), compareIds: ["outside-current-page"] }));
vi.mock("wouter", () => ({
  useLocation: () => ["/products", controls.navigate],
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("@/i18n/locale-context", () => ({ useLocale: () => ({ locale: "en", dir: "ltr" }) }));
vi.mock("@/lib/posthog", () => ({ phTrackSearch: vi.fn() }));
vi.mock("@/contexts/comparison-context", () => ({
  useComparison: () => ({ compareIds: controls.compareIds, removeFromCompare: vi.fn(), clearCompare: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({ fetchProducts: vi.fn(), fetchSmartSearch: vi.fn(), fetchProductsByIds: vi.fn() }));

import { GlobalSearch } from "./global-search";
import { ComparisonDrawer } from "@/components/products/product-comparison";
import { fetchProducts, fetchSmartSearch, fetchProductsByIds } from "@/lib/api";

const products = ["one", "two"].map(id => ({ id, slug: `filter-${id}`, name: `Filter ${id}`, brand: "YEE", category: "filters", price: 1000, stock: 2 })) as Product[];
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(fetchProducts).mockResolvedValue({ products });
  vi.mocked(fetchSmartSearch).mockResolvedValue({ products: [], semantic: false });
  vi.mocked(fetchProductsByIds).mockResolvedValue([{ ...products[0], id: "outside-current-page", name: "Saved filter" }]);
});
afterEach(() => { client.clear(); });

describe("bounded search and comparison", () => {
  it("loads products only for a query and keeps keyboard selection on the input", async () => {
    render(<GlobalSearch open onOpenChange={vi.fn()} />, { wrapper });
    const input = screen.getByRole("combobox");
    expect(fetchProducts).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "filter" } });
    await waitFor(() => expect(fetchProducts).toHaveBeenCalledWith({ search: "filter", limit: 24 }));
    await screen.findByRole("option", { name: /Filter one/ });
    expect(screen.getByRole("dialog")).toHaveAttribute("dir", "ltr");
    expect(input).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
    const clear = screen.getByRole("button", { name: i18next.t("search:global-search.s5") });
    clear.focus();
    fireEvent.keyDown(clear, { key: "Enter" });
    expect(controls.navigate).not.toHaveBeenCalled();
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: /Filter two/ }).id);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(controls.navigate).toHaveBeenCalledWith("/products/filter-two");
  });

  it("keeps selected comparison products when the catalogue page or filter changes", async () => {
    const view = render(<ComparisonDrawer products={[]} />, { wrapper });
    await waitFor(() => expect(fetchProductsByIds).toHaveBeenCalledWith(["outside-current-page"]));
    const dock = await screen.findByRole("button", { name: i18next.t("pages:product-comparison.s14", { v0: 1 }) });
    fireEvent.click(dock);
    await screen.findByAltText("Saved filter");
    view.rerender(<ComparisonDrawer products={[products[1]]} />);
    expect(screen.getByAltText("Saved filter")).toBeInTheDocument();
    expect(fetchProducts).not.toHaveBeenCalled();
  });
});
