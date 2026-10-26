import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "../toaster";

const { dismiss } = vi.hoisted(() => ({ dismiss: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    dismiss,
    toasts: [{ id: "cart-confirmation", title: "Product added", description: "Saved in your cart", swipeCart: true, cartAction: true, open: true }],
  }),
}));

describe("single cart confirmation", () => {
  it("renders one stable notification and one cart action without a second animation renderer", () => {
    const openCart = vi.fn();
    const { container, rerender } = render(<><button data-aqv-cart-target onClick={openCart}>Cart trigger</button><Toaster /></>);
    expect(screen.getAllByTestId("notification-toast")).toHaveLength(1);
    expect(container.querySelector(".swipe-toast")).toBeNull();
    expect(screen.getByTestId("notification-toast")).toHaveTextContent("Product added");
    fireEvent.click(screen.getByRole("button", { name: /السلة/ }));
    expect(openCart).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledWith("cart-confirmation");
    rerender(<><button data-aqv-cart-target onClick={openCart}>Cart trigger</button><Toaster /></>);
    expect(screen.getAllByTestId("notification-toast")).toHaveLength(1);
    expect(container.querySelector(".swipe-toast")).toBeNull();
  });

  it("provides an accessible close action without changing the cart", () => {
    render(<Toaster />);
    const close = screen.getByTestId("notification-toast").querySelector<HTMLButtonElement>("[toast-close]");
    expect(close).toHaveAttribute("aria-label");
    expect(close).toHaveClass("h-11", "w-11");
    fireEvent.click(close!);
  });
});
