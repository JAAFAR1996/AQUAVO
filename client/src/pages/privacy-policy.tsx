import { BarChart3, Database, Mail, MessageCircle, PackageCheck, ShieldCheck } from "lucide-react";

import { MetaTags } from "@/components/seo/meta-tags";
import { WHATSAPP_URL } from "@/lib/constants/shipping";
import { WhatsAppLink } from "@/components/whatsapp-link";

const sections = [
  {
    icon: PackageCheck,
    title: "بيانات الطلب والحساب",
    text: "نجمع المعلومات اللي تدخلها حتى ننفذ طلبك أو ندير حسابك: الاسم، رقم الهاتف، البريد إذا قدمته، عنوان التوصيل، ومحتوى الطلب. الدفع نقداً عند الاستلام فقط، لذلك ما نخزن بيانات بطاقة دفع.",
  },
  {
    icon: BarChart3,
    title: "بيانات الاستخدام والتحليلات",
    text: "قد نسجل معلومات تقنية مثل عنوان IP، نوع الجهاز والمتصفح، الصفحات والأحداث داخل الموقع. نستخدم خدمات قياس وأخطاء وإعلانات مثل Google Analytics وMeta Pixel وTikTok Pixel وPostHog وSentry إذا كانت مفاتيحها مفعّلة.",
  },
  {
    icon: Database,
    title: "التخزين المحلي والكوكيز",
    text: "الموقع يستخدم كوكيز جلسة وتخزين المتصفح لتسجيل الدخول، السلة، التفضيلات، حماية الطلب، ومنع تكرار بعض أحداث القياس. تگدر تمسحها من إعدادات متصفحك، بس بعض الوظائف قد تتوقف.",
  },
  {
    icon: ShieldCheck,
    title: "المشاركة والحماية",
    text: "نشارك الحد اللازم مع مزودي الاستضافة وقاعدة البيانات والتخزين والتوصيل والتحليلات وخدمات الأمان، أو عند وجود طلب قانوني ملزم. ما نستخدم معالج دفع إلكتروني حالياً. الوصول الإداري لازم يبقى محدوداً حسب الحاجة.",
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="flex-1 bg-background text-foreground" dir="rtl" data-testid="privacy-policy-page">
      <MetaTags title="سياسة الخصوصية" description="شنو يجمع موقع AQUAVO، ليش نستخدم البيانات، ومنو قد يستلم الحد اللازم منها لتنفيذ الطلب وتشغيل الموقع." />
      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">واضحة ومباشرة</p>
          <h1 className="mt-3 text-4xl font-bold" data-testid="text-page-title">سياسة الخصوصية</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            هاي الصفحة تشرح شنو نجمع من بياناتك وشنو نسوي بيها لما تستخدم aquavoiq.com أو تطلب من AQUAVO / محل المنبع.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">آخر تحديث: 12 تموز 2026</p>
        </header>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border bg-card/55 p-6">
              <section.icon className="h-7 w-7 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-xl font-bold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.text}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
          <h2 className="text-2xl font-bold">استخدام البيانات وطلب المراجعة</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            نستخدم البيانات لتنفيذ الطلب، التوصيل، الدعم، أمان الموقع، قياس الأداء، وتحسين التجربة والتسويق. إذا تريد تسأل عن بياناتك أو تطلب تصحيحها أو حذف ما نكدر نحذفه بدون مخالفة التزامات تشغيلية أو قانونية، تواصل ويانه واذكر رقم الهاتف المرتبط بالطلب حتى نتحقق من الهوية.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <WhatsAppLink source="other" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> واتساب
            </WhatsAppLink>
            <a href="mailto:info@aquavoiq.com" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/35 px-5 font-bold text-primary">
              <Mail className="h-4 w-4" aria-hidden="true" /> info@aquavoiq.com
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
