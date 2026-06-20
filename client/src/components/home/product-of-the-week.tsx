import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ArrowRight } from "lucide-react";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { formatPrice } from "@/lib/format";

interface ProductOfTheWeekProps {
  product: Product;
}

export function ProductOfTheWeek({ product }: ProductOfTheWeekProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const isInStock = product.stock !== undefined && product.stock > 0;

  const handleAddToCart = async () => {
    if (!isInStock) {
      toast({
        title: "غير متوفر",
        description: "عذراً، هذا المنتج غير متوفر حالياً في المخزن",
        variant: "destructive",
      });
      return;
    }
    const ok = await addItem(product);
    if (!ok) return;
    toast({
      title: "تمت الإضافة للسلة ✓",
      description: `تم إضافة ${product.name} إلى سلة المشتريات`,
    });
  };
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background with subtle pattern/gradient */}
      <div className="absolute inset-0 bg-primary/5 -skew-y-2 scale-110 z-0" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Image Section with Effects */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-1/2 relative group perspective-1000"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl -rotate-3 scale-95 group-hover:rotate-0 transition-transform duration-700 ease-out blur-xl opacity-50" />
            <div className="relative w-full aspect-square rounded-3xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 group-hover:shadow-primary/20 transition-all duration-500">
              <img
                src={product.thumbnail || product.image || product.images?.[0] || '/placeholder-product.svg'}
                alt={product.name}
                className="w-full h-full object-contain p-8 transform transition-transform duration-700 hover:scale-110"
                loading="eager"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== "/placeholder-product.svg") {
                    target.src = "/placeholder-product.svg";
                  }
                }}
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl animate-float hidden md:block">
              <div className="flex items-center gap-2">
                <span className={`flex h-3 w-3 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm font-bold">{isInStock ? 'متوفر في المخزن' : 'غير متوفر'}</span>
              </div>
            </div>
          </motion.div>

          {/* Content Section */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full lg:w-1/2 space-y-8"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-bold rounded-full uppercase tracking-wider shadow-lg shadow-primary/20 animate-pulse-glow">
                <Star className="w-4 h-4 fill-current" />
                منتج الأسبوع
              </div>

              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
                {product.name}
              </h2>

              <div className="flex items-center gap-4 flex-wrap">
                {product.reviewCount > 0 && (
                <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-lg">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-foreground font-bold">{product.rating}</span>
                  <span className="text-muted-foreground text-sm">({product.reviewCount} تقييم)</span>
                </div>
                )}
                {product.difficulty && <DifficultyBadge level={product.difficulty} />}
              </div>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed border-l-4 border-primary/30 pl-4">
              {product.specs}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <div className="flex flex-col">
                <span className="text-4xl font-bold text-primary">{product.price > 0 ? formatPrice(product.price) : "قريباً"}</span>
              </div>

              <div className="flex-1 w-full sm:w-auto flex gap-3">
                {isInStock ? (
                  <Button size="lg" className="flex-1 h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1" onClick={handleAddToCart}>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    أضف إلى العربة
                  </Button>
                ) : (
                  <Button size="lg" variant="destructive" className="flex-1 h-14 text-lg font-bold" disabled>
                    غير متوفر في المخزن
                  </Button>
                )}
                <Link href={`/products/${product.slug}`}>
                  <Button size="lg" variant="outline" className="h-14 px-6 border-2">
                    تفاصيل <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
