import { memo, useRef, useState, type MouseEvent } from "react";
import { Leaf, Package, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { isWoodMonthEndSale, WoodSaleCountdown } from "@/components/products/wood-sale-countdown";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { cardImage, cardImageSrcSet } from "@/lib/cloudinary";
import { formatPrice } from "@/lib/format";
import { trackSelectItem } from "@/lib/analytics";
import { flyProductToCart } from "@/lib/motion/fly-to-cart";
import { isolateNumericRanges as bidi } from "@shared/i18n/bidi";
import {
  navigateCardToProduct,
  prefetchProductDestination,
  supportsViewTransitions,
} from "@/lib/motion/card-transition";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import type { Product } from "@/types";
import { useTranslation } from "react-i18next";

interface ProductCardProps {
  product: Product;
  onCompare?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  /** Pass true for above-the-fold cards to load eagerly. */
  priority?: boolean;
}

export const ProductCard = memo(function ProductCard({
  product,
  priority = false,
}: ProductCardProps) {
  const { t } = useTranslation("products");
  const { t: tProduct } = useTranslation("product");
  const { addItem } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [imgLoaded, setImgLoaded] = useState(false);
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
  const cardBenefit =
    typeof product.specifications?.__cardBenefit === "string"
      ? product.specifications.__cardBenefit.trim()
      : "";
  // bidi(): a hyphenated range inside an RTL name or benefit line renders reversed
  // ("50-150" read as "150-50"). See shared/i18n/bidi.ts.
  const displayName = bidi(product.name);
  const supportingLine = bidi(cardBenefit || product.specs || product.description || "");
  const woodSaleActive = isWoodMonthEndSale(product);

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
      title: t("card.added"),
      description: t("card.addedDetail", { name: product.name }),
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
    ? t("card.soon")
    : isOutOfStock
      ? t("card.outOfStock")
      : requiresVariantChoice
        ? t("card.chooseOption")
        : t("card.addToCart");

  const primaryActionAriaLabel = !hasPrice
    ? t("card.soonAria", { name: product.name })
    : isOutOfStock
      ? t("card.outOfStockAria", { name: product.name })
      : requiresVariantChoice
        ? t("card.chooseOptionAria", { name: product.name })
        : t("card.addToCartAria", { name: product.name });

  return (
    <Card className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#ddd9d2] bg-[#f7f4ef] text-start shadow-[0_4px_14px_rgba(35,42,43,0.07)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#d2ccc3] hover:shadow-[0_10px_26px_rgba(35,42,43,0.11)]">
      <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-2">
        <div className="pointer-events-auto">
          <WishlistButton
            product={product}
            variant="icon"
            size="icon"
            className="h-10 w-10 border border-white/75 bg-[#f7f4ef]/80 shadow-sm backdrop-blur-md md:h-10 md:w-10"
          />
        </div>

        <div className="flex flex-col items-end gap-1">
          {woodSaleActive ? (
            <Badge className="border border-[#173a43]/10 bg-[#173a43] text-white shadow-sm hover:bg-[#173a43]">
              {tProduct("sale.discount30")}
            </Badge>
          ) : null}
          {product.isNew ? <Badge className="bg-primary text-primary-foreground">{t("tags.new")}</Badge> : null}
          {product.isBestSeller ? <Badge variant="secondary">{t("tags.bestSeller")}</Badge> : null}
          {product.difficulty ? <DifficultyBadge level={product.difficulty} className="shrink-0 bg-[#f7f4ef]/88 backdrop-blur-md" /> : null}
          {product.ecoFriendly ? (
            <Badge variant="outline" className="gap-1 border-primary/25 bg-[#f7f4ef]/88 text-primary backdrop-blur-md">
              <Leaf className="h-3 w-3" aria-hidden="true" />
              {t("tags.eco")}
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
        aria-label={t("card.viewDetails", { name: product.name })}
        className="flex min-w-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-[#f7f4ef]" data-protected="true">
          {!imgLoaded ? <div className="absolute inset-0 bg-muted/20" aria-hidden="true" /> : null}
          <img
            ref={imgRef}
            src={imageSrc}
            srcSet={imageSrcSet}
            sizes={imageSrcSet ? "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 20vw" : undefined}
            alt={t("card.imageAlt", { name: product.name })}
            className={`h-full w-full select-none object-cover object-center transition-[opacity,transform] duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"} group-hover:scale-[1.01]`}
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
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent via-[#f7f4ef]/55 to-[#f7f4ef]"
            aria-hidden="true"
          />
        </div>

        <CardHeader className="-mt-px space-y-1 bg-[#f7f4ef] px-3 pb-1 pt-2.5 sm:px-4 sm:pb-1 sm:pt-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary sm:min-h-12 sm:text-[15px] sm:leading-6">
            {displayName}
          </h3>

          <p className="line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground sm:text-[12.5px] sm:leading-5">
            {supportingLine || "\u00a0"}
          </p>
        </CardHeader>

        <CardContent className="mt-auto bg-[#f7f4ef] px-3 pb-2 pt-1 sm:px-4 sm:pb-2 sm:pt-1">
          <div className="flex min-h-7 items-end justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-x-1.5">
              {hasPrice ? (
                <>
                  {requiresVariantChoice && variantMinPrice !== undefined ? (
                    <span className="text-[11px] text-muted-foreground">{t("card.from")}</span>
                  ) : null}
                  <span className="whitespace-nowrap text-base font-bold text-primary sm:text-lg">
                    {requiresVariantChoice && variantMinPrice !== undefined
                      ? formatPrice(variantMinPrice)
                      : formatPrice(product.price ?? 0)}
                  </span>
                  {!requiresVariantChoice && (product.originalPrice ?? 0) > (product.price ?? 0) ? (
                    <span className="text-[11px] text-muted-foreground line-through">
                      {formatPrice(product.originalPrice ?? 0)}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">{t("card.soon")}</span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1 text-xs" aria-label={(product.reviewCount ?? 0) > 0 ? t("card.rating", { rating: product.rating }) : undefined}>
              {(product.reviewCount ?? 0) > 0 ? (
                <>
                  <span className="text-amber-400" aria-hidden="true">★</span>
                  <span className="font-medium">{product.rating}</span>
                  <span className="text-muted-foreground">({product.reviewCount})</span>
                </>
              ) : (
                <span className="invisible" aria-hidden="true">★ 0.0 (0)</span>
              )}
            </div>
          </div>
          {woodSaleActive ? (
            <div className="mt-1.5">
              <WoodSaleCountdown compact />
            </div>
          ) : null}
        </CardContent>
      </Link>

      <CardFooter className="bg-[#f7f4ef] px-3 pb-3 pt-0 sm:px-4 sm:pb-4 sm:pt-0">
        <Button
          type="button"
          variant={isOutOfStock && hasPrice ? "outline" : "default"}
          className="min-h-11 w-full gap-2 rounded-xl text-xs font-semibold shadow-sm sm:text-sm"
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
