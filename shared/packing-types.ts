// Canonical types and policy defaults for the AQUAVO carton planner.
//
// UNITS ARE INTEGERS, EVERYWHERE. Lengths in millimetres, weights in grams,
// areas in mm², ratios in basis points (0..10000). The geometry engine
// (binpackingjs) hands numbers back in the caller's original scale; we convert
// once at the boundary and never do floating-point arithmetic on a placement
// again. That is what makes a plan reproducible byte-for-byte on any machine —
// two runs of the same order must never disagree because of a rounding artefact.
//
// AXIS CONTRACT (fixed, and pinned by a test):
//   library `width`  <- carton internal LENGTH  | item packed WIDTH
//   library `height` <- carton internal HEIGHT  | item packed HEIGHT   << VERTICAL
//   library `depth`  <- carton internal WIDTH   | item packed DEPTH
// So position[1] is the height above the carton floor and dimension[1] is the
// vertical extent a placed item occupies.

/** Ratios are carried as basis points so every comparison stays integral. */
export const BP = 10_000;

export const PACKING_POLICY_KEYS = {
  minSupportRatio: "packing_min_support_ratio",
  maxOverhangRatio: "packing_max_overhang_ratio",
  fragileMinSupportRatio: "packing_fragile_min_support_ratio",
  contactEpsilonMm: "packing_contact_epsilon_mm",
  minContactAreaMm2: "packing_min_contact_area_mm2",
} as const;

export interface PackingPolicy {
  /** Fraction of an item's base that must rest on something. Default 0.80. */
  minSupportRatioBp: number;
  /** Largest unsupported cantilever at any edge. Default 0.20. */
  maxOverhangRatioBp: number;
  /** Stricter floor applied to fragile / compressible items. Default 0.95. */
  fragileMinSupportRatioBp: number;
  /** Vertical tolerance for "B rests on A". Default 1 mm. */
  contactEpsilonMm: number;
  /** Contact smaller than this is not support at all. Default 100 mm² (1 cm²). */
  minContactAreaMm2: number;
}

export const DEFAULT_PACKING_POLICY: PackingPolicy = {
  minSupportRatioBp: 8_000,
  maxOverhangRatioBp: 2_000,
  fragileMinSupportRatioBp: 9_500,
  contactEpsilonMm: 1,
  minContactAreaMm2: 100,
};

/** The six orientations, mirroring binpackingjs `RotationType` ordinals. */
export const ROTATION = {
  WHD: 0,
  HWD: 1,
  HDW: 2,
  DHW: 3,
  DWH: 4,
  WDH: 5,
} as const;
export type RotationOrdinal = (typeof ROTATION)[keyof typeof ROTATION];

/** All six, in the library's own ordinal order. */
export const ALL_ROTATION_ORDINALS: readonly RotationOrdinal[] = [
  ROTATION.WHD,
  ROTATION.HWD,
  ROTATION.HDW,
  ROTATION.DHW,
  ROTATION.DWH,
  ROTATION.WDH,
];

/**
 * The only two orientations that keep an item's `height` input on the vertical
 * axis. Derived from binpackingjs `getDimension()`:
 *   WHD -> [w,h,d]  (dy = h)      DHW -> [d,h,w]  (dy = h)
 * every other rotation puts `w` or `d` on the vertical axis. A test pins this
 * against the installed library so a future version bump cannot silently break
 * upright handling.
 */
export const UPRIGHT_ROTATIONS: readonly RotationOrdinal[] = [ROTATION.WHD, ROTATION.DHW];
/** No rotation at all: the item goes in exactly as measured. */
export const FIXED_ROTATION: readonly RotationOrdinal[] = [ROTATION.WHD];

/** One physical unit to be packed. All lengths already include its allowance. */
export interface PackingItemSpec {
  /** Stable canonical identity — `productId|variantId|seq`. Drives tie-breaks. */
  key: string;
  productId: string;
  variantId: string | null;
  seq: number;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  weightG: number;
  rotationAllowed: boolean;
  mustStayUpright: boolean;
  fragile: boolean;
  compressible: boolean;
  canSupportItemsAbove: boolean;
  /** null = unknown. Never treated as unlimited. */
  maxSupportedWeightAboveG: number | null;
  minSupportRatioBp: number;
  maxOverhangRatioBp: number;
  requiresFullBaseSupport: boolean;
  requiresSeparateCarton: boolean;
  maxQtyPerCarton: number | null;
}

