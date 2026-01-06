import Navbar from "@/components/navbar";
import { MetaTags } from "@/components/seo/meta-tags";
import Footer from "@/components/footer";
import { BackToTop } from "@/components/back-to-top";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import {
    Fish,
    Droplets,
    Thermometer,
    Lightbulb,
    Clock,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    Book,
    Target,
    Zap,
    Heart,
    ShoppingCart,
    Calendar,
    Beaker,
    RefreshCw
} from "lucide-react";

const STEPS = [
    {
        id: 1,
        title: "اختيار الحوض المناسب",
        icon: <Droplets className="w-6 h-6" />,
        description: "القاعدة الذهبية: ابدأ بحوض كبير نسبياً (60-100 لتر). الأحواض الكبيرة أسهل في الصيانة!",
        tips: [
            "الأحواض الصغيرة جداً (أقل من 40 لتر) غير مناسبة للمبتدئين",
            "اختر حوض مستطيل بدلاً من الدائري - أفضل للأكسجين",
            "تأكد من وجود طاولة قوية تتحمل وزن الماء",
            "ضع الحوض بعيداً عن أشعة الشمس المباشرة"
        ],
        link: "/calculators?tab=tank"
    },
    {
        id: 2,
        title: "الفلتر - قلب الحوض",
        icon: <RefreshCw className="w-6 h-6" />,
        description: "الفلتر هو أهم جهاز! يزيل السموم ويحافظ على صحة الأسماك.",
        tips: [
            "اختر فلتر بقدرة 4-6 أضعاف حجم الحوض في الساعة",
            "فلتر HOB (الخارجي المعلق) مثالي للمبتدئين",
            "لا تغسل الفلتر بماء الصنبور - استخدم ماء الحوض",
            "نظّف الفلتر كل 2-4 أسابيع"
        ],
        link: "/calculators?tab=filter"
    },
    {
        id: 3,
        title: "السخان والحرارة",
        icon: <Thermometer className="w-6 h-6" />,
        description: "معظم الأسماك الاستوائية تحتاج 24-28 درجة مئوية.",
        tips: [
            "اختر سخان بقوة 3-5 واط لكل لتر",
            "اشترِ ثرموميتر منفصل للتحقق من الحرارة",
            "ضع السخان بالقرب من تيار الماء لتوزيع الحرارة",
            "لا تشغّل السخان خارج الماء أبداً!"
        ],
        link: "/calculators?tab=heater"
    },
    {
        id: 4,
        title: "دورة النيتروجين (الأهم!)",
        icon: <Beaker className="w-6 h-6" />,
        description: "انتظر 4-6 أسابيع قبل إضافة الأسماك! هذه الخطوة تنقذ حياة أسماكك.",
        tips: [
            "البكتيريا النافعة تحوّل الأمونيا السامة إلى نيترات آمنة",
            "أضف مصدر أمونيا (طعام أسماك) لبدء الدورة",
            "اختبر المياه أسبوعياً: الأمونيا والنيتريت يجب أن يكونا 0",
            "استخدم بكتيريا معبأة لتسريع العملية"
        ],
        link: "/calculators?tab=water"
    },
    {
        id: 5,
        title: "اختيار الأسماك الأولى",
        icon: <Fish className="w-6 h-6" />,
        description: "ابدأ بأسماك قوية وسهلة الرعاية. لا تفرط في عدد الأسماك!",
        tips: [
            "أضف 2-3 أسماك فقط في البداية",
            "انتظر أسبوعين بين كل إضافة جديدة",
            "أسماك مثالية للمبتدئين: جوبي، مولي، دانيو، تيترا",
            "تحقق من توافق الأسماك قبل الشراء"
        ],
        link: "/fish-compatibility"
    },
    {
        id: 6,
        title: "التغذية الصحيحة",
        icon: <Heart className="w-6 h-6" />,
        description: "أطعم بكمية قليلة! معظم المشاكل تأتي من الإفراط في التغذية.",
        tips: [
            "أطعم 1-2 مرات يومياً فقط",
            "أعطِ كمية تأكلها الأسماك في 2-3 دقائق",
            "نوّع الطعام: رقائق، حبيبات، مجمد",
            "صوّم الأسماك يوماً واحداً أسبوعياً"
        ],
        link: "/products?category=أطعمة"
    },
    {
        id: 7,
        title: "الصيانة الأسبوعية",
        icon: <Calendar className="w-6 h-6" />,
        description: "صيانة منتظمة = أسماك سعيدة. 30 دقيقة أسبوعياً كافية!",
        tips: [
            "غيّر 20-25% من الماء أسبوعياً",
            "اشفط الحصى لإزالة الفضلات",
            "نظّف زجاج الحوض من الطحالب",
            "اختبر معايير المياه كل أسبوع"
        ],
        link: "/calculators?tab=maintenance"
    }
];

const COMMON_MISTAKES = [
    {
        mistake: "إضافة الأسماك فوراً",
        solution: "انتظر 4-6 أسابيع لاكتمال دورة النيتروجين"
    },
    {
        mistake: "تكديس الأسماك",
        solution: "القاعدة: 1 سم من السمك لكل 1 لتر من الماء"
    },
    {
        mistake: "الإفراط في التغذية",
        solution: "أطعم كمية صغيرة 1-2 مرات يومياً فقط"
    },
    {
        mistake: "تغيير الماء بالكامل",
        solution: "غيّر 20-25% فقط أسبوعياً"
    },
    {
        mistake: "غسل الفلتر بماء الصنبور",
        solution: "استخدم ماء الحوض للحفاظ على البكتيريا"
    },
    {
        mistake: "وضع الحوض تحت الشمس",
        solution: "ابتعد عن الشمس المباشرة لتجنب الطحالب"
    }
];

