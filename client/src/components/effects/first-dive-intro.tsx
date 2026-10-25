const FIRST_DIVE_KEY = "aquavo_first_dive_seen_v2";

/**
 * One non-blocking brand reveal for the visitor's first-ever browser visit.
 * Start with the small bootstrap, while the application modules load. Starting
 * this from a React effect covered the already-painted home a second time after
 * hydration. Keep the same mark, surface split and once-only rule, with a
 * shorter 420ms reveal so the decoration cannot prolong the first visit.
 * The temporary node lives outside React's root, so hydration cannot replace it.
 */
export function startFirstDiveIntro(): void {
  try {
    if (window.localStorage.getItem(FIRST_DIVE_KEY) === "1") return;
    window.localStorage.setItem(FIRST_DIVE_KEY, "1");
  } catch {
    return;
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const surface = document.createElement("div");
  surface.className = "aqv-first-dive";
  surface.dataset.aqvMotion = "first-dive";
  surface.setAttribute("aria-hidden", "true");
  const mark = document.createElement("img");
  mark.className = "aqv-first-dive__mark";
  mark.src = "/brand/aquavo-v2-icon.svg";
  mark.alt = "";
  mark.width = 68;
  mark.height = 68;
  const line = document.createElement("span");
  line.className = "aqv-first-dive__line";
  surface.append(mark, line);
  document.body.appendChild(surface);
  window.setTimeout(() => surface.remove(), 480);
}
