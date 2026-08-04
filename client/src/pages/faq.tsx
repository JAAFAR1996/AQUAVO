import { Banknote, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { Link } from "wouter";

import { BreadcrumbSchema, FAQSchema, MetaTags } from "@/components/seo/meta-tags";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const groups = [
  {
    title: "الطلب والتوصيل",
    icon: Truck,
    items: [
      { question: "وين يوصل AQUAVO؟", answer: "نوصل لكل العراق. تظهر أجرة ومدة التوصيل المتوقعة قبل تأكيد الطلب لأنها قد تختلف حسب الوجهة والطلب." },
      { question: "شلون أدفع؟", answer: "الدفع نقداً عند الاستلام فقط. ماكو دفع إلكتروني مفعّل هسه." },
      { question: "شلون أتتبع طلبي؟", answer: "استخدم صفحة تتبع الطلب برقم الطلب ورقم الهاتف. وإذا احتجت مساعدة، تواصل ويانه عبر القنوات الرسمية حسب أوقات الخدمة." },
    ],
  },
  {
    title: "المنتجات والاختيار",
    icon: PackageCheck,
    items: [
      { question: "شنو يبيع AQUAVO؟", answer: "نبيع معدات ومستلزمات الأحواض مثل الفلاتر والسخانات والإضاءة والغذاء والديكور ومعالجة المياه. ما نبيع أسماك حية، كائنات حية، أو نباتات مائية حية." },
      { question: "شلون أعرف القطعة تناسب حوضي؟", answer: "راجع المواصفات بصفحة المنتج، أو دز حجم الحوض ونوع الاستخدام حتى نرتبلك الخيار المناسب بدون تخمين." },
      { question: "هل كل المنتجات عليها وثيقة YEE؟", answer: "لا. وثيقة YEE تخص منتجات YEE الموردة إلى AQUAVO العراق فقط، وما تشمل باقي العلامات تلقائياً." },
    ],
  },
  {
    title: "مشاكل الاستلام",
    icon: ShieldCheck,
    items: [
      { question: "شنو أسوي إذا وصل المنتج تالف أو غلط؟", answer: "دز رقم الطلب وصور واضحة فور ما تلاحظ المشكلة. نراجع حالة الضرر أو النقص أو عدم المطابقة ونرتب الحل حسب السياسة." },
      { question: "هل كل جهاز عليه ضمان 6 أشهر؟", answer: "لا. ضمان AQUAVO المحدود ينطبق فقط على منتج كهربائي معتمد ومذكور بوضوح بصفحة المنتج. إذا ما مذكور، لا تعتبر المنتج مشمول." },
      { question: "منو مقدم ضمان AQUAVO؟", answer: "إذا المنتج معتمد ومشمول بوضوح، مقدم الضمان هو AQUAVO / محل المنبع / AL NABEA SHOP، مو شركة YEE تلقائياً." },
    ],
  },
  {
    title: "الدفع والفاتورة",
    icon: Banknote,
    items: [
      { question: "هل السعر النهائي واضح؟", answer: "ملخص الطلب يعرض سعر المنتجات والخصم إن وجد وأجرة التوصيل والمبلغ الكلي قبل التأكيد." },
      { question: "هل أقدر أشوف تفاصيل طلبي بعد التأكيد؟", answer: "نعم، صفحة تأكيد الطلب تعرض رقم الطلب والمنتجات والمبلغ وحالة الطلب." },
    ],
  },
] as const;

const questions = groups.flatMap((group) => group.items.map((item) => ({ question: item.question, answer: item.answer })));

export default function FAQ() {
  return (
    <div className="flex-1 bg-background text-foreground" data-testid="faq-page" dir="rtl">
      <MetaTags title="الأسئلة الشائعة" description="أجوبة واضحة عن منتجات AQUAVO، التوصيل لكل العراق، الدفع عند الاستلام، ومشاكل الاستلام." />
      <FAQSchema questions={questions} />
      <BreadcrumbSchema items={[{ name: "الرئيسية", url: "https://www.aquavoiq.com" }, { name: "الأسئلة الشائعة", url: "https://www.aquavoiq.com/faq" }]} />
      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">قبل ما تطلب</p>
          <h1 className="mt-3 text-4xl font-bold" data-testid="text-page-title">أسئلة واضحة، أجوبة مباشرة</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">المعلومة اللي تهمك بدون وعود زايدة. وإذا حالتك خاصة، دز تفاصيل حوضك.</p>
        </header>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {groups.map(({ title, icon: Icon, items }) => (
            <section key={title} className="rounded-2xl border border-border bg-card/55 p-5">
              <h2 className="flex items-center gap-3 text-xl font-bold"><Icon className="h-5 w-5 text-primary" aria-hidden="true" />{title}</h2>
              <Accordion type="single" collapsible className="mt-4">
                {items.map((item) => (
                  <AccordionItem key={item.question} value={item.question}>
                    <AccordionTrigger className="text-right">{item.question}</AccordionTrigger>
                    <AccordionContent className="leading-7 text-muted-foreground">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm">بعدك محتار؟ <Link href="/contact" className="font-bold text-primary hover:underline">تواصل ويانه</Link></div>
      </main>
    </div>
  );
}
