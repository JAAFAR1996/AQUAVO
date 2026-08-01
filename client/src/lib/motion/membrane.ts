/**
 * AQUAVO — قانون ٢: خط المي هو عمود الموقع
 * Drop in at: client/src/lib/motion/membrane.ts
 *
 * The membrane reveal is AQUAVO's replacement for fade-up. Content is not moved
 * into place — the waterline passes OVER it and it becomes visible, with a short
 * refraction blur at the boundary.
 *
 * Contract:
 *  - ONE SHOT per element, ever. The observer unobserves on first intersection,
 *    so an element re-entering the viewport never replays (a11y requirement).
 *  - Content is laid out and readable BEFORE the animation runs. If JS never
 *    executes, nothing is hidden — there is no `opacity:0` in the stylesheet.
 *  - No layout measurement: the observer reports intersection, we never measure.
 */

import { MOTION, prefersReducedMotion, isCompactViewport } from "./displacement";

let observer: IntersectionObserver | null = null;
let seen = new WeakSet<Element>();

function ensure(root?: Element | null): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        observer!.unobserve(en.target);
        reveal(en.target as HTMLElement);
      });
    },
    { root: (root as Element) ?? null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  return observer;
}

function reveal(el: HTMLElement) {
  el.dataset.aqvMembrane = "done";
  if (prefersReducedMotion() || typeof el.animate !== "function") return;
  const blur = isCompactViewport() ? 0 : MOTION.blur.membrane;
  el.animate(
    [
      { clipPath: "inset(0 0 100% 0)", opacity: 0, filter: `blur(${blur}px)`, transform: `translateY(${MOTION.delta.rise}px)` },
      { clipPath: "inset(0 0 0% 0)", opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
    ],
    { duration: MOTION.dur.calm, easing: MOTION.ease.meniscus }
  );
}

/** Register elements (typically `[data-aqv-membrane]`) for their one-shot reveal. */
export function observeMembranes(scope: ParentNode = document, root?: Element | null) {
  const io = ensure(root);
  if (!io) return;
  scope.querySelectorAll<HTMLElement>("[data-aqv-membrane]").forEach((el) => {
    if (el.dataset.aqvMembrane === "done" || seen.has(el)) return;
    seen.add(el);
    io.observe(el);
  });
}

/**
 * Imperative sweep for a column of rows (product specifications, tracking
 * stages). The waterline runs down the column and each row clears behind it.
 */
export function waterlineSweep(rows: ArrayLike<Element>, stagger: number = MOTION.stagger.normal) {
  if (prefersReducedMotion()) return;
  const blur = isCompactViewport() ? 0 : MOTION.blur.variant;
  Array.prototype.forEach.call(rows, (el: Element, i: number) => {
    if (typeof (el as HTMLElement).animate !== "function") return;
    (el as HTMLElement).animate(
      [
        { clipPath: "inset(0 0 100% 0)", opacity: 0, filter: `blur(${blur}px)` },
        { clipPath: "inset(0 0 0% 0)", opacity: 1, filter: "blur(0px)" },
      ],
      { duration: MOTION.dur.base + 80, delay: i * stagger, easing: MOTION.ease.meniscus, fill: "backwards" }
    );
  });
}

export function disposeMembranes() {
  observer?.disconnect();
  observer = null;
  seen = new WeakSet<Element>();
}
