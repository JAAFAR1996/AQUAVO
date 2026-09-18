import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentMethodCard } from "../payment-method-card";

describe("PaymentMethodCard labels", () => {
  it("describes the online option as secure electronic payment through Wayl", () => {
    render(<PaymentMethodCard method="online" selected="cod" onChange={vi.fn()} />);

    const radio = screen.getByRole("radio");
    expect(radio).toHaveTextContent("الدفع الإلكتروني الآمن");
    expect(radio).toHaveTextContent("عبر بوابة Wayl");
    expect(radio).not.toHaveTextContent("الدفع عند الاستلام");
    expect(radio).not.toHaveTextContent("Al-Qaseh");
    expect(radio).toHaveAttribute("aria-checked", "false");
  });

  it("describes the COD option as cash on delivery", () => {
    render(<PaymentMethodCard method="cod" selected="cod" onChange={vi.fn()} />);

    const radio = screen.getByRole("radio");
    expect(radio).toHaveTextContent("الدفع عند الاستلام");
    expect(radio).toHaveTextContent("نقداً عند وصول الطلب");
    expect(radio).not.toHaveTextContent("الدفع الإلكتروني");
    expect(radio).not.toHaveTextContent("Wayl");
    expect(radio).toHaveAttribute("aria-checked", "true");
  });
});
