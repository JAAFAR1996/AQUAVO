import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Leaf, Droplets, Sun, Recycle, ArrowRight, Activity, Calendar, AlertTriangle, CheckCircle2, Thermometer } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EcoFriendlyGuide() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 bg-gradient-to-br from-teal-900 via-slate-900 to-black overflow-hidden text-white">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533240217992-0b7012301f29?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 rounded-full px-4 py-1.5 mb-6 backdrop-blur-md">
                <Leaf className="w-4 h-4 text-teal-400" />
                <span className="text-teal-200 text-sm font-medium">الدليل الشامل</span>
              </div>
              <h1 className="text-4xl md:text-7xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-white">
                فن العناية بالحوض
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                دليلك المتكامل لتحويل حوضك من مجرد زجاج وماء إلى نظام بيئي مزدهر ومستدام.
                نغطي الأساسيات، الصيانة، وحل المشاكل.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Quick Stats / Navigation Hints */}
        <section className="py-12 -mt-10 container mx-auto px-4 relative z-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Activity, label: "دورة النيتروجين", color: "text-blue-500", bg: "bg-blue-500/10" },
              { icon: Thermometer, label: "معايير المياه", color: "text-rose-500", bg: "bg-rose-500/10" },
              { icon: Calendar, label: "جدول الصيانة", color: "text-amber-500", bg: "bg-amber-500/10" },
              { icon: Recycle, label: "الاستدامة", color: "text-green-500", bg: "bg-green-500/10" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center gap-3 hover:scale-105 transition-transform cursor-default"
              >
                <div className={`p-3 rounded-full ${item.bg}`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Main Content Tabs */}
        <section className="py-16 container mx-auto px-4">
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="w-full justify-center gap-4 bg-transparent mb-12 flex-wrap h-auto p-0">
              <TabsTrigger value="basics" className="px-6 py-3 rounded-full border border-slate-200 data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:border-teal-600 transition-all">الأساسيات ودورة النيتروجين</TabsTrigger>
              <TabsTrigger value="maintenance" className="px-6 py-3 rounded-full border border-slate-200 data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:border-teal-600 transition-all">جدول الصيانة</TabsTrigger>
              <TabsTrigger value="parameters" className="px-6 py-3 rounded-full border border-slate-200 data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:border-teal-600 transition-all">معايير المياه</TabsTrigger>
              <TabsTrigger value="eco" className="px-6 py-3 rounded-full border border-slate-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border-green-600 transition-all">نصائح خضراء</TabsTrigger>
            </TabsList>

            {/* Basics Tab */}
            <TabsContent value="basics" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Activity className="w-8 h-8 text-teal-500" />
                    دورة النيتروجين: قلب الحوض
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                    أهم معلومة للمبتدئين: <strong>لا تضع السمك فوراً!</strong><br />
                    الحوض يحتاج "تدوير" (Cycling) لبناء بكتيريا نافعة تعالج فضلات الأسماك السامة. بدون هذه الدورة، قد يموت السمك بسبب التسمم بالأمونيا.
                  </p>
                  <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center font-bold text-red-600">1</div>
                      <div>
                        <h4 className="font-bold">الأمونيا (NH3)</h4>
                        <p className="text-sm text-slate-500">فضلات الأسماك (سام جداً)</p>
                      </div>
                    </div>
                    <div className="w-0.5 h-6 bg-slate-300 mx-5" />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center font-bold text-orange-600">2</div>
                      <div>
                        <h4 className="font-bold">النيتريت (NO2)</h4>
                        <p className="text-sm text-slate-500">بكتيريا تحول الأمونيا (سام)</p>
                      </div>
                    </div>
                    <div className="w-0.5 h-6 bg-slate-300 mx-5" />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center font-bold text-green-600">3</div>
                      <div>
                        <h4 className="font-bold">النيترات (NO3)</h4>
                        <p className="text-sm text-slate-500">الناتج النهائي (آمن بنسب قليلة)</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                  <img src="https://images.unsplash.com/photo-1520301255226-bf5f144451c1?q=80&w=1000&auto=format&fit=crop" alt="Healthy Aquarium" className="relative rounded-3xl shadow-2xl border-4 border-slate-100 dark:border-slate-800" />
                </div>
              </div>
            </TabsContent>

            {/* Maintenance Tab */}
            <TabsContent value="maintenance" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Calendar className="w-5 h-5 text-blue-600" /></div>
                      <h3 className="font-bold text-xl">يومياً</h3>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-green-500 shrink-0" />
                        <span>تأكد من عمل الفلتر والمضخة</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-green-500 shrink-0" />
                        <span>راقب صحة الأسماك وسلوكها</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-green-500 shrink-0" />
                        <span>إطعام بكمية مناسبة (تؤكل في دقيقتين)</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-teal-500/20 shadow-lg shadow-teal-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg"><Calendar className="w-5 h-5 text-teal-600" /></div>
                      <h3 className="font-bold text-xl">أسبوعياً</h3>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-teal-500 shrink-0" />
                        <span>تغيير 10-20% من الماء</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-teal-500 shrink-0" />
                        <span>تنظيف زجاج الحوض من الداخل</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-teal-500 shrink-0" />
                        <span>فحص معايير المياه (pH, Ammonia)</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Calendar className="w-5 h-5 text-purple-600" /></div>
                      <h3 className="font-bold text-xl">شهرياً</h3>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-purple-500 shrink-0" />
                        <span>غسل اسفنج الفلتر (بماء الحوض حصراً)</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-purple-500 shrink-0" />
                        <span>تقليم النباتات الطبيعية</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-purple-500 shrink-0" />
                        <span>فحص وتضيف الإضاءة</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Parameters Tab */}
            <TabsContent value="parameters" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card>
                <CardContent className="p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table role="table" className="w-full text-right">
                      <caption className="sr-only">معايير المياه المثالية للأحواض</caption>
                      <thead className="bg-slate-100 dark:bg-slate-900">
                        <tr>
                          <th scope="col" className="p-4 font-bold">المعيار</th>
                          <th scope="col" className="p-4 font-bold">القيمة المثالية (مياه عذبة)</th>
                          <th scope="col" className="p-4 font-bold">الخطر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        <tr>
                          <td className="p-4 font-medium">الأس الهيدروجيني (pH)</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">6.5 - 7.5 (معظم الأسماك)</td>
                          <td className="p-4 text-red-500 text-sm">أقل من 6 أو أكثر من 8 يسبب إجهاداً</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">الأمونيا</td>
                          <td className="p-4 text-green-600 font-bold">0 ppm</td>
                          <td className="p-4 text-red-500 text-sm">أي نسبة أعلى من صفر سامة وتقاتلة</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">النيتريت</td>
                          <td className="p-4 text-green-600 font-bold">0 ppm</td>
                          <td className="p-4 text-red-500 text-sm">يمنع الدم من حمل الأكسجين</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">النيترات</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">أقل من 40 ppm</td>
                          <td className="p-4 text-orange-500 text-sm">النسب العالية تسبب نمو الطحالب وضعف المناعة</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">درجة الحرارة</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">24°C - 27°C (استوائي)</td>
                          <td className="p-4 text-red-500 text-sm">التذبذب السريع يسبب مرض (النقطة البيضاء)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Eco Tab (Original Content Refined) */}
            <TabsContent value="eco" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Leaf className="text-green-500" />
                    كيف تكون صديقاً للبيئة؟
                  </h3>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>أعد استخدام المياه</AccordionTrigger>
                      <AccordionContent>
                        مياه الحوض القديمة غنية بالنترات والفوسفات. بدلاً من رميها، اسقِ بها نباتاتك المنزلية؛ فهي سماد طبيعي ممتاز ومجاني!
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>إضاءة LED الذكية</AccordionTrigger>
                      <AccordionContent>
                        استخدم إضاءة LED مع مؤقت (Timer). هي تستهلك طاقة أقل بنسبة 80%، وتقلل من نمو الطحالب غير المرغوب فيها بسبب الإضاءة المفرطة.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>النباتات الطبيعية</AccordionTrigger>
                      <AccordionContent>
                        النباتات ليست زينة فقط. هي "رئة" الحوض، تمتص النيترات وتنتج الأكسجين، مما يقلل حاجتك لتغيير المياه وستخدام المواد الكيميائية.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 p-8 rounded-3xl flex flex-col justify-center items-center text-center">
                  <Recycle className="w-16 h-16 text-green-600 mb-4" />
                  <h4 className="text-xl font-bold mb-2">تسوق بمسؤولية</h4>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    نحن نوفر قسماً خاصاً للمنتجات المستدامة والصديقة للبيئة.
                  </p>
                  <Link href="/products?eco=true">
                    <Button className="bg-green-600 hover:bg-green-700 text-white w-full">تصفح المنتجات الخضراء</Button>
                  </Link>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-slate-900 text-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6">تحتاج مساعدة إضافية؟</h2>
            <p className="text-slate-300 max-w-2xl mx-auto mb-8">
              فريقنا من الخبراء جاهز للإجابة على جميع استفساراتك حول العناية بالحوض.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/faq">
                <Button variant="outline" className="border-slate-700 hover:bg-slate-800">الأسئلة الشائعة</Button>
              </Link>
              <Link href="/contact">
                <Button className="bg-teal-600 hover:bg-teal-700">تواصل معنا</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
