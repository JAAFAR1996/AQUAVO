/**
 * AQUAVO — قانون ١: الوسط يتحرك، مو العنصر
 * Lightweight Canvas 2D aquarium light. It never runs on compact viewports or
 * when the user requests reduced motion.
 */

import { onFrame, prefersReducedMotion, isCompactViewport } from "./displacement";

export interface CausticsOptions {
  depth?: () => number;
  cells?: number;
}

const TINT = "196,247,255";

export function mountCaustics(canvas: HTMLCanvasElement, opts: CausticsOptions = {}): () => void {
  if (prefersReducedMotion() || isCompactViewport()) {
    canvas.style.display = "none";
    return () => {};
  }

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return () => {};

  const tablet = window.matchMedia("(max-width: 1023px)").matches;
  const width = tablet ? 128 : 160;
  const cells = opts.cells ?? (tablet ? 8 : 12);
  canvas.style.filter = "blur(13px)";
  canvas.style.pointerEvents = "none";

  let height = 90;
  const resize = () => {
    const clientWidth = canvas.clientWidth;
    const clientHeight = canvas.clientHeight;
    if (!clientWidth || !clientHeight) return;
    height = Math.max(36, Math.round((width * clientHeight) / clientWidth));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });

  const off = onFrame((time) => {
    if (canvas.offsetParent === null) return;
    if (canvas.width !== width) resize();

    const depth = Math.max(0, Math.min(1, opts.depth ? opts.depth() : 0));
    const speed = 1 - depth * 0.62;
    const amplitude = 1 - depth * 0.7;
    const flattening = 0.26 - depth * 0.14;

    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "lighter";

    for (let index = 0; index < cells; index += 1) {
      const progress = index / cells;
      const x =
        (0.5 +
          0.44 * Math.sin(time * 0.19 * speed + index * 1.73) +
          0.09 * Math.sin(time * 0.47 * speed + index * 0.7)) *
        width;
      const y =
        (progress * 1.12 - 0.06 + 0.07 * Math.sin(time * 0.29 * speed + index * 2.3)) *
        height;
      const radius = (11 + 7 * Math.sin(time * 0.33 + index)) * (1 + depth * 1.7);
      const alpha = Math.max(0, (0.15 + 0.08 * Math.sin(time * 0.55 + index * 2.1)) * amplitude);
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${TINT},${alpha.toFixed(3)})`);
      gradient.addColorStop(1, `rgba(${TINT},0)`);
      context.fillStyle = gradient;
      context.save();
      context.translate(x, y);
      context.scale(1, flattening);
      context.translate(-x, -y);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    context.globalCompositeOperation = "source-over";
  }, canvas);

  return () => {
    window.removeEventListener("resize", resize);
    off();
  };
}
