import { Banknote, Clock3, MapPinned, PackageCheck, Truck } from "lucide-react";
import { Link } from "wouter";

import { MetaTags } from "@/components/seo/meta-tags";

const facts = [
  { icon: Clock3, title: "مدة متوقعة", detail: "تُحدّد حسب الوجهة والطلب" },
  { icon: Truck, title: "أجرة واضحة", detail: "تظهر قبل تأكيد الطلب" },
  { icon: Banknote, title: "الدفع عند الاستلام", detail: "نقداً عند وصول الطلب" },
  { icon: MapPinned, title: "كل العراق", detail: "بغداد وباقي المحافظات" },
];

export default function Shipping() {
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags title="التوصيل لكل العراق" description="توصيل AQUAVO متاح لكل العراق مع عرض أجرة ومدة التوصيل المتوقعة قبل تأكيد الطلب والدفع نقداً عند الاستلام." />
      <main id="main-content" className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">تفاصيل توصيل واضحة</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">توصيل لكل العراق</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">تظهر أجرة ومدة التوصيل المتوقعة حسب الوجهة والطلب قبل التأكيد، والدفع نقداً عند الاستلام.</p>
        </header>
        <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {facts.map(({ icon: Icon, title, detail }) => (
            <section key={title} className="rounded-2xl border border-border bg-card/55 p-5 text-center">
              <Icon className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
            </section>
          ))}
        </div>
        <section className="mt-10 rounded-2xl border border-border bg-card/55 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <PackageCheck className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-bold">قبل ما يطلع الطلب</h2>
              <p className="mt-3 leading-7 text-muted-foreground">نراجع بيانات الطلب والعنوان. إذا عندك ملاحظة عن الوصول أو القطعة القابلة للكسر، اكتبها بحقل الملاحظات حتى تبقى مرتبطة بالطلب.</p>
            </div>
          </div>
        </section>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/order-tracking" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-bold text-white">تتبع طلبك</Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center rounded-full border border-border px-6 text-sm font-bold hover:border-primary/50">اسأل عن التوصيل</Link>
        </div>
      </main>
    </div>
  );
}
