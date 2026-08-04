import { Banknote, BookOpen, Headphones, PackageCheck, Truck } from "lucide-react";
import { Link } from "wouter";

import { BackToTop } from "@/components/back-to-top";
import { BreadcrumbSchema, MetaTags, OrganizationSchema } from "@/components/seo/meta-tags";

const reasons = [
  { icon: PackageCheck, title: "اختيار على أساس واضح", text: "مواصفات وصور وحالة توفر تساعدك تقارن قبل القرار." },
  { icon: BookOpen, title: "المعلومة قبل القطعة", text: "أدلة عملية حتى تعرف شتحتاج وليش تحتاجه." },
  { icon: Truck, title: "توصيل لكل العراق", text: "خلال 24 ساعة بأجرة ثابتة 5,000 د.ع." },
  { icon: Banknote, title: "دفع بسيط", text: "نقداً عند الاستلام فقط." },
  { icon: Headphones, title: "دعم 24/7", text: "دز حجم الحوض أو تفاصيل المشكلة ونرتبلك الجواب." },
];

export default function WhyAquavo() {
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags title="ليش AQUAVO؟" description="AQUAVO براند عراقي لمعدات الأحواض البريميوم: معلومات واضحة، توصيل لكل العراق، دفع عند الاستلام، ودعم 24/7." />
      <OrganizationSchema />
      <BreadcrumbSchema items={[{ name: "الرئيسية", url: "https://www.aquavoiq.com" }, { name: "ليش AQUAVO؟", url: "https://www.aquavoiq.com/why-aquavo" }]} />
      <main id="main-content" className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">براند عراقي بمواصفات عالمية لمعدات الأحواض البريميوم</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">ليش AQUAVO؟</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">لأن اختيار معدات الحوض يحتاج وضوح، مو ضجيج بيع. AQUAVO يرتب المنتج والمعلومة والخدمة حول احتياج الحوض.</p>
        </header>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map(({ icon: Icon, title, text }) => (
            <section key={title} className="rounded-2xl border border-border bg-card/55 p-6">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-xl font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
            </section>
          ))}
        </div>
        <section className="mt-10 rounded-2xl border border-primary/20 bg-[#071821] p-7 text-white sm:p-10">
          <h2 className="text-2xl font-bold">الثقة مرتبطة بالدليل</h2>
          <p className="mt-3 max-w-3xl leading-7 text-white/65">وثيقة YEE تبقى خاصة بما تثبته لمنتجات YEE. وأي ضمان محدود يظهر فقط للمنتج المعتمد. ما نعمم وثيقة أو ضمان على كل المتجر.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/products" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-white">شوف المنتجات</Link><a href="/guides" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-6 text-sm font-bold">شوف الأدلة</a></div>
        </section>
      </main>
      <BackToTop />
    </div>
  );
}
