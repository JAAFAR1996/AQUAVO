/**
 * AQUAVO v2 identity-token governance tests.
 *
 * These are guardrails, not snapshots. Each one encodes a rule from the
 * approved identity archive (AQUAVO_Final_Master_Identity_System_v2.zip) or an
 * owner decision recorded in CLAUDE.md, and fails only when that specific rule
 * is broken. No broad snapshots, no formatting assertions — a refactor that
 * keeps the rules should keep these green.
 *
 * Rules covered:
 *   1. Archived colours must not appear in active client source.
 *   2. The global --primary must never resolve to the FlowLine blue #0B64A6.
 *   3. Outfit must not be reintroduced.
 *   4. Identity CSS must load in the mandated order: colour -> typography -> Visual DNA.
 *   5. No --aqv-success token, and no Tailwind green / emerald utilities in the token layer.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const CLIENT_SRC = path.resolve(import.meta.dirname, "..");
const IDENTITY_DIR = path.join(CLIENT_SRC, "styles", "identity");
const INDEX_CSS = path.join(CLIENT_SRC, "index.css");

const COLOR_TOKENS = "styles/identity/aquavo-color-tokens-v2.css";
const TYPOGRAPHY_TOKENS = "styles/identity/aquavo-typography-tokens-v2.css";
const VISUAL_DNA_TOKENS = "styles/identity/aquavo-visual-dna-v2.css";

/**
 * Colours from the unapproved parallel system that the v2 colour token file
 * names as "ARCHIVED, NOT ADOPTED ... do not merge into production", plus the
 * two archived dark backgrounds (neither is the approved #0B1E28).
 */
const ARCHIVED_COLORS = ["#199BB8", "#FF7B5A", "#FFD700", "#0A1628", "#010611"];

/**
 * Narrow, documented allowlist. Anything added here needs a reason in this
 * comment block — an unexplained entry defeats the purpose of the test.
 *
 * - `__tests__/**`
 *     Test fixtures deliberately contain the rejected strings in order to
 *     assert their absence elsewhere. Excluded per owner instruction.
 * - `pages/temperature-guide.tsx`
 *     Holds 16 fish-species identification colours describing the actual
 *     colouration of real species (Neon Tetra cyan, Betta red, Angelfish
 *     gold #ffd700). This is content data, not brand chrome: an Angelfish is
 *     gold regardless of the AQUAVO palette. Failing here would push a future
 *     developer to falsify species data to satisfy a brand rule.
 */
const ALLOWLIST = [
  (rel: string) => rel.includes("__tests__"),
  (rel: string) => rel.replace(/\\/g, "/") === "pages/temperature-guide.tsx",
];

const SCANNED_EXTENSIONS = [".css", ".ts", ".tsx"];

/**
 * Remove comments before scanning.
 *
 * These tests ban *usage* of a rejected value, not discussion of it. The v2
 * token files carry conflict-resolution headers that name #199BB8 and the
 * coral/amber palette precisely in order to prohibit them, and the colour file
 * documents `--aqv-success` as NOT YET DEFINED. Preserving those comments is a
 * requirement, so a scanner that flagged them would force us to delete the very
 * text that prevents the mistake. Stripping comments keeps the guard honest:
 * write the value in a real declaration and the test fails; explain why it is
 * banned and it does not.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ") // /* block */ — CSS and JS
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 "); // // line — avoids matching https://
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walk(full, acc);
    } else if (SCANNED_EXTENSIONS.includes(path.extname(entry))) {
      acc.push(full);
    }
  }
  return acc;
}

function activeSourceFiles(): { rel: string; content: string }[] {
  return walk(CLIENT_SRC)
    .map((full) => ({ rel: path.relative(CLIENT_SRC, full), full }))
    .filter(({ rel }) => !ALLOWLIST.some((isAllowed) => isAllowed(rel)))
    .map(({ rel, full }) => ({ rel, content: stripComments(readFileSync(full, "utf8")) }));
}

describe("archived colours are not present in active client source", () => {
  const files = activeSourceFiles();

  it("scans a non-trivial number of files (guards against a broken walk)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const color of ARCHIVED_COLORS) {
    it(`does not use ${color}`, () => {
      const needle = color.toLowerCase();
      // `content` is already comment-stripped, so prohibition text in the
      // identity headers does not register — only real usage does.
      const offenders = files
        .filter(({ content }) => content.toLowerCase().includes(needle))
        .map(({ rel }) => rel);

      expect(offenders, `${color} found in: ${offenders.join(", ")}`).toEqual([]);
    });
  }
});

