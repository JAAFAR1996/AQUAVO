import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Save,
  X,
} from "lucide-react";

interface AiLearning {
  id: number;
  createdAt: string;
  type: string;
  userMessage: string;
  aiResponse: string;
  correctedBehavior: string | null;
  rule: string | null;
  severity: string | null;
  applied: boolean;
  appliedAt: string | null;
  metadata: Record<string, any> | null;
}

interface Stats {
  total: number;
  applied: number;
  pending: number;
  negativeFeedback: number;
}

export function AiLearningsPanel() {
  const { toast } = useToast();
  const [learnings, setLearnings] = useState<AiLearning[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, applied: 0, pending: 0, negativeFeedback: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRule, setEditRule] = useState("");
  const [filter, setFilter] = useState<"all" | "applied" | "pending">("all");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-learnings/stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setStats(data.data);
      }
    } catch { /* best-effort */ }
  }, []);

  const fetchLearnings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (filter === "applied") params.set("applied", "true");
      if (filter === "pending") params.set("applied", "false");

      const res = await fetch(`/api/admin/ai-learnings?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLearnings(data.data);
          setTotalPages(data.pagination.pages || 1);
        }
      }
    } catch { /* best-effort */ }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchLearnings(); }, [fetchLearnings]);

  const toggleApplied = async (id: number, currentValue: boolean) => {
    try {
      const res = await fetch(`/api/admin/ai-learnings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ applied: !currentValue }),
      });
      if (res.ok) {
        setLearnings(prev => prev.map(l =>
          l.id === id ? { ...l, applied: !currentValue } : l
        ));
        fetchStats();
        toast({ title: !currentValue ? "تم التفعيل" : "تم التعطيل" });
      }
    } catch {
      toast({ title: "فشل التحديث", variant: "destructive" });
    }
  };

  const saveRule = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/ai-learnings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rule: editRule }),
      });
      if (res.ok) {
        setLearnings(prev => prev.map(l =>
          l.id === id ? { ...l, rule: editRule } : l
        ));
        setEditingId(null);
        toast({ title: "تم الحفظ" });
      }
    } catch {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    }
  };

  const deleteLearning = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/ai-learnings/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setLearnings(prev => prev.filter(l => l.id !== id));
        fetchStats();
        toast({ title: "تم الحذف" });
      }
    } catch {
      toast({ title: "فشل الحذف", variant: "destructive" });
    }
  };

  const severityColor = (s: string | null) => {
    if (s === "high") return "destructive";
    if (s === "medium") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:border-primary/40" onClick={() => { setFilter("all"); setPage(1); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">اجمالي الدروس</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/40" onClick={() => { setFilter("applied"); setPage(1); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.applied}</p>
              <p className="text-xs text-muted-foreground">مفعّلة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-yellow-500/40" onClick={() => { setFilter("pending"); setPage(1); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">بانتظار المراجعة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ThumbsDown className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.negativeFeedback}</p>
              <p className="text-xs text-muted-foreground">تقييم سلبي</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "applied", "pending"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter(f); setPage(1); }}
          >
            {f === "all" ? "الكل" : f === "applied" ? "مفعّلة" : "بانتظار المراجعة"}
          </Button>
        ))}
      </div>

      {/* Learnings List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : learnings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          ما اكو دروس بعد. لمن الزبون يعطي 👎 البوت يتعلم تلقائيا.
        </div>
      ) : (
        <div className="space-y-3">
          {learnings.map(learning => (
            <Card key={learning.id} className={learning.applied ? "border-green-500/30" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={severityColor(learning.severity)}>
                      {learning.severity === "high" ? "عالي" : learning.severity === "medium" ? "متوسط" : "منخفض"}
                    </Badge>
                    <Badge variant="outline">
                      {learning.type === "negative_feedback" ? "تقييم سلبي" : learning.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(learning.createdAt).toLocaleDateString("ar-IQ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={learning.applied}
                      onCheckedChange={() => toggleApplied(learning.id, learning.applied)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => deleteLearning(learning.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* User message */}
                <div className="text-xs mb-1">
                  <span className="text-muted-foreground">الزبون: </span>
                  <span className="text-foreground">"{learning.userMessage.slice(0, 150)}{learning.userMessage.length > 150 ? "..." : ""}"</span>
                </div>

                {/* AI response */}
                <div className="text-xs mb-1">
                  <span className="text-muted-foreground">رد البوت: </span>
                  <span className="text-foreground/70">"{learning.aiResponse.slice(0, 150)}{learning.aiResponse.length > 150 ? "..." : ""}"</span>
                </div>

                {/* What AI learned */}
                {learning.correctedBehavior && (
                  <div className="text-xs mb-1 bg-yellow-500/10 rounded p-1.5">
                    <span className="text-yellow-600 font-medium">الخطأ: </span>
                    <span>{learning.correctedBehavior}</span>
                  </div>
                )}

                {/* Rule */}
                <div className="text-xs">
                  {editingId === learning.id ? (
                    <div className="flex gap-2 items-start mt-1">
                      <Textarea
                        value={editRule}
                        onChange={e => setEditRule(e.target.value)}
                        className="text-xs min-h-[60px]"
                        placeholder="القاعدة المستفادة..."
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveRule(learning.id)}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-green-600 font-medium">القاعدة: </span>
                      <span>{learning.rule || "—"}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 mr-1"
                        onClick={() => { setEditingId(learning.id); setEditRule(learning.rule || ""); }}
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
