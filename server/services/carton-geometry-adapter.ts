// The boundary between AQUAVO's domain model and binpackingjs.
//
// Everything the engine sees is integer millimetres and integer grams. That is
// not cosmetic: the library scales decimals internally with `computeFactor()`,
// and feeding it whole numbers keeps that factor at 1 and removes an entire
// class of reproducibility question. Results come back on the same scale, so no
// conversion is needed on the way out either.
//
// AXIS CONTRACT — the single place it is expressed:
//   engine width  <- carton internal LENGTH  | item packed WIDTH
//   engine height <- carton internal HEIGHT  | item packed HEIGHT   (vertical)
//   engine depth  <- carton internal WIDTH   | item packed DEPTH
import { pack3D, type Bin3D, type Item3D, type Pack3DResult } from "binpackingjs/3d";
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
import { packSingleCartonFloorFirst } from "./carton-floor-first-packer.js";

/** Which orientations this item may legally take. */
export function allowedRotationsFor(item: PackingItemSpec): readonly RotationOrdinal[] {
  if (!item.rotationAllowed) return FIXED_ROTATION;
  if (item.mustStayUpright) return UPRIGHT_ROTATIONS;
  return ALL_ROTATION_ORDINALS;
}

/** Usable interior after the carton's safety padding is removed from both sides. */
export function paddedBin(carton: CartonSpec): {
  width: number;
  height: number;
  depth: number;
} {
  const pad = 2 * carton.safetyPaddingMm;
  return {
    width: Math.max(0, carton.internalLengthMm - pad),
    height: Math.max(0, carton.internalHeightMm - pad),
    depth: Math.max(0, carton.internalWidthMm - pad),
  };
}

export function toBin3D(carton: CartonSpec, index: number): Bin3D {
  const p = paddedBin(carton);
  return {
    // The engine identifies bins by name; index keeps duplicates of the same
    // carton type distinguishable when a plan opens several.
    name: `${index}:${carton.materialId}`,
    width: p.width,
    height: p.height,
    depth: p.depth,
    maxWeight: carton.maxWeightG,
  };
}

export function toItem3D(item: PackingItemSpec): Item3D {
  return {
    name: item.key,
    width: item.widthMm,
    height: item.heightMm,
    depth: item.depthMm,
    weight: item.weightG,
    allowedRotations: allowedRotationsFor(item) as Item3D["allowedRotations"],
  };
}

/** Does this single item fit the carton in any orientation it is allowed? */
export function itemFitsCarton(item: PackingItemSpec, carton: CartonSpec): boolean {
  const p = paddedBin(carton);
  if (item.weightG > carton.maxWeightG) return false;
  const dims: Array<[number, number, number]> = [];
  const { widthMm: w, heightMm: h, depthMm: d } = item;
  for (const r of allowedRotationsFor(item)) {
    switch (r) {
      case 0: dims.push([w, h, d]); break; // WHD
      case 1: dims.push([h, w, d]); break; // HWD
      case 2: dims.push([h, d, w]); break; // HDW
      case 3: dims.push([d, h, w]); break; // DHW
      case 4: dims.push([d, w, h]); break; // DWH
      case 5: dims.push([w, d, h]); break; // WDH
    }
  }
  return dims.some(([dx, dy, dz]) => dx <= p.width && dy <= p.height && dz <= p.depth);
}

/**
 * Convert the engine's result back into our domain shape.
 *
 * Returns null when anything at all is unplaced — a partial arrangement is not
 * a usable answer, and quietly dropping an item would be the worst possible
 * failure mode for a packing plan.
 */
export function fromPack3D(
  result: Pack3DResult,
  cartonsByBinName: ReadonlyMap<string, CartonSpec>,
  itemsByKey: ReadonlyMap<string, PackingItemSpec>,
): PackedCarton[] | null {
  if (result.unfitItems.length > 0) return null;

  const out: PackedCarton[] = [];
  let index = 0;
  for (const bin of result.packedBins) {
    if (bin.items.length === 0) continue; // an offered but unused carton
    const carton = cartonsByBinName.get(bin.name);
    if (!carton) return null;

    const items: PlacedItem[] = [];
    for (const pi of bin.items) {
      const spec = itemsByKey.get(pi.name);
      if (!spec) return null;
      items.push({
        key: pi.name,
        item: spec,
        xMm: pi.position[0],
        yMm: pi.position[1],
        zMm: pi.position[2],
        dxMm: pi.dimension[0],
        dyMm: pi.dimension[1],
        dzMm: pi.dimension[2],
        rotationType: pi.rotationType as RotationOrdinal,
      });
    }
    items.sort(
      (a, b) => a.yMm - b.yMm || a.xMm - b.xMm || a.zMm - b.zMm || (a.key < b.key ? -1 : 1),
    );
    out.push({ cartonIndex: index, carton, items });
    index++;
  }
  return out;
}

/**
 * One engine pass over a fixed set of offered cartons.
 *
 * For a single carton we first try a bounded, deterministic floor-first search.
 * That search explores alternate 90-degree orientations and side-by-side extreme
 * points before any stacking is considered. This closes an important gap in the
 * third-party greedy heuristic: a geometrically possible small carton should not
 * lose only because the first 3-D layout stacked an item that AQUAVO's safety
 * rules correctly refuse to stack.
 *
 * If no floor layout is found, the existing binpackingjs 3-D pass remains the
 * fallback. Multiple-carton attempts also continue to use the proven 3-D engine.
 */
export function runEngine(
  offeredCartons: readonly CartonSpec[],
  items: readonly PackingItemSpec[],
): PackedCarton[] | null {
  if (offeredCartons.length === 0 || items.length === 0) return null;

  if (offeredCartons.length === 1) {
    const floorPlan = packSingleCartonFloorFirst(offeredCartons[0]!, items);
    if (floorPlan) return [floorPlan];
  }

  const bins: Bin3D[] = [];
  const cartonsByBinName = new Map<string, CartonSpec>();
  offeredCartons.forEach((c, i) => {
    const bin = toBin3D(c, i);
    bins.push(bin);
    cartonsByBinName.set(bin.name, c);
  });

  const sorted = [...items].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const itemsByKey = new Map(sorted.map((i) => [i.key, i]));

  const result = pack3D({ bins, items: sorted.map(toItem3D) });
  return fromPack3D(result, cartonsByBinName, itemsByKey);
}
