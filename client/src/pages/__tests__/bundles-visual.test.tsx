import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import BundlesPage from "../bundles";
import { BundleContentsPreview } from "@/components/products/bundle-contents-preview";
import { formatIQD } from "@/lib/utils";

const mocks = vi.hoisted(() => ({
  products: [] as Array<Record<string, unknown>>,
  items: [] as Array<Record<string, unknown>>,
  addItem: vi.fn(async () => true),
  addItems: vi.fn(async () => 1),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === "growth-bundles" ? [{
      id: "bundle-1", slug: "test-bundle", nameAr: "Verified bundle", descriptionAr: "Real equipment",
      bundlePrice: 12000, retailSum: 12000, inStock: true, requiresVariantSelection: false,
      audienceTag: null, items: mocks.items,
    }] : { products: mocks.products },
    isLoading: false, isError: false,
  }),
}));
vi.mock("@/contexts/cart-context", () => ({ useCart: () => ({ addItem: mocks.addItem, addItems: mocks.addItems }) }));
vi.mock("@/contexts/shipping-fee-context", () => ({ useShippingFee: () => 5000 }));
vi.mock("@/i18n/locale-context", () => ({ useLocale: () => ({ locale: "en", dir: "ltr", intl: "en-US" }) }));
vi.mock("@/components/seo/meta-tags", () => ({ MetaTags: () => null }));
vi.mock("wouter", () => ({ Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a> }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.items = [{ productId: "filter", slug: "filter", name: "Filter", price: 6000, stock: 5, quantity: 2, required: true, variantId: null, variantLabel: null, thumbnail: "/test-parent.webp" }];
  mocks.products = [{ id: "filter", slug: "filter", name: "Filter", price: 6000, stock: 5, hasVariants: false, thumbnail: "/test-parent.webp", images: ["/test-parent.webp"] }];
});

function withVariant(overrides: Record<string, unknown> = {}) {
  mocks.items[0].variantId = "large";
  mocks.items[0].variantLabel = "Large";
  mocks.products[0].hasVariants = true;
  mocks.products[0].variants = [{ id: "large", label: "Large", price: 6000, stock: 5, images: ["/test-large.webp"], ...overrides }];
}

describe("bundle visual presentation and purchase guards", () => {
  it("shows actual item photo, quantity and confirmed price without changing the product route", () => {
    const { container } = render(<BundlesPage />);
    const link = screen.getByRole("link", { name: /Filter/ });
    expect(link).toHaveAttribute("href", "/products/filter");
    expect(link.querySelector("img")).toHaveAttribute("src", "/test-parent.webp");
    expect(link).toHaveTextContent("Quantity: 2");
    expect(link).toHaveTextContent(formatIQD(6000));
    expect(container.querySelector("main")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("button", { name: "Add bundle to cart" })).toBeEnabled();
  });

  it("uses the exact option photo, not the parent thumbnail", () => {
    withVariant();
    const { container } = render(<BundlesPage />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/test-large.webp");
    expect(container.querySelector('img[src="/test-parent.webp"]')).toBeNull();
  });

  it("honors an explicitly empty option gallery without falling back to stale images", () => {
    withVariant({ images: [], image: "/stale-option.webp" });
    const { container } = render(<BundlesPage />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Option photo not available yet")).toBeInTheDocument();
  });

  it.each([
    ["pending price", { priceStatus: "pending" }],
    ["coming soon", { availabilityStatus: "coming_soon" }],
    ["archived option", { isArchived: true }],
    ["insufficient option stock", { stock: 1 }],
    ["zero option price", { price: 0 }],
  ])("blocks purchase for %s even if the bundle response claims available", (_label, overrides) => {
    withVariant(overrides);
    render(<BundlesPage />);
    const button = screen.getByRole("button", { name: "Add bundle to cart" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.addItem).not.toHaveBeenCalled();
    expect(mocks.addItems).not.toHaveBeenCalled();
    expect(screen.queryByText("Included items in stock")).not.toBeInTheDocument();
  });

  it("does not substitute a parent price or image for an unknown variant", () => {
    withVariant();
    mocks.items[0].variantId = "missing";
    render(<BundlesPage />);
    const link = screen.getByRole("link", { name: /Filter/ });
    expect(link).toHaveTextContent("Price not confirmed yet");
    expect(link).not.toHaveTextContent(formatIQD(6000));
    expect(link.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: "Add bundle to cart" })).toBeDisabled();
  });

  it("does not display pending option prices as confirmed totals", () => {
    withVariant({ priceStatus: "pending", price: 6000 });
    render(<BundlesPage />);
    expect(screen.getAllByText("Price not confirmed yet")).toHaveLength(3);
    expect(screen.queryByText(formatIQD(12000))).not.toBeInTheDocument();
  });

  it("blocks a variant-bearing product without a resolved option", () => {
    mocks.products[0].hasVariants = true;
    render(<BundlesPage />);
    expect(screen.getByRole("button", { name: "Add bundle to cart" })).toBeDisabled();
  });

  it("blocks quantity beyond normal product stock", () => {
    mocks.products[0].stock = 1;
    render(<BundlesPage />);
    expect(screen.getByRole("button", { name: "Add bundle to cart" })).toBeDisabled();
  });
});

describe("homepage included-item overview", () => {
  it("shows only required item names, real quantities and nonvariant thumbnails", () => {
    const { container } = render(<BundleContentsPreview locale="en" items={[
      { productId: "required", name: "Required filter", required: true, quantity: 2, thumbnail: "/real-filter.webp" },
      { productId: "optional", name: "Optional heater", required: false, quantity: 1, thumbnail: "/optional.webp" },
      { productId: "variant", name: "Variant media", required: true, quantity: 3, variantId: "large", variantLabel: "Large", thumbnail: "/parent.webp" },
    ]} />);
    expect(screen.getByRole("list", { name: "Included items" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("×2")).toBeInTheDocument();
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.queryByText("Optional heater")).not.toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelector("img")).toHaveAttribute("src", "/real-filter.webp");
    expect(screen.getByLabelText("Option photo unavailable")).toBeInTheDocument();
  });

  it("uses an honest empty state rather than invented items", () => {
    const { container } = render(<BundleContentsPreview locale="en" items={[]} />);
    expect(screen.getByText("Item details are not available yet")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
