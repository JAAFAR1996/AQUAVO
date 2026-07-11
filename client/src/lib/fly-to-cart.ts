// Fly-to-cart micro-interaction (2026).
// Clones the product image and animates it along a curved arc from the source
// element to the navbar cart icon, then pops the cart badge. Pure Web Animations
// API — no library, no React. Safely no-ops on SSR / reduced-motion / missing nodes.

const CART_SELECTOR = '[data-tour="navbar-cart"]';

export function flyToCart(sourceEl: HTMLElement | null, imageUrl?: string): void {
  if (typeof window === "undefined" || !sourceEl) return;

  // Respect the user's motion preference.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    pulseCartBadge();
    return;
  }

  const cartEl = document.querySelector<HTMLElement>(CART_SELECTOR);
  if (!cartEl) return;

  const src = sourceEl.getBoundingClientRect();
  const dst = cartEl.getBoundingClientRect();
  if (!src.width || !dst.width) return;

  const startX = src.left + src.width / 2;
  const startY = src.top + src.height / 2;
  const endX = dst.left + dst.width / 2;
  const endY = dst.top + dst.height / 2;

  const flyer = document.createElement("div");
  const size = 64;
  Object.assign(flyer.style, {
    position: "fixed",
    left: `${startX - size / 2}px`,
    top: `${startY - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    zIndex: "9999",
    pointerEvents: "none",
    backgroundColor: "var(--primary, #0B93A6)",
    backgroundImage: imageUrl ? `url("${imageUrl}")` : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 8px 24px rgba(11,147,166,0.4)",
    willChange: "transform, opacity",
  } as CSSStyleDeclaration);
  document.body.appendChild(flyer);

  const dx = endX - startX;
  const dy = endY - startY;
  // Arc upward first (control point), then drop into the cart.
  const lift = Math.min(160, Math.abs(dx) * 0.4 + 80);

  const anim = flyer.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1, offset: 0 },
      {
        transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(0.8)`,
        opacity: 0.95,
        offset: 0.55,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(0.2)`,
        opacity: 0.3,
        offset: 1,
      },
    ],
    { duration: 600, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" }
  );

  anim.onfinish = () => {
    flyer.remove();
    pulseCartBadge();
  };
  // Safety cleanup in case onfinish never fires (tab hidden, etc.).
  window.setTimeout(() => flyer.remove(), 1200);
}

function pulseCartBadge(): void {
  const cartEl = document.querySelector<HTMLElement>(CART_SELECTOR);
  if (!cartEl) return;
  cartEl.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.3)" },
      { transform: "scale(0.92)" },
      { transform: "scale(1)" },
    ],
    { duration: 420, easing: "ease-out" }
  );
}
