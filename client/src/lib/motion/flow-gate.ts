import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./reduced-motion";
import type { FlowDirection } from "./flow-gate-routes";

/**
 * AQUAVO Flow Gate — Light Version.
 *
 * A restrained, geometric brand transition shown ONLY between principal
 * top-level public sections (see flow-gate-routes.ts). It is NOT a loader on
 * every click.
 *
 * Design (research-driven — MDN View Transition API, Chrome same-document VT,
 * React flushSync, Web Animations API, prefers-reduced-motion, navigation
 * loading-feedback a11y):
 * - Motion runs via the Web Animations API (element.animate), exactly like the
 *   shipped product motions, so it is immune to the global CSS no-motion
 *   backstop and gives full control of the brand mark. Feature-detected; every
 *   unsupported / reduced-motion path navigates immediately.
 * - The route swap happens up front (flushSync) — navigation is never delayed
 *   only to show the animation; the destination begins loading right away.
 * - The sticky header stays visually stable: the veil/panel sits BELOW the
 *   header (z 40 < the header's z 50); the geometric mark rises ABOVE it and
 *   returns to the real logo position.
 * - Fast destinations (ready under ~190ms) get a very light direct settle with
 *   NO full-screen gate flash. Only a genuinely not-ready destination escalates
 *   to the calm brand gate + holding state. No fake progress, no message cycling
 *   — after ~2s of real waiting a single "جاري تجهيز الصفحة" label appears.
 * - Rapid clicks: a run-id supersedes any in-flight run (one final navigation);
 *   all temporary DOM, transforms and locks are cleared in finally.
 */

const MARK_SRC = "/brand/aquavo-v2-icon.svg";

const PRESS_MS = 90;
const FAST_PATH_MS = 190; // destination ready under this → light settle, no gate
const SETTLE_MS = 200; // light finish + page settle
const COVER_MS = 200; // veil deepens into the full brand gate
const REVEAL_MS = 220; // gate opens + mark returns to header
const SLOW_LABEL_MS = 2000; // show the single holding label after this real wait
const HARD_TIMEOUT_MS = 6000; // absolute safety: reveal regardless (error UI shows through)

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function supportsFlowGate(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof HTMLElement !== "undefined" &&
    typeof HTMLElement.prototype.animate === "function" &&
    typeof window !== "undefined" &&
    typeof window.CSS?.supports === "function" &&
    window.CSS.supports("clip-path", "circle(50%)")
  );
}

let currentRunId = 0;

function isDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

/** Run a WAAPI animation and always resolve within its own duration (never hang). */
function play(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
  const dur = typeof options.duration === "number" ? options.duration : 200;
  const cap = wait(dur + 80);
  try {
    const anim = (el as HTMLElement).animate(keyframes, { fill: "forwards", easing: "cubic-bezier(.4,0,.2,1)", ...options });
    return Promise.race([anim.finished.then(() => undefined).catch(() => undefined), cap]);
  } catch {
    return cap;
  }
}

function logoRect(): { x: number; y: number; size: number } {
  const logo =
    document.querySelector<HTMLElement>('[data-aqv-brand-mark]') ||
    document.querySelector<HTMLElement>('a[aria-label*="AQUAVO"] img') ||
    document.querySelector<HTMLElement>("header img, nav img");
  if (logo) {
    const r = logo.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.height / 2, y: r.top + r.height / 2, size: Math.max(r.height, 28) };
    }
  }
  // Sensible header-corner fallback (RTL layout: logo near the start/right).
  const startX = document.documentElement.dir === "rtl" ? window.innerWidth - 60 : 60;
  return { x: startX, y: 34, size: 32 };
}

/**
 * Readiness = the destination page's own <main id="main-content"> has mounted.
 * The Suspense fallback (PageLoader) does not render that landmark, so its
 * presence is a reliable "real page is here" signal. Resolves early or on cap.
 */
function waitForDestinationReady(capMs: number): Promise<void> {
  const deadline = performance.now() + capMs;
  return new Promise<void>((resolve) => {
    const check = () => {
      if (document.getElementById("main-content")) return resolve();
      if (performance.now() > deadline) return resolve();
      requestAnimationFrame(check);
    };
    // Give React a tick to unmount the old landmark first.
    requestAnimationFrame(check);
  });
}

