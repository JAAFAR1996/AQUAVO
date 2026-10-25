import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductInformationSection } from "../product-information-section";

afterEach(() => vi.restoreAllMocks());

describe("Product information sections", () => {
  function viewport(desktop: boolean) {
    let matches = desktop;
    const listeners = new Set<() => void>();
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      get matches() { return matches; }, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
      addEventListener: (_event: string, handler: EventListenerOrEventListenerObject | null) => { if (typeof handler === "function") listeners.add(handler as () => void); },
      removeEventListener: (_event: string, handler: EventListenerOrEventListenerObject | null) => { listeners.delete(handler as () => void); },
    }));
    return (next: boolean) => act(() => { matches = next; listeners.forEach(listener => listener()); });
  }

  it("shows all desktop content and retains mobile disclosure choices through a resize", async () => {
    const resize = viewport(false);
    const user = userEvent.setup();
    render(<ProductInformationSection id="shipping" title="Shipping" icon={null}>Delivery details</ProductInformationSection>);
    expect(screen.getByRole("button", { name: "Shipping" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Delivery details")).not.toBeInTheDocument();
    resize(true);
    expect(screen.getByText("Delivery details")).toBeVisible();
    expect(screen.getByRole("button", { name: "Shipping" })).toBeDisabled();
    resize(false);
    expect(screen.queryByText("Delivery details")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Shipping" }));
    expect(screen.getByText("Delivery details")).toBeVisible();
  });

  it("keeps key specifications open on mobile and supports keyboard disclosure", async () => {
    viewport(false);
    const user = userEvent.setup();
    render(<ProductInformationSection id="specs" title="Specifications" icon={null} defaultOpen>Verified size</ProductInformationSection>);
    const trigger = screen.getByRole("button", { name: "Specifications" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Verified size")).toBeVisible();
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