describe("global primary is the approved teal, never the FlowLine blue", () => {
  const indexCss = readFileSync(INDEX_CSS, "utf8");
  const colorTokens = readFileSync(path.join(IDENTITY_DIR, "aquavo-color-tokens-v2.css"), "utf8");

  it("declares --aqv-primary as #0B93A6", () => {
    expect(colorTokens).toMatch(/--aqv-primary:\s*#0B93A6/i);
  });

  it("declares the FlowLine family colour as #0B64A6", () => {
    expect(colorTokens).toMatch(/--aqv-flowline:\s*#0B64A6/i);
  });

  it("never assigns the FlowLine blue to --primary or --ring in any theme", () => {
    // #0B64A6 == hsl(205.55 87.57% 34.71%). Catch both the hex and the HSL
    // forms, and the previously-shipped rounded triplet `205 88% 35%`.
    const flowlineForms = [
      /--primary:\s*[^;]*#0B64A6/i,
      /--ring:\s*[^;]*#0B64A6/i,
      /--primary:\s*205[.\d]*\s+8[78][.\d]*%/i,
      /--ring:\s*205[.\d]*\s+8[78][.\d]*%/i,
      /--primary:\s*var\(--aqv-flowline/i,
      /--ring:\s*var\(--aqv-flowline/i,
    ];
    for (const pattern of flowlineForms) {
      expect(indexCss, `index.css matched forbidden pattern ${pattern}`).not.toMatch(pattern);
    }
  });

  it("no stylesheet anywhere restates --primary or --ring as a literal", () => {
    // Regression guard for a real bug: styles/aquavo-ui-fixes.css declared
    // `--primary: 187 88% 35%`. Rounded to whole numbers that renders #0B95A8,
    // not #0B93A6 — and because it loads after index.css it silently won.
    // Any --primary/--ring assignment in any stylesheet must be a var() to the
    // identity token, never a literal colour of any form.
    //
    // Scoped to the AQUAVO brand themes. `styles/themes/*.css` are opt-in
    // novelty themes (monochrome / neon-ocean / pastel) selected via
    // [data-theme=...]; they intentionally declare their own palettes and are
    // not AQUAVO-brand surfaces. Whether they should exist at all is a real
    // identity question — v2 defines exactly two modes (Clean Proof and Dark
    // Authority) and three approved backgrounds — but retiring a user-facing
    // feature is out of scope for a token phase. Tracked as a deferred item.
    const offenders: string[] = [];
    for (const { rel, content } of activeSourceFiles()) {
      if (path.extname(rel) !== ".css") continue;
      if (rel.replace(/\\/g, "/").startsWith("styles/themes/")) continue;
      for (const decl of content.match(/--(?:primary|ring):\s*[^;]+;/g) ?? []) {
        if (!decl.includes("var(--aqv-")) offenders.push(`${rel}: ${decl.trim()}`);
      }
    }
    expect(offenders, `literal primary/ring declarations:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("assigns --primary from the approved primary token in every theme block", () => {
    // `String.match` with /g rather than `matchAll` — the repo's tsconfig
    // target does not enable downlevelIteration for spreading an iterator.
    const assignments = (indexCss.match(/--primary:\s*[^;]+;/g) ?? []).map((decl) =>
      decl.replace(/^--primary:\s*/, "").replace(/;$/, "").trim(),
    );
    expect(assignments.length).toBeGreaterThanOrEqual(3); // :root, .dark, html.light
    for (const value of assignments) {
      expect(value).toContain("var(--aqv-primary-hsl)");
    }
  });
});

describe("Outfit is not reintroduced", () => {
  it("does not appear in any active client source file", () => {
    const offenders = activeSourceFiles()
      .filter(({ content }) => /Outfit/i.test(content))
      .map(({ rel }) => rel);
    expect(offenders, `Outfit found in: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("identity CSS load order is colour -> typography -> Visual DNA", () => {
  const indexCss = readFileSync(INDEX_CSS, "utf8");

  it("imports all three identity token files", () => {
    for (const file of [COLOR_TOKENS, TYPOGRAPHY_TOKENS, VISUAL_DNA_TOKENS]) {
      expect(indexCss).toContain(file);
    }
  });

  it("imports them in the mandated order", () => {
    const colorAt = indexCss.indexOf(COLOR_TOKENS);
    const typographyAt = indexCss.indexOf(TYPOGRAPHY_TOKENS);
    const visualDnaAt = indexCss.indexOf(VISUAL_DNA_TOKENS);
    expect(colorAt).toBeGreaterThan(-1);
    expect(typographyAt).toBeGreaterThan(colorAt);
    expect(visualDnaAt).toBeGreaterThan(typographyAt);
  });

  it("declares the identity imports before any application variable mapping", () => {
    const visualDnaAt = indexCss.indexOf(VISUAL_DNA_TOKENS);
    const firstMapping = indexCss.indexOf("--background:");
    expect(firstMapping).toBeGreaterThan(visualDnaAt);
  });
});

describe("no unapproved success colour exists", () => {
  it("does not define --aqv-success anywhere", () => {
    const offenders = activeSourceFiles()
      .filter(({ content }) => /--aqv-success\s*:/.test(content))
      .map(({ rel }) => rel);
    expect(offenders, `--aqv-success defined in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("keeps the token layer free of Tailwind green-* / emerald-* classes", () => {
    // Scoped to the identity token layer and index.css. Component-level
    // migration of existing green usage is a later phase, tracked in the
    // identity compliance audit — this guard stops the token layer regressing.
    const tokenLayer = [
      INDEX_CSS,
      path.join(IDENTITY_DIR, "aquavo-color-tokens-v2.css"),
      path.join(IDENTITY_DIR, "aquavo-typography-tokens-v2.css"),
      path.join(IDENTITY_DIR, "aquavo-visual-dna-v2.css"),
    ];
    for (const file of tokenLayer) {
      const content = readFileSync(file, "utf8");
      expect(content, `${path.basename(file)} uses a green/emerald utility`).not.toMatch(
        /\b(?:bg|text|border|ring|from|to|via)-(?:green|emerald)-\d{2,3}\b/,
      );
    }
  });
});

describe("canonical radius and the approved Proof Window shadow", () => {
  const indexCss = readFileSync(INDEX_CSS, "utf8");

  it("sets the shared radius to 8px", () => {
    expect(indexCss).toMatch(/--radius:\s*0\.5rem/);
  });

  it("declares the approved Proof Window elevation token", () => {
    expect(indexCss).toMatch(/--aqv-shadow-proof-window:\s*0 16px 44px rgba\(10, 22, 40, 0\.10\)/);
  });
});
