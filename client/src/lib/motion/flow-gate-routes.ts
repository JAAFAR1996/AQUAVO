/**
 * Flow Gate — eligible route map.
 *
 * The Flow Gate is a brand transition shown ONLY between verified principal
 * public top-level sections. It is deliberately NOT a loader on every click:
 * everything not in ELIGIBLE_SECTIONS navigates exactly as it does today.
 *
 * Eligibility is derived from the real client route map (client/src/App.tsx)
 * and the real top-level header navigation (client/src/components/navbar.tsx).
 * Only routes that actually exist as in-app (SPA) routes are listed.
 *
 * Note: `/guides` is intentionally excluded — in the current navbar it is a
 * plain <a> (a full browser reload, not an SPA navigation), and browser reloads
 * are out of scope for the gate.
 */

/** Principal public sections that may use the gate (exact SPA paths that exist). */
export const ELIGIBLE_SECTIONS = [
  "/", // Home
  "/products", // Store
  "/about", // About AQUAVO
  "/journey", // Canonical guided aquarium setup
  "/tank-builder", // Backwards-compatible alias that redirects to /journey
  "/order-tracking", // Track order
  "/profile", // Account / Orders (?tab=orders)
] as const;

const ELIGIBLE_SET = new Set<string>(ELIGIBLE_SECTIONS);

/** Strip query + hash and normalise a trailing slash to compare bare paths. */
export function normalizeSectionPath(href: string): string {
  if (!href) return "";
  // Only consider same-origin absolute paths; ignore protocol-relative/external.
  let path = href;
  const hashIdx = path.indexOf("#");
  if (hashIdx >= 0) path = path.slice(0, hashIdx);
  const qIdx = path.indexOf("?");
  if (qIdx >= 0) path = path.slice(0, qIdx);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

/** True only for the principal top-level sections above (query/hash ignored). */
export function isEligibleSection(href: string): boolean {
  return ELIGIBLE_SET.has(normalizeSectionPath(href));
}

/**
 * Section depth for spatial direction. Home is the top level (0); the other
 * principal sections are one level in (1). Deeper → forward, shallower → back,
 * same → neutral. Kept intentionally coarse: one coherent system, not a bespoke
 * animation per page.
 */
export function sectionDepth(href: string): number {
  const path = normalizeSectionPath(href);
  if (path === "/") return 0;
  return 1;
}

/**
 * Best-effort destination warmers. Each eligible section's lazy chunk is the
 * main cold-start cost; importing it on hover/focus/pointerdown means the first
 * click usually resolves fast (light transition, no gate flash). Home is a
 * static import, so it is always warm and needs no entry here. Idempotent —
 * Vite/webpack de-dupe repeat dynamic imports.
 */
const SECTION_CHUNK: Record<string, () => Promise<unknown>> = {
  "/products": () => import("@/pages/products"),
  "/about": () => import("@/pages/about"),
  "/journey": () => import("@/pages/journey"),
  "/tank-builder": () => import("@/pages/aquarium-wizard"),
  "/order-tracking": () => import("@/pages/order-tracking"),
  "/profile": () => import("@/pages/profile"),
};

export function prefetchSection(href: string): void {
  const fn = SECTION_CHUNK[normalizeSectionPath(href)];
  if (fn) void fn().catch(() => {});
}

export type FlowDirection = "forward" | "back" | "neutral";

export function flowDirection(fromHref: string, toHref: string): FlowDirection {
  const from = sectionDepth(fromHref);
  const to = sectionDepth(toHref);
  if (to > from) return "forward";
  if (to < from) return "back";
  return "neutral";
}
