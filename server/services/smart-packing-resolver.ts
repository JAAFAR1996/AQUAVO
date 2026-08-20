// Resolve the best packing measurements AQUAVO already knows before asking the
// owner to measure a product again.
//
// Priority is deliberate:
//   1) canonical product_packing_data (measured packing truth)
//   2) owner stocktake package measurements
//   3) explicit dimensions / weight written in the product catalogue
//   4) a transparent estimate of the missing third dimension, for RECOMMENDATION
//      only. Estimated data must never be persisted as measured truth.
//
// The smart route uses this resolver only to recommend a carton. The existing
// validation route still requires canonical 3-D + packed weight, so an estimate
// can never silently become an audited/validated packing plan.

export interface CanonicalPackingLike {
  packedHeightCm?: unknown;
  packedWidthCm?: unknown;
  packedDepthCm?: unknown;
  packedWeightKg?: unknown;
  rotationAllowed?: boolean | null;
  mustStayUpright?: boolean | null;
  fragile?: boolean | null;
  compressible?: boolean | null;
  canSupportItemsAbove?: boolean | null;
  maxSupportedWeightAboveKg?: unknown;
  minimumSupportRatio?: unknown;
  maximumOverhangRatio?: unknown;
  requiresFullBaseSupport?: boolean | null;
  safetyAllowanceCm?: unknown;
  requiresSeparateCarton?: boolean | null;
  maxQtyPerCarton?: number | null;
}

export interface SmartPackingResolveInput {
  productName: string;
  specifications: unknown;
  variantSpecifications?: unknown;
  canonical?: CanonicalPackingLike | null;
  /** Owner's historic «طول المنتج مع كارتونة». */
  legacyPackageLengthCm?: unknown;
  /** Owner's historic «عرض المنتج مع كارتونة». */
  legacyPackageWidthCm?: unknown;
}

export interface SmartPackingResolution {
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  /** Best packed-weight estimate; null means no honest estimate was available. */
  weightKg: number | null;
  /** Small non-zero value used only by the recommendation geometry engine. */
  plannerWeightKg: number;
  canonicalComplete: boolean;
  recommendationReady: boolean;
  estimated: boolean;
  weightEstimated: boolean;
  weightUnknown: boolean;
  sources: string[];
  notesAr: string[];
  unresolvedGeometryFields: string[];
  safetyAllowanceCm: number;
  rotationAllowed: boolean;
  mustStayUpright: boolean;
  fragile: boolean;
  compressible: boolean;
  canSupportItemsAbove: boolean;
  maxSupportedWeightAboveKg: number | null;
  minimumSupportRatio: number | null;
  maximumOverhangRatio: number | null;
  requiresFullBaseSupport: boolean;
  requiresSeparateCarton: boolean;
  maxQtyPerCarton: number | null;
}

function positiveNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function walkStrings(value: unknown, path: string[] = []): Array<{ path: string[]; value: string }> {
  if (typeof value === "string") return [{ path, value }];
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => walkStrings(v, [...path, String(i)]));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      walkStrings(v, [...path, k]),
    );
  }
  return [];
}

function unitToCm(n: number, rawUnit: string | undefined): number | null {
  const unit = (rawUnit ?? "").trim().toLowerCase();
  if (["مم", "ملم", "mm"].includes(unit)) return n / 10;
  if (["سم", "cm"].includes(unit)) return n;
  if (["م", "متر", "meter", "metre", "m"].includes(unit)) return n * 100;
  return null;
}

interface ParsedDimensions {
  valuesCm: number[];
  sourceText: string;
}

const DIMENSION_KEY_RE = /(الأبعاد|الابعاد|المقاس|المقاسات|القياس|الحجم|dimension|dimensions|size)/i;
// Do not use \b after Arabic units: JavaScript's ASCII-style word boundary does
// not treat Arabic letters as word characters. The lookahead works for Arabic
// prose such as «52×26 ملم بحسب بيانات المنتج».
const DIMENSION_RE = /(\d+(?:[.,]\d+)?)\s*[×xX*]\s*(\d+(?:[.,]\d+)?)(?:\s*[×xX*]\s*(\d+(?:[.,]\d+)?))?\s*(مم|ملم|mm|سم|cm|متر|meter|metre|m)(?=\s|$|[،,.؛;—-])/i;

