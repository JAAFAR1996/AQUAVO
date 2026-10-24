import { describe, it, expect } from 'vitest';
import { getVariantGallery } from './variant-gallery';
describe('exclusive variant galleries', () => {
  const product = { images: ['mixed-red', 'mixed-brown'], image: 'mixed' };
  const red = { images: ['red-hero', 'red-macro', 'red-use'] };
  const brown = { images: ['brown-hero', 'brown-macro', 'brown-use'] };
  it('shows exactly the selected type and deduplicates', () => {
    expect(getVariantGallery(product, red, [red, brown])).toEqual(red.images);
    expect(getVariantGallery(product, brown, [red, brown])).toEqual(brown.images);
    expect(getVariantGallery(product, { images: ['one', 'one'] })).toEqual(['one']);
  });
  it('shows one preview type before an explicit purchase choice, never mixed', () => {
    expect(getVariantGallery(product, null, [red, brown])).toEqual(red.images);
  });
  it('explicit no verified photo never leaks another option', () => {
    expect(getVariantGallery(product, { images: [] })).toEqual([]);
    expect(getVariantGallery(product, null, [{ images: [] }, brown])).toEqual([]);
    expect(getVariantGallery(product, { isArchived: true, images: ['old'] })).toEqual([]);
  });
  it('keeps legacy fallback only when images field is absent', () => {
    expect(getVariantGallery(product, { image: 'legacy' })).toEqual(['legacy', ...product.images]);
  });
});
