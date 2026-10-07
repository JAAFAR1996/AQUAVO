import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/contexts/cart-context";
import { fetchCartSuggestions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sparkles, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";
import { thumbImage } from "@/lib/cloudinary";
import type { Product } from "@/types";
import { useTranslation } from "react-i18next";
import { formatIQD } from "@/lib/utils";

export function CartSuggestions({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { t } = useTranslation("checkout");
  const { items: cartItems, addItem } = useCart();
  const productIds = cartItems.map((item) => item.productId);

  const { data } = useQuery({
    queryKey: ["cart-suggestions", productIds.join(",")],
    queryFn: () => fetchCartSuggestions(productIds),
    staleTime: 3 * 60 * 1000,
    enabled: productIds.length > 0,
  });

  // Keep cross-sells deliberately small so checkout stays the primary action.
  const suggestions = (data?.suggestions ?? []).slice(0, 3);
  if (suggestions.length === 0) return null;

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <h4 className="text-xs font-bold text-foreground">{t("suggestions.title")}</h4>
        <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
        {suggestions.map((product: Product) => {
          const needsChoice = Boolean(product.hasVariants && product.variants?.length);
          return (
            <div
              key={product.id}
              className="flex w-[205px] flex-shrink-0 items-center gap-2 rounded-xl border border-border bg-background p-2"
            >
              <Link href={`/products/${product.slug}`} onClick={onNavigate} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted/30">
                <img
                  src={thumbImage(product.images?.[0] || product.thumbnail) || "/brand/aquavo-v2-icon.svg"}
                  alt=""
                  className="h-full w-full object-contain p-1"
                  loading="lazy"
                  decoding="async"
                  width={64}
                  height={64}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/brand/aquavo-v2-icon.svg";
                  }}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${product.slug}`} onClick={onNavigate} className="line-clamp-2 text-[11px] font-semibold leading-4 text-foreground hover:text-primary">
                  {product.name}
                </Link>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="whitespace-nowrap text-[10px] font-bold text-primary">
                    {product.price && Number(product.price) > 0 ? formatIQD(Number(product.price)) : ""}
                  </span>
                  {needsChoice ? (
                    <Link
                      href={`/products/${product.slug}`}
                      onClick={onNavigate}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      aria-label={t("suggestions.choose", { name: product.name })}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                      onClick={() => void addItem(product)}
                      aria-label={t("suggestions.add", { name: product.name })}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
