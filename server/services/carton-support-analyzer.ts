// Physical stack-support analysis for a packed carton.
//
// The geometry engine only guarantees that boxes do not intersect and stay
// inside the bin. It has no idea whether an arrangement is physically safe: it
// will happily float a box in mid-air on top of a 2 mm corner overlap. Every
// stability judgement therefore lives here, and it is deliberately strict —
// a plan we cannot prove safe is sent to manual review rather than shipped.
//
// Four independent conditions, all of which must hold for a stacked item:
//   1. It rests on something at all (nothing floats).
//   2. Enough of its base is actually in contact (support ratio).
//   3. No edge cantilevers out beyond the configured limit (overhang).
//   4. Its centre of mass projects inside the support polygon (statics).
//
// (2) and (4) are complementary and both are needed. The ratio alone allows a
// box supported by a thin strip down one side; the polygon alone allows a box
// balanced on four tiny corner contacts. Together they exclude both.
//
// ALL ARITHMETIC IS INTEGER. Coordinates are millimetres, areas mm², ratios
// basis points. Centre-of-mass coordinates are carried at half-millimetre
// resolution by doubling, so `x + dx/2` never introduces a fraction.
import {
  BP,
  type PackingPolicy,
  type PlacedItem,
  type SafetyRejection,
} from "../../shared/packing-types.js";

/** Axis-aligned rectangle on the horizontal (length x depth) plane. */
export interface ContactRect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export function rectArea(r: ContactRect): number {
  return (r.x1 - r.x0) * (r.z1 - r.z0);
}

export function bottomY(p: PlacedItem): number {
  return p.yMm;
}

export function topY(p: PlacedItem): number {
  return p.yMm + p.dyMm;
}

export function baseAreaMm2(p: PlacedItem): number {
  return p.dxMm * p.dzMm;
}

/**
 * The horizontal overlap between two placements — the footprint they share.
 * Returns null when they do not overlap, or touch only along a line/point
 * (zero area is not contact).
 */
export function contactRect(a: PlacedItem, b: PlacedItem): ContactRect | null {
  const x0 = Math.max(a.xMm, b.xMm);
  const x1 = Math.min(a.xMm + a.dxMm, b.xMm + b.dxMm);
  const z0 = Math.max(a.zMm, b.zMm);
  const z1 = Math.min(a.zMm + a.dzMm, b.zMm + b.dzMm);
  if (x1 <= x0 || z1 <= z0) return null;
  return { x0, z0, x1, z1 };
}

/** True when a's top face meets b's underside within the vertical tolerance. */
export function touchesFromBelow(a: PlacedItem, b: PlacedItem, policy: PackingPolicy): boolean {
  return Math.abs(topY(a) - bottomY(b)) <= policy.contactEpsilonMm;
}

export interface SupportEdge {
  supporter: PlacedItem;
  rect: ContactRect;
  areaMm2: number;
}

/**
 * Everything `b` genuinely rests on. A contact below `minContactAreaMm2` is
 * discarded outright — that is the rule that stops "a corner touches, therefore
 * it is supported".
 *
 * The returned edges are sorted by descending area then by key, so every
 * downstream consumer (load shares, remainder assignment, explanations) sees a
 * stable order regardless of how the engine emitted the items.
 */
export function findSupporters(
  b: PlacedItem,
  all: readonly PlacedItem[],
  policy: PackingPolicy,
): SupportEdge[] {
  const edges: SupportEdge[] = [];
  for (const a of all) {
    if (a.key === b.key) continue;
    if (!touchesFromBelow(a, b, policy)) continue;
    const rect = contactRect(a, b);
    if (!rect) continue;
    const areaMm2 = rectArea(rect);
    if (areaMm2 < policy.minContactAreaMm2) continue;
    edges.push({ supporter: a, rect, areaMm2 });
  }
  edges.sort((x, y) => y.areaMm2 - x.areaMm2 || (x.supporter.key < y.supporter.key ? -1 : 1));
  return edges;
}

/**
 * Supported fraction of b's base, in basis points.
 *
 * The contact rectangles are pairwise disjoint — two supporters cannot occupy
 * the same footprint at the same height without colliding, and collision is
 * rejected separately — so summing their areas is exact rather than an
 * over-count.
 */
export function supportRatioBp(b: PlacedItem, edges: readonly SupportEdge[]): number {
  const base = baseAreaMm2(b);
  if (base <= 0) return 0;
  let covered = 0;
  for (const e of edges) covered += e.areaMm2;
  return Math.floor((covered * BP) / base);
}

