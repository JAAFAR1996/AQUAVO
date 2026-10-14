import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicButton } from "../dynamic-button";
import { ScrollFadeList } from "../scroll-fade-list";
import { LogoTraceLoader } from "../logo-trace-loader";

describe("Dqnamo-style interactions on AQUAVO", () => {
  it("changes dynamic button labels while keeping the same native clickable action", async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <DynamicButton width="full" onClick={onClick} stateKey="ready">
        Add to cart
      </DynamicButton>,
    );
    const button = screen.getByRole("button", { name: /add to cart/i });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("w-full");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <DynamicButton width="full" onClick={onClick} stateKey="adding" disabled>
        Adding...
      </DynamicButton>,
    );
    expect(button).toHaveTextContent("Adding...");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <DynamicButton width="full" onClick={onClick} stateKey="added">
        Added
      </DynamicButton>,
    );
    expect(button).toHaveTextContent("Added");
  });

  it("hides fade overlays without overflow and responds to scrolling when the list overflows", async () => {
    const { container } = render(
      <ScrollFadeList label="Cart items" fill fadeHeight={56}>
        <ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>
      </ScrollFadeList>,
    );
    const scrollNode = container.querySelector("[data-aqv-scroll-fade]") as HTMLDivElement;
    expect(scrollNode).toHaveAttribute("data-overflow-top", "false");
    expect(scrollNode).toHaveAttribute("data-overflow-bottom", "false");

    Object.defineProperty(scrollNode, "scrollHeight", { configurable: true, value: 400 });
    Object.defineProperty(scrollNode, "clientHeight", { configurable: true, value: 120 });
    fireEvent.scroll(scrollNode);
    await waitFor(() => {
      expect(scrollNode).toHaveAttribute("data-overflow-bottom", "true");
      expect(scrollNode).toHaveAttribute("data-overflow-top", "false");
    });

    Object.defineProperty(scrollNode, "scrollTop", { configurable: true, value: 140, writable: true });
    fireEvent.scroll(scrollNode);
    await waitFor(() => {
      expect(scrollNode).toHaveAttribute("data-overflow-top", "true");
      expect(scrollNode).toHaveAttribute("data-overflow-bottom", "true");
    });

    scrollNode.scrollTop = 280;
    fireEvent.scroll(scrollNode);
    await waitFor(() => {
      expect(scrollNode).toHaveAttribute("data-overflow-top", "true");
      expect(scrollNode).toHaveAttribute("data-overflow-bottom", "false");
    });
  });

  it("keeps tracing during loading, then fills the real logo when work completes", () => {
    vi.useFakeTimers();
    try {
      const done = vi.fn();
      const { container, rerender } = render(
        <LogoTraceLoader loading ariaLabel="AQUAVO test" onDone={done} />,
      );
      expect(screen.getByRole("img", { name: "AQUAVO test" })).toBeInTheDocument();
      const orbit = container.querySelector(".aqv-logo-trace__orbit");
      expect(orbit).toBeInTheDocument();
      expect(orbit).toHaveAttribute("vector-effect", "non-scaling-stroke");
      const tracePath = orbit?.getAttribute("d");
      rerender(<LogoTraceLoader loading={false} ariaLabel="AQUAVO test" onDone={done} />);
      expect(container.querySelector(".aqv-logo-trace__orbit")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(500));
      const filledLogo = container.querySelector('path[fill="currentColor"]');
      expect(filledLogo).toBeInTheDocument();
      // The trace is one recognizable contour, not the full compound fill path.
      expect(tracePath).toBeTruthy();
      expect(filledLogo?.getAttribute("d")).not.toBe(tracePath);
      act(() => vi.advanceTimersByTime(500));
      expect(done).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
