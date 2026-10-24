import { useState } from "react";
import { ArrowLeft, ArrowRight, ImageOff } from "lucide-react";
import { Link } from "wouter";
import { SHOP_CATEGORY_LINKS } from "@/lib/product-category-links";

export type ConceptCategory = "decor" | "lighting" | "filters";

export interface ConceptScene {
  id: string;
  src: string;
  srcSet?: string;
  width: number;
  height: number;
}

/** Illustrations, not stock, customer projects, or a purchasable bill of materials. */
export const CONCEPT_SCENES: readonly ConceptScene[] = [{
  id: "sunlit-aquascape-concept",
  src: "/images/hero/aquavo-concept-20261024-1024.webp",
  srcSet: "/images/hero/aquavo-concept-20261024-640.webp 640w, /images/hero/aquavo-concept-20261024-1024.webp 1024w, /images/hero/aquavo-concept-20261024.webp 1672w",
  width: 1024,
  height: 576,
}, ...["open-sand", "woodland"].map((name): ConceptScene => ({
  id: `${name}-concept`,
  src: `/images/hero/aquavo-concept-${name}-20261024-1024.webp`,
  srcSet: `/images/hero/aquavo-concept-${name}-20261024-640.webp 640w, /images/hero/aquavo-concept-${name}-20261024-1024.webp 1024w, /images/hero/aquavo-concept-${name}-20261024.webp 1672w`,
  width: 1024,
  height: 576,
}))];

export interface ConceptLookbookCopy {
  eyebrow: string;
  title: string;
  introduction: string;
  disclosure: string;
  imageAlt: string;
  imageUnavailable: string;
  sceneTitle: string;
  sceneDescription: string;
  scenes?: Record<string, { title: string; description: string; imageAlt: string }>;
  navigationLabel: string;
  navigationNote: string;
  categories: Record<ConceptCategory, { title: string; description: string }>;
  journeyTitle: string;
  journeyDescription: string;
  journeyAction: string;
}

/** Supply localized copy from the host page; this component does not load a locale. */
export const CONCEPT_LOOKBOOK_COPY_AR: ConceptLookbookCopy = {
  eyebrow: "فكرة لحوضك",
  title: "خذ الإلهام، وابدأ بطريقتك",
  introduction: "شوف الجو اللي يعجبك، وبعدين اختَر تجهيزات تناسب حوضك واحتياجه.",
  disclosure: "مشهد إلهامي مولّد بالذكاء الاصطناعي، مو صورة مشروع زبون ولا باقة للبيع. الأسماك والنباتات مو ضمن منتجاتنا.",
  imageAlt: "تصوّر إلهامي مولّد بالذكاء الاصطناعي لحوض بإضاءة طبيعية، مو صورة منتجات فعلية",
  imageUnavailable: "الصورة مو متاحة هسه. تگدر تكمل استكشاف الأقسام أدناه.",
  sceneTitle: "ركن هادئ، بتفاصيل تختارها",
  sceneDescription: "الفكرة تبدأ من إحساس المكان. اختيار القطع الفعلية يعتمد على حجم حوضك وطريقة تجهيزه.",
  scenes: {
    "sunlit-aquascape-concept": { title: "ركن هادئ، بتفاصيل تختارها", description: "تصوّر إلهامي يجمع الضوء الطبيعي والتفاصيل الخضراء.", imageAlt: "مشهد مولّد بالذكاء الاصطناعي لحوض بإضاءة طبيعية، مو منتج فعلي" },
    "open-sand-concept": { title: "تنسيق رملي مفتوح", description: "تصوّر إلهامي بمساحة رملية مفتوحة وتفاصيل على الجوانب.", imageAlt: "مشهد مولّد بالذكاء الاصطناعي لحوض بتنسيق رملي مفتوح، مو منتج فعلي" },
    "woodland-concept": { title: "تنسيق خشبي", description: "تصوّر إلهامي بفروع خشبية وتباين بين التفاصيل والمساحة المفتوحة.", imageAlt: "مشهد مولّد بالذكاء الاصطناعي لحوض بتنسيق خشبي، مو منتج فعلي" },
  },
  navigationLabel: "استكشف الأقسام",
  navigationNote: "هاي روابط للأقسام بشكل عام، مو تحديد للقطع الظاهرة بالصورة.",
  categories: {
    decor: { title: "استكشف الديكور", description: "ابدأ بالشكل والتفاصيل اللي تناسب ذوقك." },
    lighting: { title: "استكشف الإضاءة", description: "قارن الخيارات حسب أبعاد حوضك واحتياجه." },
    filters: { title: "استكشف الفلاتر", description: "خلّي احتياج الحوض أساس اختيارك." },
  },
  journeyTitle: "عجبتك الفكرة، ومحتار بالبداية؟",
  journeyDescription: "كمّل برحلة تجهيز الحوض الموجودة، خطوة بخطوة.",
  journeyAction: "ابدأ تجهيز حوضك",
};

