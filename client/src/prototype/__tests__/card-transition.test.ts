/**
 * PREVIEW-ONLY Card-to-Product transition: first-click reliability tests.
 * Proves: one click → exactly one navigation (no second click), duplicate calls
 * are safe, unsupported browsers navigate immediately, a failed/throwing
 * transition still reaches the PDP, and the temporary transition name is cleaned.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    prefetchQuery: vi.fn(() => Promise.resolve()),
    ensureQueryData: vi.fn(() => Promise.resolve({})),
  },
}));
vi.mock("@/lib/api", () => ({ fetchProductBySlug: vi.fn(() => Promise.resolve({})) }));
vi.mock("@/lib/cloudinary", () => ({ detailImage: (u: string) => u || "" }));

import { navigateCardToProduct, productTransitionName, supportsViewTransitions } from "../card-transition";

type SVTResult = { ready?: Promise<void>; finished?: Promise<void> };

function setReducedMotion(reduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (q: string) => ({ matches: reduced && /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {} }),
  });
}

function makeSourceImg(): HTMLImageElement {
  const img = document.createElement("img");
  document.body.appendChild(img);
  return img;
}

beforeEach(() => {
  setReducedMotion(false);
  document.body.innerHTML = "";
  delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
});
afterEach(() => vi.clearAllMocks());

describe("productTransitionName", () => {
  it("produces a unique, CSS-safe, per-slug name", () => {
    expect(productTransitionName("filter-xy-180")).toBe("aqv-product-filter-xy-180");
    expect(productTransitionName("a/b c")).toBe("aqv-product-a-b-c");
    expect(productTransitionName("x")).not.toBe(productTransitionName("y"));
  });
});

describe("navigateCardToProduct — fallbacks navigate immediately (no second click)", () => {
  it("navigates once when View Transitions are unsupported", async () => {
    const navigate = vi.fn();
    await navigateCardToProduct({ slug: "s1", sourceImg: makeSourceImg(), navigate, motionActive: true });
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("navigates once when motion is off", async () => {
    (document as unknown as { startViewTransition: unknown }).startViewTransition = vi.fn();
    const navigate = vi.fn();
    await navigateCardToProduct({ slug: "s1", sourceImg: makeSourceImg(), navigate, motionActive: false });
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("navigates once for reduced-motion users", async () => {
    setReducedMotion(true);
    (document as unknown as { startViewTransition: unknown }).startViewTransition = vi.fn();
    const navigate = vi.fn();
    await navigateCardToProduct({ slug: "s1", sourceImg: makeSourceImg(), navigate, motionActive: true });
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe("navigateCardToProduct — supported path", () => {
  it("runs the transition, navigates exactly once, and cleans up the name", async () => {
    const name = productTransitionName("s2");
    // Pre-mount a ready destination hero so the wait resolves immediately.
    const hero = document.createElement("img");
    hero.setAttribute("data-aqv-hero", name);
    Object.defineProperty(hero, "complete", { value: true });
    document.body.appendChild(hero);

    const svt = vi.fn((cb: () => Promise<void> | void): SVTResult => {
      void cb();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: typeof svt }).startViewTransition = svt;

    const src = makeSourceImg();
    const navigate = vi.fn();
    await navigateCardToProduct({ slug: "s2", sourceImg: src, navigate, motionActive: true });

    expect(svt).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1); // exactly one navigation, first click
    expect(src.style.viewTransitionName).toBe(""); // cleaned up in finally
  });

  it("still reaches the PDP when startViewTransition throws", async () => {
    (document as unknown as { startViewTransition: unknown }).startViewTransition = vi.fn(() => {
      throw new Error("boom");
    });
    const navigate = vi.fn();
    await navigateCardToProduct({ slug: "s3", sourceImg: makeSourceImg(), navigate, motionActive: true });
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("still reaches the PDP when transition.ready rejects (e.g. duplicate name / skip)", async () => {
    const svt = vi.fn((cb: () => Promise<void> | void): SVTResult => {
      void cb();
      return { ready: Promise.reject(new Error("skipped")), finished: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: typeof svt }).startViewTransition = svt;
    const navigate = vi.fn();
    await navigateCardToProduct({ slug: "s4", sourceImg: makeSourceImg(), navigate, motionActive: true });
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe("supportsViewTransitions", () => {
  it("reflects document.startViewTransition availability", () => {
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
    expect(supportsViewTransitions()).toBe(false);
    (document as unknown as { startViewTransition: unknown }).startViewTransition = () => {};
    expect(supportsViewTransitions()).toBe(true);
  });
});
