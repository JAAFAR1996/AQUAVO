import { i18next } from "@/i18n";
import { useEffect } from "react";
import { useLocation } from "wouter";

import { mountCaustics } from "@/lib/motion/caustics";
import {
  MOTION,
  clarify,
  isCompactViewport,
  onFrame,
  prefersReducedMotion,
  refractionRing,
} from "@/lib/motion/displacement";
import { observeMembranes, waterlineSweep } from "@/lib/motion/membrane";

const CART_WATER_CAPACITY = 7;

function findCartCount(cart: HTMLElement) {
  const badge = Array.from(cart.querySelectorAll<HTMLElement>("span")).find((node) => /^\d+$/.test(node.textContent?.trim() ?? ""));
  if (badge) return Number.parseInt(badge.textContent ?? "0", 10) || 0;
  const match = cart.getAttribute("aria-label")?.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) || 0 : 0;
}

function ensureCartWater() {
  const cart = document.querySelector<HTMLElement>("[data-aqv-cart-target]");
  if (!cart) return;
  cart.dataset.aqvMotion = "cart";
  cart.style.isolation = "isolate";
  Array.from(cart.children).forEach((child) => {
    const node = child as HTMLElement;
    node.style.position = "relative";
    node.style.zIndex = "2";
  });

  let shell = cart.querySelector<HTMLElement>(".aqv-cart-displacement");
  if (!shell) {
    shell = document.createElement("span");
    shell.className = "aqv-cart-displacement";
    shell.setAttribute("aria-hidden", "true");
    shell.innerHTML = "<span></span>";
    cart.prepend(shell);
  }
  const water = shell.firstElementChild as HTMLElement | null;
  if (water) water.style.height = `${Math.min(100, (findCartCount(cart) / CART_WATER_CAPACITY) * 100)}%`;
}

function setupHeader() {
  const header = document.querySelector<HTMLElement>(".aq-site-header");
  if (!header) return () => {};
  header.dataset.aqvMotion = "header";
  const update = () => { header.dataset.aqvScrolled = window.scrollY > 12 ? "true" : "false"; };
  window.addEventListener("scroll", update, { passive: true });
  update();
  return () => window.removeEventListener("scroll", update);
}

