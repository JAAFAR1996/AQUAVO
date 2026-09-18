import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { InvoiceDialog } from "../invoice-dialog";

function orderWith(paymentMethod: string | undefined) {
  return {
    customerInfo: { name: "جعفر محمد", phone: "07701234567", address: "بغداد - الكرادة", notes: "" },
    items: [{ id: "line-1", name: "فلتر اختبار", price: 25000, quantity: 1 }],
    total: 30000,
    roundedTotal: 30000,
    status: "pending",
    paymentStatus: paymentMethod ? "paid" : "pending",
    paymentMethod,
    orderNumber: "FH-TEST",
    orderDate: new Date("2026-09-18T10:00:00Z"),
  };
}

describe("InvoiceDialog payment label", () => {
  it.each([["wayl"], ["alqaseh"]])("describes a %s order as paid electronically", (method) => {
    render(<InvoiceDialog open onOpenChange={vi.fn()} orderData={orderWith(method)} />);

    expect(screen.getAllByText(/مدفوع إلكترونياً/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/تدفع نقداً/)).toBeNull();
  });

  it.each([["cod"], ["cash_on_delivery"], [undefined]])("describes a %s order as payment on delivery", (method) => {
    render(<InvoiceDialog open onOpenChange={vi.fn()} orderData={orderWith(method)} />);

    expect(screen.getAllByText(/تدفع نقداً|الدفع عند الاستلام/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/مدفوع إلكترونياً/)).toBeNull();
  });
});
