import { useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MetaTags } from "@/components/seo/meta-tags";
import { useToast } from "@/hooks/use-toast";
import { GOVERNORATES } from "@/components/cart/checkout/types";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Handshake } from "lucide-react";

type YesNo = "yes" | "no" | "";

interface FormState {
  // honeypot
  website: string;
  // Section 1
  agreeCommissionOnly: YesNo;
  agreeCommissionAfterReceipt: YesNo;
  agreeNoMoneyWithoutApproval: YesNo;
  agreeNoPriceChange: YesNo;
  agreeNoTreatment: YesNo;
  // Section 2
  fullName: string;
  age: string;
  gender: "male" | "female" | "";
  governorate: string;
  area: string;
  phone: string;
  whatsapp: string;
  socialLink: string;
  // Section 3
  fieldReady: YesNo;
  weeklyHours: string;
  transport: string;
  weeklyVisits: string;
  firstWeekPlaces: string;
  // Section 4
  salesExperience: YesNo;
  soldBefore: string;
  workedCommission: YesNo;
  relationshipsDetails: string;
  aquariumKnowledge: string;
  // Section 5
  testDiscount: string;
  testCash: string;
  testTreatment: string;
  testMarkup: string;
  testMistake: string;
  // Section 6
  sellWhyAquavo: string;
  sellNewTank: string;
  sellShopMessage: string;
  sellFirstThreeOrders: string;
  // Section 7
  agreeWhatsappEval: YesNo;
  agreeVoiceNote: YesNo;
  agreeIdLater: YesNo;
  bestContactTime: string;
  // Section 8
  consentCommissionNotJob: boolean;
  consentCommissionAfterReceipt: boolean;
  consentNoPriceChange: boolean;
  consentNoMoneyWithoutApproval: boolean;
  consentNoTreatment: boolean;
  consentViolationStops: boolean;
  consentDataUsage: boolean;
  signature: string;
}

const initialState: FormState = {
  website: "",
  agreeCommissionOnly: "",
  agreeCommissionAfterReceipt: "",
  agreeNoMoneyWithoutApproval: "",
  agreeNoPriceChange: "",
  agreeNoTreatment: "",
  fullName: "", age: "", gender: "", governorate: "", area: "", phone: "", whatsapp: "", socialLink: "",
  fieldReady: "", weeklyHours: "", transport: "", weeklyVisits: "", firstWeekPlaces: "",
  salesExperience: "", soldBefore: "", workedCommission: "", relationshipsDetails: "", aquariumKnowledge: "",
  testDiscount: "", testCash: "", testTreatment: "", testMarkup: "", testMistake: "",
  sellWhyAquavo: "", sellNewTank: "", sellShopMessage: "", sellFirstThreeOrders: "",
  agreeWhatsappEval: "", agreeVoiceNote: "", agreeIdLater: "", bestContactTime: "",
  consentCommissionNotJob: false, consentCommissionAfterReceipt: false, consentNoPriceChange: false,
  consentNoMoneyWithoutApproval: false, consentNoTreatment: false, consentViolationStops: false,
  consentDataUsage: false, signature: "",
};

const STEP_TITLES = [
  "الشروط الأساسية",
  "المعلومات الأساسية",
  "الجاهزية الميدانية",
  "الخبرة والعلاقات",
  "اختبار الالتزام",
  "اختبار البيع",
  "التحقق عبر واتساب",
  "الموافقة النهائية",
];

// Reusable bits ---------------------------------------------------------------

function YesNoField({
  label, value, onChange, name,
}: { label: string; value: YesNo; onChange: (v: YesNo) => void; name: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-base leading-relaxed">{label}</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as YesNo)}
        className="flex gap-6"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id={`${name}-yes`} />
          <Label htmlFor={`${name}-yes`} className="cursor-pointer">نعم</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id={`${name}-no`} />
          <Label htmlFor={`${name}-no`} className="cursor-pointer">لا</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

function ConsentField({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 hover:bg-muted/40">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} className="mt-1" />
      <span className="text-sm leading-relaxed">{label}</span>
    </label>
  );
}

function TextField({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} inputMode={type === "tel" ? "tel" : undefined} />
    </div>
  );
}

function AreaField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-base leading-relaxed">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} />
    </div>
  );
}

// Page ------------------------------------------------------------------------

