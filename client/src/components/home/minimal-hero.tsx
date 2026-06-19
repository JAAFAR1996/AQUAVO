import { useScroll, useTransform, motion } from "framer-motion";
import { useRef } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface MinimalHeroProps {
  title: string;
  subtitle: string;
  image: string;
  onCtaClick?: () => void;
}

export function MinimalHero({ title, subtitle, image, onCtaClick }: MinimalHeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <div ref={ref} className="relative h-[90vh] overflow-hidden bg-background flex items-center justify-center">
      {/* Background Image with Parallax */}
      <motion.div
        style={{ y, opacity }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-black/20 z-10" />
        <OptimizedImage
          src={image}
          alt="Hero"
          className="w-full h-full"
          priority={true}
          objectFit="cover"
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-20 text-center text-white space-y-8 px-4 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-6xl md:text-9xl font-bold tracking-tighter"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-xl md:text-2xl font-light opacity-90 max-w-2xl mx-auto"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <button
            onClick={onCtaClick}
            className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-white/90 transition-colors shadow-2xl hover:shadow-white/20"
          >
            ابدأ رحلتك
          </button>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50"
      >
        <div className="w-6 h-10 border-2 border-current rounded-full flex justify-center p-1">
          <div className="w-1 h-2 bg-current rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}
