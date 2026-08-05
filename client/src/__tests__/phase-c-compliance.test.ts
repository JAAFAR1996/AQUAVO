/**
 * Phase C governance tests — shared components, claims, and motion compliance.
 *
 * Guardrails only. Each assertion encodes one rule from the approved identity
 * (AQUAVO_Final_Master_Identity_System_v2.zip) or an owner decision recorded in
 * CLAUDE.md, and fails only when that rule is broken. No snapshots, no
 * formatting assertions.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const CLIENT_SRC = path.resolve(import.meta.dirname, "..");
const PUBLIC_BRAND = path.resolve(CLIENT_SRC, "..", "public", "brand");
const read = (...segments: string[]) => readFileSync(path.join(CLIENT_SRC, ...segments), "utf8");

/** Ban usage, not discussion — see identity-tokens.test.ts for the rationale. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * Customer-facing shared storefront code. Admin-only surfaces are excluded:
 * the identity governs the storefront, and per the Phase C brief admin motion is
 * only in scope if it reaches the storefront bundle. `lib/motion/caustics.ts` is
 * excluded because it is now unreferenced dead code awaiting deletion.
 */
const STOREFRONT_EXCLUDE = [
  "components/admin/",
  "pages/admin/",
  "__tests__/",
  "lib/motion/caustics.ts",
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walk(full, acc);
    } else if ([".ts", ".tsx", ".css"].includes(path.extname(entry))) {
      acc.push(full);
    }
  }
  return acc;
}

function storefrontFiles(): { rel: string; content: string }[] {
  return walk(CLIENT_SRC)
    .map((full) => ({ rel: path.relative(CLIENT_SRC, full).replace(/\\/g, "/"), full }))
    .filter(({ rel }) => !STOREFRONT_EXCLUDE.some((skip) => rel.startsWith(skip) || rel === skip))
    .map(({ rel, full }) => ({ rel, content: stripComments(readFileSync(full, "utf8")) }));
}

// ---------------------------------------------------------------------------
// Scope A — public brand guidance
// ---------------------------------------------------------------------------

