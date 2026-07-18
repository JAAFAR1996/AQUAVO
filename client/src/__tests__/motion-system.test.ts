import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("AQUAVO Minimal Precision motion system", () => {
  it("ships the approved lightweight motion primitives", () => {
    expect(css).toContain(".aq-waterline-hero::after");
    expect(css).toContain(".aq-proof-window");
    expect(css).toContain(".aq-trust-seal");
    expect(css).toContain(".aq-filter-chamber::before");
    expect(css).toContain(".aq-evidence-anchor:focus-visible");
  });

  it("provides a no-animation reduced-motion equivalent", () => {
    const reducedMotion = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reducedMotion).toContain("animation: none !important");
    expect(reducedMotion).toContain(".aq-waterline-hero::after");
    expect(reducedMotion).toContain("opacity: 1");
  });

  it("does not introduce forbidden heavy animation technology", () => {
    expect(css).not.toMatch(/three\.js|webgl|gsap/i);
  });
});
