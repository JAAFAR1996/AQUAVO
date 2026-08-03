export const COD_POLICY_VERSION = "v2_gross_includes_delivery_carrier_keeps_fee" as const;

export interface CodBreakdownInput {
  grossCollected: number;
  customerDeliveryFee: number;
  carrierFee: number;
}

export interface CodBreakdown extends CodBreakdownInput {
  productRevenue: number;
  merchantNet: number;
  deliverySubsidy: number;
  deliverySurplus: number;
}

function finiteNonNegative(value: number, field: keyof CodBreakdownInput): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite non-negative amount`);
  }
  return value;
}

/**
 * AQUAVO COD policy from 2026-08-01:
 * grossCollected already includes customer delivery. The carrier keeps its
 * actual fee and AQUAVO receives the remainder.
 */
export function computeCodBreakdown(input: CodBreakdownInput): CodBreakdown {
  const grossCollected = finiteNonNegative(input.grossCollected, "grossCollected");
  const customerDeliveryFee = finiteNonNegative(input.customerDeliveryFee, "customerDeliveryFee");
  const carrierFee = finiteNonNegative(input.carrierFee, "carrierFee");

  const productRevenue = grossCollected - customerDeliveryFee;
  const merchantNet = grossCollected - carrierFee;
  if (productRevenue < 0) {
    throw new RangeError("customerDeliveryFee cannot exceed grossCollected");
  }
  if (merchantNet < 0) {
    throw new RangeError("carrierFee cannot exceed grossCollected");
  }

  return {
    grossCollected,
    customerDeliveryFee,
    carrierFee,
    productRevenue,
    merchantNet,
    deliverySubsidy: Math.max(carrierFee - customerDeliveryFee, 0),
    deliverySurplus: Math.max(customerDeliveryFee - carrierFee, 0),
  };
}

export function assertCodBreakdownMatches(
  actual: CodBreakdown,
  expectedInput: CodBreakdownInput,
): void {
  const expected = computeCodBreakdown(expectedInput);
  for (const field of Object.keys(expected) as Array<keyof CodBreakdown>) {
    if (actual[field] !== expected[field]) {
      throw new Error(`COD accounting fact mismatch for ${field}: ${actual[field]} !== ${expected[field]}`);
    }
  }
}
