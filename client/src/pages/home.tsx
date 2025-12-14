import { useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Truck, ShieldCheck, Phone, Leaf, Droplets, Thermometer, Package, Trophy, Crown, Camera, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { BubbleTrail } from "@/components/effects/bubble-trail";
import { ProductOfTheWeek } from "@/components/home/product-of-the-week";
import { MasonryGalleryGrid } from "@/components/gallery/masonry-gallery-grid";
import { WaterRippleButton } from "@/components/effects/water-ripple-button";
import { ProductCard } from "@/components/products/product-card";
import { WaveScrollEffect } from "@/components/effects/wave-scroll-effect";
import { Testimonials } from "@/components/home/testimonials";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchTopSellingProducts } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { BackToTop } from "@/components/back-to-top";
import { MetaTags, OrganizationSchema } from "@/components/seo/meta-tags";
import { WaveDivider } from "@/components/ui/wave-divider";
import { QuickViewModal } from "@/components/products/quick-view-modal";
import { Product } from "@/types";
import { SpotlightEffect } from "@/components/effects/spotlight-effect";
import { ParallaxText } from "@/components/effects/parallax-text";

export default function Home() {
  const [, setLocation] = useLocation();

  // Fetch Top Selling Data (Dynamic based on sales)
  const { data: salesData, isLoading: salesIsLoading } = useQuery({
    queryKey: ["products", "top-selling"],
    queryFn: fetchTopSellingProducts,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const featuredProduct = salesData?.productOfWeek;
  const bestSellers = salesData?.bestSellers ?? [];

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const { data: gallerySubmissions } = useQuery({
    queryKey: ["/api/gallery/submissions"],
    queryFn: async () => {
      const res = await fetch("/api/gallery/submissions");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const winner = gallerySubmissions?.find((s: any) => s.isWinner);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans transition-colors duration-300 overflow-x-hidden">
      <MetaTags
        title="الرئيسية"
        description="AQUAVO - وجهتك الأولى لمستلزمات أحواض الأسماك، نباتات الزينة، والعناية بالحياة المائية في العراق."
      />
      <OrganizationSchema />
      <BubbleTrail />
      <Navbar />

      <SpotlightEffect />
      <main className="container mx-auto px-4 pt-24 pb-12 flex-grow z-10 relative">
        {/* Bento Grid Layout - Gen Z Style */}
        <div className="grid grid-cols-1 lg:grid-cols-12 auto-rows-[minmax(180px,auto)] gap-4 md:gap-6">

          {/* 1. Hero & Video Section (Wide Box: 8 cols, 2 rows) */}
          <div className="lg:col-span-8 lg:row-span-2 rounded-[2.5rem] overflow-hidden relative group shadow-2xl shadow-primary/10 border border-white/10 bg-white/5 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 z-10" />
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?q=80&w=2000&auto=format&fit=crop")' }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent opacity-60"></div>

            {/* Overlay Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20 text-right">
              <div className="inline-flex items-center gap-2 bg-primary px-4 py-1 rounded-full text-black font-extrabold mb-4 text-sm md:text-base animate-pulse-glow">
                <span className="uppercase tracking-widest">جديد 2025</span>
                <Crown className="w-4 h-4" />
              </div>
              <ParallaxText offset={-30} className="mb-4">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-none drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  حول <span className="text-primary text-stroke-sm">حوضك</span> <br />
                  إلى <span className="text-accent">تحفة فنية</span>.
                </h1>
              </ParallaxText>

              <div className="flex flex-wrap gap-4 justify-end mt-6">
                <Button
                  size="lg"
                  className="rounded-full bg-primary text-black hover:bg-primary/90 font-bold text-lg px-8 py-6 h-auto shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all hover:scale-105 active:scale-95"
                  onClick={() => setLocation("/products")}
                >
                  تسوق الآن <ArrowRight className="mr-2 w-5 h-5 rotate-180" />
                </Button>
                {/* Play button removed */}
              </div>
            </div>
          </div>

          {/* 2. Best Sellers List (Tall Box: 4 cols, 3 rows) */}
          <div className="lg:col-span-4 lg:row-span-3 rounded-[2.5rem] bg-card/80 dark:bg-white/5 border border-border dark:border-white/10 backdrop-blur-xl p-6 flex flex-col shadow-xl overflow-hidden relative">
            <div className="flex justify-between items-center mb-6 z-10 relative">
              <Link href="/products?sort=best-selling">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">المزيد</Button>
              </Link>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground dark:text-white">
                الأكثر مبيعاً <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar -mr-2 pl-2 z-10 relative">
              {salesIsLoading ? (
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
                <div key={product.id} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/50 dark:hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-border dark:hover:border-white/5" onClick={() => setLocation(`/products/${product.id}`)}>
                  <div className="text-4xl font-black text-muted-foreground/20 dark:text-white/10 italic w-8 text-center group-hover:text-primary/50 transition-colors">#{idx + 1}</div>
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted/20 dark:bg-black/20">
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain p-1 transform group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-bold text-foreground dark:text-gray-100 line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
                    <div className="flex items-center justify-end gap-2 text-sm">
                      <span className="font-mono font-bold text-accent">{product.price.toLocaleString()} د.ع</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gamification Teaser in Sidebar */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-center relative z-10">
              <p className="text-sm font-bold mb-2 text-foreground dark:text-white">🔥 150+ شخص اشتروا اليوم!</p>
              <div className="w-full bg-black/10 dark:bg-black/40 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-accent w-[70%] h-full animate-pulse" />
              </div>
            </div>

            {/* Decoration */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          </div>

          {/* 3. Product of the Day (Small Box: 4 cols, 1 row) */}
          <div className="lg:col-span-4 lg:row-span-1 rounded-[2.5rem] bg-card dark:bg-[#0a0f1c] border border-border dark:border-border/50 p-6 flex relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 bg-accent text-white px-4 py-1 rounded-bl-2xl font-bold text-sm shadow-lg z-10">صفقة الأسبوع</div>
            {salesIsLoading || !featuredProduct ? (
              <div className="flex w-full gap-4">
                <Skeleton className="w-24 h-24 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center gap-4 relative z-10 cursor-pointer" onClick={() => setLocation(`/products/${featuredProduct.id}`)}>
                <div className="w-28 h-28 p-2 rounded-2xl bg-muted/20 dark:bg-white/5 border border-border dark:border-white/10 group-hover:scale-105 transition-transform duration-300">
                  <img src={featuredProduct.images[0]} alt={featuredProduct.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 text-right space-y-2">
                  <h3 className="text-xl font-bold leading-tight text-foreground dark:text-white">{featuredProduct.name}</h3>
                  <div className="flex gap-2 justify-end items-baseline">
                    <span className="text-2xl font-black text-primary font-mono">{featuredProduct.price.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">د.ع</span>
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

      {/* Existing Sections Refined */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          {/* Reusing Masonry Gallery */}
          <div className="text-right mb-12">
            <h2 className="text-5xl font-extrabold mb-4 font-heading text-transparent bg-clip-text bg-gradient-to-l from-primary to-accent">إلهام من مجتمعنا</h2>
            <p className="text-xl text-muted-foreground">شاهد ماذا صنع الآخرون بأدواتنا</p>
          </div>
          <MasonryGalleryGrid />
        </div>
      </section>

      <WhatsAppWidget />
      <BackToTop />

      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />

      <Footer />
    </div>
  );
}
