import { MOTION, prefersReducedMotion, isCompactViewport } from "./displacement";

let observer: IntersectionObserver | null = null;
const seen = new WeakSet<Element>();

function ensure(root?: Element | null): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer?.unobserve(entry.target);
        reveal(entry.target as HTMLElement);
      });
    },
    { root: root ?? null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  return observer;
}

function reveal(element: HTMLElement) {
  element.dataset.aqvMembrane = "done";
  if (prefersReducedMotion() || typeof element.animate !== "function") return;
  const blur = isCompactViewport() ? 0 : MOTION.blur.membrane;
  element.animate(
    [
      {
        clipPath: "inset(0 0 100% 0)",
        opacity: 0,
        filter: `blur(${blur}px)`,
        transform: `translateY(${MOTION.delta.rise}px)`,
      },
      {
        clipPath: "inset(0 0 0% 0)",
        opacity: 1,
        filter: "blur(0px)",
        transform: "translateY(0)",
      },
    ],
    { duration: MOTION.dur.calm, easing: MOTION.ease.meniscus },
  );
}

export function observeMembranes(scope: ParentNode = document, root?: Element | null) {
  const io = ensure(root);
  if (!io) return;
  scope.querySelectorAll<HTMLElement>("[data-aqv-membrane]").forEach((element) => {
    if (element.dataset.aqvMembrane === "done" || seen.has(element)) return;
    seen.add(element);
    io.observe(element);
  });
}

export function waterlineSweep(rows: ArrayLike<Element>, stagger: number = MOTION.stagger.normal) {
  if (prefersReducedMotion()) return;
  const blur = isCompactViewport() ? 0 : MOTION.blur.variant;
  Array.prototype.forEach.call(rows, (node: Element, index: number) => {
    const element = node as HTMLElement;
    if (typeof element.animate !== "function") return;
    element.animate(
      [
        { clipPath: "inset(0 0 100% 0)", opacity: 0, filter: `blur(${blur}px)` },
        { clipPath: "inset(0 0 0% 0)", opacity: 1, filter: "blur(0px)" },
      ],
      {
        duration: MOTION.dur.base + 80,
        delay: index * stagger,
        easing: MOTION.ease.meniscus,
        fill: "backwards",
      },
    );
  });
}

export function disposeMembranes() {
  observer?.disconnect();
  observer = null;
}