export interface FlowGateOptions {
  navigate: () => void;
  direction: FlowDirection;
  /** Optional press acknowledgement on the clicked control. */
  triggerEl?: HTMLElement | null;
  /** Best-effort destination warmers (data/chunk); fired immediately. */
  prefetch?: () => void;
}

/**
 * Run the gate for an eligible top-level navigation. Resolves when the
 * transition settles (or immediately for a fallback path). Navigation always
 * happens exactly once.
 */
export async function runFlowGate(opts: FlowGateOptions): Promise<void> {
  const { navigate, direction, triggerEl, prefetch } = opts;
  const doNavigate = () => flushSync(() => navigate());

  // Immediate, unanimated fallbacks — never block the destination.
  if (prefersReducedMotion() || !supportsFlowGate()) {
    prefetch?.();
    doNavigate();
    return;
  }

  const runId = ++currentRunId;
  const isCurrent = () => runId === currentRunId;

  // Remove any overlay left by a superseded run.
  document.querySelectorAll("[data-aqv-flowgate]").forEach((n) => n.remove());

  prefetch?.();

  // Subtle press acknowledgement on the clicked control.
  if (triggerEl) void play(triggerEl, [{ transform: "scale(1)" }, { transform: "scale(0.97)" }, { transform: "scale(1)" }], { duration: PRESS_MS });

  const dark = isDark();
  const panelBg = dark ? "#0B1E28" : "#F6F4EF";
  const { x: lx, y: ly, size: lsize } = logoRect();

  // --- Build the overlay (veil/panel below header, mark above header) ---
  const veil = document.createElement("div");
  veil.setAttribute("data-aqv-flowgate", "veil");
  veil.setAttribute("aria-hidden", "true");
  Object.assign(veil.style, {
    position: "fixed",
    inset: "0",
    zIndex: "40",
    pointerEvents: "none",
    background: panelBg,
    opacity: "0",
    // Clip a soft circle centred on the logo so the veil emanates from the mark.
    clipPath: `circle(0px at ${lx}px ${ly}px)`,
    willChange: "opacity, clip-path",
  } as CSSStyleDeclaration);

  // Restrained FlowLine-blue edge highlight framing the gate (never a long line).
  const frame = document.createElement("div");
  Object.assign(frame.style, {
    position: "absolute",
    inset: "0",
    boxShadow: "inset 0 0 0 1.5px rgba(11,100,166,0.45)",
    opacity: "0",
  } as CSSStyleDeclaration);
  veil.appendChild(frame);

  const holdLabel = document.createElement("div");
  holdLabel.textContent = "جاري تجهيز الصفحة";
  Object.assign(holdLabel.style, {
    position: "absolute",
    left: "0",
    right: "0",
    bottom: "18%",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "700",
    color: dark ? "rgba(246,244,239,0.82)" : "rgba(11,30,40,0.72)",
    opacity: "0",
    direction: "rtl",
  } as CSSStyleDeclaration);
  veil.appendChild(holdLabel);

  const mark = document.createElement("img");
  mark.src = MARK_SRC;
  mark.alt = "";
  mark.setAttribute("data-aqv-flowgate", "mark");
  mark.setAttribute("aria-hidden", "true");
  Object.assign(mark.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${lsize}px`,
    height: `${lsize}px`,
    zIndex: "60", // above the sticky header (z 50) so it rises from the logo
    pointerEvents: "none",
    transform: `translate(${lx - lsize / 2}px, ${ly - lsize / 2}px) scale(1)`,
    opacity: "0",
    willChange: "transform, opacity",
    objectFit: "contain",
  } as CSSStyleDeclaration);

  const outgoing = document.getElementById("main-content");
  let incoming: HTMLElement | null = null;

  const cleanup = () => {
    veil.remove();
    mark.remove();
    for (const el of [outgoing, incoming]) {
      if (el) {
        el.style.transform = "";
        el.style.filter = "";
        el.style.willChange = "";
      }
    }
  };

  try {
    document.body.appendChild(veil);
    document.body.appendChild(mark);

    // Brief outgoing recede (page eases back a touch as the mark lifts).
    if (outgoing) {
      outgoing.style.willChange = "transform, filter";
      void play(outgoing, [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(0.985)", filter: "brightness(0.97)" },
      ], { duration: 150 });
    }

    // Light veil + mark lift emanating from the logo (soft, low opacity).
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const lightRadius = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.22);
    void play(mark, [
      { opacity: "0", transform: `translate(${lx - lsize / 2}px, ${ly - lsize / 2}px) scale(1)` },
      { opacity: "1", transform: `translate(${lx - lsize / 2}px, ${ly - lsize / 2}px) scale(1.12)` },
    ], { duration: 130 });
    await play(veil, [
      { opacity: "0", clipPath: `circle(0px at ${lx}px ${ly}px)` },
      { opacity: "0.35", clipPath: `circle(${lightRadius}px at ${lx}px ${ly}px)` },
    ], { duration: 130 });
    if (!isCurrent()) return;

    // Swap the route now — under the soft veil, so a fast swap reads as a settle.
    // Only AFTER the swap do we measure readiness, so we wait for the NEW page's
    // landmark (not the old one that is still mounted before flushSync).
    doNavigate();
    const readyRace = waitForDestinationReady(HARD_TIMEOUT_MS);

    // Decide fast-path vs full gate based on real readiness.
    const ready = await Promise.race([readyRace.then(() => true), wait(FAST_PATH_MS).then(() => false)]);
    if (!isCurrent()) return;
    incoming = document.getElementById("main-content");

    if (ready) {
      // Light direct transition: fade the veil away, mark returns, page settles.
      await Promise.all([
        play(veil, [{ opacity: "0.35" }, { opacity: "0" }], { duration: SETTLE_MS }),
        play(mark, [
          { opacity: "1", transform: `translate(${lx - lsize / 2}px, ${ly - lsize / 2}px) scale(1.12)` },
          { opacity: "0", transform: `translate(${lx - lsize / 2}px, ${ly - lsize / 2}px) scale(1)` },
        ], { duration: SETTLE_MS }),
        incoming
          ? play(incoming, [
              { transform: "scale(0.99)", filter: "brightness(0.98)" },
              { transform: "scale(1)", filter: "brightness(1)" },
            ], { duration: SETTLE_MS })
          : Promise.resolve(),
      ]);
      return;
    }

    // Not ready quickly → escalate into the full, calm brand gate.
    const centerShift = direction === "back" ? -1 : direction === "forward" ? 1 : 0;
    const markScale = 2.1;
    await Promise.all([
      play(veil, [
        { opacity: "0.35", clipPath: `circle(${lightRadius}px at ${lx}px ${ly}px)` },
        { opacity: "1", clipPath: `circle(140% at ${cx}px ${cy}px)` },
      ], { duration: COVER_MS }),
      play(frame, [{ opacity: "0" }, { opacity: "1" }], { duration: COVER_MS }),
      play(mark, [
        { transform: `translate(${lx - lsize / 2}px, ${ly - lsize / 2}px) scale(1.12)` },
        { transform: `translate(${cx - lsize / 2 + centerShift * 8}px, ${cy - lsize / 2}px) scale(${markScale})` },
      ], { duration: COVER_MS }),
    ]);
    if (!isCurrent()) return;

    // Holding state: wait for real readiness; after ~2s show one static label.
    const labelTimer = window.setTimeout(() => {
      void play(holdLabel, [{ opacity: "0" }, { opacity: "1" }], { duration: 200 });
    }, SLOW_LABEL_MS);
    await readyRace; // resolves when main-content mounts or on the hard cap
    window.clearTimeout(labelTimer);
    if (!isCurrent()) return;
    incoming = document.getElementById("main-content");

    // Reveal: gate opens (iris) + mark contracts back to the real logo position.
    // Direction tunes the easing/scale so Back feels like a reverse.
    const revealEasing = direction === "back" ? "cubic-bezier(.32,0,.67,0)" : "cubic-bezier(.16,1,.3,1)";
    await Promise.all([
      play(veil, [
        { opacity: "1", clipPath: `circle(140% at ${cx}px ${cy}px)` },
        { opacity: "0", clipPath: `circle(0px at ${lx}px ${ly}px)` },
      ], { duration: REVEAL_MS, easing: revealEasing }),
      play(holdLabel, [{ opacity: getComputedStyle(holdLabel).opacity }, { opacity: "0" }], { duration: 120 }),
      play(mark, [
        { opacity: "1", transform: `translate(${cx - lsize / 2 + centerShift * 8}px, ${cy - lsize / 2}px) scale(${markScale})` },
        { opacity: "0", transform: `translate(${lx - lsize / 2}px, ${ly - lsize / 2}px) scale(1)` },
      ], { duration: REVEAL_MS, easing: revealEasing }),
      incoming
        ? play(incoming, [
            { transform: "scale(0.99)", filter: "brightness(0.98)" },
            { transform: "scale(1)", filter: "brightness(1)" },
          ], { duration: REVEAL_MS })
        : Promise.resolve(),
    ]);
  } catch {
    // Guarantee navigation happened even if the choreography threw.
    if (isCurrent()) doNavigate();
  } finally {
    if (isCurrent()) cleanup();
    else {
      // A newer run owns the screen; just drop our own nodes.
      veil.remove();
      mark.remove();
    }
  }
}

/**
 * Reveal-only reverse gesture for browser Back / Forward. The route has already
 * changed (popstate), so this never navigates — it plays a short, coherent
 * reverse of the gate (a calm brand veil collapsing toward the header mark) over
 * the freshly rendered destination. Purely visual; no locks on navigation.
 */
export async function runFlowGateReverse(direction: FlowDirection): Promise<void> {
  if (prefersReducedMotion() || !supportsFlowGate()) return;

  const runId = ++currentRunId;
  const isCurrent = () => runId === currentRunId;
  document.querySelectorAll("[data-aqv-flowgate]").forEach((n) => n.remove());

  const dark = isDark();
  const { x: lx, y: ly, size: lsize } = logoRect();
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  const veil = document.createElement("div");
  veil.setAttribute("data-aqv-flowgate", "reverse");
  veil.setAttribute("aria-hidden", "true");
  Object.assign(veil.style, {
    position: "fixed",
    inset: "0",
    zIndex: "40",
    pointerEvents: "none",
    background: dark ? "#0B1E28" : "#F6F4EF",
    opacity: "0",
    clipPath: `circle(${Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.28)}px at ${cx}px ${cy}px)`,
    willChange: "opacity, clip-path",
  } as CSSStyleDeclaration);

  const mark = document.createElement("img");
  mark.src = MARK_SRC;
  mark.alt = "";
  mark.setAttribute("data-aqv-flowgate", "reverse-mark");
  mark.setAttribute("aria-hidden", "true");
  Object.assign(mark.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${lsize}px`,
    height: `${lsize}px`,
    zIndex: "60",
    pointerEvents: "none",
    opacity: "0",
    transform: `translate(${cx - lsize / 2}px, ${cy - lsize / 2}px) scale(1.6)`,
    objectFit: "contain",
    willChange: "transform, opacity",
  } as CSSStyleDeclaration);

  const easing = direction === "forward" ? "cubic-bezier(.16,1,.3,1)" : "cubic-bezier(.32,0,.67,0)";
  try {
    document.body.appendChild(veil);
    document.body.appendChild(mark);
    void play(mark, [
      { opacity: "0", transform: `translate(${cx - lsize / 2}px, ${cy - lsize / 2}px) scale(1.6)` },
      { opacity: "0.9", transform: `translate(${(cx + lx) / 2 - lsize / 2}px, ${(cy + ly) / 2 - lsize / 2}px) scale(1.2)`, offset: 0.5 },
      { opacity: "0", transform: `translate(${lx - lsize / 2}px, ${ly - lsize / 2}px) scale(1)` },
    ], { duration: 300, easing });
    await play(veil, [
      { opacity: "0.5", clipPath: `circle(60% at ${cx}px ${cy}px)` },
      { opacity: "0", clipPath: `circle(0px at ${lx}px ${ly}px)` },
    ], { duration: 300, easing });
  } catch {
    /* purely decorative */
  } finally {
    if (isCurrent()) {
      veil.remove();
      mark.remove();
    } else {
      veil.remove();
      mark.remove();
    }
  }
}
