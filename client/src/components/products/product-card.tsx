import { useState, memo } from "react";
import { Product } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { Heart, ShoppingCart, Leaf } from "lucide-react";
import { UnderwaterGlowImage } from "@/components/effects/underwater-glow-image";
import { FishSwimToCart } from "@/components/cart/fish-swim-to-cart";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/cart-context";
import { Link } from "wouter";

interface ProductCardProps {
  product: Product;
  onCompare?: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({ product, onCompare }: ProductCardProps) {
  const [triggerFish, setTriggerFish] = useState(false);
  const { toast } = useToast();
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking the button inside the link
    e.stopPropagation();
    addItem(product);
    setTriggerFish(true);
    toast({
      title: "تمت الإضافة للسلة ✓",
      description: `تم إضافة ${product.name} إلى سلة المشتريات`,
    });
  };

  return (
    <>
      <FishSwimToCart trigger={triggerFish} onComplete={() => setTriggerFish(false)} />
      <Link href={`/products/${product.slug}`}>
        <Card className="group overflow-hidden border-muted hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 bg-card h-full flex flex-col relative cursor-pointer">
          {/* Badges */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 pointer-events-none">
            {product.isNew && <Badge className="bg-blue-500 hover:bg-blue-600 shadow-lg">جديد</Badge>}
            {product.isBestSeller && <Badge className="bg-amber-500 hover:bg-amber-600 shadow-lg">الأكثر مبيعاً</Badge>}
            {product.ecoFriendly && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 gap-1 shadow-lg">
                <Leaf className="w-3 h-3" /> صديق للبيئة
              </Badge>
            )}
          </div>

          {/* Image */}
          <div className="relative pt-[100%] bg-muted/20 overflow-hidden">
            <UnderwaterGlowImage
              src={product.image}
              alt={`صورة منتج ${product.name} من ${product.brand}`}
              className="absolute inset-0 w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-110 mix-blend-multiply dark:mix-blend-normal"
            />

            {/* Quick Actions Overlay */}
            <div
              className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-center gap-2 z-20"
              role="group"
              aria-label="إجراءات سريعة"
            >
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full shadow-md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCompare?.(product);
                }}
                aria-label={`إضافة ${product.name} للمقارنة`}
              >
                مقارنة
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 shadow-md"
                 onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Add to wishlist logic here
                }}
                aria-label={`إضافة ${product.name} للمفضلة`}
              >
                <Heart className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <CardHeader className="pb-2">
            <div className="flex justify-between items-start gap-2">
              <div className="text-sm text-muted-foreground">{product.brand}</div>
              <DifficultyBadge level={product.difficulty} className="scale-90 origin-left" />
            </div>
            <h3 className="font-bold text-lg leading-tight transition-colors line-clamp-2 h-14 hover:text-primary">
              {product.name}
            </h3>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-bold text-primary">
                {product.price.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">د.ع</span>
              </span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
            <div
              className="flex items-center gap-1 text-sm text-amber-500"
              role="group"
              aria-label={`التقييم ${product.rating} من 5 بناءً على ${product.reviewCount} تقييم`}
            >
              <span aria-hidden="true">★</span>
              <span className="font-medium text-foreground">{product.rating}</span>
              <span className="text-muted-foreground">({product.reviewCount})</span>
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            <Button
              className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
              onClick={handleAddToCart}
              aria-label={`إضافة ${product.name} إلى سلة المشتريات بسعر ${product.price.toLocaleString()} دينار عراقي`}
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              أضف للسلة
            </Button>
          </CardFooter>
        </Card>
      </Link>
    </>
  );
});
