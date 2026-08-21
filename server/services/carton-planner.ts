// The carton planner: turns an order into a validated, explainable packing plan.
//
// Deliberately pure — no database, no clock, no randomness. Feed it the same
// order and the same packing data and it returns the same plan, forever. That
// is a hard requirement, not a nicety: the plan drives a stock reservation and
// a cost snapshot, and both must be reproducible during an audit.
//
// Shape of the search: propose an arrangement with the geometry engine, then
// judge it with the AQUAVO safety layer, and if it is rejected try the next
// candidate carton set. The engine knows nothing about fragility, stacking
// permission or load, so "propose then verify" is the only honest structure —
// we never assume a fitting arrangement is a safe one.
//
// When nothing survives, the result is manual review carrying the real reasons.
// It never guesses a carton and never reports a cost it cannot stand behind.
import { createHash } from "node:crypto";
import {
  DEFAULT_PACKING_POLICY,
  type CartonSpec,
  type ManualReviewResult,
  type MissingPackingField,
  type PackedCarton,
  type PackingItemSpec,
  type PackingPolicy,
  type PackingPlanResult,
  type PlannerResult,
  type SafetyRejection,
  type SafetyReport,
} from "../../shared/packing-types.js";
import { itemFitsCarton, runEngine } from "./carton-geometry-adapter.js";
import { occupiedHeightMm, validatePlanSafety } from "./carton-safety-validator.js";

export const ENGINE_VERSION = "binpackingjs@4.1.0";

/** Hard ceiling on engine passes. Exhausting it means manual review, not a guess. */
export const MAX_ATTEMPTS = 24;

export interface PlannerInput {
  items: readonly PackingItemSpec[];
  cartons: readonly CartonSpec[];
  policy?: PackingPolicy;
  /** Products whose packing data is incomplete. Non-empty => manual review. */
  missing?: readonly MissingPackingField[];
}

function manualReview(
  code: ManualReviewResult["code"],
  messageAr: string,
  missing: readonly MissingPackingField[] = [],
  rejections: readonly SafetyRejection[] = [],
): ManualReviewResult {
  return {
    outcome: "manual_review",
    code,
    messageAr,
    missing: [...missing],
    rejections: [...rejections],
  };
}

function cartonVolumeMm3(c: CartonSpec): number {
  return c.internalLengthMm * c.internalWidthMm * c.internalHeightMm;
}

/** Cartons the planner may consider at all, in a stable smallest-first order. */
export function eligibleCartons(cartons: readonly CartonSpec[]): CartonSpec[] {
  return cartons
    .filter((c) => {
      const smallestInside = Math.min(c.internalLengthMm, c.internalWidthMm, c.internalHeightMm);
      return (
        c.availableQty > 0 &&
        c.internalLengthMm > 0 &&
        c.internalWidthMm > 0 &&
        c.internalHeightMm > 0 &&
        c.maxWeightG > 0 &&
        // A NULL padding arrives at this pure boundary as 0. Zero is not a safe
        // default: it means the physical clearance was never documented. Such a
        // carton may still be selected manually for a shipment, but the automatic
        // planner is not allowed to certify that an item fits it.
        c.safetyPaddingMm > 0 &&
        c.safetyPaddingMm * 2 < smallestInside
      );
    })
    .sort((a, b) => cartonVolumeMm3(a) - cartonVolumeMm3(b) || (a.sku < b.sku ? -1 : 1));
}

/**
 * Deterministic ladder of carton sets to try, smallest-first.
 *
 * Single cartons come first (a one-carton plan is always preferred), then the
 * same carton repeated, then mixed pairs. Every level is generated in sorted
 * order so the ladder itself carries no ambiguity.
 */
export function buildAttemptLadder(candidates: readonly CartonSpec[]): CartonSpec[][] {
  const ladder: CartonSpec[][] = [];
  for (const c of candidates) ladder.push([c]);
  for (const c of candidates) {
    if (c.availableQty >= 2) ladder.push([c, c]);
    if (c.availableQty >= 3) ladder.push([c, c, c]);
  }
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      ladder.push([candidates[i]!, candidates[j]!]);
    }
  }
  return ladder.slice(0, MAX_ATTEMPTS);
}

/** Available stock must cover how many of each carton type the plan actually uses. */
export function stockSufficient(cartons: readonly PackedCarton[]): boolean {
  const need = new Map<string, number>();
  const avail = new Map<string, number>();
  for (const c of cartons) {
    need.set(c.carton.materialId, (need.get(c.carton.materialId) ?? 0) + 1);
    avail.set(c.carton.materialId, c.carton.availableQty);
  }
  for (const [id, n] of need) if ((avail.get(id) ?? 0) < n) return false;
  return true;
}

interface ScoredPlan {
  cartons: PackedCarton[];
  safety: SafetyReport;
  cartonCount: number;
  totalVolumeMm3: number;
  totalKnownCost: number | null;
  costStatus: "exact" | "incomplete";
  wastedVolumeMm3: number;
  heightUtilisationBp: number;
  skuOrder: string;
}

