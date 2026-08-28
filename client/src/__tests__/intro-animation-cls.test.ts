import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Comments are stripped so the assertions below test declarations, not prose
// that happens to name a layout property while explaining why it was removed.
const css = readFileSync(resolve(process.cwd(), "client/src/styles/experience-polish.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * The first-visit intro must animate on the compositor, not on layout.
 *
 * `.aqv-first-dive__line` animated `inset-inline` from 50% to 8% to 0. That is
 * a layout property, so every frame moved a rendered element and Chrome scored
 * each step as a layout shift. Measured on production over five cold-cache
 * mobile runs, this was the dominant CLS contributor: shifts of 0.009, 0.0045,
 * 0.0036 and 0.002 at 4.0-4.9s, every one of them attributed to
 * `span.aqv-first-dive__line`, against a total CLS of ~0.012.
 *
 * The intro is localStorage-gated to a visitor's first-ever visit, so it fires
 * for exactly the first-time cohort that Lighthouse and CrUX measure.
 *
 * transform and opacity do not trigger layout and are exempt from layout-shift
 * scoring, so the animation is expressed with those instead. This test reads
 * the real stylesheet and fails if a layout property comes back.
 */

function keyframesBody(name: string): string {
  const start = css.indexOf(`@keyframes ${name}`);
  if (start === -1) return "";
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open, i + 1);
    }
  }
  return "";
}

function ruleBody(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("}", start) + 1);
}

// Properties that move an element by changing layout rather than compositing.
const LAYOUT_PROPERTIES = [
  "inset-inline",
  "inset-block",
  "inset:",
  "left:",
  "right:",
  "top:",
  "bottom:",
  "width:",
  "height:",
  "margin",
];

describe("first-visit intro animates without causing layout shift", () => {
  it("still ships the intro", () => {
    expect(keyframesBody("aqv-first-dive-line")).not.toBe("");
    expect(ruleBody(".aqv-first-dive__line")).not.toBe("");
  });

  it("does not animate layout properties in the line keyframes", () => {
    const body = keyframesBody("aqv-first-dive-line");
    for (const property of LAYOUT_PROPERTIES) {
      expect(body, `aqv-first-dive-line must not animate ${property}`).not.toContain(property);
    }
  });

  it("drives the line with transform", () => {
    expect(keyframesBody("aqv-first-dive-line")).toContain("transform:");
  });

  it("keeps the mark animation on transform too", () => {
    const body = keyframesBody("aqv-first-dive-mark");
    expect(body).toContain("transform:");
    for (const property of LAYOUT_PROPERTIES) {
      expect(body, `aqv-first-dive-mark must not animate ${property}`).not.toContain(property);
    }
  });

  it("gives the line a stable box so only the transform moves", () => {
    // The element must already span its final width, otherwise scaling it would
    // still need a layout-affecting starting size.
    const rule = ruleBody(".aqv-first-dive__line");
    expect(rule).toContain("inset-inline: 0");
    expect(rule).toContain("transform-origin");
  });
});
