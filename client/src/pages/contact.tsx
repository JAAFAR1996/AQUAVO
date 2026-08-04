import { ArrowLeft, Headphones, Mail, MessageCircle, Phone } from "lucide-react";
import { Link } from "wouter";

import { MetaTags } from "@/components/seo/meta-tags";
import { WHATSAPP_URL } from "@/lib/constants/shipping";

const actionClass = "mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/35 px-5 text-sm font-bold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function Contact() {
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl">
      <MetaTags title="تواصل ويانه" description="تواصل مع AQUAVO عبر واتساب أو الهاتف أو info@aquavoiq.com للاستفسار عن الطلبات واختيار المعدات." />
      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-2xl">
          <p className="text-sm font-bold text-primary">دعم AQUAVO</p>
          <h1 className="mt-3 text-4xl font-bold">تواصل ويانه</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">الدعم متاح عبر قنوات التواصل الرسمية حسب أوقات الخدمة. دز حجم حوضك أو صورة الحالة حتى نرتبلك الجواب العملي.</p>
        </header>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <section className="flex min-h-64 flex-col rounded-2xl border border-border bg-card/55 p-6">
            <MessageCircle className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold">واتساب</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">مناسب للاستشارة، صور الحالة، ومتابعة الطلب.</p>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={actionClass}>افتح واتساب <ArrowLeft className="h-4 w-4" aria-hidden="true" /></a>
          </section>
          <section className="flex min-h-64 flex-col rounded-2xl border border-border bg-card/55 p-6">
            <Phone className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold">الهاتف</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground" dir="ltr">+964 774 788 0673</p>
            <a href="tel:+9647747880673" className={actionClass}>اتصل بـAQUAVO <ArrowLeft className="h-4 w-4" aria-hidden="true" /></a>
          </section>
          <section className="flex min-h-64 flex-col rounded-2xl border border-border bg-card/55 p-6">
            <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold">الإيميل</h2>
            <p className="mt-2 break-all text-sm leading-6 text-muted-foreground" dir="ltr">info@aquavoiq.com</p>
            <a href="mailto:info@aquavoiq.com" className={actionClass}>أرسل إيميل <ArrowLeft className="h-4 w-4" aria-hidden="true" /></a>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <Headphones className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="flex-1 text-sm leading-6">عندك رقم طلب؟ جهزه حتى نراجع الحالة بسرعة.</p>
          <Link href="/order-tracking" className="text-sm font-bold text-primary hover:underline">تتبع طلبك</Link>
          <Link href="/faq" className="text-sm font-bold text-primary hover:underline">الأسئلة الشائعة</Link>
        </div>
      </main>
    </div>
  );
}
