import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShoppingBag, Loader2, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, Users, DollarSign, Megaphone, BarChart3,
} from "lucide-react";

interface FinancialAnalysis {
  costUSD: number;
  shippingPerUnitUSD: number;
  totalCostIQD: number;
  recommendedPriceIQD: number;
  profitMarginPercent: number;
  breakEvenUnits: number;
  monthlyRevenuePotential: string;
}

interface MarketSimulation {
  earlyAdopters: { percent: number; profile: string };
  massMarket: { percent: number; profile: string };
  resistors: { percent: number; profile: string };
}

interface PricingOption {
  strategy: string;
  priceIQD: number;
  expectedMonthlySales: string;
  isRecommended: boolean;
}

interface CatalogSimulation {
  productName: string;
  overallScore: number;
  verdict: string;
  adoptionProbability: number;
  financialAnalysis: FinancialAnalysis;
  marketSimulation: MarketSimulation;
  competitorAnalysis: Array<{ name: string; estimatedPrice: string; ourAdvantage: string }>;
  pricingOptions: PricingOption[];
  marketingMessages: { tiktok: string; instagram: string; facebook: string };
  risks: string[];
  recommendations: string[];
  idealLaunchMonth: string;
  importQuantityAdvice: string;
}

const scoreColor = (score: number) => {
  if (score >= 75) return { text: "text-emerald-400", bg: "bg-emerald-500", ring: "border-emerald-500/40" };
  if (score >= 50) return { text: "text-amber-400", bg: "bg-amber-500", ring: "border-amber-500/40" };
  return { text: "text-red-400", bg: "bg-red-500", ring: "border-red-500/40" };
};

