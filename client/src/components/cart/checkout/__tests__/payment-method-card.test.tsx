import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentMethodCard } from "../payment-method-card";

describe("PaymentMethodCard labels", () => {
  it("explains online payment as a Wayl handoff without vague security copy", () => {
    render(<PaymentMethodCard method="online" selected="cod" onChange={vi.fn()} />);

    const radio = screen.getByRole("radio");
    expect(radio).toHaveTextContent("دفع إلكتروني عبر Wayl");
    expect(radio).toHaveTextContent("تدخل بيانات البطاقة عند Wayl");
    expect(radio).not.toHaveTextContent("الدفع عند الاستلام");
    expect(radio).not.toHaveTextContent("Al-Qaseh");
    expect(radio).toHaveAttribute("aria-checked", "false");
  });

  it("describes the COD option as cash on delivery", () => {
    render(<PaymentMethodCard method="cod" selected="cod" onChange={vi.fn()} />);

    const radio = screen.getByRole("radio");
    expect(radio).toHaveTextContent("ادفع عند الاستلام");
    expect(radio).toHaveTextContent("ما تحتاج تدفع هسه");
    expect(radio).not.toHaveTextContent("الدفع الإلكتروني");
    expect(radio).not.toHaveTextContent("Wayl");
    expect(radio).toHaveAttribute("aria-checked", "true");
  });
});
