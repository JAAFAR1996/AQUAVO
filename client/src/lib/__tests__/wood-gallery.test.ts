import { describe, expect, it } from 'vitest';
import { adaptWoodProducts, type WoodProductSource } from '../wood-gallery';

const piece = (overrides: Partial<WoodProductSource> = {}): WoodProductSource => ({
  id: 'aquavo-driftwood-dw-01', slug: 'aquavo-driftwood-dw-01', name: 'Natural wood DW-01',
  price: '28000', stock: 1, images: ['/catalogue/dw-01.webp'], hasVariants: false,
  specifications: { 'رمز القطعة': 'DW-01', 'ملاحظة': 'الشكل المعروض هو نفس القطعة التي تستلمها', __model3d: { pieceCode: 'DW-01' } },
  ...overrides,
});
const identity = { verified: true, productId: 'aquavo-driftwood-dw-01', pieceCode: 'DW-01', source: 'Test-only source record' };
const measurement = { ...identity, label: 'Length', value: 34, unit: 'cm' };
const photo = { ...identity, src: '/test/second.webp', kind: 'actual-product-photo', individuallyTracked: true, role: 'second-angle' };

describe('adaptWoodProducts', () => {
  it('uses original catalogue photos, live prices and stock without changing records', () => {
    const product = piece();
    const before = JSON.stringify(product);
    expect(adaptWoodProducts([product])).toEqual([{
      id: product.id, name: product.name, href: '/products/aquavo-driftwood-dw-01', pieceCode: 'DW-01',
      stock: 1, price: 28000, availability: 'available', samePieceBasis: 'catalogue-declaration',
      photos: [{ src: '/catalogue/dw-01.webp', role: 'catalogue' }], measurements: [],
    }]);
    expect(JSON.stringify(product)).toBe(before);
  });
  it('does not admit generic families, variants, archived records, or unsupported identity', () => {
    const invalid = [
      piece({ id: 'houyi-polished-driftwood' }), piece({ hasVariants: true }), piece({ isArchived: true }),
      piece({ specifications: {} }), piece({ specifications: { 'رمز القطعة': 'DW-11', 'ملاحظة': 'الشكل المعروض هو نفس القطعة التي تستلمها' } }),
      piece({ specifications: { 'رمز القطعة': 'DW-01', 'ملاحظة': 'الشكل المعروض هو نفس القطعة التي تستلمها', __model3d: { pieceCode: 'DW-11' } } }),
      piece({ stock: 2 }), piece({ stock: -1 }), piece({ stock: undefined }), piece({ stock: '' }), piece({ stock: true }),
      piece({ images: ['javascript:alert(1)', '//external.test/a.jpg'] }), piece({ slug: '' }),
    ];
    expect(adaptWoodProducts(invalid)).toEqual([]);
  });
  it('keeps unknown, pending and incoming prices out of an available purchase claim', () => {
    expect(adaptWoodProducts([piece({ stock: 0 })])[0]).toMatchObject({ price: 28000, availability: 'unavailable' });
    expect(adaptWoodProducts([piece({ stock: '1', priceStatus: 'pending' })])[0]).toMatchObject({ price: null, availability: 'pending' });
    expect(adaptWoodProducts([piece({ price: '0' })])[0]).toMatchObject({ price: null, availability: 'pending' });
    expect(adaptWoodProducts([piece({ stock: 0, availabilityStatus: 'coming_soon' })])[0]).toMatchObject({ price: null, availability: 'coming-soon' });
    expect(adaptWoodProducts([piece({ stock: 1, availabilityStatus: 'coming_soon' })])[0]).toMatchObject({ availability: 'available' });
    const source = piece();
    expect(adaptWoodProducts([piece({ stock: 0, specifications: { ...source.specifications as object, __availabilityStatus: 'coming_soon' } })])[0]).toMatchObject({ price: null, availability: 'coming-soon' });
  });
  it('never treats ordinary gallery angles, model dimensions or approximate text as measured evidence', () => {
    const source = piece();
    const result = adaptWoodProducts([piece({ images: ['/catalogue/a.webp', '/catalogue/b.webp'], specifications: { ...source.specifications as object, 'الطول': '34 سم', __model3d: { pieceCode: 'DW-01', length: 34 } } })])[0];
    expect(result.photos.every(value => value.role === 'catalogue')).toBe(true);
    expect(result.measurements).toEqual([]);
  });
  it('validates measured and photographic provenance against the exact product and piece', () => {
    const result = adaptWoodProducts([piece()], { evidenceById: { 'aquavo-driftwood-dw-01': {
      measurements: [measurement, { ...measurement, pieceCode: 'DW-11' }, { ...measurement, value: 0 }, { ...measurement, verified: false }],
      photos: [photo, { ...photo, src: '/test/ruler.webp', role: 'ruler' }, { ...photo, src: '/test/use.webp', role: 'in-use', productId: 'other' }, { ...photo, src: '/test/generated.webp', kind: 'generated' }],
    } } })[0];
    expect(result.measurements).toEqual([measurement]);
    expect(result.photos.map(value => value.role)).toEqual(['catalogue', 'second-angle', 'ruler']);
  });
  it('rejects ruler photo claims without sourced measurements and never relabels the original image', () => {
    const result = adaptWoodProducts([piece()], { evidenceById: { 'aquavo-driftwood-dw-01': {
      photos: [{ ...photo, role: 'ruler' }, { ...photo, src: '/catalogue/dw-01.webp' }],
    } } })[0];
    expect(result.photos).toEqual([{ src: '/catalogue/dw-01.webp', role: 'catalogue' }]);
  });
  it('deduplicates products and images and only uses safe image URLs', () => {
    const source = piece({ images: ['/catalogue/dw-01.webp', '/catalogue/dw-01.webp', 'data:invalid'], thumbnail: 'https://cdn.test/dw-01.webp' });
    const result = adaptWoodProducts([source, source]);
    expect(result).toHaveLength(1);
    expect(result[0].photos).toHaveLength(2);
  });
  it('does not reuse one piece’s evidence for another', () => {
    const result = adaptWoodProducts([piece()], { evidenceById: { 'aquavo-driftwood-dw-01': { measurements: [{ ...measurement, productId: 'aquavo-driftwood-dw-11' }], photos: [{ ...photo, pieceCode: 'DW-11' }] } } });
    expect(result[0].measurements).toEqual([]);
    expect(result[0].photos).toHaveLength(1);
  });
});