const CATEGORY_ORDER: readonly ConceptCategory[] = ["decor", "lighting", "filters"];
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function ConceptImage({ scene, copy }: { scene: ConceptScene; copy: ConceptLookbookCopy }) {
  const [failed, setFailed] = useState(false);
  const alt = copy.scenes?.[scene.id]?.imageAlt ?? copy.imageAlt;
  return failed ? (
    <div role="img" aria-label={alt} style={{ aspectRatio: `${scene.width} / ${scene.height}` }} className="flex flex-col items-center justify-center gap-4 bg-muted p-8 text-center text-muted-foreground">
      <ImageOff className="size-8" aria-hidden="true" />
      <p>{copy.imageUnavailable}</p>
    </div>
  ) : (
    <img src={scene.src} srcSet={scene.srcSet} sizes="(min-width: 1280px) 410px, (min-width: 1024px) 31vw, 100vw"
      width={scene.width} height={scene.height} alt={alt} loading="lazy" decoding="async"
      onError={() => setFailed(true)} className="h-auto w-full" />
  );
}

/** No carousel, autoplay, scroll interception, commerce claims, or product hotspots. */
export function ConceptLookbook({
  copy = CONCEPT_LOOKBOOK_COPY_AR,
  scenes = CONCEPT_SCENES,
  dir = "rtl",
}: {
  copy?: ConceptLookbookCopy;
  scenes?: readonly ConceptScene[];
  dir?: "rtl" | "ltr";
}) {
  const Forward = dir === "rtl" ? ArrowLeft : ArrowRight;
  return (
    <section dir={dir} className="border-y border-border bg-muted/20 px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-label={copy.title}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 max-w-2xl text-start">
          <p className="mb-3 text-sm font-bold text-primary">{copy.eyebrow}</p>
          <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">{copy.title}</h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">{copy.introduction}</p>
        </header>
        <div className="space-y-8">
          <div className="grid gap-5 lg:grid-cols-3">
            {scenes.map((scene) => (
              <figure key={`${scene.id}:${scene.src}`} className="overflow-hidden rounded-2xl border border-border bg-card">
                <ConceptImage scene={scene} copy={copy} />
                <figcaption className="space-y-3 p-5 sm:p-6">
                  <p className="border-s-2 border-primary ps-3 text-sm font-medium leading-7 text-foreground">{copy.disclosure}</p>
                  <h3 className="font-display text-xl font-bold text-foreground">{copy.scenes?.[scene.id]?.title ?? copy.sceneTitle}</h3>
                  <p className="text-sm leading-7 text-muted-foreground">{copy.scenes?.[scene.id]?.description ?? copy.sceneDescription}</p>
                </figcaption>
              </figure>
            ))}
            {scenes.length === 0 && <p className="rounded-2xl border border-border bg-card p-6 text-sm leading-7">{copy.disclosure}</p>}
          </div>
          <div className="grid min-w-0 gap-8 text-start lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
            <nav aria-label={copy.navigationLabel}>
              <h3 className="font-display text-xl font-bold text-foreground">{copy.navigationLabel}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{copy.navigationNote}</p>
              <ol className="mt-5 divide-y divide-border border-y border-border">
                {CATEGORY_ORDER.map((category, index) => (
                  <li key={category}>
                    <Link href={SHOP_CATEGORY_LINKS[category]} className={`group flex min-h-24 items-center gap-4 rounded-lg py-5 ${focus}`}>
                      <span aria-hidden="true" className="font-interface text-sm tabular-nums text-primary">{String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-foreground group-hover:text-primary">{copy.categories[category].title}</span>
                        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{copy.categories[category].description}</span>
                      </span>
                      <Forward aria-hidden="true" className="size-5 shrink-0 text-primary" />
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
            <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
              <h3 className="font-bold text-foreground">{copy.journeyTitle}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{copy.journeyDescription}</p>
              <Link href="/journey" className={`mt-4 inline-flex min-h-12 items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 ${focus}`}>
                {copy.journeyAction}<Forward aria-hidden="true" className="size-4" />
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
