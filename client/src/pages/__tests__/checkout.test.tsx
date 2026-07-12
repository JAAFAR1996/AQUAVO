import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetLocation = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());
const mockClearCart = vi.hoisted(() => vi.fn());

vi.mock("wouter", () => ({
  useLocation: () => ["/checkout", mockSetLocation],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/contexts/cart-context", () => ({
  useCart: () => ({
    items: [{ id: "line-1", productId: "p1", name: "فلتر اختبار", price: 25000, quantity: 1, image: "/brand/aquavo-v2-icon.svg" }],
    totalPrice: 25000,
    clearCart: mockClearCart,
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/tiktok-pixel", () => ({ ttqInitiateCheckout: vi.fn(), ttqAddPaymentInfo: vi.fn(), ttqPlaceAnOrder: vi.fn() }));
vi.mock("@/lib/meta-pixel", () => ({ metaTrackInitiateCheckout: vi.fn(), metaTrackPurchase: vi.fn() }));
vi.mock("@/lib/analytics", () => ({
  trackBeginCheckout: vi.fn(),
  trackAddShippingInfo: vi.fn(),
  trackPurchase: vi.fn(),
}));

import CheckoutPage from "../checkout";

describe("checkout page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("shows COD, the fixed delivery fee and the visible total", () => {
    render(<CheckoutPage />);

    expect(screen.getByRole("heading", { level: 1, name: "إتمام الطلب" })).toBeInTheDocument();
    expect(screen.getAllByText(/الدفع عند الاستلام/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5,000 د\.ع/).length).toBeGreaterThan(0);
    expect(screen.getByText("30,000 د.ع")).toBeInTheDocument();
  });

  it("blocks progression and exposes field errors before any order request", async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);

    await user.click(screen.getByRole("button", { name: "الدفع عند الاستلام — تأكيد طلبي" }));

    expect(screen.getAllByRole("alert")).toHaveLength(4);
    expect(screen.getByText("الاسم مطلوب")).toBeInTheDocument();
    expect(screen.getByText("رقم الهاتف مطلوب")).toBeInTheDocument();
    expect(screen.getByText("يرجى اختيار المحافظة")).toBeInTheDocument();
    expect(screen.getByText("العنوان مطلوب")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "إتمام الطلب" })).toBeInTheDocument();
  });

  it("reviews valid delivery data before enabling the final order action", async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);

    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "جعفر محمد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف"), { target: { value: "07701234567" } });
    await user.click(screen.getByRole("combobox", { name: "المحافظة" }));
    await user.click(screen.getByRole("option", { name: "بغداد" }));
    fireEvent.change(screen.getByLabelText("العنوان"), { target: { value: "الكرادة داخل قرب ساحة كهرمانة" } });
    await user.click(screen.getByRole("button", { name: "الدفع عند الاستلام — تأكيد طلبي" }));

    expect(screen.getByRole("heading", { level: 1, name: "تأكيد الطلب" })).toBeInTheDocument();
    expect(screen.getByText("جعفر محمد")).toBeInTheDocument();
    expect(screen.getByText(/بغداد - الكرادة داخل/)).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "تأكيد الطلب" });
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(confirmButton).toBeEnabled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("completes the closed-circuit success path with a mocked server response", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "order-test", orderNumber: "FH-TEST", roundedTotal: 30000, shippingCost: 5000, discountTotal: 0, status: "pending" }),
    });
    render(<CheckoutPage />);

    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "جعفر محمد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف"), { target: { value: "07701234567" } });
    await user.click(screen.getByRole("combobox", { name: "المحافظة" }));
    await user.click(screen.getByRole("option", { name: "بغداد" }));
    fireEvent.change(screen.getByLabelText("العنوان"), { target: { value: "الكرادة داخل قرب ساحة كهرمانة" } });
    await user.click(screen.getByRole("button", { name: "الدفع عند الاستلام — تأكيد طلبي" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    expect(await screen.findByRole("heading", { level: 1, name: "تم استلام طلبك بنجاح" })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/orders", expect.objectContaining({ method: "POST" }));
    const request = mockFetch.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.items).toEqual([{ productId: "p1", quantity: 1 }]);
    expect(body.items[0]).not.toHaveProperty("price");
    expect(mockClearCart).toHaveBeenCalledTimes(1);
    expect(mockSetLocation).toHaveBeenCalledWith("/order-confirmation/order-test");
  });
});
