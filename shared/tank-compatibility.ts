/**
 * Tank-size compatibility, derived ONLY from what the catalogue actually states.
 *
 * Every candidate traces to a specification string stored on the product or its
 * variant. Nothing here estimates, interpolates, or falls back to a rule of thumb. A SKU with no stated
 * range is NOT assumed to fit — it is reported as having no evidence, which is a different and honest
 * answer. UNKNOWN stays UNKNOWN. VERIFIED describes a readable catalogue range, not independent
 * verification of a manufacturer claim or approval of the customer's complete setup.
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
  // exec-loop rather than matchAll: this file is compiled under a target that does not permit
  // iterating a RegExpStringIterator.
  const pairRe = /(\d{1,4})\s*[-–—]\s*(\d{1,4})\s*(\+)?\s*لتر/g;
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(s)) !== null) {
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

  return ranges.filter((r) =>
    (r.minL === null || r.minL > 0) &&
    (r.maxL === null || r.maxL > 0) &&
    (r.minL === null || r.maxL === null || r.minL <= r.maxL));
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
    // A lower bound with "+" does not establish capacity for every larger tank.
    if (ranges.length === 1 && ranges[0].maxL !== null) return { range: ranges[0], confidence: "VERIFIED", evidence: value, evidenceKey: key };
    if (ranges.length > 1) return { range: null, confidence: "PARTIAL", evidence: value, evidenceKey: key };
    // Text is present but states no litres — e.g. "جميع أحجام الأحواض", "أحواض التفريخ".
    return { range: null, confidence: "PARTIAL", evidence: value, evidenceKey: key };
  }
  return { range: null, confidence: "NONE", evidence: null, evidenceKey: null };
}

/** Does a stated range cover this tank? A null bound means that side is unbounded. */
export function rangeCovers(range: TankRange, litres: number): boolean {
  if (!Number.isFinite(litres) || litres <= 0) return false;
  if (range.minL !== null && range.maxL !== null && range.minL > range.maxL) return false;
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
  subcategory?: string | null;
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
  /** Equipment identity comes from explicit names/type fields, never from tank volume or ratings. */
  filterType: FilterType | null;
  heaterWattage: number | null;
  isHeater: boolean;
}

export type FilterType = "hob" | "canister" | "sponge" | "internal";

function specificationText(specifications: unknown, keys: string[]): string {
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) return "";
  const bag = specifications as Record<string, unknown>;
  return keys.map((key) => typeof bag[key] === "string" ? bag[key] : "").join(" ");
}

/** A filter medium or accessory must never substitute for a complete filter. */
export function identifyFilterType(product: Pick<CandidateInput, "name" | "subcategory" | "specifications">): FilterType | null {
  const text = `${product.name} ${product.subcategory ?? ""} ${specificationText(product.specifications, ["النوع", "نوع الفلتر"])}`
    .toLowerCase().replace(/[أإآ]/g, "ا").replace(/[\u064B-\u065F\u0670]/g, "");
  if (/(ميديا|وسائط|قطن|حلقات|مشبك|مشابك|انابيب|ماصات|كيس|كربون|قطع غيار|دواء|علاج|مطهر|مضاد|media|replacement|cartridge|clip|hose|tube|pad|floss|medication|medicine|treatment|antibiotic)/i.test(text)) return null;
  if (!/(فلتر(?!ة)|فلاتر|\bfilters?\b)/i.test(text)) return null;
  const types: FilterType[] = [];
  if (/(اسفنج|sponge)/i.test(text)) types.push("sponge");
  if (/(كانستر|كنستر|canister)/i.test(text)) types.push("canister");
  if (/(معلق|جداري|شلال|hang[ -]*on|\bhob\b)/i.test(text)) types.push("hob");
  if (/(داخلي|internal)/i.test(text)) types.push("internal");
  return types.length === 1 ? types[0] : null;
}

function isHeater(product: CandidateInput): boolean {
  const text = `${product.name} ${product.subcategory ?? ""} ${specificationText(product.specifications, ["النوع"])}`;
  return /(?:سخان|هيتر|\bheater\b)/i.test(text) && !/(حامل|مشبك|ماصات|غطاء|دواء|علاج|مطهر|مضاد|holder|clip|cover|medication|medicine|treatment|antibiotic)/i.test(text);
}

function readWattage(specifications: unknown, label: string): number | null {
  // A variant's own wattage/label must be used; a parent name can list several wattages.
  const stated = specificationText(specifications, ["القدرة", "القدرة الكهربائية", "الاستطاعة"]);
  const text = normaliseDigits(stated.trim() || label);
  if (/\d\s*[/–—-]\s*\d/.test(text)) return null;
  const matches = [...text.matchAll(/(\d{1,4})\s*(?:واط|وات|watts?|w\b)/gi)];
  return matches.length === 1 && Number(matches[0][1]) > 0 ? Number(matches[0][1]) : null;
}

function toNumber(v: unknown): number | null {
  if ((typeof v !== "number" && typeof v !== "string") || (typeof v === "string" && !v.trim())) return null;
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
    filterType: identifyFilterType(product),
    isHeater: isHeater(product),
  };

  const variants = Array.isArray(product.variants)
    ? product.variants.filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v))
    : [];
  if (variants.length > 0) {
    return variants.filter((v) => typeof v.id === "string" && v.id.trim()).map((v) => {
      const variantLevel = classifySpecs(v.specifications);
      // An explicit but ambiguous variant statement cannot be overridden by a parent range.
      const chosen = variantLevel.confidence !== "NONE" ? variantLevel : productLevel;
      return {
        ...base,
        price: toNumber(v.price),
        variantId: (v.id as string) ?? null,
        variantLabel: (v.label as string) ?? null,
        inStock: (toNumber(v.stock) ?? 0) > 0,
        range: chosen.range,
        confidence: chosen.confidence,
        verdict: null,
        evidence: chosen.evidence,
        evidenceKey: chosen.evidenceKey,
        heaterWattage: base.isHeater ? readWattage(v.specifications, typeof v.label === "string" ? v.label : "") : null,
      };
    });
  }

  // A missing variant list is not permission to sell the parent's placeholder price/stock.
  if (product.hasVariants || (Array.isArray(product.variants) && product.variants.length > 0)) return [];

  return [{
    ...base,
    price: toNumber(product.price),
    variantId: null,
    variantLabel: null,
    inStock: (toNumber(product.stock) ?? 0) > 0,
    range: productLevel.range,
    confidence: productLevel.confidence,
    verdict: null,
    evidence: productLevel.evidence,
    evidenceKey: productLevel.evidenceKey,
    heaterWattage: base.isHeater ? readWattage(product.specifications, product.name) : null,
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
  if (!Number.isFinite(litres) || litres <= 0) return [];
  const byCategory = new Map<string, CategoryFit>();

  for (const product of products) {
    const category = (product.category as string) ?? "غير مصنّف";
    if (!byCategory.has(category)) {
      byCategory.set(category, { category, fits: [], ratedButUnsuitable: [], noSizeEvidence: [] });
    }
    const bucket = byCategory.get(category)!;

    for (const candidate of expandCandidates(product)) {
      if (!candidate.inStock || candidate.price === null || candidate.price <= 0) continue;
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

  const out: CategoryFit[] = [];
  byCategory.forEach((v) => out.push(v));
  return out;
}
