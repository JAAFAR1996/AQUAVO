import { useState, useMemo, useRef, useEffect, lazy, Suspense, type ReactNode } from "react";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Crown, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";

import { useQuery } from "@tanstack/react-query";
import { fetchTopSellingProducts } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { preferLocalWebp } from "@/lib/image-variants";

import { BackToTop } from "@/components/back-to-top";
import { MetaTags, OrganizationSchema, WebsiteSchema, LocalBusinessSchema } from "@/components/seo/meta-tags";
import { WaveDivider } from "@/components/ui/wave-divider";
import { SpotlightEffect } from "@/components/effects/spotlight-effect";

// Lazy-load below-fold heavy components (reduces initial bundle by ~50KB)
const PersonalizedSection = lazy(() => import("@/components/home/personalized-section").then(m => ({ default: m.PersonalizedSection })));
const Testimonials = lazy(() => import("@/components/home/testimonials").then(m => ({ default: m.Testimonials })));
const AquascapeStyles = lazy(() => import("@/components/home/aquascape-styles").then(m => ({ default: m.AquascapeStyles })));
const Footer = lazy(() => import("@/components/footer"));


// Hero images for rotation on page refresh
const HERO_IMAGES = [
  "/images/aquascape-styles/iwagumi_aquascape_1765676307763.webp", // Iwagumi Style
];

// Lazy hero video: shows poster immediately, loads video after delay
function LazyHeroVideo({ poster }: { poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const connection = (navigator as any).connection;
    const savesData = Boolean(connection?.saveData);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (savesData || reducedMotion || coarsePointer) return;

    const load = () => setShouldLoad(true);
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      idleId = (window as any).requestIdleCallback?.(load, { timeout: 2000 });
      if (!idleId) load();
    }, 12000);

    return () => {
      window.clearTimeout(timer);
      if (idleId) (window as any).cancelIdleCallback(idleId);
    };
  }, []);

  useEffect(() => {
    if (shouldLoad && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [shouldLoad]);

  if (!shouldLoad) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      preload="none"
      className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105 z-[1]"
      style={{ objectFit: 'cover', objectPosition: 'center' }}
      poster={poster}
    >
      <source src="/images/hero/Aquarium_Animation_Request_Fulfilled.mp4" type="video/mp4" />
    </video>
  );
}

function DeferredRender({
  children,
  className,
  minHeight = 1,
}: {
  children: ReactNode;
  className?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px 120px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <div ref={ref} className={className} style={!shouldRender ? { minHeight } : undefined}>
      {shouldRender ? children : null}
    </div>
  );
}