export default function PartnersPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const phoneOk = (p: string) => /^07[3-9]\d{8}$/.test(p.replace(/\D/g, ""));

  function validateStep(): string | null {
    switch (step) {
      case 0:
        for (const k of [
          "agreeCommissionOnly", "agreeCommissionAfterReceipt", "agreeNoMoneyWithoutApproval",
          "agreeNoPriceChange", "agreeNoTreatment",
        ] as const) {
          if (!form[k]) return "جاوب على كل الأسئلة بنعم أو لا";
        }
        return null;
      case 1:
        if (form.fullName.trim().length < 3) return "اكتب الاسم الثلاثي";
        if (!form.age || Number(form.age) < 10 || Number(form.age) > 99) return "اكتب عمر صحيح";
        if (!form.gender) return "اختر الجنس";
        if (!form.governorate) return "اختر المحافظة";
        if (!form.area.trim()) return "اكتب المنطقة";
        if (!phoneOk(form.phone)) return "اكتب رقم عراقي صحيح (مثال 07701234567)";
        if (form.whatsapp.trim() && !phoneOk(form.whatsapp)) return "رقم الواتساب غير صحيح";
        return null;
      case 7:
        for (const k of [
          "consentCommissionNotJob", "consentCommissionAfterReceipt", "consentNoPriceChange",
          "consentNoMoneyWithoutApproval", "consentNoTreatment", "consentViolationStops", "consentDataUsage",
        ] as const) {
          if (!form[k]) return "لازم توافق على كل البنود حتى ترسل الطلب";
        }
        if (form.signature.trim().length < 3) return "اكتب اسمك الكامل كتوقيع";
        return null;
      default:
        return null;
    }
  }

  function next() {
    const err = validateStep();
    if (err) {
      toast({ title: "تنبيه", description: err, variant: "destructive" });
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const err = validateStep();
    if (err) {
      toast({ title: "تنبيه", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        agreeCommissionOnly: form.agreeCommissionOnly === "yes",
        agreeCommissionAfterReceipt: form.agreeCommissionAfterReceipt === "yes",
        agreeNoMoneyWithoutApproval: form.agreeNoMoneyWithoutApproval === "yes",
        agreeNoPriceChange: form.agreeNoPriceChange === "yes",
        agreeNoTreatment: form.agreeNoTreatment === "yes",
        agreeWhatsappEval: form.agreeWhatsappEval || undefined,
        agreeVoiceNote: form.agreeVoiceNote || undefined,
        agreeIdLater: form.agreeIdLater || undefined,
        fieldReady: form.fieldReady || undefined,
        salesExperience: form.salesExperience || undefined,
        workedCommission: form.workedCommission || undefined,
      };
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: "تعذر الإرسال", description: data.message || "صار خطأ، جرب مرة ثانية", variant: "destructive" });
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast({ title: "تعذر الإرسال", description: "تأكد من الاتصال وجرب مرة ثانية", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const progress = ((step + 1) / STEP_TITLES.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <MetaTags
        title="برنامج شركاء AQUAVO الميدانيين"
        description="انضم لبرنامج شركاء المبيعات الميدانيين في AQUAVO بنظام العمولة. عرّف الزبائن والمحلات على منتجاتنا واكسب عمولتك بعد استلام الزبون ودفعه."
      />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {done ? (
          <Card className="mt-8">
            <CardContent className="py-12 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">تم استلام طلبك بنجاح</h1>
              <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
                راح تتم مراجعة إجاباتك، وإذا كنت مناسب للمرحلة الثانية راح نتواصل وياك عبر واتساب.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6 mt-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                <Handshake className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3">برنامج شركاء AQUAVO الميدانيين</h1>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                AQUAVO تفتح باب التعاون ويا شركاء مبيعات ميدانيين داخل العراق بنظام العمولة. الشغل مو وظيفة ثابتة،
                وماكو راتب بالبداية، وما تحتاج تشتري بضاعة. دورك تعرف الزبائن والمحلات على منتجات AQUAVO وتجيب طلبات
                رسمية. العمولة تنحسب فقط بعد استلام الزبون للطلب ودفعه.
              </p>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-semibold text-primary">{STEP_TITLES[step]}</span>
                <span className="text-muted-foreground">{step + 1} / {STEP_TITLES.length}</span>
              </div>
              <Progress value={progress} />
            </div>

            {/* Honeypot — hidden from users, traps bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />

            <Card>
              <CardContent className="py-6 space-y-6">
                {step === 0 && (
                  <>
                    <p className="text-sm text-muted-foreground">قبل ما نكمل، جاوب بصراحة على الشروط الأساسية:</p>
                    <YesNoField name="t1" label="هل توافق أن العمل عمولة فقط بدون راتب بالبداية؟"
                      value={form.agreeCommissionOnly} onChange={(v) => set("agreeCommissionOnly", v)} />
                    <YesNoField name="t2" label="هل توافق أن العمولة بعد استلام الزبون ودفعه؟"
                      value={form.agreeCommissionAfterReceipt} onChange={(v) => set("agreeCommissionAfterReceipt", v)} />
                    <YesNoField name="t3" label="هل توافق أن لا تستلم فلوس من الزبون بدون موافقة AQUAVO؟"
                      value={form.agreeNoMoneyWithoutApproval} onChange={(v) => set("agreeNoMoneyWithoutApproval", v)} />
                    <YesNoField name="t4" label="هل توافق أن لا تغير الأسعار ولا تقدم خصومات من نفسك؟"
                      value={form.agreeNoPriceChange} onChange={(v) => set("agreeNoPriceChange", v)} />
                    <YesNoField name="t5" label="هل توافق أن لا تقدم علاج أو تشخيص لأمراض السمچ من نفسك؟"
                      value={form.agreeNoTreatment} onChange={(v) => set("agreeNoTreatment", v)} />
                  </>
                )}

                {step === 1 && (
                  <>
                    <TextField label="الاسم الثلاثي" value={form.fullName} onChange={(v) => set("fullName", v)} placeholder="مثال: علي حسن محمد" />
                    <div className="grid grid-cols-2 gap-4">
                      <TextField label="العمر" value={form.age} onChange={(v) => set("age", v.replace(/\D/g, ""))} type="number" />
                      <div className="space-y-2">
                        <Label className="text-base">الجنس</Label>
                        <RadioGroup value={form.gender} onValueChange={(v) => set("gender", v as any)} className="flex gap-6 pt-2">
                          <div className="flex items-center gap-2"><RadioGroupItem value="male" id="g-m" /><Label htmlFor="g-m" className="cursor-pointer">ذكر</Label></div>
                          <div className="flex items-center gap-2"><RadioGroupItem value="female" id="g-f" /><Label htmlFor="g-f" className="cursor-pointer">أنثى</Label></div>
                        </RadioGroup>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base">المحافظة</Label>
                      <Select value={form.governorate} onValueChange={(v) => set("governorate", v)}>
                        <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                        <SelectContent>
                          {GOVERNORATES.map((g) => (
                            <SelectItem key={g.value} value={g.label}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <TextField label="المنطقة" value={form.area} onChange={(v) => set("area", v)} placeholder="مثال: المنصور" />
                    <TextField label="رقم الهاتف" value={form.phone} onChange={(v) => set("phone", v)} type="tel" placeholder="07701234567" />
                    <TextField label="رقم واتساب (إذا يختلف)" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} type="tel" placeholder="اختياري" />
                    <TextField label="رابط فيسبوك أو إنستغرام" value={form.socialLink} onChange={(v) => set("socialLink", v)} placeholder="اختياري" />
                  </>
                )}

                {step === 2 && (
                  <>
                    <YesNoField name="fr" label="هل تستطيع زيارة محلات وأماكن ميدانياً؟" value={form.fieldReady} onChange={(v) => set("fieldReady", v)} />
                    <TextField label="شكد وقت تكدر تخصص بالأسبوع؟" value={form.weeklyHours} onChange={(v) => set("weeklyHours", v)} placeholder="مثال: 10 ساعات" />
                    <TextField label="وسيلة التنقل" value={form.transport} onChange={(v) => set("transport", v)} placeholder="مثال: سيارة / دراجة / مشي" />
                    <TextField label="شكد مكان تكدر تزور بالأسبوع؟" value={form.weeklyVisits} onChange={(v) => set("weeklyVisits", v)} placeholder="مثال: 8 محلات" />
                    <AreaField label="اكتب 3 أماكن حقيقية تقدر تزورها أول أسبوع" value={form.firstWeekPlaces} onChange={(v) => set("firstWeekPlaces", v)} placeholder="اكتب الأماكن مع المنطقة" />
                  </>
                )}

                {step === 3 && (
                  <>
                    <YesNoField name="se" label="هل عندك خبرة بالمبيعات؟" value={form.salesExperience} onChange={(v) => set("salesExperience", v)} />
                    <AreaField label="شنو بعت سابقاً؟" value={form.soldBefore} onChange={(v) => set("soldBefore", v)} />
                    <YesNoField name="wc" label="هل اشتغلت بنظام العمولة؟" value={form.workedCommission} onChange={(v) => set("workedCommission", v)} />
                    <AreaField label="هل عندك علاقات بمحلات أو ناس ممكن يشترون منتجات أحواض؟" value={form.relationshipsDetails} onChange={(v) => set("relationshipsDetails", v)} />
                    <AreaField label="شنو معرفتك بأحواض السمچ؟" value={form.aquariumKnowledge} onChange={(v) => set("aquariumKnowledge", v)} />
                  </>
                )}

                {step === 4 && (
                  <>
                    <AreaField label="إذا الزبون طلب خصم من عندك، شتسوي؟" value={form.testDiscount} onChange={(v) => set("testDiscount", v)} />
                    <AreaField label="إذا الزبون يريد يدفعلك كاش، شتسوي؟" value={form.testCash} onChange={(v) => set("testCash", v)} />
                    <AreaField label="إذا الزبون سألك عن علاج سمچ مريض، شتجاوبه؟" value={form.testTreatment} onChange={(v) => set("testTreatment", v)} />
                    <AreaField label="إذا سعر المنتج 25,000 د.ع، هل يحقلك تبيعه 30,000 وتاخذ الفرق؟" value={form.testMarkup} onChange={(v) => set("testMarkup", v)} />
                    <AreaField label="إذا صار خطأ بطلب من طرفك، شنو تسوي؟" value={form.testMistake} onChange={(v) => set("testMistake", v)} />
                  </>
                )}

                {step === 5 && (
                  <>
                    <AreaField label="زبون كالك: ليش أشتري من AQUAVO والسوق أرخص؟ اكتب ردك." value={form.sellWhyAquavo} onChange={(v) => set("sellWhyAquavo", v)} />
                    <AreaField label="زبون يريد يبدأ حوض جديد، شتسأله؟" value={form.sellNewTank} onChange={(v) => set("sellNewTank", v)} />
                    <AreaField label="اكتب رسالة قصيرة لصاحب محل أسماك حتى يتعامل ويا AQUAVO." value={form.sellShopMessage} onChange={(v) => set("sellShopMessage", v)} />
                    <AreaField label="شنو خطتك حتى تجيب أول 3 طلبات؟" value={form.sellFirstThreeOrders} onChange={(v) => set("sellFirstThreeOrders", v)} />
                  </>
                )}

                {step === 6 && (
                  <>
                    <YesNoField name="we" label="هل توافق نكمل وياك التقييم عبر واتساب؟" value={form.agreeWhatsappEval} onChange={(v) => set("agreeWhatsappEval", v)} />
                    <YesNoField name="vn" label="هل توافق ترسل رسالة صوتية 30 ثانية؟" value={form.agreeVoiceNote} onChange={(v) => set("agreeVoiceNote", v)} />
                    <YesNoField name="id" label="هل توافق ترسل صورة هوية لاحقاً فقط إذا تم قبولك مبدئياً؟" value={form.agreeIdLater} onChange={(v) => set("agreeIdLater", v)} />
                    <TextField label="أفضل وقت للتواصل" value={form.bestContactTime} onChange={(v) => set("bestContactTime", v)} placeholder="مثال: المساء بعد 7" />
                  </>
                )}

                {step === 7 && (
                  <>
                    <p className="text-sm text-muted-foreground">وافق على كل البنود حتى تكمل:</p>
                    <ConsentField label="أوافق أن التعاون بالعمولة وليس وظيفة ثابتة." checked={form.consentCommissionNotJob} onChange={(v) => set("consentCommissionNotJob", v)} />
                    <ConsentField label="أوافق أني لا أستحق العمولة إلا بعد استلام الزبون ودفعه." checked={form.consentCommissionAfterReceipt} onChange={(v) => set("consentCommissionAfterReceipt", v)} />
                    <ConsentField label="أوافق أني لا أغير الأسعار." checked={form.consentNoPriceChange} onChange={(v) => set("consentNoPriceChange", v)} />
                    <ConsentField label="أوافق أني لا أستلم فلوس من الزبائن بدون موافقة." checked={form.consentNoMoneyWithoutApproval} onChange={(v) => set("consentNoMoneyWithoutApproval", v)} />
                    <ConsentField label="أوافق أني لا أشخص أمراض السمچ ولا أوصف علاج من نفسي." checked={form.consentNoTreatment} onChange={(v) => set("consentNoTreatment", v)} />
                    <ConsentField label="أوافق أن أي مخالفة ممكن تؤدي إلى إيقاف التعاون." checked={form.consentViolationStops} onChange={(v) => set("consentViolationStops", v)} />
                    <ConsentField label="أوافق أن معلوماتي تستخدم فقط لغرض التقييم والتواصل." checked={form.consentDataUsage} onChange={(v) => set("consentDataUsage", v)} />
                    <TextField label="اكتب اسمك الكامل كتوقيع وموافقة" value={form.signature} onChange={(v) => set("signature", v)} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Nav buttons */}
            <div className="flex items-center justify-between gap-3 mt-6">
              <Button variant="outline" onClick={prev} disabled={step === 0 || submitting} className="gap-1">
                <ChevronRight className="w-4 h-4" /> السابق
              </Button>
              {step < STEP_TITLES.length - 1 ? (
                <Button onClick={next} className="gap-1">
                  التالي <ChevronLeft className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting} className="gap-2 min-w-32">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال</> : "إرسال الطلب"}
                </Button>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
