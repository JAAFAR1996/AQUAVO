import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomerInfoForm } from "../customer-info-form";
import type { CustomerInfo } from "../types";

function PhoneHarness({ initialPhone = "" }: { initialPhone?: string }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: initialPhone,
    governorate: "",
    address: "",
    notes: "",
  });

  return (
    <CustomerInfoForm
      customerInfo={customerInfo}
      setCustomerInfo={setCustomerInfo}
      errors={{}}
      isGuest={false}
    />
  );
}

describe("checkout phone digit slots", () => {
  it("replaces the rectangular phone field with one row of phone digit slots", () => {
    render(<PhoneHarness />);

    const input = screen.getByLabelText("رقم الهاتف") as HTMLInputElement;
    const slots = screen.getByTestId("phone-digit-slots");

    expect(document.querySelectorAll('input[id="phone"]')).toHaveLength(1);
    expect(input).toHaveAttribute("type", "tel");
    expect(input).toHaveAttribute("autocomplete", "tel");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveClass("absolute");
    expect(slots.querySelectorAll("[data-phone-slot]")).toHaveLength(11);
    expect(slots).toHaveAttribute("aria-hidden", "true");
  });

  it("shows typed Arabic numerals in the slots but stores a normalized telephone number", () => {
    render(<PhoneHarness />);
    const input = screen.getByLabelText("رقم الهاتف") as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "٠٧٨٠١٢٣٤٥٦٧" } });

    expect(input).toHaveValue("07801234567");
    const slots = screen.getByTestId("phone-digit-slots");
    const digits = Array.from(slots.querySelectorAll("[data-phone-slot]"), (slot) => slot.textContent).join("");
    expect(digits).toBe("07801234567");
    expect(slots.querySelectorAll("[data-phone-slot]")).toHaveLength(11);
  });

  it("animates a fill behind each digit and shows the editing caret without adding an OTP field", () => {
    render(<PhoneHarness />);
    const input = screen.getByLabelText("رقم الهاتف") as HTMLInputElement;
    const slots = screen.getByTestId("phone-digit-slots");

    expect(slots).toHaveAttribute("data-aquavo-phone-slots");
    expect(screen.getAllByTestId("phone-slot-fill")).toHaveLength(11);
    expect(screen.queryAllByTestId("phone-slot-digit")).toHaveLength(0);

    fireEvent.focus(input);
    expect(screen.getAllByTestId("phone-slot-caret")).toHaveLength(1);

    fireEvent.change(input, { target: { value: "07" } });
    expect(screen.getAllByTestId("phone-slot-digit")).toHaveLength(2);
    expect(screen.getAllByTestId("phone-slot-fill")).toHaveLength(11);
    expect(screen.getAllByTestId("phone-slot-caret")).toHaveLength(1);
    expect(document.querySelectorAll('input[id="phone"]')).toHaveLength(1);
    expect(document.querySelector('input[autocomplete="one-time-code"]')).toBeNull();
  });

  it("supports existing international numbers, keeping native paste/autofill form semantics", () => {
    render(<PhoneHarness initialPhone="+964 780 123 4567" />);
    const input = screen.getByLabelText("رقم الهاتف") as HTMLInputElement;

    expect(input).toHaveValue("+964 780 123 4567");
    expect(screen.getByTestId("phone-digit-slots").querySelectorAll("[data-phone-slot]")).toHaveLength(13);

    fireEvent.change(input, { target: { value: "07701234567" } });
    expect(input).toHaveValue("07701234567");
    expect(screen.getByTestId("phone-digit-slots").querySelectorAll("[data-phone-slot]")).toHaveLength(11);
  });
});
