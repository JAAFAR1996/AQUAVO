import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmationView } from "../confirmation-view";
import { clearOrderIdempotencyKey } from "@/lib/order-idempotency";
import type { CheckoutQuote } from "@shared/checkout-quote";

vi.mock("@/i18n/locale-context", () => ({ useLocale: () => ({ href: (path: string) => path }) }));
vi.mock("@/lib/analytics", () => ({ trackAddPaymentInfo: vi.fn() }));
vi.mock("@/lib/posthog", () => ({ phTrackCheckoutStep: vi.fn() }));
vi.mock("@/lib/receipt-printer-audio", () => ({ primeReceiptPrinterAudio: vi.fn() }));
const initialQuote: CheckoutQuote = { items: [{ productId: "p", quantity: 1, unitPrice: 3549 }],
  subtotal: 3549, shippingCost: 5000, discount: 0, amount: 8750 };
const notes = "اتصل قبل التوصيل";
function Harness({ coupon = "" }: { coupon?: string }) {
  const [agreed, setAgreed] = useState(false);
  const [optIn, setOptIn] = useState(false);
  return <ConfirmationView customerInfo={{ name: "زبون اختبار", phone: "07700000000", governorate: "baghdad", address: "عنوان اختبار", notes }}
    cartItems={[{ id: "line", productId: "p", name: "فلتر", price: 3549, quantity: 1, slug: "filter", image: "" }]}
    cartTotal={3549} deliveryFee={5000} grandTotal={8549} isFreeShipping={false} getDeliveryEstimate={() => ""}
    agreed={agreed} setAgreed={setAgreed} isSubmitting={false} handleBack={vi.fn()} handleConfirmOrder={vi.fn()}
    appliedCouponCode={coupon} whatsappMarketingOptIn={optIn} setWhatsappMarketingOptIn={setOptIn} />;
}
const checkoutCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/payments/wayl/checkout");
beforeEach(() => {
  clearOrderIdempotencyKey();
  vi.mocked(fetch).mockImplementation(async url => String(url).includes("availability")
    ? Response.json({ available: true }) : Response.json({ message: "Test stop" }, { status: 503 }));
});
afterEach(() => vi.restoreAllMocks());
async function selectOnline() {
  const user = userEvent.setup();
  const option = await screen.findByRole("radio", { name: /دفع إلكتروني عبر Wayl/ });
  await waitFor(() => expect(option).toBeEnabled());
  await user.click(option);
  await user.click(screen.getByRole("checkbox"));
  return user;
}

describe("online price and existing terms policy", () => {
  it("keeps 8549 rounded upward to 8750 and sends WhatsApp true after terms acceptance", async () => {
    render(<Harness />);
    const user = await selectOnline();
    await user.click(screen.getByRole("button", { name: /متابعة إلى الدفع الآمن/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    const payload = JSON.parse(String(checkoutCalls()[0][1]?.body));
    expect(payload.expectedQuote).toEqual(initialQuote);
    expect(payload.whatsappMarketingOptIn).toBe(true);
    expect(payload.customerInfo.notes).toBe(notes);
  });

  it("requires a separate explicit confirmation before resending a changed server quote", async () => {
    const updated = { ...initialQuote, shippingCost: 6000, amount: 9750 };
    vi.mocked(fetch).mockImplementation(async url => String(url).includes("availability")
      ? Response.json({ available: true })
      : Response.json({ code: "CHECKOUT_QUOTE_CHANGED", quote: updated }, { status: 409 }));
    render(<Harness coupon="SAVE" />);
    const user = await selectOnline();
    await user.click(screen.getByRole("button", { name: /متابعة إلى الدفع الآمن/ }));
    const confirm = await screen.findByRole("button", { name: /أوافق وأدفع 9,750/ });
    expect(checkoutCalls()).toHaveLength(1);
    expect(screen.getByRole("button", { name: /متابعة إلى الدفع الآمن/ })).toBeDisabled();
    await user.click(confirm);
    await waitFor(() => expect(checkoutCalls()).toHaveLength(2));
    const accepted = JSON.parse(String(checkoutCalls()[1][1]?.body));
    expect(accepted.expectedQuote).toEqual(updated);
    expect(accepted.couponCode).toBe("SAVE");
    expect(accepted.whatsappMarketingOptIn).toBe(true);
  });

  it("keeps the parent coupon after a confirmation remount when session storage is blocked", async () => {
    vi.spyOn(sessionStorage, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(sessionStorage, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const view = render(<Harness coupon="PARENT" />);
    view.unmount();
    render(<Harness coupon="PARENT" />);
    const user = await selectOnline();
    await user.click(screen.getByRole("button", { name: /متابعة إلى الدفع الآمن/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    expect(JSON.parse(String(checkoutCalls()[0][1]?.body)).couponCode).toBe("PARENT");
  });
});
