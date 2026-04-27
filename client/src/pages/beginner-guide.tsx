import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView, useSpring } from "framer-motion";
import { ShoppingBag, PhoneCall, CheckCircle2, Sparkles, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import confetti from "canvas-confetti";

// ─────────────────────────────────────────────────────────────
// 1. Audio Engine (Web Audio API — توليد صوت بدون ملفات خارجية)
// ─────────────────────────────────────────────────────────────
const playBubbleSound = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
};

const playMagicSplash = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.6);
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 1.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(150, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.0);
    gain2.gain.setValueAtTime(0.8, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start();
    osc2.stop(ctx.currentTime + 1.0);
  } catch (e) {}
};

// ─────────────────────────────────────────────────────────────
// 2. Haptics
// ─────────────────────────────────────────────────────────────
const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) {}
  }
};

// ─────────────────────────────────────────────────────────────
// 3. Data
// ─────────────────────────────────────────────────────────────
const SCENES = [
  { id: 0, image: "/guide-images/1-1-1-1-1.png", label: "إعداد الحوض" },
  { id: 1, image: "/guide-images/2-2-2-2-2.png", label: "التجهيز المائي" },
  { id: 2, image: "/guide-images/3-3-3-3-3.png", label: "الديكور والتأسيس" },
  { id: 3, image: "/guide-images/4-4-4-4-4.png", label: "إكسير البكتيريا" },
  { id: 4, image: "/guide-images/5-5-5-5-5.png", label: "الحوض يحيا!" },
];

// ─────────────────────────────────────────────────────────────
// 4. ScrollReveal Wrapper — يُطلق الأنيميشن عند دخول العنصر
// ─────────────────────────────────────────────────────────────
function ScrollReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, filter: "blur(8px)" }}
      animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. ParallaxScene — كل خطوة تنزل بزخم بصري مختلف
