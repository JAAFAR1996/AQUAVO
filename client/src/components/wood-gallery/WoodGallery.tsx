import { useId, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, Check, ImageIcon, Minus, Plus, RotateCcw, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { adaptWoodProducts, type WoodEvidenceInput, type WoodGalleryItem, type WoodPhoto, type WoodProductSource } from '@/lib/wood-gallery';
import { woodGalleryCopy, type WoodGalleryCopy, type WoodGalleryLanguage } from './copy';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
const control = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-background px-3 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 ${focus}`;

function WoodImage({ src, alt, missing }: { src: string; alt: string; missing: string }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-3 p-5 text-center text-sm text-muted-foreground"><ImageIcon aria-hidden="true" className="size-6" />{missing}</span>
    : <img src={src} alt={alt} width={900} height={720} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-contain p-4 sm:p-6" />;
}

function WoodZoomContent({ item, photo, t, language }: { item: WoodGalleryItem; photo: WoodPhoto; t: WoodGalleryCopy; language: WoodGalleryLanguage }) {
  const [zoom, setZoom] = useState(1);
  return <DialogContent dir={language === 'en' ? 'ltr' : 'rtl'} className="max-w-4xl gap-4 bg-card p-4 text-card-foreground sm:p-6">
    <div className="space-y-2 pe-12 text-start">
      <DialogTitle className="font-display text-xl leading-relaxed"><bdi>{item.pieceCode}</bdi> · {t[photo.role]}</DialogTitle>
      <DialogDescription>{t.zoomHint}</DialogDescription>
    </div>
    <div role="region" aria-label={t.imageRegion} tabIndex={0} className={`h-[48vh] overflow-auto rounded-2xl border border-border bg-muted sm:h-[55vh] ${focus}`}>
      <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} className="min-h-full min-w-full">
        <WoodImage key={photo.src} src={photo.src} alt={item.name} missing={t.missing} />
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={control} aria-label={t.zoomOut} disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}><Minus aria-hidden="true" className="size-4" /></button>
      <output aria-live="polite" className="min-w-16 text-center text-sm tabular-nums" dir="ltr">{Math.round(zoom * 100)}%</output>
      <button type="button" className={control} aria-label={t.zoomIn} disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + 0.5))}><Plus aria-hidden="true" className="size-4" /></button>
      <button type="button" className={`${control} gap-2`} onClick={() => setZoom(1)}><RotateCcw aria-hidden="true" className="size-4" />{t.reset}</button>
    </div>
    {photo.source && <p className="break-words text-xs text-muted-foreground">{t.evidenceSource}: {photo.source}</p>}
  </DialogContent>;
}

function WoodCard({ item, language }: { item: WoodGalleryItem; language: WoodGalleryLanguage }) {
  const t = woodGalleryCopy[language];
  const [selectedSource, setSelectedSource] = useState(item.photos[0]?.src);
  const [open, setOpen] = useState(false);
  const photo = item.photos.find(value => value.src === selectedSource) ?? item.photos[0];
  const photoRegionId = useId();
  const titleId = useId();
  const recordedRoles = new Set(item.photos.map(value => value.role));
  const missingEvidence = [
    !recordedRoles.has('ruler') ? t.noRuler : null,
    !recordedRoles.has('second-angle') ? t.noSecond : null,
    !recordedRoles.has('in-use') ? t.noUse : null,
  ].filter((value): value is string => value !== null);
  const price = item.price === null ? null : new Intl.NumberFormat(language === 'en' ? 'en' : language === 'ckb' ? 'ckb' : 'ar-IQ').format(item.price);
  if (!photo) return null;

  return <li className="min-w-0">
    <article aria-labelledby={titleId} className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card text-foreground">
      <div className="relative bg-muted">
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3">
          <bdi className="rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold tracking-wider">{item.pieceCode}</bdi>
          <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${item.availability === 'available' ? 'bg-primary/10 text-primary' : 'bg-card/95 text-muted-foreground'}`}>{t[item.availability]}</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button id={photoRegionId} type="button" aria-label={`${t.zoom}: ${item.pieceCode}`} className={`group relative block aspect-[5/4] w-full overflow-hidden pt-8 text-start ${focus}`}>
              <WoodImage key={photo.src} src={photo.src} alt={`${item.name} · ${t[photo.role]}`} missing={t.missing} />
              <span className="absolute bottom-4 end-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card/95 px-4 text-xs font-medium transition-colors group-hover:bg-background"><ZoomIn aria-hidden="true" className="size-4" />{t.zoom}</span>
            </button>
          </DialogTrigger>
          {open && <WoodZoomContent key={photo.src} item={item} photo={photo} t={t} language={language} />}
        </Dialog>
        <p className="px-5 pb-4 text-xs text-muted-foreground">{t[photo.role]}</p>
      </div>
      {item.photos.length > 1 && <div role="group" aria-label={`${t.photos}: ${item.pieceCode}`} className="flex flex-wrap gap-2 px-5 pt-4">{item.photos.map((candidate, index) => <button key={candidate.src} type="button" aria-pressed={photo.src === candidate.src} aria-controls={photoRegionId} onClick={() => setSelectedSource(candidate.src)} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs ${focus} ${photo.src === candidate.src ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
        {photo.src === candidate.src && <Check aria-hidden="true" className="size-3" />}{t[candidate.role]}{candidate.role === 'catalogue' && item.photos.filter(value => value.role === 'catalogue').length > 1 ? ` ${index + 1}` : ''}
      </button>)}</div>}
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <h3 id={titleId} className="font-display text-lg font-semibold leading-relaxed"><Link href={item.href} className={`rounded-sm hover:underline ${focus}`}>{item.name}</Link></h3>
        {price !== null && <p className="text-xl font-semibold"><bdi>{price} {t.currency}</bdi></p>}
        <div className="border-t border-border pt-4">
          {item.measurements.length ? <><h4 className="text-sm font-semibold">{t.measurements}</h4><dl className="mt-2 space-y-2">{item.measurements.map((measurement, index) => <div key={`${measurement.label}-${index}`} className="text-sm"><dt>{measurement.label}</dt><dd><bdi>{measurement.value} {measurement.unit}</bdi><span className="block break-words text-xs text-muted-foreground">{t.evidenceSource}: {measurement.source}</span></dd></div>)}</dl></> : <p className="text-sm font-medium">{t.noMeasurements}</p>}
          {missingEvidence.length > 0 && <ul aria-label={t.evidenceTitle} className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">{missingEvidence.map(line => <li key={line}>{line}</li>)}</ul>}
        </div>
        <Link href={item.href} aria-label={`${t.view}: ${item.pieceCode}`} className={`mt-auto inline-flex min-h-11 items-center justify-between gap-3 rounded-full border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-primary/10 ${focus}`}><span>{t.view}</span><ArrowUpRight aria-hidden="true" className={`size-4 ${language !== 'en' ? '-scale-x-100' : ''}`} /></Link>
      </div>
    </article>
  </li>;
}

/** Uses the parent's current public catalogue, not a second snapshot or a cart. */
export function WoodGallery({ products, language = 'ar', evidenceById }: {
  products: readonly WoodProductSource[];
  language?: WoodGalleryLanguage;
  evidenceById?: Readonly<Record<string, WoodEvidenceInput>>;
}) {
  const headingId = useId();
  const items = adaptWoodProducts(products, { evidenceById });
  const t = woodGalleryCopy[language];
  if (!items.length) return null;
  return <section aria-labelledby={headingId} dir={language === 'en' ? 'ltr' : 'rtl'} className="space-y-6">
    <header className="max-w-3xl space-y-3">
      <p className="text-xs font-semibold text-primary">{t.eyebrow}</p>
      <h2 id={headingId} className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{t.title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{t.intro}</p>
    </header>
    <ul className="grid gap-5 md:grid-cols-2">{items.map(item => <WoodCard key={item.id} item={item} language={language} />)}</ul>
    <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">{t.source}</p>
  </section>;
}

export type { WoodGalleryLanguage } from './copy';