function setupProductGlass() {
  let destroyed = false;
  let stopCaustics = () => {};
  let cleanupPointer = () => {};
  let observer: MutationObserver | null = null;

  const install = () => {
    if (destroyed) return true;
    const gallery = document.querySelector<HTMLElement>(`[aria-roledescription="${i18next.t("product:gallery.roleDescription")}"]`);
    const host = gallery?.querySelector<HTMLElement>('[data-protected="true"] > div');
    const image = host?.querySelector<HTMLImageElement>("img");
    if (!host || !image) return false;
    if (host.dataset.aqvGlass === "true") return true;

    host.dataset.aqvGlass = "true";
    host.dataset.aqvMotion = "glass";
    host.classList.add("aqv-runtime-proof-glass");

    const layer = document.createElement("div");
    layer.className = "aqv-runtime-glass-layer";
    layer.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas");
    const sweep = document.createElement("div");
    sweep.className = "aqv-light-sweep aqv-runtime-glass-sweep";
    layer.append(canvas, sweep);
    host.appendChild(layer);
    stopCaustics = mountCaustics(canvas, { depth: () => 0.24 });

    const fine = window.matchMedia?.("(pointer: fine)").matches && !prefersReducedMotion();
    if (fine) {
      let x = 0;
      let y = 0;
      let tx = 0;
      let ty = 0;
      const move = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        tx = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 18;
        ty = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 12;
      };
      const leave = () => { tx = 0; ty = 0; };
      host.addEventListener("pointermove", move, { passive: true });
      host.addEventListener("pointerleave", leave, { passive: true });
      const off = onFrame(() => {
        x += (tx - x) * 0.08;
        y += (ty - y) * 0.08;
        image.style.setProperty("--aqv-glass-x", `${x.toFixed(2)}px`);
        image.style.setProperty("--aqv-glass-y", `${y.toFixed(2)}px`);
        image.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(var(--tw-scale-x, 1))`;
      }, host);
      cleanupPointer = () => {
        host.removeEventListener("pointermove", move);
        host.removeEventListener("pointerleave", leave);
        off();
        image.style.removeProperty("--aqv-glass-x");
        image.style.removeProperty("--aqv-glass-y");
        image.style.transform = "";
      };
    }

    const specRows = document.querySelectorAll<HTMLElement>(
      'main [role="status"], main dl > div, main [data-aqv-spec-row], main [role="tablist"] button'
    );
    if (specRows.length) waterlineSweep(specRows, MOTION.stagger.tight);
    return true;
  };

  if (!install()) {
    observer = new MutationObserver(() => { if (install()) observer?.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    destroyed = true;
    observer?.disconnect();
    stopCaustics();
    cleanupPointer();
    const host = document.querySelector<HTMLElement>('[data-aqv-glass="true"]');
    host?.querySelector(".aqv-runtime-glass-layer")?.remove();
    host?.classList.remove("aqv-runtime-proof-glass");
    if (host) {
      delete host.dataset.aqvGlass;
      host.removeAttribute("data-aqv-motion");
    }
  };
}

/** Button labels come from the active locale bundles, so match against them instead of fixed Arabic text. */
function labelHas(label: string, keys: string[]): boolean {
  const norm = label.replace(/\s+/g, " ");
  return keys
    .map((k) => i18next.t(k, { name: "", defaultValue: "" }).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .some((m) => norm.includes(m));
}
const isAddToCartLabel = (label: string) => labelHas(label, ["products:card.addToCart", "product:cart.add", "product:cart.addShort", "products:card.chooseOption", "account:wishlist.s20", "pages:product-comparison.s41"]);
const isUnavailableLabel = (label: string) => labelHas(label, ["products:card.outOfStock", "products:card.soon"]);
const isRemoveFromCartLabel = (label: string) => labelHas(label, ["nav:cart.remove"]);

function setupSuccessSurface() {
  let observer: MutationObserver | null = null;
  let overlay: HTMLDivElement | null = null;
  let timer = 0;

  const install = () => {
    const heading = document.querySelector<HTMLElement>("[data-aqv-order-success]")
      ?? Array.from(document.querySelectorAll<HTMLElement>("h1")).find((node) => node.textContent?.includes(i18next.t("checkout:success.title")));
    if (!heading || heading.dataset.aqvSurfacePlayed === "true") return false;
    heading.dataset.aqvSurfacePlayed = "true";
    if (prefersReducedMotion()) return true;

    overlay = document.createElement("div");
    overlay.className = "aqv-success-surface";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    overlay.animate(
      [
        { transform: "scaleY(1)", opacity: 1 },
        { transform: "scaleY(0)", opacity: 0.94 },
      ],
      {
        duration: isCompactViewport() ? MOTION.dur.calm : MOTION.dur.settle,
        easing: MOTION.ease.precision,
        fill: "forwards",
      },
    );
    timer = window.setTimeout(() => {
      overlay?.remove();
      overlay = null;
      refractionRing(heading.closest<HTMLElement>("section, [class*='rounded-2xl']") ?? heading, undefined, undefined, 42);
    }, isCompactViewport() ? 560 : 800);
    return true;
  };

  if (!install()) {
    observer = new MutationObserver(() => { if (install()) observer?.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  return () => {
    observer?.disconnect();
    window.clearTimeout(timer);
    overlay?.remove();
  };
}

function tagCardsAndMembranes() {
  document.querySelectorAll<HTMLElement>('a[href^="/products/"]').forEach((link) => {
    const card = link.closest<HTMLElement>("[class*='rounded-2xl']");
    if (!card) return;
    card.dataset.aqvMotion = "card";
    card.classList.add("aqv-lift");
    const image = link.querySelector<HTMLElement>("img");
    image?.classList.add("aqv-product-image");
  });
  document.querySelectorAll<HTMLElement>("main section, main [data-tour]").forEach((node) => {
    if (!node.hasAttribute("data-aqv-membrane")) node.dataset.aqvMembrane = "pending";
  });
  document.querySelectorAll<HTMLElement>("[role='dialog'], [data-radix-popper-content-wrapper], [data-state='open']").forEach((node) => {
    node.dataset.aqvMotion = node.dataset.aqvMotion || "overlay";
  });
  observeMembranes(document);
}

function setupInteractionFeedback() {
  ensureCartWater();
  tagCardsAndMembranes();

  const onClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const button = target?.closest<HTMLElement>("button, [role='button']");
    if (!button || button.matches(":disabled, [aria-disabled='true']")) return;
    const label = `${button.textContent ?? ""} ${button.getAttribute("aria-label") ?? ""}`;

    if (isAddToCartLabel(label) && !isUnavailableLabel(label)) {
      refractionRing(button, event.clientX, event.clientY, 26);
      window.setTimeout(ensureCartWater, 120);
    }

    if (isRemoveFromCartLabel(label)) {
      const row = button.closest<HTMLElement>("li");
      if (row && typeof row.animate === "function" && !prefersReducedMotion()) {
        row.animate(
          [
            { opacity: 1, transform: "scaleY(1)", clipPath: "inset(0 0 0 0)" },
            { opacity: 0, transform: "scaleY(.7)", clipPath: "inset(0 0 100% 0)" },
          ],
          { duration: 260, easing: MOTION.ease.precision },
        );
      }
    }
  };

  let scheduled = 0;
  const scheduleRefresh = () => {
    if (scheduled) return;
    scheduled = window.requestAnimationFrame(() => {
      scheduled = 0;
      ensureCartWater();
      tagCardsAndMembranes();
    });
  };

  const mutation = new MutationObserver((records) => {
    const candidates: Element[] = [];
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.matches("[role='option'], [data-search-result], li")) candidates.push(node);
      candidates.push(...Array.from(node.querySelectorAll("[role='option'], [data-search-result]")));
    }));
    if (candidates.length) clarify(candidates.slice(0, 8));
    scheduleRefresh();
  });

  document.addEventListener("click", onClick, true);
  mutation.observe(document.body, { childList: true, subtree: true });
  return () => {
    document.removeEventListener("click", onClick, true);
    mutation.disconnect();
    if (scheduled) window.cancelAnimationFrame(scheduled);
  };
}

export function DisplacementRuntime() {
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.dataset.aqvMotionRuntime = "on";
    let cleanups: Array<() => void> = [];
    let installed = false;

    const install = () => {
      if (installed) return true;
      const headerReady = Boolean(document.querySelector(".aq-site-header"));
      if (!headerReady) return false;

      installed = true;
      cleanups = [setupHeader(), setupInteractionFeedback()];
      if (/^\/products\//.test(location) || /^\/product\//.test(location)) cleanups.push(setupProductGlass());
      if (location.startsWith("/order-confirmation/")) cleanups.push(setupSuccessSurface());
      return true;
    };

    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    if (!install()) observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.reverse().forEach((cleanup) => cleanup());
    };
  }, [location]);

  return null;
}
