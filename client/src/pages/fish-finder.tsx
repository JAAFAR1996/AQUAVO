import { Link } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetaTags } from "@/components/seo/meta-tags";
import { Fish, Ruler, Thermometer, Users, Droplets } from "lucide-react";

const checks = [
  {
    title: "حجم الحوض",
    text: "ابدأ بحجم الحوض الحقيقي باللتر. كلما كان الحوض أصغر، صارت أخطاء الاختيار أسرع تأثيراً على الماء.",
    icon: Ruler,
  },
  {
    title: "درجة الحرارة",
    text: "لا تخلط أنواع تحتاج حرارة مختلفة. ثبات الحرارة أهم من الرقم وحده، خصوصاً مع تغير جو الغرفة.",
    icon: Thermometer,
  },
  {
    title: "التوافق والسلوك",
    text: "راجع الحجم النهائي والسلوك. بعض الأنواع هادئة، وبعضها يحتاج مساحة أو لا يناسب الأنواع الصغيرة.",
    icon: Users,
  },
  {
    title: "جودة الماء",
    text: "اختيار السمك لا ينفصل عن الفلتر وفحص الماء. الحوض غير المستقر يسبب مشاكل حتى مع نوع مناسب.",
    icon: Droplets,
  },
];

export default function FishFinder() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <MetaTags
        title="اختيار السمك المناسب لحوضك"
        description="أداة تعليمية تساعدك تفكر بحجم الحوض، الحرارة، والتوافق قبل اختيار أسماك الزينة، مع روابط لأدلة التجهيز والصيانة."
        canonicalUrl="https://www.aquavoiq.com/fish-finder"
      />
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <section className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Fish className="h-4 w-4" />
            أداة تعليمية
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-black leading-tight">
              اختيار السمك المناسب لحوضك
            </h1>
            <p className="text-lg text-muted-foreground leading-8">
              هذه الصفحة تساعدك ترتب قرار اختيار أسماك الزينة حسب حجم الحوض، الحرارة، التوافق، وجودة الماء. AQUAVO لا يبيع أسماكاً حية أو كائنات حية أو نباتات حية؛ هذا المحتوى تعليمي حتى تختار بشكل أهدأ وتقلل مشاكل الحوض.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {checks.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-border/70 bg-card/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <span className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-7">{item.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <section className="rounded-xl border border-border bg-card/70 p-5 space-y-4">
            <h2 className="text-2xl font-bold">قبل ما تختار النوع</h2>
            <p className="text-muted-foreground leading-8">
              اكتب حجم الحوض، نوع الفلتر، درجة الحرارة، وعدد الأسماك الموجودة حالياً. بعدها راجع التوافق والحجر الصحي وفحص الماء. إذا تريد تجهيز حوض من الصفر، ابدأ بدليل التجهيز بدل اختيار الأسماك مباشرة.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/fish-encyclopedia">موسوعة أسماك الزينة</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/fish-compatibility">توافق الأسماك</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/guides/new-aquarium-setup-iraq">تجهيز حوض جديد</Link>
              </Button>
              <Button asChild>
                <Link href="/guides/aquarium-water-test-guide">فحص ماء الحوض</Link>
              </Button>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  );
}
