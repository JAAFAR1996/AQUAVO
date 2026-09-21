import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  BookOpen,
  Boxes,
  CircleGauge,
  Droplets,
  FileSearch,
  GraduationCap,
  Headphones,
  Heater,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  PackageCheck,
  PackageSearch,
  Target,
  Truck,
  Utensils,
} from "lucide-react";
import { Link } from "wouter";

import { BackToTop } from "@/components/back-to-top";
import { MetaTags } from "@/components/seo/meta-tags";
import { HomeHero } from "@/components/home/home-hero";
import { PrecisionReveal } from "@/components/motion/precision-reveal";
import { fetchTopSellingProducts } from "@/lib/api";
import { cardImage, cardImageSrcSet } from "@/lib/cloudinary";
import { formatPrice } from "@/lib/format";
import { SHOP_CATEGORY_LINKS } from "@/lib/product-category-links";

const serviceFacts = [
  { icon: Truck, title: "توصيل لكل العراق", detail: "خلال 24 ساعة" },
  { icon: Banknote, title: "طرق دفع مرنة", detail: "عند الاستلام أو إلكترونياً" },
  { icon: PackageCheck, title: "أجرة توصيل ثابتة", detail: "5,000 د.ع" },
  { icon: Headphones, title: "دعم 24/7", detail: "نساعدك تختار المناسب" },
];

const categories = [
  {
    title: "الفلاتر",
    description: "رتّب التنقية حسب حجم الحوض وطبيعة الاستخدام.",
    href: SHOP_CATEGORY_LINKS.filters,
    icon: CircleGauge,
  },
  {
    title: "السخانات",
    description: "خيارات تثبيت الحرارة بمقاسات واستخدامات مختلفة.",
    href: SHOP_CATEGORY_LINKS.heaters,
    icon: Heater,
  },
  {
    title: "الإضاءة",
    description: "إضاءة مرتبة للرؤية والعرض اليومي للحوض.",
    href: SHOP_CATEGORY_LINKS.lighting,
    icon: Lightbulb,
  },
  {
    title: "معالجة المياه",
    description: "مستلزمات تساعدك تدير مي الحوض بشكل أوضح.",
    href: SHOP_CATEGORY_LINKS.waterTreatment,
    icon: Droplets,
  },
  {
    title: "الأغذية",
    description: "اختار الغذاء حسب النوع والحجم، مو حسب شكل العلبة.",
    href: SHOP_CATEGORY_LINKS.food,
    icon: Utensils,
  },
  {
    title: "الأحواض والمستلزمات",
    description: "الأساسيات اللي تحتاجها حتى ترتب تجهيزك من البداية.",
    href: "/products",
    icon: Boxes,
  },
];

const valuePoints = [
  {
    icon: Target,
    title: "تخصص فعلي، مو خلطة عامة",
    description: "نشتغل بس على معدات ومستلزمات أحواض الزينة، حتى المعلومة والاختيار يكونون أدق.",
  },
  {
    icon: LayoutGrid,
    title: "تسوق مرتب حسب الاستخدام",
    description: "الأقسام مبوبة حسب وظيفة القطعة، حتى ما تضيع وقتك بين خيارات مالها علاقة بحاجتك.",
  },
  {
    icon: FileSearch,
    title: "معلومة واضحة قبل القرار",
    description: "كل قسم وياه شرح يفهمك شنو يسوي المنتج ومتى تحتاجه فعلاً.",
  },
  {
    icon: ListChecks,
    title: "اختيار أوضح بين البدائل",
    description: "نرتّب البدائل المتقاربة حتى تقارن على أساس واضح، مو بس على الشكل أو السعر.",
  },
  {
    icon: GraduationCap,
    title: "دعم تعليمي مستمر",
    description: "أدلة عملية عن حوض المياه العذبة بالعراق نحدثها باستمرار حسب الأسئلة الشائعة.",
  },
];

const guides = [
  {
    eyebrow: "اختيار الفلتر",
    title: "مو كل فلتر يناسب كل حوض",
    description: "دليل عملي يوضح شنو تراجع قبل ما تختار نظام التنقية.",
    href: "/guides/filter-choice",
  },
  {
    eyebrow: "بداية مرتبة",
    title: "تجهيز الحوض الجديد خطوة بخطوة",
    description: "رتّب الأساسيات بدون شراء قطع ما تحتاجها.",
    href: "/guides/new-aquarium-setup-iraq",
  },
  {
    eyebrow: "ثبات الحرارة",
    title: "شلون تختار السخان المناسب؟",
    description: "افهم العوامل المهمة قبل اختيار قدرة السخان.",
    href: "/guides/heater-choice",
  },
];

const linkButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function Home() {
  const { data: salesData, isLoading: isStorePicksLoading, isError: isStorePicksError } = useQuery({
    queryKey: ["products", "top-selling"],
    queryFn: fetchTopSellingProducts,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const storePicks = salesData?.bestSellers?.slice(0, 4) ?? [];
  const hasStorePicks = storePicks.length > 0;

  return (
    <div className="flex-1 overflow-x-hidden bg-background text-foreground">
      <MetaTags
        title="معدات أحواض بريميوم بالعراق"
        description="AQUAVO براند عراقي لمعدات الأحواض البريميوم. اختار الفلاتر والسخانات والإضاءة ومستلزمات العناية حسب احتياج حوضك، مع الدفع عند الاستلام أو إلكترونياً وتوصيل لكل العراق."
      />

      <main id="main-content" dir="rtl">
        <HomeHero />

        <section aria-label="ضمانات المتجر" className="border-b border-border bg-background">
          <PrecisionReveal stagger className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border sm:grid-cols-4">
            {serviceFacts.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="aq-trust-seal flex min-h-28 flex-col justify-center bg-background px-4 py-5 text-center sm:min-h-32">
                <Icon className="mx-auto mb-3 h-5 w-5 text-primary" aria-hidden="true" />
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-5 text-foreground/60">{detail}</p>
              </div>
            ))}
          </PrecisionReveal>
        </section>

        <section className="bg-background">
          <PrecisionReveal stagger className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold text-primary">اختيار أسرع، زحمة أقل</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">ابدأ من احتياج الحوض</h2>
            <p className="mt-4 leading-7 text-muted-foreground">روح مباشرة للقسم اللي يحل مشكلتك، وبعدها قارن الخيارات بهدوء.</p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="aq-interactive-card group flex min-h-40 items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-[#0B93A6]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-lg font-bold text-foreground">
                    {title}
                    <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-[#0B93A6]" aria-hidden="true" />
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
                </span>
              </Link>
            ))}
          </div>
          </PrecisionReveal>
        </section>

        <section className="border-y border-border bg-card">
          <PrecisionReveal stagger className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-primary">من المتجر</p>
                <h2 className="mt-2 text-3xl font-bold text-foreground">اختيارات متوفرة هسه</h2>
              </div>
              <Link href="/products" className="text-sm font-bold text-primary hover:underline">شوف كل المنتجات</Link>
            </div>

            {isStorePicksLoading ? (
              <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label="جاري تحميل الاختيارات">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="aspect-square animate-pulse bg-muted motion-reduce:animate-none" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                      <div className="h-4 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                    </div>
                  </div>
                ))}
                <span className="sr-only">جاري تحميل الاختيارات المختارة</span>
              </div>
            ) : isStorePicksError ? (
              <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border bg-background px-6 py-12 text-center">
                <AlertTriangle className="h-6 w-6 text-[#C97A2E]" aria-hidden="true" />
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  تعذر علينا تحميل الاختيارات المختارة هسه. تكدر تشوف كل المنتجات مباشرة.
                </p>
                <Link href="/products" className={`${linkButton} border border-primary/40 text-primary hover:bg-[#0B93A6]/10`}>
                  شوف كل المنتجات
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : hasStorePicks ? (
              <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {storePicks.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="aq-interactive-card overflow-hidden rounded-2xl border border-border bg-card hover:border-[#0B93A6]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="aspect-square bg-card p-3 sm:p-5">
                      <img
                        src={cardImage(product.images[0]) || "/brand/aquavo-v2-icon.svg"}
                        srcSet={cardImageSrcSet(product.images[0])}
                        sizes="(max-width: 1023px) 50vw, 25vw"
                        alt={product.name}
                        width={360}
                        height={360}
                        loading="lazy"
                        decoding="async"
                        className="aq-product-image h-full w-full object-contain"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 min-h-11 text-sm font-bold leading-6 text-foreground">{product.name}</h3>
                      <p className="mt-2 text-sm font-bold text-primary">
                        {(product.price ?? 0) > 0 ? formatPrice(product.price ?? 0) : "شوف التفاصيل"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border bg-background px-6 py-12 text-center">
                <PackageSearch className="h-6 w-6 text-primary" aria-hidden="true" />
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  الاختيارات المميزة مو متوفرة هسه. تكدر تتصفح كل المنتجات المتوفرة بالمتجر.
                </p>
                <Link href="/products" className={`${linkButton} border border-primary/40 text-primary hover:bg-[#0B93A6]/10`}>
                  شوف كل المنتجات
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </PrecisionReveal>
        </section>

        <section className="bg-background">
          <PrecisionReveal stagger className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:items-end lg:px-8">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-6 text-sm font-bold text-primary">AQUAVO يوضحلك السبب</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">المعلومة قبل القطعة</h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                هدفنا تعرف شتحتاج وليش تحتاجه. الأدلة مرتبة حتى تقلل التخمين وتختار على أساس واضح.
              </p>
              <a href="/guides" className={`${linkButton} mt-7 border border-primary/35 text-primary hover:bg-[#0B93A6]/10`}>
                شوف أدلة AQUAVO
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {guides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="aq-interactive-card group flex min-h-56 flex-col rounded-2xl border border-border bg-card p-5 hover:border-[#0B93A6]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="text-xs font-bold text-primary">{guide.eyebrow}</span>
                  <h3 className="mt-4 text-lg font-bold leading-7 text-foreground">{guide.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{guide.description}</p>
                  <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-bold text-primary">
                    افتح الدليل
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </PrecisionReveal>
        </section>

        <section className="border-t border-border bg-card">
          <PrecisionReveal stagger className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold text-primary">ليش AQUAVO</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">تسوق واضح من أول قسم للسلة</h2>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {valuePoints.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-background p-5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-bold leading-6 text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </PrecisionReveal>
        </section>

        <section className="border-t border-border bg-muted text-foreground">
          <PrecisionReveal className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-sm font-bold text-foreground/80">بعدك مو متأكد؟</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">دز حجم حوضك ونرتبلك المناسب</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">استشارة عملية قبل ما تشتري، حتى تبدأ من القطعة الصح.</p>
            </div>
            <Link href="/contact" className={`${linkButton} shrink-0 bg-primary text-white hover:bg-primary/90`}>
              احچي ويانه
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </PrecisionReveal>
        </section>
      </main>
      <BackToTop />
    </div>
  );
}
