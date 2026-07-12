interface CheckoutOrderResponse {
  total?: unknown;
  roundedTotal?: unknown;
  loyalty?: { roundedTotal?: unknown } | null;
}

const asFiniteAmount = (value: unknown): number | null => {
  const normalized = typeof value === "string" ? value.replaceAll(",", "").trim() : value;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

/** Select the amount the customer will actually pay, preferring server authority. */
export function resolveCheckoutTotal(order: CheckoutOrderResponse, visibleFallback: number): number {
  return asFiniteAmount(order.loyalty?.roundedTotal)
    ?? asFiniteAmount(order.roundedTotal)
    ?? asFiniteAmount(order.total)
    ?? Math.max(0, visibleFallback);
}
