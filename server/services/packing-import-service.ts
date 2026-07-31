// Import of the owner's measurement spreadsheet — as a DRAFT, always.
//
// Verified against the real file (اعداد المنتجات وقياساتها.xlsx, 81 rows):
//
//   اسم المنتج                → product matching
//   عدد القطع                 → informational ONLY, never touches stock
//   طول المنتج مع كارتونة     → packed_height_cm   (the owner's «الطول» is HEIGHT)
//   عرض المنتج مع كارتونتة    → packed_width_cm
//   هل قابل للطي              → foldable  (نعم / لا)
//
// packed_depth_cm, packed_weight_kg and the folded dimensions are NOT in the
// sheet and are left NULL. The planner refuses to plan without them, which is
// the correct outcome — a guessed thickness produces a confident wrong carton.
//
// Matching is inherently fuzzy: the sheet names products in colloquial Arabic,
// not by slug or code, and it contains real typos («عرفة عزل» for «غرفة عزل»,
// «كطن اخضر» for «قطن اخضر»). So every row carries a confidence, and an
// `ambiguous` row is never applied — not by a bulk action, not by anything.

/** Header text as it actually appears in the sheet, including the typo. */
export const SHEET_HEADERS = {
  productName: "اسم المنتج",
  pieceCount: "عدد القطع",
  packedHeight: "طول المنتج مع كارتونة",
  packedWidth: "عرض المنتج مع كارتونتة",
  foldable: "هل قابل للطي",
} as const;

export type MatchConfidence = "exact" | "probable" | "ambiguous";

export interface RawSheetRow {
  rowNumber: number;
  productName: string;
  pieceCount?: string | null;
  packedHeight?: string | null;
  packedWidth?: string | null;
  foldable?: string | null;
}

export interface CatalogProduct {
  id: string;
  name: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  rawProductName: string;
  rawPieceCount: string | null;
  rawHeight: string | null;
  rawWidth: string | null;
  rawFoldable: string | null;
  packedHeightCm: number | null;
  packedWidthCm: number | null;
  foldable: boolean | null;
  matchedProductId: string | null;
  matchConfidence: MatchConfidence;
  matchCandidates: { id: string; name: string; score: number }[];
  parseWarnings: string[];
}

/**
 * Arabic-aware normalisation for name comparison.
 *
 * Collapses the alef/ya/ta-marbuta variants that the sheet and the catalogue
 * spell differently, strips diacritics, tatweel, punctuation and repeated
 * spaces. Without this, "غرفة عزل" and "غرفه عزل " are two different products.
 */
export function normaliseArabic(input: string): string {
  return input
    .replace(/[ً-ْٰـ]/g, "") // harakat + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

/** "19.5" / "١٩٫٥" / " 32 " -> number. Returns null for anything unusable. */
export function parseNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const western = String(raw)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٫،]/g, ".")
    .replace(/[^\d.\-]/g, "")
    .trim();
  if (western === "" || western === "-" || western === ".") return null;
  const n = Number(western);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** «نعم» / «لا», tolerant of the trailing spaces the real sheet contains. */
export function parseFoldable(raw: string | null | undefined): boolean | null {
  if (raw == null) return null;
  const v = normaliseArabic(String(raw));
  if (v === "" ) return null;
  if (["نعم", "نعم ", "ايه", "اي", "yes", "y", "true", "1"].includes(v)) return true;
  if (["لا", "كلا", "no", "n", "false", "0"].includes(v)) return false;
  return null;
}

/** Similarity in [0,1] over normalised token sets. */
export function similarity(a: string, b: string): number {
  const na = normaliseArabic(a);
  const nb = normaliseArabic(b);
  if (na === nb) return 1;
  if (!na || !nb) return 0;
  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const union = new Set([...ta, ...tb]).size;
  const jaccard = union > 0 ? shared / union : 0;
  const containment = na.includes(nb) || nb.includes(na) ? 0.25 : 0;
  return Math.min(1, jaccard + containment);
}

const PROBABLE_THRESHOLD = 0.6;
/** A second candidate this close to the best one makes the match ambiguous. */
const AMBIGUITY_MARGIN = 0.12;

export interface MatchResult {
  matchedProductId: string | null;
  confidence: MatchConfidence;
  candidates: { id: string; name: string; score: number }[];
}

/**
 * Match a sheet name to a catalogue product.
 *
 * Exact only on a normalised full-string equality that is unique in the
 * catalogue. If two products normalise identically, that is ambiguous rather
 * than exact — picking one would be a coin flip on which product gets the
 * measurements.
 */
