import { describe, expect, it } from 'vitest';
import { productIntro, variantChoiceHint, visibleProductSpecs } from './product-decision';

describe('Product decision presentation', () => {
  it('uses an existing benefit or complete short paragraph without inventing copy', () => {
    expect(productIntro('Full description', ' Practical benefit ')).toBe('Practical benefit');
    expect(productIntro('First paragraph\n\nDetails', null)).toBe('First paragraph');
    expect(productIntro('x'.repeat(300), null)).toBe('');
    expect(productIntro('First sentence. ' + 'x'.repeat(300), null)).toBe('First sentence.');
  });
  it('never derives capacity from wattage or promotes disputed heater ranges', () => {
    expect(variantChoiceHint({ 'القدرة': '100 واط' })).toBeUndefined();
    expect(variantChoiceHint({ 'حجم الحوض المناسب': '50–100 لتر' }, 'yee-3006')).toBeUndefined();
    expect(variantChoiceHint({ 'عدد الاختبارات': '50 اختبار' }, 'c3-1010')).toBe('50 اختبار');
  });
  it('merges selected specifications without mutating source data and hides disputed fit', () => {
    const base = { 'المادة': 'ستانلس', 'مناسب': '20–50 لتر' };
    const variant = { 'القدرة': '100 واط', 'حجم الحوض المناسب': '50–100 لتر' };
    expect(visibleProductSpecs(base, variant, 'yee-3006')).toEqual({ 'المادة': 'ستانلس', 'القدرة': '100 واط' });
    expect(base['مناسب']).toBe('20–50 لتر');
    expect(variant['حجم الحوض المناسب']).toBe('50–100 لتر');
  });
});
