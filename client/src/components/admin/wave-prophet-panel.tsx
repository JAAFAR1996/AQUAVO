import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Loader2, Calendar, AlertTriangle, Lightbulb, Package, Info, ChevronDown, ChevronUp } from "lucide-react";

interface MonthForecast {
  monthName: string;
  demandIndex: number;
  keyEvents: string[];
  topProducts: Array<{ category: string; expectedDemand: string; importQuantity: string; reasoning: string }>;
  importRecommendation: string;
  pricingAdvice: string;
  marketingFocus: string;
  alertLevel?: string;
}

interface WaveForecast {
  forecastPeriod: string;
  marketOverview: string;
  months: MonthForecast[];
  annualInsights: string[];
  riskFactors: string[];
  opportunities: string[];
  topImportRecommendations?: Array<{ product: string; quantity: string; timing: string; expectedROI: string }>;
}

const demandColor = (index: number) => {
  if (index >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600", label: "طلب عالي جداً" };
  if (index >= 60) return { bar: "bg-blue-500", text: "text-blue-600", label: "طلب عالي" };
  if (index >= 40) return { bar: "bg-amber-500", text: "text-amber-600", label: "طلب متوسط" };
  return { bar: "bg-slate-400", text: "text-slate-500", label: "طلب منخفض" };
};

const alertStyle = (level?: string) => {
  if (level === "طوارئ") return "border-red-500/40 bg-red-950/20";
  if (level === "تنبيه") return "border-amber-500/40 bg-amber-950/10";
  return "border-border";
};

export function WaveProphetPanel() {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<WaveForecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>({});

  // Optional context inputs
  const [topProducts, setTopProducts] = useState("");
  const [topCategories, setTopCategories] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");

  const runForecast = async () => {
    setLoading(true);
    setError(null);
    setForecast(null);
    try {
      const res = await fetch("/api/simulation/wave-prophet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topProducts, topCategories, monthlyRevenue }),
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) setForecast(json.data);
      else setError(json.error || "فشل التوقع");
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (i: number) => setExpandedMonths(p => ({ ...p, [i]: !p[i] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black">نبي الموجة</h2>
          <p className="text-sm text-muted-foreground">توقع السوق العراقي للـ 6 أشهر القادمة — متى تستورد وماذا وبكم</p>
        </div>
      </div>

      {/* Context Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            بيانات اختيارية (تحسّن دقة التوقع)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">أعلى المنتجات مبيعاً</Label>
            <Input
              placeholder="مثال: هيتر 50واط، فلتر علوي..."
              value={topProducts}
              onChange={e => setTopProducts(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">أعلى الفئات</Label>
            <Input
              placeholder="مثال: أجهزة تسخين، أغذية..."
              value={topCategories}
              onChange={e => setTopCategories(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">متوسط المبيعات الشهرية (د.ع)</Label>
            <Input
              placeholder="مثال: 2,500,000"
              value={monthlyRevenue}
              onChange={e => setMonthlyRevenue(e.target.value)}
              className="text-sm"
            />
          </div>
        </CardContent>
        <div className="px-6 pb-5">
          <Button
            onClick={runForecast}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white gap-2"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />جاري التحليل...</> : <><TrendingUp className="h-4 w-4" />شغّل نبي الموجة</>}
          </Button>
          {loading && (
            <p className="text-xs text-muted-foreground mt-2 animate-pulse">
              الذكاء الاصطناعي يحلل الموسمية العراقية والأحداث والطلب... (15-30 ثانية)
            </p>
          )}
        </div>
      </Card>

      {error && (
        <Alert className="border-red-500/30 bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {forecast && (
        <div className="space-y-6">

          {/* Market Overview */}
          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-950/30 to-purple-950/20">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-blue-200 leading-relaxed">{forecast.marketOverview}</p>
            </CardContent>
          </Card>

          {/* Monthly Forecasts */}
          <div className="space-y-3">
            <h3 className="font-black text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              التوقع الشهري
            </h3>
            {forecast.months?.map((month, i) => {
              const dc = demandColor(month.demandIndex);
              const isOpen = expandedMonths[i] !== false; // default open
              return (
                <Card key={i} className={`transition-all ${alertStyle(month.alertLevel)}`}>
                  <button
                    type="button"
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors rounded-t-xl"
                    onClick={() => toggleMonth(i)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-black text-base">{month.monthName}</p>
                        <p className={`text-xs font-semibold ${dc.text}`}>{dc.label}</p>
                      </div>
                      {/* Demand bar */}
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${dc.bar}`} style={{ width: `${month.demandIndex}%` }} />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">{month.demandIndex}</span>
                      </div>
                      {month.alertLevel && month.alertLevel !== "طبيعي" && (
                        <Badge className={month.alertLevel === "طوارئ" ? "bg-red-500 text-white" : "bg-amber-500 text-white"}>
                          {month.alertLevel}
                        </Badge>
                      )}
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isOpen && (
                    <CardContent className="pt-0 pb-5 space-y-4">
                      {/* Key Events */}
                      {month.keyEvents?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {month.keyEvents.map((ev, j) => (
                            <Badge key={j} variant="outline" className="text-xs">{ev}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Products grid */}
                      {month.topProducts?.length > 0 && (
                        <div className="grid sm:grid-cols-2 gap-2">
                          {month.topProducts.map((p, j) => (
                            <div key={j} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold">{p.category}</span>
                                <Badge className={`text-xs ${p.expectedDemand === "عالي" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : p.expectedDemand === "متوسط" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}>
                                  {p.expectedDemand}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{p.importQuantity}</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">{p.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recommendations */}
                      <div className="grid sm:grid-cols-3 gap-3 text-sm">
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <p className="text-xs text-blue-400 font-semibold mb-1">توصية الاستيراد</p>
                          <p className="text-blue-200 text-xs leading-relaxed">{month.importRecommendation}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <p className="text-xs text-purple-400 font-semibold mb-1">نصيحة التسعير</p>
                          <p className="text-purple-200 text-xs leading-relaxed">{month.pricingAdvice}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                          <p className="text-xs text-teal-400 font-semibold mb-1">تركيز التسويق</p>
                          <p className="text-teal-200 text-xs leading-relaxed">{month.marketingFocus}</p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Top Import Recommendations */}
          {forecast.topImportRecommendations && forecast.topImportRecommendations.length > 0 && (
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-400" />
                  أولويات الاستيراد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {forecast.topImportRecommendations.map((r, i) => (
                  <div key={i} className="grid grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                    <div><p className="text-xs text-muted-foreground">المنتج</p><p className="font-semibold">{r.product}</p></div>
                    <div><p className="text-xs text-muted-foreground">الكمية</p><p className="font-semibold">{r.quantity}</p></div>
                    <div><p className="text-xs text-muted-foreground">التوقيت</p><p className="font-semibold">{r.timing}</p></div>
                    <div><p className="text-xs text-muted-foreground">العائد المتوقع</p><p className="font-semibold text-emerald-400">{r.expectedROI}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Insights / Risks / Opportunities */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-yellow-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-400" />رؤى استراتيجية</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {forecast.annualInsights?.map((ins, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-yellow-400 shrink-0">→</span>{ins}</p>
                ))}
              </CardContent>
            </Card>
            <Card className="border-red-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" />المخاطر</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {forecast.riskFactors?.map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-red-400 shrink-0">⚠</span>{r}</p>
                ))}
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" />الفرص</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {forecast.opportunities?.map((op, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-emerald-400 shrink-0">✓</span>{op}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
