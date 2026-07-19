import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Share2, Fish, Globe, Waves, Sparkles } from "lucide-react";

// ─── Types ───────────────────────────────────────────────
interface FishAgent {
  species: string;
  arabicName: string;
  segment: string;
  color: string;
  trait: string;
}

interface FishStatus {
  arabicName: string;
  status: string;
  activity: string;
}

interface DailyEvent {
  title: string;
  story: string;
  dominantSpecies: string;
  harmonyPercent: number;
  tensionPercent: number;
  mood: string;
}

interface CulturalTwinData {
  fishMap: FishAgent[];
  event: {
    date: string;
    dailyEvent: DailyEvent;
    fishStatuses: FishStatus[];
    aquavoMessage: string;
    shareText: string;
  } | null;
}

// ─── Animated Fish Component ──────────────────────────────
function AnimatedFish({ fish, status, index }: { fish: FishAgent; status?: FishStatus; index: number }) {
  const isActive = status?.activity === "نشطة";
  const isAnxious = status?.activity === "قلقة";
  const isJoyful = status?.activity === "مبهجة";

  const animationStyle = {
    animationDelay: `${index * 0.4}s`,
    animationDuration: isActive ? "3s" : isAnxious ? "1.5s" : "5s",
  };

  return (
    <div
      className="flex flex-col items-center gap-2 group cursor-default"
      title={`${fish.arabicName} — ${fish.segment}`}
    >
      {/* Fish bubble */}
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${fish.color}99, ${fish.color}33)`,
          border: `2px solid ${fish.color}66`,
          animation: isJoyful ? "bounce 1s infinite" : isAnxious ? "pulse 1s infinite" : "float 4s ease-in-out infinite",
          ...animationStyle,
        }}
      >
        <span className="text-3xl select-none">🐠</span>
        {/* Activity indicator */}
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background"
          style={{
            backgroundColor: isActive ? "#22c55e" : isAnxious ? "#ef4444" : isJoyful ? "#f59e0b" : "#6b7280",
          }}
        />
      </div>
      {/* Label */}
      <div className="text-center max-w-[90px]">
        <p className="text-xs font-bold leading-tight" style={{ color: fish.color }}>{fish.arabicName}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{fish.segment}</p>
        {status && (
          <p className="text-[9px] text-muted-foreground mt-1 opacity-80 line-clamp-2">{status.status}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function CulturalTwin() {
  const [data, setData] = useState<CulturalTwinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTwin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulation/cultural-twin");
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || "حدث خطأ");
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTwin(); }, [fetchTwin]);

  const handleShare = async () => {
    const text = data?.event?.shareText || "حوض AQUAVO الثقافي — مرآة المجتمع العراقي";
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: "التوأم الثقافي — AQUAVO", text, url }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const event = data?.event;
  const fishMap = data?.fishMap || [];

  return (
    <div className="flex-1 flex flex-col bg-background">      <main className="flex-1">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-blue-900 to-cyan-950 py-16 px-4 text-center">
          {/* Bubbles decoration */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-cyan-400/20 opacity-30"
              style={{
                width: `${20 + i * 15}px`,
                height: `${20 + i * 15}px`,
                left: `${(i * 8.5) % 100}%`,
                bottom: `${(i * 13) % 80}%`,
                animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/30 rounded-full px-5 py-2 mb-6">
              <Waves className="h-4 w-4 text-cyan-300" />
              <span className="text-cyan-200 text-sm font-semibold">مبادرة AQUAVO الثقافية</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
              التوأم الثقافي
            </h1>
            <p className="text-cyan-200 text-lg mb-2 font-medium">
              حوض افتراضي يعكس روح المجتمع العراقي
            </p>
            <p className="text-cyan-300/70 text-sm max-w-xl mx-auto">
              كل سمكة تمثل شريحة من المجتمع. كل يوم قصة جديدة. المحرك: ذكاء اصطناعي يقرأ اليوم ويروي الحكاية.
            </p>

            <div className="flex justify-center gap-3 mt-6">
              <Button
                onClick={fetchTwin}
                disabled={loading}
                variant="outline"
                className="border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/20 gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                تحديث الحوض
              </Button>
              <Button onClick={handleShare} className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2">
                <Share2 className="h-4 w-4" />
                {copied ? "تم النسخ!" : "شارك"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="container mx-auto px-4 py-12 max-w-6xl">

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-200/20 border-t-cyan-400 animate-spin" />
                <div className="absolute inset-3 rounded-full border-4 border-blue-200/20 border-b-blue-400 animate-spin" style={{ animationDirection: "reverse" }} />
              </div>
              <p className="text-muted-foreground animate-pulse">الذكاء الاصطناعي يراقب الحوض...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-400 bg-red-950/20 rounded-xl border border-red-800/30 max-w-md mx-auto">
              <p className="font-semibold">{error}</p>
              <Button onClick={fetchTwin} variant="outline" className="mt-4 border-red-700 text-red-400">
                حاول مجدداً
              </Button>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-10">

              {/* ── Aquarium Tank ── */}
              <div className="relative rounded-3xl overflow-hidden border-2 border-cyan-500/20 shadow-2xl">
                {/* Water background */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-950/90 via-blue-900/80 to-cyan-950/90" />
                {/* Animated water waves */}
                <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(ellipse at 50% 120%, #06b6d455 0%, transparent 70%)`,
                        animation: `wave ${2 + i}s ease-in-out infinite`,
                        animationDelay: `${i * 0.5}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Sand / substrate */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-amber-900/40 to-transparent rounded-b-3xl" />

                {/* Fish agents */}
                <div className="relative z-10 p-8 md:p-12">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4 justify-items-center">
                    {fishMap.map((fish, i) => {
                      const status = event?.fishStatuses?.find(s => s.arabicName === fish.arabicName);
                      return <AnimatedFish key={fish.species} fish={fish} status={status} index={i} />;
                    })}
                  </div>

                  {/* Harmony bar */}
                  {event?.dailyEvent && (
                    <div className="mt-8 max-w-sm mx-auto">
                      <div className="flex justify-between text-xs text-cyan-300/70 mb-1">
                        <span>توافق الحوض</span>
                        <span>{event.dailyEvent.harmonyPercent}%</span>
                      </div>
                      <div className="h-2 bg-card/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-1000"
                          style={{ width: `${event.dailyEvent.harmonyPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Daily Event Story ── */}
              {event?.dailyEvent && (
                <Card className="border-cyan-500/20 bg-gradient-to-br from-blue-950/50 to-cyan-950/50 backdrop-blur">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
                        <Sparkles className="h-6 w-6 text-cyan-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h2 className="text-xl font-black text-white">{event.dailyEvent.title}</h2>
                          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-xs">
                            {event.dailyEvent.mood}
                          </Badge>
                        </div>
                        <p className="text-cyan-100/80 leading-loose text-base">{event.dailyEvent.story}</p>
                        <p className="text-xs text-cyan-400/50 mt-3">{event.date}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Fish Map Grid ── */}
              <div>
                <h3 className="text-2xl font-black text-center mb-6 flex items-center justify-center gap-2">
                  <Fish className="h-6 w-6 text-cyan-400" />
                  خريطة المجتمع في الحوض
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {fishMap.map((fish) => {
                    const status = event?.fishStatuses?.find(s => s.arabicName === fish.arabicName);
                    return (
                      <Card
                        key={fish.species}
                        className="border transition-all hover:scale-[1.02] hover:shadow-lg"
                        style={{ borderColor: `${fish.color}33` }}
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                              style={{ background: `${fish.color}22` }}
                            >
                              🐠
                            </div>
                            <div>
                              <p className="font-black text-sm" style={{ color: fish.color }}>{fish.arabicName}</p>
                              <p className="text-xs text-muted-foreground">{fish.segment}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{fish.trait}</p>
                          {status && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <p className="text-xs font-semibold text-foreground/80">{status.status}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* ── AQUAVO Message ── */}
              {event?.aquavoMessage && (
                <div className="text-center py-8 px-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-teal-500/10 border border-cyan-400/20">
                  <Globe className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-cyan-200 max-w-2xl mx-auto leading-relaxed">
                    "{event.aquavoMessage}"
                  </p>
                  <p className="text-xs text-cyan-400/50 mt-3">— AQUAVO</p>
                </div>
              )}

              {/* ── About ── */}
              <Card className="border-dashed border-border/50">
                <CardContent className="pt-6 pb-6 text-center">
                  <h4 className="font-bold mb-2 text-muted-foreground">ما هو التوأم الثقافي؟</h4>
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    فكرة أصيلة من AQUAVO — نستخدم تقنية المحاكاة المتعددة الوكلاء (MiroFish Engine) لنحوّل كل شريحة من المجتمع العراقي إلى سمكة في حوض افتراضي. كل يوم، الذكاء الاصطناعي يقرأ اليوم ويروي قصة الحوض. إنه ليس ترفيهاً فقط — إنه مرآة.
                  </p>
                </CardContent>
              </Card>

            </div>
          )}
        </div>
      </main>

      {/* CSS animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-8px) translateX(4px); }
          66% { transform: translateY(4px) translateX(-4px); }
        }
        @keyframes wave {
          0%, 100% { transform: scaleX(1); opacity: 0.2; }
          50% { transform: scaleX(1.05); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
