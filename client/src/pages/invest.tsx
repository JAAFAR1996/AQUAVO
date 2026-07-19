import { FileWarning, Mail } from "lucide-react";

import { MetaTags } from "@/components/seo/meta-tags";

export default function Invest() {
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags title="معلومات الاستثمار" description="معلومات AQUAVO الاستثمارية غير منشورة للعامة حالياً. أي أرقام أو توقعات تحتاج بيانات مالية مدققة وموافقة المالك." noIndex />
      <main id="main-content" className="mx-auto max-w-3xl px-4 pb-20 pt-32 sm:px-6">
        <section className="rounded-3xl border border-border bg-card/60 p-7 sm:p-10">
          <FileWarning className="h-8 w-8 text-primary" aria-hidden="true" />
          <p className="mt-6 text-sm font-bold text-primary">OWNER DATA REQUIRED</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">معلومات الاستثمار مو منشورة للعامة حالياً</h1>
          <p className="mt-5 leading-8 text-muted-foreground">
            ما عدنا هسه بيانات مالية مدققة وموافق عليها للنشر عن حجم السوق، الإيرادات، الهوامش، النمو أو العائد المتوقع. لذلك ما نعرض أرقام تقديرية كأنها حقائق.
          </p>
          <p className="mt-3 leading-8 text-muted-foreground">
            أي ملف استثماري رسمي لازم يعتمد على قوائم مالية، مخزون، مبيعات، هوامش وتوقعات موثقة يوافق عليها المالك قبل النشر.
          </p>
          <a href="mailto:info@aquavoiq.com" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground">
            <Mail className="h-4 w-4" aria-hidden="true" /> info@aquavoiq.com
          </a>
        </section>
      </main>
    </div>
  );
}
