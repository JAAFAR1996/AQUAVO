/**
 * Tank-size compatibility, derived ONLY from what the catalogue actually states.
 *
 * WHY THIS EXISTS. "شنو الفلتر/الهيتر المناسب لحوضي؟" is the single most common question AQUAVO's
 * customers ask — 38 of 201 chat messages (19%) are sizing questions, more than any other theme, and they
 * are phrased in litres. The site already asks for litres in the journey wizard and then answered with
 * GENERIC aquarium rules ("1 واط لكل لتر"), never naming a product AQUAVO sells.
 *
 * That generic rule is not harmless. For an 80 litre tank it prescribes 80W. AQUAVO's own catalogue says
 * its 100W heater covers 50–100 litres. The rule and the specification disagree, and the specification is
 * the authority — it is the manufacturer's rating for the exact SKU on the shelf.
 *
 * THE CONTRACT. Every recommendation traces to a specification string stored on the product or its
 * variant. Nothing here estimates, interpolates, or falls back to a rule of thumb. A SKU with no stated
 * range is NOT assumed to fit — it is reported as having no evidence, which is a different and honest
 * answer. UNKNOWN stays UNKNOWN.
 */

export type CompatibilityConfidence = "VERIFIED" | "PARTIAL" | "NONE";

export interface TankRange {
  /** Lower bound in litres. null = the statement sets no lower bound ("حتى 100 لتر"). */
  minL: number | null;
  /** Upper bound in litres. null = the statement sets no upper bound ("50 - 300+ لتر"). */
  maxL: number | null;
}

export interface CompatibilityRecord {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  range: TankRange | null;
  confidence: CompatibilityConfidence;
  /** The exact spec text this was read from, so any recommendation can be audited back to the catalogue. */
  evidence: string | null;
  /** Which specification key supplied it. */
  evidenceKey: string | null;
}

/** Specification keys that state a tank size, in priority order. */
const TANK_SIZE_KEYS = [
  "حجم الحوض المناسب",
  "مناسب لأحواض",
  "مناسب لـ",
  "مناسبة لـ",
  "مناسب",
  "التوافق",
];

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/** Arabic-Indic digits appear in some catalogue copy; normalise before any numeric parsing. */
function normaliseDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)));
}

/**
 * Read every "N–M litres" style range out of one specification string.
 *
 * Dash characters vary across the catalogue (ASCII hyphen and en dash both occur in real rows), and so
 * does the phrasing, so all of these are recognised:
 *   "أحواض 20-50 لتر"      -> 20..50
 *   "60–100 لتر تقريباً"    -> 60..100
 *   "حتى 100 لتر"           -> null..100     (no lower bound stated)
 *   "أحواض حتى 150 لتر"     -> null..150
 *   "50 - 300+ لتر"         -> 50..null      ("+" removes the upper bound)
 */
function extractRanges(raw: string): TankRange[] {
  const s = normaliseDigits(raw);
  const ranges: TankRange[] = [];

  // "N - M لتر" / "N–M لتر", optionally with a trailing "+" on the upper bound.
  const pairRe = /(\d{1,4})\s*[-–—]\s*(\d{1,4})\s*(\+)?\s*لتر/g;
  for (const m of s.matchAll(pairRe)) {
    ranges.push({ minL: Number(m[1]), maxL: m[3] ? null : Number(m[2]) });
  }

  if (ranges.length === 0) {
    // "حتى N لتر" — an upper bound with no lower bound stated.
    const upTo = s.match(/حتى\s*(\d{1,4})\s*لتر/);
    if (upTo) ranges.push({ minL: null, maxL: Number(upTo[1]) });
  }

  if (ranges.length === 0) {
    // "N+ لتر" — a lower bound with no upper bound stated.
    const from = s.match(/(\d{1,4})\s*\+\s*لتر/);
    if (from) ranges.push({ minL: Number(from[1]), maxL: null });
  }

  return ranges.filter((r) => (r.minL === null || r.minL > 0) && (r.maxL === null || r.maxL > 0));
}

/**
 * Classify one specification bag.
 *
 * A string carrying MORE THAN ONE range is deliberately downgraded to PARTIAL rather than guessed at.
 * The armoured heater is exactly this case: its product-level text lists all three wattages at once
 * ("50 واط: نحو 20–50 لتر، 100 واط: نحو 60–100 لتر، …"). Picking one of them at the product level would
 * be inventing a decision the catalogue did not make — the per-variant specifications state it precisely,
 * and those are read separately.
 */
export function classifySpecs(specs: unknown): { range: TankRange | null; confidence: CompatibilityConfidence; evidence: string | null; evidenceKey: string | null } {
  if (!specs || typeof specs !== "object") return { range: null, confidence: "NONE", evidence: null, evidenceKey: null };
  const bag = specs as Record<string, unknown>;

  for (const key of TANK_SIZE_KEYS) {
    const value = bag[key];
    if (typeof value !== "string" || !value.trim()) continue;
    const ranges = extractRanges(value);
    if (ranges.length === 1) return { range: ranges[0], confidence: "VERIFIED", evidence: value, evidenceKey: key };
    if (ranges.length > 1) return { range: null, confidence: "PARTIAL", evidence: value, evidenceKey: key };
    // Text is present but states no litres — e.g. "جميع أحجام الأحواض", "أحواض التفريخ".
    return { range: null, confidence: "PARTIAL", evidence: value, evidenceKey: key };
  }
  return { range: null, confidence: "NONE", evidence: null, evidenceKey: null };
}

