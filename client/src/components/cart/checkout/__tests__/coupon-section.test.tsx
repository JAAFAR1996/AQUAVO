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

    // The input starts hidden inside the collapsible header; open it first.
    await user.click(screen.getByRole("button", { name: /عندك كود خصم؟/ }));
    expect(screen.getByLabelText("كود الخصم")).toBeInTheDocument();
  });

  it("announces the applied-coupon error as an alert linked via aria-describedby", async () => {
    const user = userEvent.setup();
    render(
      <CouponSection
        couponCode="EXPIRED"
        setCouponCode={vi.fn()}
        applyCoupon={vi.fn()}
        couponError="انتهت صلاحية هذا الكوبون"
        couponSuccess=""
      />
    );
    await user.click(screen.getByRole("button", { name: /عندك كود خصم؟/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("انتهت صلاحية هذا الكوبون");
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
        isApplying
      />
    );
    await user.click(screen.getByRole("button", { name: /عندك كود خصم؟/ }));

    expect(screen.getByLabelText("كود الخصم")).toBeDisabled();
    const applyButton = screen.getByRole("button", { name: "جاري التحقق..." });
    expect(applyButton).toBeDisabled();
    expect(applyButton).toHaveAttribute("aria-busy", "true");
  });
});
