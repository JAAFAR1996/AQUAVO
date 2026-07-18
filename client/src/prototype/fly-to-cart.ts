import { prefersReducedMotion } from "./motion-prototype";

/**
 * Product-to-Cart capture (Preview prototype).
 *
 * Clones the real product image, lifts + shrinks it, and sends it along a
 * short curved path into the cart icon, drawing one thin AQUAVO FlowLine
 * behind it and giving the cart a single reaction on arrival.
 *
 * Uses the Web Animations API (element.animate) so it runs independently of
 * the global CSS no-motion backstop. Never opens the cart and never touches
 * cart business logic — the caller updates the cart normally.
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

  // --- flying clone ---
  const clone = document.createElement("div");
  const src = (sourceImg as HTMLImageElement).currentSrc || (sourceImg as HTMLImageElement).src || "";
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

  // --- thin FlowLine behind the clone ---
  const dist = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const line = document.createElement("div");
  Object.assign(line.style, {
    position: "fixed",
    left: `${startX + startSize / 2}px`,
    top: `${startY + startSize / 2}px`,
    width: `${dist}px`,
    height: "2px",
    transformOrigin: "0 50%",
    transform: `rotate(${angle}deg)`,
    background: "linear-gradient(90deg, rgba(11,147,166,0) 0%, rgba(11,147,166,0.55) 60%, rgba(11,147,166,0) 100%)",
    borderRadius: "2px",
    zIndex: "2147481900",
    pointerEvents: "none",
    opacity: "0",
  } as CSSStyleDeclaration);
  document.body.appendChild(line);

  const endScale = endSize / startSize;

  const cloneAnim = clone.animate(
    [
      { transform: "translate(0px, 0px) scale(1)", opacity: 1, offset: 0 },
      { transform: `translate(${midX}px, ${midY}px) scale(0.72)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${endScale})`, opacity: 0.25, offset: 1 },
    ],
    { duration: 620, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }
  );

  line.animate(
    [
      { opacity: 0, offset: 0 },
      { opacity: 0.9, offset: 0.35 },
      { opacity: 0, offset: 1 },
    ],
    { duration: 500, easing: "ease-out", fill: "forwards" }
  );

  cloneAnim.onfinish = () => {
    clone.remove();
    line.remove();
    bumpCart(cart);
  };
  cloneAnim.oncancel = () => {
    clone.remove();
    line.remove();
  };
}

/** Single, short reaction on the cart icon (WAAPI, backstop-independent). */
function bumpCart(cart: HTMLElement): void {
  if (prefersReducedMotion()) return;
  cart.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.22)" },
      { transform: "scale(1)" },
    ],
    { duration: 300, easing: "cubic-bezier(.34,1.56,.64,1)" }
  );
}
