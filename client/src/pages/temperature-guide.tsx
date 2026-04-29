/**
 * AQUAVO Temperature Guide — Free Lead Magnet Landing Page
 * ═════════════════════════════════════════════════════════
 * Psychology: Cialdini Reciprocity — give value first, build trust
 * Purpose: Story 4 (Tuesday Harvest Day) link destination
 * URL: aquavoiq.com/temperature-guide
 */

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Thermometer, Download, ChevronDown, Shield, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

// ─────────────────────────────────────────────────
// DATA — Fish Temperature Chart
// ─────────────────────────────────────────────────
interface FishTemp {
  name: string;
  nameEn: string;
  min: number;
  max: number;
  ideal: number;
  difficulty: "سهل" | "متوسط" | "متقدم";
  color: string;
  image: string;
}

const FISH_DATA: FishTemp[] = [
  { name: "نيون تترا", nameEn: "Neon Tetra", min: 20, max: 26, ideal: 24, difficulty: "سهل", color: "#00d4ff", image: "/fish/neon-tetra.webp" },
  { name: "جوبي", nameEn: "Guppy", min: 22, max: 28, ideal: 25, difficulty: "سهل", color: "#ff7b5a", image: "/fish/guppy.webp" },
  { name: "بيتا", nameEn: "Betta", min: 24, max: 30, ideal: 27, difficulty: "سهل", color: "#e63946", image: "/fish/betta-splendens.webp" },
  { name: "أنجل فيش", nameEn: "Angelfish", min: 24, max: 30, ideal: 26, difficulty: "متوسط", color: "#ffd700", image: "/fish/angelfish.webp" },
  { name: "مولي", nameEn: "Molly", min: 22, max: 28, ideal: 25, difficulty: "سهل", color: "#7FFF00", image: "/fish/molly.webp" },
  { name: "بلاتي", nameEn: "Platy", min: 20, max: 26, ideal: 24, difficulty: "سهل", color: "#ff9a56", image: "/fish/platy.webp" },
  { name: "كوري كات", nameEn: "Corydoras", min: 22, max: 26, ideal: 24, difficulty: "سهل", color: "#1abc9c", image: "/fish/corydoras-paleatus.webp" },
  { name: "ديسكس", nameEn: "Discus", min: 28, max: 32, ideal: 30, difficulty: "متقدم", color: "#3498db", image: "/fish/discus.webp" },
  { name: "تترا كاردينال", nameEn: "Cardinal Tetra", min: 23, max: 27, ideal: 25, difficulty: "متوسط", color: "#e74c3c", image: "/fish/cardinal-tetra.webp" },
  { name: "سوردتيل", nameEn: "Swordtail", min: 22, max: 28, ideal: 25, difficulty: "سهل", color: "#2ecc71", image: "/fish/swordtail.webp" },
  { name: "تايجر بارب", nameEn: "Tiger Barb", min: 22, max: 28, ideal: 25, difficulty: "متوسط", color: "#f39c12", image: "/fish/tiger-barb.webp" },
  { name: "جولد فيش", nameEn: "Goldfish", min: 18, max: 24, ideal: 21, difficulty: "سهل", color: "#ffa500", image: "/fish/goldfish.webp" },
];

// ─────────────────────────────────────────────────
// Floating Bubbles (CSS only)
// ─────────────────────────────────────────────────
const BUBBLES = [
  { l: 8, s: 5, dur: 12, del: 0 }, { l: 22, s: 7, dur: 15, del: 3 },
  { l: 45, s: 4, dur: 10, del: 6 }, { l: 67, s: 6, dur: 14, del: 1 },
  { l: 82, s: 8, dur: 11, del: 5 }, { l: 35, s: 3, dur: 16, del: 8 },
];

