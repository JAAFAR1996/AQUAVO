// AQUAVO Commerce-Motion Redesign — Preview-only feature flags.
//
// A PREVIEW comparison layer for the owner. It NEVER changes Production behavior:
//   • Concepts + panel only mount on non-production hosts.
//   • On aquavoiq.com / www.aquavoiq.com the gate is closed → nothing renders,
//     no event is dispatched, and the live experience is untouched.
//   • Selection lives in sessionStorage only (per-tab).

export type CartConcept = "current" | "A" | "B";
export type OrderConcept = "current" | "B"; // owner locked Order-Success to Idea B only

export const CART_FLAG_KEY = "aqv:cm:cart";
export const ORDER_FLAG_KEY = "aqv:cm:order";

/** Fired by cart-context (preview host only) after a real add succeeds. */
export const ADD_TO_CART_EVENT = "aqv:add-to-cart";
/** Fired when a concept selection changes, so mounted views re-read the flag. */
export const FLAG_CHANGE_EVENT = "aqv:cm:change";

const PRODUCTION_HOSTS = new Set(["aquavoiq.com", "www.aquavoiq.com"]);

/** Available everywhere EXCEPT the two production domains (localhost, *.vercel.app, staging). */
export function isCommerceMotionPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  return !PRODUCTION_HOSTS.has(window.location.hostname);
}

function readFlag<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.sessionStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent(FLAG_CHANGE_EVENT, { detail: { key, value } }));
  } catch {
    /* sessionStorage may be blocked; selection just won't persist. */
  }
}

const CART_VALUES: readonly CartConcept[] = ["current", "A", "B"];
const ORDER_VALUES: readonly OrderConcept[] = ["current", "B"];

export const getCartConcept = (): CartConcept => readFlag(CART_FLAG_KEY, CART_VALUES, "current");
export const setCartConcept = (v: CartConcept): void => writeFlag(CART_FLAG_KEY, v);
export const getOrderConcept = (): OrderConcept => readFlag(ORDER_FLAG_KEY, ORDER_VALUES, "current");
export const setOrderConcept = (v: OrderConcept): void => writeFlag(ORDER_FLAG_KEY, v);

export interface AddToCartPreviewDetail {
  id: string;
  name: string;
  variantLabel?: string;
  quantity: number;
  price: number;
  image?: string;
}

/** Dispatch the preview event describing a successful add. No-op on production hosts. */
export function emitAddToCartPreview(detail: AddToCartPreviewDetail): void {
  if (!isCommerceMotionPreviewHost()) return;
  try {
    window.dispatchEvent(new CustomEvent<AddToCartPreviewDetail>(ADD_TO_CART_EVENT, { detail }));
  } catch {
    /* never let a preview concern affect the real add */
  }
}
