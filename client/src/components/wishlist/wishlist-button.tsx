import { lazy, Suspense, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/wishlist-context";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/types";
import { cn } from "@/lib/utils";
import { HeartBeat } from "@/components/ui/micro-animations";

// Lazy-load framer-motion animation — only imported on first wishlist-add click,
// not when product cards first render. Keeps framer-motion out of the scroll-triggered bundle.
const HeartFloatAnimation = lazy(() =>
  import("./heart-float-animation").then((m) => ({ default: m.HeartFloatAnimation }))
);

interface WishlistButtonProps {
  product: Product;
  variant?: "icon" | "default";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  showBadge?: boolean;
}

export function WishlistButton({
  product,
  variant = "icon",
  size = "icon",
  className,
  showBadge = false,
}: WishlistButtonProps) {
  const { addItem, removeItem, isInWishlist, totalItems } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  // animationMounted stays true after first add-to-wishlist click so subsequent
  // clicks find the component already mounted and respond immediately.
  const [animationMounted, setAnimationMounted] = useState(false);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inWishlist) {
      removeItem(product.id);
      toast({
        title: "تمت الإزالة",
        description: `${product.name} انحذف من المفضلة`,
      });
    } else {
      addItem(product);
      setAnimationMounted(true);
      setTriggerAnimation(true);
      toast({
        title: "انضاف للمفضلة",
        description: `${product.name} انضاف للمفضلة.`,
      });
    }
  };

  if (variant === "default") {
    return (
      <>
        {animationMounted && (
          <Suspense fallback={null}>
            <HeartFloatAnimation trigger={triggerAnimation} onComplete={() => setTriggerAnimation(false)} />
          </Suspense>
        )}
        <Button
          variant={inWishlist ? "default" : "secondary"}
          size={size}
          className={cn(
            "gap-2 transition-all",
            inWishlist && "bg-red-500 hover:bg-red-600 text-white",
            className
          )}
          onClick={handleToggleWishlist}
          aria-label={inWishlist ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} للمفضلة`}
        >
          <HeartBeat active={inWishlist}>
            <Heart
              className={cn("w-4 h-4 transition-all", inWishlist && "fill-current")}
              aria-hidden="true"
            />
          </HeartBeat>
          {inWishlist ? "إزالة من المفضلة" : "أضف للمفضلة"}
        </Button>
      </>
    );
  }

  return (
    <>
      {animationMounted && (
        <Suspense fallback={null}>
          <HeartFloatAnimation trigger={triggerAnimation} onComplete={() => setTriggerAnimation(false)} />
        </Suspense>
      )}
      <Button
        size={size}
        variant="secondary"
        className={cn(
          "rounded-full relative transition-all",
          inWishlist
            ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30",
          className
        )}
        onClick={handleToggleWishlist}
        aria-label={inWishlist ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} للمفضلة`}
      >
        <HeartBeat active={inWishlist}>
          <Heart
            className={cn(
              "w-4 h-4 transition-all",
              inWishlist && "fill-current scale-110"
            )}
            aria-hidden="true"
          />
        </HeartBeat>
        {showBadge && totalItems > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
            aria-label={`${totalItems} منتج في المفضلة`}
          >
            {totalItems}
          </span>
        )}
      </Button>
    </>
  );
}