/** Extract only explicit 2-D / 3-D measurements that carry a real unit. */
export function extractExplicitDimensions(specifications: unknown): ParsedDimensions | null {
  const candidates = walkStrings(specifications)
    .filter((entry) => entry.path.some((key) => DIMENSION_KEY_RE.test(key)))
    .map((entry) => {
      const match = entry.value.replace(/،/g, ".").match(DIMENSION_RE);
      if (!match) return null;
      const raw = [match[1], match[2], match[3]].filter(Boolean) as string[];
      const converted = raw.map((v) => unitToCm(Number(v.replace(",", ".")), match[4]));
      if (converted.some((v) => v == null || !Number.isFinite(v) || (v as number) <= 0)) return null;
      return { valuesCm: converted as number[], sourceText: entry.value } satisfies ParsedDimensions;
    })
    .filter((v): v is ParsedDimensions => v != null)
    .sort((a, b) => b.valuesCm.length - a.valuesCm.length);

  return candidates[0] ?? null;
}

const WEIGHT_KEY_RE = /(الوزن|weight|net weight|gross weight)/i;
const WEIGHT_RE = /(\d+(?:[.,]\d+)?)\s*(كغم|كجم|كغ|كيلوغرام|كيلو|kg|غم|جم|جرام|غرام|g)(?=\s|$|[،,.؛;—-])/i;

function weightToKg(n: number, rawUnit: string): number | null {
  const u = rawUnit.trim().toLowerCase();
  if (["كغم", "كجم", "كغ", "كيلوغرام", "كيلو", "kg"].includes(u)) return n;
  if (["غم", "جم", "جرام", "غرام", "g"].includes(u)) return n / 1000;
  return null;
}

