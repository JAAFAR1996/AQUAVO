// AQUAVO Commerce-Motion V2 — Preview-only feature flags.
//
// Everything in `commerce-motion/` is a PREVIEW comparison layer for the owner to
// review candidate Add-to-Cart and Order-Success interactions. It NEVER changes
// Production behavior:
//   • The floating panel + new concepts only mount on non-production hosts.
//   • On aquavoiq.com / www.aquavoiq.com the gate is closed → nothing renders,
//     no event is dispatched, and the live toast/flow is untouched.
//   • Selection lives in sessionStorage only (per-tab, never persisted server-side).

export type ConceptChoice = "current" | "A" | "B";

export const CART_FLAG_KEY = "aqv:cm:cart";
export const ORDER_FLAG_KEY = "aqv:cm:order";

/** Fired by cart-context (preview host only) after a real add succeeds. */
export const ADD_TO_CART_EVENT = "aqv:add-to-cart";
/** Fired when a concept selection changes, so mounted views re-read the flag. */
export const FLAG_CHANGE_EVENT = "aqv:cm:change";

/** Production hosts where this layer must be completely inert. */
const PRODUCTION_HOSTS = new Set(["aquavoiq.com", "www.aquavoiq.com"]);

/**
 * The comparison layer is available on every host EXCEPT the two production
 * domains — i.e. localhost, *.vercel.app Preview builds, and any staging host.
 * This is the single gate the whole feature keys off of.
 */
export function isCommerceMotionPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  return !PRODUCTION_HOSTS.has(window.location.hostname);
}

function readFlag(key: string): ConceptChoice {
  if (typeof window === "undefined") return "current";
  try {
    const v = window.sessionStorage.getItem(key);
    return v === "A" || v === "B" ? v : "current";
  } catch {
    return "current";
  }
}

function writeFlag(key: string, value: ConceptChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent(FLAG_CHANGE_EVENT, { detail: { key, value } }));
  } catch {
    /* sessionStorage may be blocked; selection just won't persist. */
  }
}

export const getCartConcept = (): ConceptChoice => readFlag(CART_FLAG_KEY);
export const setCartConcept = (v: ConceptChoice): void => writeFlag(CART_FLAG_KEY, v);
export const getOrderConcept = (): ConceptChoice => readFlag(ORDER_FLAG_KEY);
export const setOrderConcept = (v: ConceptChoice): void => writeFlag(ORDER_FLAG_KEY, v);

export interface AddToCartPreviewDetail {
  id: string;
  name: string;
  variantLabel?: string;
  quantity: number;
  price: number;
  image?: string;
}

/**
 * Dispatch the preview event describing a successful add. No-op on production
 * hosts (and harmless everywhere else, since only the preview overlay listens).
 */
export function emitAddToCartPreview(detail: AddToCartPreviewDetail): void {
  if (!isCommerceMotionPreviewHost()) return;
  try {
    window.dispatchEvent(new CustomEvent<AddToCartPreviewDetail>(ADD_TO_CART_EVENT, { detail }));
  } catch {
    /* never let a preview concern affect the real add */
  }
}
