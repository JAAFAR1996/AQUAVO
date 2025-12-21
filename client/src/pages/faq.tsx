import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Search,
  Truck,
  CreditCard,
  RotateCcw,
  Fish,
  Package,
  Shield,
  Phone,
  MessageCircle,
  Mail,
  Clock,
  ChevronLeft,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  faqs: FAQItem[];
}

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories: FAQCategory[] = [
    {
      id: "shipping",
      title: "الشحن والتوصيل",
      icon: Truck,
      color: "text-blue-500 bg-blue-500/10",
      faqs: [
        {
          question: "ما هي مناطق التوصيل المتاحة؟",
          answer: "نوصل إلى جميع محافظات العراق. التوصيل داخل بغداد خلال 24-48 ساعة، والمحافظات الأخرى خلال 3-5 أيام عمل."
        },
        {
          question: "كم تكلفة التوصيل؟",
          answer: "التوصيل مجاني للطلبات فوق 50,000 دينار داخل بغداد. للطلبات الأقل، رسوم التوصيل 5,000 دينار لبغداد و10,000-15,000 دينار للمحافظات."
        },
        {
          question: "هل يمكن تتبع طلبي؟",
          answer: "نعم! بمجرد شحن طلبك، ستتلقى رسالة نصية ورسالة واتساب تحتوي على رابط التتبع المباشر ورقم الشحنة."
        },
        {
          question: "ماذا لو لم أكن متواجداً عند التوصيل؟",
          answer: "سيتواصل معك مندوب التوصيل قبل الوصول. يمكنك تحديد موعد آخر أو ترك الطلب مع شخص موثوق بعد تأكيد هويته."
        },
        {
          question: "هل تشحنون الأسماك الحية؟",
          answer: "نعم، نشحن الأسماك الحية بعناية فائقة باستخدام أكياس أكسجين خاصة وعزل حراري. الشحن متاح فقط داخل بغداد والمناطق القريبة لضمان سلامة الأسماك."
        }
      ]
    },
    {
      id: "payment",
      title: "الدفع والفواتير",
      icon: CreditCard,
      color: "text-green-500 bg-green-500/10",
      faqs: [
        {
          question: "ما هي طرق الدفع المتاحة؟",
          answer: "نقبل الدفع نقداً عند الاستلام، التحويل البنكي، كي كارد، زين كاش، وآسيا حوالة. جميع طرق الدفع آمنة ومضمونة."
        },
        {
          question: "هل الدفع عند الاستلام متاح؟",
          answer: "نعم! الدفع عند الاستلام متاح لجميع الطلبات. يمكنك فحص المنتج والتأكد من سلامته قبل الدفع."
        },
        {
          question: "هل يمكنني الحصول على فاتورة؟",
          answer: "نعم، نرسل فاتورة إلكترونية مع كل طلب عبر البريد الإلكتروني وواتساب. يمكنك أيضاً طلب فاتورة مطبوعة مع الطلب."
        },
        {
          question: "هل توجد رسوم إضافية مخفية؟",
          answer: "لا، السعر الذي تراه هو السعر النهائي. لا توجد رسوم خفية. رسوم التوصيل (إن وجدت) تظهر بوضوح قبل إتمام الطلب."
        },
        {
          question: "هل يمكن الدفع بالتقسيط؟",
          answer: "نعم، للطلبات فوق 200,000 دينار نوفر خيار التقسيط على دفعتين أو ثلاث دفعات بدون فوائد. تواصل معنا للتفاصيل."
        }
      ]
    },
    {
      id: "returns",
      title: "الإرجاع والاستبدال",
      icon: RotateCcw,
      color: "text-amber-500 bg-amber-500/10",
      faqs: [
        {
          question: "ما هي سياسة الإرجاع؟",
          answer: "يمكنك إرجاع المنتجات خلال 30 يوم من الاستلام بشرط أن تكون في حالتها الأصلية. الأسماك والنباتات الحية غير قابلة للإرجاع."
        },
        {
          question: "كيف أطلب إرجاع منتج؟",
          answer: "تواصل معنا عبر واتساب أو الهاتف مع ذكر رقم الطلب وسبب الإرجاع. سنرسل لك تأكيد ويمكننا استلام المنتج من موقعك مجاناً في بغداد."
        },
        {
          question: "متى أستلم المبلغ المسترد؟",
          answer: "للدفع النقدي، يتم الاسترداد فوراً عند استلام المنتج. للتحويلات البنكية، خلال 3-7 أيام عمل."
        },
        {
          question: "هل يمكن استبدال المنتج بدلاً من إرجاعه؟",
          answer: "نعم! الاستبدال متاح ومجاني. يمكنك استبدال المنتج بمنتج آخر بنفس القيمة أو دفع/استرداد الفرق."
        },
        {
          question: "ماذا لو وصل المنتج تالفاً؟",
          answer: "في حالة وصول منتج تالف، التقط صوراً واضحة وتواصل معنا خلال 24 ساعة. سنقوم بالاستبدال أو الاسترداد الكامل مع اعتذارنا."
        }
      ]
    },
    {
      id: "fish-care",
      title: "العناية بالأسماك",
      icon: Fish,
      color: "text-primary bg-primary/10",
      faqs: [
        {
          question: "كيف أختار الحوض المناسب؟",
          answer: "استخدم حاسبة الحوض في موقعنا! بشكل عام، لكل سنتيمتر من طول السمكة تحتاج 2 لتر ماء كحد أدنى. الأحواض الأكبر أسهل في الصيانة."
        },
        {
          question: "كم مرة يجب تغيير الماء؟",
          answer: "ننصح بتغيير 20-30% من الماء أسبوعياً. استخدم مزيل الكلور واترك الماء الجديد ليصل لنفس درجة حرارة الحوض."
        },
        {
          question: "ما هي درجة الحرارة المناسبة؟",
          answer: "معظم الأسماك الاستوائية تحتاج 24-28 درجة مئوية. الأسماك الذهبية تفضل 18-24 درجة. تحقق من متطلبات كل نوع."
        },
        {
          question: "كم مرة أطعم الأسماك؟",
          answer: "مرتين يومياً بكمية تستهلكها الأسماك خلال 2-3 دقائق. الإفراط في التغذية أخطر من التقليل ويلوث الماء."
        },
        {
          question: "لماذا تموت أسماكي رغم العناية بها؟",
          answer: "الأسباب الشائعة: عدم تدوير الحوض قبل إضافة الأسماك، تغيير الماء بكميات كبيرة، أو اكتظاظ الحوض. تواصل معنا للتشخيص المجاني."
        }
      ]
    },
    {
      id: "products",
      title: "المنتجات والجودة",
      icon: Package,
      color: "text-purple-500 bg-purple-500/10",
      faqs: [
        {
          question: "هل المنتجات أصلية؟",
          answer: "نعم، جميع منتجاتنا أصلية 100% ومستوردة من الشركات المصنعة مباشرة. نوفر ضمان الأصالة على جميع المنتجات."
        },
        {
          question: "هل يوجد ضمان على المعدات؟",
          answer: "نعم، جميع المعدات الإلكترونية (فلاتر، مضخات، سخانات، إضاءة) مغطاة بضمان من 6 أشهر إلى سنتين حسب المنتج."
        },
        {
          question: "من أين مصدر الأسماك؟",
          answer: "أسماكنا من مزارع محلية موثوقة ومستوردين معتمدين. جميع الأسماك تخضع لفترة حجر صحي قبل البيع لضمان صحتها."
        },
        {
          question: "هل تتوفر منتجات للمبتدئين؟",
          answer: "نعم! لدينا قسم خاص للمبتدئين يشمل أحواض جاهزة بكل ما تحتاجه، وأسماك سهلة الرعاية، مع دليل عناية مجاني."
        },
        {
          question: "هل يمكن طلب منتج غير متوفر؟",
          answer: "بالتأكيد! أخبرنا بما تحتاجه وسنوفره لك خلال أسبوع إلى أسبوعين. لا يوجد حد أدنى للطلبات الخاصة."
        }
      ]
    },
    {
      id: "warranty",
      title: "الضمان والدعم",
      icon: Shield,
      color: "text-rose-500 bg-rose-500/10",
      faqs: [
        {
          question: "ما هي مدة الضمان؟",
          answer: "الفلاتر والمضخات: سنة واحدة. السخانات والإضاءة LED: 6 أشهر. الأحواض: ضمان ضد التسريب لمدة سنة."
        },
        {
          question: "ماذا يغطي الضمان؟",
          answer: "الضمان يغطي عيوب التصنيع والأعطال غير الناتجة عن سوء الاستخدام. لا يشمل الأضرار الناتجة عن الكهرباء غير المستقرة."
        },
        {
          question: "كيف أستفيد من الضمان؟",
          answer: "احتفظ بفاتورة الشراء. عند حدوث مشكلة، تواصل معنا مع صور المنتج ورقم الفاتورة. سنوجهك للخطوات التالية."
        },
        {
          question: "هل تقدمون دعماً فنياً؟",
          answer: "نعم! نوفر دعماً فنياً مجانياً عبر واتساب والهاتف. كما نقدم زيارات منزلية للمساعدة في تركيب وصيانة الأحواض الكبيرة."
        },
        {
          question: "هل تتوفر قطع غيار؟",
          answer: "نعم، نوفر قطع غيار لمعظم المنتجات التي نبيعها. تواصل معنا مع موديل المنتج وسنخبرك بالتوفر والسعر."
        }
      ]
    }
  ];

  const filteredCategories = categories.map(category => ({
    ...category,
    faqs: category.faqs.filter(
      faq =>
        faq.question.includes(searchQuery) ||
        faq.answer.includes(searchQuery)
    )
  })).filter(category => searchQuery === "" || category.faqs.length > 0);

  const popularQuestions = [
    "ما هي طرق الدفع المتاحة؟",
    "كم تكلفة التوصيل؟",
    "ما هي سياسة الإرجاع؟",
    "هل المنتجات أصلية؟"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans" data-testid="faq-page">
      <Navbar />

      <section className="relative py-20 overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-48 h-48 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary bg-primary/10 px-4 py-1 text-sm">
              <HelpCircle className="w-4 h-4 ml-2" />
              مركز المساعدة
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-page-title">
              الأسئلة الشائعة
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              ابحث عن إجابات لأسئلتك أو تصفح الفئات للعثور على ما تحتاجه
            </p>

            <div className="max-w-xl mx-auto relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="ابحث في الأسئلة الشائعة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 py-6 text-lg rounded-xl border-2 focus:border-primary"
                data-testid="input-search-faq"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <main id="main-content" className="flex-1 py-16">
        <div className="container mx-auto px-4">
          {searchQuery === "" && (
            <motion.section
              className="mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6 text-primary" />
                الأسئلة الأكثر شيوعاً
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {popularQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(question.slice(0, 10))}
                    className="p-4 text-right bg-muted/50 hover:bg-primary/10 rounded-xl transition-colors border hover:border-primary/30"
                    data-testid={`button-popular-question-${index}`}
                  >
                    <span className="text-sm">{question}</span>
                  </button>
                ))}
              </div>
            </motion.section>
          )}

          <div className="grid lg:grid-cols-4 gap-8">
            <motion.aside
              className="lg:col-span-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="sticky top-24 space-y-2">
                <h3 className="font-semibold mb-4 text-lg">الفئات</h3>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-right ${activeCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                      }`}
                    data-testid={`button-category-${category.id}`}
                  >
                    <div className={`p-2 rounded-lg ${activeCategory === category.id ? "bg-white/20" : category.color}`}>
                      <category.icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{category.title}</span>
                    <Badge variant="secondary" className="mr-auto">
                      {category.faqs.length}
                    </Badge>
                  </button>
                ))}
              </div>
            </motion.aside>

            <motion.div
              className="lg:col-span-3 space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {filteredCategories
                .filter(category => !activeCategory || category.id === activeCategory)
                .map((category) => (
                  <Card key={category.id} className="overflow-hidden" data-testid={`card-faq-category-${category.id}`}>
                    <div className={`p-4 border-b ${category.color}`}>
                      <div className="flex items-center gap-3">
                        <category.icon className="w-5 h-5" />
                        <h2 className="text-xl font-bold">{category.title}</h2>
                      </div>
                    </div>
                    <CardContent className="p-0">
                      <Accordion type="single" collapsible className="w-full">
                        {category.faqs.map((faq, index) => (
                          <AccordionItem
                            key={index}
                            value={`${category.id}-${index}`}
                            className="border-b last:border-0"
                          >
                            <AccordionTrigger
                              className="px-6 py-4 text-right hover:bg-muted/50 [&[data-state=open]]:bg-muted/50"
                              data-testid={`accordion-trigger-${category.id}-${index}`}
                            >
                              <span className="font-medium">{faq.question}</span>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-4 text-muted-foreground leading-relaxed">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}

              {filteredCategories.length === 0 && (
                <Card className="p-12 text-center">
                  <HelpCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">لم نجد نتائج</h3>
                  <p className="text-muted-foreground mb-4">جرب كلمات بحث مختلفة أو تصفح الفئات</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-primary hover:underline"
                  >
                    مسح البحث
                  </button>
                </Card>
              )}
            </motion.div>
          </div>

          <motion.section
            className="mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gradient-to-l from-primary/10 to-blue-500/10 border-0">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">لم تجد إجابة لسؤالك؟</h2>
                  <p className="text-muted-foreground">فريق الدعم جاهز لمساعدتك على مدار الساعة</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <a
                    href="tel:+9647700000000"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                    data-testid="link-contact-phone"
                  >
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">اتصل بنا</p>
                      <p className="text-sm text-muted-foreground" dir="ltr">+964 770 000 0000</p>
                    </div>
                  </a>
                  <a
                    href="https://wa.me/9647700000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                    data-testid="link-contact-whatsapp"
                  >
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                      <MessageCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">واتساب</p>
                      <p className="text-sm text-muted-foreground">رد خلال دقائق</p>
                    </div>
                  </a>
                  <a
                    href="mailto:support@aquavo.iq"
                    className="flex items-center gap-4 p-4 bg-background/80 rounded-xl hover:bg-background transition-colors group"
                    data-testid="link-contact-email"
                  >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Mail className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">البريد الإلكتروني</p>
                      <p className="text-sm text-muted-foreground">support@aquavo.iq</p>
                    </div>
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
