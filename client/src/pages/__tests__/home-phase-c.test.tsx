/**
 * AQUAVO Phase C homepage contract — landmark uniqueness, store-picks
 * loading/populated/empty/error states, the new value/trust section,
 * reduced-motion content visibility, hero LCP contract, and a guard
 * against rejected identity tokens (colors/fonts) creeping back in.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { Product } from "@/types";

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("@/components/navbar", () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("@/components/footer", () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock("@/components/whatsapp-widget", () => ({
  WhatsAppWidget: () => <div data-testid="whatsapp-widget">WhatsApp</div>,
}));

vi.mock("@/components/back-to-top", () => ({
  BackToTop: () => <div data-testid="back-to-top">Back to Top</div>,
}));

vi.mock("@/contexts/cart-context", () => ({
  useCart: () => ({ items: [], itemCount: 0 }),
}));

vi.mock("@/contexts/wishlist-context", () => ({
  useWishlist: () => ({ items: [], itemCount: 0 }),
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

const fetchTopSellingProducts = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchTopSellingProducts: () => fetchTopSellingProducts(),
}));

import Home from "../home";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const sampleProducts: Product[] = [
  { id: "1", slug: "test-filter", name: "فلتر تجريبي", images: ["/img/a.webp"], price: 25000 },
  { id: "2", slug: "test-heater", name: "سخان تجريبي", images: ["/img/b.webp"], price: 18000 },
] as unknown as Product[];

describe("Home — Phase C store-picks states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never lets the store-picks section silently disappear across states", async () => {
    fetchTopSellingProducts.mockResolvedValueOnce({ productOfWeek: null, bestSellers: [], hasRealSales: false });
    render(<Home />, { wrapper: createWrapper() });
    // Heading is present immediately (loading) and stays present after resolution (empty).
    expect(screen.getByRole("heading", { name: "اختيارات متوفرة هسه" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/الاختيارات المميزة مو متوفرة هسه/)).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "اختيارات متوفرة هسه" })).toBeInTheDocument();
  });

  it("shows a loading state before data resolves", () => {
    fetchTopSellingProducts.mockImplementation(() => new Promise(() => {}));
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByRole("status", { name: "جاري تحميل الاختيارات" })).toBeInTheDocument();
  });

  it("shows a non-empty-page empty state with a link to all products, without a false 'coming soon' claim", async () => {
    fetchTopSellingProducts.mockResolvedValueOnce({ productOfWeek: null, bestSellers: [], hasRealSales: false });
    render(<Home />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/الاختيارات المميزة مو متوفرة هسه/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/قريباً/)).not.toBeInTheDocument();
    const allProductsLinks = screen.getAllByRole("link", { name: /شوف كل المنتجات/ });
    expect(allProductsLinks.some((link) => link.getAttribute("href") === "/products")).toBe(true);
  });

  it("shows an error state with a recovery link when the query fails", async () => {
    fetchTopSellingProducts.mockRejectedValueOnce(new Error("network down"));
    render(<Home />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/تعذر علينا تحميل الاختيارات المختارة هسه/)).toBeInTheDocument();
    });
  });

  it("renders real product links when store picks are populated", async () => {
    fetchTopSellingProducts.mockResolvedValueOnce({ productOfWeek: null, bestSellers: sampleProducts, hasRealSales: true });
    render(<Home />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /فلتر تجريبي/ })).toHaveAttribute("href", "/products/test-filter");
    });
  });
});

describe("Home — Phase C structure and landmarks", () => {
  beforeEach(() => {
    fetchTopSellingProducts.mockResolvedValueOnce({ productOfWeek: null, bestSellers: [], hasRealSales: false });
  });

  it("gives the homepage trust strip a landmark name distinct from the footer's", () => {
    render(<Home />, { wrapper: createWrapper() });
    // FIX B: the home trust strip must not reuse the footer's "معلومات الخدمة" label.
    expect(screen.getByRole("region", { name: "ضمانات المتجر" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "معلومات الخدمة" })).not.toBeInTheDocument();
  });

  it("includes a dedicated value/trust section with defensible, non-fake claims", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByRole("heading", { name: "تسوق واضح من أول قسم للسلة" })).toBeInTheDocument();
    expect(screen.getByText(/تخصص فعلي/)).toBeInTheDocument();
    expect(screen.queryByText(/ضمان مدى الحياة/)).not.toBeInTheDocument();
    expect(screen.queryByText(/شهادة/)).not.toBeInTheDocument();
  });

  it("keeps exactly one h1 and one main region", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("preserves the hero LCP contract", () => {
    render(<Home />, { wrapper: createWrapper() });
    const heroImage = screen.getByAltText("حوض عرض مائي مرتب بإضاءة هادئة");
    expect(heroImage).toHaveAttribute("fetchpriority", "high");
    expect(heroImage).not.toHaveAttribute("loading", "lazy");
    expect(heroImage).toHaveAttribute("width", "1024");
    expect(heroImage).toHaveAttribute("height", "1024");
    expect(heroImage.getAttribute("sizes")).toBe("(max-width: 1024px) 100vw, 48vw");
    expect(heroImage.getAttribute("sizes")).not.toContain("66vw");
  });

  it("keeps critical hero CTAs at a touch-friendly minimum height", () => {
    render(<Home />, { wrapper: createWrapper() });
    const primaryCta = screen.getByRole("link", { name: /شوف المنتجات/i });
    const secondaryCta = screen.getByRole("link", { name: /اختار حسب حوضك/i });
    expect(primaryCta.className).toMatch(/min-h-12/);
    expect(secondaryCta.className).toMatch(/min-h-12/);
  });
});

describe("Home — Phase C identity guardrails", () => {
  const source = readFileSync(path.resolve(__dirname, "../home.tsx"), "utf-8");

  it("does not introduce rejected AQUAVO colors", () => {
    const rejected = ["#FF7B5A", "#ff7b5a", "#FFD700", "#ffd700", "#199BB8", "#199bb8", "#7ed9e3", "#7ED9E3"];
    for (const color of rejected) {
      expect(source).not.toContain(color);
    }
  });

  it("does not introduce rejected fonts", () => {
    expect(source).not.toMatch(/Tajawal/i);
    expect(source).not.toMatch(/Poppins/i);
  });

  it("uses the display font for the large hero heading", () => {
    expect(source).toMatch(/font-display[^"]*text-\[2\.55rem\]/);
  });
});

describe("Home — Phase C reduced motion", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    fetchTopSellingProducts.mockResolvedValueOnce({ productOfWeek: null, bestSellers: [], hasRealSales: false });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: originalMatchMedia });
  });

  it("shows all section content immediately when reduced motion is preferred", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "ابدأ من احتياج الحوض" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "تسوق واضح من أول قسم للسلة" })).toBeVisible();
  });
});
