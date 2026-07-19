import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Eye, Copy, Check, X, Clock, MessageCircle, PlayCircle, AlertTriangle,
} from "lucide-react";

interface PartnerApplication {
  id: string;
  createdAt: string;
  fullName: string;
  age: number | null;
  gender: string | null;
  governorate: string | null;
  area: string | null;
  phone: string;
  whatsapp: string | null;
  socialLink: string | null;
  fieldReady: string | null;
  weeklyHours: string | null;
  transport: string | null;
  weeklyVisits: string | null;
  firstWeekPlaces: string | null;
  salesExperience: string | null;
  relationshipsDetails: string | null;
  aquariumKnowledge: string | null;
  answers: Record<string, any>;
  systemScore: number | null;
  suggestedStatus: string | null;
  redFlags: string[] | null;
  finalStatus: string | null;
  adminNotes: string | null;
  reviewedAt: string | null;
  contactedAt: string | null;
}

const FINAL_LABELS: Record<string, string> = {
  new: "جديد",
  accepted: "مقبول",
  rejected: "مرفوض",
  reviewing: "قيد المراجعة",
  contacted: "تم التواصل",
  trial_started: "بدأ تجربة 14 يوم",
};

const SUGGESTED_LABELS: Record<string, string> = {
  accepted: "مقبول",
  medium: "قبول متوسط",
  rejected: "مرفوض",
};

const FINAL_VARIANT: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  accepted: "bg-green-500/15 text-green-600 dark:text-green-400",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-400",
  reviewing: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  contacted: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  trial_started: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
};

