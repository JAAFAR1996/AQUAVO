import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { fetchPersonalizedProducts, fetchPredictedNeeds } from "@/lib/api";
import { ProductCard } from "@/components/products/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, ShoppingCart, TrendingUp } from "lucide-react";
import type { Product } from "@/types";

function PredictedNeedCard({ prediction }: {
  prediction: { product: Product; probability: number; reason: string; predictedDate: string | null };
}) {
  const { addItem } = useCart();

  const probabilityColor =
    prediction.probability >= 80 ? "bg-red-500" :
      prediction.probability >= 60 ? "bg-amber-500" :
        "bg-blue-500";

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/30 transition-colors">
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/20 shrink-0">
        <img
          src={prediction.product.images?.[0] || prediction.product.thumbnail}
          alt={prediction.product.name}
          className="w-full h-full object-contain p-1"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0 text-right">
        <h4 className="font-bold text-sm truncate">{prediction.product.name}</h4>
        <div className="flex items-center gap-2 justify-end mt-1">
          <span className="text-xs text-muted-foreground">{Math.round(prediction.probability)}%</span>
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${probabilityColor} transition-all`}
              style={{ width: `${prediction.probability}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{prediction.reason}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 h-8 w-8 p-0"
        onClick={() => addItem(prediction.product)}
        aria-label={`أضف ${prediction.product.name} للسلة`}
      >
        <ShoppingCart className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function PersonalizedSection() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // Defer heavy AI prediction call by 4s so it doesn't compete with page render
  const [canLoadPredictions, setCanLoadPredictions] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCanLoadPredictions(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const { data: personalizedData, isLoading: loadingPersonalized } = useQuery({
    queryKey: ["products", "personalized"],
    queryFn: fetchPersonalizedProducts,
    staleTime: 5 * 60 * 1000,
  });

  const { data: predictedData, isLoading: loadingPredicted } = useQuery({
    queryKey: ["products", "predicted-needs"],
    queryFn: fetchPredictedNeeds,
    staleTime: 5 * 60 * 1000,
    enabled: isLoggedIn && canLoadPredictions,
  });

  const products = personalizedData?.products ?? [];
  const isPersonalized = personalizedData?.personalized ?? false;
  const predictions = predictedData?.predictions ?? [];

  const method = personalizedData?.method ?? "";
  const hasRealTrending = method === "trending" && products.length > 0;

  // Don't render if there's nothing to show
  if (!loadingPersonalized && products.length === 0 && predictions.length === 0) return null;

  return (
    <section className="mt-16 space-y-12">
      {/* Personalized / Trending Products */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div />
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-right">
            {isPersonalized ? (
              <>
                مختار لك <Sparkles className="w-6 h-6 text-primary" />
              </>
            ) : hasRealTrending ? (
              <>
                الأكثر رواجاً <TrendingUp className="w-6 h-6 text-primary" />
              </>
            ) : (
              <>
                اكتشف منتجاتنا <TrendingUp className="w-6 h-6 text-primary" />
              </>
            )}
          </h2>
        </div>

        {loadingPersonalized ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Predicted Needs (logged-in only) */}
      {isLoggedIn && (loadingPredicted || predictions.length > 0) && (
        <div id="predicted-needs">
          <div className="flex items-center justify-between mb-6">
            <div />
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-right">
              قد تحتاج قريباً <Clock className="w-6 h-6 text-accent" />
            </h2>
          </div>

          {loadingPredicted ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {predictions.map((pred) => (
                <PredictedNeedCard key={pred.product.id} prediction={pred} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
