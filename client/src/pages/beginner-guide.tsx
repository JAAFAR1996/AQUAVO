/**
 * AQUAVO Beginner Guide — Ultra-Premium 2026 Edition
 * ════════════════════════════════════════════════════
 * تقنيات مُطبَّقة:
 * ① Ambient Color Shift         — خلفية تتغير حسب المقطع النشط
 * ② CSS Float Particles         — فقاعات CSS خالصة
 * ③ Liquid Glass 3.0            — Apple iOS26 style
 * ④ Scroll Velocity Warp        — blur ديناميكي عند التمرير السريع
 * ⑤ Per-Section Parallax        — useScroll + useTransform
 * ⑥ Magnetic Spring Bottle      — فيزياء جاذبية على العلبة
 * ⑦ SVG Wave Dividers           — فواصل موجية
 * ⑧ Ambient Audio Zones         — نبرة مختلفة لكل مقطع
 * ⑨ Gyroscope Parallax          — جيروسكوب موبايل
 * ⑩ Noise Grain Overlay         — texture فلمي
 * ⑪ Progressive Clip-Path       — ملء مائي مع التمرير
 * ⑫ Stagger Variants            — ظهور متتالي
 * ⑬ Section IntersectionObserver— تتبع المقطع النشط
 * ⑭ CSS-Native Scroll Progress  — animation-timeline: scroll()
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  useMotionValue,
  useVelocity,
  useMotionValueEvent,
} from "framer-motion";
import {
  ShoppingBag,
  PhoneCall,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Droplets,
  Lock,
} from "lucide-react";
import { Link } from "wouter";
import confetti from "canvas-confetti";
import { WHATSAPP_URL } from "@/lib/constants/shipping";
import { MetaTags } from "@/components/seo/meta-tags";

// ─────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────
const SCENES = [
  { id: 0, image: "/guide-images/1-1-1-1-1.png", label: "إعداد الحوض",    step: "01", rgb: "10,100,120",  freq: 180 },
  { id: 1, image: "/guide-images/2-2-2-2-2.png", label: "التجهيز المائي", step: "02", rgb: "8,70,145",    freq: 220 },
  { id: 2, image: "/guide-images/3-3-3-3-3.png", label: "الديكور والأساس",step: "03", rgb: "20,90,40",    freq: 260 },
  { id: 3, image: "/guide-images/4-4-4-4-4.png", label: "إكسير البكتيريا",step: "04", rgb: "0,140,190",   freq: 140 },
  { id: 4, image: "/guide-images/5-5-5-5-5.png", label: "الحوض يحيا! 🌊", step: "05", rgb: "90,200,20",   freq: 440 },
] as const;

// ─────────────────────────────────────────────────
// AUDIO ENGINE
// ─────────────────────────────────────────────────
const mkCtx = () => {
  try {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    return C ? new C() : null;
  } catch { return null; }
};

const tone = (freq: number, vol = 0.06, dur = 0.15) => {
  const ctx = mkCtx(); if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + dur * 0.7);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.start(); o.stop(ctx.currentTime + dur);
};

const playBubble = () => tone(320, 0.05, 0.12);

const playMagicSplash = () => {
  const ctx = mkCtx(); if (!ctx) return;
  [880, 1100, 1320, 1760].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    const t = ctx.currentTime + i * 0.08;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    o.start(t); o.stop(t + 0.8);
  });
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o2.connect(g2); g2.connect(ctx.destination);
  o2.type = "sine";
  o2.frequency.setValueAtTime(120, ctx.currentTime);
  o2.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 1.2);
  g2.gain.setValueAtTime(0.7, ctx.currentTime);
  g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
  o2.start(); o2.stop(ctx.currentTime + 1.2);
};

const vib = (p: number | number[]) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(p); } catch {}
  }
};

// ─────────────────────────────────────────────────
// ① AMBIENT BACKGROUND
// ─────────────────────────────────────────────────
function AmbientBg({ idx }: { idx: number }) {
  const rgb = SCENES[idx]?.rgb ?? "10,77,92";
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-0"
      animate={{ background: `radial-gradient(ellipse 80% 55% at 50% 30%, rgba(${rgb},0.17) 0%, transparent 72%)` }}
      transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
    />
  );
}

// ─────────────────────────────────────────────────
// ② FLOATING BUBBLES — pure CSS
// ─────────────────────────────────────────────────
const BUBBLES = [
  { l:7,  s:5,  dur:9,  del:0   }, { l:19, s:8,  dur:14, del:2   },
  { l:33, s:4,  dur:11, del:5   }, { l:44, s:9,  dur:8,  del:1   },
  { l:56, s:6,  dur:16, del:7   }, { l:68, s:3,  dur:10, del:3   },
  { l:76, s:7,  dur:13, del:9   }, { l:89, s:5,  dur:12, del:4   },
  { l:23, s:10, dur:15, del:6   }, { l:61, s:4,  dur:9,  del:8   },
  { l:41, s:6,  dur:18, del:2.5 }, { l:93, s:8,  dur:11, del:1.5 },
];

function FloatingBubbles() {
  return (
    <>
      <style>{`
        @keyframes aqFloatUp {
          0%   { transform: translateY(110vh) scale(0.8); opacity: 0; }
          8%   { opacity: 0.55; }
          92%  { opacity: 0.25; }
          100% { transform: translateY(-8vh) scale(1.12); opacity: 0; }
        }
        @keyframes aqWobble {
          0%,100% { margin-left: 0; }
          33%     { margin-left: 9px; }
          66%     { margin-left: -9px; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {BUBBLES.map((b, i) => (
          <div key={i} style={{
            position:"absolute", left:`${b.l}%`, bottom:"-8%",
            width:b.s, height:b.s, borderRadius:"50%",
            background:"radial-gradient(circle at 35% 35%, rgba(0,220,255,0.5), rgba(0,180,220,0.08))",
            border:"1px solid rgba(0,220,255,0.22)",
            boxShadow:"0 0 6px rgba(0,200,255,0.18)",
            animation:`aqFloatUp ${b.dur}s ${b.del}s infinite linear, aqWobble ${b.dur*0.6}s ${b.del}s infinite ease-in-out`,
          }} />
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// ⑩ NOISE GRAIN OVERLAY
// ─────────────────────────────────────────────────
function NoiseGrain() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] mix-blend-overlay" style={{
      opacity: 0.032,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundRepeat: "repeat", backgroundSize: "180px 180px",
    }} />
  );
}

// ─────────────────────────────────────────────────
// ⑭ SCROLL PROGRESS BAR (native CSS)
// ─────────────────────────────────────────────────
function ScrollBar() {
  return (
    <>
      <style>{`
        @supports (animation-timeline: scroll()) {
          .aq-bar { transform-origin:left; animation:aqBar linear; animation-timeline:scroll(root); }
          @keyframes aqBar { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        }
      `}</style>
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-card/5 z-50">
        <div className="aq-bar h-full w-full" style={{
          background:"linear-gradient(90deg,#22d3ee,#7FFF00,#22d3ee)",
          boxShadow:"0 0 10px rgba(34,211,238,0.8)",
        }} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// ⑦ SVG WAVE DIVIDER
// ─────────────────────────────────────────────────
function Wave({ flip = false, color = "rgba(0,220,255,0.08)" }) {
  return (
    <div className="w-full overflow-hidden pointer-events-none" style={{ transform: flip ? "scaleY(-1)" : undefined, height: 56 }}>
      <svg viewBox="0 0 1200 56" preserveAspectRatio="none" className="w-full h-full">
        <path d="M0,28 C200,56 400,0 600,28 C800,56 1000,0 1200,28 L1200,56 L0,56 Z" fill={color} />
        <path d="M0,38 C300,8 600,56 900,28 C1050,14 1150,34 1200,38 L1200,56 L0,56 Z" fill={color} fillOpacity="0.5" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────
// ③ LIQUID GLASS CARD — Apple iOS26
// ─────────────────────────────────────────────────
function Glass({ children, className = "", glow = "rgba(0,220,255,0.14)" }: {
  children: React.ReactNode; className?: string; glow?: string;
}) {
  return (
    <div className={`relative rounded-3xl overflow-hidden ${className}`} style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.10) 100%)",
      backdropFilter: "blur(24px) saturate(180%) brightness(1.08)",
      WebkitBackdropFilter: "blur(24px) saturate(180%) brightness(1.08)",
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.15), 0 24px 64px rgba(0,0,0,0.45), 0 0 40px ${glow}`,
    }}>
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 40%, rgba(255,255,255,0.5) 60%, transparent)",
      }} />
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────
// ④ SCROLL VELOCITY WARP
// ─────────────────────────────────────────────────
function useScrollWarp() {
  const { scrollY } = useScroll();
  const vel = useVelocity(scrollY);
  const blur = useMotionValue(0);
  const scale = useMotionValue(1);
  useMotionValueEvent(vel, "change", (v) => {
    const a = Math.abs(v);
    blur.set(Math.min(a / 650, 2.8));
    scale.set(1 + Math.min(a / 14000, 0.014));
  });
  return { blur, scale };
}

// ─────────────────────────────────────────────────
// ⑤ PARALLAX SCENE — each image
// ─────────────────────────────────────────────────
function Scene({
  s, idx, onEnter, warpBlur,
}: {
  s: typeof SCENES[number]; idx: number;
  onEnter: (i: number) => void;
  warpBlur: import("framer-motion").MotionValue<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: "-35% 0px -35% 0px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const imgY     = useTransform(scrollYProgress, [0, 1], ["7%", "-7%"]);
  const imgScale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.96, 1.02, 1.02, 0.96]);
  const vignette = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.55, 0, 0, 0.55]);
  // ⑪ water fill clip-path rising with scroll
  const clip = useTransform(scrollYProgress, [0.1, 0.65], [100, 0]);
  const clipPath = useTransform(clip, (v) => `inset(${v}% 0% 0% 0% round 0px)`);
  const blurFilter = useTransform(warpBlur, (b) => `blur(${b}px)`);

  useEffect(() => {
    if (isInView) { onEnter(idx); tone(s.freq, 0.03, 0.28); }
  }, [isInView, idx, onEnter, s.freq]);

  return (
    <section ref={ref} className="relative w-full flex flex-col items-center">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6, delay: 0.1 }}
        className="w-full max-w-md mx-auto px-6 pt-14 pb-5 flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0" style={{
          background: `rgba(${s.rgb},0.25)`, border: `1px solid rgba(${s.rgb},0.5)`,
          color: `rgb(${s.rgb})`, boxShadow: `0 0 20px rgba(${s.rgb},0.28)`,
        }}>{s.step}</div>
        <span className="text-foreground dark:text-white/45 text-xs font-semibold tracking-[0.22em] uppercase">{s.label}</span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, rgba(${s.rgb},0.3))` }} />
      </motion.div>

      {/* Image */}
      <motion.div style={{ y: imgY, scale: imgScale, filter: blurFilter }} className="w-full max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl"
          style={{ boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 60px rgba(${s.rgb},0.08)` }}
        >
          {/* Vignette */}
          <motion.div style={{ opacity: vignette, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)" }}
            className="absolute inset-0 z-10 pointer-events-none"
          />
          {/* ⑪ Water fill */}
          <motion.div style={{ clipPath }} className="absolute inset-0 z-20 pointer-events-none">
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(${s.rgb},0.1), transparent)` }} />
          </motion.div>
          {/* Top glow */}
          <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none z-10"
            style={{ background: `linear-gradient(to bottom, rgba(${s.rgb},0.07), transparent)` }}
          />
          <img src={s.image} alt={s.label} className="w-full h-auto block" loading="lazy" decoding="async" />
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      {idx < 2 && (
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.9 }} className="flex flex-col items-center gap-0.5 mt-8 mb-2 text-foreground dark:text-white/15">
          {[0,1].map(i => (
            <motion.div key={i} animate={{ y:[0,5,0], opacity:[0.35,0.9,0.35] }}
              transition={{ duration:1.6, repeat:Infinity, delay:i*0.22, ease:"easeInOut" }}>
              <ChevronDown size={17} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────
// ⑥ BACTERIA STICKY ZONE — magnetic + lock
// ─────────────────────────────────────────────────
function BacteriaZone({ onComplete }: { onComplete: () => void }) {
  const [done, setDone]       = useState(false);
  const [near, setNear]       = useState(false);
  const [fail, setFail]       = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(stickyRef, { margin: "-18% 0px -18% 0px" });

  // ⑥ Magnetic spring
  const bScale  = useSpring(1,  { stiffness: 320, damping: 26 });
  const bRotate = useSpring(0,  { stiffness: 220, damping: 22 });

  // Scroll lock
  useEffect(() => {
    if (isInView && !done) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, [isInView, done]);

  // ⑨ Gyroscope
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const h = (e: DeviceOrientationEvent) => setTilt({
      x: Math.max(-8, Math.min(8, (e.gamma ?? 0) / 4)),
      y: Math.max(-8, Math.min(8, ((e.beta ?? 45) - 45) / 4)),
    });
    window.addEventListener("deviceorientation", h);
    return () => window.removeEventListener("deviceorientation", h);
  }, []);

  const drop = useCallback(() => {
    if (done) return;
    setDone(true);
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    playMagicSplash();
    vib([40, 80, 160, 80, 240]);
    if (!(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)) {
      confetti({
        particleCount: 320, spread: 140, startVelocity: 48,
        origin: { y: 0.44 },
        colors: ["#00ffea","#00ff88","#ffffff","#7FFF00","#0ea5e9"],
        shapes: ["circle"], scalar: 1.5, ticks: 380, gravity: 0.72,
      });
    }
    setTimeout(onComplete, 2800);
  }, [done, onComplete]);

  const s = SCENES[3];

  return (
    <section className="relative w-full">
      <div ref={stickyRef} className="sticky top-0 min-h-screen w-full flex flex-col items-center justify-start overflow-hidden">

        {/* Ambient pulse */}
        <AnimatePresence>
          {!done && (
            <motion.div key="p" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="absolute inset-0 pointer-events-none">
              <motion.div animate={{ scale:[1,1.1,1], opacity:[0.05,0.14,0.05] }}
                transition={{ duration:3.5, repeat:Infinity }}
                className="absolute inset-0 rounded-full blur-[130px]"
                style={{ background:`rgb(${s.rgb})` }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step badge */}
        <div className="w-full max-w-md mx-auto px-6 pt-14 pb-5 flex items-center gap-3 z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
            style={{ background:`rgba(${s.rgb},0.25)`, border:`1px solid rgba(${s.rgb},0.5)`, color:`rgb(${s.rgb})`, boxShadow:`0 0 20px rgba(${s.rgb},0.28)` }}>
            04
          </div>
          <span className="text-foreground dark:text-white/45 text-xs font-semibold tracking-[0.22em] uppercase">{s.label}</span>
          <div className="flex-1 h-px" style={{ background:`linear-gradient(to left, transparent, rgba(${s.rgb},0.3))` }} />
        </div>

        {/* Image with gyro parallax + drop target */}
        <div className="w-full max-w-md mx-auto px-4 z-10">
          <motion.div animate={{ x:tilt.x, y:tilt.y }} transition={{ type:"spring", stiffness:50, damping:20 }}
            className="relative rounded-3xl overflow-hidden"
            style={{ boxShadow:`0 32px 80px rgba(0,0,0,0.65), 0 0 60px rgba(${s.rgb},0.12)` }}>

            {/* Drop target ring */}
            <AnimatePresence>
              {!done && (
                <motion.div key="target" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0, scale:2 }}
                  className="absolute inset-x-0 top-[18%] flex justify-center z-20 pointer-events-none">
                  <motion.div
                    animate={{ scale:near?[1,1.35,1]:[1,1.1,1], opacity:near?[0.9,1,0.9]:[0.4,0.65,0.4] }}
                    transition={{ duration:near?0.45:2, repeat:Infinity }}
                    className="w-20 h-20 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor:`rgba(${s.rgb},${near?1:0.5})`,
                      background:`rgba(${s.rgb},${near?0.22:0.06})`,
                      boxShadow:`0 0 ${near?50:22}px rgba(${s.rgb},${near?0.7:0.25})`,
                    }}>
                    <Droplets size={22} style={{ color:`rgb(${s.rgb})`, opacity:near?1:0.6 }} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <img src={s.image} alt={s.label} className="w-full h-auto block" />
          </motion.div>
        </div>

        {/* Interaction */}
        <div className="w-full max-w-md mx-auto px-4 mt-6 pb-8 flex flex-col items-center z-10">
          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div key="drag" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.85 }}
                className="flex flex-col items-center gap-4 w-full">

                {/* Lock badge */}
                <motion.div animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:2.5, repeat:Infinity }}
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-widest uppercase"
                  style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)", color:"rgb(251,191,36)" }}>
                  <Lock size={11} />
                  <span>التمرير محجوب — أكمل التفاعل</span>
                </motion.div>

                {/* Instruction — Liquid Glass */}
                <Glass className="px-5 py-3" glow={`rgba(${s.rgb},0.22)`}>
                  <div className="flex items-center gap-2.5 text-cyan-200 font-bold text-sm">
                    <motion.div animate={{ rotate:[0,18,-18,0] }} transition={{ duration:2.2, repeat:Infinity, delay:0.4 }}>
                      <Sparkles size={15} className="text-cyan-400" />
                    </motion.div>
                    <span>اسحب العلبة للأعلى وارميها بالماي!</span>
                  </div>
                </Glass>

                {/* ⑥ Magnetic Bottle */}
                <motion.div
                  drag
                  dragConstraints={{ top:-440, left:-110, right:110, bottom:10 }}
                  dragElastic={0.62}
                  style={{ 
                    scale:bScale, rotate:bRotate, touchAction:"none",
                    background:`linear-gradient(135deg, rgba(${s.rgb},0.5), rgba(${s.rgb},0.18), rgba(0,0,0,0.3))`,
                    backdropFilter:"blur(20px) saturate(200%)",
                    WebkitBackdropFilter:"blur(20px) saturate(200%)",
                    border:`2px solid rgba(${s.rgb},0.65)`,
                    boxShadow:`0 0 ${near?70:50}px rgba(${s.rgb},${near?0.95:0.55}), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.2)`,
                  }}
                  whileDrag={{ rotate:-15 }}
                  animate={fail ? { x:[-9,9,-9,9,0] } : {}}
                  onDrag={(_: any, info: any) => {
                    const isNear = info.offset.y < -65 && Math.abs(info.offset.x) < 85;
                    setNear(isNear);
                    bScale.set(isNear ? 1.2 : 1);
                  }}
                  onDragEnd={(_: any, info: any) => {
                    if (info.offset.y < -95 || near) { drop(); }
                    else { setFail(true); vib([30, 55]); setTimeout(() => setFail(false), 700); }
                  }}
                  className="w-28 h-28 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing rounded-[28px] select-none"
                >
                  <motion.span className="text-5xl"
                    animate={{ y:[0,-4,0] }} transition={{ duration:1.9, repeat:Infinity, ease:"easeInOut" }}
                    style={{ filter:"drop-shadow(0 0 14px rgba(0,255,234,0.9))" }}>
                    🧪
                  </motion.span>
                  <span className="text-[10px] font-black mt-1.5 tracking-[0.22em] uppercase"
                    style={{ color:`rgb(${s.rgb})` }}>
                    بكتيريا
                  </span>
                </motion.div>

                {/* Up arrows hint */}
                <motion.div animate={{ y:[0,-5,0], opacity:[0.25,0.75,0.25] }}
                  transition={{ duration:1.4, repeat:Infinity }}
                  className="flex flex-col items-center gap-1 text-foreground dark:text-white/25">
                  {[0,1].map(i => (
                    <ChevronDown key={i} size={13} style={{ transform:"rotate(180deg)", marginTop:i?-8:0, opacity:i?0.5:1 }} />
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              /* SUCCESS */
              <motion.div key="ok"
                initial={{ scale:0.4, opacity:0, filter:"blur(20px)" }}
                animate={{ scale:1, opacity:1, filter:"blur(0px)" }}
                transition={{ type:"spring", stiffness:280, damping:22 }}>
                <Glass className="px-8 py-7" glow="rgba(34,197,94,0.32)">
                  <div className="flex flex-col items-center text-center">
                    <motion.div animate={{ scale:[1,1.15,1], rotate:[0,8,-8,0] }}
                      transition={{ duration:0.7, delay:0.2 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.4)", boxShadow:"0 0 40px rgba(34,197,94,0.3)" }}>
                      <CheckCircle2 size={34} className="text-green-400" />
                    </motion.div>
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-cyan-300">
                      الماي صار حي! 🌊
                    </h3>
                    <p className="text-sm text-muted-foreground dark:text-gray-300 mt-2 font-medium leading-relaxed">النظام البيولوجي يعمل الآن</p>
                    <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.9 }}
                      className="text-xs mt-1.5 font-medium" style={{ color:`rgba(${SCENES[4].rgb},0.8)` }}>
                      يتم فتح الخطوة الأخيرة…
                    </motion.p>
                  </div>
                </Glass>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────
// FINAL SCENE
// ─────────────────────────────────────────────────
function FinalScene() {
  const ref = useRef<HTMLDivElement>(null);
  const ok  = useInView(ref, { once: true, margin: "-80px" });
  const s   = SCENES[4];

  const fadeUp = (i: number) => ({
    initial: { opacity:0, y:40, filter:"blur(8px)" },
    animate: ok ? { opacity:1, y:0, filter:"blur(0px)" } : {},
    transition: { duration:0.75, delay: i*0.14, ease:[0.16,1,0.3,1] as any },
  });

  return (
    <section ref={ref} className="relative w-full flex flex-col items-center">
      {/* Badge */}
      <motion.div {...fadeUp(0)} className="w-full max-w-md mx-auto px-6 pt-14 pb-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
          style={{ background:`rgba(${s.rgb},0.25)`, border:`1px solid rgba(${s.rgb},0.5)`, color:`rgb(${s.rgb})`, boxShadow:`0 0 20px rgba(${s.rgb},0.28)` }}>
          05
        </div>
        <span className="text-foreground dark:text-white/45 text-xs font-semibold tracking-[0.22em] uppercase">{s.label}</span>
        <div className="flex-1 h-px" style={{ background:`linear-gradient(to left, transparent, rgba(${s.rgb},0.3))` }} />
      </motion.div>

      {/* Image */}
      <motion.div {...fadeUp(1)} className="w-full max-w-md mx-auto px-4">
        <div className="relative rounded-3xl overflow-hidden"
          style={{ boxShadow:`0 32px 80px rgba(0,0,0,0.65), 0 0 80px rgba(${s.rgb},0.12)` }}>
          <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none z-10"
            style={{ background:`linear-gradient(to bottom, rgba(${s.rgb},0.08), transparent)` }} />
          <img src={s.image} alt={s.label} className="w-full h-auto block" />
        </div>
      </motion.div>

      {/* CTAs */}
      <div className="w-full max-w-md mx-auto px-4 mt-8 pb-20 space-y-3">
        {/* Congrats */}
        <motion.div {...fadeUp(2)}>
          <Glass className="px-6 py-6 text-center" glow={`rgba(${s.rgb},0.2)`}>
            <motion.div animate={{ backgroundPosition:["0%","100%","0%"] }}
              transition={{ duration:4, repeat:Infinity, ease:"linear" }}
              className="text-3xl font-black text-transparent bg-clip-text mb-2"
              style={{
                backgroundImage:`linear-gradient(135deg, rgb(${SCENES[3].rgb}), rgb(${s.rgb}), rgb(${SCENES[3].rgb}))`,
                backgroundSize:"200%",
              }}>
              مبروك! حوضك جاهز 🎉
            </motion.div>
            <p className="text-sm text-muted-foreground dark:text-gray-400 font-medium">حوضك الآن يعيش — تسوق الباقي من AQUAVO</p>
          </Glass>
        </motion.div>

        {/* Shop */}
        <motion.div {...fadeUp(3)}>
          <Link href="/">
            <button onClick={() => { vib(20); playBubble(); }}
              className="w-full font-black py-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] text-[15px] text-foreground dark:text-white"
              style={{
                background:`linear-gradient(135deg, rgba(${SCENES[3].rgb},0.9), rgba(${s.rgb},0.7))`,
                boxShadow:`0 0 50px rgba(${SCENES[3].rgb},0.35), inset 0 1px 0 rgba(255,255,255,0.2)`,
                border:`1px solid rgba(${SCENES[3].rgb},0.5)`,
              }}>
              <ShoppingBag size={21} />
              <span>تسوق مستهلكات الحوض</span>
            </button>
          </Link>
        </motion.div>

        {/* WhatsApp */}
        <motion.div {...fadeUp(4)}>
          <button onClick={() => { vib(20); playBubble(); window.open(WHATSAPP_URL,"_blank"); }}
            className="w-full font-bold py-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] text-[15px] text-foreground dark:text-white"
            style={{
              background:"rgba(255,255,255,0.05)", backdropFilter:"blur(20px)",
              border:"1px solid rgba(255,255,255,0.12)",
              boxShadow:"inset 0 1px 0 rgba(255,255,255,0.1)",
            }}>
            <PhoneCall size={21} className="text-green-400" />
            <span>تواصل مع الخبراء</span>
          </button>
        </motion.div>

        <motion.p {...fadeUp(5)}
          className="text-center text-foreground dark:text-white/12 text-xs pt-3 font-medium tracking-widest uppercase">
          AQUAVO — أول تجربة حوض بالذكاء الاصطناعي في العراق
        </motion.p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-[52vh] flex flex-col items-center justify-center px-6 pt-16 pb-6 overflow-hidden">
      {/* SVG Water Wave — ⑦ animated */}
      <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden pointer-events-none opacity-20">
        <motion.svg viewBox="0 0 1200 60" className="w-full h-full" preserveAspectRatio="none">
          <motion.path fill="rgba(0,220,255,0.5)"
            animate={{ d:[
              "M0,30 C150,60 350,0 500,30 C650,60 850,0 1000,30 C1100,50 1150,20 1200,30 L1200,60 L0,60 Z",
              "M0,40 C200,10 400,60 600,32 C800,8 1000,55 1200,24 L1200,60 L0,60 Z",
              "M0,30 C150,60 350,0 500,30 C650,60 850,0 1000,30 C1100,50 1150,20 1200,30 L1200,60 L0,60 Z",
            ] }}
            transition={{ duration:5.5, repeat:Infinity, ease:"easeInOut" }}
          />
        </motion.svg>
      </div>

      <motion.div initial={{ opacity:0, y:32 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:1, ease:[0.16,1,0.3,1] }} className="text-center relative z-10">

        {/* Tag */}
        <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}
          transition={{ duration:0.6, delay:0.2 }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7"
          style={{ background:"rgba(0,220,255,0.1)", border:"1px solid rgba(0,220,255,0.25)", backdropFilter:"blur(12px)" }}>
          <motion.span animate={{ scale:[1,1.4,1], opacity:[0.6,1,0.6] }}
            transition={{ duration:2, repeat:Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
            style={{ boxShadow:"0 0 8px rgba(0,220,255,0.9)" }} />
          <span className="text-cyan-300 text-xs font-bold tracking-widest uppercase">دليل المبتدئين</span>
          <span className="text-cyan-300/35 text-xs">· AQUAVO 2026</span>
        </motion.div>

        <h1 className="text-4xl font-black text-foreground dark:text-white mb-3 leading-[1.1] tracking-tight">
          من{" "}
          <span className="relative inline-block">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-cyan-400">الصفر</span>
            <motion.div className="absolute -bottom-1 left-0 right-0 h-[2.5px] rounded-full bg-cyan-400"
              initial={{ scaleX:0 }} animate={{ scaleX:1 }}
              transition={{ duration:0.8, delay:0.75 }} style={{ originX:0, boxShadow:"0 0 8px rgba(0,220,255,0.7)" }} />
          </span>
          {" "}لحوض{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7FFF00] to-cyan-300">يحيا</span>
        </h1>

        <p className="text-muted-foreground dark:text-gray-400 text-sm font-medium max-w-[255px] mx-auto leading-relaxed">
          5 خطوات تفاعلية — نزّل للأسفل واتبع الرحلة
        </p>
      </motion.div>

      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.5 }}
        className="mt-12 flex flex-col items-center gap-1.5 text-foreground dark:text-white/20 relative z-10">
        <span className="text-[10px] tracking-widest uppercase font-semibold">نزّل للبدء</span>
        <motion.div animate={{ y:[0,8,0] }} transition={{ duration:1.9, repeat:Infinity, ease:"easeInOut" }}>
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────
export default function BeginnerGuide() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [bacteriaDone, setBacteriaDone] = useState(false);
  const { blur: warpBlur, scale: warpScale } = useScrollWarp();

  const onEnter = useCallback((i: number) => setActiveIdx(i), []);

  useEffect(() => () => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }, []);

  return (
    <>
      {/* ─── SEO / GEO / AEO 2026 ─── */}
      <MetaTags
        title="دليل المبتدئين — كيف تبدأ حوض أسماك من الصفر"
        description="دليل خطوة بخطوة لإعداد حوض أسماك احترافي من الصفر — 5 خطوات تفاعلية: اختيار الحوض، التجهيز المائي، الديكور، البكتيريا، والتشغيل. من AQUAVO العراق."
        keywords={["كيفية إعداد حوض أسماك", "دليل المبتدئين", "حوض أسماك للمبتدئين", "تجهيز حوض أسماك", "AQUAVO", "أحواض أسماك العراق"]}
        url="https://www.aquavoiq.com/beginner-guide"
        canonicalUrl="https://www.aquavoiq.com/beginner-guide"
      />
    <div className="relative bg-card dark:bg-[#0B1E28] text-foreground dark:text-white min-h-screen w-full" dir="rtl">
      {/* Layers */}
      <AmbientBg idx={activeIdx} />
      <FloatingBubbles />
      <NoiseGrain />
      <ScrollBar />

      {/* Main column */}
      <motion.div style={{ scale: warpScale }} className="mx-auto max-w-md w-full relative z-10 md:border-x md:border-white/5">
        <Hero />
        <Wave color={`rgba(${SCENES[0].rgb},0.1)`} />

        {/* Scenes 1-3 */}
        {SCENES.slice(0, 3).map((s, i) => (
          <Scene key={s.id} s={s} idx={i} onEnter={onEnter} warpBlur={warpBlur} />
        ))}

        <Wave color={`rgba(${SCENES[3].rgb},0.12)`} flip />

        {/* Bacteria zone */}
        <BacteriaZone onComplete={() => { setBacteriaDone(true); setActiveIdx(4); }} />

        {/* Final — only after bacteria */}
        <AnimatePresence>
          {bacteriaDone && (
            <motion.div
              initial={{ opacity:0, y:80 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:1, ease:[0.16,1,0.3,1] }}>
              <Wave color={`rgba(${SCENES[4].rgb},0.14)`} />
              <FinalScene />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    </>
  );
}
