import { refractionRing, setWaterLevel } from "./displacement";

/**
 * Compatibility adapter for existing ProductCard call sites.
 * The old full-screen flying product is retired. Addition feedback is now local:
 * one refraction ring at the source and a water-level rise inside the real cart.
 */
export function flyProductToCart(sourceImg: HTMLElement | null): void {
  const source = sourceImg?.closest<HTMLElement>("button, [role='button'], [data-protected='true']") ?? sourceImg;
  refractionRing(source, undefined, undefined, 28);

  window.setTimeout(() => {
    const cart = document.querySelector<HTMLElement>("[data-aqv-cart-target]");
    if (!cart) return;
    let shell = cart.querySelector<HTMLElement>(".aqv-cart-displacement");
    if (!shell) {
      cart.style.isolation = "isolate";
      shell = document.createElement("span");
      shell.className = "aqv-cart-displacement";
      shell.setAttribute("aria-hidden", "true");
      shell.innerHTML = "<span></span>";
      cart.prepend(shell);
    }
    const countText = Array.from(cart.querySelectorAll<HTMLElement>("span"))
      .map((node) => node.textContent?.trim() ?? "")
      .find((text) => /^\d+$/.test(text));
    const count = Number.parseInt(countText ?? "0", 10) || 1;
    setWaterLevel(shell.firstElementChild as HTMLElement | null, Math.min(100, (count / 7) * 100), "settle");
  }, 90);
}
