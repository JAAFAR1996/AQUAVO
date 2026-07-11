import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  BookOpen,
  Boxes,
  CircleGauge,
  Droplets,
  Headphones,
  Heater,
  Lightbulb,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  Utensils,
} from "lucide-react";
import { Link } from "wouter";

import { BackToTop } from "@/components/back-to-top";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import { MetaTags } from "@/components/seo/meta-tags";
import { fetchTopSellingProducts } from "@/lib/api";
import { cardImage } from "@/lib/cloudinary";
import { formatPrice } from "@/lib/format";

const serviceFacts = [
  { icon: Truck, title: "توصيل لكل العراق", detail: "خلال 24 ساعة" },
  { icon: Banknote, title: "الدفع عند الاستلام", detail: "نقداً عند وصول الطلب" },
  { icon: PackageCheck, title: "أجرة توصيل ثابتة", detail: "5,000 د.ع" },
  { icon: Headphones, title: "دعم 24/7", detail: "نساعدك تختار المناسب" },
];

const categories = [
  {
    title: "الفلاتر",
    description: "رتّب التنقية حسب حجم الحوض وطبيعة الاستخدام.",
    href: "/products?category=filters",
    icon: CircleGauge,
  },
  {
    title: "السخانات",
    description: "خيارات تثبيت الحرارة بمقاسات واستخدامات مختلفة.",
    href: "/products?category=heaters",
    icon: Heater,
  },
  {
    title: "الإضاءة",
    description: "إضاءة مرتبة للرؤية والعرض اليومي للحوض.",
    href: "/products?category=lighting",
    icon: Lightbulb,
  },
  {
    title: "معالجة المياه",
    description: "مستلزمات تساعدك تدير مي الحوض بشكل أوضح.",
    href: "/products?category=water-treatment",
    icon: Droplets,
  },
  {
    title: "الأغذية",
    description: "اختار الغذاء حسب النوع والحجم، مو حسب شكل العلبة.",
    href: "/products?category=fish-food",
    icon: Utensils,
  },
  {
    title: "الأحواض والمستلزمات",
    description: "الأساسيات اللي تحتاجها حتى ترتب تجهيزك من البداية.",
    href: "/products",
    icon: Boxes,
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
  const { data: salesData } = useQuery({
    queryKey: ["products", "top-selling"],
    queryFn: fetchTopSellingProducts,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const storePicks = salesData?.bestSellers?.slice(0, 4) ?? [];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <MetaTags
        title="معدات أحواض بريميوم بالعراق"
        description="AQUAVO براند عراقي لمعدات الأحواض البريميوم. اختار الفلاتر والسخانات والإضاءة ومستلزمات العناية حسب احتياج حوضك، مع الدفع عند الاستلام وتوصيل لكل العراق."
      />

      <Navbar />

      <main id="main-content" dir="rtl">
        <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#06141d] pt-24 sm:pt-28">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_22%,rgba(11,147,166,0.2),transparent_34%),radial-gradient(circle_at_18%_70%,rgba(11,100,166,0.14),transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-8 sm:px-6 sm:pb-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-8 lg:pb-20 lg:pt-12">
            <div className="order-2 text-right lg:order-1">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-bold text-[#7ed9e3] sm:text-sm">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                براند عراقي لمعدات الأحواض البريميوم
              </p>
              <h1 className="max-w-3xl font-heading text-[2.55rem] font-bold leading-[1.12] text-white sm:text-5xl lg:text-[3.55rem]">
                معدات حوضك، مرتبة على احتياجك
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
                نساعدك تختار الفلتر والسخان والإضاءة وباقي التجهيز حسب حوضك، بمعلومات واضحة وبدون زحمة خيارات.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
                  className={`${linkButton} border border-white/20 bg-white/[0.06] text-white hover:bg-white/10`}
                >
                  اختار حسب حوضك
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <p className="mt-6 text-sm leading-6 text-white/55">
                عندك حوض ومحتار؟ دز حجمه ونرتبلك المناسب.
              </p>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative mx-auto max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0b1e28] shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
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
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#071821]/90 to-transparent" />
                <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#071821]/80 px-4 py-3 text-white backdrop-blur-md sm:inset-x-7 sm:bottom-7">
                  <div>
                    <p className="text-xs text-white/55">طريقة AQUAVO</p>
                    <p className="mt-1 text-sm font-bold sm:text-base">الحوض أولاً، القطعة بعدها</p>
                  </div>
                  <img src="/brand/aquavo-v2-icon.svg" alt="" aria-hidden="true" className="h-9 w-9" />
                </div>
              </div>
            </div>
          </div>

          <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
        </section>

        <section aria-label="معلومات الخدمة" className="border-b border-border/60 bg-card/35">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border/50 sm:grid-cols-4">
            {serviceFacts.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex min-h-28 flex-col justify-center bg-background px-4 py-5 text-center sm:min-h-32">
                <Icon className="mx-auto mb-3 h-5 w-5 text-primary" aria-hidden="true" />
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold text-primary">اختيار أسرع، زحمة أقل</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">ابدأ من احتياج الحوض</h2>
            <p className="mt-4 leading-7 text-muted-foreground">روح مباشرة للقسم اللي يحل مشكلتك، وبعدها قارن الخيارات بهدوء.</p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="group flex min-h-40 items-start gap-4 rounded-2xl border border-border/70 bg-card/55 p-5 transition-colors hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-lg font-bold">
                    {title}
                    <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" aria-hidden="true" />
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {storePicks.length > 0 ? (
          <section className="border-y border-border/60 bg-card/25">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-primary">من المتجر</p>
                  <h2 className="mt-2 text-3xl font-bold">اختيارات متوفرة هسه</h2>
                </div>
                <Link href="/products" className="text-sm font-bold text-primary hover:underline">شوف كل المنتجات</Link>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {storePicks.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="overflow-hidden rounded-2xl border border-border/70 bg-background transition-colors hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="aspect-square bg-white p-3 sm:p-5">
                      <img
                        src={cardImage(product.images[0]) || "/brand/aquavo-v2-icon.svg"}
                        alt={product.name}
                        width={360}
                        height={360}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 min-h-11 text-sm font-bold leading-6">{product.name}</h3>
                      <p className="mt-2 text-sm font-bold text-primary">
                        {(product.price ?? 0) > 0 ? formatPrice(product.price ?? 0) : "شوف التفاصيل"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-6 text-sm font-bold text-primary">AQUAVO يوضحلك السبب</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">المعلومة قبل القطعة</h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                هدفنا تعرف شتحتاج وليش تحتاجه. الأدلة مرتبة حتى تقلل التخمين وتختار على أساس واضح.
              </p>
              <a href="/guides" className={`${linkButton} mt-7 border border-primary/35 text-primary hover:bg-primary/10`}>
                شوف أدلة AQUAVO
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {guides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="group flex min-h-56 flex-col rounded-2xl border border-border/70 bg-card/55 p-5 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="text-xs font-bold text-primary">{guide.eyebrow}</span>
                  <h3 className="mt-4 text-lg font-bold leading-7">{guide.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{guide.description}</p>
                  <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-bold text-primary">
                    افتح الدليل
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-[#071821] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-sm font-bold text-[#7ed9e3]">بعدك مو متأكد؟</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">دز حجم حوضك ونرتبلك المناسب</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">استشارة عملية قبل ما تشتري، حتى تبدأ من القطعة الصح.</p>
            </div>
            <Link href="/contact" className={`${linkButton} shrink-0 bg-primary text-white hover:bg-primary/90`}>
              احچي ويانه
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