describe("public brand guidance teaches the approved v2 system", () => {
  const guidelines = readFileSync(path.join(PUBLIC_BRAND, "AQUAVO_BRAND_GUIDELINES.md"), "utf8");
  const readme = readFileSync(path.join(PUBLIC_BRAND, "README.md"), "utf8");

  it("keeps both public filenames (links must not break)", () => {
    expect(guidelines.length).toBeGreaterThan(0);
    expect(readme.length).toBeGreaterThan(0);
  });

  it("states the approved primary, backgrounds, accessible teal and radius", () => {
    for (const value of ["#0B93A6", "#075F6B", "#F6F4EF", "#0B1E28", "8px"]) {
      expect(guidelines, `guidelines missing ${value}`).toContain(value);
    }
  });

  it("never presents an archived colour as usable", () => {
    // The archived hexes may appear only inside a prohibition statement. Assert
    // that each is accompanied by prohibition language somewhere in the doc, and
    // that no markdown table row assigns one a role.
    expect(guidelines).toMatch(/Prohibited|archived|never adopted/i);
    const roleRow = /\|\s*\*{0,2}(?:AQUAVO Cyan|Coral[^|]*|Amber Gold|Deep Ocean|Abyss)\*{0,2}\s*\|/i;
    expect(guidelines, "an archived colour still has a role table row").not.toMatch(roleRow);
    expect(guidelines).not.toMatch(/#199bb8`?\s*\|/i);
  });

  it("scopes FlowLine and points at the real sources of truth", () => {
    expect(guidelines).toMatch(/FlowLine/);
    expect(guidelines).toMatch(/#0B64A6/);
    expect(guidelines).toMatch(/CLAUDE\.md/);
    expect(guidelines).toMatch(/Master Identity System v2/);
  });

  it("names the three approved faces with their roles", () => {
    for (const face of ["Cairo", "Changa", "Inter"]) {
      expect(guidelines).toContain(face);
    }
    expect(guidelines).toMatch(/1\.8/); // Arabic body line-height
  });

  it("does not teach an invented success colour", () => {
    // #22c55e may appear only inside the prohibition narrative, never as a token
    // with a role assigned to it.
    expect(guidelines).toMatch(/no approved success colour|no success colour|never be invented/i);
    expect(guidelines, "#22c55e is presented with a role").not.toMatch(
      /(?:Success|نجاح)[^|\n]*\|[^|\n]*#22c55e/i,
    );
    expect(guidelines).not.toMatch(/--aqv-success\s*:/);
  });
});

// ---------------------------------------------------------------------------
// Scope B — theme control
// ---------------------------------------------------------------------------

describe("only Clean Proof and Dark Authority are selectable", () => {
  const switcher = read("components", "ui", "theme-switcher.tsx");
  const types = read("types", "index.ts");

  it("keeps ThemeOption limited to light / dark / system", () => {
    expect(types).toMatch(/ThemeOption\s*=\s*'light'\s*\|\s*'dark'\s*\|\s*'system'/);
  });

  it("offers no unsupported theme in the switcher UI", () => {
    for (const legacy of ["monochrome", "neon-ocean", "pastel"]) {
      expect(stripComments(switcher), `switcher offers ${legacy}`).not.toContain(legacy);
    }
  });

  it("migrates an unsupported saved theme instead of casting it blindly", () => {
    expect(switcher).toMatch(/readStoredTheme/);
    expect(switcher).toMatch(/isSupportedTheme/);
    // A blind `as ThemeOption` cast of localStorage is what allowed a stale
    // value to survive; it must not come back.
    expect(stripComments(switcher)).not.toMatch(
      /localStorage\.getItem\("theme"\)\s*as\s*ThemeOption/,
    );
  });

  it("does not import the retired theme stylesheets into the app", () => {
    const offenders = storefrontFiles()
      .filter(({ rel }) => !rel.startsWith("styles/themes/"))
      .filter(({ content }) => /styles\/themes\//.test(content))
      .map(({ rel }) => rel);
    expect(offenders, `retired theme CSS imported by: ${offenders.join(", ")}`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Scope C — shared trust claims
// ---------------------------------------------------------------------------

describe("approved claims come from one shared source", () => {
  const claims = read("lib", "brand-claims.ts");
  const footer = read("components", "footer.tsx");
  const home = read("pages", "home.tsx");
  const pdp = read("pages", "product-details.tsx");

  const APPROVED = [
    "التوصيل خلال 24 ساعة إلى جميع المحافظات العراقية",
    "الدعم متوفر 24/7",
    "الرد خلال 24 ساعة إذا وصل المنتج تالف",
    "الدفع عند الاستلام",
    "مختار ومفحوص ومعبأ بواسطة AQUAVO",
  ];

  it("declares every approved claim verbatim, in one file", () => {
    for (const claim of APPROVED) {
      expect(claims, `brand-claims.ts missing: ${claim}`).toContain(claim);
    }
  });

  it("publishes the approved official email", () => {
    expect(claims).toContain("INFO@AQUAVOIQ.COM");
    // Comment-stripped: brand-claims.ts documents *why* the aquavo.com value in
    // the v2 legal guide was superseded, and that explanation must survive.
    expect(stripComments(claims)).not.toMatch(/["'`]?info@aquavo\.com/i);
  });

  it("wires footer, homepage and product detail to the shared source", () => {
    for (const [name, source] of [["footer", footer], ["home", home], ["pdp", pdp]] as const) {
      expect(source, `${name} does not import brand-claims`).toMatch(/@\/lib\/brand-claims/);
    }
  });

  it("does not re-declare divergent claim wording at the call sites", () => {
    // The old bug: three arrays, three phrasings of the same four promises.
    // Scoped to claim POSITION (`title:` / `detail:` in a trust array), not to
    // any appearance of a phrase. home.tsx legitimately mentions delivery in its
    // SEO meta description, which is prose about the shop, not a trust badge.
    const divergentClaimLiterals = [
      /title:\s*["']توصيل خلال 24 ساعة["']/,
      /title:\s*["']توصيل لكل العراق["']/,
      /title:\s*["']نفحص ونعبّي الطلب["']/,
      /title:\s*["']دعم 24\/7["']/,
      /title:\s*["']الدعم متوفر 24\/7["']/,
    ];
    for (const [name, source] of [["footer", footer], ["home", home]] as const) {
      for (const pattern of divergentClaimLiterals) {
        expect(stripComments(source), `${name} still declares a claim literal ${pattern}`)
          .not.toMatch(pattern);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Scope D — product card
// ---------------------------------------------------------------------------

describe("product card communicates stock without relying on colour", () => {
  const card = read("components", "products", "product-card.tsx");

  it("renders an explicit stock label", () => {
    expect(card).toMatch(/stockLabel/);
    expect(card).toContain("نفدت الكمية");
    expect(card).toContain("متوفر");
    expect(card).toMatch(/آخر \$\{availableUnits\} قطع/);
  });

  it("disables the purchase action when out of stock", () => {
    expect(card).toMatch(/disabled=\{!hasPrice \|\| isOutOfStock\}/);
  });

  it("uses the approved warning token for low stock and no green/emerald", () => {
    expect(card).toMatch(/--aqv-warning/);
    expect(stripComments(card)).not.toMatch(/\b(?:bg|text|border|ring)-(?:green|emerald)-\d{2,3}\b/);
  });

  it("uses the shared 8px radius token rather than a larger literal", () => {
    expect(card).toMatch(/rounded-lg/);
    expect(stripComments(card)).not.toMatch(/rounded-2xl|rounded-3xl/);
  });

  it("does not keep three permanent overlay controls over the image", () => {
    // Compare + quick-view are hover/focus revealed on sm+, and remain visible
    // on touch (no hover). Wishlist stays permanent.
    expect(card).toMatch(/sm:opacity-0/);
    expect(card).toMatch(/sm:group-hover:opacity-100/);
    expect(card).toMatch(/sm:group-focus-within:opacity-100/);
  });

  it("keeps 44px touch targets on every card control", () => {
    const sizedControls = card.match(/h-11 w-11/g) ?? [];
    expect(sizedControls.length).toBeGreaterThanOrEqual(2);
    expect(card).toMatch(/min-h-11/); // primary action
  });
});

// ---------------------------------------------------------------------------
// Scope E — motion compliance
// ---------------------------------------------------------------------------

describe("prohibited motion is absent from shared storefront code", () => {
  const files = storefrontFiles();

  it("scans a non-trivial number of files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("declares no spring physics in shared motion helpers or shared components", () => {
    const SHARED = [
      "lib/motion.ts",
      "components/products/product-card.tsx",
      "components/products/product-comparison.tsx",
      "components/products/bundle-recommendation.tsx",
      "components/products/product-filters.tsx",
      "components/footer.tsx",
      "components/chat/ai-chat-bot.tsx",
      "components/chat/live-chat-widget.tsx",
      "components/motion/displacement-runtime.tsx",
    ];
    const offenders = files
      .filter(({ rel }) => SHARED.includes(rel))
      .filter(({ content }) => /type:\s*["']spring["']|stiffness|damping/.test(content))
      .map(({ rel }) => rel);
    expect(offenders, `spring physics in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("uses no animate-bounce in storefront components", () => {
    const offenders = files
      .filter(({ rel }) => rel.startsWith("components/") || rel.startsWith("pages/"))
      .filter(({ content }) => /animate-bounce/.test(content))
      .map(({ rel }) => rel);
    expect(offenders, `animate-bounce in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("declares no overshoot easing in shared stylesheets", () => {
    // Any cubic-bezier whose y control point exceeds 1 is bounce expressed as
    // easing, which 06_Visual_DNA §17 prohibits.
    const overshoot = /cubic-bezier\(\s*[-\d.]+\s*,\s*(?:1\.\d+|[2-9])[^)]*\)/;
    const offenders = files
      .filter(({ rel }) => rel.endsWith(".css"))
      .filter(({ content }) => overshoot.test(content))
      .map(({ rel }) => rel);
    expect(offenders, `overshoot easing in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("does not mount decorative caustic water motion in the storefront", () => {
    const offenders = files
      .filter(({ content }) => /mountCaustics/.test(content))
      .map(({ rel }) => rel);
    expect(offenders, `caustics mounted by: ${offenders.join(", ")}`).toEqual([]);
  });

  it("keeps the deprecated spring helper names exported so imports do not break", () => {
    const motion = read("lib", "motion.ts");
    expect(motion).toMatch(/export const springSnappy/);
    expect(motion).toMatch(/export const springSoft/);
    expect(motion).toMatch(/export const tweenQuick/);
    expect(motion).toMatch(/export const tweenSettle/);
  });
});
