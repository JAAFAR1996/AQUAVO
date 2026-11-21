import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Product } from "@/types";

const addItem = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/cart-context", () => ({ useCart: () => ({ addItem, items: [] }) }));
vi.mock("@/contexts/comparison-context", () => ({
  useComparison: () => ({
    compareIds: ["incoming-fixture"], removeFromCompare: vi.fn(), clearCompare: vi.fn(),
  }),
}));
vi.mock("@/components/wishlist/wishlist-button", () => ({ WishlistButton: () => <button>المفضلة</button> }));
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import { QuickViewModal } from "../quick-view-modal";
import { ComparisonDrawer, ProductComparisonTable } from "../product-comparison";

const product: Product = {
  id: "incoming-fixture", slug: "incoming-fixture", name: "فلتر للحوض", brand: "HOUYI",
  price: 17500, originalPrice: 20000, stock: 0, hasVariants: false,
  category: "الفلترة والتنقية", rating: 0, reviewCount: 0, images: [], thumbnail: "",
  specifications: { __availabilityStatus: "coming_soon", "المقاسات القادمة": "30 سم" },
};

describe("incoming products on secondary shopping surfaces", () => {
  it("uses the brand icon for missing photos across quick view and all comparison views, preserving real photos", async () => {
    const before = JSON.stringify(product);
    const logo = "/brand/aquavo-v2-icon.svg";
    const photo = "https://cdn.example.test/products/exact-product.jpg";
    const photographed = { ...product, thumbnail: photo, images: [photo] };
    const expectPhoto = (container: HTMLElement, source: string) => {
      const images = container.querySelectorAll("img");
      expect(images).toHaveLength(1);
      for (const image of images) expect(image).toHaveAttribute("src", source);
    };

    const quickView = render(<QuickViewModal product={product} isOpen onClose={vi.fn()} />);
    expectPhoto(quickView.baseElement, logo);
    quickView.rerender(<QuickViewModal product={photographed} isOpen onClose={vi.fn()} />);
    expectPhoto(quickView.baseElement, photo);
    quickView.unmount();

    const table = render(<ProductComparisonTable products={[product]} />);
    expectPhoto(table.container, logo);
    table.rerender(<ProductComparisonTable products={[photographed]} />);
    expectPhoto(table.container, photo);
    table.unmount();

    // Comparison is sourced by saved IDs, independently of the listing page.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const queryKey = ["comparison-products", [product.id]];
    queryClient.setQueryData(queryKey, [product]);
    const drawer = render(<QueryClientProvider client={queryClient}><ComparisonDrawer /></QueryClientProvider>);
    expectPhoto(drawer.container, logo);
    fireEvent.click(drawer.getByRole("button"));
    expectPhoto(drawer.container, logo);
    act(() => { queryClient.setQueryData(queryKey, [photographed]); });
    await waitFor(() => expectPhoto(drawer.container, photo));
    expect(JSON.stringify(product)).toBe(before);
    expect(addItem).not.toHaveBeenCalled();
    drawer.unmount();
    queryClient.clear();
  });

  it("keeps the quick view price and disables its incoming action until real stock arrives", () => {
    const before = JSON.stringify(product);
    const { rerender } = render(<QuickViewModal product={product} isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "قريباً" })).toBeDisabled();
    expect(screen.getByText(/17,500/)).toBeInTheDocument();
    expect(JSON.stringify(product)).toBe(before);
    expect(addItem).not.toHaveBeenCalled();
    rerender(<QuickViewModal product={{ ...product, stock: 2 }} isOpen onClose={vi.fn()} />);
    expect(screen.queryByText("قريباً")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "أضف للسلة" })).toBeEnabled();
  });

  it("shows incoming status in comparisons without leaking metadata or changing the price", () => {
    const before = JSON.stringify(product);
    const { container } = render(<ProductComparisonTable products={[product]} />);
    expect(screen.getByRole("button", { name: "قريباً" })).toBeDisabled();
    expect(screen.getByText(/17,500/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/__availabilityStatus|coming_soon/);
    expect(screen.getByText("المقاسات القادمة")).toBeInTheDocument();
    expect(JSON.stringify(product)).toBe(before);
    expect(addItem).not.toHaveBeenCalled();
  });
});
