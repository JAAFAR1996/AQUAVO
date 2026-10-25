import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "../toaster";

const { dismiss } = vi.hoisted(() => ({ dismiss: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    dismiss,
    toasts: [{ id: "cart-confirmation", title: "Product added", description: "Saved in your cart", swipeCart: true, open: true }],
  }),
}));

describe("deferred cart confirmation animation", () => {
  const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
  afterEach(() => {
    if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(Element.prototype, "animate");
  });

  it("keeps the confirmation and cart action usable before and after animation code loads", async () => {
    // happy-dom has no Web Animations API; the real-browser gate supplies it.
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({ cancel: vi.fn(), pause: vi.fn(), play: vi.fn(), playState: "running" })),
    });
    const openCart = vi.fn();
    const { container } = render(<><button data-aqv-cart-target onClick={openCart}>Cart trigger</button><Toaster /></>);
    expect(screen.getByText("Product added")).toBeInTheDocument();
    expect(container.querySelector(".swipe-toast")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /السلة/ }));
    expect(openCart).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledWith("cart-confirmation");
    await waitFor(() => expect(container.querySelector(".swipe-toast")).not.toBeNull());
    expect(screen.getByRole("status")).toHaveTextContent("Product added");
    fireEvent.click(screen.getByRole("button", { name: /السلة/ }));
    expect(openCart).toHaveBeenCalledTimes(2);
  });
});