function DeferredMount({ children, timeout = 12000 }: { children: ReactNode; timeout?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mount = () => setMounted(true);
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      idleId = (window as any).requestIdleCallback?.(mount, { timeout: 2000 });
      if (!idleId) mount();
    }, timeout);

    return () => {
      window.clearTimeout(timer);
      if (idleId) (window as any).cancelIdleCallback(idleId);
    };
  }, [timeout]);

  return mounted ? <>{children}</> : null;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [shouldFetchSales, setShouldFetchSales] = useState(false);

  // Random hero image selection on page load
  const heroImage = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * HERO_IMAGES.length);
    return HERO_IMAGES[randomIndex];
  }, []);

  useEffect(() => {
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      idleId = (window as any).requestIdleCallback?.(
        () => setShouldFetchSales(true),
        { timeout: 2500 }
      );
      if (!idleId) setShouldFetchSales(true);
    }, 7000);

    return () => {
      window.clearTimeout(timer);
      if (idleId) (window as any).cancelIdleCallback(idleId);
    };
  }, []);

  // Fetch Top Selling Data (Dynamic based on sales)
  const { data: salesData, isLoading: salesIsLoading } = useQuery({
    queryKey: ["products", "top-selling"],
    queryFn: fetchTopSellingProducts,
    enabled: shouldFetchSales,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const featuredProduct = salesData?.productOfWeek;
  const bestSellers = salesData?.bestSellers ?? [];
  const hasRealSales = salesData?.hasRealSales ?? false;
  const salesPending = !shouldFetchSales || salesIsLoading;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans transition-colors duration-300 overflow-x-hidden">
      <MetaTags
        title="الرئيسية"
        description="AQUAVO - وجهتك الأولى لمستلزمات أحواض الأسماك، نباتات الزينة، والعناية بالحياة المائية في العراق."
      />
      <OrganizationSchema />
      <WebsiteSchema />
      <LocalBusinessSchema />

      <Navbar />

      <SpotlightEffect />
      <main id="main-content" className="container mx-auto px-4 pt-24 pb-12 flex-grow z-10 relative">
        {/* Bento Grid Layout - Gen Z Style */}
        <div className="grid grid-cols-1 lg:grid-cols-12 auto-rows-[minmax(180px,auto)] gap-4 md:gap-6">

          {/* 1. Hero & Video Section (Wide Box: 8 cols, 2 rows) */}
          <div className="lg:col-span-8 lg:row-span-2 rounded-2xl overflow-hidden relative group shadow-2xl shadow-primary/10 border border-white/10 bg-black min-h-[400px] md:min-h-[500px]">
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 z-10" />
            {/* Hero poster as LCP element with fetchpriority */}
            <img
              src={heroImage}
              alt="حوض أسماك بتصميم إيواغومي احترافي"
              className="absolute inset-0 w-full h-full object-cover"
              fetchPriority="high"
              decoding="sync"
              width={1200}
              height={800}
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
            {/* Video loads lazily after poster is visible */}
            <LazyHeroVideo poster={heroImage} />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent opacity-60"></div>

            {/* Overlay Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20 text-right">
              <div className="inline-flex items-center gap-2 bg-primary px-4 py-1 rounded-full text-black font-extrabold mb-4 text-sm md:text-base animate-pulse-glow">
                <span className="uppercase tracking-widest">جديد 2026</span>
                <Crown className="w-4 h-4" />
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-none drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] mb-4">
                حول <span className="text-primary text-stroke-sm">حوضك</span> <br />
                إلى <span className="text-accent">تحفة فنية</span>.
              </h1>

              <div className="flex flex-wrap gap-4 justify-end mt-6">
                <Button
                  size="lg"
                  className="rounded-full bg-primary text-black hover:bg-primary/90 font-bold text-lg px-8 py-6 h-auto shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all hover:scale-105 active:scale-95"
                  onClick={() => setLocation("/products")}
                  data-tour="hero-cta"
                >
                  تسوق الآن <ArrowRight className="mr-2 w-5 h-5 rotate-180" />
                </Button>
                {/* Play button removed */}
              </div>
            </div>
          </div>

          {/* 2. Best Sellers List (Tall Box: 4 cols, 3 rows) */}
          <div className="lg:col-span-4 lg:row-span-3 rounded-[2.5rem] bg-card/80 dark:bg-white/5 border border-border dark:border-white/10 backdrop-blur-xl p-6 flex flex-col shadow-xl overflow-hidden relative min-h-[600px]">
            <div className="flex justify-between items-center mb-6 z-10 relative">
              <Link href="/products?sort=best-selling">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">المزيد</Button>
              </Link>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground dark:text-white">
                {hasRealSales ? (
                  <>الأكثر مبيعاً <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" /></>
                ) : (
                  <>اختيارات AQUAVO <Sparkles className="w-6 h-6 text-primary animate-pulse" /></>
                )}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar -mr-2 pl-2 z-10 relative">
              {salesPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="w-16 h-16 rounded-xl bg-muted/20 dark:bg-white/10" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full bg-muted/20 dark:bg-white/10" />
                      <Skeleton className="h-3 w-12 bg-muted/20 dark:bg-white/10" />
                    </div>
                  </div>
                ))
              ) : bestSellers.slice(0, 6).map((product, idx) => (
                <div key={product.id} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/50 dark:hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-border dark:hover:border-white/5" onClick={() => setLocation(`/products/${product.slug}`)}>
                  <div className="text-4xl font-black text-muted-foreground/20 dark:text-white/10 italic w-8 text-center group-hover:text-primary/50 transition-colors">#{idx + 1}</div>
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted/20 dark:bg-black/20">
                    <img src={preferLocalWebp(product.images[0])} alt={product.name} className="w-full h-full object-contain p-1 transform group-hover:scale-110 transition-transform duration-500" loading="lazy" decoding="async" width={64} height={64} />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-bold text-foreground dark:text-gray-100 line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
                    <div className="flex items-center justify-end gap-2 text-sm">
                      {(product.price ?? 0) > 0 ? (
                        <>
                          <span className="font-bold text-primary text-xs">{formatPrice(product.price!)}</span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-[10px] text-muted-foreground line-through mr-1">{formatPrice(product.originalPrice)}</span>
                          )}
                        </>
                      ) : (
                        <span className="font-bold text-muted-foreground text-xs">قريباً ✨</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>


            {/* Decoration */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          </div>

          {/* 3. Product of the Day (Small Box: 4 cols, 1 row) */}
          <div className="lg:col-span-4 lg:row-span-1 rounded-[2.5rem] bg-card dark:bg-[#0a0f1c] border border-border dark:border-border/50 p-6 flex relative overflow-hidden group hover:border-primary/50 transition-colors min-h-[180px]">
            <div className="absolute top-0 right-0 bg-accent text-white px-4 py-1 rounded-bl-2xl font-bold text-sm shadow-lg z-10">صفقة الأسبوع</div>
            {salesPending || !featuredProduct ? (
              <div className="flex w-full gap-4">
                <Skeleton className="w-24 h-24 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center gap-4 relative z-10 cursor-pointer" onClick={() => setLocation(`/products/${featuredProduct.slug}`)}>
                <div className="w-28 h-28 p-2 rounded-2xl bg-muted/20 dark:bg-white/5 border border-border dark:border-white/10 group-hover:scale-105 transition-transform duration-300">
                  <img src={preferLocalWebp(featuredProduct.images[0])} alt={featuredProduct.name} className="w-full h-full object-contain" loading="lazy" decoding="async" width={112} height={112} />
                </div>
                <div className="flex-1 text-right space-y-2">
                  <h3 className="text-xl font-bold leading-tight text-foreground dark:text-white">{featuredProduct.name}</h3>
                  <div className="flex gap-2 justify-end items-baseline">
                    {(featuredProduct.price ?? 0) > 0 ? (
                      <>
                        <span className="text-2xl font-black text-primary">{formatPrice(featuredProduct.price!)}</span>
                        {featuredProduct.originalPrice && featuredProduct.originalPrice > featuredProduct.price && (
                          <span className="text-sm text-muted-foreground line-through">{formatPrice(featuredProduct.originalPrice)}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl font-black text-muted-foreground">قريباً ✨</span>
                    )}
                  </div>

                  <Button size="sm" className="w-full bg-secondary hover:bg-secondary/80 dark:bg-white/10 dark:hover:bg-white/20 border border-border dark:border-white/10 text-foreground dark:text-white text-xs h-8">
                    أضف للسلة +
                  </Button>
                </div>
              </div>
            )}
            {/* Background Glow */}
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/10 dark:bg-accent/20 rounded-full blur-[50px] group-hover:bg-accent/20 dark:group-hover:bg-accent/30 transition-colors" />
          </div>



          {/* 5. Additional Promo / Categories (Spanning bottom if needed or separate section) */}
          {/* We have 8 cols for Row 3 covered (4 for Product, 4 for CTA).
              Wait, Hero is Width 8, Rows 1-2.
              Best Sellers is Width 4, Rows 1-3.
              We need to fill Width 8 in Row 3!
              Product of Day (4) + CTA (4) = 8.
              So Product of Day is Col 1-4, CTA is Col 5-8.
              This perfectly fills the grid.
          */}
        </div>

        {/* AI Personalized Recommendations */}
        <DeferredRender className="content-visibility-auto" minHeight={320}>
          <Suspense fallback={<div className="mt-16 min-h-80" />}>
            <PersonalizedSection />
          </Suspense>
        </DeferredRender>

        {/* Categories Marquee / Quick Links */}
        <div className="mt-12 py-8 overflow-hidden relative">
          <div className="flex gap-4 animate-wave-scroll whitespace-nowrap">
            {/* Add category pills later */}
          </div>
        </div>
      </main>

      <WaveDivider className="-mt-12 z-0 relative opacity-50" />

      {/* Keep the rest of the sections but style them better later? 
          For now, I'll keep the Masonry Gallery and Testimonials but maybe hide the old 'Features' and regular 'Best Sellers' since we have them in Bento.
      */}

      {/* Customer Testimonials - lazy loaded */}
      <DeferredRender className="content-visibility-auto" minHeight={420}>
        <Suspense fallback={<div className="py-20" />}>
          <Testimonials />
        </Suspense>
      </DeferredRender>

      {/* Existing Sections Refined - lazy loaded */}
      <DeferredRender className="content-visibility-auto" minHeight={640}>
        <Suspense fallback={<div className="py-20" />}>
          <AquascapeStyles />
        </Suspense>
      </DeferredRender>


      <DeferredMount>
        <BackToTop />
      </DeferredMount>

      <DeferredRender className="content-visibility-auto" minHeight={720}>
        <Suspense fallback={<div className="min-h-[720px]" />}>
          <Footer />
        </Suspense>
      </DeferredRender>
    </div>
  );
}
