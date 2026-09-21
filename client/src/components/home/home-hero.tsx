import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";

const linkButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * The homepage hero, above the fold and the LCP element.
 *
 * It lives in its own component with no hooks, no data fetching and no context
 * so that script/prerender-home-hero.ts can render the very same tree to static
 * HTML at build time. api/ssr-meta.ts injects that HTML inside #root, which
 * lets the hero image paint before the React bundle has executed. main.tsx
 * mounts with createRoot().render(), and that clears the container first, so
 * this component replaces the prerendered copy rather than duplicating it.
 *
 * Keep this component free of hooks, browser globals and imported state — the
 * prerender runs in Node. client/src/components/home/__tests__ pins that.
 */
export function HomeHero() {
  return (
      <section className="aq-waterline-hero relative isolate overflow-hidden border-b border-border bg-background pt-24 sm:pt-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_22%,rgba(11,147,166,0.2),transparent_34%),radial-gradient(circle_at_18%_70%,rgba(11,100,166,0.14),transparent_30%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-8 sm:px-6 sm:pb-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-8 lg:pb-20 lg:pt-12">
          <div className="aq-hero-copy order-2 text-right lg:order-1">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-bold text-primary sm:text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              براند عراقي متخصص بمعدات ومستلزمات أحواض الزينة
            </p>
            <h1 className="aq-hero-title max-w-3xl font-display text-[2.55rem] font-bold leading-[1.12] text-foreground sm:text-5xl lg:text-[3.55rem]">
              معدات حوضك، مرتبة على احتياجك
            </h1>
            <p className="aq-hero-support mt-6 max-w-2xl text-base leading-8 text-foreground/70 sm:text-lg">
              نساعدك تختار الفلتر والسخان والإضاءة وباقي التجهيز حسب حوضك، بمعلومات واضحة وبدون زحمة خيارات.
            </p>

            <div className="aq-hero-actions mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/products"
                className={`${linkButton} bg-primary text-white hover:bg-primary/90`}
                data-tour="hero-cta"
              >
                شوف المنتجات
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/tank-builder"
                className={`${linkButton} border border-primary/40 text-primary hover:bg-[#0B93A6]/10`}
              >
                اختار حسب حوضك
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-6 text-sm leading-6 text-foreground/55">
              عندك حوض ومحتار؟ دز حجمه ونرتبلك المناسب.
            </p>
          </div>

          <div className="order-1 lg:order-2">
            <div className="aq-proof-window relative mx-auto max-w-2xl overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_20px_60px_rgba(11,30,40,0.12)]">
              <img
                src="/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp"
                srcSet="/images/aquascape-styles/iwagumi_aquascape_1765676307763-640.webp 640w, /images/aquascape-styles/iwagumi_aquascape_1765676307763.webp 1024w"
                sizes="(max-width: 1024px) 100vw, 48vw"
                width={1024}
                height={1024}
                fetchPriority="high"
                decoding="async"
                alt="حوض عرض مائي مرتب بإضاءة هادئة"
                className="aspect-[4/3] w-full object-cover sm:aspect-[16/11]"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/90 px-4 py-3 text-foreground backdrop-blur-md sm:inset-x-7 sm:bottom-7">
                <div>
                  <p className="text-xs text-foreground/60">طريقة AQUAVO</p>
                  <p className="mt-1 text-sm font-bold sm:text-base">الحوض أولاً، القطعة بعدها</p>
                </div>
                <img src="/brand/aquavo-v2-icon.svg" alt="" aria-hidden="true" className="h-9 w-9" />
              </div>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
      </section>
  );
}
