// One packaging cost per order, from one source.
//
// Two paths exist and they must never be added together:
//   * orders.box_cost — a hand-entered figure, present (often 0) on every one of
//     the historical orders. Legacy audit evidence.
//   * order_fulfillment_lines — immutable per-material snapshots frozen at
//     shipment. Canonical for anything the fulfillment system has touched.
//
// The rule is either/or: if an order has confirmed fulfillment evidence, that is
// the packaging cost. Otherwise the legacy figure stands. Summing them would
// double-charge, and preferring box_cost on a fulfilled order would ignore the
// better evidence.
//
// This is deliberately shaped so nothing historical moves. Orders with no
// fulfillment events resolve to exactly the box_cost they resolve to today, so
// every historical profit figure is unchanged by construction — not by luck, and
// a golden test pins it.
import { toMoneyOrNull } from "../../shared/order-financials.js";

export type PackagingCostSource = "fulfillment" | "legacy_box_cost";
export type PackagingCostStatus = "exact" | "estimated" | "incomplete" | "unknown" | "legacy";

export interface ResolvedPackagingCost {
  /** null = genuinely unknown. Never coerced to 0. */
  value: number | null;
  source: PackagingCostSource;
  status: PackagingCostStatus;
  /** Always carried through for audit, even when the fulfillment path wins. */
  legacyBoxCost: number | null;
}

export interface OrderLike {
  boxCost?: string | number | null;
}

export interface FulfillmentLike {
  eventCount: number;
  totalFulfillmentCost: number | null;
  status: PackagingCostStatus;
}

/**
 * Decide which packaging cost an order actually has.
 *
 * `eventCount` is the discriminator rather than a non-null cost: an order can
 * have a confirmed shipment whose carton price was never recorded. That order's
 * packaging cost is UNKNOWN, not "fall back to the legacy number" — the legacy
 * number describes a different accounting era and would silently paper over a
 * missing cost.
 */
export function resolvePackagingCost(
  order: OrderLike,
  fulfillment: FulfillmentLike | null | undefined,
): ResolvedPackagingCost {
  const legacyBoxCost = toMoneyOrNull(order.boxCost ?? null);

  if (fulfillment && fulfillment.eventCount > 0) {
    return {
      value: fulfillment.totalFulfillmentCost,
      source: "fulfillment",
      status: fulfillment.status,
      legacyBoxCost,
    };
  }

  return {
    value: legacyBoxCost,
    source: "legacy_box_cost",
    status: "legacy",
    legacyBoxCost,
  };
}

/**
 * May `orders.box_cost` still be edited by hand?
 *
 * No, once fulfillment evidence exists — otherwise the two sources could drift
 * apart and a reader would have no way to tell which one is current. The API
 * layer turns a false here into a 409.
 */
export function isLegacyBoxCostEditable(fulfillment: FulfillmentLike | null | undefined): boolean {
  return !fulfillment || fulfillment.eventCount === 0;
}

export interface OrderProfitInput {
  /** Amount collected MINUS carrier/delivery fee — see the note below. */
  revenue: number;
  cogs: number | null;
  packaging: ResolvedPackagingCost;
}

export interface OrderProfitBreakdown {
  revenue: number;
  cogs: number | null;
  packagingCost: number | null;
  packagingSource: PackagingCostSource;
  packagingStatus: PackagingCostStatus;
  /** null whenever any component is unknown — never a confident wrong number. */
  netProfit: number | null;
  complete: boolean;
}

/**
 * Internal profit for one order.
 *
 * DELIVERY IS ALREADY OUT. `revenue` arrives as collected-minus-shipping,
 * matching the existing engine (accounting-engine.ts computes
 * `orderCollectedAmount(order) - shipping`). Subtracting the carrier fee again
 * here as a separate cost line would deduct it twice. It is displayed as its own
 * line in the breakdown UI; it is only ever arithmetically removed once.
 *
 * Packaging covers the carton plus every active preparation cost — the 50 IQD
 * sticker and the 100 IQD card included — because all of them are frozen as
 * lines of the same fulfillment event.
 */
export function computeOrderProfit(input: OrderProfitInput): OrderProfitBreakdown {
  const packagingCost = input.packaging.value;
  const complete = input.cogs != null && packagingCost != null;
  return {
    revenue: input.revenue,
    cogs: input.cogs,
    packagingCost,
    packagingSource: input.packaging.source,
    packagingStatus: input.packaging.status,
    netProfit: complete ? input.revenue - (input.cogs as number) - (packagingCost as number) : null,
    complete,
  };
}