function scorePlan(cartons: PackedCarton[], safety: SafetyReport): ScoredPlan {
  let totalVolume = 0;
  let usedVolume = 0;
  let heightNum = 0;
  let heightDen = 0;
  let cost = 0;
  let costKnown = true;

  for (const c of cartons) {
    totalVolume += cartonVolumeMm3(c.carton);
    for (const p of c.items) usedVolume += p.dxMm * p.dyMm * p.dzMm;
    heightNum += occupiedHeightMm(c.items);
    heightDen += c.carton.internalHeightMm;
    if (c.carton.unitCost == null) costKnown = false;
    else cost += c.carton.unitCost;
  }

  return {
    cartons,
    safety,
    cartonCount: cartons.length,
    totalVolumeMm3: totalVolume,
    totalKnownCost: costKnown ? cost : null,
    costStatus: costKnown ? "exact" : "incomplete",
    wastedVolumeMm3: totalVolume - usedVolume,
    heightUtilisationBp: heightDen > 0 ? Math.floor((heightNum * 10_000) / heightDen) : 0,
    skuOrder: cartons
      .map((c) => c.carton.sku)
      .sort()
      .join(","),
  };
}

/**
 * Owner-specified ranking, applied in exactly this order:
 *   1 fewest cartons  2 smallest carton volume  3 lowest KNOWN cost
 *   4 least wasted space  5 best height use  6 sku, as a final tie-break.
 *
 * Unknown costs never lose a comparison they have no business winning: a plan
 * with an unresolved carton cost is pushed behind every fully-costed plan
 * instead of being scored as if it were free.
 */
export function comparePlans(a: ScoredPlan, b: ScoredPlan): number {
  if (a.cartonCount !== b.cartonCount) return a.cartonCount - b.cartonCount;
  if (a.totalVolumeMm3 !== b.totalVolumeMm3) return a.totalVolumeMm3 - b.totalVolumeMm3;

  const aKnown = a.totalKnownCost != null;
  const bKnown = b.totalKnownCost != null;
  if (aKnown !== bKnown) return aKnown ? -1 : 1;
  if (aKnown && bKnown && a.totalKnownCost !== b.totalKnownCost) {
    return (a.totalKnownCost as number) - (b.totalKnownCost as number);
  }

  if (a.wastedVolumeMm3 !== b.wastedVolumeMm3) return a.wastedVolumeMm3 - b.wastedVolumeMm3;
  if (a.heightUtilisationBp !== b.heightUtilisationBp) {
    return b.heightUtilisationBp - a.heightUtilisationBp;
  }
  return a.skuOrder < b.skuOrder ? -1 : a.skuOrder > b.skuOrder ? 1 : 0;
}

/** Stable fingerprint over every placement — identical plans hash identically. */
export function planHash(cartons: readonly PackedCarton[]): string {
  const canonical = cartons
    .map((c) =>
      [
        c.cartonIndex,
        c.carton.materialId,
        ...c.items
          .map((p) =>
            [p.key, p.xMm, p.yMm, p.zMm, p.dxMm, p.dyMm, p.dzMm, p.rotationType].join(":"),
          )
          .sort(),
      ].join("|"),
    )
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

function fmtCm(mm: number): string {
  const cm = mm / 10;
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1);
}

/** Arabic walkthrough of the plan, layer by layer. Shown verbatim in the admin. */
export function explainPlanAr(cartons: readonly PackedCarton[], safety: SafetyReport): string {
  const lines: string[] = [];
  for (const c of cartons) {
    const dims = `${fmtCm(c.carton.internalLengthMm)}×${fmtCm(c.carton.internalWidthMm)}×${fmtCm(c.carton.internalHeightMm)} سم`;
    let weight = 0;
    for (const p of c.items) weight += p.item.weightG;
    const used = occupiedHeightMm(c.items);
    const util = c.carton.internalHeightMm > 0
      ? Math.round((used * 100) / c.carton.internalHeightMm)
      : 0;

    lines.push(
      `كارتونة ${c.cartonIndex + 1} من ${cartons.length} · ${c.carton.name} · ${dims} · ` +
        `الوزن ${(weight / 1000).toFixed(2)} من ${(c.carton.maxWeightG / 1000).toFixed(2)} كغم · ` +
        `استغلال الارتفاع ${util}%`,
    );

    for (const p of c.items) {
      const pos = `(${fmtCm(p.xMm)}, ${fmtCm(p.yMm)}, ${fmtCm(p.zMm)})`;
      const dim = `${fmtCm(p.dxMm)}×${fmtCm(p.dyMm)}×${fmtCm(p.dzMm)}`;
      lines.push(`  • ${p.item.name} · الموضع ${pos} · الأبعاد المشغولة ${dim} سم`);
      if (p.yMm === 0) {
        lines.push("      مسنود على أرضية الكارتونة");
      } else {
        const ratio = Math.round(((safety.supportRatioBp[p.key] ?? 0) * 100) / 10_000);
        lines.push(`      نسبة الإسناد ${ratio}%`);
      }
      const load = safety.loadOnG[p.key] ?? 0;
      if (load > 0) {
        const limit = p.item.maxSupportedWeightAboveG;
        const limitTxt = limit == null ? "غير محدد" : `${(limit / 1000).toFixed(2)} كغم`;
        lines.push(`      الحمل فوقه ${(load / 1000).toFixed(2)} كغم من ${limitTxt} المسموحة`);
      }
    }
  }
  return lines.join("\n");
}

