import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Leaf, Droplets, Wind, Recycle, Heart, Globe, Fish, Waves, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Sustainability() {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans selection:bg-teal-500/30">
      <Navbar />

      {/* Immersive Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/40 to-slate-950 z-10" />
          <img
            src="https://images.unsplash.com/photo-1583212292454-1fe6229603b7?q=80&w=2000&auto=format&fit=crop"
            alt="Deep Ocean Life"
            className="w-full h-full object-cover scale-105 animate-slow-zoom"
          />
        </div>

        <div className="container relative z-20 px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="max-w-4xl mx-auto"
          >
            <Badge variant="outline" className="mb-6 border-teal-500/50 text-teal-400 bg-teal-500/10 backdrop-blur-md px-6 py-2 text-sm md:text-base uppercase tracking-[0.2em]">
              رؤيتنا للمستقبل
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-cyan-100 to-white mb-8 leading-tight drop-shadow-2xl">
              حُرّاس الأعماق
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-light">
              لأن الحوض ليس مجرد زينة، بل هو قطعة حية من روح المحيط في منزلك.
              <span className="block mt-2 text-teal-400 font-normal">مسؤوليتنا أن نحمي هذا الجمال للأبد.</span>
            </p>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <span className="text-slate-400 text-xs tracking-widest uppercase">اكتشف رحلتنا</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-teal-500 to-transparent"></div>
        </motion.div>
      </section>

      <main className="flex-1">
        {/* The Emotional Hook "The Why" */}
        <section className="py-24 md:py-32 relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-900/50 to-transparent" />

          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-3 text-teal-400 mb-2">
                  <Waves className="w-6 h-6" />
                  <span className="text-sm font-bold tracking-wider uppercase">رسالتنا</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                  نحن لا نبيع الأسماك،<br />
                  <span className="text-slate-500">نحن نؤتمن على أرواح.</span>
                </h2>
                <div className="space-y-6 text-lg text-slate-400 leading-loose">
                  <p>
                    عندما تنظر إلى حوضك، أنت لا تشاهد أسماكاً تسبح فحسب. أنت تشاهد نظاماً بيئياً دقيقاً،
                    لوحة فنية صاغتها الطبيعة عبر ملايين السنين. كل سمكة هي سفيرة لعالم غامض وساحر.
                  </p>
                  <p className="border-r-2 border-teal-500/50 pr-6">
                    في <span className="text-white font-bold">AQUAVO</span>، نؤمن أن هواية تربية الأسماك يجب أن تكون قوة للخير.
                    قوة تحمي الشعاب المرجانية، لا تدمرها. قوة تحافظ على التنوع البيولوجي، لا تستنزفه.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-teal-500/20 blur-[100px] rounded-full" />
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 opacity-60" />
                  <img
                    src="https://images.unsplash.com/photo-1546026423-cc4642628d2b?q=80&w=1000&auto=format&fit=crop"
                    alt="Fragile Ecosystem"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-6 right-6 z-20 max-w-xs">
                    <p className="text-white font-serif italic text-lg">"الطبيعة ليست مكاناً نزوره، إنها بيتنا."</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* The 1% Pledge - Premium Card Style */}
        <section className="py-24 bg-slate-900/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-teal-900/5 blur-[120px]" />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white mb-8 mx-auto shadow-lg shadow-teal-900/20 rotate-3 hover:rotate-6 transition-transform">
                <Globe className="w-10 h-10" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">عهدنا للأرض</h2>
              <p className="text-xl text-slate-400">
                الربح ليس هدفنا الوحيد. نحن ملتزمون برد الجميل للكوكب الذي يمنحنا كل هذا الجمال.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Heart,
                  color: "text-rose-400",
                  bg: "bg-rose-400/10",
                  title: "1% للمحيطات",
                  desc: "نتبرع بـ 1% من كل عملية بيع - مهما كانت صغيرة - للمنظمات التي تحارب تلوث المحيطات بالبلاستيك.",
                  stat: "تبرعات مستمرة"
                },
                {
                  icon: ShieldCheck,
                  color: "text-emerald-400",
                  bg: "bg-emerald-400/10",
                  title: "صيد مسؤول",
                  desc: "نرفض بيع أي كائن حي تم صيده بالسيانيد أو الديناميت. نتعامل فقط مع موردين معتمدين يحترمون دورة حياة الطبيعة.",
                  stat: "100% أخلاقي"
                },
                {
                  icon: Fish,
                  color: "text-blue-400",
                  bg: "bg-blue-400/10",
                  title: "دعم الاستزراع",
                  desc: "نشجع ونوفر الأسماك والشعاب المستزرعة محلياً لتقليل الضغط على البيئة البحرية الطبيعية.",
                  stat: "أولوية قصوى"
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-teal-500/30 transition-all group hover:-translate-y-2"
                >
                  <div className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center ${item.color} mb-6 group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed mb-6">{item.desc}</p>
                  <div className={`text-xs font-bold tracking-widest uppercase ${item.color} border-t border-slate-800 pt-4`}>
                    {item.stat}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive "How We Do It" Steps */}
        <section className="py-24 container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">خطواتنا العملية</h2>
              <p className="text-slate-400 text-lg">الاستدامة ليست شعاراً، بل هي قرارات يومية صغيرة تصنع فرقاً كبيراً.</p>
            </div>
            <Link href="/products">
              <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-8">
                تسوق المنتجات الصديقة للبيئة
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 p-10 rounded-[2rem] border border-slate-800 flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <Recycle className="w-12 h-12 text-teal-500 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">تغليف ذكي</h3>
                <p className="text-slate-400 leading-relaxed">
                  تخلصنا من حشوات الستايروفوم الضارة. نستخدم الآن مواداً قابلة للتحلل وورقاً معاد تدويره لحماية مشترياتك والكوكب معاً.
                </p>
              </div>
              <div className="mt-8">
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 w-[85%]" />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                  <span>الهدف: 100%</span>
                  <span>الحالي: 85%</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 p-10 rounded-[2rem] border border-slate-800 flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <Wind className="w-12 h-12 text-teal-500 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">طاقة نظيفة</h3>
                <p className="text-slate-400 leading-relaxed">
                  نختار معداتنا بعناية. الفلاتر والإضاءة التي نبيعها تستهلك طاقة أقل بنسبة تصل إلى 50% مقارنة بالمعدات التقليدية، مما يقلل فاتورتك وانبعاثات الكربون.
                </p>
              </div>
              <div className="mt-8 flex gap-4">
                <Badge variant="secondary" className="bg-slate-800 text-slate-300">LED تكنولوجيا</Badge>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300">DC مضخات</Badge>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Call to Action Footer */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1583212292454-1fe6229603b7?q=80&w=2000&auto=format&fit=crop"
              alt="Footer Background"
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
          </div>

          <div className="container relative z-10 px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">كن جزءاً من الحل</h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-12">
                كل خيار تتخذه في هوايتك يترك أثراً. اختر أن يكون أثرك أخضراً.
                انضم إلينا في رحلة لجعل أحواضنا واحات صغيرة للحياة، وليست مجرد زينة.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/guides/eco-friendly">
                  <Button size="lg" variant="outline" className="border-teal-500 text-teal-400 hover:bg-teal-500/10 text-lg px-8 py-6 rounded-full">
                    اقرأ دليل الهواية المستدامة
                  </Button>
                </Link>
                <Link href="/products">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-500 text-white text-lg px-8 py-6 rounded-full shadow-lg shadow-teal-900/50">
                    ابدأ رحلتك الآن
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
