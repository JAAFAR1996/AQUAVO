import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SwipeToast from "../swipe-toast";

describe("React Bits SwipeToast integration", () => {
  it("shows the product copy, accessible action and timed fuse", () => {
    const action = vi.fn();
    const { container } = render(
      <SwipeToast
        title="تمت الإضافة للسلة"
        description="المنتج انضاف للسلة"
        actionLabel="عرض السلة"
        onAction={action}
        duration={0}
        fuse="bottom"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("تمت الإضافة للسلة");
    expect(screen.getByRole("button", { name: "عرض السلة" })).toBeInTheDocument();
    expect(container.querySelector(".swipe-toast")).toHaveAttribute("data-fuse", "none");
    fireEvent.click(screen.getByRole("button", { name: "عرض السلة" }));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("dismisses on Escape without invoking the cart action", async () => {
    const onClose = vi.fn();
    const onAction = vi.fn();
    render(<SwipeToast title="Added" actionLabel="Cart" duration={0} onClose={onClose} onAction={onAction} />);
    fireEvent.keyDown(screen.getByRole("status"), { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalledWith("escape"));
    expect(onAction).not.toHaveBeenCalled();
  });

  it("does not have toasts open a cart automatically or simulate success", () => {
    const { container } = render(<SwipeToast title="Added" duration={0} />);
    expect(container.querySelector("button")).toBeNull();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