const BEGINNER_FISH = [
    { name: "جوبي", nameEn: "Guppy", difficulty: "سهل جداً", reason: "ملونة وتتكاثر بسهولة" },
    { name: "مولي", nameEn: "Molly", difficulty: "سهل", reason: "قوية ومتحملة" },
    { name: "دانيو زيبرا", nameEn: "Zebra Danio", difficulty: "سهل جداً", reason: "نشيطة وممتعة للمشاهدة" },
    { name: "تيترا نيون", nameEn: "Neon Tetra", difficulty: "سهل", reason: "جميلة في مجموعات" },
    { name: "كوريدوراس", nameEn: "Corydoras", difficulty: "سهل", reason: "تنظف القاع" },
    { name: "بليكو صغير", nameEn: "Bristlenose Pleco", difficulty: "سهل", reason: "يأكل الطحالب" },
];

export default function BeginnerGuide() {
    return (
        <div className="min-h-screen flex flex-col bg-background" dir="rtl">
            <Navbar />
            <MetaTags
                title="دليل المبتدئين لتربية أسماك الزينة | AQUAVO"
                description="دليل شامل خطوة بخطوة لتربية أسماك الزينة للمبتدئين. تعلم كيف تبدأ حوضك الأول بنجاح!"
                keywords={["دليل المبتدئين", "تربية الأسماك", "حوض سمك", "أسماك الزينة"]}
            />

            <main id="main-content" className="flex-1">
                {/* Hero Section */}
                <section className="bg-gradient-to-b from-primary/10 via-background to-background py-16">
                    <div className="container mx-auto px-4 text-center">
                        <Badge variant="outline" className="mb-4 text-lg px-4 py-1">
                            🐠 للمبتدئين
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            دليلك الشامل لتربية أسماك الزينة
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                            خطوات بسيطة ومجربة لبدء هوايتك الجديدة بنجاح. اتبع هذا الدليل وستتجنب 90% من أخطاء المبتدئين!
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link href="/products">
                                <Button size="lg" className="gap-2">
                                    <ShoppingCart className="w-5 h-5" />
                                    تسوق المستلزمات
                                </Button>
                            </Link>
                            <Link href="/fish-compatibility">
                                <Button size="lg" variant="outline" className="gap-2">
                                    <Fish className="w-5 h-5" />
                                    اختبر توافق الأسماك
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Steps Section */}
                <section className="py-16 container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        7 خطوات لحوض ناجح ✨
                    </h2>

                    <div className="space-y-6 max-w-4xl mx-auto">
                        {STEPS.map((step, index) => (
                            <Card key={step.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <CardHeader className="bg-primary/5 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold">
                                            {step.id}
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="flex items-center gap-2">
                                                {step.icon}
                                                {step.title}
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                {step.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <ul className="space-y-2">
                                        {step.tips.map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {step.link && (
                                        <Link href={step.link}>
                                            <Button variant="link" className="mt-4 gap-1 pr-0">
                                                الأداة المساعدة
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <Separator className="max-w-4xl mx-auto" />

                {/* Common Mistakes Section */}
                <section className="py-16 container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4">
                        ⚠️ أخطاء شائعة تجنبها!
                    </h2>
                    <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                        هذه الأخطاء تسبب فقدان معظم أسماك المبتدئين. اقرأها جيداً!
                    </p>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                        {COMMON_MISTAKES.map((item, index) => (
                            <Card key={index} className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                                        <div>
                                            <p className="font-bold text-red-700 dark:text-red-400">
                                                ❌ {item.mistake}
                                            </p>
                                            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                                ✅ {item.solution}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Beginner Fish Section */}
                <section className="py-16 bg-primary/5">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-4">
                            🐟 أفضل الأسماك للمبتدئين
                        </h2>
                        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                            ابدأ بهذه الأنواع القوية والجميلة. ستنجح معها حتماً!
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
                            {BEGINNER_FISH.map((fish, index) => (
                                <Card key={index} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h3 className="font-bold text-lg">{fish.name}</h3>
                                                <p className="text-sm text-muted-foreground">{fish.nameEn}</p>
                                            </div>
                                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                                                {fish.difficulty}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            💡 {fish.reason}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="text-center mt-8">
                            <Link href="/fish-encyclopedia">
                                <Button variant="outline" className="gap-2">
                                    <Book className="w-5 h-5" />
                                    استكشف موسوعة الأسماك
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 container mx-auto px-4">
                    <Card className="max-w-3xl mx-auto bg-gradient-to-r from-primary/10 via-cyan-500/10 to-teal-500/10 border-primary/20">
                        <CardContent className="p-8 text-center">
                            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-4">
                                جاهز لتبدأ رحلتك؟ 🚀
                            </h2>
                            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                                لدينا كل ما تحتاجه من أحواض وفلاتر وطعام وإكسسوارات بأفضل الأسعار. ابدأ تسوقك الآن!
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <Link href="/products">
                                    <Button size="lg" className="gap-2">
                                        <ShoppingCart className="w-5 h-5" />
                                        تسوق الآن
                                    </Button>
                                </Link>
                                <Link href="/calculators">
                                    <Button size="lg" variant="outline" className="gap-2">
                                        <Target className="w-5 h-5" />
                                        استخدم الحاسبات
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </main>

            <BackToTop />
            <Footer />
        </div>
    );
}
