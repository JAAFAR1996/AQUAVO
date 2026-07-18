import { flushSync } from "react-dom";
import { queryClient } from "@/lib/queryClient";
import { fetchProductBySlug } from "@/lib/api";
import { detailImage } from "@/lib/cloudinary";
import { prefersReducedMotion } from "./motion-prototype";

/**
 * Card-to-Product continuity (Preview prototype).
 *
 * Follows the official same-document View Transitions guidance:
 * - Each product gets a UNIQUE view-transition-name (per slug). MDN: "if two
 *   rendered elements have the same view-transition-name at the same time,
 *   ViewTransition.ready rejects and the transition is skipped" — a shared name
 *   was the root cause of the first-click failure on a cold cache.
 * - The update callback is async and returns a promise so we can navigate and
 *   then WAIT for the destination PDP hero to mount + its image to decode before
 *   the new snapshot is taken (Chrome: "the callback can return a promise …
 *   waiting for important content to be ready", with aggressive timeouts).
 * - flushSync applies the route change synchronously inside the callback.
 * - Data + destination image are prefetched on hover/focus/pointerdown using the
 *   existing react-query cache and image helpers (no duplicate fetch system).
 * - Fallbacks always navigate immediately (unsupported, timeout, reduced motion,
 *   or a skipped/rejected transition) — never a second click, never frozen.
 */

const DATA_WARM_TIMEOUT = 400;
const HERO_READY_TIMEOUT = 320;

function cssSafe(slug: string): string {
  return `aqv-product-${slug.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function productTransitionName(slug: string): string {
  return cssSafe(slug);
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === "function"
  );
}

/** Warm the destination product data + hero image (best-effort, cached, idempotent). */
export function prefetchProductDestination(slug: string, imageUrl: string | null | undefined): void {
  if (!slug) return;
  void queryClient
    .prefetchQuery({ queryKey: ["product", slug], queryFn: () => fetchProductBySlug(slug) })
    .catch(() => {});
  const url = detailImage(imageUrl || "");
  if (url) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    void img.decode?.().catch(() => {});
  }
}

/** Resolve once the destination hero (marked data-aqv-hero=name) exists + is ready, or on timeout. */
function waitForDestinationHero(name: string, timeoutMs: number): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  return new Promise<void>((resolve) => {
    const check = () => {
      const el = document.querySelector<HTMLImageElement>(`img[data-aqv-hero="${name}"]`);
      if (el && el.complete) {
        resolve();
        return;
      }
      if (performance.now() > deadline) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

interface NavOptions {
  slug: string;
  sourceImg: HTMLImageElement | null;
  navigate: () => void;
  motionActive: boolean;
}

/**
 * Reliable first-click card → PDP shared-image transition. Returns after the
 * transition settles (or after immediate navigation for a fallback path).
 */
export async function navigateCardToProduct(opts: NavOptions): Promise<void> {
  const { slug, sourceImg, navigate, motionActive } = opts;
  const doNavigate = () => flushSync(() => navigate());

  // Immediate-navigation fallbacks (no shared-element movement).
  if (!motionActive || !supportsViewTransitions() || prefersReducedMotion()) {
    doNavigate();
    return;
  }

  const name = productTransitionName(slug);
  let navigated = false;
  const ensureNav = () => {
    if (navigated) return;
    navigated = true;
    doNavigate();
  };

  const startViewTransition = (
    document as Document & {
      startViewTransition: (cb: () => Promise<void> | void) => {
        ready?: Promise<void>;
        finished?: Promise<void>;
      };
    }
  ).startViewTransition;

  try {
    // Warm the destination data (cold-cache safe) with an aggressive timeout.
    await Promise.race([
      queryClient
        .ensureQueryData({ queryKey: ["product", slug], queryFn: () => fetchProductBySlug(slug) })
        .catch(() => {}),
      wait(DATA_WARM_TIMEOUT),
    ]);

    if (sourceImg) sourceImg.style.viewTransitionName = name;

    const transition = startViewTransition(async () => {
      ensureNav();
      await Promise.race([waitForDestinationHero(name, HERO_READY_TIMEOUT), wait(HERO_READY_TIMEOUT + 40)]);
    });

    // A rejected/skipped transition (e.g. duplicate name) must not block navigation.
    transition.ready?.catch(() => {});
    await (transition.finished ?? Promise.resolve()).catch(() => {});
  } catch {
    ensureNav();
  } finally {
    ensureNav();
    if (sourceImg) sourceImg.style.viewTransitionName = "";
  }
}
