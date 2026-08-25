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

// The confirmation step probes Al-Qaseh availability on mount, so fetch calls
// are no longer in a single predictable order. Responses are routed by URL and
// the order endpoint keeps its own queue, which also keeps `mock.calls[0]` from
// meaning "the order request".
const queuedOrderResponses = vi.hoisted(() => [] as Array<() => unknown>);

function queueOrderResponse(build: () => unknown) {
  queuedOrderResponses.push(build);
}

/** Answers the availability probe; everything else drains the order queue. */
function routeFetch(onlineAvailable: boolean) {
  mockFetch.mockImplementation(async (url: unknown) => {
    if (String(url).includes("/api/payments/alqaseh/availability")) {
      return { ok: true, json: async () => ({ available: onlineAvailable }) };
    }
    const next = queuedOrderResponses.shift();
    if (!next) throw new Error(`unqueued fetch in test: ${String(url)}`);
    return next();
  });
}

const orderCalls = () => mockFetch.mock.calls.filter(([url]) => url === "/api/orders");

describe("checkout page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queuedOrderResponses.length = 0;
    vi.stubGlobal("fetch", mockFetch);
    // Default to gateway-down so the COD assertions below stay deterministic;
    // the Al-Qaseh cases opt in explicitly.
    routeFetch(false);
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

    await user.click(screen.getByRole("button", { name: "مراجعة الطلب" }));

    expect(screen.getAllByRole("alert")).toHaveLength(4);
    expect(screen.getByText("الاسم مطلوب")).toBeInTheDocument();
    expect(screen.getByText("رقم الهاتف مطلوب")).toBeInTheDocument();
    expect(screen.getByText("يرجى اختيار المحافظة")).toBeInTheDocument();
    expect(screen.getByText("العنوان مطلوب")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "إتمام الطلب" })).toBeInTheDocument();
  });

  it("moves focus to the first invalid field on a failed submit", async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);

    await user.click(screen.getByRole("button", { name: "مراجعة الطلب" }));

    expect(await screen.findByLabelText("الاسم الكامل")).toHaveFocus();
  });

  it("moves focus to phone when only the name field is filled in", async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);

    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "جعفر محمد" } });
    await user.click(screen.getByRole("button", { name: "مراجعة الطلب" }));

    expect(await screen.findByLabelText("رقم الهاتف")).toHaveFocus();
  });

  it("marks invalid fields with aria-invalid and links them to their error text", async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);

    await user.click(screen.getByRole("button", { name: "مراجعة الطلب" }));

    const nameInput = screen.getByLabelText("الاسم الكامل");
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    const describedBy = nameInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("الاسم مطلوب");
  });

  it("reviews valid delivery data before enabling the final order action", async () => {
    const user = userEvent.setup();
    render(<CheckoutPage />);

    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "جعفر محمد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف"), { target: { value: "07701234567" } });
    await user.click(screen.getByRole("combobox", { name: "المحافظة" }));
    await user.click(screen.getByRole("option", { name: "بغداد" }));
    fireEvent.change(screen.getByLabelText("العنوان"), { target: { value: "الكرادة داخل قرب ساحة كهرمانة" } });
    await user.click(screen.getByRole("button", { name: "مراجعة الطلب" }));

    expect(screen.getByRole("heading", { level: 1, name: "تأكيد الطلب" })).toBeInTheDocument();
    expect(screen.getByText("جعفر محمد")).toBeInTheDocument();
    expect(screen.getByText(/بغداد - الكرادة داخل/)).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "تأكيد الطلب" });
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(confirmButton).toBeEnabled();
    // The availability probe is expected here; what must not have happened is an order.
    expect(orderCalls()).toHaveLength(0);
  });

  async function reachConfirmationStep(user: ReturnType<typeof userEvent.setup>) {
    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "جعفر محمد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف"), { target: { value: "07701234567" } });
    await user.click(screen.getByRole("combobox", { name: "المحافظة" }));
    await user.click(screen.getByRole("option", { name: "بغداد" }));
    fireEvent.change(screen.getByLabelText("العنوان"), { target: { value: "الكرادة داخل قرب ساحة كهرمانة" } });
    await user.click(screen.getByRole("button", { name: "مراجعة الطلب" }));
  }

  it("offers Al-Qaseh alongside COD when the gateway reports itself available", async () => {
    routeFetch(true);
    const user = userEvent.setup();
    render(<CheckoutPage />);
    await reachConfirmationStep(user);

    const online = await screen.findByRole("radio", { name: /الدفع الإلكتروني الآمن/ });
    expect(online).toBeEnabled();
    expect(screen.getByRole("radio", { name: /الدفع عند الاستلام/ })).toBeEnabled();
    // COD stays the default; choosing online is the customer's action.
    expect(screen.queryByText(/الدفع الإلكتروني غير متاح مؤقتاً/)).toBeNull();
  });

  it("falls back to COD, without losing the order, when the gateway is unavailable", async () => {
    routeFetch(false);
    const user = userEvent.setup();
    render(<CheckoutPage />);
    await reachConfirmationStep(user);

    expect(
      await screen.findByText(/الدفع الإلكتروني غير متاح مؤقتاً، لذلك يمكنك إكمال الطلب بالدفع عند الاستلام\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /الدفع الإلكتروني الآمن/ })).toBeDisabled();
    // The COD path must remain fully usable — an outage never blocks checkout.
    expect(screen.getByRole("radio", { name: /الدفع عند الاستلام/ })).toBeEnabled();
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "تأكيد الطلب" })).toBeEnabled();
  });

  it("completes the closed-circuit success path with a mocked server response", async () => {
    const user = userEvent.setup();
    queueOrderResponse(() => ({
      ok: true,
      json: async () => ({ id: "order-test", orderNumber: "FH-TEST", roundedTotal: 30000, shippingCost: 5000, discountTotal: 0, status: "pending" }),
    }));
    render(<CheckoutPage />);

    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "جعفر محمد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف"), { target: { value: "07701234567" } });
    await user.click(screen.getByRole("combobox", { name: "المحافظة" }));
    await user.click(screen.getByRole("option", { name: "بغداد" }));
    fireEvent.change(screen.getByLabelText("العنوان"), { target: { value: "الكرادة داخل قرب ساحة كهرمانة" } });
    await user.click(screen.getByRole("button", { name: "مراجعة الطلب" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    // Heading moved into <CheckoutSuccessFallback /> and was reworded in 32de533c.
    expect(await screen.findByRole("heading", { level: 1, name: "طلبك مسجّل" })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/orders", expect.objectContaining({ method: "POST" }));
    const request = orderCalls()[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.items).toEqual([{ productId: "p1", quantity: 1 }]);
    expect(body.items[0]).not.toHaveProperty("price");
    expect(mockClearCart).toHaveBeenCalledTimes(1);
    expect(mockSetLocation).toHaveBeenCalledWith("/order-confirmation/order-test");
  });

  it("disables the confirm button and blocks a second click while the order request is in flight", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (value: unknown) => void;
    queueOrderResponse(() =>
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    render(<CheckoutPage />);

    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "جعفر محمد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف"), { target: { value: "07701234567" } });
    await user.click(screen.getByRole("combobox", { name: "المحافظة" }));
    await user.click(screen.getByRole("option", { name: "بغداد" }));
    fireEvent.change(screen.getByLabelText("العنوان"), { target: { value: "الكرادة داخل قرب ساحة كهرمانة" } });
    await user.click(screen.getByRole("button", { name: "مراجعة الطلب" }));
    await user.click(screen.getByRole("checkbox"));

    const confirmButton = screen.getByRole("button", { name: "تأكيد الطلب" });
    await user.click(confirmButton);

    // Button must go busy/disabled immediately so a second click (or Enter
    // repeat) cannot fire a second POST while the first is still pending.
    expect(await screen.findByRole("button", { name: "جاري المعالجة..." })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "جاري المعالجة..." }));
    expect(orderCalls()).toHaveLength(1);

    resolveFetch({
      ok: true,
      json: async () => ({ id: "order-busy-test", orderNumber: "FH-BUSY", roundedTotal: 30000, shippingCost: 5000, discountTotal: 0, status: "pending" }),
    });
    // Heading moved into <CheckoutSuccessFallback /> and was reworded in 32de533c.
    expect(await screen.findByRole("heading", { level: 1, name: "طلبك مسجّل" })).toBeInTheDocument();
    expect(orderCalls()).toHaveLength(1);
  });

  it("applies a valid free_shipping coupon: delivery fee shows as free and the total drops by the delivery fee", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: "FREESHIP", type: "free_shipping", value: "0" }),
    });
    render(<CheckoutPage />);

    await user.click(screen.getByRole("button", { name: /عندك كود خصم؟/ }));
    await user.type(screen.getByPlaceholderText("أدخل الكود..."), "FREESHIP");
    await user.click(screen.getByRole("button", { name: "تطبيق" }));

    expect(await screen.findByText("تم تطبيق شحن مجاني")).toBeInTheDocument();
    expect(screen.getByText("مجاني")).toBeInTheDocument();
    // Product total only (25,000) since the 5,000 delivery fee is now waived —
    // both the subtotal line and the grand total now show this value.
    expect(screen.getAllByText("25,000 د.ع").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("30,000 د.ع")).not.toBeInTheDocument();
  });

  it("surfaces the server's rejection message for an invalid coupon instead of silently applying a discount", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "انتهت صلاحية هذا الكوبون" }),
    });
    render(<CheckoutPage />);

    await user.click(screen.getByRole("button", { name: /عندك كود خصم؟/ }));
    await user.type(screen.getByPlaceholderText("أدخل الكود..."), "EXPIRED");
    await user.click(screen.getByRole("button", { name: "تطبيق" }));

    expect(await screen.findByText("انتهت صلاحية هذا الكوبون")).toBeInTheDocument();
    // Total must remain the unmodified product+delivery total — no silent discount.
    expect(screen.getByText("30,000 د.ع")).toBeInTheDocument();
  });

  it("sends the applied coupon code with order creation so checkout-displayed and order-created totals stay consistent", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: "SAVE20", type: "percentage", value: "20" }),
    });
    queueOrderResponse(() => ({
      ok: true,
      json: async () => ({ id: "order-coupon-test", orderNumber: "FH-COUPON", roundedTotal: 25000, shippingCost: 5000, discountTotal: 5000, status: "pending" }),
    }));
    render(<CheckoutPage />);

    await user.click(screen.getByRole("button", { name: /عندك كود خصم؟/ }));
    await user.type(screen.getByPlaceholderText("أدخل الكود..."), "SAVE20");
    await user.click(screen.getByRole("button", { name: "تطبيق" }));
    expect(await screen.findByText(/تم تطبيق خصم 20%/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("الاسم الكامل"), { target: { value: "جعفر محمد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف"), { target: { value: "07701234567" } });
    await user.click(screen.getByRole("combobox", { name: "المحافظة" }));
    await user.click(screen.getByRole("option", { name: "بغداد" }));
    fireEvent.change(screen.getByLabelText("العنوان"), { target: { value: "الكرادة داخل قرب ساحة كهرمانة" } });
    await user.click(screen.getByRole("button", { name: "مراجعة الطلب" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    // Heading moved into <CheckoutSuccessFallback /> and was reworded in 32de533c.
    expect(await screen.findByRole("heading", { level: 1, name: "طلبك مسجّل" })).toBeInTheDocument();
    const orderCall = mockFetch.mock.calls.find(([url]) => url === "/api/orders");
    expect(orderCall).toBeDefined();
    const body = JSON.parse(String((orderCall![1] as RequestInit).body));
    expect(body.couponCode).toBe("SAVE20");
  });
});
