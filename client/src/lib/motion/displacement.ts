export const MOTION = {
  dur: { press: 100, micro: 190, base: 340, calm: 520, settle: 760, signature: 1200, sim: 2200 },
  ease: {
    precision: "cubic-bezier(.2,.72,.2,1)",
    meniscus: "cubic-bezier(.16,.84,.24,1)",
    settle: "cubic-bezier(.34,1.42,.4,1)",
    reverse: "cubic-bezier(.32,0,.67,0)",
  },
  delta: { lift: -2, rise: 10, press: 0.985, image: 1.025 },
  blur: { membrane: 5, results: 6, variant: 4, caustic: 13 },
  stagger: { tight: 40, normal: 80, wide: 110 },
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isCompactViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

type FrameFn = (tSeconds: number, dtMs: number) => void;
interface Consumer { fn: FrameFn; host?: Element | null; visible: boolean }

const consumers = new Set<Consumer>();
let raf = 0;
let last = 0;
let observer: IntersectionObserver | null = null;

function ensureObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        consumers.forEach((consumer) => {
          if (consumer.host === entry.target) consumer.visible = entry.isIntersecting;
        });
      });
    },
    { rootMargin: "120px" },
  );
  return observer;
}

function frame(timestamp: number) {
  const dt = last ? timestamp - last : 16.7;
  last = timestamp;
  if (!document.hidden) {
    const seconds = timestamp / 1000;
    consumers.forEach((consumer) => {
      if (consumer.visible) consumer.fn(seconds, dt);
    });
  }
  if (consumers.size === 0) {
    raf = 0;
    last = 0;
    return;
  }
  raf = requestAnimationFrame(frame);
}

export function onFrame(fn: FrameFn, host?: Element | null): () => void {
  const consumer: Consumer = { fn, host, visible: !host };
  consumers.add(consumer);
  if (host) {
    const io = ensureObserver();
    if (io) io.observe(host);
    else consumer.visible = true;
  }
  if (!raf) raf = requestAnimationFrame(frame);

  return () => {
    consumers.delete(consumer);
    if (host) observer?.unobserve(host);
    if (consumers.size === 0 && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }
  };
}

export function refractionRing(
  host: HTMLElement | null,
  clientX?: number,
  clientY?: number,
  size = 24,
) {
  if (!host || prefersReducedMotion() || typeof host.animate !== "function") return;
  const rect = host.getBoundingClientRect();
  const cx = clientX ?? rect.left + rect.width / 2;
  const cy = clientY ?? rect.top + rect.height / 2;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";

  const ring = document.createElement("span");
  ring.setAttribute("aria-hidden", "true");
  ring.style.cssText =
    `position:absolute;display:block;pointer-events:none;border-radius:9999px;z-index:30;` +
    `left:${cx - rect.left - size / 2}px;top:${cy - rect.top - size / 2}px;width:${size}px;height:${size}px;` +
    `border:1.5px solid rgba(196,247,255,.9);box-shadow:0 0 22px rgba(196,247,255,.35),inset 0 0 18px rgba(196,247,255,.25)`;
  host.appendChild(ring);

  const animation = ring.animate(
    [
      { transform: "scale(.4)", opacity: 0.9 },
      { transform: "scale(4)", opacity: 0.3, offset: 0.55 },
      { transform: "scale(7.5)", opacity: 0 },
    ],
    { duration: 640, easing: MOTION.ease.meniscus, fill: "forwards" },
  );
  animation.onfinish = () => ring.remove();
  window.setTimeout(() => ring.remove(), 950);
}

export function clarify(nodes: ArrayLike<Element>, stagger: number = MOTION.stagger.tight) {
  if (prefersReducedMotion()) return;
  const useBlur = !isCompactViewport();
  Array.prototype.forEach.call(nodes, (node: Element, index: number) => {
    const element = node as HTMLElement;
    if (typeof element.animate !== "function") return;
    element.animate(
      [
        {
          filter: useBlur ? `blur(${MOTION.blur.results}px)` : "none",
          opacity: 0.3,
          transform: "translateY(6px)",
        },
        { filter: "none", opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: MOTION.dur.base,
        delay: index * stagger,
        easing: MOTION.ease.precision,
      },
    );
  });
}

export function setWaterLevel(
  element: HTMLElement | null,
  percent: number,
  mode: "settle" | "drop" = "settle",
) {
  if (!element) return;
  element.style.transition = prefersReducedMotion()
    ? "none"
    : `height ${MOTION.dur.settle}ms ${mode === "settle" ? MOTION.ease.settle : MOTION.ease.precision}`;
  element.style.height = `${Math.max(0, Math.min(100, percent))}%`;
}
