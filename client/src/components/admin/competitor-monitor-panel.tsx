import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";
import { ExternalLink, Search, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface SimpleProduct {
  id: string;
  name: string;
  brand: string;
  price: string;
}

interface CompetitorResult {
  store: string;
  price: number;
  currency: string;
  url: string;
  title: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(n) + " د.ع";

export default function CompetitorMonitorPanel() {
  const { toast } = useToast();
  const [results, setResults] = useState<Record<string, CompetitorResult[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const { data: productsData = [] } = useQuery<SimpleProduct[]>({
    queryKey: ["admin-products-simple"],
    queryFn: async () => {
      const r = await fetch("/api/products?limit=200", { credentials: "include" });
      if (!r.ok) return [];
      const j = await r.json();
      const list = Array.isArray(j) ? j : (j.products ?? j.data ?? []);
      return list.map((p: any) => ({
        id:    p.id,
        name:  p.name,
        brand: p.brand,
        price: p.price,
      }));
    },
  });

  const checkCompetitors = async (product: SimpleProduct) => {
    setLoading(l => ({ ...l, [product.id]: true }));
    try {
      const r = await fetch("/api/admin/accounting/competitor-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...addCsrfHeader() },
        credentials: "include",
        body: JSON.stringify({ productName: product.name, brand: product.brand }),
      });
      const j = await r.json();
      if (j.success) {
        setResults(prev => ({ ...prev, [product.id]: j.data }));
      } else {
        toast({ title: "خطأ في البحث", description: j.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, [product.id]: false }));
    }
  };

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <h2 className="text-2xl font-bold text-white">مراقبة أسعار المنافسين</h2>
      <p className="text-gray-400 text-sm">اضغط "فحص الآن" لأي منتج — Apify يبحث عن نفس المنتج عند المنافسين ويرجع الأسعار والروابط.</p>

      <div className="space-y-4">
        {productsData.map(product => {
          const myPrice = Number(product.price) || 0;
          const compResults = results[product.id] ?? [];
          const isLoading = loading[product.id] ?? false;
          const hasResults = compResults.length > 0;
          const cheapest = hasResults ? Math.min(...compResults.map(r => r.price)) : null;

          return (
            <Card key={product.id} className="bg-[#0a1628] border-[#199bb8]/20">
              <CardContent className="p-4">
                {/* Product Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-medium">{product.name}</p>
                    <p className="text-gray-400 text-xs">{product.brand}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">سعرك</p>
                      <p className="text-[#199bb8] font-bold">{fmt(myPrice)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => checkCompetitors(product)}
                      disabled={isLoading}
                      className="bg-[#199bb8] hover:bg-[#199bb8]/80"
                    >
                      {isLoading ? (
                        <span className="animate-pulse">جاري البحث...</span>
                      ) : (
                        <><Search className="w-3 h-3 ml-1" /> فحص الآن</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Status Badge */}
                {hasResults && cheapest !== null && (
                  <div className="mb-3">
                    {cheapest < myPrice ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <TrendingDown className="w-3 h-3 ml-1" />
                        منافس يبيع بـ {fmt(cheapest)} — أرخص منك بـ {fmt(myPrice - cheapest)}
                      </Badge>
                    ) : cheapest > myPrice ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <TrendingUp className="w-3 h-3 ml-1" />
                        أنت الأرخص — أرخص من أقرب منافس بـ {fmt(cheapest - myPrice)}
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <Minus className="w-3 h-3 ml-1" />
                        نفس السعر عند المنافسين
                      </Badge>
                    )}
                  </div>
                )}

                {/* Results Table */}
                {hasResults && (
                  <div className="rounded border border-[#199bb8]/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#010611] text-[#199bb8] text-xs">
                          <th className="p-2 text-right">المتجر</th>
                          <th className="p-2 text-center">السعر</th>
                          <th className="p-2 text-center">الفرق</th>
                          <th className="p-2 text-center">رابط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compResults.map((r, i) => {
                          const diff = r.price - myPrice;
                          return (
                            <tr key={i} className="border-t border-[#199bb8]/10 hover:bg-[#010611]/40">
                              <td className="p-2 text-gray-300 max-w-[140px] truncate">{r.store}</td>
                              <td className="p-2 text-center text-white font-medium">{fmt(r.price)}</td>
                              <td className="p-2 text-center">
                                <span style={{ color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "#94a3b8" }}>
                                  {diff > 0 ? "+" : ""}{fmt(Math.abs(diff))}
                                  {diff > 0 ? " (أنت أرخص)" : diff < 0 ? " (هو أرخص)" : ""}
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#199bb8] hover:text-white inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> فتح
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {hasResults && compResults.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-2">ما لقينا منافسين لهذا المنتج</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
