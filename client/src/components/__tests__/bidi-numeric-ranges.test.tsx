/**
 * The RTL numeric-range fix, asserted at the components that render catalogue and
 * order text rather than at the helper.
 *
 * `shared/i18n/__tests__/bidi.test.ts` proves the transform is correct and
 * `e2e/i18n-bidi.spec.ts` proves an isolated range reads left to right in a real
 * browser. What is left to pin is the wiring: that a product name, a spec value
 * and a cart line actually go through it, so a future refactor that drops the
 * call fails here instead of shipping "150-50" to a customer.
 *
 * These use fixtures on purpose — the local server runs on mock storage with no
 * catalogue, so this is the only place the component path can be exercised
 * without a database.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { LRI, PDI, stripBidiControls } from "@shared/i18n/bidi";

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("@/contexts/cart-context", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/contexts/cart-context");
  return { ...actual, useCart: () => ({ addItem: vi.fn(), items: [] }) };
});
vi.mock("@/contexts/wishlist-context", () => ({
  useWishlist: () => ({ addItem: vi.fn(), removeItem: vi.fn(), isInWishlist: vi.fn(() => false) }),
}));
vi.mock("@/contexts/comparison-context", () => ({
  useComparison: () => ({ addToCompare: vi.fn(), isInCompare: vi.fn(() => false) }),
}));

import { ProductCard } from "../products/product-card";
import { ProductSpecificationsTable } from "../products/product-specifications-table";
import { OrderSummary } from "../cart/checkout/order-summary";

/** An Arabic product name with the exact shape that reverses: "50-150 لتر". */
const RANGE_NAME = "فلتر داخلي للأحواض 50-150 لتر";
const ISOLATED = `فلتر داخلي للأحواض ${LRI}50-150${PDI} لتر`;

const product = {
  id: "prod-range",
  name: RANGE_NAME,
  slug: "filter-50-150",
  price: 25000,
  image: "/images/f.jpg",
  thumbnail: "/images/f.jpg",
  images: ["/images/f.jpg"],
  category: "فلاتر",
  stock: 10,
  rating: 4.5,
  reviewCount: 3,
  description: "مناسب للأحواض 50-150 لتر",
  specifications: { __cardBenefit: "يخدم أحواض 50-150 لتر" },
} as unknown as Parameters<typeof ProductCard>[0]["product"];

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** The text a user reads, with the invisible isolates removed. */
const readable = (el: HTMLElement | null) => stripBidiControls(el?.textContent ?? "");

describe("product card", () => {
  it("isolates the range in the product name", () => {
    renderWithClient(<ProductCard product={product} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.textContent).toBe(ISOLATED);
    // the reader still sees exactly the stored name
    expect(readable(heading)).toBe(RANGE_NAME);
  });

  it("isolates the range in the supporting line", () => {
    renderWithClient(<ProductCard product={product} />);
    expect(screen.getByText((_, el) => el?.textContent === `يخدم أحواض ${LRI}50-150${PDI} لتر`)).toBeTruthy();
  });
});

describe("specifications table", () => {
  it("isolates the range in a spec value and leaves the label alone", () => {
    render(<ProductSpecificationsTable specifications={{ "نطاق درجة الحرارة": "18-30 مئوية", "الماركة": "AQUAVO" }} />);
    const value = screen.getByText((_, el) => el?.tagName === "DD" && el.textContent === `${LRI}18-30${PDI} مئوية`);
    expect(value).toBeTruthy();
    expect(screen.getByText("نطاق درجة الحرارة").textContent).toBe("نطاق درجة الحرارة");
  });

  it("leaves a spec value with no range untouched", () => {
    render(<ProductSpecificationsTable specifications={{ "الماركة": "AQUAVO" }} />);
    expect(screen.getByText("AQUAVO").textContent).toBe("AQUAVO");
  });
});

describe("checkout order summary", () => {
  it("isolates the range in a cart line name", () => {
    render(
      <OrderSummary
        cartTotal={25000}
        deliveryFee={5000}
        discount={0}
        grandTotal={30000}
        isFreeShipping={false}
        getDeliveryEstimate={() => "24 ساعة"}
        cartItems={[{ id: "l1", productId: "prod-range", name: RANGE_NAME, price: 25000, quantity: 1, image: "/i.jpg", slug: "filter-50-150" }]}
      />,
    );
    const line = screen.getByText((_, el) => el?.tagName === "P" && el.textContent === ISOLATED);
    expect(line).toBeTruthy();
    expect(readable(line)).toBe(RANGE_NAME);
  });
});
