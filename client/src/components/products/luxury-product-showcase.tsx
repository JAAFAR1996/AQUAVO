import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface LuxuryProductShowcaseProps {
  product: Product;
}

export function LuxuryProductShowcase({ product }: LuxuryProductShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);

  return (
    <section ref={containerRef} className="min-h-screen flex items-center justify-center relative overflow-hidden py-24">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

      <div className="container relative z-10 grid lg:grid-cols-2 gap-16 items-center">
        {/* Text Content */}
        <motion.div
          style={{ opacity, x: useTransform(scrollYProgress, [0, 1], [-50, 50]) }}
          className="space-y-8"
        >
          <div className="inline-block border border-primary/30 rounded-full px-4 py-1 text-sm uppercase tracking-[0.2em] text-primary">
            Featured Collection
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none">
            {product.brand} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              {product.name.split(" ")[0]}
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
            تجربة استثنائية تجمع بين التصميم الفاخر والأداء الفائق. صمم ليكون تحفة فنية في منزلك.
          </p>

          <div className="flex items-center gap-6 pt-4">
            <Button size="lg" className="rounded-full px-8 h-14 text-lg">
              اكتشف المزيد
            </Button>
            <Button variant="outline" size="icon" className="rounded-full w-14 h-14 border-2" aria-label="التالي">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </div>
        </motion.div>

        {/* Product Image */}
        <motion.div style={{ y, scale, opacity }} className="relative">
          <div className="aspect-square relative z-10">
            <img
              src={product.thumbnail}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>

          {/* Floating Specs */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute -right-12 top-1/4 bg-card/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl max-w-[200px]"
          >
            <div className="text-3xl font-bold text-primary mb-1">{product.rating}</div>
            <div className="text-sm text-muted-foreground">تقييم المستخدمين</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="absolute -left-12 bottom-1/4 bg-card/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl max-w-[200px]"
          >
            <div className="text-3xl font-bold text-primary mb-1">{Number(product.price).toLocaleString('en-US')}</div>
            <div className="text-sm text-muted-foreground">دينار عراقي</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
