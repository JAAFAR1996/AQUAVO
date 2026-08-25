// Shared builders for carton-planner tests. Kept out of a *.test.ts file so
// importing them does not re-run another suite's cases.
import {
  ROTATION,
  cmToMm,
  kgToG,
  type CartonSpec,
  type PackedCarton,
  type PackingItemSpec,
  type PlacedItem,
} from "../../../shared/packing-types.js";

export function item(
  key: string,
  wCm: number,
  hCm: number,
  dCm: number,
  kg: number,
  over: Partial<PackingItemSpec> = {},
): PackingItemSpec {
  return {
    key,
    productId: key,
    variantId: null,
    seq: 1,
    name: key,
    widthMm: cmToMm(wCm),
    heightMm: cmToMm(hCm),
    depthMm: cmToMm(dCm),
    weightG: kgToG(kg),
    rotationAllowed: true,
    mustStayUpright: false,
    fragile: false,
    compressible: false,
    canSupportItemsAbove: true,
    maxSupportedWeightAboveG: kgToG(50),
    minSupportRatioBp: 0,
    maxOverhangRatioBp: -1,
    requiresFullBaseSupport: false,
    requiresSeparateCarton: false,
    maxQtyPerCarton: null,
    ...over,
  };
}

export function carton(
  sku: string,
  lenCm: number,
  widCm: number,
  heiCm: number,
  maxKg: number,
  over: Partial<CartonSpec> = {},
): CartonSpec {
  return {
    materialId: `mat-${sku}`,
    sku,
    name: `كارتونة ${sku}`,
    internalLengthMm: cmToMm(lenCm),
    internalWidthMm: cmToMm(widCm),
    internalHeightMm: cmToMm(heiCm),
    // Planner fixtures represent documented cartons. One millimetre is enough
    // to exercise the safety-clearance contract without changing the geometry
    // intent of unrelated tests. Tests that need a literal zero can override it.
    safetyPaddingMm: 1,
    maxWeightG: kgToG(maxKg),
    unitCost: 1000,
    availableQty: 10,
    ...over,
  };
}

/** Place an item at exact millimetre coordinates. */
export function placed(
  key: string,
  spec: PackingItemSpec,
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
): PlacedItem {
  return {
    key,
    item: { ...spec, key },
    xMm: x,
    yMm: y,
    zMm: z,
    dxMm: dx,
    dyMm: dy,
    dzMm: dz,
    rotationType: ROTATION.WHD,
  };
}

/**
 * A carton roomy enough that bounds and weight never fire incidentally.
 *
 * Sized past the 1000 mm placements these fixtures use on purpose. The usable
 * span is `internal - 2 * safetyPaddingMm`, so once 618c1c2f gave documented
 * cartons a 1 mm safety margin a 100 cm box stopped fitting a 100 cm item and
 * support-physics cases started failing on OUT_OF_BOUNDS instead. Growing the
 * box keeps the margin exercised here rather than switching it off.
 */
export function box(items: PlacedItem[]): PackedCarton[] {
  return [{ cartonIndex: 0, carton: carton("T", 110, 110, 110, 1000), items }];
}
