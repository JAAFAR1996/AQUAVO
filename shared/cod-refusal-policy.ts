// AQUAVO COD refusal policy — canonical, business-approved rules.
//
// A COD refusal happens BEFORE the customer accepts the goods. It is not a
// completed sale and it is not a post-delivery customer return.

export const COD_REFUSAL_STATUSES = [
  "rejected",
  "rejected_carrier",
  "rejected_returned",
] as const;

export type CodRefusalStatus = (typeof COD_REFUSAL_STATUSES)[number];

const COD_REFUSAL_SET = new Set<string>(COD_REFUSAL_STATUSES);

export function isCodRefusalStatus(status: string | null | undefined): status is CodRefusalStatus {
  return COD_REFUSAL_SET.has((status ?? "").trim().toLowerCase());
}

export const AQUAVO_ORDER_PREPARATION_POLICY = Object.freeze({
  giftSticker: Object.freeze({ quantityPerOrder: 1, unitCostIqd: 50 }),
  thankYouCard: Object.freeze({ quantityPerOrder: 1, unitCostIqd: 100 }),
});

export interface CodRefusalFinancialInput {
  refundAmount?: number;
  deliveryCostLoss?: number;
  returnShippingCost?: number;
  packagingLoss?: number;
  productWriteOffAmount?: number;
  cogsLoss?: number;
  restocked?: boolean;
}

/**
 * Business-approved financial facts for a full COD refusal:
 * - customer paid nothing, so refund is zero;
 * - carrier charges AQUAVO nothing for the refusal/return;
 * - all products remain sellable, so product write-off and COGS loss are zero;
 * - the product quantity is returned to sellable availability;
 * - carton damage is a reclassification of the shipment preparation cost,
 *   never a second additive expense on the return event.
 */
export function normalizeFullCodRefusalFinancials(
  _input: CodRefusalFinancialInput = {},
): Required<CodRefusalFinancialInput> {
  return {
    refundAmount: 0,
    deliveryCostLoss: 0,
    returnShippingCost: 0,
    packagingLoss: 0,
    productWriteOffAmount: 0,
    cogsLoss: 0,
    restocked: true,
  };
}

export interface DiscountAllocationLine {
  id: string;
  grossIqd: number;
}

export interface AllocatedDiscountLine extends DiscountAllocationLine {
  discountIqd: number;
  netIqd: number;
}

function assertWholeIqd(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative whole IQD amount`);
  }
}

/**
 * Allocate an order-level discount proportionally across item lines.
 * Uses the largest-remainder method with a stable id tie-breaker, so allocated
 * line discounts always add up exactly to the order discount with no lost dinar.
 */
export function allocateDiscountProportionally(
  lines: readonly DiscountAllocationLine[],
  totalDiscountIqd: number,
): AllocatedDiscountLine[] {
  assertWholeIqd(totalDiscountIqd, "totalDiscountIqd");
  if (lines.length === 0) {
    if (totalDiscountIqd !== 0) throw new Error("Cannot allocate a discount without lines");
    return [];
  }

  const seen = new Set<string>();
  for (const line of lines) {
    if (!line.id || seen.has(line.id)) throw new Error("Discount allocation line ids must be unique");
    seen.add(line.id);
    assertWholeIqd(line.grossIqd, `grossIqd:${line.id}`);
  }

  const totalGross = lines.reduce((sum, line) => sum + line.grossIqd, 0);
  if (totalDiscountIqd > totalGross) throw new Error("Discount cannot exceed order gross");
  if (totalGross === 0) {
    if (totalDiscountIqd !== 0) throw new Error("Cannot allocate a discount across zero-value lines");
    return lines.map((line) => ({ ...line, discountIqd: 0, netIqd: 0 }));
  }

  const provisional = lines.map((line) => {
    const numerator = totalDiscountIqd * line.grossIqd;
    const floor = Math.floor(numerator / totalGross);
    return {
      ...line,
      discountIqd: floor,
      remainder: numerator % totalGross,
    };
  });

  let dinarsLeft = totalDiscountIqd - provisional.reduce((sum, line) => sum + line.discountIqd, 0);
  const priority = [...provisional].sort((a, b) =>
    b.remainder - a.remainder || a.id.localeCompare(b.id),
  );
  for (let i = 0; i < priority.length && dinarsLeft > 0; i += 1, dinarsLeft -= 1) {
    priority[i].discountIqd += 1;
  }

  const byId = new Map(priority.map((line) => [line.id, line.discountIqd]));
  return lines.map((line) => {
    const discountIqd = byId.get(line.id) ?? 0;
    return { ...line, discountIqd, netIqd: line.grossIqd - discountIqd };
  });
}

/** Store credit has no expiry and may be consumed partially, but never below zero. */
export function debitStoreCredit(currentBalanceIqd: number, requestedIqd: number): number {
  assertWholeIqd(currentBalanceIqd, "currentBalanceIqd");
  assertWholeIqd(requestedIqd, "requestedIqd");
  if (requestedIqd > currentBalanceIqd) throw new Error("Store credit balance is insufficient");
  return currentBalanceIqd - requestedIqd;
}