// ─────────────────────────────────────────────────────────────
function ParallaxScene({ scene, index }: { scene: typeof SCENES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["4%", "-4%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.96, 1, 1, 0.96]);

  return (
    <section
      ref={ref}
      className="relative w-full flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Step badge */}
      <ScrollReveal delay={0.1} className="w-full max-w-md mx-auto px-6 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 text-xs font-black backdrop-blur-sm">
            {index + 1}
          </div>
          <span className="text-cyan-300/70 text-sm font-medium tracking-widest uppercase">
            {scene.label}
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-cyan-400/20" />
        </div>
      </ScrollReveal>

      {/* Image with parallax */}
      <motion.div
        style={{ y, opacity, scale }}
        className="w-full max-w-md mx-auto px-4 pb-8"
      >
        <div className="relative rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)] border border-white/5">
          {/* Ambient glow layer */}
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-cyan-900/10 pointer-events-none z-10" />
          <img
            src={scene.image}
            alt={scene.label}
            className="w-full h-auto block"
            loading="lazy"
            decoding="async"
          />
        </div>
      </motion.div>

      {/* Scroll hint arrow (only middle scenes) */}
      {index < 2 && (
        <ScrollReveal delay={0.4}>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="pb-10 text-white/20 flex flex-col items-center gap-1"
          >
            <ChevronDown size={20} />
            <ChevronDown size={20} className="-mt-3 opacity-50" />
          </motion.div>
        </ScrollReveal>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. BacteriaStickyZone — قلب التجربة التفاعلية
// ─────────────────────────────────────────────────────────────
function BacteriaStickyZone({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [bacteriaAdded, setBacteriaAdded] = useState(false);
  const [dragFailed, setDragFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  // Scroll lock: body يتجمد لما يوصل لهذه المنطقة قبل الحل
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !bacteriaAdded) {
          document.body.style.overflow = "hidden";
          document.documentElement.style.overflow = "hidden";
        }
      },
      { threshold: 0.6 }
    );
    if (stickyRef.current) observer.observe(stickyRef.current);
    return () => {
      observer.disconnect();
    };
  }, [bacteriaAdded]);

  const unlock = useCallback(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }, []);

  const handleDropBacteria = useCallback(() => {
    if (bacteriaAdded) return;
    setBacteriaAdded(true);
    unlock();

    playMagicSplash();
    vibrate([50, 100, 150, 100, 200]);

    confetti({
      particleCount: 300,
      spread: 130,
      startVelocity: 45,
      origin: { y: 0.5 },
      colors: ["#00ffea", "#00ff88", "#ffffff", "#0ea5e9", "#7FFF00"],
      shapes: ["circle"],
      scalar: 1.4,
      ticks: 350,
      gravity: 0.75,
    });

    setTimeout(onComplete, 2600);
  }, [bacteriaAdded, unlock, onComplete]);

  const handleDragFail = useCallback(() => {
    setDragFailed(true);
    vibrate([40, 60]);
    setTimeout(() => setDragFailed(false), 600);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Sticky wrapper */}
      <div
        ref={stickyRef}
        className="sticky top-0 min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Background pulse when locked */}
        <AnimatePresence>
          {!bacteriaAdded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.03, 0.08, 0.03] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-cyan-400 rounded-full blur-3xl"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step label */}
        <div className="w-full max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 text-xs font-black backdrop-blur-sm">
              4
            </div>
            <span className="text-cyan-300/70 text-sm font-medium tracking-widest uppercase">
              {SCENES[3].label}
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-cyan-400/20" />
          </div>
        </div>

        {/* Bacteria image */}
        <div className="w-full max-w-md mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)] border border-white/5">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-cyan-900/10 pointer-events-none z-10" />
            <img
              src={SCENES[3].image}
              alt="إكسير البكتيريا"
              className="w-full h-auto block"
            />
          </div>
        </div>

        {/* Interaction Zone */}
        <div className="w-full max-w-md mx-auto px-4 mt-6 pb-8 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {!bacteriaAdded ? (
              <motion.div
                key="drag-zone"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                {/* Lock indicator */}
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 text-amber-400/80 text-xs font-bold tracking-wider uppercase bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-2 backdrop-blur-md"
                >
                  <span>🔒</span>
                  <span>التمرير محجوب — أكمل التفاعل للمتابعة</span>
                </motion.div>

                {/* Instruction */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 text-cyan-300 font-bold bg-black/50 px-5 py-3 rounded-2xl border border-cyan-500/25 backdrop-blur-xl text-sm shadow-[0_0_30px_rgba(8,145,178,0.3)]"
                >
                  <Sparkles size={16} className="text-cyan-400 shrink-0" />
                  <span>اسحب العلبة للأعلى وارميها بالماي!</span>
                </motion.div>

                {/* Draggable bacteria bottle */}
                <motion.div
                  drag
                  dragConstraints={{ top: -420, left: -80, right: 80, bottom: 0 }}
                  dragElastic={0.7}
                  whileDrag={{ scale: 1.15, rotate: -12 }}
                  animate={dragFailed ? { x: [-6, 6, -6, 6, 0], rotate: [0, -3, 3, -3, 0] } : {}}
                  onDragEnd={(_, info) => {
                    if (info.offset.y < -90) {
                      handleDropBacteria();
                    } else {
                      handleDragFail();
                    }
                  }}
                  className="w-28 h-28 bg-gradient-to-br from-cyan-900/70 to-blue-900/70 backdrop-blur-2xl rounded-[28px] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border-2 border-cyan-300/50 shadow-[0_0_60px_rgba(8,145,178,0.7),inset_0_0_20px_rgba(255,255,255,0.12)] select-none"
                  style={{ touchAction: "none" }}
                >
                  <span className="text-5xl drop-shadow-[0_0_12px_rgba(0,255,234,0.8)]">🧪</span>
                  <span className="text-[10px] font-black mt-1.5 text-cyan-200 tracking-widest">بكتيريا</span>
                </motion.div>

                {/* Drop target indicator */}
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.98, 1.01, 0.98] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-1.5 rounded-full bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
                />
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ scale: 0.5, opacity: 0, filter: "blur(16px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.4 }}
                className="bg-black/60 border border-green-500/40 backdrop-blur-2xl rounded-3xl px-8 py-6 flex flex-col items-center text-center shadow-[0_0_60px_rgba(34,197,94,0.25)]"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-400/40"
                >
                  <CheckCircle2 size={34} className="text-green-400" />
                </motion.div>
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-cyan-300">
                  الماي صار حي! 🌊
                </h3>
                <p className="text-sm text-gray-300 mt-2 font-medium leading-relaxed">
                  تم تفعيل النظام البيولوجي بنجاح
                  <br />
                  <span className="text-cyan-400/70 text-xs">يتم فتح الخطوة الأخيرة...</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. FinalScene — الختام
// ─────────────────────────────────────────────────────────────
function FinalScene() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className="relative w-full flex flex-col items-center overflow-hidden"
    >
      {/* Step label */}
      <div className="w-full max-w-md mx-auto px-6 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#7FFF00]/20 border border-[#7FFF00]/40 flex items-center justify-center text-[#7FFF00] text-xs font-black">
            5
          </div>
          <span className="text-[#7FFF00]/70 text-sm font-medium tracking-widest uppercase">
            {SCENES[4].label}
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#7FFF00]/20" />
        </div>
      </div>

      {/* Final image */}
      <motion.div
        initial={{ y: 60, opacity: 0, filter: "blur(12px)" }}
        animate={isInView ? { y: 0, opacity: 1, filter: "blur(0px)" } : {}}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md mx-auto px-4"
      >
        <div className="relative rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.7),0_0_60px_rgba(127,255,0,0.05)] border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-b from-[#7FFF00]/5 via-transparent to-[#7FFF00]/10 pointer-events-none z-10" />
          <img
            src={SCENES[4].image}
            alt="الحوض يحيا"
            className="w-full h-auto block"
          />
        </div>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md mx-auto px-4 mt-8 pb-16 space-y-3"
      >
        {/* Congrats glass card */}
        <div className="bg-white/4 backdrop-blur-2xl border border-white/8 rounded-3xl px-6 py-5 text-center mb-6">
          <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-[#7FFF00] to-cyan-300">
            مبروك! حوضك جاهز 🎉
          </p>
          <p className="text-sm text-gray-400 mt-1.5 font-medium">
            حوضك الآن يعيش — تسوق الباقي من AQUAVO
          </p>
        </div>

        <Link href="/">
          <button
            onClick={() => { vibrate(20); playBubbleSound(); }}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] text-[15px] border border-cyan-400/40 shadow-[0_0_40px_rgba(8,145,178,0.4)]"
          >
            <ShoppingBag size={21} />
            <span>تسوق مستهلكات الحوض</span>
          </button>
        </Link>

        <button
          onClick={() => {
            vibrate(20);
            playBubbleSound();
            window.open("https://wa.me/9647747880673", "_blank");
          }}
          className="w-full bg-black/40 backdrop-blur-2xl border border-white/15 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] text-[15px] hover:bg-white/8"
        >
          <PhoneCall size={21} className="text-green-400" />
          <span>تواصل مع الخبراء</span>
        </button>

        <p className="text-center text-white/20 text-xs pt-2 font-medium">
          AQUAVO — أول تجربة حوض بالذكاء الاصطناعي في العراق
        </p>
      </motion.div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. ScrollProgress Bar — شريط التقدم الثابت
// ─────────────────────────────────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-white/5">
      <motion.div
        style={{ scaleX, transformOrigin: "left" }}
        className="h-full bg-gradient-to-r from-cyan-400 via-[#7FFF00] to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. Hero — الواجهة الافتتاحية
// ─────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-[50vh] flex flex-col items-center justify-center px-6 pt-16 pb-8 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/4 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="text-center relative z-10"
      >
        <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-4 py-1.5 mb-6 backdrop-blur-md">
          <span className="text-cyan-400 text-xs font-bold tracking-widest uppercase">دليل المبتدئين</span>
          <span className="text-cyan-400/60 text-xs">AQUAVO 2026</span>
        </div>

        <h1 className="text-3xl font-black text-white mb-3 leading-tight">
          من الصفر{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#7FFF00]">
            لحوض يعيش
          </span>
        </h1>
        <p className="text-gray-400 text-sm font-medium max-w-xs mx-auto leading-relaxed">
          9 خطوات تفاعلية — نزّل للأسفل واتبع الرحلة
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="mt-10 flex flex-col items-center gap-1.5 text-white/25"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={22} />
        </motion.div>
        <span className="text-xs font-medium tracking-widest">نزّل للبدء</span>
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// 10. Main Component
// ─────────────────────────────────────────────────────────────
export default function BeginnerGuide() {
  const [bacteriaDone, setBacteriaDone] = useState(false);

  // Cleanup scroll lock on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="relative bg-[#010611] text-white min-h-screen w-full"
      dir="rtl"
    >
      {/* Fixed scroll progress bar */}
      <ScrollProgressBar />

      {/* Content column — centered, max-width for mobile feel on desktop */}
      <div className="mx-auto max-w-md w-full md:border-x md:border-white/5 md:shadow-[0_0_120px_rgba(0,0,0,0.8)]">

        {/* Hero intro */}
        <Hero />

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent" />

        {/* Scenes 1–3: natural vertical scroll with parallax */}
        {SCENES.slice(0, 3).map((scene, i) => (
          <ParallaxScene key={scene.id} scene={scene} index={i} />
        ))}

        {/* Separator before sticky zone */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent my-4" />

        {/* Scene 4: Bacteria Sticky Zone */}
        <BacteriaStickyZone onComplete={() => setBacteriaDone(true)} />

        {/* Scene 5: Final — only appears after bacteria */}
        <AnimatePresence>
          {bacteriaDone && (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#7FFF00]/20 to-transparent my-4" />
              <FinalScene />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
