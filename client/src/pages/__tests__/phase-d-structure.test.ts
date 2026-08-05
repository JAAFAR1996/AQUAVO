/**
 * Phase D structural regression tests.
 *
 * Semantic/ordering guarantees only — no pixel snapshots, and nothing coupled to
 * class ordering. Each test encodes one Phase D acceptance rule so a later
 * refactor that preserves the rule stays green.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const PAGES = path.resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(path.join(PAGES, file), "utf8");

const HOME = read("home.tsx");
const PDP = read("product-details.tsx");

/** Ban usage, not discussion. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

/** Index of a marker, asserted present so ordering comparisons cannot silently pass. */
function at(source: string, marker: string | RegExp, label: string): number {
  const i = typeof marker === "string" ? source.indexOf(marker) : source.search(marker);
  expect(i, `marker not found: ${label}`).toBeGreaterThan(-1);
  return i;
}

// ---------------------------------------------------------------------------
// Scope A — homepage commerce priority
// ---------------------------------------------------------------------------

describe("homepage puts category and product discovery before editorial", () => {
  const hero = at(HOME, "aq-waterline-hero", "hero section");
  const categories = at(HOME, "ابدأ من احتياج الحوض", "category navigation heading");
  const products = at(HOME, "اختيارات متوفرة هسه", "product discovery heading");
  const trust = at(HOME, 'aria-label="ضمانات المتجر"', "trust strip");
  const explainer = at(HOME, "تسوق واضح من أول قسم للسلة", "brand explainer");
  const editorial = at(HOME, "المعلومة قبل القطعة", "editorial guides");

  it("orders hero -> categories -> products", () => {
    expect(hero).toBeLessThan(categories);
    expect(categories).toBeLessThan(products);
  });

  it("places the trust strip after product discovery, not before categories", () => {
    expect(products).toBeLessThan(trust);
    expect(trust).toBeGreaterThan(categories);
  });

  it("places editorial and brand-story content after product discovery", () => {
    expect(products).toBeLessThan(explainer);
    expect(products).toBeLessThan(editorial);
  });

  it("renders the trust strip exactly once", () => {
    const strips = stripComments(HOME).match(/aria-label="ضمانات المتجر"/g) ?? [];
    expect(strips).toHaveLength(1);
    // and only one array feeds it
    const arrays = stripComments(HOME).match(/const serviceFacts\s*=/g) ?? [];
    expect(arrays).toHaveLength(1);
  });

  it("keeps exactly one H1", () => {
    const h1s = stripComments(HOME).match(/<h1[\s>]/g) ?? [];
    expect(h1s).toHaveLength(1);
  });

  it("preserves product fetching, SEO metadata and RTL", () => {
    expect(HOME).toMatch(/fetchTopSellingProducts/);
    expect(HOME).toMatch(/<MetaTags/);
    expect(HOME).toMatch(/dir="rtl"/);
  });
});

// ---------------------------------------------------------------------------
// Scope B — PDP purchase hierarchy
// ---------------------------------------------------------------------------

