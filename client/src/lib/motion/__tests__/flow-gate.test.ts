/**
 * Flow Gate controller contract:
 * - Navigation happens exactly ONCE per run (never a second click).
 * - Reduced-motion and unsupported environments navigate immediately.
 * - No temporary overlay/mark/lock survives after completion (cleaned in finally).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { runFlowGate, supportsFlowGate } from "../flow-gate";

function setReducedMotion(reduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (q: string) => ({
      matches: reduced && /reduce/.test(q),
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }),
  });
}

const leftoverCount = () => document.querySelectorAll("[data-aqv-flowgate]").length;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("runFlowGate fallbacks", () => {
  it("navigates immediately and once under reduced motion, leaving no overlay", async () => {
    setReducedMotion(true);
    const navigate = vi.fn();
    const prefetch = vi.fn();
    await runFlowGate({ navigate, direction: "neutral", prefetch });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(leftoverCount()).toBe(0);
  });

  it("navigates immediately when the Web Animations API is unavailable", async () => {
    setReducedMotion(false);
    const originalAnimate = HTMLElement.prototype.animate;
    // @ts-expect-error force unsupported
    HTMLElement.prototype.animate = undefined;
    try {
      expect(supportsFlowGate()).toBe(false);
      const navigate = vi.fn();
      await runFlowGate({ navigate, direction: "forward" });
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(leftoverCount()).toBe(0);
    } finally {
      HTMLElement.prototype.animate = originalAnimate;
    }
  });
});

describe("runFlowGate animated path", () => {
  it("navigates once and removes all temporary nodes when it animates", async () => {
    setReducedMotion(false);
    const originalAnimate = HTMLElement.prototype.animate;
    const originalCSS = window.CSS;
    // Force capability + make every animation resolve instantly.
    // @ts-expect-error test stub
    window.CSS = { supports: () => true };
    HTMLElement.prototype.animate = vi.fn(() => ({
      finished: Promise.resolve(),
      cancel() {},
    })) as unknown as typeof HTMLElement.prototype.animate;

    // Destination landmark present → readiness resolves on the fast path.
    const main = document.createElement("main");
    main.id = "main-content";
    document.body.appendChild(main);

    try {
      const navigate = vi.fn();
      await runFlowGate({ navigate, direction: "forward" });
      expect(navigate).toHaveBeenCalledTimes(1);
      // Allow the finally cleanup microtask to flush.
      await new Promise((r) => setTimeout(r, 30));
      expect(leftoverCount()).toBe(0);
    } finally {
      HTMLElement.prototype.animate = originalAnimate;
      // @ts-expect-error restore
      window.CSS = originalCSS;
    }
  });
});
