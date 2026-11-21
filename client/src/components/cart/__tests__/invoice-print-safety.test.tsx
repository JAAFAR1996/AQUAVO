import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InvoiceDialog } from "../invoice-dialog";
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
afterEach(() => vi.restoreAllMocks());

describe("invoice print text boundaries", () => {
  it("prints product, customer, notes and order identifiers as text, without executable markup", () => {
    const write = vi.fn();
    const printWindow = { opener: window, document: { write, close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(printWindow as unknown as Window);
    const payload = '<img src=x onerror="alert(1)"><script>window.opener.location="https://invalid.test"</script>&';
    render(<InvoiceDialog open onOpenChange={vi.fn()} orderData={{
      customerInfo: { name: payload, address: payload, phone: payload, notes: payload },
      items: [{ id: "line", name: payload, variantLabel: payload, price: 3549, quantity: 1 }],
      total: 8549, roundedTotal: 8750, deliveryFee: 5000,
      orderNumber: `</title>${payload}`, orderDate: new Date("2026-11-20T00:00:00Z"),
    }} />);
    fireEvent.click(screen.getByRole("button", { name: /طباعة/ }));
    expect(write).toHaveBeenCalledTimes(1);
    const html = String(write.mock.calls[0][0]);
    const parsed = new DOMParser().parseFromString(html, "text/html");
    expect(parsed.querySelector("script, img, [onerror]")).toBeNull();
    expect(parsed.body.textContent).toContain(payload);
    expect(parsed.title).toContain(payload);
    expect(printWindow.opener).toBeNull();
    expect(parsed.body.textContent).toContain("8,750");
  });
});
