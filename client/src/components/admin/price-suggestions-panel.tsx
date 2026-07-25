import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Database, DollarSign, Loader2, TrendingDown, TrendingUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchProducts } from "@/lib/api";
import { addCsrfHeader } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";

interface PriceSuggestion {
  product: Product;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  reasonType: "demand_high" | "demand_low" | "stock_low" | "stock_high" | "seasonal";
  percentChange: number;
  confidence?: number;
  expectedImpact?: {
    revenueChange: string;
    salesChange: string;
  };
}

interface SuggestionsResponse {
  success: boolean;
  data?: {
    suggestions: PriceSuggestion[];
    count: number;
    status: "insufficient_data" | "supported_suggestions" | "no_supported_change";
    evidence: {
      productsRequested: number;
      eligibleProducts: number;
      totalHistoryPoints?: number;
      minimumHistoryPoints: number;
    };
  };
  error?: string;
}

export function PriceSuggestionsPanel() {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["admin-ai", "price-products"],
    queryFn: () => fetchProducts({ limit: 1000 }),
    staleTime: 60_000,
  });

  const products = Array.isArray(productsQuery.data?.products)
    ? productsQuery.data.products
    : [];
  const productIds = useMemo(() => products.map((product) => product.id), [products]);

  const suggestionsQuery = useQuery<SuggestionsResponse>({
    queryKey: ["admin-ai", "verified-price-suggestions", productIds.join(",")],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const response = await fetch("/api/pricing/suggestions", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ productIds }),
      });
      const payload = (await response.json()) as SuggestionsResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "تعذر التحقق من اقتراحات الأسعار");
      }
      return payload;
    },
  });

  const data = suggestionsQuery.data?.data;
  const suggestions = data?.suggestions ?? [];

  const applyPricesMutation = useMutation({
    mutationFn: async (selectedIds: string[]) => {
      const updates = suggestions
        .filter((suggestion) => selectedIds.includes(suggestion.product.id))
        .map((suggestion) => ({ id: suggestion.product.id, price: suggestion.suggestedPrice }));

      const response = await fetch("/api/pricing/apply", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          updates,
          adminConfirm: "I_CONFIRM_PRICE_CHANGE",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "فشل تطبيق الأسعار");
      }
      return payload.data?.updated ?? updates.length;
    },
    onSuccess: (updatedCount) => {
      toast({
        title: "تم تحديث الأسعار",
        description: `تم تحديث ${updatedCount} منتج بعد موافقتك الصريحة.`,
      });
      setSelectedSuggestions(new Set());
      void queryClient.invalidateQueries({ queryKey: ["admin-ai", "price-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-ai", "verified-price-suggestions"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => {
      toast({ title: "تعذر تحديث الأسعار", description: error.message, variant: "destructive" });
    },
  });

  const toggleSuggestion = (productId: string) => {
    setSelectedSuggestions((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleApplySelected = () => {
    if (selectedSuggestions.size === 0) return;
    const approved = window.confirm(
      `سيتم تغيير أسعار ${selectedSuggestions.size} منتج مباشرة. هل راجعت الأرقام وتوافق؟`,
    );
    if (!approved) return;
    applyPricesMutation.mutate(Array.from(selectedSuggestions));
  };

  const isLoading = productsQuery.isLoading || suggestionsQuery.isLoading;
  const error = productsQuery.error || suggestionsQuery.error;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              اقتراحات تحسين الأسعار
            </CardTitle>
            <CardDescription>
              لا يظهر أي اقتراح إلا عند وجود سجل أسعار فعلي كافٍ للمنتج.
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 whitespace-nowrap">
            <Database className="h-3 w-3" />
            سجل أسعار موثّق
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            جاري فحص سجل الأسعار...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-1 flex items-center gap-2 font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              تعذر التحقق من الأسعار
            </div>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "حدث خطأ غير معروف"}
            </p>
          </div>
        ) : data?.status === "insufficient_data" ? (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50/70 p-5 dark:bg-amber-950/20">
            <div className="mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
              البيانات غير كافية للحكم على الأسعار
            </div>
            <p className="text-sm text-muted-foreground">
              المنتجات المؤهلة للتحليل: {data.evidence.eligibleProducts} من {data.evidence.productsRequested}.
              يحتاج كل منتج إلى {data.evidence.minimumHistoryPoints} نقاط تاريخ سعر حقيقية على الأقل.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              عدم وجود اقتراح لا يعني أن جميع الأسعار مناسبة؛ يعني فقط أن النظام لا يملك دليلاً كافياً.
            </p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-lg border bg-muted/20 p-5 text-center">
            <Check className="mx-auto mb-3 h-10 w-10 text-green-600" />
            <p className="font-medium">لم يُرصد تغيير سعري مدعوم بالبيانات حالياً</p>
            <p className="mt-1 text-sm text-muted-foreground">
              تم تحليل {data?.evidence.eligibleProducts ?? 0} منتج مؤهل، ولم تتجاوز أي إشارة حد التغيير المعتمد.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-sm">
              <span className="text-muted-foreground">
                {suggestions.length} اقتراحات مدعومة بسجل الأسعار
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSuggestions(new Set(suggestions.map((item) => item.product.id)))}
                >
                  تحديد الكل
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSuggestions(new Set())}>
                  مسح التحديد
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-right">تحديد</th>
                    <th className="p-3 text-right">المنتج</th>
                    <th className="p-3 text-right">الحالي</th>
                    <th className="p-3 text-right">المقترح</th>
                    <th className="p-3 text-right">التغيير</th>
                    <th className="p-3 text-right">الدليل</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((suggestion) => {
                    const selected = selectedSuggestions.has(suggestion.product.id);
                    return (
                      <tr key={suggestion.product.id} className="border-t align-top">
                        <td className="p-3">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleSuggestion(suggestion.product.id)}
                            aria-label={`تحديد ${suggestion.product.name}`}
                          />
                        </td>
                        <td className="p-3 font-medium">{suggestion.product.name}</td>
                        <td className="p-3 font-mono">
                          {suggestion.currentPrice.toLocaleString("en-US")} د.ع
                        </td>
                        <td className="p-3 font-mono font-bold">
                          {suggestion.suggestedPrice.toLocaleString("en-US")} د.ع
                        </td>
                        <td className="p-3">
                          <Badge variant={suggestion.percentChange > 0 ? "default" : "secondary"} className="gap-1">
                            {suggestion.percentChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {suggestion.percentChange > 0 ? "+" : ""}
                            {suggestion.percentChange}%
                          </Badge>
                        </td>
                        <td className="max-w-[320px] p-3 text-muted-foreground">
                          {suggestion.reason}
                          {typeof suggestion.confidence === "number" && (
                            <span className="mt-1 block text-xs">
                              مستوى الثقة: {Math.round(suggestion.confidence * 100)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedSuggestions.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <p className="text-sm">تم تحديد {selectedSuggestions.size} منتج. لن يتغير أي سعر بدون تأكيدك.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedSuggestions(new Set())}>
                    <X className="ml-1 h-4 w-4" />
                    إلغاء
                  </Button>
                  <Button onClick={handleApplySelected} disabled={applyPricesMutation.isPending}>
                    {applyPricesMutation.isPending ? (
                      <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="ml-1 h-4 w-4" />
                    )}
                    تطبيق بعد المراجعة
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
