import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CouponSection } from "../coupon-section";

describe("CouponSection", () => {
  it("associates the coupon input with an accessible label", async () => {
    const user = userEvent.setup();
    render(
      <CouponSection
        couponCode=""
        setCouponCode={vi.fn()}
        applyCoupon={vi.fn()}
        couponError=""
        couponSuccess=""
      />
    );

    await user.click(screen.getByRole("button", { name: /عندك كود خصم؟/ }));
    expect(screen.getByLabelText("كود الخصم")).toBeInTheDocument();
  });

  it("announces a coupon error as an alert linked via aria-describedby", async () => {
    const user = userEvent.setup();
    render(
      <CouponSection
        couponCode="EXPIRED"
        setCouponCode={vi.fn()}
        applyCoupon={vi.fn()}
        couponError="انتهت صلاحية كود الخصم"
        couponSuccess=""
      />
    );
    await user.click(screen.getByRole("button", { name: /عندك كود خصم؟/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("انتهت صلاحية كود الخصم");
    const input = screen.getByLabelText("كود الخصم");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe("coupon-error");
  });

  it("disables the input and shows a busy apply button while a coupon check is in flight", async () => {
    const user = userEvent.setup();
    render(
      <CouponSection
        couponCode="SAVE20"
        setCouponCode={vi.fn()}
        applyCoupon={vi.fn()}
        couponError=""
        couponSuccess=""
        isChecking
      />
    );
    await user.click(screen.getByRole("button", { name: /عندك كود خصم؟/ }));

    expect(screen.getByLabelText("كود الخصم")).toBeDisabled();
    const applyButton = screen.getByRole("button", { name: /جارٍ التحقق/ });
    expect(applyButton).toBeDisabled();
    expect(applyButton).toHaveAttribute("aria-busy", "true");
  });

  it("shows the applied summary with code, discount, new total and a remove action", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <CouponSection
        couponCode="SAVE20"
        setCouponCode={vi.fn()}
        applyCoupon={vi.fn()}
        couponError=""
        couponSuccess="تم تطبيق كود الخصم بنجاح"
        appliedCoupon={{ code: "SAVE20", type: "fixed", value: 5000 }}
        couponDiscount={5000}
        newTotal={45000}
        onRemove={onRemove}
      />
    );

    expect(screen.getByText("تم تطبيق كود الخصم بنجاح")).toBeInTheDocument();
    expect(screen.getByText("SAVE20")).toBeInTheDocument();
    expect(screen.getByText("المجموع بعد الخصم")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /إزالة/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