function FloatingBubbles() {
  return (
    <>
      <style>{`
        @keyframes tempFloat {
          0%   { transform: translateY(110vh) scale(0.8); opacity: 0; }
          8%   { opacity: 0.4; }
          92%  { opacity: 0.15; }
          100% { transform: translateY(-8vh) scale(1.1); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {BUBBLES.map((b, i) => (
          <div key={i} style={{
            position: "absolute", left: `${b.l}%`, bottom: "-8%",
            width: b.s, height: b.s, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, rgba(25,155,184,0.45), rgba(25,155,184,0.06))",
            border: "1px solid rgba(25,155,184,0.2)",
            animation: `tempFloat ${b.dur}s ${b.del}s infinite linear`,
          }} />
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Temperature Bar Component
// ─────────────────────────────────────────────────
function FishCard({ fish, index }: { fish: FishTemp; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });

  const diffColor = fish.difficulty === "سهل" ? "#22c55e" : fish.difficulty === "متوسط" ? "#eab308" : "#ef4444";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${fish.color}08, rgba(255,255,255,0.03))`,
        border: `1px solid ${fish.color}20`,
      }}
    >
      <div className="flex items-stretch">
        {/* Fish Image */}
        <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 relative overflow-hidden flex items-center justify-center p-2"
          style={{ background: `linear-gradient(135deg, ${fish.color}15, ${fish.color}05)` }}>
          <img
            src={fish.image}
            alt={fish.name}
            className="w-full h-full object-contain drop-shadow-lg"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Info */}
        <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
          {/* Name row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white/90 text-sm font-bold truncate">{fish.name}</span>
              <span className="text-white/25 text-[10px] hidden sm:inline">{fish.nameEn}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{
              background: `${diffColor}15`, color: diffColor, border: `1px solid ${diffColor}30`,
            }}>
              {fish.difficulty}
            </span>
          </div>

          {/* Temperature numbers */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-blue-400/60">أدنى</span>
              <span className="text-xs font-black text-blue-400">{fish.min}°</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: `${fish.color}20` }}>
              <Thermometer size={10} style={{ color: fish.color }} />
              <span className="text-[10px] font-medium" style={{ color: `${fish.color}99` }}>مثالي</span>
              <span className="text-sm font-black" style={{ color: fish.color }}>{fish.ideal}°C</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-red-400/60">أقصى</span>
              <span className="text-xs font-black text-red-400">{fish.max}°</span>
            </div>
          </div>

          {/* Visual bar */}
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.7, delay: index * 0.06 + 0.2 }}
              className="absolute top-0 bottom-0 rounded-full"
              style={{
                left: `${((fish.min - 16) / 20) * 100}%`,
                width: `${((fish.max - fish.min) / 20) * 100}%`,
                background: `linear-gradient(90deg, ${fish.color}50, ${fish.color}90, ${fish.color}50)`,
                transformOrigin: "left",
                boxShadow: `0 0 8px ${fish.color}40`,
              }}
            />
            {/* Ideal dot */}
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ delay: index * 0.06 + 0.5, type: "spring" }}
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 border-2"
              style={{
                left: `${((fish.ideal - 16) / 20) * 100}%`,
                background: fish.color,
                borderColor: "#010611",
                boxShadow: `0 0 6px ${fish.color}`,
                marginLeft: "-5px",
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────
export default function TemperatureGuide() {
  const [downloaded, setDownloaded] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInView = useInView(chartRef, { once: true, margin: "-60px" });

  // Track visit
  useEffect(() => {
    document.title = "جدول درجات الحرارة المثالية لأسماك الزينة — AQUAVO";
  }, []);

  const handleDownload = () => {
    setDownloaded(true);
    // Scroll to chart section
    chartRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative bg-[#010611] text-white min-h-screen w-full" dir="rtl">
      <FloatingBubbles />

      {/* Noise grain */}
      <div className="fixed inset-0 pointer-events-none z-[60] mix-blend-overlay" style={{
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat", backgroundSize: "180px 180px",
      }} />

      <div className="mx-auto max-w-lg w-full relative z-10">

        {/* ── HERO ── */}
        <section ref={heroRef} className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 pt-20 pb-10 overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px]"
              style={{ background: "radial-gradient(circle, rgba(25,155,184,0.15), transparent 70%)" }} />
          </div>

          {/* Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
            style={{ background: "rgba(25,155,184,0.1)", border: "1px solid rgba(25,155,184,0.25)", backdropFilter: "blur(12px)" }}
          >
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              style={{ boxShadow: "0 0 8px rgba(25,155,184,0.9)" }}
            />
            <span className="text-cyan-300 text-xs font-bold tracking-widest uppercase">مجاناً</span>
            <span className="text-cyan-300/35 text-xs">· AQUAVO 2026</span>
          </motion.div>

          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(25,155,184,0.3), rgba(255,123,90,0.2))",
              border: "1px solid rgba(25,155,184,0.4)",
              boxShadow: "0 0 40px rgba(25,155,184,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <Thermometer size={36} className="text-cyan-300" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl md:text-4xl font-black text-center leading-tight mb-4"
          >
            جدول درجات الحرارة{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-[#199bb8]">
              المثالية
            </span>
            <br />
            لكل نوع سمك
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-400 text-sm font-medium text-center max-w-xs leading-relaxed mb-8"
          >
            12 نوع سمك شائع بالعراق مع درجة الحرارة المثالية، الحد الأدنى والأقصى، ومستوى الصعوبة
          </motion.p>

          {/* CTA Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={handleDownload}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, rgba(25,155,184,0.9), rgba(13,122,148,0.9))",
              boxShadow: "0 0 40px rgba(25,155,184,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
              border: "1px solid rgba(25,155,184,0.5)",
            }}
          >
            <Download size={20} />
            <span>شوف الجدول الكامل</span>
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </motion.button>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-12 flex flex-col items-center gap-1 text-white/15"
          >
            <span className="text-[10px] tracking-widest uppercase font-semibold">نزّل لتشوف الجدول</span>
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
              <ChevronDown size={18} />
            </motion.div>
          </motion.div>
        </section>

        {/* ── TEMPERATURE CHART ── */}
        <section ref={chartRef} className="px-4 pb-8">
          {/* Glass card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={chartInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="rounded-3xl overflow-hidden p-6 md:p-8"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.06) 100%)",
              backdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(25,155,184,0.1)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(25,155,184,0.2)", border: "1px solid rgba(25,155,184,0.4)" }}>
                <Thermometer size={16} className="text-cyan-400" />
              </div>
              <h2 className="text-lg font-black text-white">جدول الحرارة التفاعلي</h2>
            </div>

            {/* Scale header */}
            <div className="relative h-6 mb-2">
              {[18, 20, 22, 24, 26, 28, 30, 32, 34].map(t => (
                <span key={t} className="absolute text-[9px] text-white/25 font-bold -translate-x-1/2"
                  style={{ left: `${((t - 18) / 16) * 100}%` }}>
                  {t}°C
                </span>
              ))}
            </div>

            {/* Fish cards */}
            <div className="space-y-3">
              {FISH_DATA.map((fish, i) => (
                <FishCard key={fish.nameEn} fish={fish} index={i} />
              ))}
            </div>

            {/* Legend */}
            <div className="mt-8 pt-4 border-t border-white/8 flex flex-wrap gap-4 justify-center">
              {[
                { label: "سهل", color: "#22c55e" },
                { label: "متوسط", color: "#eab308" },
                { label: "متقدم", color: "#ef4444" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-xs text-white/40 font-medium">{l.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded-full bg-cyan-400" />
                <span className="text-xs text-white/40 font-medium">الدرجة المثالية</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── TIPS SECTION ── */}
        <section className="px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7 }}
            className="rounded-3xl p-6"
            style={{
              background: "linear-gradient(135deg, rgba(255,123,90,0.08), rgba(25,155,184,0.06))",
              border: "1px solid rgba(255,123,90,0.15)",
            }}
          >
            <h3 className="text-lg font-black text-white/90 mb-4 flex items-center gap-2">
              <Shield size={18} className="text-[#ff7b5a]" />
              نصائح ذهبية للحرارة
            </h3>
            <div className="space-y-3 text-sm text-white/60 font-medium leading-relaxed">
              <p>1. تذبذب الحرارة أخطر من الحرارة الثابتة — حتى لو كانت عالية شوية.</p>
              <p>2. فرق 3 درجات بين الليل والنهار يكفي يقتل أسماكك.</p>
              <p>3. السخان القزاز ممكن يطق بالصيف — استخدم ستيل.</p>
              <p>4. ثيرموميتر رقمي أفضل من الشريط اللاصق — أدق بكثير.</p>
              <p>5. بالصيف العراقي، المشكلة مو بس ارتفاع الحرارة — بل نقص الأوكسجين اللي يصاحبه.</p>
            </div>
          </motion.div>
        </section>

        {/* ── CTA SECTION ── */}
        <section className="px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-3"
          >
            {/* Shop heaters */}
            <Link href="/products">
              <button className="w-full font-bold py-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] text-[15px] text-white"
                style={{
                  background: "linear-gradient(135deg, rgba(25,155,184,0.9), rgba(13,122,148,0.8))",
                  boxShadow: "0 0 40px rgba(25,155,184,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                  border: "1px solid rgba(25,155,184,0.4)",
                }}>
                <Thermometer size={20} />
                <span>تسوق سخانات ستيل — حماية دائمة</span>
              </button>
            </Link>

            {/* WhatsApp */}
            <button
              onClick={() => window.open("https://wa.me/9647747880673", "_blank")}
              className="w-full font-bold py-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] text-[15px] text-white"
              style={{
                background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className="text-green-400 text-lg">📱</span>
              <span>تواصل مع الخبراء عبر واتساب</span>
            </button>

            {/* Brand */}
            <p className="text-center text-white/10 text-xs pt-4 font-medium tracking-widest uppercase">
              AQUAVO — خبراء أحواض السمك في العراق
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
