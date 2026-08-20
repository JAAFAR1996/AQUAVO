// Deterministic floor-first fallback for practical cartonization.
//
// binpackingjs is a fast greedy 3-D heuristic, but it chooses a single pivot path.
// A geometrically valid result can therefore stack a small item on a large item
// even when the same order would fit side-by-side on the carton floor. AQUAVO's
// safety layer can correctly reject that stack (for example when the lower item
// cannot support weight), but a one-pass geometry engine then has no alternate
// layout to try and may unnecessarily move to a larger carton.
//
// This bounded search deliberately tries the warehouse-friendly case first:
// keep every item on the carton floor, explore every legal 90-degree orientation,
// and backtrack across a deterministic set of extreme points. If it finds a
// layout, the normal safety validator still validates it. If it cannot find one
// within the search budget, callers fall back to the existing 3-D engine.
import {
  ALL_ROTATION_ORDINALS,
  FIXED_ROTATION,
  UPRIGHT_ROTATIONS,
  type CartonSpec,
  type PackedCarton,
  type PackingItemSpec,
  type PlacedItem,
  type RotationOrdinal,
} from "../../shared/packing-types.js";

/** Keep the fallback predictable even on unusually large orders. */
export const FLOOR_FIRST_MAX_ITEMS = 24;
export const FLOOR_FIRST_MAX_STATES = 20_000;

interface Orientation {
  rotation: RotationOrdinal;
  dx: number;
  dy: number;
  dz: number;
}

interface FloorPlacement {
  item: PackingItemSpec;
  x: number;
  z: number;
  orientation: Orientation;
}

function rotationsFor(item: PackingItemSpec): readonly RotationOrdinal[] {
  if (!item.rotationAllowed) return FIXED_ROTATION;
  if (item.mustStayUpright) return UPRIGHT_ROTATIONS;
  return ALL_ROTATION_ORDINALS;
}

function dimensionsFor(item: PackingItemSpec, rotation: RotationOrdinal): Orientation {
  const w = item.widthMm;
  const h = item.heightMm;
  const d = item.depthMm;
  switch (rotation) {
    case 0: return { rotation, dx: w, dy: h, dz: d }; // WHD
    case 1: return { rotation, dx: h, dy: w, dz: d }; // HWD
    case 2: return { rotation, dx: h, dy: d, dz: w }; // HDW
    case 3: return { rotation, dx: d, dy: h, dz: w }; // DHW
    case 4: return { rotation, dx: d, dy: w, dz: h }; // DWH
    case 5: return { rotation, dx: w, dy: d, dz: h }; // WDH
  }
}

function usableInterior(carton: CartonSpec): { width: number; height: number; depth: number } {
  const pad = 2 * carton.safetyPaddingMm;
  return {
    width: Math.max(0, carton.internalLengthMm - pad),
    height: Math.max(0, carton.internalHeightMm - pad),
    depth: Math.max(0, carton.internalWidthMm - pad),
  };
}

function legalFloorOrientations(
  item: PackingItemSpec,
  bin: { width: number; height: number; depth: number },
): Orientation[] {
  const unique = new Map<string, Orientation>();
  for (const r of rotationsFor(item)) {
    const o = dimensionsFor(item, r);
    if (o.dx > bin.width || o.dy > bin.height || o.dz > bin.depth) continue;
    const key = `${o.dx}:${o.dy}:${o.dz}`;
    if (!unique.has(key)) unique.set(key, o);
  }

  // Lying flatter is operationally preferable and avoids needless stacking.
  // After height, use the larger footprint / longer X edge first so big pieces
  // establish clean rectangular residual space for the smaller pieces.
  return [...unique.values()].sort(
    (a, b) =>
      a.dy - b.dy ||
      b.dx * b.dz - a.dx * a.dz ||
      b.dx - a.dx ||
      b.dz - a.dz ||
      a.rotation - b.rotation,
  );
}

