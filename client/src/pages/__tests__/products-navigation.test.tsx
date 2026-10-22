import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import i18next from "i18next";
import type { FilterState } from "@/components/products/filter-modal";
import type { Product } from "@/types";
import type { FoodFilter } from "@shared/food-choice";

type ListingState = {
  filters: FilterState;
  sortBy: string;
  foodFilter: FoodFilter;
  displayCount: number;
};
type RestorationOptions = { kind: string; state: ListingState; ready: boolean; contentKey: string };

const controls = vi.hoisted(() => ({
  isRestoring: false,
  sentinelInView: false,
  user: null as { id: string } | null,
  latest: undefined as RestorationOptions | undefined,
  navigate: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => [window.location.pathname, controls.navigate],
  useSearch: () => window.location.search.slice(1),
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("@/hooks/use-listing-restoration", () => ({
  useListingRestoration: (options: RestorationOptions) => {
    controls.latest = options;
    return { containerRef: { current: null }, isRestoring: controls.isRestoring };
  },
}));
vi.mock("@/hooks/use-in-view", () => ({
  useInView: () => ({ ref: { current: null }, inView: controls.sentinelInView }),
}));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: controls.user }) }));
vi.mock("@/i18n/locale-context", () => ({ useLocale: () => ({ locale: "ar", dir: "rtl" }) }));
vi.mock("@/lib/posthog", () => ({ phTrackCategoryClick: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackViewItemList: vi.fn() }));
vi.mock("@/lib/api", () => ({
  fetchProducts: vi.fn(), fetchProductAttributes: vi.fn(), fetchPersonalizedOrder: vi.fn(),
}));
vi.mock("@/components/seo/meta-tags", () => ({
  MetaTags: () => null, ItemListSchema: () => null, BreadcrumbSchema: () => null,
}));
vi.mock("@/components/seo/guide-links-section", () => ({ GuideLinksSection: () => null }));
vi.mock("@/components/seo/category-intro", () => ({ CategoryIntro: () => null }));
vi.mock("@/components/back-to-top", () => ({ BackToTop: () => null }));
vi.mock("@/components/products/product-comparison", () => ({ ComparisonDrawer: () => null }));
vi.mock("@/components/products/product-card", () => ({
  ProductCard: ({ product }: { product: Product }) => <article data-testid="product-card">{product.id}</article>,
}));
vi.mock("@/components/products/category-scroll-bar", () => ({
  CategoryScrollBar: ({ onCategoryToggle }: { onCategoryToggle: (category: string) => void }) => (
    <button onClick={() => onCategoryToggle("فلاتر")}>Toggle filter category</button>
  ),
}));
vi.mock("@/components/products/filter-bar", () => ({
  FilterBar: ({ filters, onFiltersChange }: { filters: FilterState; onFiltersChange: (value: FilterState) => void }) => (
    <>
      <button onClick={() => onFiltersChange({ ...filters, brands: [...filters.brands] })}>Apply same filters</button>
      <button onClick={() => onFiltersChange({ ...filters, brands: ["Other brand"] })}>Change brand</button>
    </>
  ),
}));
vi.mock("@/components/products/food-choice-guide", () => ({
  FoodCategoryGuide: ({ value, onChange }: { value: FoodFilter; onChange: (value: FoodFilter) => void }) => (
    <select aria-label="Food" value={value} onChange={event => onChange(event.target.value as FoodFilter)}>
      <option value="all">All food</option>
      <option value="betta">Betta food</option>
      <option value="goldfish">Goldfish food</option>
    </select>
  ),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => (
    <select aria-label="Sort" value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

import Products from "../products";
import { fetchProducts, fetchProductAttributes, fetchPersonalizedOrder } from "@/lib/api";
import { getNavigationEntry, installListingNavigation, saveListingSnapshot } from "@/lib/listing-navigation";
import { PRODUCT_TAG_VALUES } from "@/lib/product-filter-values";

const attributes = { categories: ["طعام الأسماك", "فلاتر"], brands: ["YEE"], minPrice: 100, maxPrice: 500000 };
const products: Product[] = Array.from({ length: 60 }, (_, index) => ({
  id: String(index + 1), slug: `product-${index + 1}`, name: `Betta food ${index + 1}`,
  category: "طعام الأسماك", brand: "YEE", price: 10000, stock: 2,
  difficulty: "easy", ecoFriendly: true, rating: 5, reviewCount: 1, thumbnail: "", images: [],
}));
const defaultFilters: FilterState = {
  priceRange: [100, 500000], categories: [], brands: [], difficulties: [], tags: [],
};

let uninstall: (() => void) | undefined;
const clients: QueryClient[] = [];

function startAt(url: string) {
  uninstall?.();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", url);
  uninstall = installListingNavigation();
}

function saveState(overrides: Partial<ListingState> = {}): ListingState {
  const state = { filters: defaultFilters, sortBy: "default", foodFilter: "all" as const, displayCount: 48, ...overrides };
  saveListingSnapshot(getNavigationEntry(), "products", state, { y: 1200 });
  return state;
}

function newQueryClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return client;
}

function renderProducts(client = newQueryClient()) {
  return render(<Products />, {
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe("Products history state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controls.navigate.mockReset();
    controls.isRestoring = false;
    controls.sentinelInView = false;
    controls.user = null;
    controls.latest = undefined;
    startAt("/products");
    vi.mocked(fetchProducts).mockResolvedValue({ products });
    vi.mocked(fetchProductAttributes).mockResolvedValue(attributes);
    vi.mocked(fetchPersonalizedOrder).mockResolvedValue({ boostIds: [] });
  });

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    for (const client of clients.splice(0)) client.clear();
  });

  it("restores every filter, sort, food choice and loaded count before querying, without URL defaults overwriting them", async () => {
    startAt("/products?category=filters&sort=best-selling&food=goldfish&search=food");
    const saved = saveState({
      filters: {
        priceRange: [1000, 1000000], categories: ["طعام الأسماك"], brands: ["YEE"],
        difficulties: ["easy"], tags: [PRODUCT_TAG_VALUES.new, "in-stock"],
      },
      sortBy: "price-asc", foodFilter: "betta",
    });
    renderProducts();

    await waitFor(() => expect(controls.latest?.ready).toBe(true));
    expect(controls.latest?.state).toEqual(saved);
    expect(screen.getAllByTestId("product-card")).toHaveLength(48);
    expect(screen.getByLabelText("Sort")).toHaveValue("price-asc");
    expect(screen.getByLabelText("Food")).toHaveValue("betta");
    expect(vi.mocked(fetchProducts).mock.calls[0][0]).toEqual({
      category: ["طعام الأسماك"], brand: ["YEE"], minPrice: 1000, search: "food", isNew: true,
      sortBy: "price", sortOrder: "asc",
    });
    expect(controls.latest?.contentKey.split(",")).toHaveLength(48);
  });

  it("rejects corrupt saved counts and initializes a fresh listing from category, search, best-selling and food links", async () => {
    startAt(`/products?category=${encodeURIComponent("طعام الأسماك")}&food=betta&sort=best-selling&search=food`);
    const saved = saveState();
    saveListingSnapshot(getNavigationEntry(), "products", { ...saved, displayCount: Number.NaN }, { y: 1200 });
    renderProducts();

    await waitFor(() => expect(controls.latest?.ready).toBe(true));
    expect(controls.latest?.state).toEqual({
      filters: { ...defaultFilters, categories: ["طعام الأسماك"], tags: [PRODUCT_TAG_VALUES.bestSeller] },
      sortBy: "rating-desc", foodFilter: "betta", displayCount: 24,
    });
    expect(screen.getAllByTestId("product-card")).toHaveLength(24);
    expect(fetchProducts).toHaveBeenCalledWith(expect.objectContaining({ search: "food", isBestSeller: true, sortBy: "rating" }));
  });

  it("starts at 24 on a new PUSH to the same listing instead of leaking a previous entry's filters", async () => {
    saveState({ filters: { ...defaultFilters, brands: ["YEE"] }, sortBy: "price-desc" });
    window.history.pushState({}, "", "/products");
    renderProducts();

    await waitFor(() => expect(controls.latest?.ready).toBe(true));
    expect(controls.latest?.state).toEqual({ filters: defaultFilters, sortBy: "default", foodFilter: "all", displayCount: 24 });
    expect(screen.getAllByTestId("product-card")).toHaveLength(24);
  });

  it("restores the matching listing entry after navigating to a product and going Back", async () => {
    const entry = getNavigationEntry();
    const saved = saveState({ filters: { ...defaultFilters, brands: ["YEE"] }, sortBy: "price-desc" });
    window.history.pushState({}, "", "/products/product-40");
    window.history.back();
    await waitFor(() => expect(getNavigationEntry()).toMatchObject({ key: entry.key, type: "pop", url: "/products" }));
    renderProducts();

    await waitFor(() => expect(controls.latest?.ready).toBe(true));
    expect(controls.latest?.state).toEqual(saved);
    expect(screen.getAllByTestId("product-card")).toHaveLength(48);
  });

  it("keeps the loaded count for unchanged selections and resets it only when the user changes sorting or filters", async () => {
    saveState();
    renderProducts();
    await waitFor(() => expect(controls.latest?.ready).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Apply same filters" }));
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "default" } });
    expect(controls.latest?.state.displayCount).toBe(48);

    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "price-asc" } });
    await waitFor(() => expect(controls.latest?.ready).toBe(true));
    expect(controls.latest?.state.displayCount).toBe(24);
    fireEvent.click(screen.getByRole("button", { name: i18next.t("products:results.loadMore") }));
    expect(controls.latest?.state.displayCount).toBe(48);
    fireEvent.click(screen.getByRole("button", { name: "Change brand" }));
    await waitFor(() => expect(controls.latest?.ready).toBe(true));
    expect(controls.latest?.state.displayCount).toBe(24);
    expect(controls.latest?.state.filters.brands).toEqual(["Other brand"]);
  });

  it("updates the shareable food URL with REPLACE while preserving other query parameters, filters and sorting", async () => {
    const params = new URLSearchParams({ category: "طعام الأسماك", food: "betta", search: "food", sort: "best-selling", campaign: "guide" });
    startAt(`/products?${params.toString()}`);
    const entryKey = getNavigationEntry().key;
    controls.navigate.mockImplementation((url: string, options?: { replace?: boolean }) => {
      if (options?.replace) window.history.replaceState({}, "", url);
      else window.history.pushState({}, "", url);
    });
    const saved = saveState({
      filters: { ...defaultFilters, categories: ["طعام الأسماك"], brands: ["YEE"] },
      sortBy: "price-asc", foodFilter: "betta",
    });
    renderProducts();
    await waitFor(() => expect(controls.latest?.ready).toBe(true));

    fireEvent.change(screen.getByLabelText("Food"), { target: { value: "goldfish" } });
    params.set("food", "goldfish");
    expect(controls.latest?.state).toEqual({ ...saved, foodFilter: "goldfish", displayCount: 24 });
    expect(controls.navigate).toHaveBeenLastCalledWith(`/products?${params.toString()}`, { replace: true });
    expect(window.location.search).toBe(`?${params.toString()}`);
    expect(getNavigationEntry().key).toBe(entryKey);

    fireEvent.change(screen.getByLabelText("Food"), { target: { value: "all" } });
    params.delete("food");
    expect(controls.latest?.state).toEqual({ ...saved, foodFilter: "all", displayCount: 24 });
    expect(controls.navigate).toHaveBeenLastCalledWith(`/products?${params.toString()}`, { replace: true });
    expect(window.location.search).toBe(`?${params.toString()}`);
    expect(getNavigationEntry().key).toBe(entryKey);
  });

  it("does not auto-load more while restoring, even when the sentinel is visible", async () => {
    saveState();
    controls.isRestoring = true;
    controls.sentinelInView = true;
    const view = renderProducts();
    await waitFor(() => expect(controls.latest?.ready).toBe(true));
    expect(controls.latest?.state.displayCount).toBe(48);

    controls.isRestoring = false;
    view.rerender(<Products />);
    await waitFor(() => expect(screen.getAllByTestId("product-card")).toHaveLength(60));
  });

  it("preserves loaded products when asynchronous price-range initialization finishes", async () => {
    const pendingAttributes = deferred<typeof attributes>();
    vi.mocked(fetchProductAttributes).mockReturnValue(pendingAttributes.promise);
    renderProducts();
    await waitFor(() => expect(screen.getAllByTestId("product-card")).toHaveLength(24));
    expect(controls.latest?.ready).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: i18next.t("products:results.loadMore") }));
    expect(controls.latest?.state.displayCount).toBe(48);

    await act(async () => pendingAttributes.resolve(attributes));
    await waitFor(() => expect(controls.latest?.ready).toBe(true));
    expect(controls.latest?.state.filters.priceRange).toEqual([100, 500000]);
    expect(controls.latest?.state.displayCount).toBe(48);
  });

  it("waits for product and smart-order refetches even when both already have cached data", async () => {
    controls.user = { id: "customer" };
    startAt("/products?recommended=1");
    saveState({ sortBy: "smart" });
    const pendingProducts = deferred<{ products: Product[] }>();
    const pendingBoost = deferred<{ boostIds: string[] }>();
    vi.mocked(fetchProducts).mockReturnValue(pendingProducts.promise);
    vi.mocked(fetchPersonalizedOrder).mockReturnValue(pendingBoost.promise);
    const client = newQueryClient();
    client.setQueryData(["product-attributes"], attributes);
    client.setQueryData(["products", { sortBy: "createdAt", sortOrder: "desc" }], { products }, { updatedAt: 1 });
    client.setQueryData(["personalized-order"], { boostIds: ["2"] }, { updatedAt: 1 });
    renderProducts(client);
    await waitFor(() => expect(screen.getAllByTestId("product-card")).toHaveLength(48));
    expect(controls.latest?.ready).toBe(false);

    await act(async () => pendingProducts.resolve({ products }));
    await waitFor(() => expect(fetchPersonalizedOrder).toHaveBeenCalled());
    expect(controls.latest?.ready).toBe(false);
    await act(async () => pendingBoost.resolve({ boostIds: ["3", "1"] }));
    await waitFor(() => expect(controls.latest?.ready).toBe(true));
    expect(screen.getAllByTestId("product-card")[0]).toHaveTextContent("3");
    expect(controls.latest?.state.displayCount).toBe(48);
  });
});
