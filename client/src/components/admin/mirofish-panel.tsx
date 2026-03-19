/**
 * MiroFish Deep Simulation Panel — Admin
 * =======================================
 * UI for launching full MiroFish OASIS pipelines.
 * Shows MiroFish status and provides deep-analysis buttons
 * that complement the quick Groq agents in other panels.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────

interface MiroFishStatus {
  available: boolean;
  message: string;
  miroFishUrl: string;
}

interface SimResult {
  simulationId: string;
  reportId?: string;
  reportContent?: string;
  agentInterviews?: Array<{ agentId: number; response: string }>;
}

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: MiroFishStatus | null }) {
  if (!status) return <Badge variant="secondary">يتحقق...</Badge>;
  return status.available ? (
    <Badge className="bg-green-600 text-white">🟢 MiroFish نشط</Badge>
  ) : (
    <Badge variant="destructive">🔴 MiroFish غير متاح</Badge>
  );
}

// ─── Agent Interviews Display ─────────────────────────────────

function AgentInterviewsCard({ interviews }: { interviews: Array<{ agentId: number; response: string }> }) {
  if (!interviews.length) return null;
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">🗣️ مقابلات الوكلاء ({interviews.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {interviews.map((iv) => (
              <div key={iv.agentId} className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">وكيل #{iv.agentId}</p>
                <p className="text-sm leading-relaxed">{iv.response}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Report Display ────────────────────────────────────────────

function ReportCard({ content, simulationId }: { content: string; simulationId: string }) {
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const { toast } = useToast();

  async function sendChat() {
    if (!chatMessage.trim()) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/mirofish/report-chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulationId, message: chatMessage, history: chatHistory }),
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory(prev => [
          ...prev,
          { role: "user", content: chatMessage },
          { role: "assistant", content: data.response },
        ]);
        setChatMessage("");
      } else {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", description: "تعذر الوصول إلى خدمة الدردشة", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">📄 تقرير المحاكاة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-48 rounded border p-3 bg-muted/30">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content || "لا يوجد محتوى"}</p>
        </ScrollArea>

        <Separator />

        <p className="text-xs font-semibold text-muted-foreground">💬 دردشة مع التقرير</p>
        <ScrollArea className="h-36">
          <div className="space-y-2">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary/10 mr-8" : "bg-muted ml-8"}`}>
                <span className="font-medium">{msg.role === "user" ? "أنت: " : "MiroFish: "}</span>
                {msg.content}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            value={chatMessage}
            onChange={e => setChatMessage(e.target.value)}
            placeholder="اسأل عن نتائج المحاكاة..."
            onKeyDown={e => e.key === "Enter" && sendChat()}
          />
          <Button onClick={sendChat} disabled={chatLoading} size="sm">
            {chatLoading ? "..." : "إرسال"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Panel ────────────────────────────────────────────────

export function MiroFishPanel() {
  const { toast } = useToast();
  const [status, setStatus] = useState<MiroFishStatus | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [activeMode, setActiveMode] = useState<"cultural" | "catalog" | "forecast" | "treatment" | null>(null);

  // Catalog form
  const [productName, setProductName] = useState("");
  const [priceIQD, setPriceIQD] = useState("");
  const [costUSD, setCostUSD] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  // Market form
  const [topProducts, setTopProducts] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");

  // Treatment form
  const [species, setSpecies] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  useEffect(() => {
    fetch("/api/mirofish/status")
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ available: false, message: "تعذر الاتصال", miroFishUrl: "" }));
  }, []);

  async function runPipeline(mode: typeof activeMode, body: object) {
    setLoading(mode!);
    setResult(null);
    setActiveMode(mode);

    const endpoints: Record<string, string> = {
      cultural: "/api/mirofish/cultural-twin",
      catalog: "/api/mirofish/catalog-deep",
      forecast: "/api/mirofish/market-forecast",
      treatment: "/api/mirofish/treatment-court",
    };

    try {
      const res = await fetch(endpoints[mode!], {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        toast({ title: "✅ اكتملت المحاكاة", description: "MiroFish أنهى التحليل بنجاح" });
      } else {
        toast({ title: "فشلت المحاكاة", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "تعذر الاتصال بـ MiroFish", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  const isRunning = loading !== null;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <StatusBadge status={status} />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{status?.message || "جاري التحقق..."}</p>
              {status && !status.available && (
                <p className="text-xs font-mono mt-1 text-orange-600">
                  لتفعيل MiroFish: docker-compose -f docker-compose.mirofish.yml up -d
                </p>
              )}
            </div>
            {status?.available && (
              <Badge variant="outline" className="text-xs font-mono">{status.miroFishUrl}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!status?.available && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">
              📦 كيف تشغّل MiroFish؟
            </p>
            <ol className="text-sm text-orange-600 dark:text-orange-300 space-y-1 list-decimal list-inside">
              <li>أضف <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">ZEP_API_KEY</code> إلى ملف <code>.env</code> (مجاني من getzep.com)</li>
              <li>شغّل: <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">docker-compose -f docker-compose.mirofish.yml up -d</code></li>
              <li>انتظر 60 ثانية ثم أعد تحميل هذه الصفحة</li>
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ─── Cultural Twin ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🐠 التوأم الثقافي — عميق</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              محاكاة المجتمع العراقي كحوض أسماك عبر 8 وكلاء OASIS — 15 جولة تفاعل كاملة.
            </p>
            <Button
              onClick={() => runPipeline("cultural", {})}
              disabled={isRunning || !status?.available}
              className="w-full"
            >
              {loading === "cultural" ? "⏳ يعمل المحرك..." : "تشغيل المحاكاة الكاملة"}
            </Button>
          </CardContent>
        </Card>

        {/* ─── Market Forecast ───────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🌊 نبي الموجة — عميق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="أعلى المنتجات مبيعاً (اختياري)"
              value={topProducts}
              onChange={e => setTopProducts(e.target.value)}
            />
            <Input
              placeholder="متوسط الإيرادات الشهرية بالدينار (اختياري)"
              value={monthlyRevenue}
              onChange={e => setMonthlyRevenue(e.target.value)}
            />
            <Button
              onClick={() => runPipeline("forecast", { topProducts, monthlyRevenue })}
              disabled={isRunning || !status?.available}
              className="w-full"
            >
              {loading === "forecast" ? "⏳ 8 وكلاء يحللون..." : "توقع السوق (20 جولة)"}
            </Button>
          </CardContent>
        </Card>

        {/* ─── Catalog Deep ──────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🛍️ الكتالوج الحي — عميق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">اسم المنتج *</Label>
              <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="مثال: هيتر 100 واط Boyu" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">سعر البيع (دينار) *</Label>
                <Input value={priceIQD} onChange={e => setPriceIQD(e.target.value)} placeholder="35000" />
              </div>
              <div>
                <Label className="text-xs">تكلفة الشراء ($)</Label>
                <Input value={costUSD} onChange={e => setCostUSD(e.target.value)} placeholder="12" />
              </div>
            </div>
            <div>
              <Label className="text-xs">الفئة</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="هيترات" />
            </div>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="وصف المنتج..."
              rows={2}
            />
            <Button
              onClick={() => runPipeline("catalog", { productName, priceIQD, costUSD, category, description })}
              disabled={isRunning || !status?.available || !productName || !priceIQD}
              className="w-full"
            >
              {loading === "catalog" ? "⏳ 6 زبائن يقيّمون..." : "تحليل عميق (6 وكلاء × 10 جولات)"}
            </Button>
          </CardContent>
        </Card>

        {/* ─── Treatment Court ────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⚖️ محكمة العلاج — عميق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={species} onChange={e => setSpecies(e.target.value)} placeholder="نوع السمكة (مثال: بيتا)" />
            <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="التشخيص (مثال: بقع بيضاء - Ich)" />
            <Textarea
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              placeholder="الأعراض..."
              rows={2}
            />
            <Button
              onClick={() => runPipeline("treatment", { species, symptoms, diagnosis })}
              disabled={isRunning || !status?.available || (!symptoms && !diagnosis)}
              className="w-full"
            >
              {loading === "treatment" ? "⏳ 8 بروتوكولات تتنافس..." : "عقد المحكمة (8 وكلاء)"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ─── Loading State ───────────────────────────────── */}
      {isRunning && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="font-semibold text-blue-700 dark:text-blue-300">محرك MiroFish يعمل</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  الوكلاء يتفاعلون... هذا يأخذ 1-3 دقائق حسب عمق المحاكاة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Results ─────────────────────────────────────── */}
      {result && !isRunning && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-green-600 text-white">✅ اكتملت المحاكاة</Badge>
            <span className="text-xs text-muted-foreground font-mono">ID: {result.simulationId}</span>
          </div>

          {result.reportContent && (
            <ReportCard content={result.reportContent} simulationId={result.simulationId} />
          )}

          {result.agentInterviews && result.agentInterviews.length > 0 && (
            <AgentInterviewsCard interviews={result.agentInterviews} />
          )}
        </div>
      )}
    </div>
  );
}
