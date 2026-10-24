import { describe, expect, it } from 'vitest';
import { adaptMaterialProducts, verifiedMaterialEvidence, type MaterialProductSource } from './material-catalogue';
// Synthetic evidence exists in tests only, never in the production catalogue.
const product: MaterialProductSource = { id: 'test-sand', slug: 'test-sand', name: 'Test sand', category: 'Decor', subcategory: 'Sand', thumbnail: '/images/test-sand.jpg', stock: 2, price: 5000 };
const photo = { verified: true, source: 'Test-only photography record', productId: product.id, materialId: 'test-material', sampleId: 'test-sample', captureSetupId: 'test-setup', kind: 'actual-product-photo', src: '/test/dry.jpg' };
const pair = { dry: photo, wet: { ...photo, src: '/test/wet.jpg' } };
describe('material catalogue public adapter', () => {
  it('keeps actual links and photos without carrying private fields', () => {
    const input = { ...product, costPrice: 1234, packagingCost: 50 };
    expect(adaptMaterialProducts([input])[0]).toMatchObject({ href: '/products/test-sand', image: product.thumbnail, pair: undefined, measurements: [] });
    expect(adaptMaterialProducts([input])[0]).not.toHaveProperty('costPrice');
  });
  it('uses exact classification in three locales without equipment false positives', () => {
    expect(adaptMaterialProducts([{ ...product, subcategory: 'Sand cleaner' }])).toEqual([]);
    for (const subcategory of ['Sand', 'رمال', 'لم']) expect(adaptMaterialProducts([{ ...product, subcategory }])[0].kind).toBe('sand');
    for (const subcategory of ['Stones', 'أحجار', 'بەرد']) expect(adaptMaterialProducts([{ ...product, subcategory }])[0].kind).toBe('stone');
  });
  it('does not invent images or prices and rejects unsafe URLs', () => {
    expect(adaptMaterialProducts([{ ...product, price: 0, thumbnail: 'javascript:bad', images: [] }])[0]).toMatchObject({ image: null, price: null });
    expect(adaptMaterialProducts([{ ...product, thumbnail: '', images: ['/actual.jpg'] }])[0].image).toBe('/actual.jpg');
  });
  it('preserves incoming and unpriced guards', () => {
    expect(adaptMaterialProducts([{ ...product, stock: 0, specifications: { __availabilityStatus: 'coming_soon' } }])[0]).toMatchObject({ comingSoon: true, price: null });
    expect(adaptMaterialProducts([{ ...product, hasVariants: true, variants: [] }])[0].price).toBeNull();
  });
  it('never applies parent material evidence to variant products', () => {
    expect(adaptMaterialProducts([{ ...product, hasVariants: true }], { evidenceById: { [product.id]: { pair } } })[0].pair).toBeUndefined();
  });
  it('drops missing slug, deduplicates and encodes actual slug', () => {
    expect(adaptMaterialProducts([{ ...product, slug: '' }])).toEqual([]);
    expect(adaptMaterialProducts([product, product])).toHaveLength(1);
    expect(adaptMaterialProducts([{ ...product, slug: 'حجر حوض' }])[0].href).toBe(`/products/${encodeURIComponent('حجر حوض')}`);
  });
});
describe('verified material evidence gates', () => {
  it('accepts a sourced actual same-sample wet/dry pair', () => expect(verifiedMaterialEvidence(product.id, { pair }).pair).toEqual(pair));
  it.each([
    { ...pair, wet: { ...pair.wet, verified: false } },
    { ...pair, wet: { ...pair.wet, productId: 'other' } },
    { ...pair, wet: { ...pair.wet, materialId: 'other' } },
    { ...pair, wet: { ...pair.wet, sampleId: 'other' } },
    { ...pair, wet: { ...pair.wet, captureSetupId: 'other' } },
    { ...pair, wet: { ...pair.wet, source: '' } },
    { ...pair, wet: { ...pair.wet, kind: 'ai-generated' } },
    { ...pair, wet: { ...pair.wet, src: '' } },
    { ...pair, wet: { ...pair.wet, src: photo.src } }, { dry: photo },
  ])('rejects incomplete, unrelated or unsupported pair %#', candidate => expect(verifiedMaterialEvidence(product.id, { pair: candidate }).pair).toBeUndefined());
  it('requires verified same-product structured measurement and units', () => {
    const measurement = { verified: true, source: 'Test measurement record', productId: product.id, value: 2, unit: 'mm', label: 'Grain' };
    expect(verifiedMaterialEvidence(product.id, { measurements: [measurement] }).measurements).toEqual([measurement]);
    for (const invalid of [{ ...measurement, verified: false }, { ...measurement, source: '' }, { ...measurement, productId: 'other' }, { ...measurement, unit: '' }, { ...measurement, value: -1 }]) expect(verifiedMaterialEvidence(product.id, { measurements: [invalid] }).measurements).toEqual([]);
  });
  it('requires a tracked piece and its own image, never catalogue fallback', () => {
    const piece = { verified: true, source: 'Test piece ledger', productId: product.id, pieceId: 'test-piece-1', image: '/test/piece.jpg', kind: 'actual-product-photo', individuallyTracked: true };
    expect(verifiedMaterialEvidence(product.id, { piece }).piece).toEqual(piece);
    for (const invalid of [{ ...piece, individuallyTracked: false }, { ...piece, kind: 'ai-generated' }, { ...piece, productId: 'other' }, { ...piece, image: '' }, { ...piece, source: '' }]) expect(verifiedMaterialEvidence(product.id, { piece: invalid }).piece).toBeUndefined();
  });
});
