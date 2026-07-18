import { prefersReducedMotion } from "./reduced-motion";

/**
 * Product-to-Cart capture
 *
 * Clones ONLY the real product image and sends it along a short curved path
 * into the cart icon, then gives the cart one small reaction. There is no
 * FlowLine, trail, bubbles or decorative path. The temporary clone is always
 * removed afterward (on finish or cancel). Uses the Web Animations API so it
 * runs independently of the global CSS no-motion backstop. Never opens the
 * cart and never touches cart business logic — the caller updates the cart.
 */
export function flyProductToCart(sourceImg: HTMLElement | null): void {
  if (typeof window === "undefined" || !sourceImg) return;

  const cart = document.querySelector<HTMLElement>("[data-aqv-cart-target]");
  if (!cart) return;

  // Reduced motion: just react the cart once, no flight.
  if (prefersReducedMotion()) {
    bumpCart(cart);
    return;
  }

  const from = sourceImg.getBoundingClientRect();
  const to = cart.getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return;

  const startX = from.left;
  const startY = from.top;
  const startSize = Math.min(from.width, from.height);
  const endX = to.left + to.width / 2;
  const endY = to.top + to.height / 2;
  const endSize = Math.max(18, to.width * 0.42);

  const dx = endX - (startX + startSize / 2);
  const dy = endY - (startY + startSize / 2);
  // Curved path: apex lifts up and eases toward the cart at the midpoint.
  const midX = dx * 0.55;
  const midY = dy * 0.5 - Math.max(60, Math.abs(dx) * 0.28);
  const endScale = endSize / startSize;

  const src = (sourceImg as HTMLImageElement).currentSrc || (sourceImg as HTMLImageElement).src || "";
  const clone = document.createElement("div");
  Object.assign(clone.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${startSize}px`,
    height: `${startSize}px`,
    borderRadius: "14px",
    background: src ? `#fff center/contain no-repeat url("${src}")` : "#0B93A6",
    boxShadow: "0 12px 30px rgba(11,30,40,0.28)",
    zIndex: "2147482000",
    pointerEvents: "none",
    willChange: "transform, opacity",
  } as CSSStyleDeclaration);
  document.body.appendChild(clone);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clone.remove();
  };

  const cloneAnim = clone.animate(
    [
      { transform: "translate(0px, 0px) scale(1)", opacity: 1, offset: 0 },
      { transform: `translate(${midX}px, ${midY}px) scale(0.72)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${endScale})`, opacity: 0.25, offset: 1 },
    ],
    { duration: 620, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }
  );

  cloneAnim.onfinish = () => {
    cleanup();
    bumpCart(cart);
  };
  cloneAnim.oncancel = cleanup;
  // Safety net: never leave a clone behind even if the animation events don't fire.
  window.setTimeout(cleanup, 1200);
}

/** Single, short reaction on the cart icon (WAAPI, backstop-independent). */
function bumpCart(cart: HTMLElement): void {
  if (prefersReducedMotion()) return;
  cart.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }],
    { duration: 300, easing: "cubic-bezier(.34,1.56,.64,1)" }
  );
}
