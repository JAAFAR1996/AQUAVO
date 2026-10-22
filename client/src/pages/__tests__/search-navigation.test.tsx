import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Router, Switch } from "wouter";
import type { PropsWithChildren } from "react";
import type { Product } from "@/types";
import { freshwaterFish, type FishSpecies } from "@/data/freshwater-fish";
import { useListingRestoration } from "@/hooks/use-listing-restoration";

const sources = vi.hoisted(() => ({
  products: vi.fn<() => Promise<Product[]>>(),
  smart: vi.fn<() => Promise<{ products: Product[]; semantic: boolean }>>(),
  fish: vi.fn<() => Promise<FishSpecies[]>>(),
}));

vi.mock("@/lib/api", () => ({
  searchProducts: sources.products,
  fetchSmartSearch: sources.smart,
}));

vi.mock("@/hooks/use-fish-data", async () => {
  const { useQuery } = await import("@tanstack/react-query");
  return {
    useFishData: () => useQuery({
      queryKey: ["/api/fish"], queryFn: sources.fish, staleTime: 60_000, retry: false,
    }),
  };
});

// The shared hook has separate scroll tests; these exercise the real Wouter
// router, browser history, and search queries without mocking navigation.
vi.mock("@/hooks/use-listing-restoration", () => ({
  useListingRestoration: vi.fn(() => ({ containerRef: { current: null }, isRestoring: false })),
}));
vi.mock("@/lib/tiktok-pixel", () => ({ ttqSearch: vi.fn() }));
vi.mock("@/lib/meta-pixel", () => ({ metaTrackSearch: vi.fn() }));
vi.mock("@/components/seo/meta-tags", () => ({ MetaTags: () => null }));
vi.mock("@/components/products/product-card", async () => {
  const { Link } = await import("wouter");
  return {
    ProductCard: ({ product }: { product: Product }) => (
      <Link href={`/products/${product.slug}`} data-listing-item={`product:${product.id}`}>
        {product.name}
      </Link>
    ),
  };
});
vi.mock("@/components/fish/fish-card", () => ({
  FishCard: ({ fish }: { fish: FishSpecies }) => <p>{fish.commonName}</p>,
}));
vi.mock("@/components/fish/fish-detail-modal", () => ({ FishDetailModal: () => null }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange }: PropsWithChildren<{
    value: string; onValueChange: (value: string) => void;
  }>) => (
    <select aria-label="الترتيب" value={value} onChange={(event) => onValueChange(event.target.value)}>
      {["relevance", "price-asc", "price-desc", "rating"].map((sort) => (
        <option key={sort} value={sort}>{sort}</option>
      ))}
    </select>
  ),
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

import SearchResults from "../search-results";

const products: Product[] = Array.from({ length: 30 }, (_, index) => ({
  id: String(index + 1),
  slug: `pump-${index + 1}`,
  name: `pump filter ${String(index + 1).padStart(2, "0")}`,
  brand: "AQUAVO",
  price: index + 1,
  rating: 4,
  reviewCount: 1,
  thumbnail: "",
  images: [],
  category: "Equipment",
  stock: 10,
}));

const clients: QueryClient[] = [];

function renderSearch(url = "/search?q=pump&type=products&sort=price-asc&page=3", base = "") {
  window.history.replaceState(null, "", url);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <Router base={base}>
        <Switch>
          <Route path="/search" component={SearchResults} />
          <Route path="/products/:slug"><p>Product detail</p></Route>
        </Switch>
      </Router>
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}

const params = () => new URLSearchParams(window.location.search);
const thirdPageProduct = () => screen.findByRole("link", { name: "pump filter 25" });

beforeEach(() => {
  vi.mocked(useListingRestoration).mockClear();
  sources.products.mockReset().mockResolvedValue(products);
  sources.smart.mockReset().mockResolvedValue({ products: [], semantic: false });
  sources.fish.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
});

