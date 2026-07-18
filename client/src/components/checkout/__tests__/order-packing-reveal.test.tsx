/**
 * OrderPackingReveal: it is purely visual and must ALWAYS resolve to the static
 * confirmation (call onComplete exactly once) — immediately for reduced motion
 * or when there are no items, and eventually when it does animate. It never
 * creates/submits an order.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { OrderPackingReveal, type PackItem } from "../order-packing-reveal";

function setReducedMotion(reduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (q: string) => ({ matches: reduced && /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  });
}

const ITEMS: PackItem[] = [
  { name: "فلتر", image: "/img/a.png", quantity: 2 },
  { name: "سخان", image: "/img/b.png", quantity: 1 },
];

afterEach(() => vi.restoreAllMocks());

describe("OrderPackingReveal", () => {
  it("calls onComplete immediately for reduced-motion users", async () => {
    setReducedMotion(true);
    const onComplete = vi.fn();
    render(<OrderPackingReveal items={ITEMS} onComplete={onComplete} />);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("calls onComplete immediately when there are no items", async () => {
    setReducedMotion(false);
    const onComplete = vi.fn();
    render(<OrderPackingReveal items={[]} onComplete={onComplete} />);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("eventually calls onComplete exactly once when it animates, showing the AQUAVO / مُغَلَّف بعناية seal", async () => {
    setReducedMotion(false);
    const onComplete = vi.fn();
    render(<OrderPackingReveal items={ITEMS} onComplete={onComplete} />);
    // seal copy is present (no SEALED / مختوم)
    expect(screen.getByText("مُغَلَّف")).toBeInTheDocument();
    expect(screen.getByText("بعناية")).toBeInTheDocument();
    expect(screen.queryByText("SEALED")).toBeNull();
    expect(screen.queryByText("مختوم")).toBeNull();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 7000 });
  });
});