function riskLevel(flags: string[] | null): { label: string; cls: string } {
  const n = flags?.length || 0;
  if (n === 0) return { label: "منخفض", cls: "bg-green-500/15 text-green-600 dark:text-green-400" };
  if (n === 1) return { label: "متوسط", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  return { label: "عالي", cls: "bg-red-500/15 text-red-600 dark:text-red-400" };
}

function firstName(full: string): string {
  return (full || "").trim().split(/\s+/)[0] || full;
}

function whatsappMessage(kind: "accepted" | "reviewing" | "rejected", app: PartnerApplication): string {
  const name = firstName(app.fullName);
  if (kind === "accepted") {
    return `هلا أستاذ/أستاذة ${name}، وصلت استمارتك بخصوص التعاون ويا AQUAVO كشريك مبيعات ميداني. تم قبولك مبدئياً للمرحلة الثانية. حتى نكمل التقييم، دز لنا رسالة صوتية قصيرة 30 ثانية تعرف بيها عن نفسك، واذكر 3 أماكن تقدر تزورها أول أسبوع.`;
  }
  if (kind === "reviewing") {
    return `هلا أستاذ/أستاذة ${name}، وصلت استمارتك وتم وضعك ضمن المراجعة. نحتاج منك توضيح بسيط قبل القرار النهائي.`;
  }
  return `هلا أستاذ/أستاذة ${name}، شكراً لتقديمك على برنامج شركاء AQUAVO. حالياً الشروط أو الإجابات ما تطابق احتياجنا للمرحلة الحالية. نتمنالك التوفيق.`;
}

const STATUS_ACTIONS: { key: string; label: string; icon: any }[] = [
  { key: "accepted", label: "قبول", icon: Check },
  { key: "rejected", label: "رفض", icon: X },
  { key: "reviewing", label: "قيد المراجعة", icon: Clock },
  { key: "contacted", label: "تم التواصل", icon: MessageCircle },
  { key: "trial_started", label: "بدأ تجربة 14 يوم", icon: PlayCircle },
];

export default function AdminPartnersPage() {
  const { toast } = useToast();
  const [apps, setApps] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PartnerApplication | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [fGov, setFGov] = useState("all");
  const [fGender, setFGender] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fSuggested, setFSuggested] = useState("all");
  const [fRisk, setFRisk] = useState("all");
  const [fTransport, setFTransport] = useState("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/partners/applications", { credentials: "include" });
      const data = await res.json();
      if (data.success) setApps(data.applications);
      else toast({ title: "خطأ", description: data.message || "تعذر التحميل", variant: "destructive" });
    } catch {
      toast({ title: "خطأ", description: "تعذر تحميل الطلبات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, finalStatus: string) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/partners/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ finalStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setApps((prev) => prev.map((a) => (a.id === id ? data.application : a)));
        if (selected?.id === id) setSelected(data.application);
        toast({ title: "تم", description: `الحالة: ${FINAL_LABELS[finalStatus]}` });
      } else {
        toast({ title: "خطأ", description: data.message || "تعذر التحديث", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "تعذر تحديث الحالة", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }

  async function saveNotes(id: string) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/partners/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adminNotes: notesDraft }),
      });
      const data = await res.json();
      if (data.success) {
        setApps((prev) => prev.map((a) => (a.id === id ? data.application : a)));
        setSelected(data.application);
        toast({ title: "تم", description: "تم حفظ الملاحظات" });
      }
    } catch {
      toast({ title: "خطأ", description: "تعذر حفظ الملاحظات", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }

  function copyWhatsapp(app: PartnerApplication) {
    const kind = app.finalStatus === "rejected" ? "rejected"
      : app.finalStatus === "reviewing" ? "reviewing"
      : "accepted";
    navigator.clipboard.writeText(whatsappMessage(kind, app)).then(() => {
      setCopiedId(app.id);
      setTimeout(() => setCopiedId(null), 1500);
      toast({ title: "تم النسخ", description: "رسالة واتساب نُسخت — ارسلها بنفسك" });
    });
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  }

  const transports = useMemo(
    () => Array.from(new Set(apps.map((a) => a.transport).filter(Boolean))) as string[],
    [apps]
  );
  const govs = useMemo(
    () => Array.from(new Set(apps.map((a) => a.governorate).filter(Boolean))) as string[],
    [apps]
  );

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (fGov !== "all" && a.governorate !== fGov) return false;
      if (fGender !== "all" && a.gender !== fGender) return false;
      if (fStatus !== "all" && a.finalStatus !== fStatus) return false;
      if (fSuggested !== "all" && a.suggestedStatus !== fSuggested) return false;
      if (fTransport !== "all" && a.transport !== fTransport) return false;
      if (fRisk !== "all") {
        const n = a.redFlags?.length || 0;
        if (fRisk === "low" && n !== 0) return false;
        if (fRisk === "medium" && n !== 1) return false;
        if (fRisk === "high" && n < 2) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!a.fullName.toLowerCase().includes(q) && !a.phone.includes(q) && !(a.whatsapp || "").includes(q))
          return false;
      }
      return true;
    });
  }, [apps, fGov, fGender, fStatus, fSuggested, fRisk, fTransport, search]);

  const stats = useMemo(() => ({
    new: apps.filter((a) => a.finalStatus === "new").length,
    accepted: apps.filter((a) => a.finalStatus === "accepted").length,
    medium: apps.filter((a) => a.suggestedStatus === "medium").length,
    rejected: apps.filter((a) => a.finalStatus === "rejected").length,
    contacted: apps.filter((a) => a.finalStatus === "contacted").length,
    trial: apps.filter((a) => a.finalStatus === "trial_started").length,
  }), [apps]);

  const statCards = [
    { label: "طلبات جديدة", value: stats.new, cls: "text-blue-600 dark:text-blue-400" },
    { label: "مقبولين", value: stats.accepted, cls: "text-green-600 dark:text-green-400" },
    { label: "قبول متوسط", value: stats.medium, cls: "text-amber-600 dark:text-amber-400" },
    { label: "مرفوضين", value: stats.rejected, cls: "text-red-600 dark:text-red-400" },
    { label: "تم التواصل معهم", value: stats.contacted, cls: "text-purple-600 dark:text-purple-400" },
    { label: "بدأوا تجربة 14 يوم", value: stats.trial, cls: "text-cyan-600 dark:text-cyan-400" },
  ];

  return (
    <div className="flex-1 bg-background" dir="rtl">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">شركاء المبيعات الميدانيين</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="py-4 text-center">
                <div className={`text-3xl font-bold ${s.cls}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Input placeholder="بحث بالاسم أو الرقم" value={search} onChange={(e) => setSearch(e.target.value)} className="col-span-2" />
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {Object.entries(FINAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fSuggested} onValueChange={setFSuggested}>
              <SelectTrigger><SelectValue placeholder="التصنيف المقترح" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                {Object.entries(SUGGESTED_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fGov} onValueChange={setFGov}>
              <SelectTrigger><SelectValue placeholder="المحافظة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المحافظات</SelectItem>
                {govs.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fGender} onValueChange={setFGender}>
              <SelectTrigger><SelectValue placeholder="الجنس" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="male">ذكر</SelectItem>
                <SelectItem value="female">أنثى</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fRisk} onValueChange={setFRisk}>
              <SelectTrigger><SelectValue placeholder="مستوى الخطر" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المستويات</SelectItem>
                <SelectItem value="low">منخفض</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="high">عالي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fTransport} onValueChange={setFTransport}>
              <SelectTrigger><SelectValue placeholder="وسيلة التنقل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {transports.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">لا يوجد طلبات مطابقة</p>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">المحافظة</TableHead>
                    <TableHead className="text-right">الجنس</TableHead>
                    <TableHead className="text-right">واتساب</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الدرجة</TableHead>
                    <TableHead className="text-right">المقترح</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الخطر</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => {
                    const risk = riskLevel(a.redFlags);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium whitespace-nowrap">{a.fullName}</TableCell>
                        <TableCell className="whitespace-nowrap">{a.governorate || "—"}</TableCell>
                        <TableCell>{a.gender === "male" ? "ذكر" : a.gender === "female" ? "أنثى" : "—"}</TableCell>
                        <TableCell dir="ltr" className="text-right whitespace-nowrap">{a.whatsapp || a.phone}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{new Date(a.createdAt).toLocaleDateString("ar-IQ")}</TableCell>
                        <TableCell className="font-bold">{a.systemScore ?? 0}</TableCell>
                        <TableCell><span className="text-xs">{SUGGESTED_LABELS[a.suggestedStatus || "medium"]}</span></TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${FINAL_VARIANT[a.finalStatus || "new"]}`}>
                            {FINAL_LABELS[a.finalStatus || "new"]}
                          </span>
                        </TableCell>
                        <TableCell><span className={`text-xs px-2 py-1 rounded-full ${risk.cls}`}>{risk.label}</span></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" title="عرض التفاصيل" onClick={() => { setSelected(a); setNotesDraft(a.adminNotes || ""); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" title="نسخ رسالة واتساب" onClick={() => copyWhatsapp(a)}>
                              {copiedId === a.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 flex-wrap">
                  {selected.fullName}
                  <span className={`text-xs px-2 py-1 rounded-full ${FINAL_VARIANT[selected.finalStatus || "new"]}`}>
                    {FINAL_LABELS[selected.finalStatus || "new"]}
                  </span>
                  <span className="text-xs text-muted-foreground">الدرجة: {selected.systemScore ?? 0} • المقترح: {SUGGESTED_LABELS[selected.suggestedStatus || "medium"]}</span>
                </DialogTitle>
              </DialogHeader>

              {/* Red flags */}
              {(selected.redFlags?.length || 0) > 0 && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold mb-2">
                    <AlertTriangle className="w-4 h-4" /> مؤشرات خطر
                  </div>
                  <ul className="list-disc pr-5 space-y-1 text-sm">
                    {selected.redFlags!.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}

              {/* Decision buttons */}
              <div className="flex flex-wrap gap-2">
                {STATUS_ACTIONS.map((act) => {
                  const Icon = act.icon;
                  const active = selected.finalStatus === act.key;
                  return (
                    <Button key={act.key} size="sm" variant={active ? "default" : "outline"}
                      disabled={savingId === selected.id}
                      onClick={() => updateStatus(selected.id, act.key)} className="gap-1">
                      <Icon className="w-4 h-4" /> {act.label}
                    </Button>
                  );
                })}
              </div>

              {/* WhatsApp templates */}
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <span className="text-xs text-muted-foreground w-full">نسخ رسالة واتساب (ترسلها بنفسك):</span>
                <Button size="sm" variant="secondary" onClick={() => copyText(whatsappMessage("accepted", selected))} className="gap-1"><Copy className="w-3 h-3" /> قبول</Button>
                <Button size="sm" variant="secondary" onClick={() => copyText(whatsappMessage("reviewing", selected))} className="gap-1"><Copy className="w-3 h-3" /> مراجعة</Button>
                <Button size="sm" variant="secondary" onClick={() => copyText(whatsappMessage("rejected", selected))} className="gap-1"><Copy className="w-3 h-3" /> رفض</Button>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t pt-3">
                <Info label="العمر" value={selected.age?.toString()} />
                <Info label="الجنس" value={selected.gender === "male" ? "ذكر" : selected.gender === "female" ? "أنثى" : undefined} />
                <Info label="المحافظة" value={selected.governorate} />
                <Info label="المنطقة" value={selected.area} />
                <Info label="الهاتف" value={selected.phone} ltr />
                <Info label="واتساب" value={selected.whatsapp || selected.phone} ltr />
                <Info label="رابط اجتماعي" value={selected.socialLink} ltr />
                <Info label="جاهز ميدانياً" value={yn(selected.fieldReady)} />
                <Info label="ساعات أسبوعياً" value={selected.weeklyHours} />
                <Info label="وسيلة التنقل" value={selected.transport} />
                <Info label="أماكن أسبوعياً" value={selected.weeklyVisits} />
                <Info label="خبرة مبيعات" value={yn(selected.salesExperience)} />
              </div>

              <Detail label="3 أماكن أول أسبوع" value={selected.firstWeekPlaces} />
              <Detail label="العلاقات" value={selected.relationshipsDetails} />
              <Detail label="معرفة بأحواض السمچ" value={selected.aquariumKnowledge} />

              {/* All answers */}
              <AnswersBlock answers={selected.answers} />

              {/* Admin notes */}
              <div className="border-t pt-3 space-y-2">
                <span className="text-sm font-semibold">ملاحظات الأدمن</span>
                <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={3} placeholder="اكتب ملاحظاتك..." />
                <Button size="sm" onClick={() => saveNotes(selected.id)} disabled={savingId === selected.id}>
                  {savingId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الملاحظات"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function yn(v: string | null | undefined): string | undefined {
  if (v === "yes") return "نعم";
  if (v === "no") return "لا";
  return undefined;
}

function Info({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span dir={ltr ? "ltr" : undefined}>{value || "—"}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground block mb-1">{label}:</span>
      <p className="whitespace-pre-wrap bg-muted/40 rounded p-2">{value}</p>
    </div>
  );
}

const ANSWER_LABELS: Record<string, string> = {
  testDiscount: "لو طلب خصم",
  testCash: "لو يريد يدفع كاش",
  testTreatment: "لو سأل عن علاج سمچ",
  testMarkup: "لو يبيع بسعر أعلى ويأخذ الفرق",
  testMistake: "لو صار خطأ بطلب",
  sellWhyAquavo: "ليش أشتري من AQUAVO",
  sellNewTank: "زبون يريد حوض جديد",
  sellShopMessage: "رسالة لصاحب محل",
  sellFirstThreeOrders: "خطة أول 3 طلبات",
  soldBefore: "شنو بعت سابقاً",
  bestContactTime: "أفضل وقت للتواصل",
};

function AnswersBlock({ answers }: { answers: Record<string, any> }) {
  if (!answers) return null;
  const sections: { title: string; data: Record<string, any> | undefined }[] = [
    { title: "اختبار الالتزام", data: answers.commitmentTest },
    { title: "اختبار البيع", data: answers.sellingTest },
  ];
  return (
    <div className="border-t pt-3 space-y-3">
      {sections.map((sec) => sec.data && (
        <div key={sec.title}>
          <span className="text-sm font-semibold block mb-1">{sec.title}</span>
          {Object.entries(sec.data).map(([k, v]) => v ? (
            <div key={k} className="text-sm mb-2">
              <span className="text-muted-foreground block">{ANSWER_LABELS[k] || k}:</span>
              <p className="whitespace-pre-wrap bg-muted/40 rounded p-2">{String(v)}</p>
            </div>
          ) : null)}
        </div>
      ))}
    </div>
  );
}