describe("PDP orders purchase-critical content before secondary content", () => {
  const breadcrumb = at(PDP, "<Breadcrumb", "breadcrumb");
  const gallery = at(PDP, "<ProductImageGallery", "image gallery");
  const title = at(PDP, /<h1[^>]*>\s*\{product\.name\}/, "product name h1");
  const price = at(PDP, "formatPrice(displayPrice)", "price");
  const stock = at(PDP, "متوفر (", "explicit stock status");
  const quantity = at(PDP, 'id="quantity-label"', "quantity control");
  const secondary = at(PDP, "const secondarySections", "secondary sections");
  // Comment-stripped: a comment near the top of the file mentions
  // "<RecommendationsSection/>", which would otherwise be found first and make
  // the ordering comparison meaningless.
  const PDP_LIVE = stripComments(PDP);
  const recommendations = at(PDP_LIVE, "<RecommendationsSection", "recommendations");

  it("orders breadcrumb -> gallery -> name -> price", () => {
    expect(breadcrumb).toBeLessThan(gallery);
    expect(gallery).toBeLessThan(title);
    expect(title).toBeLessThan(price);
  });

  it("shows stock and quantity after price", () => {
    expect(price).toBeLessThan(stock);
    expect(stock).toBeLessThan(quantity);
  });

  it("places recommendations after the secondary detail sections", () => {
    // secondarySections is declared before the return, so compare render order
    // within the comment-stripped source.
    const renderTabs = at(PDP_LIVE, 'className="hidden md:block"', "desktop tabs wrapper");
    const renderAccordion = at(PDP_LIVE, 'className="md:hidden mb-12"', "mobile accordion wrapper");
    expect(renderTabs).toBeLessThan(recommendations);
    expect(renderAccordion).toBeLessThan(recommendations);
    // The declaration itself sits above the whole return block.
    expect(secondary).toBeLessThan(at(PDP, 'className="hidden md:block"', "desktop tabs wrapper"));
  });

  it("keeps price, stock, variants and the purchase action present", () => {
    expect(PDP).toMatch(/formatPrice\(displayPrice\)/);
    expect(PDP).toMatch(/displayStock/);
    expect(PDP).toMatch(/MultiDimensionVariantSelector/);
    expect(PDP).toMatch(/EmbeddedVariantSelector/);
    expect(PDP).toMatch(/addItem\(/);
  });

  it("preserves analytics, structured data and SEO on the PDP", () => {
    for (const call of [
      "ttqViewContent",
      "metaTrackViewContent",
      "trackViewItem",
      "phTrackViewContent",
      "phTrackWhatsAppClick",
    ]) {
      expect(PDP, `missing analytics call: ${call}`).toContain(call);
    }
    expect(PDP).toMatch(/<MetaTags/);
  });

  it("does not introduce a second purchase implementation", () => {
    // One inline add-to-cart handler plus the single pre-existing sticky mobile
    // bar. Anything more means a duplicate purchase path.
    const handlers = stripComments(PDP).match(/const handleAddToCart|addItem\(/g) ?? [];
    expect(handlers.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Scope C — mobile disclosure
// ---------------------------------------------------------------------------

describe("PDP secondary content uses accessible disclosure on mobile", () => {
  it("renders an Accordion on mobile and Tabs on desktop", () => {
    expect(PDP).toMatch(/className="md:hidden mb-12"/);
    expect(PDP).toMatch(/<Accordion type="multiple"/);
    expect(PDP).toMatch(/className="hidden md:block"/);
    expect(PDP).toMatch(/<Tabs defaultValue="benefits"/);
  });

  it("defaults every mobile section to closed", () => {
    // Radix Accordion with no defaultValue/value renders all items collapsed.
    const accordion = PDP.slice(PDP.indexOf("<Accordion type=\"multiple\""));
    const open = accordion.slice(0, accordion.indexOf(">"));
    expect(open).not.toMatch(/defaultValue|value=/);
  });

  it("uses one disclosure control per secondary section, not a nested accordion", () => {
    const triggers = PDP.match(/<AccordionTrigger/g) ?? [];
    expect(triggers).toHaveLength(1); // rendered once inside a .map over sections
    const accordions = PDP.match(/<Accordion\s/g) ?? [];
    expect(accordions).toHaveLength(1);
  });

  it("declares the secondary sections once and reuses them for both renders", () => {
    expect((PDP.match(/const secondarySections/g) ?? [])).toHaveLength(1);
    // Both renders map over the same source.
    expect((PDP.match(/secondarySections\.map/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("never hides purchase-critical controls inside a disclosure panel", () => {
    const start = PDP.indexOf("const secondarySections");
    const block = PDP.slice(start, PDP.indexOf("] as const;", start));
    for (const critical of ["displayPrice", "quantity-label", "VariantSelector", "متوفر ("]) {
      expect(block, `${critical} must not be inside a disclosure panel`).not.toContain(critical);
    }
  });

  it("keeps the disclosure trigger at a 44px minimum target", () => {
    expect(PDP).toMatch(/<AccordionTrigger[^>]*min-h-11/);
  });
});

// ---------------------------------------------------------------------------
// Scope D — recommendation consolidation
// ---------------------------------------------------------------------------

describe("PDP renders one capped related-products section", () => {
  it("renders exactly one RecommendationsSection", () => {
    const sections = stripComments(PDP).match(/<RecommendationsSection/g) ?? [];
    expect(sections).toHaveLength(1);
  });

  it("no longer renders the duplicated trending or co-purchase grids", () => {
    const live = stripComments(PDP);
    expect(live).not.toContain("الأكثر رواجاً الآن");
    expect(live).not.toContain("يتم شراؤها معاً عادةً");
  });

  it("keeps the product-specific similar-products list", () => {
    expect(PDP).toContain("منتجات مشابهة قد تعجبك");
    expect(PDP).toMatch(/type="similar"/);
  });

  it("caps initially visible cards at 4", () => {
    expect(PDP).toMatch(/const MAX_VISIBLE_RECOMMENDATIONS = 4/);
    expect(PDP).toMatch(/slice\(0, MAX_VISIBLE_RECOMMENDATIONS\)/);
  });

  it("uses a two-column mobile grid rather than a single stacked column", () => {
    const start = PDP.indexOf("function RecommendationsSection");
    const block = PDP.slice(start);
    expect(block).toMatch(/grid-cols-2 lg:grid-cols-4/);
    expect(block).not.toMatch(/grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/);
  });

  it("offers a route to further browsing instead of more cards", () => {
    const start = PDP.indexOf("function RecommendationsSection");
    expect(PDP.slice(start)).toMatch(/href="\/products"/);
  });

  it("does not fabricate fallback products or change the recommendation API", () => {
    expect(PDP).toMatch(/fetchSimilarProducts\(productId\)/);
    const start = PDP.indexOf("function RecommendationsSection");
    const block = PDP.slice(start);
    expect(block).toMatch(/if \(!products \|\| products\.length === 0\) return null/);
  });

  it("preserves ProductCard so card-level analytics stay attached", () => {
    const start = PDP.indexOf("function RecommendationsSection");
    expect(PDP.slice(start)).toMatch(/<ProductCard product=\{product\}/);
  });
});

// ---------------------------------------------------------------------------
// Scope E — page-level visual compliance in the touched files
// ---------------------------------------------------------------------------

describe("touched page files stay identity-compliant", () => {
  const touched: [string, string][] = [
    ["home.tsx", HOME],
    ["product-details.tsx", PDP],
  ];

  it("introduces no green or emerald utilities", () => {
    for (const [name, src] of touched) {
      expect(stripComments(src), `${name} uses a green/emerald utility`).not.toMatch(
        /\b(?:bg|text|border|ring|from|to|via)-(?:green|emerald)-\d{2,3}\b/,
      );
    }
  });

  it("introduces no spring, bounce or overshoot motion", () => {
    for (const [name, src] of touched) {
      const live = stripComments(src);
      expect(live, `${name} uses spring physics`).not.toMatch(/type:\s*["']spring["']|stiffness|damping/);
      expect(live, `${name} uses animate-bounce`).not.toMatch(/animate-bounce/);
      expect(live, `${name} uses overshoot easing`).not.toMatch(
        /cubic-bezier\(\s*[-\d.]+\s*,\s*(?:1\.\d+|[2-9])/,
      );
    }
  });

  it("keeps the shared claim wording (no divergent trust text reintroduced)", () => {
    const divergent = [
      /title:\s*["']توصيل خلال 24 ساعة["']/,
      /title:\s*["']توصيل لكل العراق["']/,
      /title:\s*["']نفحص ونعبّي الطلب["']/,
      /title:\s*["']دعم 24\/7["']/,
    ];
    for (const [name, src] of touched) {
      for (const pattern of divergent) {
        expect(stripComments(src), `${name} reintroduced ${pattern}`).not.toMatch(pattern);
      }
    }
    expect(HOME).toMatch(/TRUST_STRIP_CLAIMS/);
    expect(PDP).toMatch(/BRAND_CLAIMS/);
  });
});