/** Does a stated range cover this tank? A null bound means that side is unbounded. */
export function rangeCovers(range: TankRange, litres: number): boolean {
  if (range.minL !== null && litres < range.minL) return false;
  if (range.maxL !== null && litres > range.maxL) return false;
  return true;
}

export type FitVerdict = "FITS" | "TOO_SMALL_FOR_TANK" | "TOO_LARGE_FOR_TANK";

/** Why a rated product does not fit — stated from the product's side, which is how a shopper reads it. */
export function fitVerdict(range: TankRange, litres: number): FitVerdict {
  if (rangeCovers(range, litres)) return "FITS";
  if (range.maxL !== null && litres > range.maxL) return "TOO_SMALL_FOR_TANK";
  return "TOO_LARGE_FOR_TANK";
}

export interface CandidateInput {
  id: string;
  name: string;
  slug?: string | null;
  category?: string | null;
  price?: unknown;
  stock?: unknown;
  specifications?: unknown;
  variants?: unknown;
  hasVariants?: boolean;
}

export interface FitCandidate {
  productId: string;
  name: string;
  slug: string | null;
  category: string | null;
  price: number | null;
  variantId: string | null;
  variantLabel: string | null;
  inStock: boolean;
  range: TankRange | null;
  confidence: CompatibilityConfidence;
  verdict: FitVerdict | null;
  evidence: string | null;
  evidenceKey: string | null;
}

function toNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Expand one catalogue row into every unit a customer could actually buy — the product itself, or each
 * of its variants where variants exist.
 *
 * Variant-level evidence WINS over product-level evidence, and this is the case that makes the feature
 * worth building: the armoured heater is one product with three wattages, each with its own stated range
 * AND ITS OWN STOCK. Recommending "the armoured heater" for a 150 litre tank would be wrong if only the
 * 50W variant were left on the shelf.
 */
export function expandCandidates(product: CandidateInput): FitCandidate[] {
  const productLevel = classifySpecs(product.specifications);
  const base = {
    productId: product.id,
    name: product.name,
    slug: (product.slug as string) ?? null,
    category: (product.category as string) ?? null,
    price: toNumber(product.price),
  };

  const variants = Array.isArray(product.variants) ? (product.variants as Record<string, unknown>[]) : [];
  if (variants.length > 0) {
    return variants.map((v) => {
      const variantLevel = classifySpecs(v.specifications);
      const chosen = variantLevel.confidence === "VERIFIED" ? variantLevel : productLevel;
      return {
        ...base,
        variantId: (v.id as string) ?? null,
        variantLabel: (v.label as string) ?? null,
        inStock: (toNumber(v.stock) ?? 0) > 0,
        range: chosen.range,
        confidence: chosen.confidence,
        verdict: null,
        evidence: chosen.evidence,
        evidenceKey: chosen.evidenceKey,
      };
    });
  }

  return [{
    ...base,
    variantId: null,
    variantLabel: null,
    inStock: (toNumber(product.stock) ?? 0) > 0,
    range: productLevel.range,
    confidence: productLevel.confidence,
    verdict: null,
    evidence: productLevel.evidence,
    evidenceKey: productLevel.evidenceKey,
  }];
}

export interface CategoryFit {
  category: string;
  /** Rated, in stock, and the stated range covers this tank. */
  fits: FitCandidate[];
  /** Rated and in stock, but the stated range excludes this tank — kept so the UI can explain WHY. */
  ratedButUnsuitable: FitCandidate[];
  /** In stock, but the catalogue states no litre range. NEVER presented as a match. */
  noSizeEvidence: FitCandidate[];
}

/**
 * Group the catalogue into what can honestly be said about one tank volume.
 *
 * Out-of-stock units are dropped entirely: recommending something AQUAVO cannot ship is worse than
 * saying nothing, and stock is already the gate the rest of Growth OS reasons about.
 */
export function fitCatalogue(products: CandidateInput[], litres: number): CategoryFit[] {
  const byCategory = new Map<string, CategoryFit>();

  for (const product of products) {
    const category = (product.category as string) ?? "غير مصنّف";
    if (!byCategory.has(category)) {
      byCategory.set(category, { category, fits: [], ratedButUnsuitable: [], noSizeEvidence: [] });
    }
    const bucket = byCategory.get(category)!;

    for (const candidate of expandCandidates(product)) {
      if (!candidate.inStock) continue;
      if (candidate.confidence === "VERIFIED" && candidate.range) {
        const verdict = fitVerdict(candidate.range, litres);
        const withVerdict = { ...candidate, verdict };
        if (verdict === "FITS") bucket.fits.push(withVerdict);
        else bucket.ratedButUnsuitable.push(withVerdict);
      } else {
        bucket.noSizeEvidence.push(candidate);
      }
    }
  }

  return [...byCategory.values()];
}
