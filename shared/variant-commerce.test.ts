import { describe, it, expect } from 'vitest';
import { isVariantActive, isVariantPurchasable, positiveVariantPrice } from './variant-commerce';
describe('variant commerce eligibility', () => {
  it('allows a priced, stocked explicit option only', () => {
    expect(isVariantPurchasable({ price: 3000, stock: 2 }, 2)).toBe(true);
    expect(isVariantPurchasable({ price: 3000, stock: 2 }, 3)).toBe(false);
    expect(isVariantPurchasable({ price: 3000, stock: 0 })).toBe(false);
  });
  it.each([null, undefined, '', ' ', 0, -5, NaN, Infinity])('rejects unknown price %s without a parent fallback', price => {
    expect(positiveVariantPrice(price)).toBeNull();
    expect(isVariantPurchasable({ price, stock: 10 })).toBe(false);
  });
  it('preserves archive metadata but excludes new commerce', () => {
    expect(isVariantActive({ isArchived: true })).toBe(false);
    expect(isVariantPurchasable({ isArchived: true, price: 3000, stock: 2 })).toBe(false);
    expect(isVariantPurchasable({ availabilityStatus: 'coming_soon', price: 3000, stock: 2 })).toBe(false);
    expect(isVariantPurchasable({ priceStatus: 'pending', price: 3000, stock: 2 })).toBe(false);
  });
});