const verdictStyle = (verdict: string) => {
  if (verdict?.includes("جدير")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (verdict?.includes("محفوف")) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-red-500/20 text-red-300 border-red-500/40";
};

export function CatalogLivePanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CatalogSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [productName, setProductName] = useState("");
  const [priceIQD, setPriceIQD] = useState("");
  const [costUSD, setCostUSD] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [shippingCostEstimate, setShippingCostEstimate] = useState("");

  const runSimulation = async () => {
    if (!productName || !priceIQD) { setError("اسم المنتج والسعر مطلوبان"); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/simulation/catalog-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, priceIQD: Number(priceIQD.replace(/,/g, "")), costUSD: Number(costUSD) || undefined, category, description, shippingCostEstimate }),
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) setResult(json.data);
      else setError(json.error || "فشلت المحاكاة");
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black">الكتالوج الحي</h2>
          <p className="text-sm text-muted-foreground">محاكاة السوق العراقي قبل استيراد أي منتج — هل الناس راح يشترونه؟</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">بيانات المنتج</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">اسم المنتج <span className="text-red-400">*</span></Label>
              <Input placeholder="مثال: هيتر ذكي 100 واط مع كنترول" value={productName} onChange={e => setProductName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الفئة</Label>
              <Input placeholder="مثال: أجهزة تسخين، فلاتر، أغذية..." value={category} onChange={e => setCategory(e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">سعر البيع المقترح (د.ع) <span className="text-red-400">*</span></Label>
              <Input placeholder="مثال: 35000" value={priceIQD} onChange={e => setPriceIQD(e.target.value)} type="number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تكلفة الشراء من الصين ($)</Label>
              <Input placeholder="مثال: 8.5" value={costUSD} onChange={e => setCostUSD(e.target.value)} type="number" step="0.1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تكلفة الشحن التقديرية</Label>
              <Input placeholder="مثال: $2 للقطعة أو لا أعرف" value={shippingCostEstimate} onChange={e => setShippingCostEstimate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">وصف المنتج (اختياري)</Label>
            <Textarea
              placeholder="اوصف المنتج: مميزاته، جمهوره، لماذا تفكر باستيراده..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <Button onClick={runSimulation} disabled={loading} className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />جاري المحاكاة...</> : <><BarChart3 className="h-4 w-4" />شغّل محاكاة السوق</>}
          </Button>
          {loading && <p className="text-xs text-muted-foreground animate-pulse">الذكاء الاصطناعي يحاكي 1000 زبون عراقي... (15-25 ثانية)</p>}
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-500/30 bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {result && (() => {
        const sc = scoreColor(result.overallScore);
        return (
          <div className="space-y-5">

            {/* Header score card */}
            <Card className={`border-2 ${sc.ring}`}>
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Score circle */}
                  <div className="relative w-24 h-24 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="40" fill="none" strokeWidth="10"
                        stroke="currentColor" className={sc.text}
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - result.overallScore / 100)}`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 1s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-2xl font-black ${sc.text}`}>{result.overallScore}</span>
                      <span className="text-[9px] text-muted-foreground">/ 100</span>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-right">
                    <h3 className="text-xl font-black mb-2">{result.productName}</h3>
                    <Badge className={`text-sm px-4 py-1.5 font-bold ${verdictStyle(result.verdict)}`}>
                      {result.verdict?.includes("جدير") ? <CheckCircle className="h-4 w-4 mr-1 inline" /> : <XCircle className="h-4 w-4 mr-1 inline" />}
                      {result.verdict}
                    </Badge>
                    <p className={`text-sm mt-2 font-semibold ${sc.text}`}>احتمال التبني: {result.adoptionProbability}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Analysis */}
            {result.financialAnalysis && (
              <Card className="border-emerald-500/20">
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-400" />التحليل المالي</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "التكلفة الكاملة", value: result.financialAnalysis.totalCostIQD ? `${result.financialAnalysis.totalCostIQD.toLocaleString()} د.ع` : "—" },
                    { label: "السعر المقترح", value: result.financialAnalysis.recommendedPriceIQD ? `${result.financialAnalysis.recommendedPriceIQD.toLocaleString()} د.ع` : "—" },
                    { label: "هامش الربح", value: result.financialAnalysis.profitMarginPercent ? `${result.financialAnalysis.profitMarginPercent}%` : "—" },
                    { label: "نقطة التعادل", value: result.financialAnalysis.breakEvenUnits ? `${result.financialAnalysis.breakEvenUnits} قطعة` : "—" },
                  ].map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="font-black text-sm">{item.value}</p>
                    </div>
                  ))}
                  {result.financialAnalysis.monthlyRevenuePotential && (
                    <div className="col-span-2 md:col-span-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <p className="text-xs text-emerald-400 mb-1">إيرادات شهرية متوقعة</p>
                      <p className="font-black text-emerald-300">{result.financialAnalysis.monthlyRevenuePotential}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Market Simulation */}
            {result.marketSimulation && (
              <Card className="border-blue-500/20">
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" />محاكاة السوق</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "المتبنّون الأوائل", data: result.marketSimulation.earlyAdopters, color: "emerald" },
                    { label: "السوق الرئيسي", data: result.marketSimulation.massMarket, color: "blue" },
                    { label: "الرافضون", data: result.marketSimulation.resistors, color: "red" },
                  ].map((seg, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">{seg.label}</span>
                        <span className={`font-bold text-${seg.color}-400`}>{seg.data?.percent}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-${seg.color}-500`} style={{ width: `${seg.data?.percent}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{seg.data?.profile}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Pricing Options */}
            {result.pricingOptions?.length > 0 && (
              <Card className="border-purple-500/20">
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-purple-400" />خيارات التسعير</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {result.pricingOptions.map((opt, i) => (
                    <div key={i} className={`p-3 rounded-lg border text-sm ${opt.isRecommended ? "bg-purple-500/10 border-purple-500/30" : "bg-muted/20 border-border/50"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{opt.strategy}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-purple-300">{opt.priceIQD?.toLocaleString()} د.ع</span>
                          {opt.isRecommended && <Badge className="bg-purple-500 text-white text-xs">موصى به</Badge>}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.expectedMonthlySales}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Marketing Messages */}
            {result.marketingMessages && (
              <Card className="border-pink-500/20">
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-pink-400" />نصوص الإعلانات — جاهزة للنشر</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { platform: "TikTok", key: "tiktok", color: "text-black dark:text-white", bg: "bg-black/10" },
                    { platform: "Instagram", key: "instagram", color: "text-pink-400", bg: "bg-pink-500/10" },
                    { platform: "Facebook", key: "facebook", color: "text-blue-400", bg: "bg-blue-500/10" },
                  ].map((p) => (
                    <div key={p.key} className={`p-3 rounded-lg ${p.bg} border border-border/40`}>
                      <p className={`text-xs font-bold mb-1.5 ${p.color}`}>{p.platform}</p>
                      <p className="text-sm leading-relaxed text-foreground/80">{result.marketingMessages[p.key as keyof typeof result.marketingMessages]}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Risks & Recommendations */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-red-500/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" />المخاطر</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {result.risks?.map((r, i) => <p key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-red-400 shrink-0">⚠</span>{r}</p>)}
                </CardContent>
              </Card>
              <Card className="border-emerald-500/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" />التوصيات</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {result.recommendations?.map((r, i) => <p key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-emerald-400 shrink-0">✓</span>{r}</p>)}
                  {result.idealLaunchMonth && <p className="text-xs mt-2 text-blue-400 font-semibold">📅 أفضل وقت للإطلاق: {result.idealLaunchMonth}</p>}
                  {result.importQuantityAdvice && <p className="text-xs text-amber-400 font-semibold">📦 نصيحة الاستيراد: {result.importQuantityAdvice}</p>}
                </CardContent>
              </Card>
            </div>

          </div>
        );
      })()}
    </div>
  );
}
