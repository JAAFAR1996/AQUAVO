import { describe,it,expect } from 'vitest';
import { render,screen } from '@testing-library/react';
import type { Product } from '@/types';
import { VisualSpecPassport,visualPassportFacts } from '../visual-spec-passport';
const product={id:'p',slug:'p',name:'P',hasVariants:true,specifications:{'الأبعاد':'20×10×30 سم','التدفق الاسمي':'500 لتر/ساعة'},variants:[{id:'v',label:'Unknown unit',specifications:{'الأبعاد':'120×30×2 — وحدة القياس غير مذكورة'}}]} as unknown as Product;
describe('visual specification passport',()=>{
 it('renders only positive finite three-axis dimensions with explicit units',()=>{expect(visualPassportFacts({'الأبعاد':'20×10×30 سم'}).axes).toEqual(['20 سم','10 سم','30 سم']);for(const value of ['0×10×20 cm','10–20×30×40 cm','120×30×2 — unit unspecified','1×2×'+ '9'.repeat(400)+' cm'])expect(visualPassportFacts({'الأبعاد':value}).axes).toBeUndefined();});
 it('keeps exact flow units and never derives tank volume',()=>{const result=visualPassportFacts({'التدفق الاسمي':'1.5 لتر/دقيقة','القدرة':'5 واط'});expect(result.flow).toBe('1.5 لتر/دقيقة');expect(result.power).toBe('5 واط');expect(result).not.toHaveProperty('tankVolume');});
 it('does not inherit parent measurements for a selected unknown-unit option',()=>{const before=JSON.stringify(product);const {container}=render(<VisualSpecPassport product={product} variant={product.variants![0]} language="en"/>);expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(container.textContent).not.toContain('500');expect(container.textContent).not.toContain('20×10×30');expect(JSON.stringify(product)).toBe(before);});
 it('asks for option selection rather than showing parent measurements',()=>{render(<VisualSpecPassport product={product} language="en"/>);expect(screen.getByText('Choose an option to view its specifications')).toBeInTheDocument();expect(screen.queryByRole('img')).not.toBeInTheDocument();});
});
