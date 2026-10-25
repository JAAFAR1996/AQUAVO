import { useId } from 'react';
import type { Product, ProductVariant } from '@/types';
import { comparisonSpecifications } from './comparison-passport';

const COPY = {
  ar: { title: 'بطاقة المواصفات', dimensions: 'الأبعاد المسجلة', diagram: 'مخطط حدود توضيحي، ليس شكل المنتج ولا مقياساً فعلياً. ترتيب الأبعاد كما ورد بالمصدر.', flow: 'التدفق المذكور', power: 'القدرة المذكورة', hose: 'مقاس الخرطوم', unknown: 'غير مذكور', choose: 'اختَر خياراً لعرض مواصفاته', note: 'المواصفات كما وردت؛ التدفق لا يعني حجم حوض مناسب.' },
  en: { title: 'Specification passport', dimensions: 'Recorded dimensions', diagram: 'Illustrative bounding diagram, not product shape or actual scale. Dimension order follows the source.', flow: 'Stated flow', power: 'Stated power', hose: 'Hose size', unknown: 'Not specified', choose: 'Choose an option to view its specifications', note: 'Source specifications only; flow does not imply a suitable tank volume.' },
  ckb: { title: 'کارتی تایبەتمەندی', dimensions: 'ڕەهەندە تۆمارکراوەکان', diagram: 'هێڵکاری سنووری ڕوونکردنەوەیە، نە شێوەی بەرهەمە و نە پێوانەی ڕاستەقینە. ڕیزبەندی ڕەهەندەکان وەک سەرچاوەکەیە.', flow: 'لێشاوی باسکراو', power: 'توانای باسکراو', hose: 'قەبارەی شیلانگ', unknown: 'دیاری نەکراوە', choose: 'هەڵبژاردەیەک بۆ بینینی تایبەتمەندییەکانی هەڵبژێرە', note: 'تەنها تایبەتمەندیی سەرچاوە؛ لێشاو بە مانای قەبارەی گونجاوی حەوز نییە.' },
} as const;
const dimensionKeys = ['الأبعاد', 'الأبعاد المذكورة', 'الأبعاد الإجمالية', 'أبعاد الإضاءة', 'Dimensions', 'dimensions'];
export function visualPassportFacts(specs: Record<string, unknown>) {
  const string = (key: string) => typeof specs[key] === 'string' ? String(specs[key]).trim() : undefined;
  const dimension = dimensionKeys.map(string).find(Boolean);
  // A schematic needs three explicit dimensions AND a declared length unit.
  // Unknown invoice units, ranges and model IDs never become measured diagrams.
  const match = dimension?.match(/^\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(ملم|مم|سم|mm|cm|میلیمەتر|سانتیمەتر)(?:\s|$)/i);
  const find = (keys: readonly string[]) => keys.map(string).find(Boolean);
  return {
    dimension,
    axes: match && match.slice(1, 4).every(value => Number.isFinite(Number(value)) && Number(value) > 0) ? match.slice(1, 4).map(value => `${value} ${match[4]}`) : undefined,
    flow: find(['التدفق الاسمي المعلن','التدفق الاسمي','معدل التدفق','Flow (L/h)','Flow rate','flowRate']),
    power: find(['القدرة','القدرة الكهربائية','Power (W)','Power','power']),
    hose: find(['مقاس الخرطوم','مقاس الخراطيم','قطر الخرطوم','Hose size','Hose diameter']),
  };
}
export function VisualSpecPassport({ product, variant, language = 'ar' }: { product: Product; variant?: ProductVariant; language?: keyof typeof COPY }) {
  const t = COPY[language];
  const id = useId();
  const facts = visualPassportFacts(product.hasVariants && !variant ? {} : comparisonSpecifications(product, variant));
  return <section aria-label={t.title} className="mt-4 rounded-2xl border border-border bg-background p-3 text-start font-normal">
    <p className="text-xs font-bold text-primary">{t.title}</p>
    {product.hasVariants && !variant && <p className="mt-2 text-xs text-muted-foreground">{t.choose}</p>}
    {facts.axes && <figure className="mt-3">
      <svg viewBox="0 0 240 155" role="img" aria-labelledby={id} className="h-36 w-full text-primary" style={{ direction: 'ltr' }}>
        <title id={id}>{t.dimensions}: {facts.dimension}</title>
        <path d="M60 45H155V105H60Z M60 45L92 25H187V85L155 105 M155 45L187 25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M60 118H155 M48 45V105 M164 114L196 94" fill="none" stroke="currentColor" strokeDasharray="3 3" />
        <text x="107" y="140" textAnchor="middle" fill="currentColor" fontSize="12">{facts.axes[0]}</text>
        <text x="30" y="80" textAnchor="middle" fill="currentColor" fontSize="11" transform="rotate(-90 30 80)">{facts.axes[1]}</text>
        <text x="199" y="120" textAnchor="middle" fill="currentColor" fontSize="11">{facts.axes[2]}</text>
      </svg>
      <figcaption className="text-[10px] leading-5 text-muted-foreground">{t.diagram}</figcaption>
    </figure>}
    <dl className="mt-3 space-y-2 text-xs">
      {(['dimensions','flow','power','hose'] as const).map(key => <div key={key} className="border-t border-border pt-2"><dt className="text-muted-foreground">{t[key]}</dt><dd className="mt-1 break-words font-medium">{(key === 'dimensions' ? facts.dimension : facts[key]) || t.unknown}</dd></div>)}
    </dl>
    <p className="mt-3 text-[10px] leading-5 text-muted-foreground">{t.note}</p>
  </section>;
}
