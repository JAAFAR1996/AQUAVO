// The AQUAVO safety layer. binpackingjs answers "does it fit"; this answers
// "is it safe to ship", which is a different and stricter question.
//
// Seven checks, applied to EVERY plan — automatic or hand-edited. There is no
// bypass and no override: a plan that fails here is not a plan. The admin can
// change the arrangement and be re-validated, or declare the order
// `manual_pack_required`, but nothing can mark a failing arrangement as a
// validated safe automatic plan.
//
// Bounds and collision are re-checked here even though the engine already
// guarantees them. These numbers feed a profit figure; a third-party library is
// not the last line of defence for that.
import {
  BP,
  type PackedCarton,
  type PackingPolicy,
  type PlacedItem,
  type SafetyRejection,
  type SafetyReport,
  UPRIGHT_ROTATIONS,
} from "../../shared/packing-types.js";
import { analyseCartonSupport } from "./carton-support-analyzer.js";
import { distributeLoad } from "./carton-load-distributor.js";

function validateBounds(cartonIndex: number, c: PackedCarton): SafetyRejection[] {
  const out: SafetyRejection[] = [];
  const limX = c.carton.internalLengthMm - 2 * c.carton.safetyPaddingMm;
  const limY = c.carton.internalHeightMm - 2 * c.carton.safetyPaddingMm;
  const limZ = c.carton.internalWidthMm - 2 * c.carton.safetyPaddingMm;
  for (const p of c.items) {
    if (
      p.xMm < 0 ||
      p.yMm < 0 ||
      p.zMm < 0 ||
      p.xMm + p.dxMm > limX ||
      p.yMm + p.dyMm > limY ||
      p.zMm + p.dzMm > limZ
    ) {
      out.push({
        code: "OUT_OF_BOUNDS",
        messageAr: `المنتج ${p.item.name} خارج حدود الكارتونة`,
        cartonIndex,
        itemKey: p.key,
        itemName: p.item.name,
      });
    }
  }
  return out;
}

function overlaps1D(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

function validateCollision(cartonIndex: number, c: PackedCarton): SafetyRejection[] {
  const out: SafetyRejection[] = [];
  const items = [...c.items].sort((a, b) => (a.key < b.key ? -1 : 1));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!;
      const b = items[j]!;
      if (
        overlaps1D(a.xMm, a.xMm + a.dxMm, b.xMm, b.xMm + b.dxMm) &&
        overlaps1D(a.yMm, a.yMm + a.dyMm, b.yMm, b.yMm + b.dyMm) &&
        overlaps1D(a.zMm, a.zMm + a.dzMm, b.zMm, b.zMm + b.dzMm)
      ) {
        out.push({
          code: "COLLISION",
          messageAr: `تداخل هندسي بين ${a.item.name} و${b.item.name}`,
          cartonIndex,
          itemKey: a.key,
          itemName: a.item.name,
        });
      }
    }
  }
  return out;
}

/**
 * An item that must stay upright may only use a rotation that keeps its packed
 * height on the vertical axis. Belt and braces: the adapter already restricts
 * `allowedRotations` before calling the engine, but a hand-edited plan reaches
 * this function without ever going through the adapter.
 */
function validateOrientation(cartonIndex: number, c: PackedCarton): SafetyRejection[] {
  const out: SafetyRejection[] = [];
  for (const p of c.items) {
    if (!p.item.mustStayUpright) continue;
    if (!UPRIGHT_ROTATIONS.includes(p.rotationType)) {
      out.push({
        code: "ORIENTATION_VIOLATION",
        messageAr: `منتج يجب أن يبقى واقفاً وُضع بوضعية غير مسموحة: ${p.item.name}`,
        cartonIndex,
        itemKey: p.key,
        itemName: p.item.name,
      });
      continue;
    }
    // Independent of the rotation ordinal: the vertical extent must equal the
    // measured packed height.
    if (p.dyMm !== p.item.heightMm) {
      out.push({
        code: "ORIENTATION_VIOLATION",
        messageAr: `منتج يجب أن يبقى واقفاً وارتفاعه المشغول لا يطابق ارتفاعه المقاس: ${p.item.name}`,
        cartonIndex,
        itemKey: p.key,
        itemName: p.item.name,
        observed: p.dyMm,
        limit: p.item.heightMm,
      });
    }
  }
  return out;
}

function validateCartonWeight(cartonIndex: number, c: PackedCarton): SafetyRejection[] {
  let total = 0;
  for (const p of c.items) total += p.item.weightG;
  if (total > c.carton.maxWeightG) {
    return [
      {
        code: "CARTON_WEIGHT_EXCEEDED",
        messageAr: `وزن محتويات الكارتونة يتجاوز الحد المسموح (${c.carton.name})`,
        cartonIndex,
        observed: total,
        limit: c.carton.maxWeightG,
      },
    ];
  }
  return [];
}

/**
 * Run every check over a whole plan. Rejections accumulate rather than
 * short-circuit so the admin sees every problem at once instead of fixing them
 * one round-trip at a time.
 */
export function validatePlanSafety(
  cartons: readonly PackedCarton[],
  policy: PackingPolicy,
): SafetyReport {
  const rejections: SafetyRejection[] = [];
  const supportRatio: Record<string, number> = {};
  const loadOn: Record<string, number> = {};

  for (const c of cartons) {
    const idx = c.cartonIndex;
    rejections.push(...validateBounds(idx, c));
    rejections.push(...validateCollision(idx, c));
    rejections.push(...validateOrientation(idx, c));
    rejections.push(...validateCartonWeight(idx, c));

    const support = analyseCartonSupport(idx, c.items, policy);
    rejections.push(...support.rejections);
    Object.assign(supportRatio, support.supportRatioBp);

    const load = distributeLoad(idx, c.items, support.edgesByItem, policy);
    rejections.push(...load.rejections);
    Object.assign(loadOn, load.loadG);
  }

  return {
    ok: rejections.length === 0,
    rejections,
    supportRatioBp: supportRatio,
    loadOnG: loadOn,
  };
}

/** Convenience for the admin UI: basis points -> a whole percentage. */
export function bpToPercent(bp: number): number {
  return Math.round((bp * 100) / BP);
}

/** Highest point actually occupied — drives the "height utilisation" score. */
export function occupiedHeightMm(items: readonly PlacedItem[]): number {
  let max = 0;
  for (const p of items) max = Math.max(max, p.yMm + p.dyMm);
  return max;
}