export function matchProduct(
  sheetName: string,
  catalog: readonly CatalogProduct[],
): MatchResult {
  const target = normaliseArabic(sheetName);
  if (!target) return { matchedProductId: null, confidence: "ambiguous", candidates: [] };

  const exact = catalog.filter((p) => normaliseArabic(p.name) === target);
  if (exact.length === 1) {
    return {
      matchedProductId: exact[0]!.id,
      confidence: "exact",
      candidates: [{ id: exact[0]!.id, name: exact[0]!.name, score: 1 }],
    };
  }
  if (exact.length > 1) {
    return {
      matchedProductId: null,
      confidence: "ambiguous",
      candidates: exact.map((p) => ({ id: p.id, name: p.name, score: 1 })),
    };
  }

  const scored = catalog
    .map((p) => ({ id: p.id, name: p.name, score: similarity(sheetName, p.name) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1))
    .slice(0, 5);

  const best = scored[0];
  if (!best || best.score < PROBABLE_THRESHOLD) {
    return { matchedProductId: null, confidence: "ambiguous", candidates: scored };
  }
  const runnerUp = scored[1];
  if (runnerUp && best.score - runnerUp.score < AMBIGUITY_MARGIN) {
    return { matchedProductId: null, confidence: "ambiguous", candidates: scored };
  }
  return { matchedProductId: best.id, confidence: "probable", candidates: scored };
}

/**
 * Parse and match one row. Never throws on bad data — a malformed cell becomes a
 * warning so the rest of an 81-row import still lands.
 */
export function parseImportRow(
  raw: RawSheetRow,
  catalog: readonly CatalogProduct[],
): ParsedImportRow {
  const warnings: string[] = [];

  const packedHeightCm = parseNumber(raw.packedHeight);
  const packedWidthCm = parseNumber(raw.packedWidth);
  const foldable = parseFoldable(raw.foldable);

  if (raw.packedHeight != null && packedHeightCm == null) {
    warnings.push(`قيمة الطول غير مفهومة: "${raw.packedHeight}"`);
  }
  if (raw.packedWidth != null && packedWidthCm == null) {
    warnings.push(`قيمة العرض غير مفهومة: "${raw.packedWidth}"`);
  }
  if (raw.foldable != null && foldable == null && String(raw.foldable).trim() !== "") {
    warnings.push(`قيمة "قابل للطي" غير مفهومة: "${raw.foldable}"`);
  }
  // Real sheet: row 54 «اخشاب اكبر حجم» has no piece count. Informational only,
  // so it is noted and never blocks the row.
  if (raw.pieceCount == null || String(raw.pieceCount).trim() === "") {
    warnings.push("عدد القطع فارغ — للمعلومة فقط ولا يؤثر على الاستيراد");
  }

  const match = matchProduct(raw.productName, catalog);

  return {
    rowNumber: raw.rowNumber,
    rawProductName: raw.productName,
    rawPieceCount: raw.pieceCount ?? null,
    rawHeight: raw.packedHeight ?? null,
    rawWidth: raw.packedWidth ?? null,
    rawFoldable: raw.foldable ?? null,
    packedHeightCm,
    packedWidthCm,
    foldable,
    matchedProductId: match.matchedProductId,
    matchConfidence: match.confidence,
    matchCandidates: match.candidates,
    parseWarnings: warnings,
  };
}

export function parseImportSheet(
  rows: readonly RawSheetRow[],
  catalog: readonly CatalogProduct[],
): ParsedImportRow[] {
  return rows.map((r) => parseImportRow(r, catalog));
}

/**
 * The values a confirmed row writes into product_packing_data.
 *
 * Only height, width and foldable — everything else stays NULL because the sheet
 * does not contain it. `عدد القطع` is deliberately absent from the output type:
 * there is no field it could be written to, which is the structural reason it
 * can never move product stock.
 */
export interface ApplicableRow {
  productId: string;
  packedHeightCm: number | null;
  packedWidthCm: number | null;
  foldable: boolean;
  packedDepthCm: null;
  packedWeightKg: null;
  foldedHeightCm: null;
  foldedWidthCm: null;
  foldedDepthCm: null;
  source: "excel_import";
}

/**
 * Which rows may actually be written.
 *
 * `exact` goes through. `probable` needs the owner to have confirmed that
 * specific row. `ambiguous` never goes through, confirmed or not — if the match
 * itself is undecided there is nothing safe to confirm.
 */
export function selectApplicableRows(
  rows: readonly ParsedImportRow[],
  confirmedRowNumbers: ReadonlySet<number> = new Set(),
): ApplicableRow[] {
  const out: ApplicableRow[] = [];
  for (const r of rows) {
    if (r.matchConfidence === "ambiguous") continue;
    if (!r.matchedProductId) continue;
    if (r.matchConfidence === "probable" && !confirmedRowNumbers.has(r.rowNumber)) continue;
    if (r.packedHeightCm == null && r.packedWidthCm == null && r.foldable == null) continue;
    out.push({
      productId: r.matchedProductId,
      packedHeightCm: r.packedHeightCm,
      packedWidthCm: r.packedWidthCm,
      foldable: r.foldable ?? false,
      packedDepthCm: null,
      packedWeightKg: null,
      foldedHeightCm: null,
      foldedWidthCm: null,
      foldedDepthCm: null,
      source: "excel_import",
    });
  }
  return out;
}

export interface ImportSummary {
  total: number;
  exact: number;
  probable: number;
  ambiguous: number;
  withHeight: number;
  withWidth: number;
  foldableYes: number;
  /** Always equals `total` — the sheet carries no depth or weight at all. */
  stillMissingDepthOrWeight: number;
  warnings: number;
}

export function summariseImport(rows: readonly ParsedImportRow[]): ImportSummary {
  return {
    total: rows.length,
    exact: rows.filter((r) => r.matchConfidence === "exact").length,
    probable: rows.filter((r) => r.matchConfidence === "probable").length,
    ambiguous: rows.filter((r) => r.matchConfidence === "ambiguous").length,
    withHeight: rows.filter((r) => r.packedHeightCm != null).length,
    withWidth: rows.filter((r) => r.packedWidthCm != null).length,
    foldableYes: rows.filter((r) => r.foldable === true).length,
    stillMissingDepthOrWeight: rows.length,
    warnings: rows.reduce((s, r) => s + r.parseWarnings.length, 0),
  };
}
