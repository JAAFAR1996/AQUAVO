import { useId, useState } from 'react';
import { Link } from 'wouter';
import type { MaterialCatalogueItem } from '@/lib/material-catalogue';

const copy = {
  ar: { title: 'اختار خامة حوضك', intro: 'شوف صور المنتجات وقارن شكل الخامات. تفاصيل كل منتج بصفحته.', selected: 'الخامة المختارة', others: 'خامات ثانية', view: 'شوف تفاصيل المنتج', photo: 'صورة المنتج', missing: 'الصورة مو متوفرة هسه', dry: 'جاف', wet: 'مبلل', unknown: 'القياسات مو موثّقة هسه', measurements: 'قياسات موثّقة', piece: 'القطعة المصوّرة', soon: 'قريباً', unpriced: 'شوف السعر والتوفر بصفحة المنتج', from: 'من', currency: 'د.ع', sand: 'رمل', stone: 'حجر', source: 'المصدر' },
  en: { title: 'Choose your aquarium material', intro: 'Explore product photos and compare materials. Find each product’s details on its own page.', selected: 'Selected material', others: 'Other materials', view: 'View product details', photo: 'Product photo', missing: 'Photo not available yet', dry: 'Dry', wet: 'Wet', unknown: 'Measurements not yet verified', measurements: 'Verified measurements', piece: 'Individually tracked piece', soon: 'Coming soon', unpriced: 'See product page for price and availability', from: 'From', currency: 'IQD', sand: 'Sand', stone: 'Stone', source: 'Source' },
  ckb: { title: 'ماددەی ئەکواریۆمەکەت هەڵبژێرە', intro: 'وێنەی بەرهەمەکان ببینە و ماددەکان بەراورد بکە. وردەکاریی هەر بەرهەمێک لە پەڕەی خۆیدایە.', selected: 'ماددەی هەڵبژێردراو', others: 'ماددەکانی تر', view: 'وردەکاریی بەرهەم ببینە', photo: 'وێنەی بەرهەم', missing: 'وێنە هێشتا بەردەست نییە', dry: 'وشک', wet: 'تەڕ', unknown: 'پێوانەکان هێشتا پشتڕاست نەکراونەتەوە', measurements: 'پێوانە پشتڕاستکراوەکان', piece: 'پارچەی بەدواداچوونکراو', soon: 'بەم نزیکانە', unpriced: 'نرخ و بەردەستبوون لە پەڕەی بەرهەم ببینە', from: 'لە', currency: 'د.ع', sand: 'لم', stone: 'بەرد', source: 'سەرچاوە' },
};
export type MaterialCatalogueLanguage = keyof typeof copy;
function MaterialImage({ src, alt, missing, className = '' }: { src: string | null; alt: string; missing: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt={alt} loading="lazy" decoding="async" width={720} height={540} onError={() => setFailed(true)} className={`h-full w-full object-contain ${className}`} />
    : <span className="flex h-full min-h-32 items-center justify-center p-6 text-center text-sm text-muted-foreground">{missing}</span>;
}
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
/** Display-only: no purchase action, stock override, or generated product imagery. */
export function MaterialCatalogue({ items, language = 'ar', selectedId: initialSelectedId }: {
  items: readonly MaterialCatalogueItem[]; language?: MaterialCatalogueLanguage; selectedId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const headingId = useId();
  const detailId = useId();
  const selected = items.find(item => item.id === selectedId) ?? items[0];
  const t = copy[language];
  if (!selected) return null;
  return <section dir={language === 'en' ? 'ltr' : 'rtl'} aria-labelledby={headingId} className="space-y-6 rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-8">
    <header className="max-w-2xl space-y-2"><h2 id={headingId} className="font-display text-2xl font-semibold sm:text-3xl">{t.title}</h2><p className="text-sm leading-relaxed text-muted-foreground">{t.intro}</p></header>
    <div id={detailId} className="grid gap-6 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
        {selected.pair ? <div className="grid grid-cols-2 gap-px bg-border">{(['dry', 'wet'] as const).map(state => <figure key={`${selected.id}-${state}`} className="bg-card"><div className="aspect-square"><MaterialImage key={selected.pair![state].src} src={selected.pair![state].src} alt={`${selected.name} — ${t[state]}`} missing={t.missing} /></div><figcaption className="p-3 text-sm"><span className="font-semibold">{t[state]}</span><span className="mt-1 block break-words text-xs text-muted-foreground">{t.source}: {selected.pair![state].source}</span></figcaption></figure>)}</div>
          : <figure><div className="aspect-[4/3]"><MaterialImage key={selected.image ?? selected.id} src={selected.image} alt={selected.name} missing={t.missing} /></div><figcaption className="px-4 pb-4 text-xs text-muted-foreground">{t.photo}</figcaption></figure>}
      </div>
      <div className="flex flex-col items-start gap-4 py-2">
        <p className="text-xs font-semibold text-primary">{t.selected} · {t[selected.kind]}</p>
        <h3 className="font-display text-2xl font-semibold">{selected.name}</h3>
        <p className="text-sm text-muted-foreground">{selected.comingSoon ? t.soon : selected.price === null ? t.unpriced : <>{selected.isFromPrice && `${t.from} `}<bdi>{new Intl.NumberFormat(language === 'en' ? 'en' : language === 'ckb' ? 'ckb' : 'ar-IQ').format(selected.price)} {t.currency}</bdi></>}</p>
        {selected.measurements.length ? <div><h4 className="text-sm font-semibold">{t.measurements}</h4><dl className="mt-2 space-y-2">{selected.measurements.map((measurement, index) => <div key={`${measurement.label}-${index}`} className="text-sm"><dt className="text-muted-foreground">{measurement.label}</dt><dd><bdi>{measurement.value} {measurement.unit}</bdi><span className="block break-words text-xs text-muted-foreground">{t.source}: {measurement.source}</span></dd></div>)}</dl></div> : <p className="text-sm text-muted-foreground">{t.unknown}</p>}
        {selected.piece && <figure className="w-full max-w-xs"><div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted"><MaterialImage key={selected.piece.image} src={selected.piece.image} alt={`${t.piece}: ${selected.piece.pieceId}`} missing={t.missing} /></div><figcaption className="mt-2 text-xs">{t.piece}: <bdi>{selected.piece.pieceId}</bdi><span className="block text-muted-foreground">{t.source}: {selected.piece.source}</span></figcaption></figure>}
        <Link href={selected.href} className={`mt-auto inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground ${focus}`}>{t.view}</Link>
      </div>
    </div>
    <div role="group" aria-label={t.others} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map(item => <button type="button" key={item.id} aria-pressed={selected.id === item.id} aria-controls={detailId} onClick={() => setSelectedId(item.id)} className={`overflow-hidden rounded-xl border text-start ${focus} ${selected.id === item.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted/50'}`}><span className="block aspect-[4/3]"><MaterialImage key={item.image ?? item.id} src={item.image} alt="" missing={t.missing} /></span><span className="block p-3 text-sm font-medium">{item.name}<span className="mt-1 block text-xs text-muted-foreground">{selected.id === item.id ? t.selected : t[item.kind]}</span></span></button>)}</div>
  </section>;
}