/**
 * Largest unsupported cantilever at any of the four edges, in basis points.
 *
 * Measured against the bounding box of the contact rectangles. That bound is at
 * least as large as the true support region, so on its own it would be
 * optimistic for scattered supports — which is exactly why it is only ever
 * evaluated together with the exact `supportRatioBp`. The pair closes the gap:
 * sparse support fails the ratio, cantilevered support fails the overhang.
 */
export function overhangRatioBp(b: PlacedItem, edges: readonly SupportEdge[]): number {
  if (edges.length === 0) return BP;
  let sx0 = Number.POSITIVE_INFINITY;
  let sx1 = Number.NEGATIVE_INFINITY;
  let sz0 = Number.POSITIVE_INFINITY;
  let sz1 = Number.NEGATIVE_INFINITY;
  for (const e of edges) {
    if (e.rect.x0 < sx0) sx0 = e.rect.x0;
    if (e.rect.x1 > sx1) sx1 = e.rect.x1;
    if (e.rect.z0 < sz0) sz0 = e.rect.z0;
    if (e.rect.z1 > sz1) sz1 = e.rect.z1;
  }
  const parts = [
    b.dxMm > 0 ? Math.floor(((sx0 - b.xMm) * BP) / b.dxMm) : 0,
    b.dxMm > 0 ? Math.floor((b.xMm + b.dxMm - sx1) * BP / b.dxMm) : 0,
    b.dzMm > 0 ? Math.floor(((sz0 - b.zMm) * BP) / b.dzMm) : 0,
    b.dzMm > 0 ? Math.floor((b.zMm + b.dzMm - sz1) * BP / b.dzMm) : 0,
  ];
  return Math.max(0, ...parts);
}

/** Point at doubled resolution so a midpoint is always integral. */
interface P2 {
  x2: number;
  z2: number;
}

function convexHull(points: readonly P2[]): P2[] {
  if (points.length <= 2) return [...points];
  const pts = [...points].sort((a, b) => a.x2 - b.x2 || a.z2 - b.z2);
  const cross = (o: P2, a: P2, b: P2) =>
    (a.x2 - o.x2) * (b.z2 - o.z2) - (a.z2 - o.z2) * (b.x2 - o.x2);
  const lower: P2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: P2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * The support polygon: convex hull of every contact rectangle corner. This is
 * the classical statics criterion — a body is stable exactly while its centre
 * of mass projects inside the hull of its contact points, which is why a box
 * bridging two supports with a gap between them is correctly accepted.
 */
export function supportPolygon(edges: readonly SupportEdge[]): P2[] {
  const pts: P2[] = [];
  for (const e of edges) {
    pts.push({ x2: e.rect.x0 * 2, z2: e.rect.z0 * 2 });
    pts.push({ x2: e.rect.x1 * 2, z2: e.rect.z0 * 2 });
    pts.push({ x2: e.rect.x1 * 2, z2: e.rect.z1 * 2 });
    pts.push({ x2: e.rect.x0 * 2, z2: e.rect.z1 * 2 });
  }
  return convexHull(pts);
}

/** Centre of mass projected onto the floor, assuming uniform density. */
export function centreOfMass(b: PlacedItem): P2 {
  return { x2: b.xMm * 2 + b.dxMm, z2: b.zMm * 2 + b.dzMm };
}

/** Inclusive point-in-convex-polygon test on integer coordinates. */
export function pointInConvexPolygon(p: P2, poly: readonly P2[]): boolean {
  if (poly.length === 0) return false;
  if (poly.length === 1) return poly[0]!.x2 === p.x2 && poly[0]!.z2 === p.z2;
  if (poly.length === 2) {
    const [a, b] = poly as [P2, P2];
    const cross = (b.x2 - a.x2) * (p.z2 - a.z2) - (b.z2 - a.z2) * (p.x2 - a.x2);
    if (cross !== 0) return false;
    return (
      p.x2 >= Math.min(a.x2, b.x2) &&
      p.x2 <= Math.max(a.x2, b.x2) &&
      p.z2 >= Math.min(a.z2, b.z2) &&
      p.z2 <= Math.max(a.z2, b.z2)
    );
  }
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const cross = (b.x2 - a.x2) * (p.z2 - a.z2) - (b.z2 - a.z2) * (p.x2 - a.x2);
    if (cross === 0) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (sign !== s) return false;
  }
  return true;
}

