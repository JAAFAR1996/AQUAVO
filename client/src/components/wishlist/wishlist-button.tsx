import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/wishlist-context";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("account");
  const { addItem, removeItem, isInWishlist, totalItems } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inWishlist) {
      removeItem(product.id);
      toast({ title: t("wishlist-button.s1"), description: t("wishlist-button.s2", { v0: product.name }) });
    } else {
      addItem(product);
      toast({ title: t("wishlist-button.s3"), description: t("wishlist-button.s4", { v0: product.name }) });
    }
  };

  if (variant === "default") {
    return (
      <Button
        variant={inWishlist ? "default" : "secondary"}
        size={size}
        className={cn("gap-2", inWishlist && "bg-red-500 hover:bg-red-600 text-white", className)}
        onClick={handleToggleWishlist}
        aria-label={inWishlist ? t("wishlist-button.s5", { v0: product.name }) : t("wishlist-button.s6", { v0: product.name })}
      >
        <Heart className={cn("w-4 h-4", inWishlist && "fill-current")} aria-hidden="true" />
        {inWishlist ? t("wishlist-button.s7") : t("wishlist-button.s8")}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant="secondary"
      className={cn(
        "rounded-full relative",
        inWishlist
          ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30",
        className
      )}
      onClick={handleToggleWishlist}
      aria-label={inWishlist ? t("wishlist-button.s5", { v0: product.name }) : t("wishlist-button.s6", { v0: product.name })}
    >
      <Heart className={cn("w-4 h-4", inWishlist && "fill-current")} aria-hidden="true" />
      {showBadge && totalItems > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
          aria-label={t("wishlist-button.s9", { v0: totalItems })}
        >
          {totalItems}
        </span>
      )}
    </Button>
  );
}
