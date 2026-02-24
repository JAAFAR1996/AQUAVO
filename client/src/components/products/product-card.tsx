import { useState, memo } from "react";
import { Product } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { Heart, ShoppingCart, Leaf, Eye } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/cart-context";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { CompareButton } from "@/components/products/product-comparison";
import { Link } from "wouter";
import { useABTest, EXPERIMENTS, trackABConversion } from "@/lib/ab-testing";
import { ShrimpMascot } from "@/components/gamification/shrimp-mascot";
import { formatNumber } from "@/lib/format";
import { cardImage } from "@/lib/cloudinary";

interface ProductCardProps {
  product: Product;
  onCompare?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  /** Pass true for above-the-fold cards (first ~8) to load eagerly */
  priority?: boolean;
}

export const ProductCard = memo(function ProductCard({ product, onCompare, onQuickView, priority = false }: ProductCardProps) {
  const { toast } = useToast();
  const { addItem } = useCart();
  const [imgLoaded, setImgLoaded] = useState(false);

  // A/B Testing: Button Text
  const buttonVariant = useABTest(EXPERIMENTS.ADD_TO_CART_BUTTON.name);
  const buttonText = buttonVariant === 'A'
    ? EXPERIMENTS.ADD_TO_CART_BUTTON.variants.A
    : EXPERIMENTS.ADD_TO_CART_BUTTON.variants.B;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);

    // Track A/B Conversion
    trackABConversion(EXPERIMENTS.ADD_TO_CART_BUTTON.name, 'added_to_cart');
    toast({
      title: "عاشت ايدك! �",
      description: (
        <div className="flex items-center gap-3">
          <ShrimpMascot mood="drinking" size="lg" className="w-20 h-20 animate-bounce" />
          <span>خيار رهيب! انضاف {product.name} للسلة، بالعافية عليك.</span>
        </div>
      ),
    });
  };

  return (
    <>
      <Link href={`/products/${product.slug}`} aria-label={`عرض تفاصيل ${product.name}`}>
        <Card className="group overflow-hidden rounded-xl sm:rounded-[2rem] border border-border bg-card/50 backdrop-blur-xl hover:border-primary/50 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_0_30px_rgba(79,209,197,0.15)] hover:-translate-y-2 h-full flex flex-col relative cursor-pointer text-right gpu-accelerate">
          {/* Badges */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex flex-col gap-1 sm:gap-2 pointer-events-none" aria-hidden="true">
            {product.isNew && <Badge className="bg-primary text-primary-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-lg">جديد</Badge>}
            {product.isBestSeller && <Badge className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg animate-in fade-in duration-500 delay-100">الأكثر مبيعاً</Badge>}
            {product.ecoFriendly && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 gap-1 shadow-lg animate-in fade-in duration-500 delay-200">
                <Leaf className="w-3 h-3" aria-hidden="true" /> صديق للبيئة
              </Badge>
            )}
          </div>

          {/* Image */}
          <div className="relative pt-[100%] overflow-hidden" data-protected="true">
            <div className="absolute inset-0 p-3 sm:p-6 flex items-center justify-center bg-transparent">
              {/* Skeleton placeholder shown while image is loading */}
              {!imgLoaded && (
                <div className="absolute inset-0 rounded-t-xl animate-pulse bg-muted/60" />
              )}
              <div className="transition-transform duration-500 group-hover:scale-105 relative z-10">
                <img
                  src={cardImage(product.thumbnail || product.image) || "/logo_aquavo.png"}
                  alt={`صورة منتج ${product.name} من ${product.brand}`}
                  className={`w-full h-full object-contain filter drop-shadow-2xl select-none transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  loading={priority ? "eager" : "lazy"}
                  fetchPriority={priority ? "high" : "auto"}
                  width={400}
                  height={400}
                  decoding="async"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onLoad={() => setImgLoaded(true)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.endsWith("/logo_aquavo.png")) {
                      target.src = "/logo_aquavo.png";
                    }
                    setImgLoaded(true);
                  }}
                />
              </div>
            </div>

            {/* Quick Actions Overlay - Hidden on mobile */}
            <div
              className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden sm:flex justify-center gap-2 z-20"
              role="group"
              aria-label="إجراءات سريعة"
            >
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full shadow-md micro-bounce"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickView?.(product);
                }}
                aria-label={`نظرة سريعة على ${product.name}`}
              >
                <Eye className="w-4 h-4 ml-1" aria-hidden="true" />
                نظرة سريعة
              </Button>
              <CompareButton
                productId={product.id}
                variant="full"
                className="rounded-full shadow-md micro-bounce"
              />
              <WishlistButton
                product={product}
                variant="icon"
                size="icon"
                className="shadow-md"
              />
            </div>
          </div>

          <CardHeader className="p-2 sm:pb-2 sm:p-4 text-right">
            <div className="flex justify-between items-start gap-1 sm:gap-2 flex-row-reverse">
              <div className="text-[10px] sm:text-sm text-muted-foreground truncate">{product.brand}</div>
              <DifficultyBadge level={product.difficulty} className="scale-75 sm:scale-90 origin-right" />
            </div>
            <h3 className="font-semibold text-xs sm:text-sm leading-tight transition-colors line-clamp-2 h-8 sm:h-10 hover:text-primary text-right">
              {product.name}
            </h3>
          </CardHeader>

          <CardContent className="flex-1 p-2 sm:p-4 pt-0">
            <div className="flex items-baseline gap-1 sm:gap-2 mb-1 sm:mb-2 flex-row-reverse justify-end">
              {Number(product.price) === 0 ? (
                <span className="text-base sm:text-xl font-bold text-purple-500">
                  قريباً جداً ✨
                </span>
              ) : (
                <>
                  <span className="text-base sm:text-xl font-bold text-primary">
                    {formatNumber(product.price)} <span className="text-[10px] sm:text-sm font-normal text-muted-foreground">د.ع</span>
                  </span>
                  {product.originalPrice && (
                    <span className="text-[10px] sm:text-sm text-muted-foreground line-through" aria-label="السعر السابق">
                      {formatNumber(product.originalPrice)}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm text-amber-500 justify-end" aria-label={`التقييم: ${product.rating} من 5 نجوم`}>
              <span aria-hidden="true">★</span>
              <span className="font-medium text-foreground">{product.rating}</span>
              <span className="text-muted-foreground">({product.reviewCount})</span>
            </div>
          </CardContent>

          <CardFooter className="p-2 sm:p-4 pt-0">
            <Button
              className="w-full gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
              onClick={handleAddToCart}
              aria-label={`أضف ${product.name} إلى سلة المشتريات`}
              disabled={(product.stock ?? 0) <= 0}
            >
              {(product.stock ?? 0) > 0 ? (
                <>
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                  {buttonText}
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 opacity-50" aria-hidden="true" />
                  نفذت الكمية
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </Link>
    </>
  );
});
