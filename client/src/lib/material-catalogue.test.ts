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

describe('populated material catalogue facts and options', () => {
  it('preserves all distinct safe gallery images without inventing physical evidence', () => {
    const [item] = adaptMaterialProducts([{ ...product, thumbnail: '/hero.jpg', image: '/hero.jpg', images: ['/hero.jpg', 'https://example.test/detail.webp', 'javascript:bad', '//other.test/image.jpg'], specifications: { 'حجم الحبيبات': '1–2 ملم بحسب بيانات المنتج', 'وحدة البيع': 'كغم', costPrice: 99, __private: 'hidden' } }]);
    expect(item.gallery).toEqual(['/hero.jpg', 'https://example.test/detail.webp']);
    expect(item.facts).toEqual([{ key: 'حجم الحبيبات', label: 'حجم الحبيبات', value: '1–2 ملم بحسب بيانات المنتج', kind: 'grain' }, { key: 'وحدة البيع', label: 'وحدة البيع', value: 'كغم', kind: 'saleUnit' }]);
    expect(item.facts.some(fact => fact.kind === 'weight')).toBe(false);
    expect(item.measurements).toEqual([]);
    expect(item.pair).toBeUndefined();
  });
  it('does not infer a 5kg weight from the Dutch legacy variant ID', () => {
    const [item] = adaptMaterialProducts([{ ...product, hasVariants: true, variants: [
      { id: 'current-5kg', label: '1 ملم — يباع بالكيلو', isDefault: true, price: 3849, stock: 1, images: ['/dutch.jpg'], specifications: { 'حجم الحبيبات': '1 ملم', 'وحدة البيع': '1 كغم' } },
      { id: '5kg', label: '5 كغ', price: 10000, stock: 0, isArchived: true },
    ] }]);
    expect(item.variants).toHaveLength(1);
    expect(item.variants[0]).toMatchObject({ id: 'current-5kg', label: '1 ملم — يباع بالكيلو', price: 3849, availability: 'available', gallery: ['/dutch.jpg'] });
    expect(item.variants[0].facts.some(fact => fact.kind === 'weight')).toBe(false);
    expect(item.variants[0].facts.map(fact => fact.value)).toEqual(['1 ملم', '1 كغم']);
  });
  it('never reuses parent or another option imagery and respects explicitly empty images', () => {
    const [item] = adaptMaterialProducts([{ ...product, hasVariants: true, variants: [
      { id: 'own', label: 'Own', price: 100, stock: 1, image: '/own.jpg' },
      { id: 'empty', label: 'Empty', price: 100, stock: 1, image: '/must-not-use.jpg', images: [] },
      { id: 'missing', label: 'Missing', price: 100, stock: 1 },
      { id: 'old', label: 'Archived', price: 100, stock: 1, isArchived: true, images: ['/old.jpg'] },
    ] }]);
    expect(item.variants.map(variant => variant.gallery)).toEqual([['/own.jpg'], [], []]);
    expect(item.variants.some(variant => variant.id === 'old')).toBe(false);
  });
  it('uses the selected stream option dimensions and removes conflicting parent title size', () => {
    const [item] = adaptMaterialProducts([{ ...product, slug: 'houyi-stream-sand', name: 'رمل جداول طبيعي للأكواسكيب — 2–6 ملم', hasVariants: true, specifications: { 'حجم الحبيبات': '2–6 ملم' }, variants: [
      { id: '5-8mm', label: '5–8 ملم — قريبا', price: 999, priceStatus: 'pending', availabilityStatus: 'coming_soon', stock: 0, specifications: { 'المقاس': '5–8 ملم' }, images: ['/exact-5-8.jpg'] },
    ] }]);
    expect(item.variants[0]).toMatchObject({ name: 'رمل جداول طبيعي للأكواسكيب — 5–8 ملم', price: null, comingSoon: true, availability: 'comingSoon' });
    expect(item.variants[0].facts.map(fact => fact.value)).toEqual(['5–8 ملم']);
  });
  it('retains source approximations and unit uncertainty without coercion', () => {
    const [item] = adaptMaterialProducts([{ ...product, specifications: { 'نطاق المقاس التقريبي': '20–60 سم', 'بيان المقاس': 'وحدة القياس غير مذكورة', 'الوزن': 5 } }]);
    expect(item.facts.map(fact => [fact.label, fact.value])).toEqual([['نطاق المقاس التقريبي', '20–60 سم'], ['بيان المقاس', 'وحدة القياس غير مذكورة'], ['الوزن', '5']]);
    expect(item.measurements).toEqual([]);
  });
  it('uses provided public labelled translations only for allowlisted keys', () => {
    const [item] = adaptMaterialProducts([{ ...product, specifications: { 'حجم الحبيبات': '1 ملم', labelled: { 'حجم الحبيبات': { label: 'Grain size', value: '1 mm' }, costPrice: { label: 'Do not expose', value: '90' } } } as unknown as MaterialProductSource['specifications'] }]);
    expect(item.facts).toEqual([{ key: 'حجم الحبيبات', label: 'Grain size', value: '1 mm', kind: 'grain' }]);
  });
  it('never presents a stocked pending-price option as available or exposes its price', () => {
    const [item] = adaptMaterialProducts([{ ...product, hasVariants: true, variants: [{ id: 'pending', label: 'Pending', stock: 5, price: 990, priceStatus: 'pending' }] }]);
    expect(item.variants[0]).toMatchObject({ price: null, availability: 'unknown' });
  });
});

describe('localized catalogue identity', () => {
  it('keeps known materials classified when subcategory labels are translated differently', () => {
    expect(adaptMaterialProducts([{ ...product, id: 'houyi-dutch-sand', subcategory: 'Decorative aquarium sand' }])[0].kind).toBe('sand');
    expect(adaptMaterialProducts([{ ...product, id: 'houyi-black-slate', subcategory: 'بەردی جوانکاری' }])[0].kind).toBe('stone');
    expect(adaptMaterialProducts([{ ...product, id: 'general-air-stone', subcategory: 'Air stones' }])).toEqual([]);
  });
});
