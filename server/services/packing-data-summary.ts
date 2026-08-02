export const REQUIRED_PACKING_FIELDS = [
  "packed_height_cm",
  "packed_width_cm",
  "packed_depth_cm",
  "packed_weight_kg",
] as const;

export type RequiredPackingField = (typeof REQUIRED_PACKING_FIELDS)[number];

export interface PackingCompletenessSourceRow {
  productId: string;
  productName: string;
  variantId: string | null;
  packedHeightCm: unknown;
  packedWidthCm: unknown;
  packedDepthCm: unknown;
  packedWeightKg: unknown;
  manualReview: boolean;
}

export interface PackingCompletenessItem {
  productId: string;
  productName: string;
  variantId: string | null;
  missing: RequiredPackingField[];
  complete: boolean;
  manualReview: boolean;
}

export interface PackingCompletenessSummary {
  withoutHeight: number;
  withoutWidth: number;
  withoutDepth: number;
  withoutWeight: number;
  complete: number;
  manualReview: number;
  affectedUnique: number;
  total: number;
}

function missingFields(row: PackingCompletenessSourceRow): RequiredPackingField[] {
  const missing: RequiredPackingField[] = [];
  if (row.packedHeightCm == null) missing.push("packed_height_cm");
  if (row.packedWidthCm == null) missing.push("packed_width_cm");
  if (row.packedDepthCm == null) missing.push("packed_depth_cm");
  if (row.packedWeightKg == null) missing.push("packed_weight_kg");
  return missing;
}

export function summarisePackingCompleteness(rows: PackingCompletenessSourceRow[]): {
  items: PackingCompletenessItem[];
  summary: PackingCompletenessSummary;
} {
  const items = rows.map((row) => {
    const missing = missingFields(row);
    return {
      productId: row.productId,
      productName: row.productName,
      variantId: row.variantId,
      missing,
      complete: missing.length === 0,
      manualReview: row.manualReview,
    };
  });

  const has = (item: PackingCompletenessItem, field: RequiredPackingField) => item.missing.includes(field);
  const affectedUnique = new Set(
    items.filter((item) => !item.complete || item.manualReview).map((item) => item.productId),
  ).size;

  return {
    items,
    summary: {
      withoutHeight: items.filter((item) => has(item, "packed_height_cm")).length,
      withoutWidth: items.filter((item) => has(item, "packed_width_cm")).length,
      withoutDepth: items.filter((item) => has(item, "packed_depth_cm")).length,
      withoutWeight: items.filter((item) => has(item, "packed_weight_kg")).length,
      complete: items.filter((item) => item.complete).length,
      manualReview: items.filter((item) => item.manualReview).length,
      affectedUnique,
      total: items.length,
    },
  };
}
