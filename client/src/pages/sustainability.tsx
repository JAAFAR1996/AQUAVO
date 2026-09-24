import { Leaf, Droplets, Wind, Recycle, Heart, Globe, Fish, Waves, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function Sustainability() {
  const { t } = useTranslation("pages");
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
    <div className="flex-1 flex flex-col bg-background dark:bg-slate-950 font-sans selection:bg-teal-500/30">
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
              {t("sustainability.s1")}
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-cyan-100 to-white mb-8 leading-tight drop-shadow-2xl">
              {t("sustainability.s2")}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-light">
              {t("sustainability.s3")}
              <span className="block mt-2 text-teal-400 font-normal">{t("sustainability.s4")}</span>
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
          <span className="text-muted-foreground dark:text-slate-400 text-xs tracking-widest uppercase">{t("sustainability.s5")}</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-teal-500 to-transparent"></div>
        </motion.div>
      </section>

      <main id="main-content" className="flex-1">
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
                  <span className="text-sm font-bold tracking-wider uppercase">{t("sustainability.s6")}</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-foreground dark:text-white leading-tight">
                  {t("sustainability.s7")}<br />
                  <span className="text-slate-500">{t("sustainability.s8")}</span>
                </h2>
                <div className="space-y-6 text-lg text-muted-foreground dark:text-slate-400 leading-loose">
                  <p>
                    {t("sustainability.s9")}
                  </p>
                  <p className="border-r-2 border-teal-500/50 pr-6">
                    {t("sustainability.s10")} <span className="text-foreground dark:text-white font-bold">AQUAVO</span>{t("sustainability.s11")}
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
                <div className="relative rounded-2xl overflow-hidden border border-border dark:border-slate-800 shadow-2xl group">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 opacity-60" />
                  <img
                    src="https://images.unsplash.com/photo-1546026423-cc4642628d2b?q=80&w=1000&auto=format&fit=crop"
                    alt="Fragile Ecosystem"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-6 right-6 z-20 max-w-xs">
                    <p className="text-foreground dark:text-white font-serif italic text-lg">{t("sustainability.s12")}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* The 1% Pledge - Premium Card Style */}
        <section className="py-24 bg-background dark:bg-slate-900/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-teal-900/5 blur-[120px]" />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center text-foreground dark:text-white mb-8 mx-auto shadow-lg shadow-teal-900/20 rotate-3 hover:rotate-6 transition-transform">
                <Globe className="w-10 h-10" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground dark:text-white mb-6">{t("sustainability.s13")}</h2>
              <p className="text-xl text-muted-foreground dark:text-slate-400">
                {t("sustainability.s14")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Heart,
                  color: "text-rose-400",
                  bg: "bg-rose-400/10",
                  title: t("sustainability.s15"),
                  desc: t("sustainability.s16"),
                  stat: t("sustainability.s17")
                },
                {
                  icon: ShieldCheck,
                  color: "text-emerald-400",
                  bg: "bg-emerald-400/10",
                  title: t("sustainability.s18"),
                  desc: t("sustainability.s19"),
                  stat: t("sustainability.s20")
                },
                {
                  icon: Fish,
                  color: "text-blue-400",
                  bg: "bg-blue-400/10",
                  title: t("sustainability.s21"),
                  desc: t("sustainability.s22"),
                  stat: t("sustainability.s23")
                }
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="bg-background dark:bg-slate-900 border border-border dark:border-slate-800 p-8 rounded-3xl hover:border-teal-500/30 transition-all group hover:-translate-y-2"
                >
                  <div className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center ${item.color} mb-6 group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground dark:text-white mb-4">{item.title}</h3>
                  <p className="text-muted-foreground dark:text-slate-400 leading-relaxed mb-6">{item.desc}</p>
                  <div className={`text-xs font-bold tracking-widest uppercase ${item.color} border-t border-border dark:border-slate-800 pt-4`}>
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
              <h2 className="text-3xl md:text-5xl font-bold text-foreground dark:text-white mb-4">{t("sustainability.s24")}</h2>
              <p className="text-muted-foreground dark:text-slate-400 text-lg">{t("sustainability.s25")}</p>
            </div>
            <Link href="/products">
              <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-foreground dark:text-white rounded-full px-8">
                {t("sustainability.s26")}
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 p-10 rounded-[2rem] border border-border dark:border-slate-800 flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <Recycle className="w-12 h-12 text-teal-500 mb-6" />
                <h3 className="text-2xl font-bold text-foreground dark:text-white mb-3">{t("sustainability.s27")}</h3>
                <p className="text-muted-foreground dark:text-slate-400 leading-relaxed">
                  {t("sustainability.s28")}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Badge variant="secondary" className="bg-card dark:bg-slate-800 text-muted-foreground dark:text-slate-300">
                  {t("sustainability.s29")}
                </Badge>
                <Badge variant="secondary" className="bg-card dark:bg-slate-800 text-muted-foreground dark:text-slate-300">
                  {t("sustainability.s30")}
                </Badge>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 p-10 rounded-[2rem] border border-border dark:border-slate-800 flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <Wind className="w-12 h-12 text-teal-500 mb-6" />
                <h3 className="text-2xl font-bold text-foreground dark:text-white mb-3">{t("sustainability.s31")}</h3>
                <p className="text-muted-foreground dark:text-slate-400 leading-relaxed">
                  {t("sustainability.s32")}
                </p>
              </div>
              <div className="mt-8 flex gap-4">
                <Badge variant="secondary" className="bg-card dark:bg-slate-800 text-muted-foreground dark:text-slate-300">{t("sustainability.s33")}</Badge>
                <Badge variant="secondary" className="bg-card dark:bg-slate-800 text-muted-foreground dark:text-slate-300">{t("sustainability.s34")}</Badge>
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
              <h2 className="text-4xl md:text-6xl font-bold text-foreground dark:text-white mb-8">{t("sustainability.s35")}</h2>
              <p className="text-xl text-muted-foreground dark:text-slate-300 max-w-2xl mx-auto mb-12">
                {t("sustainability.s36")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/guides/eco-friendly">
                  <Button size="lg" variant="outline" className="border-teal-500 text-teal-400 hover:bg-teal-500/10 text-lg px-8 py-6 rounded-full">
                    {t("sustainability.s37")}
                  </Button>
                </Link>
                <Link href="/products">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-500 text-foreground dark:text-white text-lg px-8 py-6 rounded-full shadow-lg shadow-teal-900/50">
                    {t("sustainability.s38")}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