/** A carton the planner may use. Internal dimensions are PRE-PADDING. */
export interface CartonSpec {
  materialId: string;
  sku: string;
  name: string;
  internalLengthMm: number;
  internalWidthMm: number;
  internalHeightMm: number;
  safetyPaddingMm: number;
  maxWeightG: number;
  /** null = cost not recorded. Never coerced to 0, never compared as if known. */
  unitCost: number | null;
  availableQty: number;
}

/** An item after the engine placed it, in integer millimetres. */
export interface PlacedItem {
  key: string;
  item: PackingItemSpec;
  xMm: number;
  yMm: number;
  zMm: number;
  dxMm: number;
  dyMm: number;
  dzMm: number;
  rotationType: RotationOrdinal;
}

export interface PackedCarton {
  cartonIndex: number;
  carton: CartonSpec;
  items: PlacedItem[];
}

export type SafetyRejectionCode =
  | "FLOATING_ITEM"
  | "SUPPORT_RATIO_TOO_LOW"
  | "OVERHANG_TOO_LARGE"
  | "CENTRE_OF_MASS_UNSUPPORTED"
  | "SUPPORTER_IS_FRAGILE"
  | "SUPPORTER_IS_COMPRESSIBLE"
  | "SUPPORTER_FORBIDS_STACKING"
  | "SUPPORT_LIMIT_UNKNOWN"
  | "LOAD_EXCEEDS_LIMIT"
  | "ORIENTATION_VIOLATION"
  | "CARTON_WEIGHT_EXCEEDED"
  | "OUT_OF_BOUNDS"
  | "COLLISION"
  | "SUPPORT_CYCLE";

export interface SafetyRejection {
  code: SafetyRejectionCode;
  /** Arabic, shown verbatim to the admin. */
  messageAr: string;
  cartonIndex: number;
  itemKey?: string;
  itemName?: string;
  observed?: number;
  limit?: number;
}

export interface SafetyReport {
  ok: boolean;
  rejections: SafetyRejection[];
  /** Per-item support ratio in basis points; floor-resting items are 10000. */
  supportRatioBp: Record<string, number>;
  /** Per-item accumulated load from everything above, in grams. */
  loadOnG: Record<string, number>;
}

export type ManualReviewCode =
  | "MISSING_PACKING_DATA"
  | "NO_ACTIVE_CARTON"
  | "NO_CARTON_FITS"
  | "INSUFFICIENT_CARTON_STOCK"
  | "NO_SAFE_ARRANGEMENT"
  | "SEARCH_BUDGET_EXHAUSTED";

export interface MissingPackingField {
  productId: string;
  variantId: string | null;
  productName: string;
  missing: string[];
}

export interface ManualReviewResult {
  outcome: "manual_review";
  code: ManualReviewCode;
  messageAr: string;
  missing: MissingPackingField[];
  /** Why each attempted arrangement was rejected — shown to the admin. */
  rejections: SafetyRejection[];
}

export interface PackingPlanResult {
  outcome: "plan";
  cartons: PackedCarton[];
  safety: SafetyReport;
  /** Sum of known carton costs; null when ANY chosen carton cost is unknown. */
  totalKnownCost: number | null;
  costStatus: "exact" | "incomplete";
  /** Deterministic fingerprint of the plan — same order + data => same hash. */
  planHash: string;
  engineVersion: string;
  explanationAr: string;
}

export type PlannerResult = PackingPlanResult | ManualReviewResult;

/** cm (possibly fractional, as measured) -> whole millimetres. */
export function cmToMm(cm: number): number {
  return Math.round(cm * 10);
}

/** kg (possibly fractional) -> whole grams. */
export function kgToG(kg: number): number {
  return Math.round(kg * 1000);
}

export function mmToCm(mm: number): number {
  return mm / 10;
}

export function gToKg(g: number): number {
  return g / 1000;
}