function overlapsFloor(
  x: number,
  z: number,
  dx: number,
  dz: number,
  p: FloorPlacement,
): boolean {
  const q = p.orientation;
  return x < p.x + q.dx && x + dx > p.x && z < p.z + q.dz && z + dz > p.z;
}

function candidatePoints(
  placed: readonly FloorPlacement[],
  binWidth: number,
  binDepth: number,
): Array<{ x: number; z: number }> {
  const xs = new Set<number>([0]);
  const zs = new Set<number>([0]);
  for (const p of placed) {
    xs.add(p.x + p.orientation.dx);
    zs.add(p.z + p.orientation.dz);
  }

  const points: Array<{ x: number; z: number }> = [];
  for (const z of zs) {
    if (z < 0 || z >= binDepth) continue;
    for (const x of xs) {
      if (x < 0 || x >= binWidth) continue;
      points.push({ x, z });
    }
  }

  // Front-to-back, then left-to-right: deterministic and easy for a packer to
  // reproduce by eye at the fulfilment table.
  points.sort((a, b) => a.z - b.z || a.x - b.x);
  return points;
}

function itemDifficulty(a: PackingItemSpec, b: PackingItemSpec): number {
  const av = a.widthMm * a.heightMm * a.depthMm;
  const bv = b.widthMm * b.heightMm * b.depthMm;
  if (av !== bv) return bv - av;
  const ae = Math.max(a.widthMm, a.heightMm, a.depthMm);
  const be = Math.max(b.widthMm, b.heightMm, b.depthMm);
  if (ae !== be) return be - ae;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * Find a one-carton arrangement with every item resting directly on the floor.
 * Returns null when no arrangement is found or when the bounded search budget is
 * exhausted; null never means the order is impossible, only that the existing
 * 3-D engine should get the next attempt.
 */
export function packSingleCartonFloorFirst(
  carton: CartonSpec,
  items: readonly PackingItemSpec[],
): PackedCarton | null {
  if (items.length === 0 || items.length > FLOOR_FIRST_MAX_ITEMS) return null;
  if (carton.availableQty <= 0) return null;

  const bin = usableInterior(carton);
  if (bin.width <= 0 || bin.height <= 0 || bin.depth <= 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + item.weightG, 0);
  if (totalWeight > carton.maxWeightG) return null;

  const ordered = [...items].sort(itemDifficulty);
  const orientations = new Map<string, Orientation[]>();
  for (const item of ordered) {
    const os = legalFloorOrientations(item, bin);
    if (os.length === 0) return null;
    orientations.set(item.key, os);
  }

  let states = 0;
  const placed: FloorPlacement[] = [];

  const search = (index: number): boolean => {
    if (index >= ordered.length) return true;
    if (states >= FLOOR_FIRST_MAX_STATES) return false;

    const item = ordered[index]!;
    const os = orientations.get(item.key)!;
    const points = candidatePoints(placed, bin.width, bin.depth);

    for (const point of points) {
      for (const o of os) {
        states++;
        if (states > FLOOR_FIRST_MAX_STATES) return false;
        if (point.x + o.dx > bin.width || point.z + o.dz > bin.depth) continue;
        if (placed.some((p) => overlapsFloor(point.x, point.z, o.dx, o.dz, p))) continue;

        placed.push({ item, x: point.x, z: point.z, orientation: o });
        if (search(index + 1)) return true;
        placed.pop();
      }
    }
    return false;
  };

  if (!search(0)) return null;

  const resultItems: PlacedItem[] = placed
    .map((p) => ({
      key: p.item.key,
      item: p.item,
      xMm: p.x,
      yMm: 0,
      zMm: p.z,
      dxMm: p.orientation.dx,
      dyMm: p.orientation.dy,
      dzMm: p.orientation.dz,
      rotationType: p.orientation.rotation,
    }))
    .sort((a, b) => a.zMm - b.zMm || a.xMm - b.xMm || (a.key < b.key ? -1 : 1));

  return { cartonIndex: 0, carton, items: resultItems };
}
