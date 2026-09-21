import { AlertTriangle, CheckCircle2, PackageSearch, ShieldCheck, Wrench } from "lucide-react";
import { Link } from "wouter";

import { MetaTags } from "@/components/seo/meta-tags";

export default function ReturnPolicy() {
  return (
    <div className="flex-1 bg-background text-foreground" data-testid="return-policy-page" dir="rtl">
      <MetaTags title="مشاكل الاستلام والضمان المحدود" description="سياسة AQUAVO لمراجعة الضرر والنقص وعدم المطابقة، وفصلها عن ضمان AQUAVO المحدود للمنتجات الكهربائية المعتمدة فقط." />
      <main id="main-content" className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">السياسة بدون خلط</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl" data-testid="text-page-title">مشاكل الاستلام والضمان المحدود</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">الضرر أو النقص أو القطعة الغلط مسار مستقل. ضمان الأجهزة ما ينطبق إلا على منتج معتمد ومذكور بوضوح بصفحة المنتج.</p>
        </header>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card/55 p-6 sm:p-8">
            <PackageSearch className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">مشكلة بالاستلام</h2>
            <p className="mt-3 leading-7 text-muted-foreground">إذا وصل المنتج تالف، ناقص، أو غير مطابق لطلبك، لا تستخدمه. دز رقم الطلب وصور واضحة فور ما تلاحظ المشكلة حتى نراجع الحالة.</p>
            <ul className="mt-6 space-y-3 text-sm leading-6">
              <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />الضرر أثناء التوصيل</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />قطعة أو ملحق ناقص</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />منتج مختلف عن الطلب</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
            <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">ضمان AQUAVO المحدود</h2>
            <p className="mt-3 leading-7 text-muted-foreground">ينطبق فقط إذا صفحة المنتج تذكره بوضوح. عدم وجود عبارة الضمان بصفحة المنتج يعني أنه غير مفعّل لهذا المنتج.</p>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-muted-foreground">المقدم</dt><dd className="mt-1 font-bold">AQUAVO / محل المنبع / AL NABEA SHOP</dd></div>
              <div><dt className="text-muted-foreground">المدة للمنتج المعتمد</dt><dd className="mt-1 font-bold">6 أشهر من تاريخ التسليم المؤكد</dd></div>
              <div><dt className="text-muted-foreground">أول 7 أيام</dt><dd className="mt-1">استبدال بعد الفحص وتأكيد عيب التصنيع.</dd></div>
              <div><dt className="text-muted-foreground">من اليوم 8 إلى نهاية الشهر السادس</dt><dd className="mt-1">إصلاح أولاً، ثم استبدال، ثم استرداد أو بديل يوافق عليه الزبون إذا تعذر الإصلاح والاستبدال.</dd></div>
            </dl>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            <div><h2 className="font-bold">الفحص ضروري</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">الضمان المحدود يغطي عيب التصنيع المؤكد، وما يغطي سوء الاستخدام أو الضرر الخارجي. وثيقة YEE إثبات أصالة خاص بـYEE، مو ضمان زبون تلقائي.</p></div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border p-6">
          <div className="flex items-start gap-3"><Wrench className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div><h2 className="font-bold">أهلية المنتجات بعدها مقفلة افتراضياً</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">ما راح نعرض علامة ضمان 6 أشهر على أي منتج إلا بعد اعتماد رقم المنتج أو SKU من المالك.</p></div></div>
        </section>

        <Link href="/contact" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-sm font-bold text-white">دز رقم الطلب وتفاصيل الحالة</Link>
      </main>
    </div>
  );
}
