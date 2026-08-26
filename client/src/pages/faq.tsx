import { Banknote, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";

import { AQUAVO_FAQ_GROUPS, AQUAVO_FAQ_ITEMS, type FaqGroup } from "@shared/faq-content";
import { BreadcrumbSchema, FAQSchema, MetaTags } from "@/components/seo/meta-tags";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// The questions themselves live in shared/faq-content.ts so the prerendered
// /faq a crawler sees and the /faq a customer sees are the same FAQ. Icons are
// presentation and stay here: a server module must not import lucide-react.
const GROUP_ICONS: Record<FaqGroup["id"], LucideIcon> = {
  delivery: Truck,
  products: PackageCheck,
  receiving: ShieldCheck,
  payment: Banknote,
};

const questions = AQUAVO_FAQ_ITEMS.map((item) => ({ question: item.question, answer: item.answer }));

export default function FAQ() {
  return (
    <div className="flex-1 bg-background text-foreground" data-testid="faq-page" dir="rtl">
      <MetaTags title="الأسئلة الشائعة" description="أجوبة واضحة عن منتجات AQUAVO، التوصيل خلال 24 ساعة، أجرة 5,000 د.ع، الدفع عند الاستلام أو إلكترونياً، ومشاكل الاستلام." />
      <FAQSchema questions={questions} />
      <BreadcrumbSchema items={[{ name: "الرئيسية", url: "https://www.aquavoiq.com" }, { name: "الأسئلة الشائعة", url: "https://www.aquavoiq.com/faq" }]} />      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-primary">قبل ما تطلب</p>
          <h1 className="mt-3 text-4xl font-bold" data-testid="text-page-title">أسئلة واضحة، أجوبة مباشرة</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">المعلومة اللي تهمك بدون وعود زايدة. وإذا حالتك خاصة، دز تفاصيل حوضك.</p>
        </header>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {AQUAVO_FAQ_GROUPS.map(({ id, title, items }) => {
            const Icon = GROUP_ICONS[id];
            return (
              <section key={id} className="rounded-2xl border border-border bg-card/55 p-5">
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
            );
          })}
        </div>
        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm">بعدك محتار؟ <Link href="/contact" className="font-bold text-primary hover:underline">تواصل ويانه</Link></div>
      </main>    </div>
  );
}
