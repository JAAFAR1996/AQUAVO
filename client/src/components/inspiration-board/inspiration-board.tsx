import { cardImage } from "@/lib/cloudinary";
import { useId, useState } from 'react';
import { ArrowLeft, ArrowRight, ImageOff } from 'lucide-react';
import { Link } from 'wouter';
import { LOCALES, type Locale } from '@shared/i18n/locales';
import { buildInspirationBoard, type InspirationBoardItem, type InspirationProductSource } from '@/lib/inspiration-board';
import { INSPIRATION_BOARD_COPY, type InspirationBoardCopy } from './inspiration-board-copy';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background';

function BoardPhoto({ item, copy }: { item: InspirationBoardItem; copy: InspirationBoardCopy }) {
  const [failed, setFailed] = useState(false);
  return item.image && !failed ? (
    <img src={cardImage(item.image)} alt={`${item.name}${item.variantLabel ? ` · ${item.variantLabel}` : ''}`} width={640} height={640}
      loading="lazy" decoding="async" onError={() => setFailed(true)}
      className="h-full w-full object-contain p-6 sm:p-8" />
  ) : (
    <span className="flex h-full min-h-44 flex-col items-center justify-center gap-3 p-6 text-center text-sm leading-7 text-muted-foreground">
      <ImageOff aria-hidden="true" className="size-6" />
      {item.href ? copy.missingPhoto : copy.unavailable}
    </span>
  );
}

function ProductStatus({ item, copy }: { item: InspirationBoardItem; copy: InspirationBoardCopy }) {
  return <p className={`text-xs leading-6 ${item.availability === 'listed' ? 'text-primary' : 'text-muted-foreground'}`}>
    {copy.availability[item.availability]}
    {item.pricePending && item.availability !== 'pending-price' && <span className="block">{copy.pendingPrice}</span>}
  </p>;
}

/**
 * A deliberate, numbered catalogue-image layout, not shoppable AI imagery.
 * The always-visible list provides the same destinations on touch/mobile.
 * No purchase controls, floating modal, observers, motion, or extra network fetch.
 */
export function InspirationBoard({ products, isLoading = false, language = 'ar', copy = INSPIRATION_BOARD_COPY[language] }: {
  products: readonly InspirationProductSource[];
  isLoading?: boolean;
  language?: Locale;
  copy?: InspirationBoardCopy;
}) {
  const headingId = useId();
  const disclosureId = useId();
  const items = buildInspirationBoard(products);
  const Forward = LOCALES[language].dir === 'rtl' ? ArrowLeft : ArrowRight;
  return <section id="inspiration-board" dir={LOCALES[language].dir} aria-labelledby={headingId}
    className="scroll-mt-24 border-y border-border bg-muted/15 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 max-w-3xl text-start">
        <p className="mb-3 text-xs font-bold text-primary">{copy.eyebrow}</p>
        <h2 id={headingId} className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">{copy.title}</h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">{copy.intro}</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)] lg:gap-10">
        <figure className="min-w-0">
          <div className="mb-3 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />{copy.photoLabel}
          </div>
          {isLoading ? <div role="status" className="flex min-h-96 items-center justify-center rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{copy.loading}</div> : (
            <div className="grid min-h-0 grid-cols-2 gap-3 sm:grid-cols-[1.35fr_1fr] sm:gap-4" aria-label={copy.photoLabel}>
              {items.map((item, index) => {
                const contents = <>
                  <div className={`relative w-full ${index === 0 ? 'aspect-[4/3] sm:aspect-square' : 'aspect-square sm:aspect-[4/3]'}`}>
                    <BoardPhoto key={`${item.key}:${item.image}`} item={item} copy={copy} />
                    <span aria-hidden="true" className="absolute start-3 top-3 flex size-11 items-center justify-center rounded-full border border-primary/40 bg-background font-interface text-sm font-bold tabular-nums text-primary shadow-sm sm:start-4 sm:top-4">{String(item.number).padStart(2, '0')}</span>
                    {item.href && <span aria-hidden="true" className="absolute bottom-3 end-3 flex size-9 items-center justify-center rounded-full bg-background text-primary"><Forward className="size-4" /></span>}
                  </div>
                  <span className="block border-t border-border/60 px-4 py-3 text-start text-xs font-semibold leading-6 text-foreground">{copy.materials[item.material]}</span>
                </>;
                const style = `group min-w-0 overflow-hidden rounded-2xl border border-border bg-card ${index === 0 ? 'col-span-2 sm:col-span-1 sm:row-span-2 sm:self-center' : ''}`;
                return item.href ? <Link key={item.key} href={item.href} aria-label={`${item.number}. ${item.name}${item.variantLabel ? ` · ${item.variantLabel}` : ''}. ${copy.view}`}
                  aria-describedby={disclosureId} data-product-id={item.productId} data-variant-id={item.variantId}
                  className={`${style} transition-colors hover:border-primary/60 ${focus}`}>{contents}</Link>
                  : <div key={item.key} className={style}>{contents}</div>;
              })}
            </div>
          )}
          <figcaption id={disclosureId} className="mt-4 space-y-2 text-start text-xs leading-7 text-muted-foreground">
            <p>{copy.disclosure}</p><p>{copy.scaleNote}</p>
          </figcaption>
        </figure>
        <div className="min-w-0 text-start lg:pt-8">
          <h3 className="font-display text-xl font-semibold text-foreground">{copy.listLabel}</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.listNote}</p>
          {!isLoading && <ol aria-label={copy.listLabel} className="mt-6 divide-y divide-border border-y border-border">
            {items.map(item => <li key={item.key} className="flex gap-4 py-5">
              <span aria-hidden="true" className="pt-1 font-interface text-sm font-semibold tabular-nums text-primary">{String(item.number).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs text-muted-foreground">{copy.materials[item.material]}</p>
                {item.href ? <Link href={item.href} aria-label={`${item.name}. ${copy.view}`} className={`inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-lg py-1 font-semibold leading-7 text-foreground hover:text-primary ${focus}`}>
                  <span>{item.name}<span className="sr-only">. {copy.view}</span></span><Forward className="size-4 shrink-0 text-primary" aria-hidden="true" />
                </Link> : <p className="font-medium leading-7 text-foreground">{copy.unavailable}</p>}
                {item.variantLabel && <p className="text-xs leading-6 text-muted-foreground">{copy.picturedOption}: <bdi>{item.variantLabel}</bdi></p>}
                <ProductStatus item={item} copy={copy} />
              </div>
            </li>)}
          </ol>}
        </div>
      </div>
    </div>
  </section>;
}