/**
 * Plan an order.
 *
 * Missing packing data short-circuits before any geometry runs: without a real
 * depth and weight there is nothing honest to compute, and inventing either
 * would produce a confident, wrong answer.
 */
export function planOrder(input: PlannerInput): PlannerResult {
  const policy = input.policy ?? DEFAULT_PACKING_POLICY;

  if (input.missing && input.missing.length > 0) {
    return manualReview(
      "MISSING_PACKING_DATA",
      "يحتاج اختيار كارتونة يدوياً — سماكة أو وزن أحد المنتجات ناقص",
      input.missing,
    );
  }
  if (input.items.length === 0) {
    return manualReview("MISSING_PACKING_DATA", "ماكو أسطر قابلة للتغليف بهذا الطلب");
  }

  const candidates = eligibleCartons(input.cartons);
  if (candidates.length === 0) {
    return manualReview(
      "NO_ACTIVE_CARTON",
      "ماكو كارتونة مؤهلة للاختيار الآلي: لازم تكون متوفرة وقياساتها ووزنها وهامش حمايتها موثقة",
    );
  }

  // Items flagged `requiresSeparateCarton` never share a carton. Each gets the
  // smallest eligible carton that can actually hold it.
  const separate = input.items.filter((i) => i.requiresSeparateCarton);
  const shared = input.items.filter((i) => !i.requiresSeparateCarton);

  const dedicated: PackedCarton[] = [];
  for (const item of [...separate].sort((a, b) => (a.key < b.key ? -1 : 1))) {
    const carton = candidates.find((c) => itemFitsCarton(item, c));
    if (!carton) {
      return manualReview("NO_CARTON_FITS", `ماكو كارتونة تحتوي المنتج: ${item.name}`);
    }
    const plans = runEngine([carton], [item]);
    if (!plans || plans.length !== 1) {
      return manualReview("NO_CARTON_FITS", `ماكو كارتونة تحتوي المنتج: ${item.name}`);
    }
    dedicated.push(plans[0]!);
  }

  const scored: ScoredPlan[] = [];
  const allRejections: SafetyRejection[] = [];

  if (shared.length > 0) {
    for (const offered of buildAttemptLadder(candidates)) {
      const packed = runEngine(offered, shared);
      if (!packed) continue;
      const safety = validatePlanSafety(packed, policy);
      if (!safety.ok) {
        allRejections.push(...safety.rejections);
        continue;
      }
      scored.push(scorePlan(packed, safety));
    }

    if (scored.length === 0) {
      const code = allRejections.length > 0 ? "NO_SAFE_ARRANGEMENT" : "NO_CARTON_FITS";
      const msg =
        allRejections.length > 0
          ? "ما لكيت ترتيب آمن ضمن المحاولات المسموحة"
          : "ماكو كارتونة تحتوي منتجات هذا الطلب";
      return manualReview(code, msg, [], allRejections);
    }
  }

  scored.sort(comparePlans);

  // Re-index so carton numbers run 1..N across the shared and dedicated parts.
  const chosen = scored[0];
  const merged: PackedCarton[] = [
    ...(chosen ? chosen.cartons : []),
    ...dedicated,
  ].map((c, i) => ({ ...c, cartonIndex: i }));

  if (merged.length === 0) {
    return manualReview("NO_CARTON_FITS", "ماكو خطة تغليف صالحة لهذا الطلب");
  }

  // Dedicated cartons bypassed the shared search, so validate the merged plan as
  // a whole — nothing reaches the caller without passing the full safety layer.
  const finalSafety = validatePlanSafety(merged, policy);
  if (!finalSafety.ok) {
    return manualReview(
      "NO_SAFE_ARRANGEMENT",
      "ما لكيت ترتيب آمن ضمن المحاولات المسموحة",
      [],
      finalSafety.rejections,
    );
  }

  if (!stockSufficient(merged)) {
    return manualReview("INSUFFICIENT_CARTON_STOCK", "مخزون الكراتين غير كافي لهذه الخطة");
  }

  const totals = scorePlan(merged, finalSafety);
  const result: PackingPlanResult = {
    outcome: "plan",
    cartons: merged,
    safety: finalSafety,
    totalKnownCost: totals.totalKnownCost,
    costStatus: totals.costStatus,
    planHash: planHash(merged),
    engineVersion: ENGINE_VERSION,
    explanationAr: explainPlanAr(merged, finalSafety),
  };
  return result;
}