/** Resolved per-item thresholds: item override, else fragile floor, else policy. */
export function resolveThresholds(
  p: PlacedItem,
  policy: PackingPolicy,
): { minSupportBp: number; maxOverhangBp: number } {
  if (p.item.requiresFullBaseSupport) return { minSupportBp: BP, maxOverhangBp: 0 };
  const strict = p.item.fragile || p.item.compressible;
  const minSupportBp =
    p.item.minSupportRatioBp > 0
      ? p.item.minSupportRatioBp
      : strict
        ? policy.fragileMinSupportRatioBp
        : policy.minSupportRatioBp;
  const maxOverhangBp =
    p.item.maxOverhangRatioBp >= 0 && p.item.maxOverhangRatioBp < BP
      ? p.item.maxOverhangRatioBp
      : policy.maxOverhangRatioBp;
  return { minSupportBp, maxOverhangBp };
}

export interface CartonSupportAnalysis {
  rejections: SafetyRejection[];
  /** key -> supporting edges. Consumed by the load distributor. */
  edgesByItem: Map<string, SupportEdge[]>;
  supportRatioBp: Record<string, number>;
}

/**
 * Analyse one carton. Items resting on the floor (`y == 0`) are fully supported
 * by definition and are recorded at 10000 bp.
 */
export function analyseCartonSupport(
  cartonIndex: number,
  items: readonly PlacedItem[],
  policy: PackingPolicy,
): CartonSupportAnalysis {
  const rejections: SafetyRejection[] = [];
  const edgesByItem = new Map<string, SupportEdge[]>();
  const ratios: Record<string, number> = {};

  const ordered = [...items].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  for (const b of ordered) {
    if (bottomY(b) === 0) {
      edgesByItem.set(b.key, []);
      ratios[b.key] = BP;
      continue;
    }

    const edges = findSupporters(b, items, policy);
    edgesByItem.set(b.key, edges);

    if (edges.length === 0) {
      ratios[b.key] = 0;
      rejections.push({
        code: "FLOATING_ITEM",
        messageAr: `منتج معلّق بلا إسناد: ${b.item.name}`,
        cartonIndex,
        itemKey: b.key,
        itemName: b.item.name,
      });
      continue;
    }

    const ratio = supportRatioBp(b, edges);
    ratios[b.key] = ratio;
    const { minSupportBp, maxOverhangBp } = resolveThresholds(b, policy);

    if (ratio < minSupportBp) {
      rejections.push({
        code: "SUPPORT_RATIO_TOO_LOW",
        messageAr: `نسبة إسناد غير كافية للمنتج ${b.item.name}`,
        cartonIndex,
        itemKey: b.key,
        itemName: b.item.name,
        observed: ratio,
        limit: minSupportBp,
      });
    }

    const overhang = overhangRatioBp(b, edges);
    if (overhang > maxOverhangBp) {
      rejections.push({
        code: "OVERHANG_TOO_LARGE",
        messageAr: `نتوء غير مسنود يتجاوز الحد للمنتج ${b.item.name}`,
        cartonIndex,
        itemKey: b.key,
        itemName: b.item.name,
        observed: overhang,
        limit: maxOverhangBp,
      });
    }

    if (!pointInConvexPolygon(centreOfMass(b), supportPolygon(edges))) {
      rejections.push({
        code: "CENTRE_OF_MASS_UNSUPPORTED",
        messageAr: `مركز ثقل المنتج ${b.item.name} خارج منطقة الإسناد`,
        cartonIndex,
        itemKey: b.key,
        itemName: b.item.name,
      });
    }

    // Whatever is underneath must be allowed to carry something at all. These
    // are properties of the SUPPORTER, so they are checked once per edge.
    for (const e of edges) {
      const a = e.supporter.item;
      if (a.fragile) {
        rejections.push({
          code: "SUPPORTER_IS_FRAGILE",
          messageAr: `منتج هش تحته حمل: ${a.name}`,
          cartonIndex,
          itemKey: e.supporter.key,
          itemName: a.name,
        });
      }
      if (a.compressible) {
        rejections.push({
          code: "SUPPORTER_IS_COMPRESSIBLE",
          messageAr: `منتج قابل للانضغاط تحته حمل: ${a.name}`,
          cartonIndex,
          itemKey: e.supporter.key,
          itemName: a.name,
        });
      }
      if (!a.canSupportItemsAbove) {
        rejections.push({
          code: "SUPPORTER_FORBIDS_STACKING",
          messageAr: `منتج لا يسمح بوضع شي فوقه: ${a.name}`,
          cartonIndex,
          itemKey: e.supporter.key,
          itemName: a.name,
        });
      }
    }
  }

  return { rejections, edgesByItem, supportRatioBp: ratios };
}
