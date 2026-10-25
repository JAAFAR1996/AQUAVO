import { describe, expect, it } from 'vitest';
import { productChoiceFacts } from './product-choice-facts';
describe('catalogue choice facts', () => {
  it('never infers aquarium fit from power, names or marketing benefits', () => {
    expect(productChoiceFacts({ power: '20W', name: '100 L filter', benefits: ['fits all tanks'], __cost: 12 })).toEqual([]);
  });
  it('preserves explicit constraints and exact units', () => {
    expect(productChoiceFacts({ 'يحتاج': 'مضخة هواء', 'القياس': '12/16 ملم' })).toEqual([
      { kind: 'size', label: 'القياس', value: '12/16 ملم' }, { kind: 'requirement', label: 'يحتاج', value: 'مضخة هواء' },
    ]);
  });
  it('does not mix base size with the selected option dimensions', () => {
    expect(productChoiceFacts({ 'الحجم': '10 سم', 'يحتاج': 'مضخة' }, { 'الأبعاد': '20×30 سم' }).filter(x => x.kind === 'size')).toEqual([{kind:'size',label:'الأبعاد',value:'20×30 سم'}]);
  });
  it('withholds size before a required option is chosen', () => {
    expect(productChoiceFacts({ 'الحجم': '10 سم', 'يحتاج': 'مضخة' }, undefined, true)).toEqual([{kind:'requirement',label:'يحتاج',value:'مضخة'}]);
  });
  it('does not stringify missing or malformed catalogue records', () => {
    expect(productChoiceFacts({ 'التوافق': {}, 'الحجم': null, 'يحتاج': false, 'الأبعاد': '  ' })).toEqual([]);
  });
  it('honors explicit option overrides and does not mutate source records', () => {
    const base=Object.freeze({'التوافق':'عام','الحجم':'20 سم'});const variant=Object.freeze({'التوافق':null,'الحجم':'30 سم'});
    expect(productChoiceFacts(base,variant)).toEqual([{kind:'size',label:'الحجم',value:'30 سم'}]);
  });
});
