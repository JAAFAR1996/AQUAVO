import { useId, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'wouter';
import type { MaterialCatalogueItem, MaterialFact, MaterialKind } from '@/lib/material-catalogue';

const copy = {
  ar: {
    eyebrow: 'كتالوج الخامات', title: 'التفاصيل تبدي من القاع.', intro: 'قارن الرمل والحجر، شوف صور الكتالوج عن قرب، واختار المقاس من بيانات نفس الخيار.',
    all: 'كل الخامات', sand: 'رمل', stone: 'حجر', selected: 'الخامة المختارة', others: 'اختار خامة', view: 'شوف تفاصيل المنتج', allMaterials: 'شوف كل الخامات',
    photo: 'صورة من الكتالوج', photos: 'صور الكتالوج', missing: 'الصورة مو متوفرة هسه', missingVariant: 'ماكو صورة خاصة بهالخيار هسه. ما نعرض صورة مقاس ثاني بداله.',
    full: 'الصورة كاملة', detail: 'تفاصيل الصورة', detailNote: 'هذا تكبير للصورة، مو مقياس للحجم الحقيقي ولا صورة ماكرو موثّقة.', horizontal: 'موضع التفاصيل أفقياً', vertical: 'موضع التفاصيل عمودياً',
    dry: 'جاف', wet: 'مبلل', unknown: 'القياسات مو موثّقة هسه', measurements: 'قياسات موثّقة', piece: 'القطعة المصوّرة', source: 'المصدر',
    soon: 'قريباً', available: 'متوفر', unavailable: 'غير متوفر هسه', availabilityUnknown: 'تأكد من التوفر بصفحة المنتج', unpriced: 'السعر بعده مو محدد', from: 'من', currency: 'د.ع',
    variants: 'المقاسات والخيارات', variantNote: 'الصورة والمواصفات تخص الخيار اللي تختاره. الاختيار هنا للاستكشاف، مو إضافة للسلة.', noVariants: 'ماكو خيار حالي معروض. راجع صفحة المنتج.',
    facts: 'المواصفات المذكورة بالكتالوج', factsNote: 'من بيانات المنتج أو الخيار نفسه. ما استنتجنا قياس من الصورة أو اسم الملف.', grain: 'حجم الحبيبات', size: 'حجم القطع', weight: 'وزن العبوة', notListed: 'مو مذكور',
    imageNote: 'صور الكتالوج مو ضمان لشكل القطعة اللي توصلك أو حجمها الحقيقي. تنسيق الحوض والأغراض الظاهرة مو كلها مشمولة.',
    noPair: 'صور جاف ومبلل لنفس العينة مو موثّقة هسه.', catalogueCount: 'خامة', galleryCount: 'من', selectedVariant: 'الخيار المعروض',
  },
  en: {
    eyebrow: 'Material catalogue', title: 'It starts with the substrate.', intro: 'Compare sand and stone, explore the catalogue imagery, and check the exact option’s listed dimensions.',
    all: 'All materials', sand: 'Sand', stone: 'Stone', selected: 'Selected material', others: 'Choose a material', view: 'View product details', allMaterials: 'Explore all materials',
    photo: 'Catalogue image', photos: 'Catalogue images', missing: 'Photo not available yet', missingVariant: 'No image is listed for this option yet. A different size is not shown in its place.',
    full: 'Full image', detail: 'Image detail', detailNote: 'This is an image crop, not actual physical scale or a verified macro photograph.', horizontal: 'Detail horizontal position', vertical: 'Detail vertical position',
    dry: 'Dry', wet: 'Wet', unknown: 'Measurements not yet verified', measurements: 'Verified measurements', piece: 'Individually tracked piece', source: 'Source',
    soon: 'Coming soon', available: 'Available', unavailable: 'Currently unavailable', availabilityUnknown: 'Check availability on the product page', unpriced: 'Price not confirmed yet', from: 'From', currency: 'IQD',
    variants: 'Sizes and options', variantNote: 'Images and specifications belong to the option you select. Exploring here does not add anything to your cart.', noVariants: 'No current option is listed. Check the product page.',
    facts: 'Listed catalogue specifications', factsNote: 'Taken from this product or option’s data. No dimensions are inferred from pictures or filenames.', grain: 'Grain size', size: 'Piece size', weight: 'Pack weight', notListed: 'Not listed',
    imageNote: 'Catalogue images do not establish the exact delivered piece or its true scale. Aquarium styling and pictured accessories are not necessarily included.',
    noPair: 'A verified dry/wet photo pair of the same sample is not available yet.', catalogueCount: 'materials', galleryCount: 'of', selectedVariant: 'Shown option',
  },
  ckb: {
    eyebrow: 'کەتەلۆگی ماددەکان', title: 'وردەکارییەکان لە بنەوە دەست پێ دەکەن.', intro: 'لم و بەرد بەراورد بکە، وێنەکانی کەتەلۆگ لە نزیکەوە ببینە و پێوانەی هەمان هەڵبژاردە بپشکنە.',
    all: 'هەموو ماددەکان', sand: 'لم', stone: 'بەرد', selected: 'ماددەی هەڵبژێردراو', others: 'ماددەیەک هەڵبژێرە', view: 'وردەکاریی بەرهەم ببینە', allMaterials: 'هەموو ماددەکان ببینە',
    photo: 'وێنەی کەتەلۆگ', photos: 'وێنەکانی کەتەلۆگ', missing: 'وێنە هێشتا بەردەست نییە', missingVariant: 'هێشتا وێنەی تایبەت بەم هەڵبژاردەیە نییە. وێنەی قەبارەیەکی تر لە جێی نیشان نادرێت.',
    full: 'وێنەی تەواو', detail: 'وردەکاریی وێنە', detailNote: 'ئەمە گەورەکردنەوەی وێنەیە، نە پێوانەی قەبارەی ڕاستەقینە یان وێنەی ماکرۆی پشتڕاستکراو.', horizontal: 'شوێنی ئاسۆیی وردەکاری', vertical: 'شوێنی ستوونی وردەکاری',
    dry: 'وشک', wet: 'تەڕ', unknown: 'پێوانەکان هێشتا پشتڕاست نەکراونەتەوە', measurements: 'پێوانە پشتڕاستکراوەکان', piece: 'پارچەی بەدواداچوونکراو', source: 'سەرچاوە',
    soon: 'بەم نزیکانە', available: 'بەردەستە', unavailable: 'ئێستا بەردەست نییە', availabilityUnknown: 'بەردەستبوون لە پەڕەی بەرهەم بپشکنە', unpriced: 'نرخ هێشتا دیاری نەکراوە', from: 'لە', currency: 'د.ع',
    variants: 'قەبارە و هەڵبژاردەکان', variantNote: 'وێنە و تایبەتمەندییەکان هی هەمان هەڵبژاردەن. هەڵبژاردن لێرە هیچ شتێک زیاد ناکات بۆ سەبەتە.', noVariants: 'هیچ هەڵبژاردەیەکی ئێستا نیشان نەدراوە. پەڕەی بەرهەم ببینە.',
    facts: 'تایبەتمەندییە نووسراوەکانی کەتەلۆگ', factsNote: 'لە زانیاریی هەمان بەرهەم یان هەڵبژاردە وەرگیراون. پێوانە لە وێنە یان ناوی فایلەوە دانەنراوە.', grain: 'قەبارەی دانەکان', size: 'قەبارەی پارچەکان', weight: 'کێشی پاکەت', notListed: 'نەنووسراوە',
    imageNote: 'وێنەی کەتەلۆگ شێوە و قەبارەی وردی پارچەی گەیشتوو مسۆگەر ناکات. ڕازاندنەوە و کەرەستەکانی ناو وێنە هەموویان لەگەڵ بەرهەم نین.',
    noPair: 'هێشتا جووتەوێنەی وشک و تەڕی پشتڕاستکراوەی هەمان نموونە بەردەست نییە.', catalogueCount: 'ماددە', galleryCount: 'لە', selectedVariant: 'هەڵبژاردەی نیشاندراو',
  },
};
export type MaterialCatalogueLanguage = keyof typeof copy;
type CatalogueCopy = typeof copy[MaterialCatalogueLanguage];
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function MaterialImage({ src, alt, missing, className = '', style }: {
  src: string | null; alt: string; missing: string; className?: string; style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed
    ? <img src={src} alt={alt} loading="lazy" decoding="async" width={720} height={540} onError={() => setFailed(true)} className={`h-full w-full object-contain ${className}`} style={style} />
    : <span className="flex h-full min-h-32 items-center justify-center p-6 text-center text-sm text-muted-foreground">{missing}</span>;
}

function CatalogueGallery({ gallery, name, missing, t }: { gallery: readonly string[]; name: string; missing: string; t: CatalogueCopy }) {
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const detailId = useId();
  const selected = gallery[index] ?? gallery[0] ?? null;
  return <div className="min-w-0 space-y-3">
    <figure className="overflow-hidden rounded-2xl border border-border bg-muted/20">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-muted/40 to-transparent">
        <MaterialImage key={selected ?? 'missing'} src={selected} alt={name} missing={missing}
          style={detail ? { transform: 'scale(1.9)', transformOrigin: `${position.x}% ${position.y}%` } : undefined} />
        {selected && <span aria-hidden="true" className="absolute bottom-3 start-3 rounded-full border border-border bg-background/90 px-3 py-1 text-[11px] tabular-nums">{index + 1} {t.galleryCount} {gallery.length}</span>}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 sm:p-4">
        <span className="text-xs text-muted-foreground">{t.photo}</span>
        {selected && <div role="group" aria-label={t.photos} className="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button type="button" aria-pressed={!detail} onClick={() => setDetail(false)} className={`min-h-10 rounded-md px-3 text-xs ${focus} ${!detail ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>{t.full}</button>
          <button type="button" aria-pressed={detail} aria-describedby={detailId} onClick={() => setDetail(true)} className={`min-h-10 rounded-md px-3 text-xs ${focus} ${detail ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>{t.detail}</button>
        </div>}
      </figcaption>
    </figure>
    <p id={detailId} className="text-xs leading-relaxed text-muted-foreground">{t.detailNote}</p>
    {detail && selected && <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-3">
      <label className="min-w-0 text-[11px] text-muted-foreground">{t.horizontal}<input type="range" min={0} max={100} value={position.x} onChange={event => setPosition(current => ({ ...current, x: Number(event.target.value) }))} className={`mt-2 block min-h-6 w-full accent-primary ${focus}`} /></label>
      <label className="min-w-0 text-[11px] text-muted-foreground">{t.vertical}<input type="range" min={0} max={100} value={position.y} onChange={event => setPosition(current => ({ ...current, y: Number(event.target.value) }))} className={`mt-2 block min-h-6 w-full accent-primary ${focus}`} /></label>
    </div>}
    {gallery.length > 1 && <div role="group" aria-label={t.photos} className="flex flex-wrap gap-2">{gallery.map((src, imageIndex) =>
      <button key={src} type="button" aria-label={`${t.photo} ${imageIndex + 1}`} aria-pressed={imageIndex === index} onClick={() => { setIndex(imageIndex); setPosition({ x: 50, y: 50 }); }} className={`h-16 w-20 overflow-hidden rounded-lg border bg-muted/30 sm:h-20 sm:w-24 ${focus} ${imageIndex === index ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
        <MaterialImage key={src} src={src} alt="" missing={t.missing} />
      </button>)}</div>}
  </div>;
}

const translatedFactLabels: Record<string, { en: string; ckb: string }> = {
  'حجم الحبيبات': { en: 'Grain size', ckb: 'قەبارەی دانەکان' }, 'مقاس الحبيبات': { en: 'Grain size', ckb: 'قەبارەی دانەکان' },
  'حجم القطع': { en: 'Piece size', ckb: 'قەبارەی پارچەکان' }, 'نطاق المقاس': { en: 'Size range', ckb: 'مەودای قەبارە' }, 'نطاق المقاس التقريبي': { en: 'Approximate size range', ckb: 'مەودای نزیکەیی قەبارە' },
  'المقاس': { en: 'Listed size', ckb: 'قەبارەی نووسراو' }, 'الحجم': { en: 'Listed size', ckb: 'قەبارەی نووسراو' },
  'وزن العبوة': { en: 'Pack weight', ckb: 'کێشی پاکەت' }, 'الوزن': { en: 'Listed weight', ckb: 'کێشی نووسراو' }, 'وحدة البيع': { en: 'Sale unit', ckb: 'یەکەی فرۆشتن' },
  'اللون': { en: 'Colour', ckb: 'ڕەنگ' }, 'النوع': { en: 'Type', ckb: 'جۆر' }, 'المادة': { en: 'Material', ckb: 'ماددە' }, 'اسم الصنف': { en: 'Material name', ckb: 'ناوی ماددە' },
  'أفضل استخدام': { en: 'Listed use', ckb: 'بەکارهێنانی نووسراو' }, 'بيان المقاس': { en: 'Size qualification', ckb: 'تێبینیی پێوانە' },
};
function CatalogueFacts({ facts, kind, language, t }: { facts: readonly MaterialFact[]; kind: MaterialKind; language: MaterialCatalogueLanguage; t: CatalogueCopy }) {
  const dimensionKnown = facts.some(fact => fact.kind === 'grain' || fact.kind === 'size');
  const weightKnown = facts.some(fact => fact.kind === 'weight');
  return <div className="w-full rounded-2xl border border-border bg-background/50 p-4">
    <h4 className="text-sm font-semibold">{t.facts}</h4>
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
      {facts.map(fact => <div key={fact.key} className="min-w-0"><dt className="text-xs text-muted-foreground">{language !== 'ar' && fact.label === fact.key ? translatedFactLabels[fact.key]?.[language] ?? fact.label : fact.label}</dt><dd className="mt-1 break-words text-sm font-medium"><bdi>{fact.value}</bdi></dd></div>)}
      {!dimensionKnown && <div><dt className="text-xs text-muted-foreground">{kind === 'sand' ? t.grain : t.size}</dt><dd className="mt-1 text-sm text-muted-foreground">{t.notListed}</dd></div>}
      {!weightKnown && <div><dt className="text-xs text-muted-foreground">{t.weight}</dt><dd className="mt-1 text-sm text-muted-foreground">{t.notListed}</dd></div>}
    </dl>
    <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">{t.factsNote}</p>
  </div>;
}

function MaterialDetail({ item, language, t }: { item: MaterialCatalogueItem; language: MaterialCatalogueLanguage; t: CatalogueCopy }) {
  const [variantId, setVariantId] = useState(item.variants.find(variant => variant.isDefault)?.id ?? item.variants[0]?.id);
  const variant = item.variants.find(option => option.id === variantId) ?? item.variants.find(option => option.isDefault) ?? item.variants[0];
  const gallery = variant ? variant.gallery : item.hasVariants ? [] : item.gallery;
  const facts = variant ? variant.facts : item.hasVariants ? [] : item.facts;
  const name = variant?.name ?? item.name;
  const price = variant ? variant.price : item.price;
  const comingSoon = variant ? variant.comingSoon : item.comingSoon;
  const availability = variant?.availability ?? item.availability;
  const formatPrice = (value: number) => new Intl.NumberFormat(language === 'en' ? 'en' : language === 'ckb' ? 'ckb' : 'ar-IQ').format(value);
  return <div className="grid items-start gap-6 lg:grid-cols-[1.12fr_1fr] lg:gap-8">
    <div className="min-w-0 space-y-4">
      {item.pair ? <div className="grid grid-cols-2 gap-3">{(['dry', 'wet'] as const).map(state => <figure key={state} className="overflow-hidden rounded-xl border border-border bg-muted/20">
        <div className="aspect-square"><MaterialImage key={item.pair![state].src} src={item.pair![state].src} alt={`${item.name} — ${t[state]}`} missing={t.missing} /></div>
        <figcaption className="p-3 text-sm"><span className="font-semibold">{t[state]}</span><span className="mt-1 block break-words text-xs text-muted-foreground">{t.source}: {item.pair![state].source}</span></figcaption>
      </figure>)}</div> : <CatalogueGallery key={`${item.id}-${variant?.id ?? 'product'}`} gallery={gallery} name={name} missing={variant ? t.missingVariant : t.missing} t={t} />}
      <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>{item.imageNote ?? t.imageNote}</p>
        {!item.pair && <p>{t.noPair}</p>}
      </div>
    </div>
    <div className="flex min-w-0 flex-col items-start gap-4 py-1">
      <p className="text-xs font-semibold text-primary">{t.selected} · {t[item.kind]}</p>
      <h3 className="font-display text-2xl font-semibold leading-snug sm:text-3xl">{name}</h3>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xl font-semibold tabular-nums">{comingSoon ? t.soon : price === null ? <span className="text-sm font-normal text-muted-foreground">{t.unpriced}</span> : <>{!variant && item.isFromPrice && `${t.from} `}<bdi>{formatPrice(price)} {t.currency}</bdi></>}</p>
        {!comingSoon && <span className={`rounded-full border px-2.5 py-1 text-[11px] ${availability === 'available' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{availability === 'available' ? t.available : availability === 'unavailable' ? t.unavailable : t.availabilityUnknown}</span>}
      </div>
      {item.hasVariants && <fieldset className="w-full min-w-0">
        <legend className="mb-2 text-sm font-semibold">{t.variants}</legend>
        <div className="flex flex-wrap gap-2">{item.variants.map(option => <button key={option.id} type="button" aria-pressed={variant?.id === option.id} onClick={() => setVariantId(option.id)} className={`min-h-11 max-w-full rounded-xl border px-3 py-2 text-start text-xs leading-relaxed ${focus} ${variant?.id === option.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted/50'}`}>
          <span className="block">{option.label}</span>{option.comingSoon && <span className="mt-0.5 block text-[10px] text-muted-foreground">{t.soon}</span>}
        </button>)}</div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{item.variants.length ? t.variantNote : t.noVariants}</p>
      </fieldset>}
      {variant && <p aria-live="polite" className="text-xs text-muted-foreground">{t.selectedVariant}: <bdi className="text-foreground">{variant.label}</bdi></p>}
      <CatalogueFacts facts={facts} kind={item.kind} language={language} t={t} />
      {item.measurements.length > 0 ? <div><h4 className="text-sm font-semibold">{t.measurements}</h4><dl className="mt-2 space-y-2">{item.measurements.map((measurement, index) => <div key={`${measurement.label}-${index}`} className="text-sm"><dt className="text-muted-foreground">{measurement.label}</dt><dd><bdi>{measurement.value} {measurement.unit}</bdi><span className="block break-words text-xs text-muted-foreground">{t.source}: {measurement.source}</span></dd></div>)}</dl></div> : facts.every(fact => !['grain', 'size', 'weight'].includes(fact.kind)) && <p className="text-xs text-muted-foreground">{t.unknown}</p>}
      {item.piece && <figure className="w-full max-w-xs"><div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted"><MaterialImage key={item.piece.image} src={item.piece.image} alt={`${t.piece}: ${item.piece.pieceId}`} missing={t.missing} /></div><figcaption className="mt-2 text-xs">{t.piece}: <bdi>{item.piece.pieceId}</bdi><span className="block text-muted-foreground">{t.source}: {item.piece.source}</span></figcaption></figure>}
      <Link href={item.href} className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground sm:w-auto ${focus}`}>{t.view}</Link>
    </div>
  </div>;
}

/** Display-only: no purchase action, stock override, or generated product imagery. */
export function MaterialCatalogue({ items, language = 'ar', selectedId: initialSelectedId, compact = false }: {
  items: readonly MaterialCatalogueItem[]; language?: MaterialCatalogueLanguage; selectedId?: string; compact?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [kind, setKind] = useState<MaterialKind | 'all'>('all');
  const headingId = useId();
  const detailId = useId();
  const detailRef = useRef<HTMLDivElement>(null);
  const selectMaterial = (id: string) => {
    setSelectedId(id);
    // Material cards can be below the fold on mobile. Bring the updated detail
    // into view without animation and preserve a useful keyboard starting point.
    detailRef.current?.focus({ preventScroll: true });
    detailRef.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
  };
  const filtered = kind === 'all' ? items : items.filter(item => item.kind === kind);
  const visible = compact ? filtered.slice(0, 6) : filtered;
  const selected = visible.find(item => item.id === selectedId) ?? visible[0];
  const t = copy[language];
  if (!items.length) return null;
  return <section dir={language === 'en' ? 'ltr' : 'rtl'} aria-labelledby={headingId} className="material-catalogue space-y-7 rounded-3xl border border-border bg-card p-4 text-card-foreground sm:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl space-y-3"><p className="text-[11px] font-semibold text-primary">{t.eyebrow}</p><h2 id={headingId} className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{t.title}</h2><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t.intro}</p></div>
      <p className="text-xs text-muted-foreground"><bdi className="font-semibold text-foreground">{items.length}</bdi> {t.catalogueCount}</p>
    </header>
    <div role="group" aria-label={t.others} className="flex flex-wrap gap-2">{(['all', 'sand', 'stone'] as const).map(value => {
      const count = value === 'all' ? items.length : items.filter(item => item.kind === value).length;
      return <button key={value} type="button" disabled={count === 0} aria-pressed={kind === value} onClick={() => { setKind(value); setSelectedId(undefined); }} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm disabled:opacity-40 ${focus} ${kind === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted/50'}`}>
        {t[value]}<span className="text-[10px] tabular-nums opacity-70">{count}</span>
      </button>;
    })}</div>
    {selected && <div id={detailId} ref={detailRef} tabIndex={-1} aria-label={`${t.selected}: ${selected.name}`} className="scroll-mt-24 focus:outline-none"><MaterialDetail key={selected.id} item={selected} language={language} t={t} /></div>}
    <div className="border-t border-border pt-6">
      <h3 className="mb-4 text-sm font-semibold">{t.others}</h3>
      <div role="group" aria-label={t.others} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{visible.map(item => <button type="button" key={item.id} aria-pressed={selected?.id === item.id} aria-controls={detailId} onClick={() => selectMaterial(item.id)} className={`group min-w-0 overflow-hidden rounded-xl border text-start ${focus} ${selected?.id === item.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-background hover:border-primary/50'}`}>
        <span className="block aspect-[4/3] bg-muted/20 p-2"><MaterialImage key={item.image ?? item.id} src={item.image} alt="" missing={t.missing} /></span>
        <span className="block p-3 text-xs font-medium leading-relaxed sm:text-sm">{item.name}<span className="mt-2 block text-[11px] font-normal text-muted-foreground">{selected?.id === item.id ? t.selected : t[item.kind]}</span></span>
      </button>)}</div>
    </div>
    {compact && <Link href="/materials" className={`inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary underline underline-offset-4 ${focus}`}>{t.allMaterials}</Link>}
  </section>;
}
