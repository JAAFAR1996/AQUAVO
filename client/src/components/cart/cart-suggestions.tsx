import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/contexts/cart-context";
import { fetchCartSuggestions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sparkles } from "lucide-react";
import type { Product } from "@/types";

export function CartSuggestions() {
  const { items: cartItems, addItem } = useCart();
  const productIds = cartItems.map((item) => item.productId);

  const { data } = useQuery({
    queryKey: ["cart-suggestions", productIds.join(",")],
    queryFn: () => fetchCartSuggestions(productIds),
    staleTime: 3 * 60 * 1000,
    enabled: productIds.length > 0,
  });

  const suggestions = data?.suggestions ?? [];
  if (suggestions.length === 0) return null;

  return (
    <div className="py-3">
      <div className="flex items-center gap-1.5 mb-2 justify-end">
        <h4 className="text-xs font-bold text-muted-foreground">أكمل حوضك</h4>
        <Sparkles className="h-3 w-3 text-primary" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {suggestions.map((product: Product) => (
          <div
            key={product.id}
            className="flex-shrink-0 w-[130px] p-2 rounded-lg border bg-muted/30 hover:border-primary/30 transition-colors"
          >
            <div className="w-full h-16 rounded-md overflow-hidden bg-background mb-1.5">
              <img
                src={product.images?.[0] || product.thumbnail}
                alt={product.name}
                className="w-full h-full object-contain p-1"
                loading="lazy"
              />
            </div>
            <h5 className="text-[11px] font-medium text-right line-clamp-2 leading-tight mb-1">
              {product.name}
            </h5>
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                onClick={() => addItem(product)}
                aria-label={`أضف ${product.name} للسلة`}
              >
                <ShoppingCart className="h-3 w-3" />
              </Button>
              <span className="text-[10px] font-bold text-primary">
                {product.price && Number(product.price) > 0
                  ? `${Number(product.price).toLocaleString("en-US")} د.ع`
                  : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
