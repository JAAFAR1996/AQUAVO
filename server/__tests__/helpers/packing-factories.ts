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
    safetyPaddingMm: 0,
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

/** A carton roomy enough that bounds and weight never fire incidentally. */
export function box(items: PlacedItem[]): PackedCarton[] {
  return [{ cartonIndex: 0, carton: carton("T", 100, 100, 100, 1000), items }];
}