describe("search navigation", () => {
  it("restores page, query, type, sort, and locale after a product and browser Back", async () => {
    renderSearch("/en/search?q=pump&type=products&sort=price-asc&page=3&campaign=summer", "/en");
    fireEvent.click(await thirdPageProduct());
    await screen.findByText("Product detail");
    expect(window.location.pathname).toBe("/en/products/pump-25");

    act(() => window.history.back());
    await thirdPageProduct();
    expect(window.location.pathname).toBe("/en/search");
    expect(Object.fromEntries(params())).toEqual({
      q: "pump", type: "products", sort: "price-asc", page: "3", campaign: "summer",
    });
    expect(screen.getByRole("searchbox")).toHaveValue("pump");
    expect(screen.getByRole("combobox")).toHaveValue("price-asc");
    expect(screen.getByRole("button", { name: /^المنتجات/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("navigation", { name: "صفحات نتائج البحث" })).toHaveTextContent("صفحة 3 من 3");

    act(() => window.history.forward());
    await screen.findByText("Product detail");
    act(() => window.history.back());
    await thirdPageProduct();
    expect(params().get("page")).toBe("3");
  });

  it("reacts to a query-only URL change and resets page only for the new search", async () => {
    renderSearch("/search?q=pump&type=products&sort=price-asc&page=3&campaign=summer");
    await thirdPageProduct();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: " filter " } });
    fireEvent.submit(screen.getByRole("search"));

    await screen.findByRole("link", { name: "pump filter 01" });
    expect(window.location.pathname).toBe("/search");
    expect(Object.fromEntries(params())).toEqual({
      q: "filter", type: "products", sort: "price-asc", campaign: "summer",
    });
    expect(screen.getByRole("searchbox")).toHaveValue("filter");
    expect(sources.products).toHaveBeenCalledWith("filter", { throwOnError: true });
    expect(sources.smart).toHaveBeenCalledWith("filter", { throwOnError: true });
  });

  it("resets page for a type change without losing the query or unrelated parameters", async () => {
    renderSearch("/search?q=pump&type=products&sort=price-asc&page=3&campaign=summer");
    await thirdPageProduct();
    fireEvent.click(screen.getByRole("button", { name: /^الكل/ }));
    await screen.findByRole("link", { name: "pump filter 01" });
    expect(Object.fromEntries(params())).toEqual({ q: "pump", sort: "price-asc", campaign: "summer" });
  });

  it("resets page for a sort change and preserves the active type and query", async () => {
    renderSearch("/search?q=pump&type=products&sort=price-asc&page=3&campaign=summer");
    await thirdPageProduct();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "price-desc" } });
    await screen.findByRole("link", { name: "pump filter 30" });
    expect(Object.fromEntries(params())).toEqual({
      q: "pump", type: "products", sort: "price-desc", campaign: "summer",
    });
  });

  it("writes pagination to the URL and retains locale and unrelated parameters", async () => {
    renderSearch("/ckb/search?q=pump&type=products&sort=price-asc&campaign=summer", "/ckb");
    await screen.findByRole("link", { name: "pump filter 01" });
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    await screen.findByRole("link", { name: "pump filter 13" });
    expect(window.location.pathname).toBe("/ckb/search");
    expect(Object.fromEntries(params())).toEqual({
      q: "pump", type: "products", sort: "price-asc", campaign: "summer", page: "2",
    });
    fireEvent.click(screen.getByRole("button", { name: "السابق" }));
    await screen.findByRole("link", { name: "pump filter 01" });
    expect(params().has("page")).toBe(false);
  });

  it.each(["0", "-1", "1.5", "garbage", "9007199254740992"])(
    "treats invalid page %s as page 1",
    async (page) => {
      renderSearch(`/search?q=pump&type=products&sort=price-asc&page=${page}`);
      await screen.findByRole("link", { name: "pump filter 01" });
      expect(screen.getByRole("navigation", { name: "صفحات نتائج البحث" })).toHaveTextContent("صفحة 1 من 3");
    },
  );

  it("does not clamp a saved page before delayed semantic results arrive", async () => {
    const smart = deferred<{ products: Product[]; semantic: boolean }>();
    sources.products.mockResolvedValue(products.slice(0, 12));
    sources.smart.mockReturnValue(smart.promise);
    renderSearch();
    await waitFor(() => expect(sources.products).toHaveBeenCalled());
    expect(params().get("page")).toBe("3");

    await act(async () => smart.resolve({ products, semantic: true }));
    await thirdPageProduct();
    expect(params().get("page")).toBe("3");
  });

  it("waits for the fish catalogue before validating its saved page", async () => {
    const fish = deferred<FishSpecies[]>();
    sources.products.mockResolvedValue([]);
    sources.fish.mockReturnValue(fish.promise);
    renderSearch("/search?q=pump&type=fish&page=3");
    await waitFor(() => expect(sources.smart).toHaveBeenCalled());
    expect(params().get("page")).toBe("3");
    const fishMatches = Array.from({ length: 30 }, (_, index) => ({
      ...freshwaterFish[0], id: `fish-${index}`, commonName: `pump fish ${index + 1}`,
      scientificName: `Fish species ${index + 1}`,
    }));
    await act(async () => fish.resolve(fishMatches));
    await screen.findByText("pump fish 25");
    expect(params().get("page")).toBe("3");
  });

  it("replaces an out-of-range page only after every source completes", async () => {
    const smart = deferred<{ products: Product[]; semantic: boolean }>();
    sources.smart.mockReturnValue(smart.promise);
    renderSearch("/search?q=pump&type=products&sort=price-asc&page=999");
    const historyLength = window.history.length;
    await waitFor(() => expect(sources.products).toHaveBeenCalled());
    expect(params().get("page")).toBe("999");

    await act(async () => smart.resolve({ products: [], semantic: false }));
    await thirdPageProduct();
    expect(params().get("page")).toBe("3");
    expect(window.history.length).toBe(historyLength);
  });

  it("does not rewrite the saved page when a result source fails", async () => {
    sources.products.mockRejectedValue(new Error("Offline"));
    renderSearch();
    await screen.findByRole("heading", { name: "ماكو نتيجة مطابقة" });
    expect(params().get("page")).toBe("3");
  });

  it("restores available product results after optional semantic search fails", async () => {
    sources.smart.mockRejectedValue(new Error("Semantic search unavailable"));
    renderSearch();
    await thirdPageProduct();
    await waitFor(() => {
      expect(vi.mocked(useListingRestoration).mock.lastCall?.[0].ready).toBe(true);
    });
    expect(params().get("page")).toBe("3");
  });

  it("does not clamp an unavailable page after semantic search fails", async () => {
    sources.smart.mockRejectedValue(new Error("Semantic search unavailable"));
    sources.products.mockResolvedValue(products.slice(0, 12));
    renderSearch();
    await screen.findByRole("heading", { name: "ماكو نتيجة مطابقة" });
    expect(params().get("page")).toBe("3");
    expect(vi.mocked(useListingRestoration).mock.lastCall?.[0].ready).toBe(false);
  });

  it.each(["products", "pages"])("does not wait for unrelated fish loading to restore %s", async (type) => {
    const fish = deferred<FishSpecies[]>();
    sources.fish.mockReturnValue(fish.promise);
    renderSearch(`/search?q=pump&type=${type}&sort=price-asc`);
    await screen.findByRole("link", { name: type === "products" ? "pump filter 01" : /مضخات الهواء/ });
    await waitFor(() => {
      expect(vi.mocked(useListingRestoration).mock.lastCall?.[0].ready).toBe(true);
    });
    expect(screen.queryByRole("status", { name: "جاري تحميل نتائج البحث" })).not.toBeInTheDocument();
    await act(async () => fish.resolve([]));
  });
});
