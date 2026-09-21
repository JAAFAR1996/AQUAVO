import { Button } from "@/components/ui/button";
import { Leaf, Droplets, Sun, Recycle, ArrowRight, Activity, Calendar, AlertTriangle, CheckCircle2, Thermometer } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

export default function EcoFriendlyGuide() {
  const { t } = useTranslation("guides");
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 bg-gradient-to-br from-teal-900 via-slate-900 to-black overflow-hidden text-foreground dark:text-white">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533240217992-0b7012301f29?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 rounded-full px-4 py-1.5 mb-6 backdrop-blur-md">
                <Leaf className="w-4 h-4 text-teal-400" />
                <span className="text-teal-200 text-sm font-medium">{t("guides-eco-friendly.s1")}</span>
              </div>
              <h1 className="text-4xl md:text-7xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-white">
                {t("guides-eco-friendly.s2")}
              </h1>
              <p className="text-xl text-muted-foreground dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                {t("guides-eco-friendly.s3")}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Quick Stats / Navigation Hints */}
        <section className="py-12 -mt-10 container mx-auto px-4 relative z-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Activity, label: t("guides-eco-friendly.s4"), color: "text-blue-500", bg: "bg-blue-500/10" },
              { icon: Thermometer, label: t("guides-eco-friendly.s5"), color: "text-rose-500", bg: "bg-rose-500/10" },
              { icon: Calendar, label: t("guides-eco-friendly.s6"), color: "text-amber-500", bg: "bg-amber-500/10" },
              { icon: Recycle, label: t("guides-eco-friendly.s7"), color: "text-green-500", bg: "bg-green-500/10" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center gap-3 hover:scale-105 transition-transform cursor-default"
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
              <TabsTrigger value="basics" className="px-6 py-3 rounded-full border border-slate-200 data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:border-teal-600 transition-all">{t("guides-eco-friendly.s8")}</TabsTrigger>
              <TabsTrigger value="maintenance" className="px-6 py-3 rounded-full border border-slate-200 data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:border-teal-600 transition-all">{t("guides-eco-friendly.s6")}</TabsTrigger>
              <TabsTrigger value="parameters" className="px-6 py-3 rounded-full border border-slate-200 data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:border-teal-600 transition-all">{t("guides-eco-friendly.s5")}</TabsTrigger>
              <TabsTrigger value="eco" className="px-6 py-3 rounded-full border border-slate-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border-green-600 transition-all">{t("guides-eco-friendly.s9")}</TabsTrigger>
            </TabsList>

            {/* Basics Tab */}
            <TabsContent value="basics" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Activity className="w-8 h-8 text-teal-500" />
                    {t("guides-eco-friendly.s10")}
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                    {t("guides-eco-friendly.s11")} <strong>{t("guides-eco-friendly.s12")}</strong><br />
                    {t("guides-eco-friendly.s13")}
                  </p>
                  <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center font-bold text-red-600">1</div>
                      <div>
                        <h4 className="font-bold">{t("guides-eco-friendly.s14")}</h4>
                        <p className="text-sm text-slate-500">{t("guides-eco-friendly.s15")}</p>
                      </div>
                    </div>
                    <div className="w-0.5 h-6 bg-slate-300 mx-5" />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center font-bold text-orange-600">2</div>
                      <div>
                        <h4 className="font-bold">{t("guides-eco-friendly.s16")}</h4>
                        <p className="text-sm text-slate-500">{t("guides-eco-friendly.s17")}</p>
                      </div>
                    </div>
                    <div className="w-0.5 h-6 bg-slate-300 mx-5" />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center font-bold text-green-600">3</div>
                      <div>
                        <h4 className="font-bold">{t("guides-eco-friendly.s18")}</h4>
                        <p className="text-sm text-slate-500">{t("guides-eco-friendly.s19")}</p>
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
                      <h3 className="font-bold text-xl">{t("guides-eco-friendly.s20")}</h3>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-green-500 shrink-0" />
                        <span>{t("guides-eco-friendly.s21")}</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-green-500 shrink-0" />
                        <span>{t("guides-eco-friendly.s22")}</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-green-500 shrink-0" />
                        <span>{t("guides-eco-friendly.s23")}</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-teal-500/20 shadow-lg shadow-teal-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg"><Calendar className="w-5 h-5 text-teal-600" /></div>
                      <h3 className="font-bold text-xl">{t("guides-eco-friendly.s24")}</h3>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-teal-500 shrink-0" />
                        <span>{t("guides-eco-friendly.s25")}</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-teal-500 shrink-0" />
                        <span>{t("guides-eco-friendly.s26")}</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-teal-500 shrink-0" />
                        <span>{t("guides-eco-friendly.s27")}</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Calendar className="w-5 h-5 text-purple-600" /></div>
                      <h3 className="font-bold text-xl">{t("guides-eco-friendly.s28")}</h3>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-purple-500 shrink-0" />
                        <span>{t("guides-eco-friendly.s29")}</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-purple-500 shrink-0" />
                        <span>{t("guides-eco-friendly.s30")}</span>
                      </li>
                      <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-purple-500 shrink-0" />
                        <span>{t("guides-eco-friendly.s31")}</span>
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
                      <caption className="sr-only">{t("guides-eco-friendly.s32")}</caption>
                      <thead className="bg-slate-100 dark:bg-slate-900">
                        <tr>
                          <th scope="col" className="p-4 font-bold">{t("guides-eco-friendly.s33")}</th>
                          <th scope="col" className="p-4 font-bold">{t("guides-eco-friendly.s34")}</th>
                          <th scope="col" className="p-4 font-bold">{t("guides-eco-friendly.s35")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        <tr>
                          <td className="p-4 font-medium">{t("guides-eco-friendly.s36")}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{t("guides-eco-friendly.s37")}</td>
                          <td className="p-4 text-red-500 text-sm">{t("guides-eco-friendly.s38")}</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">{t("guides-eco-friendly.s39")}</td>
                          <td className="p-4 text-green-600 font-bold">0 ppm</td>
                          <td className="p-4 text-red-500 text-sm">{t("guides-eco-friendly.s40")}</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">{t("guides-eco-friendly.s41")}</td>
                          <td className="p-4 text-green-600 font-bold">0 ppm</td>
                          <td className="p-4 text-red-500 text-sm">{t("guides-eco-friendly.s42")}</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">{t("guides-eco-friendly.s43")}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{t("guides-eco-friendly.s44")}</td>
                          <td className="p-4 text-orange-500 text-sm">{t("guides-eco-friendly.s45")}</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-medium">{t("guides-eco-friendly.s46")}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{t("guides-eco-friendly.s47")}</td>
                          <td className="p-4 text-red-500 text-sm">{t("guides-eco-friendly.s48")}</td>
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
                    {t("guides-eco-friendly.s49")}
                  </h3>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>{t("guides-eco-friendly.s50")}</AccordionTrigger>
                      <AccordionContent>
                        {t("guides-eco-friendly.s51")}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>{t("guides-eco-friendly.s52")}</AccordionTrigger>
                      <AccordionContent>
                        {t("guides-eco-friendly.s53")}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>{t("guides-eco-friendly.s54")}</AccordionTrigger>
                      <AccordionContent>
                        {t("guides-eco-friendly.s55")}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 p-8 rounded-3xl flex flex-col justify-center items-center text-center">
                  <Recycle className="w-16 h-16 text-green-600 mb-4" />
                  <h4 className="text-xl font-bold mb-2">{t("guides-eco-friendly.s56")}</h4>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {t("guides-eco-friendly.s57")}
                  </p>
                  <Link href="/products?eco=true">
                    <Button className="bg-green-600 hover:bg-green-700 text-foreground dark:text-white w-full">{t("guides-eco-friendly.s58")}</Button>
                  </Link>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-background dark:bg-slate-900 text-foreground dark:text-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6">{t("guides-eco-friendly.s59")}</h2>
            <p className="text-muted-foreground dark:text-slate-300 max-w-2xl mx-auto mb-8">
              {t("guides-eco-friendly.s60")}
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/faq">
                <Button variant="outline" className="border-border dark:border-slate-700 hover:bg-slate-800">{t("guides-eco-friendly.s61")}</Button>
              </Link>
              <Link href="/faq">
                <Button className="bg-teal-600 hover:bg-teal-700">{t("guides-eco-friendly.s62")}</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
