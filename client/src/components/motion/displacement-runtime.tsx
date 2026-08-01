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

const HOME_ROUTES = new Set(["/", "/ar"]);

function mixHex(a: string, b: string, t: number) {
  const read = (hex: string) => [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const A = read(a);
  const B = read(b);
  return `rgb(${A.map((value, index) => Math.round(value + (B[index] - value) * t)).join(" ")})`;
}

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
  if (water) water.style.height = `${Math.min(100, (findCartCount(cart) / 7) * 100)}%`;
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

function setupHomepage() {
  const main = document.querySelector<HTMLElement>("main#main-content, main");
  if (!main || main.dataset.aqvRuntimeHome === "true") return () => {};
  main.dataset.aqvRuntimeHome = "true";
  main.dataset.aqvMotion = "descent";
  main.classList.add("aqv-runtime-home");

  const line = document.createElement("div");
  line.className = "aqv-waterline aqv-runtime-waterline";
  line.setAttribute("aria-hidden", "true");
  main.prepend(line);

  const floor = document.createElement("div");
  floor.className = "aqv-runtime-floor";
  floor.setAttribute("aria-hidden", "true");
  main.appendChild(floor);

  let stopCaustics = () => {};
  let canvas: HTMLCanvasElement | null = null;
  if (!prefersReducedMotion() && !isCompactViewport()) {
    canvas = document.createElement("canvas");
    canvas.className = "aqv-runtime-caustics";
    canvas.dataset.aqvCaustics = "true";
    canvas.setAttribute("aria-hidden", "true");
    line.insertAdjacentElement("afterend", canvas);
    let depth = 0;
    stopCaustics = mountCaustics(canvas, { depth: () => depth });
    canvas.dataset.depthRef = "runtime";
    const setDepth = (value: number) => { depth = value; };
    (canvas as HTMLCanvasElement & { __aqvSetDepth?: (value: number) => void }).__aqvSetDepth = setDepth;
  }

  let previous = 0;
  let velocity = 0;
  const update = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const raw = Math.min(1, Math.max(0, window.scrollY / max));
    const t = raw * raw * (3 - 2 * raw);
    velocity = (raw - previous) * 100;
    previous = raw;

    main.style.setProperty("--aqv-depth-bg", mixHex("#F6F4EF", "#0B1E28", t));
    main.style.setProperty("--aqv-depth-card", mixHex("#FFFFFF", "#12333F", t));
    main.style.setProperty("--aqv-depth-ink", mixHex("#232323", "#FFFFFF", t));
    main.style.setProperty("--aqv-depth-muted", mixHex("#6B6B6B", "#A6C0C9", t));
    main.style.setProperty("--aqv-depth-border", mixHex("#DDD8CE", "#264C58", t));
    floor.style.opacity = String(Math.max(0, (t - 0.74) / 0.26));
    if (canvas) {
      (canvas as HTMLCanvasElement & { __aqvSetDepth?: (value: number) => void }).__aqvSetDepth?.(t);
      canvas.style.opacity = String(0.58 - t * 0.44);
    }
  };

  const offFrame = onFrame(() => {
    velocity *= 0.9;
    const scale = 1 + Math.min(2.4, Math.abs(velocity) * 0.055);
    line.style.transform = `scaleY(${scale.toFixed(3)})`;
    line.style.filter = `blur(${Math.min(1.5, Math.abs(velocity) * 0.022).toFixed(2)}px)`;
  }, line);

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();

  return () => {
    window.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    stopCaustics();
    offFrame();
    line.remove();
    floor.remove();
    canvas?.remove();
    main.classList.remove("aqv-runtime-home");
    delete main.dataset.aqvRuntimeHome;
    main.removeAttribute("data-aqv-motion");
    ["--aqv-depth-bg", "--aqv-depth-card", "--aqv-depth-ink", "--aqv-depth-muted", "--aqv-depth-border"].forEach((name) => main.style.removeProperty(name));
  };
}

function setupProductGlass() {
  let destroyed = false;
  let stopCaustics = () => {};
  let cleanupPointer = () => {};
  let observer: MutationObserver | null = null;

  const install = () => {
    if (destroyed) return true;
    const gallery = document.querySelector<HTMLElement>('[aria-roledescription="معرض صور"]');
    const host = gallery?.querySelector<HTMLElement>('[data-protected="true"] > div');
    const image = host?.querySelector<HTMLImageElement>("img");
    if (!host || !image || host.dataset.aqvGlass === "true") return false;

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

function setupSuccessSurface() {
  let observer: MutationObserver | null = null;
  let overlay: HTMLDivElement | null = null;
  let timer = 0;

  const install = () => {
    const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find((node) => node.textContent?.includes("طلبك مسجّل"));
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

    if (/أضف.*السلة|أضف.*سلة المشتريات|اختار الخيار/.test(label) && !/نفدت الكمية|قريباً/.test(label)) {
      refractionRing(button, event.clientX, event.clientY, 26);
      window.setTimeout(ensureCartWater, 120);
    }

    if (/إزالة.*السلة/.test(label)) {
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

  const mutation = new MutationObserver((records) => {
    ensureCartWater();
    const candidates: Element[] = [];
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.matches("[role='option'], [data-search-result], li")) candidates.push(node);
      candidates.push(...Array.from(node.querySelectorAll("[role='option'], [data-search-result]")));
    }));
    if (candidates.length) clarify(candidates.slice(0, 8));
    tagCardsAndMembranes();
  });

  document.addEventListener("click", onClick, true);
  mutation.observe(document.body, { childList: true, subtree: true });
  return () => {
    document.removeEventListener("click", onClick, true);
    mutation.disconnect();
  };
}

export function DisplacementRuntime() {
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.dataset.aqvMotionRuntime = "on";
    const cleanups = [setupHeader(), setupInteractionFeedback()];
    if (HOME_ROUTES.has(location)) cleanups.push(setupHomepage());
    if (/^\/products\//.test(location) || /^\/product\//.test(location)) cleanups.push(setupProductGlass());
    if (location.startsWith("/order-confirmation/")) cleanups.push(setupSuccessSurface());

    return () => cleanups.reverse().forEach((cleanup) => cleanup());
  }, [location]);

  return null;
}