/** Product catalogue weight is net product weight, not packed gross weight. */
export function extractExplicitNetWeightKg(specifications: unknown, productName = ""): number | null {
  const weightedEntries = walkStrings(specifications).filter((entry) =>
    entry.path.some((key) => WEIGHT_KEY_RE.test(key)),
  );
  const sources = [...weightedEntries.map((e) => e.value), productName];
  for (const source of sources) {
    const match = source.replace(/،/g, ".").match(WEIGHT_RE);
    if (!match) continue;
    const n = Number(match[1].replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) continue;
    const kg = weightToKg(n, match[2]);
    if (kg != null && kg > 0) return kg;
  }
  return null;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function resolveSmartPacking(input: SmartPackingResolveInput): SmartPackingResolution {
  const c = input.canonical ?? null;
  let heightCm = positiveNumber(c?.packedHeightCm);
  let widthCm = positiveNumber(c?.packedWidthCm);
  let depthCm = positiveNumber(c?.packedDepthCm);
  let weightKg = positiveNumber(c?.packedWeightKg);

  const canonicalComplete = heightCm != null && widthCm != null && depthCm != null && weightKg != null;
  const notesAr: string[] = [];
  const sources: string[] = canonicalComplete ? ["product_packing_data"] : [];
  let estimated = false;
  let weightEstimated = false;

  if (!canonicalComplete) {
    // The old stocktake sheet was measured by the owner as packaged length +
    // packaged width. Reuse those measurements instead of pretending they do not
    // exist. The old import service documents length -> packed height.
    const legacyH = positiveNumber(input.legacyPackageLengthCm);
    const legacyW = positiveNumber(input.legacyPackageWidthCm);
    if (heightCm == null && legacyH != null) {
      heightCm = legacyH;
      sources.push("owner_stocktake");
    }
    if (widthCm == null && legacyW != null) {
      widthCm = legacyW;
      sources.push("owner_stocktake");
    }

    const explicit =
      extractExplicitDimensions(input.variantSpecifications) ?? extractExplicitDimensions(input.specifications);
    if (explicit) {
      const dims = explicit.valuesCm;
      if (heightCm == null && dims[0] != null) heightCm = dims[0];
      if (widthCm == null && dims[1] != null) widthCm = dims[1];
      if (depthCm == null && dims[2] != null) depthCm = dims[2];
      sources.push("catalog_spec");
      // Catalogue dimensions describe the product, not necessarily the final
      // parcel, so they are useful for a recommendation but are not canonical.
      estimated = true;
      notesAr.push(`استفاد النظام من قياس مكتوب ببيانات المنتج: ${explicit.sourceText}`);
    }

    // If the owner measured two packaged axes, the missing third axis is usually
    // the package thickness. For recommendation only, use the smaller known axis
    // as a deliberately roomy estimate instead of inventing a tiny thickness.
    if (depthCm == null && heightCm != null && widthCm != null) {
      depthCm = Math.min(heightCm, widthCm);
      estimated = true;
      sources.push("estimated_depth");
      notesAr.push(`السماكة غير مقاسة؛ استُخدم تقدير محافظ ${depthCm} سم لاختيار الكارتونة فقط`);
    }

    if (weightKg == null) {
      const netKg =
        extractExplicitNetWeightKg(input.variantSpecifications, input.productName) ??
        extractExplicitNetWeightKg(input.specifications, input.productName);
      if (netKg != null) {
        // Add a modest gross-packaging allowance. This remains labelled as an
        // estimate and is never accepted by the canonical validation endpoint.
        weightKg = netKg * 1.1 + 0.03;
        weightEstimated = true;
        estimated = true;
        sources.push("catalog_net_weight_estimate");
        notesAr.push(`الوزن بعد التغليف مقدّر من وزن المنتج المعلن (${netKg} كغم) مع هامش تغليف`);
      }
    }
  }

  const unresolvedGeometryFields = [
    heightCm == null ? "packed_height_cm" : null,
    widthCm == null ? "packed_width_cm" : null,
    depthCm == null ? "packed_depth_cm" : null,
  ].filter(Boolean) as string[];

  const weightUnknown = weightKg == null;
  if (weightUnknown && unresolvedGeometryFields.length === 0) {
    estimated = true;
    sources.push("unknown_weight_geometry_only");
    notesAr.push("الوزن بعد التغليف غير معروف؛ توصية الكارتونة مبنية على القياسات فقط ولا تُعتمد كخطة آمنة نهائية");
  }

  return {
    heightCm,
    widthCm,
    depthCm,
    weightKg,
    // One gram keeps the geometry engine numeric. The route converts the result
    // to a non-validatable recommendation, suppresses weight claims in the UI,
    // and validation still rebuilds from canonical data.
    plannerWeightKg: weightKg ?? 0.001,
    canonicalComplete,
    recommendationReady: unresolvedGeometryFields.length === 0,
    estimated,
    weightEstimated,
    weightUnknown,
    sources: unique(sources),
    notesAr: unique(notesAr),
    unresolvedGeometryFields,
    safetyAllowanceCm: positiveNumber(c?.safetyAllowanceCm) ?? 0,
    rotationAllowed: c?.rotationAllowed ?? true,
    mustStayUpright: c?.mustStayUpright ?? false,
    fragile: c?.fragile ?? false,
    compressible: c?.compressible ?? false,
    canSupportItemsAbove: c?.canSupportItemsAbove ?? false,
    maxSupportedWeightAboveKg: positiveNumber(c?.maxSupportedWeightAboveKg),
    minimumSupportRatio: positiveNumber(c?.minimumSupportRatio),
    maximumOverhangRatio: positiveNumber(c?.maximumOverhangRatio),
    requiresFullBaseSupport: c?.requiresFullBaseSupport ?? false,
    requiresSeparateCarton: c?.requiresSeparateCarton ?? false,
    maxQtyPerCarton: c?.maxQtyPerCarton ?? null,
  };
}
