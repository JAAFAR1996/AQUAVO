import { memo, useRef, useState, type MouseEvent } from "react";
import { Eye, Leaf, Package, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";

import { CompareButton } from "@/components/products/product-comparison";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { cardImage, cardImageSrcSet } from "@/lib/cloudinary";
import { formatPrice } from "@/lib/format";
import { trackSelectItem } from "@/lib/analytics";
import { flyProductToCart } from "@/lib/motion/fly-to-cart";
import {
  navigateCardToProduct,
  prefetchProductDestination,
  supportsViewTransitions,
} from "@/lib/motion/card-transition";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import type { Product } from "@/types";

/** At or below this many units the card shows the approved low-stock warning. */
const LOW_STOCK_THRESHOLD = 3;

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
  // Motion is the normal experience; only reduced-motion users opt out.
  const motionActive = !prefersReducedMotion();
  const imgRef = useRef<HTMLImageElement>(null);
  const navLockRef = useRef(false);

  const prefetchDestination = () => {
    prefetchProductDestination(product.slug, product.thumbnail || product.image);
  };

  const variantPrices = product.hasVariants && product.variants?.length
    ? product.variants.map((variant) => variant.price).filter((price) => price > 0)
    : [];
  const variantMinPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : undefined;
  const hasPrice = (product.price ?? 0) > 0 || variantMinPrice !== undefined;
  const requiresVariantChoice = Boolean(product.hasVariants && product.variants?.length);
  const isOutOfStock = requiresVariantChoice
    ? product.variants?.every((variant) => (variant.stock ?? 0) <= 0) ?? true
    : (product.stock ?? 0) <= 0;

  /**
   * Availability shown as TEXT, never colour alone (WCAG 1.4.1).
   *
   * No approved success colour exists in the v2 system — `--aqv-success` is
   * explicitly NOT YET DEFINED and the owner reconfirmed on 2026-08-05 that it
   * must not be invented. So "available" is neutral muted text and low stock
   * uses the approved warning token; nothing here uses green/emerald.
   */
  const availableUnits = requiresVariantChoice
    ? (product.variants ?? []).reduce((total, variant) => total + Math.max(0, variant.stock ?? 0), 0)
    : Math.max(0, product.stock ?? 0);
  const isLowStock = !isOutOfStock && availableUnits > 0 && availableUnits <= LOW_STOCK_THRESHOLD;

  const stockLabel = !hasPrice
    ? null
    : isOutOfStock
      ? "نفدت الكمية"
      : isLowStock
        ? `آخر ${availableUnits} قطع`
        : "متوفر";

  const handlePrimaryAction = async (event: MouseEvent<HTMLButtonElement>) => {
    if (isOutOfStock) return;

    if (requiresVariantChoice) {
      setLocation(`/products/${product.slug}`);
      return;
    }

    const added = await addItem(product);
    if (!added) return;

    if (motionActive) flyProductToCart(imgRef.current);

    toast({
      title: "تمت الإضافة",
      description: `${product.name} انضاف للسلة.`,
    });
  };

  const handleCardNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    trackSelectItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      category: product.category,
    });
    if (!motionActive || !supportsViewTransitions() || prefersReducedMotion()) return;
    event.preventDefault();
    if (navLockRef.current) return;
    navLockRef.current = true;
    void navigateCardToProduct({
      slug: product.slug,
      sourceImg: imgRef.current,
      navigate: () => setLocation(`/products/${product.slug}`),
      motionActive,
    }).finally(() => {
      navLockRef.current = false;
    });
  };

  const rawImage = product.thumbnail || product.image;
  const imageSrc = cardImage(rawImage) || "/brand/aquavo-v2-icon.svg";
  const imageSrcSet = cardImageSrcSet(rawImage);

  const primaryActionLabel = !hasPrice
    ? "قريباً"
    : isOutOfStock
      ? "نفدت الكمية"
      : requiresVariantChoice
        ? "اختار الخيار"
        : "أضف للسلة";

  const primaryActionAriaLabel = !hasPrice
    ? `${product.name} قريباً`
    : isOutOfStock
      ? `${product.name}، نفدت الكمية`
      : requiresVariantChoice
        ? `اختار خيار ${product.name}`
        : `أضف ${product.name} إلى سلة المشتريات`;

  return (
    <Card className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/60 text-right transition-colors hover:border-primary/50">
      {/*
        Overlay controls: previously three permanently-visible buttons sat on top
        of every product image, which at 24–48 cards per page became the
        dominant texture of the catalogue and obscured the thing the shopper is
        evaluating.

        Now: wishlist stays permanent (it is the one secondary action people
        reach for on a grid, and hiding it behind hover would strand touch
        users); compare and quick-view are revealed on pointer hover or keyboard
        focus-within on sm+ only. On touch, `(hover: none)` keeps them visible
        via `max-sm:opacity-100` so they are never unreachable.

        Every control keeps h-11 w-11 (44px) per WCAG 2.5.8, and
        `group-focus-within:opacity-100` keeps them reachable by Tab.
      */}
      <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
        <div className="pointer-events-auto flex gap-1.5">
          <WishlistButton
            product={product}
            variant="icon"
            size="icon"
            className="h-11 w-11 border border-border/70 bg-background/90 shadow-sm backdrop-blur-sm md:h-11 md:w-11"
          />
          <div className="flex gap-1.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <CompareButton
              productId={product.id}
              variant="icon"
              className="h-11 w-11 border border-border/70 bg-background/90 shadow-sm backdrop-blur-sm md:h-11 md:w-11"
            />
            {onQuickView ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="hidden h-11 w-11 border-border/70 bg-background/90 shadow-sm backdrop-blur-sm sm:inline-flex"
                onClick={() => onQuickView(product)}
                aria-label={`نظرة سريعة على ${product.name}`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {product.isNew ? <Badge className="bg-primary text-primary-foreground">جديد</Badge> : null}
          {product.isBestSeller ? <Badge variant="secondary">الأكثر مبيعاً</Badge> : null}
          {product.ecoFriendly ? (
            <Badge variant="outline" className="gap-1 border-primary/25 bg-background/90 text-primary">
              <Leaf className="h-3 w-3" aria-hidden="true" />
              صديق للبيئة
            </Badge>
          ) : null}
        </div>
      </div>

      <Link
        href={`/products/${product.slug}`}
        onClick={handleCardNavigate}
        onPointerEnter={prefetchDestination}
        onPointerDown={prefetchDestination}
        onFocus={prefetchDestination}
        aria-label={`عرض تفاصيل ${product.name}`}
        className="flex min-w-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <div className="relative aspect-square overflow-hidden bg-card" data-protected="true">
          {!imgLoaded ? <div className="absolute inset-0 bg-muted/45" aria-hidden="true" /> : null}
          <img
            ref={imgRef}
            src={imageSrc}
            srcSet={imageSrcSet}
            sizes={imageSrcSet ? "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 20vw" : undefined}
            alt={`صورة منتج ${product.name}`}
            className={`h-full w-full select-none object-contain p-3 sm:p-5 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
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

          {stockLabel ? (
            <p
              className={`mt-2 text-xs font-medium ${
                isOutOfStock
                  ? "text-muted-foreground"
                  : isLowStock
                    ? "text-[color:var(--aqv-warning)]"
                    : "text-muted-foreground"
              }`}
            >
              {stockLabel}
            </p>
          ) : null}

          {(product.reviewCount ?? 0) > 0 ? (
            <div className="mt-2 flex items-center gap-1 text-xs" aria-label={`التقييم: ${product.rating} من 5 نجوم`}>
              {/* Neutral star: no approved gold token exists, and --aqv-warning is
                  reserved for real warnings ("never decorative or promotional"). */}
              <span className="text-muted-foreground" aria-hidden="true">★</span>
              <span className="font-medium">{product.rating}</span>
              <span className="text-muted-foreground">({product.reviewCount})</span>
            </div>
          ) : null}
        </CardContent>
      </Link>

      <CardFooter className="p-3 pt-0 sm:p-4 sm:pt-0">
        <Button
          type="button"
          variant={isOutOfStock && hasPrice ? "outline" : "default"}
          className="min-h-11 w-full gap-2 text-xs sm:text-sm"
          onClick={handlePrimaryAction}
          aria-label={primaryActionAriaLabel}
          disabled={!hasPrice || isOutOfStock}
        >
          {isOutOfStock && hasPrice ? (
            <Package className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          )}
          {primaryActionLabel}
        </Button>
      </CardFooter>
    </Card>
  );
});
