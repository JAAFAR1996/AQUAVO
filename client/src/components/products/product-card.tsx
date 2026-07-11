import { memo, useState, type MouseEvent } from "react";
import { Eye, Leaf, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";

import { CompareButton } from "@/components/products/product-comparison";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { cardImage } from "@/lib/cloudinary";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  onCompare?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  /** Pass true for above-the-fold cards to load eagerly. */
  priority?: boolean;
}

export const ProductCard = memo(function ProductCard({
  product,
  onQuickView,
  priority = false,
}: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [imgLoaded, setImgLoaded] = useState(false);

  const variantPrices = product.hasVariants && product.variants?.length
    ? product.variants.map((variant) => variant.price).filter((price) => price > 0)
    : [];
  const variantMinPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : undefined;
  const hasPrice = (product.price ?? 0) > 0 || variantMinPrice !== undefined;
  const requiresVariantChoice = Boolean(product.hasVariants && product.variants?.length);
  const isOutOfStock = requiresVariantChoice
    ? product.variants?.every((variant) => (variant.stock ?? 0) <= 0) ?? true
    : (product.stock ?? 0) <= 0;

  const handleAddToCart = async (event: MouseEvent<HTMLButtonElement>) => {
    if (requiresVariantChoice) {
      setLocation(`/products/${product.slug}`);
      return;
    }

    const added = await addItem(product);
    if (!added) return;

    toast({
      title: "تمت الإضافة",
      description: `${product.name} انضاف للسلة.`,
    });
  };

  const imageSrc = cardImage(product.thumbnail || product.image) || "/brand/aquavo-v2-icon.svg";

  return (
    <Card className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/60 text-right transition-colors hover:border-primary/50">
      <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
        <div className="pointer-events-auto flex gap-1.5">
          <CompareButton
            productId={product.id}
            variant="icon"
            className="h-9 w-9 border border-border/70 bg-background/90 shadow-sm backdrop-blur-sm"
          />
          <WishlistButton
            product={product}
            variant="icon"
            size="icon"
            className="h-9 w-9 border border-border/70 bg-background/90 shadow-sm backdrop-blur-sm"
          />
          {onQuickView ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="hidden h-9 w-9 border-border/70 bg-background/90 shadow-sm backdrop-blur-sm sm:inline-flex"
              onClick={() => onQuickView(product)}
              aria-label={`نظرة سريعة على ${product.name}`}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1" aria-hidden="true">
          {product.isNew ? <Badge className="bg-primary text-primary-foreground">جديد</Badge> : null}
          {product.isBestSeller ? <Badge variant="secondary">الأكثر مبيعاً</Badge> : null}
          {product.ecoFriendly ? (
            <Badge variant="outline" className="gap-1 border-primary/25 bg-background/90 text-primary">
              <Leaf className="h-3 w-3" />
              صديق للبيئة
            </Badge>
          ) : null}
        </div>
      </div>

      <Link
        href={`/products/${product.slug}`}
        aria-label={`عرض تفاصيل ${product.name}`}
        className="flex min-w-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <div className="relative aspect-square overflow-hidden bg-white" data-protected="true">
          {!imgLoaded ? <div className="absolute inset-0 bg-muted/45" aria-hidden="true" /> : null}
          <img
            src={imageSrc}
            alt={`صورة منتج ${product.name}`}
            className={`h-full w-full select-none object-contain p-3 transition-opacity duration-200 sm:p-5 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            width={400}
            height={400}
            decoding="async"
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
            onLoad={() => setImgLoaded(true)}
            onError={(event) => {
              const target = event.currentTarget;
              if (!target.src.endsWith("/brand/aquavo-v2-icon.svg")) {
                target.src = "/brand/aquavo-v2-icon.svg";
              }
              setImgLoaded(true);
            }}
          />
        </div>

        <CardHeader className="space-y-2 p-3 pb-2 sm:p-4 sm:pb-2">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-[11px] text-muted-foreground sm:text-xs">
              {product.brand || "AQUAVO"}
            </span>
            {product.difficulty ? <DifficultyBadge level={product.difficulty} className="shrink-0" /> : null}
          </div>
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 transition-colors group-hover:text-primary sm:text-base sm:leading-6">
            {product.name}
          </h3>
        </CardHeader>

        <CardContent className="mt-auto p-3 pt-0 sm:p-4 sm:pt-0">
          {hasPrice ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {requiresVariantChoice && variantMinPrice !== undefined ? (
                <span className="text-[11px] text-muted-foreground">من</span>
              ) : null}
              <span className="text-base font-bold text-primary sm:text-lg">
                {requiresVariantChoice && variantMinPrice !== undefined
                  ? formatPrice(variantMinPrice)
                  : formatPrice(product.price ?? 0)}
              </span>
              {!requiresVariantChoice && (product.originalPrice ?? 0) > (product.price ?? 0) ? (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.originalPrice ?? 0)}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">قريباً</span>
          )}

          {(product.reviewCount ?? 0) > 0 ? (
            <div className="mt-2 flex items-center gap-1 text-xs" aria-label={`التقييم: ${product.rating} من 5 نجوم`}>
              <span className="text-amber-400" aria-hidden="true">★</span>
              <span className="font-medium">{product.rating}</span>
              <span className="text-muted-foreground">({product.reviewCount})</span>
            </div>
          ) : null}
        </CardContent>
      </Link>

      <CardFooter className="p-3 pt-0 sm:p-4 sm:pt-0">
        <Button
          type="button"
          className="min-h-11 w-full gap-2 text-xs sm:text-sm"
          onClick={handleAddToCart}
          aria-label={requiresVariantChoice ? `اختر خيار ${product.name}` : `أضف ${product.name} إلى سلة المشتريات`}
          disabled={!hasPrice || isOutOfStock}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          {hasPrice && !isOutOfStock
            ? requiresVariantChoice ? "اختار الخيار" : "أضف للسلة"
            : !hasPrice ? "قريباً" : "نفذت الكمية"}
        </Button>
      </CardFooter>
    </Card>
  );
});
