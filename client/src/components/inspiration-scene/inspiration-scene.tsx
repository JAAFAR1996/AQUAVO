import { useId, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, ImageOff } from 'lucide-react';
import { LOCALES, type Locale } from '@shared/i18n/locales';
import { buildInspirationScene, INSPIRATION_SCENE_BACKGROUND, INSPIRATION_SCENE_PUMP_WARNING, type InspirationSceneItem, type InspirationSceneProductSource } from '@/lib/inspiration-scene';
import { detailImage, detailImageSrcSet, thumbImage } from '@/lib/cloudinary';
import { INSPIRATION_SCENE_COPY, type InspirationSceneCopy } from './inspiration-scene-copy';
import './inspiration-scene.css';

function CatalogueLayer({ item, copy, disclosureId, warningId }: {
  item: InspirationSceneItem; copy: InspirationSceneCopy; disclosureId: string; warningId: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!item.href || !item.image || failed) return null;
  const imageSizes = item.role === 'wood' ? '(min-width: 1440px) 589px, 46vw' : item.role === 'sand' ? '(min-width: 1440px) 397px, 31vw' : '(min-width: 1440px) 231px, 18vw';
  const name = `${item.name}${item.variantLabel ? ` · ${item.variantLabel}` : ''}`;
  return <Link href={item.href} className={`inspiration-scene__layer inspiration-scene__layer--${item.role}`}
    data-product-id={item.productId} data-variant-id={item.variantId} data-scene-layer={item.role}
    aria-label={`${item.number}. ${name}. ${copy.view}`}
    aria-describedby={`${disclosureId}${item.role === 'pump' ? ` ${warningId}` : ''}`}>
    <img src={detailImage(item.image)} srcSet={detailImageSrcSet(item.image)} sizes={imageSizes} data-catalogue-source={item.image} alt={name} width={item.imageWidth} height={item.imageHeight}
      loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
    <span className="inspiration-scene__hotspot" aria-hidden="true">{String(item.number).padStart(2, '0')}</span>
  </Link>;
}

function CatalogueThumbnail({ item }: { item: InspirationSceneItem }) {
  const [failed, setFailed] = useState(false);
  return <div className="inspiration-scene__thumbnail" aria-hidden="true">
    {item.image && !failed ? <img src={thumbImage(item.image)} data-catalogue-source={item.image} alt="" width={item.imageWidth} height={item.imageHeight} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      : <ImageOff size={24} />}
    <span className="inspiration-scene__thumbnail-number">{String(item.number).padStart(2, '0')}</span>
  </div>;
}

/** Unchanged catalogue layers on an empty AI setting, never a fabricated install. */
export function InspirationScene({ products, language = 'ar', isLoading = false }: {
  products: readonly InspirationSceneProductSource[]; language?: Locale; isLoading?: boolean;
}) {
  const headingId = useId();
  const disclosureId = useId();
  const warningId = useId();
  const copy = INSPIRATION_SCENE_COPY[language];
  const items = buildInspirationScene(products);
  const Forward = LOCALES[language].dir === 'rtl' ? ArrowLeft : ArrowRight;
  return <section id="inspiration-scene" className="inspiration-scene" dir={LOCALES[language].dir} aria-labelledby={headingId}>
    <div className="inspiration-scene__inner">
      <header className="inspiration-scene__header">
        <div><p className="inspiration-scene__eyebrow">{copy.eyebrow}</p><h2 id={headingId}>{copy.title}</h2></div>
        <p className="inspiration-scene__intro">{copy.intro}</p>
      </header>
      <figure className="inspiration-scene__figure">
        <div className="inspiration-scene__frame-caption"><span>{copy.frameLabel}</span><span>{copy.imageLabel}</span></div>
        {isLoading ? <div className="inspiration-scene__loading" role="status">{copy.loading}</div> : <div className="inspiration-scene__stage">
          <img className="inspiration-scene__background" src={INSPIRATION_SCENE_BACKGROUND.src}
            srcSet={INSPIRATION_SCENE_BACKGROUND.srcSet} sizes="(min-width: 1440px) 1280px, (min-width: 640px) calc(100vw - 96px), calc(100vw - 32px)"
            width={INSPIRATION_SCENE_BACKGROUND.width} height={INSPIRATION_SCENE_BACKGROUND.height}
            alt={copy.backgroundAlt} loading="lazy" decoding="async" />
          {items.map(item => <CatalogueLayer key={`${item.key}:${item.image}`} item={item} copy={copy} disclosureId={disclosureId} warningId={warningId} />)}
          <span className="inspiration-scene__setting-label">{copy.settingLabel}</span>
        </div>}
        <div className="inspiration-scene__safety" id={warningId}>
          <span className="inspiration-scene__safety-dot" aria-hidden="true" />
          <strong>{copy.unpowered}</strong><span>{copy.pumpWarning}</span>
          {language !== 'ar' && <span lang="ar" dir="rtl">{INSPIRATION_SCENE_PUMP_WARNING}</span>}
        </div>
        <figcaption className="inspiration-scene__disclosure" id={disclosureId}>
          <p>{copy.disclosure}</p><p>{copy.scopeNote}</p>
        </figcaption>
      </figure>
      <div className="inspiration-scene__list-heading"><h3>{copy.listLabel}</h3><p>{copy.listNote}</p></div>
      {!isLoading && <ol className="inspiration-scene__list" aria-label={copy.listLabel}>
        {items.map(item => <li key={item.key} className="inspiration-scene__product">
          <CatalogueThumbnail key={`${item.key}:${item.image}`} item={item} />
          <div className="inspiration-scene__product-body"><p className="inspiration-scene__role">{copy.roles[item.role]}</p>
            {item.href ? <Link href={item.href} className="inspiration-scene__product-link" aria-label={`${item.name}. ${copy.view}`}>
              <span>{item.name}</span><Forward size={18} aria-hidden="true" />
            </Link> : <p className="inspiration-scene__unavailable">{copy.unavailable}</p>}
            {item.variantLabel && <p className="inspiration-scene__option">{copy.picturedOption}: <bdi>{item.variantLabel}</bdi></p>}
            {!item.image && item.href && <p className="inspiration-scene__option">{copy.missingPhoto}</p>}
            <p className={`inspiration-scene__availability${item.availability === 'listed' ? ' inspiration-scene__availability--listed' : ''}`}>{copy.availability[item.availability]}</p>
            {item.pricePending && item.availability !== 'pending-price' && <p className="inspiration-scene__option">{copy.pendingPrice}</p>}
            {item.role === 'pump' && <p className="inspiration-scene__pump-note">{copy.unpowered}. {copy.pumpWarning}</p>}
          </div>
        </li>)}
      </ol>}
    </div>
  </section>;
}
