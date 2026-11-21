/** Public commercial facts only. No customer data or internal cost fields. */
export interface CheckoutQuote {
  items: Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  shippingCost: number;
  discount: number;
  amount: number;
}

const cents = (value: number): number => Math.round(value * 100);

/** Compare every quoted line as well as totals: equal totals can conceal changed items. */
export function checkoutQuotesMatch(expected: CheckoutQuote, actual: CheckoutQuote): boolean {
  const normalize = (quote: CheckoutQuote) => ({
    items: quote.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId || "",
      quantity: item.quantity,
      unitPrice: cents(item.unitPrice),
    })).sort((a, b) => a.productId.localeCompare(b.productId) || a.variantId.localeCompare(b.variantId)),
    subtotal: cents(quote.subtotal),
    shippingCost: cents(quote.shippingCost),
    discount: cents(quote.discount),
    amount: cents(quote.amount),
  });
  return JSON.stringify(normalize(expected)) === JSON.stringify(normalize(actual));
}

export class CheckoutQuoteChanged extends Error {
  readonly status = 409;
  readonly code = "CHECKOUT_QUOTE_CHANGED";
  constructor(readonly quote: CheckoutQuote) {
    super("تغيرت تفاصيل المبلغ. راجع التسعيرة الجديدة وأكدها قبل الدفع.");
    this.name = "CheckoutQuoteChanged";
  }
}
