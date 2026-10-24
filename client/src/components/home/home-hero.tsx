import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";

const linkButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export interface HomeHeroCopy {
  eyebrow: string;
  title: string;
  description: string;
  browse: string;
  journey: string;
  help: string;
  imageAlt: string;
  sceneNote: string;
  methodLabel: string;
  methodTitle: string;
}

/** Arabic source copy. The build-time prerender (script/prerender-home-hero.ts) uses exactly this. */
export const HOME_HERO_COPY_AR: HomeHeroCopy = {
  eyebrow: "AQUAVO — متجر عراقي أونلاين متخصص بالأحواض",
  title: "اختَر تجهيزات تناسب حوضك",
  description: "تسوّق حسب احتياجك، أو خلّينا نساعدك تختار القطع المناسبة.",
  browse: "تسوّق المنتجات",
  journey: "جهّز حوضك",
  help: "عندك حوض ومحتار؟ دز حجمه ونرتبلك المناسب.",
  imageAlt: "مشهد إلهامي مولد بالذكاء الاصطناعي لحوض مزروع، مو صورة منتج للبيع",
  sceneNote: "مشهد إلهامي مولد بالذكاء الاصطناعي، مو باقة للبيع. الأسماك والنباتات مو ضمن منتجاتنا.",
  methodLabel: "طريقة AQUAVO",
  methodTitle: "الحوض أولاً، القطعة بعدها",
};

interface HomeHeroProps {
  /** Localized strings. Defaults to the Arabic source so the prerender stays hook-free. */
  copy?: HomeHeroCopy;
  /** Reading direction; decides which way the "forward" arrow points. */
  dir?: "rtl" | "ltr";
}

/**
 * The homepage hero, above the fold and the LCP element.
 *
 * It lives in its own component with no hooks, no data fetching and no context
 * so that script/prerender-home-hero.ts can render the very same tree to static
 * HTML at build time. api/ssr-meta.ts injects that HTML inside #root, which
 * lets the hero image paint before the React bundle has executed. Arabic home
 * now prerenders the full StorefrontRoot and hydrates it, preserving this image
 * node. The hero-only fallback on other locales still uses createRoot().
 *
 * Keep this component free of hooks, browser globals and imported state — the
 * prerender runs in Node. client/src/components/home/__tests__ pins that.
 * Localized copy therefore arrives through props, never through a hook.
 */
export function HomeHero({ copy = HOME_HERO_COPY_AR, dir = "rtl" }: HomeHeroProps) {
  const Forward = dir === "rtl" ? ArrowLeft : ArrowRight;
  return (
      <section className="aq-waterline-hero relative isolate border-b border-border bg-background px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-border bg-card">
          <div className="aq-hero-copy relative z-10 p-5 text-start sm:p-8 lg:absolute lg:right-[3%] lg:top-1/2 lg:w-[32%] lg:-translate-y-1/2 lg:rounded-2xl lg:bg-background/95 lg:p-5" dir={dir}>
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold leading-6 text-primary">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              {copy.eyebrow}
            </p>
            <h1 className="aq-hero-title font-display text-[clamp(1.9rem,4vw,2.7rem)] font-bold leading-[1.2] text-foreground">
              {copy.title}
            </h1>
            <p className="aq-hero-support mt-3 text-base leading-7 text-muted-foreground">{copy.description}</p>
            <div className="aq-hero-actions mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-col">
              <Link href="/products" className={`${linkButton} bg-primary text-white hover:bg-primary/90`} data-tour="hero-cta">
                {copy.browse}<Forward className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/journey" className={`${linkButton} border border-primary/40 text-primary hover:bg-primary/10`}>
                {copy.journey}<Sparkles className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy.help}</p>
          </div>
          <figure className="aq-proof-window m-0">
            <img
              src="/images/hero/aquavo-concept-20261024.webp"
              srcSet="/images/hero/aquavo-concept-20261024-640.webp 640w, /images/hero/aquavo-concept-20261024-1024.webp 1024w, /images/hero/aquavo-concept-20261024.webp 1672w"
              sizes="(max-width: 1280px) 100vw, 1280px"
              width={1672}
              height={941}
              fetchPriority="high"
              decoding="async"
              alt={copy.imageAlt}
              className="block h-auto w-full"
            />
            <figcaption className="border-t border-border bg-background px-5 py-3 text-xs leading-6 text-muted-foreground sm:px-8">{copy.sceneNote}</figcaption>
          </figure>
        </div>
      </section>
  );
}
