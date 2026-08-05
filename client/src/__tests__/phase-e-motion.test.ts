/**
 * Phase E governance test — motion compliance for the three files remediated in
 * this pass.
 *
 * Encodes AQUAVO identity 06_Visual_DNA §17/§18: no spring physics, no bounce or
 * overshoot, no particle effects, no continuous decorative loops. Guardrails
 * only — no snapshots, no class-ordering or formatting assertions.
 *
 * NOTE: `pages/beginner-guide.tsx` is deliberately NOT covered. Its motion is
 * gamified reward mechanics whose removal is a pending product decision.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CLIENT_SRC = path.resolve(import.meta.dirname, "..");

/**
 * Ban usage, not discussion. These files carry comments that explain what the
 * prohibited values were, so matching raw source produces false positives.
 * Same helper shape as phase-c-compliance.test.ts.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const FILES = [
  "pages/links.tsx",
  "pages/temperature-guide.tsx",
  "components/notifications/winner-notification-banner.tsx",
];

const sources = new Map(
  FILES.map((rel) => [
    rel,
    stripComments(readFileSync(path.join(CLIENT_SRC, ...rel.split("/")), "utf8")),
  ]),
);

describe("Phase E motion compliance", () => {
  for (const rel of FILES) {
    describe(rel, () => {
      const source = () => sources.get(rel)!;

      it("declares no spring transition type", () => {
        expect(source()).not.toMatch(/type\s*:\s*["']spring["']/);
      });

      it("does not use the useSpring hook", () => {
        expect(source()).not.toMatch(/\buseSpring\b/);
      });

      it("declares no spring physics parameters", () => {
        expect(source()).not.toMatch(/\bstiffness\b/);
        expect(source()).not.toMatch(/\bdamping\b/);
      });

      it("uses no bounce animation utility", () => {
        expect(source()).not.toMatch(/animate-bounce/);
      });

      it("runs no infinitely repeating motion", () => {
        expect(source()).not.toMatch(/repeat\s*:\s*Infinity/);
        expect(source()).not.toMatch(/\binfinite\b/);
      });
    });
  }

  it("keeps the stripComments helper honest", () => {
    expect(stripComments('a // type: "spring"\nb')).not.toMatch(/spring/);
    expect(stripComments('x = { type: "spring" }')).toMatch(/spring/);
  });
});
