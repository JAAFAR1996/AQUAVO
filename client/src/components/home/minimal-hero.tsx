import { useScroll, useTransform, motion, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { UnderwaterAmbiance } from "@/components/effects/underwater-ambiance";

interface MinimalHeroProps {
  title: string;
  subtitle: string;
  image: string;
  onCtaClick?: () => void;
}

const WORD_VARIANTS = {
  hidden: { y: "110%" },
  visible: (i: number) => ({
    y: "0%",
    transition: { duration: 0.9, delay: 0.15 + i * 0.09, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function MinimalHero({ title, subtitle, image, onCtaClick }: MinimalHeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "55%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  // Magnetic CTA — button drifts slightly toward the cursor
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 15 });
  const sy = useSpring(my, { stiffness: 200, damping: 15 });

  const handleMagnet = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  };
  const resetMagnet = () => {
    mx.set(0);
    my.set(0);
  };

  const words = title.split(" ");

  return (
    <div ref={ref} className="relative h-[92vh] overflow-hidden bg-[#0a1628] flex items-center justify-center">
      {/* Background image with parallax */}
      <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
        <OptimizedImage src={image} alt="" className="w-full h-full" priority objectFit="cover" />
        {/* Deep-ocean gradient so the caustics + text always read */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/70 via-[#0a1628]/45 to-[#0a1628]/85" />
      </motion.div>

      {/* Signature: living underwater light */}
      <div className="absolute inset-0 z-[5]">
        <UnderwaterAmbiance intensity="full" bubbles={18} />
      </div>

      {/* Content */}
      <motion.div
        style={{ y: contentY }}
        className="relative z-20 text-center text-white space-y-8 px-4 max-w-4xl mx-auto"
      >
        <h1 className="text-6xl md:text-9xl font-bold tracking-tighter leading-[0.95]">
          {words.map((word, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span
                custom={i}
                variants={WORD_VARIANTS}
                initial="hidden"
                animate="visible"
                className="inline-block"
              >
                {word}
              </motion.span>
              {i < words.length - 1 && " "}
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 0.92, y: 0 }}
          transition={{ delay: 0.15 + words.length * 0.09 + 0.1, duration: 0.8 }}
          className="text-xl md:text-2xl font-light max-w-2xl mx-auto"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + words.length * 0.09 + 0.3, duration: 0.5 }}
        >
          <motion.button
            onClick={onCtaClick}
            onMouseMove={handleMagnet}
            onMouseLeave={resetMagnet}
            style={{ x: sx, y: sy }}
            whileTap={{ scale: 0.96 }}
            className="group relative overflow-hidden rounded-full bg-white px-9 py-4 text-lg font-bold text-[#0a1628] shadow-2xl shadow-[#199bb8]/30 transition-shadow hover:shadow-[#199bb8]/60"
          >
            <span className="relative z-10">ابدأ رحلتك</span>
            {/* Shimmer sweep on hover */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#199bb8]/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 text-white/50"
      >
        <div className="flex h-10 w-6 justify-center rounded-full border-2 border-current p-1">
          <div className="h-2 w-1 rounded-full bg-current" />
        </div>
      </motion.div>
    </div>
  );
}
